/** What an item brings to a block, as the game data lists it. */
export interface Blocker {
  readonly blockPower: number
  readonly blockPowerPerLevel: number
  /** Multiplies the block power on a parry; an item parries only when it is above 1. */
  readonly timedBlockBonus: number
}

export interface Profile {
  readonly blocker: Blocker
  readonly level: number
  /** Blocking skill, 0 to 100. */
  readonly skill: number
  readonly armor: number
  readonly maxHealth: number
}

/** The values a hit is resolved against. */
export interface Defence {
  readonly blockPower: number
  /** Null when the item cannot parry. */
  readonly parryPower: number | null
  readonly armor: number
  readonly maxHealth: number
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

export function defenceOf({ blocker, level, skill, armor, maxHealth }: Profile): Defence {
  return {
    blockPower: blockPower(blocker, level, skill),
    parryPower: parryPower(blocker, level, skill),
    armor,
    maxHealth,
  }
}
