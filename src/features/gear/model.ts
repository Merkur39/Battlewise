import type { Blocker, Defence } from '@/combat/block'
import { gaugeScale, maxHit } from '@/combat/maxHit'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { BlockerGroup, GameBlocker } from '@/data/types'
import type { Language } from '@/i18n/detect'

/** What a guard takes with an empty bar, in hits as listed: without staggering, then before it breaks. */
export interface GuardGauge {
  readonly power: number
  readonly unstaggered: number
  readonly unbroken: number
}

/** « Ce que tu encaisses ». */
export interface Withstand {
  readonly block: GuardGauge
  /** Null when the item cannot parry. */
  readonly parry: GuardGauge | null
  /** The common end of both gauges. */
  readonly scale: number
  /** The bar a hit must fill to stagger you. */
  readonly staggerAt: number
}

function gauge(defence: Defence, world: World, guard: 'block' | 'parry'): GuardGauge | null {
  const power = guard === 'block' ? defence.blockPower : defence.parryPower
  const unstaggered = maxHit(defence, world, guard, 'unstaggered')
  const unbroken = maxHit(defence, world, guard, 'unbroken')
  if (power === null || unstaggered === null || unbroken === null) return null
  return { power, unstaggered, unbroken }
}

export function withstand(defence: Defence, world: World): Withstand {
  // A block always resolves: only a parry can be missing.
  const block = gauge(defence, world, 'block')!
  const parry = gauge(defence, world, 'parry')
  return {
    block,
    parry,
    scale: gaugeScale([block.unbroken, ...(parry ? [parry.unbroken] : [])]),
    staggerAt: defence.maxHealth * game.player.staggerFactor,
  }
}

/** The block power as the item at its level times what the skill adds (ItemData.GetBlockPower). */
export function blockPowerParts(blocker: Blocker, level: number, skill: number) {
  return {
    base: blocker.blockPower + (level - 1) * blocker.blockPowerPerLevel,
    skill: 1 + (skill / 100) * 0.5,
  }
}

/** How far the level of Your gear goes past maxQuality for an item the Forge of Potential takes on:
 * the game sets no end, each level only costs more. */
export const FORGE_MAX_LEVEL = 10

export const maxLevel = (blocker: GameBlocker) =>
  blocker.forge ? Math.max(blocker.maxQuality, FORGE_MAX_LEVEL) : blocker.maxQuality

/** The groups of the item picker; bare hands go with the others. */
export type PickerGroup = Exclude<BlockerGroup, 'unarmed'>
const GROUPS: readonly PickerGroup[] = ['round', 'buckler', 'tower', 'weapon', 'other']

/** Every blocker, by group, each group sorted by name in the language shown. */
export function blockerGroups(language: Language) {
  return GROUPS.map((group) => ({
    group,
    blockers: game.blockers
      .filter((blocker) => (blocker.group === 'unarmed' ? 'other' : blocker.group) === group)
      .toSorted((a, b) => a.name[language].localeCompare(b.name[language], language)),
  }))
}
