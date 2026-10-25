import { worldScale, type World } from './world'

/** HitData.DamageModifier: how a creature takes one damage type. */
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

// Character.SetupMaxHealth: health × level, a star being one level above the first.
export const creatureHealth = (health: number, stars: number) => health * (stars + 1)

/** Stagger damage that fills a creature's bar; null when it never staggers. */
export function staggerThreshold(health: number, staggerFactor: number, stars: number) {
  return staggerFactor > 0 ? creatureHealth(health, stars) * staggerFactor : null
}

/** Stagger damage to deal, as your hits list it, once the world has scaled them down. */
export const toInflict = (threshold: number, world: World) => threshold / worldScale(world).you
