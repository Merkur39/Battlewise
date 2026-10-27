import type { Language } from '@/i18n/detect'

export const REPORT_KINDS = ['data', 'bug', 'idea'] as const
/** A number or a name that does not match the game, something that does not work, an idea. */
export type ReportKind = (typeof REPORT_KINDS)[number]

/** The longest texts a report takes; /api/feedback holds to the same. */
export const MAX_LENGTH = {
  text: 2000,
  game: 200,
  nickname: 40,
  crashMessage: 500,
  crashStack: 4000,
} as const

/** What failed while drawing: the error, and where it was thrown. */
export interface Crash {
  readonly message: string
  readonly stack: string
}

/** What `read` gives, else `fallback` when it throws: what failed while drawing may fail at its name too. */
export function orElse<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}

/** What a caught error tells: its name and message, then where it was thrown, the components that drew
 * it included. */
export function crashOf(error: unknown, componentStack?: string | null): Crash {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = [error instanceof Error ? (error.stack ?? '') : '', componentStack ?? '']
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join('\n')
  return { message, stack }
}

/** A line of the creature sheet a wrong-data report can point at. */
export interface ReportLine {
  readonly id: string
  /** In the player's language, on its chip. */
  readonly label: string
  /** In English, after the creature in the issue's title. */
  readonly subject: string
  /** What the sheet shows on that line, as it shows it. */
  readonly shows: string
}

/** Where a report is opened from, and what that screen shows: all of it attached to the report. */
export interface ReportOrigin {
  /** A creature's sheet, a screen of the app (whose crash card or failed row reports from there),
   * Settings; `app` when what draws every screen failed: the page of last resort. */
  readonly screen: 'creature' | 'simulation' | 'settings' | 'app' | 'bestiary' | 'arsenal' | 'guide'
  /** The kind picked in advance; none from Settings. */
  readonly kind: ReportKind | null
  /** Above the lines to pick from, in the player's language. */
  readonly heading: string | null
  /** What My reports calls a report from here, in the player's language: the creature, or the creature
   * and its attack; none from Settings. */
  readonly title: string | null
  /** In English, for the issue's title: the creature, or the creature and its attack. */
  readonly subject: string | null
  readonly ids: { readonly creature?: string; readonly stars?: number; readonly attack?: string }
  /** What the screen shows, as it shows it, line by line. */
  readonly shows: readonly string[]
  readonly lines: readonly ReportLine[]
  /** When the screen failed while drawing: the report attaches it, and the player's words may be left
   * out. */
  readonly crash?: Crash
}

/** What the player has written so far. */
export interface ReportDraft {
  readonly kind: ReportKind | null
  /** The id of the line picked, for wrong data. */
  readonly line: string | null
  readonly text: string
  /** What the game shows instead, for wrong data. */
  readonly game: string
  readonly nickname: string
  /** A field people never see, which bots fill in. */
  readonly website: string
}

/** What a report says of the device: no address, no identifier. */
export interface Device {
  readonly version: string
  readonly gameVersion: string
  readonly language: Language
  /** The width of the window, in CSS pixels. */
  readonly width: number
}

export interface Report {
  readonly kind: ReportKind
  readonly text: string
  readonly game?: string
  readonly nickname?: string
  readonly website: string
  readonly subject?: string
  /** The line picked; its id is missing from the reports 1.5 built and left waiting on the device. */
  readonly line?: { readonly id?: string; readonly label: string; readonly shows: string }
  /** Its words may then be left out. */
  readonly crash?: Crash
  readonly context: Device &
    ReportOrigin['ids'] & {
      readonly screen: ReportOrigin['screen']
      readonly shows: readonly string[]
    }
}

/** A draft whose kind is picked. */
export type ReadyDraft = ReportDraft & { readonly kind: ReportKind }

/** A kind and some words, which a crash may go without. */
export const canSend = (draft: ReportDraft, origin: ReportOrigin): draft is ReadyDraft =>
  draft.kind !== null &&
  (draft.text.trim() !== '' || origin.crash !== undefined) &&
  draft.text.length <= MAX_LENGTH.text

/** The report sent: the player's words, trimmed, and what the screen and the device attach to it. */
export function buildReport(origin: ReportOrigin, draft: ReadyDraft, device: Device): Report {
  const { kind } = draft
  const line =
    kind === 'data' ? origin.lines.find((candidate) => candidate.id === draft.line) : undefined
  const game = kind === 'data' ? draft.game.trim() : ''
  const nickname = draft.nickname.trim()
  const subject = line && origin.subject ? `${origin.subject} › ${line.subject}` : origin.subject
  return {
    kind,
    text: draft.text.trim(),
    ...(game !== '' ? { game } : {}),
    ...(nickname !== '' ? { nickname } : {}),
    website: draft.website,
    ...(subject ? { subject } : {}),
    ...(line ? { line: { id: line.id, label: line.label, shows: line.shows } } : {}),
    ...(origin.crash
      ? {
          crash: {
            message: origin.crash.message.slice(0, MAX_LENGTH.crashMessage),
            stack: origin.crash.stack.slice(0, MAX_LENGTH.crashStack),
          },
        }
      : {}),
    context: { ...device, screen: origin.screen, ...origin.ids, shows: origin.shows },
  }
}

const TITLE = 60

/** What My reports calls the report: where it points, else the start of its words, else its error. */
export function titleOf(origin: ReportOrigin, draft: ReportDraft): string {
  const line =
    draft.kind === 'data'
      ? origin.lines.find((candidate) => candidate.id === draft.line)
      : undefined
  if (origin.title !== null) return line ? `${origin.title} › ${line.label}` : origin.title
  const typed = draft.text.replace(/\s+/g, ' ').trim()
  const words = typed === '' && origin.crash ? origin.crash.message : typed
  return words.length <= TITLE ? words : `${words.slice(0, TITLE).trimEnd()}…`
}
