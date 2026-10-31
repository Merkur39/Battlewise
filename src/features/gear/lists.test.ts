import { describe, expect, it } from 'vitest'
import type { Gear } from '@/app/store'
import { MOCKUP_GEAR, MOCKUP_PIECES } from '../../../test/utils'
import { listOf, pickInto } from './lists'

// The mockups' gear: the silver shield N3, iron and the wolf cape N3, carrying the Iron Brooch, Bonemass's
// power and the Frost Resistance Mead.
const GEAR: Gear = {
  ...MOCKUP_GEAR,
  armor: 0,
  pieces: MOCKUP_PIECES,
  carried: { trinket: 'TrinketIronHealth', power: 'GP_Bonemass', drinks: ['Potion_frostresist'] },
}

describe('pickInto', () => {
  it('holds another item at the level of the one it replaces, within its own', () => {
    expect(pickInto(GEAR, { kind: 'hand' }, 'ShieldBlackmetal')).toEqual({
      ...GEAR,
      blocker: 'ShieldBlackmetal',
    })
    expect(pickInto(GEAR, { kind: 'hand' }, 'Torch')).toMatchObject({ blocker: 'Torch', level: 1 })
  })

  it('holds an item at level 1 from bare hands, which have none to pass on', () => {
    const bare: Gear = { ...GEAR, blocker: 'PlayerUnarmed' }

    expect(pickInto(bare, { kind: 'hand' }, 'ShieldBlackmetal')).toMatchObject({
      blocker: 'ShieldBlackmetal',
      level: 1,
    })
  })

  it('wears a piece in its slot at the level of the one it replaces, and takes it off', () => {
    const cape = { kind: 'piece', slot: 'cape' } as const

    expect(pickInto(GEAR, cape, 'CapeAsh').pieces?.cape).toEqual({ id: 'CapeAsh', level: 3 })
    expect(pickInto(GEAR, cape, null).pieces).toEqual({
      helmet: MOCKUP_PIECES.helmet,
      chest: MOCKUP_PIECES.chest,
      legs: MOCKUP_PIECES.legs,
    })
  })

  it('wears pieces from then on: a typed armor makes way for them', () => {
    const typed: Gear = { ...MOCKUP_GEAR }

    expect(pickInto(typed, { kind: 'piece', slot: 'chest' }, 'ArmorIronChest')).toEqual({
      ...MOCKUP_GEAR,
      armor: 0,
      pieces: { chest: { id: 'ArmorIronChest', level: 1 } },
    })
  })

  it('carries a trinket or a power in place of the one carried, or none', () => {
    expect(pickInto(GEAR, { kind: 'trinket' }, 'TrinketBlackStamina').carried?.trinket).toBe(
      'TrinketBlackStamina',
    )
    expect(pickInto(GEAR, { kind: 'power' }, null).carried?.power).toBeNull()
  })

  it('adds a drink, swaps one for another, and takes one off', () => {
    const added = pickInto(GEAR, { kind: 'drink', index: null }, 'Potion_bzerker')
    expect(added.carried?.drinks).toEqual(['Potion_frostresist', 'Potion_bzerker'])

    expect(
      pickInto(added, { kind: 'drink', index: 0 }, 'Potion_barleywine').carried?.drinks,
    ).toEqual(['Potion_barleywine', 'Potion_bzerker'])
    expect(pickInto(added, { kind: 'drink', index: 0 }, null).carried?.drinks).toEqual([
      'Potion_bzerker',
    ])
  })
})

describe('listOf', () => {
  it('opens on the category of what is held, the three of the hand to switch between', () => {
    expect(listOf(GEAR, { kind: 'hand' })).toMatchObject({
      category: 'shields',
      current: 'ShieldSilver',
    })
    expect(listOf({ ...GEAR, blocker: 'AxeBronze' }, { kind: 'hand' }).category).toBe('weapons')
  })

  it('gives a slot its category and what it holds, if anything', () => {
    expect(listOf(GEAR, { kind: 'piece', slot: 'legs' })).toMatchObject({
      category: 'legs',
      current: 'ArmorIronLegs',
    })
    expect(listOf({ ...GEAR, pieces: {} }, { kind: 'piece', slot: 'cape' }).current).toBeNull()
  })

  it('leaves out of a drink list the drinks carried in other rows', () => {
    const carrying = {
      ...GEAR,
      carried: { ...GEAR.carried!, drinks: ['Potion_frostresist', 'Potion_bzerker'] },
    }

    expect(listOf(carrying, { kind: 'drink', index: null }).choices).toEqual([
      'Potion_barleywine',
      'Potion_poisonresist',
    ])
    expect(listOf(carrying, { kind: 'drink', index: 1 })).toMatchObject({
      category: 'drinks',
      current: 'Potion_bzerker',
      choices: ['Potion_barleywine', 'Potion_poisonresist', 'Potion_bzerker'],
    })
  })
})
