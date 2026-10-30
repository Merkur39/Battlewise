import { describe, expect, it } from 'vitest'
import { applyModifiers, damageMultiplier, mergeModifiers, type DamageModifier } from './modifiers'

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

describe('mergeModifiers', () => {
  it.each<[DamageModifier, DamageModifier, DamageModifier]>([
    ['resistant', 'slightlyResistant', 'resistant'],
    ['slightlyResistant', 'resistant', 'resistant'],
    ['veryResistant', 'resistant', 'veryResistant'],
    ['weak', 'resistant', 'resistant'],
    ['resistant', 'weak', 'resistant'],
    ['slightlyWeak', 'weak', 'weak'],
    ['weak', 'slightlyWeak', 'weak'],
    ['veryWeak', 'immune', 'immune'],
    ['ignore', 'immune', 'ignore'],
    // Two quirks of the game's rule: a later resistance lowers immune, a later normal clears a state.
    ['immune', 'resistant', 'resistant'],
    ['resistant', 'normal', 'normal'],
  ])('keeps %s then %s as %s, never multiplied', (first, then, kept) => {
    expect(mergeModifiers({ pierce: first }, { pierce: then }).pierce ?? 'normal').toBe(kept)
  })

  it('merges the player, the pieces and the effects type by type', () => {
    const player = { spirit: 'immune' } as const
    const rootHarnesk = { pierce: 'resistant', fire: 'weak' } as const
    const barleyWine = { fire: 'resistant' } as const
    const crystalHeart = {
      blunt: 'slightlyResistant',
      slash: 'slightlyResistant',
      pierce: 'slightlyResistant',
    } as const

    expect(mergeModifiers(player, rootHarnesk, barleyWine, crystalHeart)).toEqual({
      blunt: 'slightlyResistant',
      slash: 'slightlyResistant',
      pierce: 'resistant',
      fire: 'resistant',
      spirit: 'immune',
    })
  })
})
