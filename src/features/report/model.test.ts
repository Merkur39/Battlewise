import { describe, expect, it } from 'vitest'
import {
  buildReport,
  canSend,
  MAX_LENGTH,
  titleOf,
  type ReadyDraft,
  type ReportOrigin,
} from './model'

const sheet: ReportOrigin = {
  screen: 'creature',
  kind: 'data',
  heading: 'Sur la fiche du Troll · 0★',
  title: 'Troll',
  subject: 'Troll',
  ids: { creature: 'Troll', stars: 0 },
  shows: ['TROLL · 0★ · PV 600', 'TON MONDE : NORMAL · 1 JOUEUR'],
  lines: [
    { id: 'health', label: 'PV', subject: 'Health', shows: 'PV 600' },
    {
      id: 'Troll/attack_log',
      label: 'Coup de tronc',
      subject: 'Log swing',
      shows: 'COUP DE TRONC 130',
    },
  ],
}

/** The Troll's sheet as it fails while drawing: no line, nothing shown, the error. */
const crashed: ReportOrigin = {
  ...sheet,
  kind: 'bug',
  heading: 'Troll',
  ids: { creature: 'Troll' },
  shows: [],
  lines: [],
  crash: { message: 'TypeError: x', stack: 'TypeError: x\n    at attackDamage' },
}

const device = { version: '1.4.0', gameVersion: '0.221.4', language: 'fr', width: 390 } as const

const draft: ReadyDraft = {
  kind: 'data',
  line: null,
  text: 'Il fait 110 dans le jeu.',
  game: '',
  nickname: '',
  website: '',
}

describe('canSend', () => {
  it('waits for a kind and some text', () => {
    expect(canSend({ ...draft, kind: null }, sheet)).toBe(false)
    expect(canSend({ ...draft, text: '   ' }, sheet)).toBe(false)
    expect(canSend(draft, sheet)).toBe(true)
  })

  it('refuses a text longer than the limit', () => {
    expect(canSend({ ...draft, text: 'a'.repeat(MAX_LENGTH.text + 1) }, sheet)).toBe(false)
  })

  it('lets a crash leave without a word', () => {
    expect(canSend({ ...draft, kind: 'bug', text: '' }, crashed)).toBe(true)
  })
})

describe('buildReport', () => {
  it('attaches the device and what the screen shows, nothing else', () => {
    expect(buildReport(sheet, draft, device)).toEqual({
      kind: 'data',
      text: 'Il fait 110 dans le jeu.',
      website: '',
      subject: 'Troll',
      context: {
        version: '1.4.0',
        gameVersion: '0.221.4',
        language: 'fr',
        width: 390,
        screen: 'creature',
        creature: 'Troll',
        stars: 0,
        shows: ['TROLL · 0★ · PV 600', 'TON MONDE : NORMAL · 1 JOUEUR'],
      },
    })
  })

  it('trims the texts and leaves out the optional ones left empty', () => {
    const report = buildReport(
      sheet,
      { ...draft, text: '  Il fait 110.  ', game: '  110 ', nickname: '   ' },
      device,
    )
    expect(report.text).toBe('Il fait 110.')
    expect(report.game).toBe('110')
    expect(report).not.toHaveProperty('nickname')
  })

  it('names the picked line in the subject and attaches it, with what it shows', () => {
    const report = buildReport(sheet, { ...draft, line: 'Troll/attack_log' }, device)
    expect(report.subject).toBe('Troll › Log swing')
    expect(report.line).toEqual({
      id: 'Troll/attack_log',
      label: 'Coup de tronc',
      shows: 'COUP DE TRONC 130',
    })
  })

  it('keeps what the game shows for wrong data only', () => {
    const report = buildReport(
      sheet,
      { ...draft, kind: 'bug', game: '110', line: 'health' },
      device,
    )
    expect(report).not.toHaveProperty('game')
    expect(report).not.toHaveProperty('line')
    expect(report.subject).toBe('Troll')
  })
})

describe('buildReport, for a crash', () => {
  it('attaches the error, cut to the limits', () => {
    const long = { ...crashed, crash: { message: 'm'.repeat(600), stack: 's'.repeat(5000) } }
    const report = buildReport(long, { ...draft, kind: 'bug', text: '' }, device)
    expect(report.text).toBe('')
    expect(report.crash).toEqual({
      message: 'm'.repeat(MAX_LENGTH.crashMessage),
      stack: 's'.repeat(MAX_LENGTH.crashStack),
    })
  })
})

describe('titleOf', () => {
  it('names the creature, and the line picked', () => {
    expect(titleOf(sheet, draft)).toBe('Troll')
    expect(titleOf(sheet, { ...draft, line: 'Troll/attack_log' })).toBe('Troll › Coup de tronc')
  })

  it('starts with the words of a report from nowhere in particular', () => {
    const settings: ReportOrigin = { ...sheet, title: null, lines: [] }
    const idea = { ...draft, kind: 'idea', text: '  Les boss\nphase par phase  ' } as const
    expect(titleOf(settings, idea)).toBe('Les boss phase par phase')
    expect(titleOf(settings, { ...draft, text: 'mot '.repeat(30) })).toMatch(/^mot mot .{40,}…$/)
  })

  it('names a crash from nowhere in particular by its error, when no word says more', () => {
    const app: ReportOrigin = { ...crashed, screen: 'app', title: null, ids: {} }
    expect(titleOf(app, { ...draft, kind: 'bug', text: '' })).toBe('TypeError: x')
  })
})
