import { DAMAGE_TYPES, STAGGER_TYPES, type DamageType } from '@/combat/damage'
import { game } from '@/data'
import type { BiomeId, GameCreature, GameRuleEffect, Localized } from '@/data/types'
import { changesNoHit } from '@/features/gear/carried'

export const SHEETS = [
  'parry',
  'block',
  'bar',
  'stagger',
  'unblockable',
  'combos',
  'roll',
  'adrenaline',
  'effects',
] as const
export type SheetId = (typeof SHEETS)[number]

/** What an effect or a piece of armor changes in a fight, as the Guide words it. */
export type RuleChange = Pick<
  GameRuleEffect,
  | 'modifiers'
  | 'addArmor'
  | 'armorMultiplier'
  | 'staggerModifier'
  | 'parryBonus'
  | 'blockStaminaModifier'
  | 'blockStaminaFlat'
  | 'dodgeStaminaModifier'
>

/** A sheet of the Guide: its title, the figure it turns on, and its rules, one sentence each. */
export interface GuideSheet {
  readonly id: SheetId
  readonly title: string
  readonly fact: string
  readonly items: readonly string[]
}

const creature = (id: string): GameCreature => {
  const found = game.creatures.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`No creature ${id} in the game data`)
  return found
}

const biomeName = (id: BiomeId): Localized => {
  const found = game.biomes.find((biome) => biome.id === id)
  if (!found) throw new Error(`No biome ${id} in the game data`)
  return found.name
}

const attackName = (creatureId: string, attackId: string): Localized => {
  const found = creature(creatureId).attacks.find((attack) => attack.ids.includes(attackId))
  if (!found) throw new Error(`No attack ${attackId} for ${creatureId} in the game data`)
  return found.name
}

const fighters = game.creatures.flatMap((c) => [c, ...(c.phases ?? [])])
const unblockable = fighters
  .flatMap((fighter) => fighter.attacks)
  .filter((attack) => attack.hits.some((hit) => !hit.blockable))
const staggerFactors = game.creatures.map((c) => c.staggerFactor).filter((factor) => factor > 0)

// The items a parry gives stamina back with, by how much.
const refunds = new Map<number, Localized[]>()
for (const blocker of game.blockers) {
  if (blocker.perfectBlockStaminaRegen <= 0) continue
  refunds.set(blocker.perfectBlockStaminaRegen, [
    ...(refunds.get(blocker.perfectBlockStaminaRegen) ?? []),
    blocker.name,
  ])
}

/** What the Guide reads in the game data rather than in its own words, so that it follows the game:
 * the player's values, names, and counts over the creatures and items. */
export const figures = {
  parryCost: game.player.perfectBlockStaminaDrain,
  blockCost: game.player.blockStaminaDrain,
  staggerShare: game.player.staggerFactor * 100,
  dodgeCost: game.player.dodgeStamina,
  dodgeRefund: game.player.perfectDodgeRefund * 100,
  parryRefunds: [...refunds].map(([stamina, items]) => ({ stamina, items })),
  monsterFactors: { min: Math.min(...staggerFactors), max: Math.max(...staggerFactors) },
  unblockable: {
    total: unblockable.length,
    dodgeable: unblockable.filter((attack) =>
      attack.hits.every((hit) => hit.blockable || hit.dodgeable),
    ).length,
  },
  staggerTypes: STAGGER_TYPES.map((type) => game.damageTypes[type]),
  otherTypes: DAMAGE_TYPES.filter((type: DamageType) => !STAGGER_TYPES.includes(type)).map(
    (type) => game.damageTypes[type],
  ),
  eikthyr: creature('Eikthyr').name,
  gammeltroll: creature('TrollFrost').name,
  ruleEffects: game.ruleEffects.filter((effect) => !changesNoHit(effect)),
  freezing: { ...game.freezing, biomes: game.freezing.biomes.map(biomeName) },
  frost: game.damageTypes.frost,
  moder: creature('Dragon').name,
  coldBreath: attackName('Dragon', 'dragon_coldbreath'),
  /** The pieces whose own stamina shares change what a guard or a dodge costs. */
  gearRules: game.armorPieces.filter(
    (piece) => piece.blockStaminaModifier !== undefined || piece.dodgeStaminaModifier !== undefined,
  ),
}
