import { describe, expect, it } from 'vitest'
import { creatureHealth, staggerThreshold, toInflict } from './creature'

describe('creatureHealth', () => {
  it('is the listed health without stars', () => {
    expect(creatureHealth(600, 0)).toBe(600)
  })

  it('doubles at one star and triples at two', () => {
    expect([creatureHealth(600, 1), creatureHealth(600, 2)]).toEqual([1200, 1800])
  })
})

describe('staggerThreshold', () => {
  const troll = { health: 600, staggerFactor: 0.3, staggerable: true }

  it('is a share of the health: 180 for a troll', () => {
    expect(staggerThreshold(troll, 0)).toBe(180)
  })

  it('follows the health up with the stars', () => {
    expect(staggerThreshold({ ...troll, health: 1000 }, 1)).toBe(600)
  })

  it('is null for a creature whose bar never fills', () => {
    expect(staggerThreshold({ health: 5000, staggerFactor: 0, staggerable: true }, 0)).toBeNull()
  })

  it('is null for a creature that cannot play a stagger, though its bar fills', () => {
    // The Deathsquito: staggerFactor 0.5, but its animator has no stagger state.
    expect(staggerThreshold({ health: 10, staggerFactor: 0.5, staggerable: false }, 0)).toBeNull()
  })
})

describe('toInflict', () => {
  it('is the threshold itself alone on normal', () => {
    expect(toInflict(180, { difficulty: 'normal', players: 1 })).toBe(180)
  })

  it('grows when the world weakens your hits', () => {
    expect(toInflict(180, { difficulty: 'hard', players: 1 })).toBeCloseTo(211.76, 2)
  })

  it('grows with the players around', () => {
    expect(toInflict(180, { difficulty: 'normal', players: 3 })).toBeCloseTo(288, 9)
  })
})
