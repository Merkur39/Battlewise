import type { KeyValueStorage } from '@/app/store'
import { REPORT_KINDS, type Report, type ReportKind } from './model'

/** A report that became issue `number`, kept on the device for « My reports » (#33). */
export interface Receipt {
  readonly number: number
  readonly kind: ReportKind
  /** When it left, ISO 8601. */
  readonly at: string
  /** What My reports calls it, in the language it was written in. */
  readonly title: string
  /** The name the player gave for the thanks, if any. */
  readonly nickname?: string
}

/** A send that failed: `status` is the server's answer, null when no answer came (offline). */
export class SendError extends Error {
  readonly status: number | null

  constructor(status: number | null) {
    super(status === null ? 'No answer' : `Answered ${String(status)}`)
    this.name = 'SendError'
    this.status = status
  }
}

export type Sender = (report: Report) => Promise<{ readonly number: number }>

/** What became of a report just submitted. */
export type Outcome =
  | { readonly status: 'sent'; readonly receipt: Receipt }
  /** It waits on the device, and leaves later on its own. */
  | { readonly status: 'kept' }
  /** The server will never take it as it is: it is dropped. */
  | { readonly status: 'refused' }

/** A report waiting to leave, as My reports lists it. */
export interface Waiting {
  readonly kind: ReportKind
  /** Empty for a report an older version kept. */
  readonly title: string
  /** When it was written, ISO 8601; empty for a report an older version kept. */
  readonly at: string
}

export interface Outbox {
  /** The reports waiting to leave, oldest first. */
  readonly pending: () => readonly Report[]
  readonly waiting: () => readonly Waiting[]
  readonly receipts: () => readonly Receipt[]
  /** Queues the report, under the title My reports gives it, and sends everything waiting. */
  readonly submit: (report: Report, title: string) => Promise<Outcome>
  /** Sends what waits, oldest first, until one fails: the network is down, or the server busy. */
  readonly flush: () => Promise<void>
}

export const OUTBOX_KEY = 'battlewise-outbox'
export const RECEIPTS_KEY = 'battlewise-reports'

interface Entry {
  readonly id: string
  readonly report: Report
  readonly title: string
  readonly at: string
}

// The answers to a report the server cannot read or will not take: sending it again would only fail
// again. Any other failure is the network's or the server's, and passes (a 404 too: /api/feedback not
// deployed yet).
const REFUSED = new Set([400, 413, 415, 422])

/** The reports, kept on the device until they leave: the app may be offline, or closed before they do. */
export function createOutbox(
  storage: KeyValueStorage | null,
  send: Sender,
  now: () => Date = () => new Date(),
): Outbox {
  // What an older version kept has no title nor date: they read as empty.
  let entries: readonly Entry[] = read(storage, OUTBOX_KEY, isEntry).map((entry) => ({
    title: '',
    at: '',
    ...entry,
  }))
  let receipts: readonly Receipt[] = read(storage, RECEIPTS_KEY, isReceipt).map((receipt) => ({
    title: '',
    ...receipt,
  }))
  const outcomes = new Map<string, Outcome>()
  let running: Promise<void> | null = null

  const save = () => {
    write(storage, OUTBOX_KEY, entries)
    write(storage, RECEIPTS_KEY, receipts)
  }

  async function drain() {
    for (let entry = entries[0]; entry; entry = entries[0]) {
      try {
        const { number } = await send(entry.report)
        const { kind, nickname } = entry.report
        const receipt: Receipt = {
          number,
          kind,
          at: now().toISOString(),
          title: entry.title,
          ...(nickname !== undefined ? { nickname } : {}),
        }
        outcomes.set(entry.id, { status: 'sent', receipt })
        receipts = [...receipts, receipt]
      } catch (error) {
        if (!(error instanceof SendError && REFUSED.has(error.status ?? 0))) return
        outcomes.set(entry.id, { status: 'refused' })
      }
      const done = entry
      entries = entries.filter((candidate) => candidate !== done)
      save()
    }
  }

  const flush = () => (running ??= drain().finally(() => (running = null)))

  return {
    pending: () => entries.map((entry) => entry.report),
    waiting: () => entries.map(({ report, title, at }) => ({ kind: report.kind, title, at })),
    receipts: () => receipts,
    submit: async (report, title) => {
      const entry = { id: crypto.randomUUID(), report, title, at: now().toISOString() }
      entries = [...entries, entry]
      save()
      await flush()
      return outcomes.get(entry.id) ?? { status: 'kept' }
    },
    flush,
  }
}

function read<T>(storage: KeyValueStorage | null, key: string, is: (value: unknown) => value is T) {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(key) ?? '[]')
    return Array.isArray(saved) ? saved.filter(is) : []
  } catch {
    return []
  }
}

function write(storage: KeyValueStorage | null, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: what waits holds until the app is closed.
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isKind = (value: unknown): value is ReportKind => REPORT_KINDS.some((kind) => kind === value)

const isEntry = (value: unknown): value is Omit<Entry, 'title' | 'at'> & Partial<Entry> =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isRecord(value.report) &&
  isKind(value.report.kind) &&
  typeof value.report.text === 'string' &&
  isRecord(value.report.context) &&
  (value.title === undefined || typeof value.title === 'string') &&
  (value.at === undefined || typeof value.at === 'string')

const isReceipt = (value: unknown): value is Omit<Receipt, 'title'> & Partial<Receipt> =>
  isRecord(value) &&
  Number.isInteger(value.number) &&
  isKind(value.kind) &&
  typeof value.at === 'string' &&
  (value.title === undefined || typeof value.title === 'string') &&
  (value.nickname === undefined || typeof value.nickname === 'string')
