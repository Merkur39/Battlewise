import { DAMAGE_TYPES, type DamageType, type Damages } from './damage'

/** HitData.DamageModifier: how a creature, the player or a shield takes one damage type. */
export type DamageModifier =
  | 'normal'
  | 'slightlyWeak'
  | 'weak'
  | 'veryWeak'
  | 'slightlyResistant'
  | 'resistant'
  | 'veryResistant'
  | 'immune'
  | 'ignore'

/** Modifiers by damage type; a missing type is taken normally. */
export type DamageModifiers = Partial<Record<DamageType, DamageModifier>>

// HitData.ApplyModifier.
const MULTIPLIERS: Record<DamageModifier, number> = {
  normal: 1,
  slightlyWeak: 1.25,
  weak: 1.5,
  veryWeak: 2,
  slightlyResistant: 0.75,
  resistant: 0.5,
  veryResistant: 0.25,
  immune: 0,
  ignore: 0,
}

export const damageMultiplier = (modifier: DamageModifier) => MULTIPLIERS[modifier]

/** HitData.ApplyResistance: each type scaled by its own modifier. */
export function applyModifiers(damages: Damages, modifiers: DamageModifiers): Damages {
  const result: Damages = {}
  for (const type of DAMAGE_TYPES) {
    const value = damages[type]
    if (value === undefined) continue
    const modifier = modifiers[type]
    result[type] = modifier ? value * damageMultiplier(modifier) : value
  }
  return result
}
