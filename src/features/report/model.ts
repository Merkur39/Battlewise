import type { Language } from '@/i18n/detect'

export const REPORT_KINDS = ['data', 'bug', 'idea'] as const
/** A number or a name that does not match the game, something that does not work, an idea. */
export type ReportKind = (typeof REPORT_KINDS)[number]

/** The longest texts a report takes; /api/feedback holds to the same. */
export const MAX_LENGTH = { text: 2000, game: 200, nickname: 40 } as const

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
  readonly screen: 'creature' | 'simulation' | 'settings'
  /** The kind picked in advance; none from Settings. */
  readonly kind: ReportKind | null
  /** Above the lines to pick from, in the player's language. */
  readonly heading: string | null
  /** In English, for the issue's title: the creature, or the creature and its attack. */
  readonly subject: string | null
  readonly ids: { readonly creature?: string; readonly stars?: number; readonly attack?: string }
  /** What the screen shows, as it shows it, line by line. */
  readonly shows: readonly string[]
  readonly lines: readonly ReportLine[]
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
  readonly line?: { readonly label: string; readonly shows: string }
  readonly context: Device &
    ReportOrigin['ids'] & {
      readonly screen: ReportOrigin['screen']
      readonly shows: readonly string[]
    }
}

/** A draft whose kind is picked. */
export type ReadyDraft = ReportDraft & { readonly kind: ReportKind }

export const canSend = (draft: ReportDraft): draft is ReadyDraft =>
  draft.kind !== null && draft.text.trim() !== '' && draft.text.length <= MAX_LENGTH.text

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
    ...(line ? { line: { label: line.label, shows: line.shows } } : {}),
    context: { ...device, screen: origin.screen, ...origin.ids, shows: origin.shows },
  }
}
