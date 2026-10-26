import { applyArmorTo } from './armor'
import type { Defence } from './block'
import { overTimeDamage, scaleDamages, staggerDamage, totalDamage, type Damages } from './damage'
import { applyModifiers } from './modifiers'
import { worldScale, type World } from './world'

/**
 * What scales a hit before it lands:
 * - attack: the hit the attack builds, scaled by the world and the stars (Attack.ModifyDamage);
 * - world: a projectile or area with its own damage and the creature as owner: the world only;
 * - none: an area with no owner (spawned by an ability, a death): neither (Character.RPC_Damage).
 */
export type HitScaling = 'attack' | 'world' | 'none'

/** A monster attack, as the game data lists it (before world and stars). */
export interface Hit {
  readonly damages: Damages
  /** Weighs on the stagger of what passes the armor (Attack.m_staggerMultiplier). */
  readonly staggerMultiplier: number
  readonly blockable: boolean
  /** The attack's own hit when left out. */
  readonly scaling?: HitScaling
  /** Generic damage (DamageTypes.m_damage): no guard, resistance, armor or stagger; scaled by stars only. */
  readonly trueDamage?: number
}

export type Guard = 'block' | 'parry'

export interface HitOptions {
  readonly guard: Guard
  readonly stars: number
  /** Share of the stagger bar already filled before the hit, from 0 to 1. */
  readonly barBefore: number
}

/**
 * - holds: blocked, no stagger;
 * - staggered: blocked, but what passes fills the bar;
 * - broken: what passes the shield fills the bar, the block is cancelled;
 * - unblockable: the attack cannot be blocked at all.
 */
export type Verdict = 'holds' | 'staggered' | 'broken' | 'unblockable'

export interface StaggerBar {
  readonly before: number
  /** What passes the shield, counted once at the block (Humanoid.BlockAttack)… */
  readonly shield: number
  /** …then what passes the armor, counted again when the damage lands (Character.ApplyDamage). */
  readonly armor: number
  readonly limit: number
}

export interface HitResult {
  readonly verdict: Verdict
  readonly staggered: boolean
  /** The hit after world and stars, before shield and armor. */
  readonly received: number
  readonly taken: number
  /** The part of `taken` dealt over time: burning, poison, spirit. */
  readonly overTime: number
  /** Stamina spent; negative when the parry gives some back. */
  readonly stamina: number
  readonly bar: StaggerBar
}

// The player staggers at 40 % of max health (m_staggerDamageFactor).
const STAGGER_LIMIT = 0.4
// Player.m_blockStaminaDrain, spent in proportion to the share of the block power used.
const BLOCK_STAMINA = 10
// Character.ApplyDamage drops a direct hit of 0.1 or less, and its stagger with it.
const MIN_DAMAGE = 0.1
// Attack.GetLevelDamageFactor: each star adds half of the damage.
const DAMAGE_PER_STAR = 0.5

function verdictOf(blockable: boolean, broken: boolean, staggered: boolean): Verdict {
  if (!blockable) return 'unblockable'
  if (broken) return 'broken'
  return staggered ? 'staggered' : 'holds'
}

/** [typed damage factor, true damage factor]: the world never scales true damage (HitData.ApplyModifier). */
function scalingOf(scaling: HitScaling, world: World, stars: number): [number, number] {
  const starFactor = 1 + stars * DAMAGE_PER_STAR
  if (scaling === 'attack') return [worldScale(world).enemy * starFactor, starFactor]
  if (scaling === 'world') return [worldScale(world).enemy, 1]
  return [1, 1]
}

/** Resolves a hit against a block or a parry; null when the item cannot parry. */
export function resolveHit(
  defence: Defence,
  hit: Hit,
  world: World,
  { guard, stars, barBefore }: HitOptions,
): HitResult | null {
  const power = guard === 'parry' ? defence.parryPower : defence.blockPower
  if (power === null) return null

  const [typedFactor, trueFactor] = scalingOf(hit.scaling ?? 'attack', world, stars)
  let damages = scaleDamages(hit.damages, typedFactor)
  const trueDamage = (hit.trueDamage ?? 0) * trueFactor
  const received = totalDamage(damages) + trueDamage
  const limit = STAGGER_LIMIT * defence.maxHealth
  const before = barBefore * limit

  let shield = 0
  let stamina = 0
  let broken = false
  if (hit.blockable) {
    damages = applyModifiers(damages, defence.blockerModifiers ?? {})
    const pastShield = applyArmorTo(damages, power)
    const blocked = totalDamage(damages) - totalDamage(pastShield)
    shield = staggerDamage(pastShield)
    broken = before + shield >= limit
    const refund = defence.parryStaminaRegen ?? 0
    if (guard === 'block') stamina = BLOCK_STAMINA * Math.min(1, blocked / power)
    else if (!broken && refund > 0) stamina = -refund
    if (!broken) damages = pastShield
  }

  const pastArmor = applyArmorTo(applyModifiers(damages, defence.modifiers ?? {}), defence.armor)
  const overTime = overTimeDamage(pastArmor)
  const direct = totalDamage(pastArmor) - overTime + trueDamage
  const landed = direct > MIN_DAMAGE
  const armor = landed ? staggerDamage(pastArmor) * hit.staggerMultiplier : 0
  const staggered = before + shield + armor >= limit

  return {
    verdict: verdictOf(hit.blockable, broken, staggered),
    staggered,
    received,
    taken: (landed ? direct : 0) + overTime,
    overTime,
    stamina,
    bar: { before, shield, armor, limit },
  }
}
