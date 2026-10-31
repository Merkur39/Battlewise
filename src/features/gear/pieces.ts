import type { ArmorPiece } from '@/combat/block'
import { mergeModifiers, type DamageModifiers } from '@/combat/modifiers'
import { game } from '@/data'
import type { ArmorSlot, GameArmorPiece, GameRuleEffect } from '@/data/types'
import type { Language } from '@/i18n/detect'

/** A piece worn, by its id in the game data, at its level. */
export interface Worn {
  readonly id: string
  readonly level: number
}

/** What Your gear wears, slot by slot; an empty slot wears nothing. */
export type Pieces = Partial<Record<ArmorSlot, Worn>>

/** As Your gear lists them. */
export const SLOTS: readonly ArmorSlot[] = ['helmet', 'chest', 'legs', 'cape']

// Player.ApplyArmorDamageMods and GetBodyArmor go through the chest, the legs, the helmet, then the cape.
const GAME_ORDER: readonly ArmorSlot[] = ['chest', 'legs', 'helmet', 'cape']

// The store only holds ids the game data has (checked on load), so a miss is a bug.
export function pieceOf(id: string): GameArmorPiece {
  const piece = game.armorPieces.find((candidate) => candidate.id === id)
  if (!piece) throw new Error(`No armor piece ${id} in the game data`)
  return piece
}

/** ItemDrop.ItemData.GetArmor. */
export const pieceArmor = (piece: GameArmorPiece, level: number) =>
  piece.armor + (level - 1) * piece.armorPerLevel

/** The pieces a slot can take, sorted by name in the language shown. */
export const slotPieces = (slot: ArmorSlot, language: Language) =>
  game.armorPieces
    .filter((piece) => piece.slot === slot)
    .toSorted((a, b) => a.name[language].localeCompare(b.name[language], language))

const worn = (pieces: Pieces, order: readonly ArmorSlot[]) =>
  order.flatMap((slot) => {
    const piece = pieces[slot]
    return piece ? [{ piece: pieceOf(piece.id), level: piece.level }] : []
  })

/** The pieces as the engine takes them, in the game's order. */
export const wornPieces = (pieces: Pieces): ArmorPiece[] =>
  worn(pieces, GAME_ORDER).map(({ piece, level }) => ({ ...piece, level }))

/** The bonus of each set worn whole, among those that change a fight (SE_Stats of the set). */
export const setEffects = (pieces: Pieces): GameRuleEffect[] =>
  game.ruleEffects.filter(
    (effect) =>
      effect.kind === 'set' &&
      effect.set !== undefined &&
      worn(pieces, SLOTS).filter(({ piece }) => piece.set === effect.set?.id).length >=
        effect.set.size,
  )

/** What Your gear says of the pieces: each one's armor, helmet to cape, their total, and the
 * resistances and weaknesses they and their complete sets bring. */
export interface PiecesSummary {
  readonly parts: readonly number[]
  readonly armor: number
  readonly modifiers: DamageModifiers
  readonly sets: readonly GameRuleEffect[]
}

export function summarize(pieces: Pieces): PiecesSummary {
  const parts = worn(pieces, SLOTS).map(({ piece, level }) => pieceArmor(piece, level))
  const sets = setEffects(pieces)
  return {
    parts,
    armor: parts.reduce((sum, part) => sum + part, 0),
    modifiers: mergeModifiers(
      ...wornPieces(pieces).map((piece) => piece.modifiers ?? {}),
      ...sets.map((set) => set.modifiers ?? {}),
    ),
    sets,
  }
}
