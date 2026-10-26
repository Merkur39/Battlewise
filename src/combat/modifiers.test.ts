import { describe, expect, it } from 'vitest'
import { applyModifiers, damageMultiplier, type DamageModifier } from './modifiers'

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

describe('applyModifiers', () => {
  it('scales each type by its own modifier', () => {
    expect(
      applyModifiers(
        { slash: 40, pierce: 40, spirit: 30 },
        { pierce: 'resistant', spirit: 'immune' },
      ),
    ).toEqual({
      slash: 40,
      pierce: 20,
      spirit: 0,
    })
  })

  it('leaves the damage as it is without modifiers', () => {
    expect(applyModifiers({ blunt: 70 }, {})).toEqual({ blunt: 70 })
  })
})
