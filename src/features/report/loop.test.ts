import { describe, expect, it } from 'vitest'
import type { Release } from '@/app/releases'
import { fixedSince, reportState } from './loop'
import type { Receipt } from './outbox'

const releases: readonly Release[] = [
  {
    version: '1.6.0',
    date: '2026-11-10',
    notes: [{ text: { fr: 'Draugr', en: 'Draugr' }, fixes: [50] }],
  },
  {
    version: '1.5.0',
    date: '2026-11-02',
    notes: [
      {
        text: { fr: 'Frappe au sol : 60.', en: 'Ground slam: 60.' },
        fixes: [48],
        thanks: ['Ragnar'],
      },
      { text: { fr: 'Mes signalements.', en: 'My reports.' } },
    ],
  },
  { version: '1.4.0', date: '2026-10-27', notes: [{ text: { fr: 'Signaler.', en: 'Report.' } }] },
]

const receipt = (number: number): Receipt => ({
  number,
  kind: 'data',
  at: '2026-10-27T18:00:00.000Z',
  title: `#${String(number)}`,
})

describe('reportState', () => {
  it('says fixed in the version whose notes list it, whatever GitHub says or not', () => {
    expect(reportState(48, undefined, releases, '1.6.0')).toEqual({
      kind: 'fixedIn',
      version: '1.5.0',
    })
    expect(reportState(48, { state: 'open' }, releases, '1.6.0')).toEqual({
      kind: 'fixedIn',
      version: '1.5.0',
    })
  })

  it('does not count a version the device does not run yet', () => {
    expect(reportState(50, { state: 'closed', reason: 'completed' }, releases, '1.5.0')).toEqual({
      kind: 'fixedNext',
    })
  })

  it('reads the rest from GitHub', () => {
    expect(reportState(52, { state: 'open' }, releases, '1.6.0')).toEqual({ kind: 'open' })
    expect(reportState(52, { state: 'closed', reason: null }, releases, '1.6.0')).toEqual({
      kind: 'fixedNext',
    })
    expect(reportState(47, { state: 'closed', reason: 'duplicate' }, releases, '1.6.0')).toEqual({
      kind: 'duplicate',
    })
    expect(reportState(46, { state: 'closed', reason: 'not_planned' }, releases, '1.6.0')).toEqual({
      kind: 'declined',
    })
  })

  it('only says sent until GitHub has been read', () => {
    expect(reportState(52, undefined, releases, '1.6.0')).toEqual({ kind: 'sent' })
  })
})

describe('fixedSince', () => {
  it('finds the player’s reports fixed by the versions since the last one the device ran', () => {
    expect(fixedSince([receipt(48), receipt(50), receipt(52)], releases, '1.4.0', '1.6.0')).toEqual(
      [
        { receipt: receipt(50), version: '1.6.0', note: releases[0]?.notes[0] },
        { receipt: receipt(48), version: '1.5.0', note: releases[1]?.notes[0] },
      ],
    )
  })

  it('finds nothing on the first launch, nor when the version has not changed', () => {
    expect(fixedSince([receipt(48)], releases, null, '1.6.0')).toEqual([])
    expect(fixedSince([receipt(48)], releases, '1.5.0', '1.5.0')).toEqual([])
  })
})
