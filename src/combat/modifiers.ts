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

const RESISTANCES: readonly DamageModifier[] = [
  'slightlyResistant',
  'resistant',
  'veryResistant',
  'immune',
]
const WEAKNESSES: readonly DamageModifier[] = ['slightlyWeak', 'weak', 'veryWeak']
// The states a stronger one in the same direction never gives way to.
const WEAKER: Partial<Record<DamageModifier, readonly DamageModifier[]>> = {
  veryResistant: ['resistant', 'slightlyResistant'],
  resistant: ['slightlyResistant'],
  veryWeak: ['weak', 'slightlyWeak'],
  weak: ['slightlyWeak'],
}

// HitData.DamageModifiers.ShouldOverride: whether a later state replaces the one a type has.
function overrides(current: DamageModifier, next: DamageModifier): boolean {
  if (current === 'ignore') return false
  if (next === 'immune') return true
  if (WEAKER[current]?.includes(next)) return false
  return !(RESISTANCES.includes(current) && WEAKNESSES.includes(next))
}

/**
 * HitData.DamageModifiers.Apply, layer after layer (the player's own, the armor pieces', then each
 * effect's): a state replaces the one before only when the game lets it, so they never multiply.
 */
export function mergeModifiers(...layers: readonly DamageModifiers[]): DamageModifiers {
  const merged: DamageModifiers = {}
  for (const type of DAMAGE_TYPES) {
    const state = layers.reduce<DamageModifier>((current, layer) => {
      const next = layer[type]
      return next !== undefined && overrides(current, next) ? next : current
    }, 'normal')
    if (state !== 'normal') merged[type] = state
  }
  return merged
}

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
