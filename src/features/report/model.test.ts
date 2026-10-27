import { describe, expect, it } from 'vitest'
import { buildReport, canSend, MAX_LENGTH, type ReadyDraft, type ReportOrigin } from './model'

const sheet: ReportOrigin = {
  screen: 'creature',
  kind: 'data',
  heading: 'Sur la fiche du Troll · 0★',
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
    expect(canSend({ ...draft, kind: null })).toBe(false)
    expect(canSend({ ...draft, text: '   ' })).toBe(false)
    expect(canSend(draft)).toBe(true)
  })

  it('refuses a text longer than the limit', () => {
    expect(canSend({ ...draft, text: 'a'.repeat(MAX_LENGTH.text + 1) })).toBe(false)
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

  it('names the picked line in the subject and attaches what it shows', () => {
    const report = buildReport(sheet, { ...draft, line: 'Troll/attack_log' }, device)
    expect(report.subject).toBe('Troll › Log swing')
    expect(report.line).toEqual({ label: 'Coup de tronc', shows: 'COUP DE TRONC 130' })
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
