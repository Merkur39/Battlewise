import type { DamageModifiers } from './modifiers'

/** What an item brings to a block, as the game data lists it. */
export interface Blocker {
  readonly blockPower: number
  readonly blockPowerPerLevel: number
  /** Multiplies the block power on a parry; an item parries only when it is above 1. */
  readonly timedBlockBonus: number
  /** Applied to every hit it blocks (Humanoid.BlockAttack); only the Serpent Scale shield has one. */
  readonly modifiers?: DamageModifiers
  /** Stamina a successful parry gives back (m_perfectBlockStaminaRegen). */
  readonly perfectBlockStaminaRegen?: number
}

export interface Profile {
  readonly blocker: Blocker
  readonly level: number
  /** Blocking skill, 0 to 100. */
  readonly skill: number
  readonly armor: number
  readonly maxHealth: number
  /** The player's own damage modifiers (spirit immune), with any from gear or effects. */
  readonly modifiers?: DamageModifiers
}

/** The values a hit is resolved against. */
export interface Defence {
  readonly blockPower: number
  /** Null when the item cannot parry. */
  readonly parryPower: number | null
  readonly armor: number
  readonly maxHealth: number
  /** The player's, applied past the guard and before the armor (Character.RPC_Damage). */
  readonly modifiers?: DamageModifiers
  /** The blocker's, applied to the hit before the block, and kept when the block breaks. */
  readonly blockerModifiers?: DamageModifiers
  readonly parryStaminaRegen?: number
}

// ItemDrop.ItemData.GetBlockPower: the skill adds up to half of the base value.
export function blockPower(blocker: Blocker, level: number, skill: number): number {
  const base = blocker.blockPower + (level - 1) * blocker.blockPowerPerLevel
  return base + base * (skill / 100) * 0.5
}

export function parryPower(blocker: Blocker, level: number, skill: number): number | null {
  if (blocker.timedBlockBonus <= 1) return null
  return blockPower(blocker, level, skill) * blocker.timedBlockBonus
}

export function defenceOf({
  blocker,
  level,
  skill,
  armor,
  maxHealth,
  modifiers,
}: Profile): Defence {
  return {
    blockPower: blockPower(blocker, level, skill),
    parryPower: parryPower(blocker, level, skill),
    armor,
    maxHealth,
    modifiers: modifiers ?? {},
    blockerModifiers: blocker.modifiers ?? {},
    parryStaminaRegen: blocker.perfectBlockStaminaRegen ?? 0,
  }
}
