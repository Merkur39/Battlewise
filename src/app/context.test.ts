import { describe, expect, it } from 'vitest'
import { gearDefence } from './context'
import type { Gear } from './store'

const silver: Gear = { blocker: 'ShieldSilver', level: 3, skill: 25, armor: 0, maxHealth: 150 }

describe('gearDefence', () => {
  it('counts the armor and the resistances of the pieces worn', () => {
    const defence = gearDefence({
      ...silver,
      pieces: {
        helmet: { id: 'HelmetIron', level: 1 },
        chest: { id: 'ArmorIronChest', level: 1 },
        legs: { id: 'ArmorIronLegs', level: 1 },
        cape: { id: 'CapeWolf', level: 3 },
      },
    })

    expect(defence.armor).toBe(45)
    expect(defence.modifiers).toEqual({ spirit: 'immune', frost: 'resistant' })
  })

  it("counts a complete set's bonus, which is worn, not carried", () => {
    const defence = gearDefence({
      ...silver,
      pieces: {
        helmet: { id: 'HelmetFenring', level: 1 },
        chest: { id: 'ArmorFenringChest', level: 1 },
        legs: { id: 'ArmorFenringLegs', level: 1 },
      },
    })

    expect(defence.modifiers).toEqual({ spirit: 'immune', frost: 'resistant', fire: 'resistant' })
  })

  it("keeps an earlier player's typed armor while they wear no piece", () => {
    expect(gearDefence({ ...silver, armor: 45 }).armor).toBe(45)
  })
})
