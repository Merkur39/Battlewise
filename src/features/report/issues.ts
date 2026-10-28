import type { KeyValueStorage } from '@/app/store'
import type { IssueState } from './loop'

const ISSUES = 'https://api.github.com/repos/Merkur39/Foelore/issues'
export const ISSUES_KEY = 'foelore-issues'

const REASONS = ['completed', 'not_planned', 'duplicate'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function stateOf(value: unknown): IssueState | null {
  if (!isRecord(value)) return null
  if (value.state === 'open') return { state: 'open' }
  if (value.state !== 'closed') return null
  const reason = REASONS.find((candidate) => candidate === value.state_reason) ?? null
  return { state: 'closed', reason }
}

/** An issue's state from GitHub's public API, without an account; null when GitHub does not give it
 * (offline, or the hourly limit an address gets reached). */
export async function fetchIssueState(number: number): Promise<IssueState | null> {
  try {
    const response = await fetch(`${ISSUES}/${String(number)}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    return response.ok ? stateOf(await response.json()) : null
  } catch {
    return null
  }
}

export interface IssueStates {
  /** The last state GitHub gave for the issue, undefined when it never did. */
  readonly get: (number: number) => IssueState | undefined
  /** Asks GitHub for these issues in turn, until one does not come. */
  readonly refresh: (numbers: readonly number[]) => Promise<void>
}

/** The states of the player's issues, kept on the device so that My reports shows them offline. */
export function createIssueStates(
  storage: KeyValueStorage | null,
  read: (number: number) => Promise<IssueState | null> = fetchIssueState,
): IssueStates {
  const known = new Map<number, IssueState>()
  try {
    const saved: unknown = JSON.parse(storage?.getItem(ISSUES_KEY) ?? '{}')
    if (isRecord(saved)) {
      for (const [number, value] of Object.entries(saved)) {
        const state = stateOf(isRecord(value) ? { ...value, state_reason: value.reason } : null)
        if (state) known.set(Number(number), state)
      }
    }
  } catch {
    // Nothing kept, or nothing readable: GitHub tells again.
  }
  return {
    get: (number) => known.get(number),
    refresh: async (numbers) => {
      for (const number of numbers) {
        const state = await read(number)
        if (state === null) break
        known.set(number, state)
      }
      try {
        storage?.setItem(ISSUES_KEY, JSON.stringify(Object.fromEntries(known)))
      } catch {
        // Storage full or blocked: the states hold until the app is closed.
      }
    },
  }
}
