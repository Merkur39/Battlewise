import { describe, expect, it } from 'vitest'
import {
  creatureHealth,
  damageMultiplier,
  staggerThreshold,
  toInflict,
  type DamageModifier,
} from './creature'

describe('creatureHealth', () => {
  it('is the listed health without stars', () => {
    expect(creatureHealth(600, 0)).toBe(600)
  })

  it('doubles at one star and triples at two', () => {
    expect([creatureHealth(600, 1), creatureHealth(600, 2)]).toEqual([1200, 1800])
  })
})

describe('staggerThreshold', () => {
  it('is a share of the health: 180 for a troll', () => {
    expect(staggerThreshold(600, 0.3, 0)).toBe(180)
  })

  it('follows the health up with the stars', () => {
    expect(staggerThreshold(1000, 0.3, 1)).toBe(600)
  })

  it('is null for a creature that never staggers', () => {
    expect(staggerThreshold(5000, 0, 0)).toBeNull()
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

describe('damageMultiplier', () => {
  it.each<[DamageModifier, number]>([
    ['normal', 1],
    ['slightlyWeak', 1.25],
    ['weak', 1.5],
    ['veryWeak', 2],
    ['slightlyResistant', 0.75],
    ['resistant', 0.5],
    ['veryResistant', 0.25],
    ['immune', 0],
    ['ignore', 0],
  ])('multiplies %s damage by %s', (modifier, multiplier) => {
    expect(damageMultiplier(modifier)).toBe(multiplier)
  })
})
