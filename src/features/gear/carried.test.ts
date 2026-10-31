import { describe, expect, it } from 'vitest'
import { carriable, carriedEffects, NOTHING_CARRIED } from './carried'

describe('carriable', () => {
  it("lists a kind's effects, sorted by name in the language shown", () => {
    expect(carriable('trinket', 'fr').map(({ name }) => name.fr)).toEqual([
      'Broche en fer',
      'Cœur de cristal',
      'Perce-cou',
      "Voile d'ombre",
    ])
    expect(carriable('power', 'en').map(({ name }) => name.en)).toEqual([
      'Bonemass',
      'Fader',
      'Moder',
      'The Queen',
      'Yagluth',
    ])
  })

  it('lists the drinks that change a fight', () => {
    expect(carriable('consumable', 'fr').map(({ name }) => name.fr)).toEqual([
      'Hydromel de résistance au gel',
      'Hydromel de résistance au poison',
      'Hydromel des berserkir',
      "Vin d'orge de résistance au feu",
    ])
  })
})

describe('carriedEffects', () => {
  it('lists what is carried as the sheet does: the trinket, the power, then the drinks', () => {
    const carried = {
      trinket: 'TrinketIronHealth',
      power: 'GP_Bonemass',
      drinks: ['Potion_frostresist', 'Potion_barleywine'],
    }

    expect(carriedEffects(carried).map(({ id }) => id)).toEqual([
      'TrinketIronHealth',
      'GP_Bonemass',
      'Potion_frostresist',
      'Potion_barleywine',
    ])
  })

  it('lists nothing when nothing is carried', () => {
    expect(carriedEffects(NOTHING_CARRIED)).toEqual([])
    expect(carriedEffects({ trinket: null, power: 'GP_Moder', drinks: [] })).toHaveLength(1)
  })
})
