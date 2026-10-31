import { describe, expect, it } from 'vitest'
import { maxLevel } from './model'
import { pieceOf, setEffects, slotPieces, summarize, wornPieces, type Pieces } from './pieces'

// The mockups' pieces: iron at level 1 and the wolf cape at level 3.
const iron: Pieces = {
  helmet: { id: 'HelmetIron', level: 1 },
  chest: { id: 'ArmorIronChest', level: 1 },
  legs: { id: 'ArmorIronLegs', level: 1 },
  cape: { id: 'CapeWolf', level: 3 },
}
const fenris: Pieces = {
  helmet: { id: 'HelmetFenring', level: 1 },
  chest: { id: 'ArmorFenringChest', level: 4 },
  legs: { id: 'ArmorFenringLegs', level: 4 },
  cape: { id: 'CapeWolf', level: 1 },
}

describe('summarize', () => {
  it('adds up each piece at its level, helmet to cape: the mockups make 45', () => {
    const { armor, parts } = summarize(iron)

    expect(parts).toEqual([14, 14, 14, 3])
    expect(armor).toBe(45)
  })

  it('counts nothing for an empty slot', () => {
    const { armor, parts } = summarize({ chest: { id: 'ArmorIronChest', level: 2 } })

    expect(parts).toEqual([16])
    expect(armor).toBe(16)
  })

  it('brings the resistances of the pieces: the wolf cape resists frost', () => {
    expect(summarize(iron).modifiers).toEqual({ frost: 'resistant' })
  })

  it('keeps a weakness beside a resistance: the Root Harnesk resists pierce, fears fire', () => {
    expect(summarize({ chest: { id: 'ArmorRootChest', level: 1 } }).modifiers).toEqual({
      pierce: 'resistant',
      fire: 'weak',
    })
  })

  it("counts a complete set's bonus with its pieces, a resistance shared only once", () => {
    const { armor, modifiers, sets } = summarize(fenris)

    expect(armor).toBe(10 + 16 + 16 + 1)
    expect(sets.map(({ id }) => id)).toEqual(['SetEffect_FenringArmor'])
    expect(modifiers).toEqual({ frost: 'resistant', fire: 'resistant' })
  })
})

describe('setEffects', () => {
  it('brings nothing for a set short of a piece', () => {
    expect(setEffects({ ...fenris, legs: { id: 'ArmorIronLegs', level: 1 } })).toEqual([])
  })

  it('brings nothing for a set whose bonus does not change a fight', () => {
    const troll: Pieces = {
      helmet: { id: 'HelmetTrollLeather', level: 1 },
      chest: { id: 'ArmorTrollLeatherChest', level: 1 },
      legs: { id: 'ArmorTrollLeatherLegs', level: 1 },
      cape: { id: 'CapeTrollHide', level: 1 },
    }

    expect(setEffects(troll)).toEqual([])
  })
})

describe('wornPieces', () => {
  it("hands the engine the pieces in the game's order, chest first, at their level", () => {
    const worn = wornPieces({
      helmet: { id: 'HelmetFenring', level: 2 },
      chest: { id: 'ArmorRootChest', level: 1 },
      legs: { id: 'ArmorIronLegs', level: 4 },
      cape: { id: 'CapeWolf', level: 3 },
    })

    expect(worn.map(({ armor, level }) => [armor, level])).toEqual([
      [8, 1],
      [14, 4],
      [10, 2],
      [1, 3],
    ])
    expect(wornPieces({ cape: { id: 'CapeWolf', level: 1 } })).toHaveLength(1)
  })
})

describe('slotPieces', () => {
  it("lists a slot's pieces, sorted by name in the language shown", () => {
    for (const language of ['fr', 'en'] as const) {
      const capes = slotPieces('cape', language)
      const names = capes.map(({ name }) => name[language])

      expect(capes.every(({ slot }) => slot === 'cape')).toBe(true)
      expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b, language)))
    }
  })
})

describe('maxLevel of a piece', () => {
  it('stops at its max level, or goes past it for the Forge of Potential', () => {
    expect(maxLevel(pieceOf('HelmetCrownofValheim'))).toBe(1)
    expect(maxLevel(pieceOf('HelmetIron'))).toBe(10)
  })
})
