import { describe, expect, it } from 'vitest'
import { blockPower, defenceOf, parryPower, type Blocker } from './block'

const silverShield: Blocker = { blockPower: 60, blockPowerPerLevel: 6, timedBlockBonus: 1.5 }
const ironTower: Blocker = { blockPower: 52, blockPowerPerLevel: 6, timedBlockBonus: 1 }

describe('blockPower', () => {
  it('is the item value at level 1 without skill', () => {
    expect(blockPower(silverShield, 1, 0)).toBe(60)
  })

  it('adds the per-level bonus for each upgrade', () => {
    expect(blockPower(silverShield, 3, 0)).toBe(72)
  })

  it('grows by half at blocking skill 100', () => {
    expect(blockPower(silverShield, 1, 100)).toBe(90)
  })

  it('combines level and skill', () => {
    expect(blockPower(silverShield, 3, 25)).toBe(81)
  })
})

describe('parryPower', () => {
  it('multiplies the block power by the timed block bonus', () => {
    expect(parryPower(silverShield, 3, 25)).toBe(121.5)
  })

  it('is null for an item without a bonus above 1, which cannot parry', () => {
    expect(parryPower(ironTower, 3, 25)).toBeNull()
  })
})

describe('defenceOf', () => {
  it('turns a profile into the values a hit is resolved against', () => {
    expect(
      defenceOf({ blocker: silverShield, level: 3, skill: 25, armor: 45, maxHealth: 150 }),
    ).toEqual({ blockPower: 81, parryPower: 121.5, armor: 45, maxHealth: 150 })
  })
})
