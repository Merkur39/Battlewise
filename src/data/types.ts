import type { Blocker } from '@/combat/block'
import type { DamageModifier } from '@/combat/creature'
import type { DamageType, Damages } from '@/combat/damage'

/** A name as the game shows it in French and in English. */
export interface Localized {
  readonly fr: string
  readonly en: string
}

export type BiomeId =
  | 'meadows'
  | 'blackForest'
  | 'swamp'
  | 'mountain'
  | 'plains'
  | 'mistlands'
  | 'ashlands'
  | 'deepNorth'
  | 'ocean'

/** One hit of an attack, as listed before world and stars. */
export interface GameHit {
  readonly damages: Damages
  readonly staggerMultiplier: number
  readonly blockable: boolean
  readonly dodgeable: boolean
  /** Projectiles fired at once, when more than one. */
  readonly count?: number
}

export type AttackKind = 'melee' | 'area' | 'projectile'

export interface GameAttack {
  /** Item prefabs behind this attack; identical ones (same name and hits) are merged. */
  readonly ids: readonly string[]
  readonly name: Localized
  readonly kind: AttackKind
  /** Null when the damage could not be read (spawned abilities, explosions). */
  readonly hits: readonly GameHit[] | null
}

export interface GameCreature {
  readonly id: string
  readonly name: Localized
  readonly biomes: readonly BiomeId[]
  readonly boss: boolean
  readonly health: number
  readonly staggerFactor: number
  /** Whether a parry staggers it (Character.m_staggerWhenBlocked). */
  readonly staggeredByParry: boolean
  /** Only the damage types it does not take normally. */
  readonly modifiers: Partial<Record<DamageType, DamageModifier>>
  readonly attacks: readonly GameAttack[]
}

export type BlockerGroup = 'round' | 'buckler' | 'tower' | 'weapon' | 'other'

export interface GameBlocker extends Blocker {
  readonly id: string
  readonly name: Localized
  readonly group: BlockerGroup
  readonly maxQuality: number
  readonly deflectionForce: number
  readonly deflectionForcePerLevel: number
  readonly movementModifier: number
  /** Stamina given back by a parry (torch, club…). */
  readonly perfectBlockStaminaRegen: number
}

export interface GameData {
  readonly game: { readonly version: string | null; readonly build: number }
  readonly player: {
    readonly blockStaminaDrain: number
    readonly perfectBlockStaminaDrain: number
    readonly staggerFactor: number
  }
  readonly biomes: readonly { readonly id: BiomeId; readonly name: Localized }[]
  readonly damageTypes: Readonly<Record<DamageType, Localized>>
  readonly modifiers: Readonly<Record<Exclude<DamageModifier, 'normal' | 'ignore'>, Localized>>
  readonly creatures: readonly GameCreature[]
  readonly blockers: readonly GameBlocker[]
}
