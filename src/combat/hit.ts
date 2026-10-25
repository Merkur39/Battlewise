import { applyArmorTo } from './armor'
import type { Defence } from './block'
import { scaleDamages, staggerDamage, totalDamage, type Damages } from './damage'
import { worldScale, type World } from './world'

/** A monster attack, as the game data lists it (before world and stars). */
export interface Hit {
  readonly damages: Damages
  /** Weighs on the stagger of what passes the armor (Attack.m_staggerMultiplier). */
  readonly staggerMultiplier: number
  readonly blockable: boolean
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
  readonly stamina: number
  readonly bar: StaggerBar
}

// The player staggers at 40 % of max health (m_staggerDamageFactor).
const STAGGER_LIMIT = 0.4
// Player.m_blockStaminaDrain, spent in proportion to the share of the block power used.
const BLOCK_STAMINA = 10
// Character.ApplyDamage drops what is left at 0.1 or less.
const MIN_DAMAGE = 0.1
// Attack.GetLevelDamageFactor: each star adds half of the damage.
const DAMAGE_PER_STAR = 0.5

function verdictOf(blockable: boolean, broken: boolean, staggered: boolean): Verdict {
  if (!blockable) return 'unblockable'
  if (broken) return 'broken'
  return staggered ? 'staggered' : 'holds'
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

  const damages = scaleDamages(hit.damages, worldScale(world).enemy * (1 + stars * DAMAGE_PER_STAR))
  const received = totalDamage(damages)
  const limit = STAGGER_LIMIT * defence.maxHealth
  const before = barBefore * limit

  let pastGuard = damages
  let shield = 0
  let stamina = 0
  let broken = false
  if (hit.blockable) {
    const pastShield = applyArmorTo(damages, power)
    const blocked = received - totalDamage(pastShield)
    shield = staggerDamage(pastShield)
    stamina = guard === 'parry' ? 0 : BLOCK_STAMINA * Math.min(1, blocked / power)
    broken = before + shield >= limit
    if (!broken) pastGuard = pastShield
  }

  const pastArmor = applyArmorTo(pastGuard, defence.armor)
  const left = totalDamage(pastArmor)
  const taken = left > MIN_DAMAGE ? left : 0
  const armor = taken > 0 ? staggerDamage(pastArmor) * hit.staggerMultiplier : 0
  const staggered = before + shield + armor >= limit

  return {
    verdict: verdictOf(hit.blockable, broken, staggered),
    staggered,
    received,
    taken,
    stamina,
    bar: { before, shield, armor, limit },
  }
}
