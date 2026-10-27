import { compareVersions, type Release, type ReleaseNote } from '@/app/releases'
import type { Receipt } from './outbox'

/** An issue as GitHub's public API describes it. */
export type IssueState =
  | { readonly state: 'open' }
  | {
      readonly state: 'closed'
      readonly reason: 'completed' | 'not_planned' | 'duplicate' | null
    }

/** What My reports says of a report. */
export type ReportShown =
  /** Still on the device, waiting to leave. */
  | { readonly kind: 'waiting' }
  /** Sent; GitHub not read yet. */
  | { readonly kind: 'sent' }
  | { readonly kind: 'open' }
  | { readonly kind: 'fixedIn'; readonly version: string }
  /** Closed as done, in no version the device runs yet. */
  | { readonly kind: 'fixedNext' }
  | { readonly kind: 'duplicate' }
  | { readonly kind: 'declined' }

const shipped = (releases: readonly Release[], current: string) =>
  releases.filter((release) => compareVersions(release.version, current) <= 0)

/** The state of report `number`: the versions the device runs say when it was fixed; GitHub says the
 * rest. */
export function reportState(
  number: number,
  issue: IssueState | undefined,
  releases: readonly Release[],
  current: string,
): ReportShown {
  const fixing = shipped(releases, current)
    .filter((release) => release.notes.some((note) => note.fixes?.includes(number)))
    .at(-1)
  if (fixing) return { kind: 'fixedIn', version: fixing.version }
  if (issue === undefined) return { kind: 'sent' }
  if (issue.state === 'open') return { kind: 'open' }
  if (issue.reason === 'duplicate') return { kind: 'duplicate' }
  if (issue.reason === 'not_planned') return { kind: 'declined' }
  return { kind: 'fixedNext' }
}

export interface Fix {
  readonly receipt: Receipt
  readonly version: string
  readonly note: ReleaseNote
}

/** The player's reports that the versions after `lastSeen`, up to the one the device runs, fix: none on
 * the first launch, which has no version before it. An issue is told of once, by the first of the
 * reports on it; the others joined it as a +1. */
export function fixedSince(
  receipts: readonly Receipt[],
  releases: readonly Release[],
  lastSeen: string | null,
  current: string,
): readonly Fix[] {
  if (lastSeen === null) return []
  const firsts = receipts.filter(
    (receipt, index) => receipts.findIndex((other) => other.number === receipt.number) === index,
  )
  return shipped(releases, current)
    .filter((release) => compareVersions(release.version, lastSeen) > 0)
    .flatMap((release) =>
      release.notes.flatMap((note) =>
        firsts
          .filter((receipt) => note.fixes?.includes(receipt.number))
          .map((receipt) => ({ receipt, version: release.version, note })),
      ),
    )
}
