import { describe, expect, it } from 'vitest'
import { attackAdvice, creatureAdvice, worstVerdict, type GuardVerdicts } from './advice'

describe('attackAdvice', () => {
  it('blocks when the block holds without staggering', () => {
    expect(attackAdvice({ block: 'holds', parry: 'holds' })).toEqual({ action: 'block' })
  })

  it('parries when blocking staggers you', () => {
    expect(attackAdvice({ block: 'staggered', parry: 'holds' })).toEqual({
      action: 'parry',
      block: 'staggered',
    })
  })

  it('parries when the block gives way', () => {
    expect(attackAdvice({ block: 'broken', parry: 'holds' })).toEqual({
      action: 'parry',
      block: 'broken',
    })
  })

  it('dodges when even a parry staggers you', () => {
    expect(attackAdvice({ block: 'broken', parry: 'staggered' })).toEqual({
      action: 'dodge',
      guard: 'parry',
      setback: 'staggered',
    })
  })

  it('dodges when even a parry gives way', () => {
    expect(attackAdvice({ block: 'broken', parry: 'broken' })).toEqual({
      action: 'dodge',
      guard: 'parry',
      setback: 'broken',
    })
  })

  it('dodges on account of the block with an item that cannot parry', () => {
    expect(attackAdvice({ block: 'staggered', parry: null })).toEqual({
      action: 'dodge',
      guard: 'block',
      setback: 'staggered',
    })
  })

  it('dodges an unblockable attack', () => {
    expect(attackAdvice({ block: 'unblockable', parry: 'unblockable' })).toEqual({
      action: 'dodge',
      guard: 'parry',
      setback: 'unblockable',
    })
  })
})

describe('creatureAdvice', () => {
  const holds: GuardVerdicts = { block: 'holds', parry: 'holds' }
  const parryOnly: GuardVerdicts = { block: 'staggered', parry: 'holds' }
  const blockBreaks: GuardVerdicts = { block: 'broken', parry: 'holds' }
  const neither: GuardVerdicts = { block: 'broken', parry: 'staggered' }

  it('has nothing to say before the attacks are known', () => {
    expect(creatureAdvice([])).toEqual({ kind: 'unknown' })
  })

  it('blocks everything when every block holds', () => {
    expect(creatureAdvice([holds, holds])).toEqual({ kind: 'blockAll' })
  })

  it('parries everything when some blocks stagger but every parry holds', () => {
    expect(creatureAdvice([holds, parryOnly])).toEqual({ kind: 'parryAll', block: 'staggered' })
  })

  it('parries everything, the block giving way, when it breaks against one of the attacks', () => {
    expect(creatureAdvice([holds, parryOnly, blockBreaks])).toEqual({
      kind: 'parryAll',
      block: 'broken',
    })
  })

  it('dodges everything when no attack can be guarded', () => {
    expect(creatureAdvice([neither, neither])).toEqual({ kind: 'dodgeAll' })
  })

  it('dodges the attacks no guard takes and parries the rest (the troll)', () => {
    expect(creatureAdvice([holds, parryOnly, neither])).toEqual({
      kind: 'dodgeSome',
      dodge: [2],
      rest: 'parry',
    })
  })

  it('blocks the rest when every other block holds', () => {
    expect(creatureAdvice([{ block: 'unblockable', parry: 'unblockable' }, holds])).toEqual({
      kind: 'dodgeSome',
      dodge: [0],
      rest: 'block',
    })
  })

  it('works with an item that cannot parry', () => {
    expect(
      creatureAdvice([
        { block: 'holds', parry: null },
        { block: 'staggered', parry: null },
      ]),
    ).toEqual({
      kind: 'dodgeSome',
      dodge: [1],
      rest: 'block',
    })
  })
})

describe('worstVerdict', () => {
  it('is null without verdicts', () => {
    expect(worstVerdict([])).toBeNull()
  })

  it('ranks staggering above holding', () => {
    expect(worstVerdict(['holds', 'staggered', 'holds'])).toBe('staggered')
  })

  it('ranks breaking above staggering', () => {
    expect(worstVerdict(['broken', 'staggered'])).toBe('broken')
  })

  it('ranks unblockable last of all', () => {
    expect(worstVerdict(['unblockable', 'broken'])).toBe('unblockable')
  })
})
