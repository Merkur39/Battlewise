import { describe, expect, it } from 'vitest'
import { scaleDamages, staggerDamage, totalDamage } from './damage'

describe('totalDamage', () => {
  it('adds every damage type', () => {
    expect(totalDamage({ blunt: 40, fire: 30, poison: 20 })).toBe(90)
  })

  it('is zero for an attack without damage', () => {
    expect(totalDamage({})).toBe(0)
  })
})

describe('staggerDamage', () => {
  it('counts blunt, slash, pierce and lightning', () => {
    expect(staggerDamage({ blunt: 1, slash: 2, pierce: 4, lightning: 8 })).toBe(15)
  })

  it('leaves fire, frost, poison and spirit out of the stagger bar', () => {
    expect(staggerDamage({ fire: 10, frost: 10, poison: 10, spirit: 10 })).toBe(0)
  })
})

describe('scaleDamages', () => {
  it('multiplies every type by the same factor', () => {
    expect(scaleDamages({ blunt: 40, fire: 30 }, 1.5)).toEqual({ blunt: 60, fire: 45 })
  })
})
