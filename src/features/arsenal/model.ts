import { blockPower, parryPower } from '@/combat/block'
import { game } from '@/data'
import type { GameBlocker } from '@/data/types'
import { maxLevel } from '@/features/gear/model'

export const CATEGORIES = ['shields', 'weapons', 'others'] as const
export type ArsenalCategory = (typeof CATEGORIES)[number]

export const SORTS = ['power', 'parry', 'force', 'speed'] as const
export type ArsenalSort = (typeof SORTS)[number]

export interface ArsenalOptions {
  /** The upgrade level picked; each item stops at its own max. */
  readonly level: number
  /** Blocking skill, 0 to 100. */
  readonly skill: number
  /** The id of the item that blocks in Your gear. */
  readonly equipped: string
  readonly sort: ArsenalSort
}

export interface ArsenalRow {
  readonly blocker: GameBlocker
  /** The level shown: the one picked, or the item's max when it stops below. */
  readonly level: number
  readonly power: number
  /** Null when the item cannot parry. */
  readonly parry: number | null
  /** How hard a block pushes the attacker back. */
  readonly force: number
  /** Share of the movement speed it adds while held: -0.05 for 5 % slower. */
  readonly speed: number
  readonly equipped: boolean
}

/** The tab an item is listed under; null for what its own attack uses up (bombs, snowballs), which
 * nobody holds up to block. */
export function categoryOf(blocker: GameBlocker): ArsenalCategory | null {
  if (blocker.consumable) return null
  if (blocker.group === 'weapon') return 'weapons'
  if (blocker.group === 'other' || blocker.group === 'unarmed') return 'others'
  return 'shields'
}

const sortKey: Record<ArsenalSort, (row: ArsenalRow) => number> = {
  power: (row) => row.power,
  parry: (row) => row.parry ?? -Infinity,
  force: (row) => row.force,
  speed: (row) => row.speed,
}

/** The items of a tab at your skill and the level picked: the one you hold first, then the most of
 * what the sort asks for first, the block power breaking ties. */
export function arsenalRows(
  category: ArsenalCategory,
  { level, skill, equipped, sort }: ArsenalOptions,
): ArsenalRow[] {
  const key = sortKey[sort]
  return game.blockers
    .filter((blocker) => categoryOf(blocker) === category)
    .map((blocker) => {
      const shown = Math.min(level, maxLevel(blocker))
      return {
        blocker,
        level: shown,
        power: blockPower(blocker, shown, skill),
        parry: parryPower(blocker, shown, skill),
        force: blocker.deflectionForce + (shown - 1) * blocker.deflectionForcePerLevel,
        speed: blocker.movementModifier,
        equipped: blocker.id === equipped,
      }
    })
    .toSorted(
      (a, b) => Number(b.equipped) - Number(a.equipped) || key(b) - key(a) || b.power - a.power,
    )
}
