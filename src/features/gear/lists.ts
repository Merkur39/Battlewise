import { blockerOf } from '@/app/context'
import type { Gear } from '@/app/store'
import type { ArmorSlot } from '@/data/types'
import { categoryOf, FAMILIES, type ArsenalCategory } from '@/features/arsenal/model'
import { carriable, NOTHING_CARRIED } from './carried'
import { leveled, maxLevel } from './model'
import { pieceOf, type Pieces } from './pieces'

/** A row of Your gear, as the list it opens: what is held, a slot, the trinket, the power, a drink (by
 * its place among those carried) or one more drink (index null). */
export type GearList =
  | { readonly kind: 'hand' }
  | { readonly kind: 'piece'; readonly slot: ArmorSlot }
  | { readonly kind: 'trinket' }
  | { readonly kind: 'power' }
  | { readonly kind: 'drink'; readonly index: number | null }

const SLOT_CATEGORIES: Record<ArmorSlot, ArsenalCategory> = {
  helmet: 'helmets',
  chest: 'chests',
  legs: 'legs',
  cape: 'capes',
}

export interface ListOf {
  /** The Arsenal's category it opens on; what is held switches between the three of the hand. */
  readonly category: ArsenalCategory
  /** What the row holds now, null when it holds nothing. */
  readonly current: string | null
  /** The drinks it offers, in the order of Your gear: a drink only once among those carried. Null when it
   * offers the whole category. */
  readonly choices: readonly string[] | null
}

/** What a row's list opens on. */
export function listOf(gear: Gear, list: GearList): ListOf {
  const carried = gear.carried ?? NOTHING_CARRIED
  switch (list.kind) {
    case 'hand':
      return {
        category: categoryOf(blockerOf(gear.blocker)) ?? 'shields',
        current: gear.blocker,
        choices: null,
      }
    case 'piece':
      return {
        category: SLOT_CATEGORIES[list.slot],
        current: gear.pieces?.[list.slot]?.id ?? null,
        choices: null,
      }
    case 'trinket':
      return { category: 'trinkets', current: carried.trinket, choices: null }
    case 'power':
      return { category: 'powers', current: carried.power, choices: null }
    case 'drink': {
      const current = list.index === null ? null : (carried.drinks[list.index] ?? null)
      const others = carried.drinks.filter((drink) => drink !== current)
      return {
        category: 'drinks',
        current,
        choices: carriable('consumable')
          .map(({ id }) => id)
          .filter((id) => !others.includes(id)),
      }
    }
  }
}

const without = (pieces: Pieces, slot: ArmorSlot): Pieces =>
  Object.fromEntries(Object.entries(pieces).filter(([key]) => key !== slot))

/** Your gear once `id` is picked in a row's list, as picking it in Your gear did: held or worn at the level
 * of what it replaces (1 for bare hands or an empty slot), within its own; null takes off what the row
 * holds. */
export function pickInto(gear: Gear, list: GearList, id: string | null): Gear {
  const carried = gear.carried ?? NOTHING_CARRIED
  switch (list.kind) {
    case 'hand': {
      if (id === null) return gear
      const blocker = blockerOf(id)
      // Bare hands have no level to pass on.
      const level = leveled(blockerOf(gear.blocker)) ? gear.level : 1
      return { ...gear, blocker: blocker.id, level: Math.min(level, maxLevel(blocker)) }
    }
    case 'piece': {
      // Picking a piece wears the pieces from then on: a typed armor makes way for them.
      const others = without(gear.pieces ?? {}, list.slot)
      if (id === null) return { ...gear, armor: 0, pieces: others }
      const level = Math.min(gear.pieces?.[list.slot]?.level ?? 1, maxLevel(pieceOf(id)))
      return { ...gear, armor: 0, pieces: { ...others, [list.slot]: { id, level } } }
    }
    case 'trinket':
      return { ...gear, carried: { ...carried, trinket: id } }
    case 'power':
      return { ...gear, carried: { ...carried, power: id } }
    case 'drink': {
      const { index } = list
      const drinks =
        index === null
          ? [...carried.drinks, ...(id === null ? [] : [id])]
          : id === null
            ? carried.drinks.filter((_, at) => at !== index)
            : carried.drinks.map((drink, at) => (at === index ? id : drink))
      return { ...gear, carried: { ...carried, drinks } }
    }
  }
}

/** Bare hands, in the game data: what a new character holds. */
export const UNARMED = 'PlayerUnarmed'

/** What is held switches between these. */
export const HAND: readonly ArsenalCategory[] = FAMILIES[0].categories

/** The copy a list is keyed by: what is held, a slot, the trinket, the power, a drink or one more. */
export const keyOf = (list: GearList) =>
  list.kind === 'piece'
    ? list.slot
    : list.kind === 'drink'
      ? list.index === null
        ? 'moreDrink'
        : 'drink'
      : list.kind

/** Whether every drink is carried already: « Ajouter une boisson » has nothing left to add. */
export const allDrinksCarried = (gear: Gear) =>
  (gear.carried ?? NOTHING_CARRIED).drinks.length >= carriable('consumable').length
