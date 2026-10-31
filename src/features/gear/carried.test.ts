import { describe, expect, it } from 'vitest'
import { carriable, carriedEffects, carry, effectOf, isCarried, NOTHING_CARRIED } from './carried'

describe('carriable', () => {
  it('lists the powers in the order their bosses fall', () => {
    expect(carriable('power').map(({ id }) => id)).toEqual([
      'GP_Bonemass',
      'GP_Moder',
      'GP_Yagluth',
      'GP_Queen',
      'GP_Fader',
    ])
  })

  it('lists the trinkets and the drinks that change a fight, as the mockups do', () => {
    expect(carriable('trinket').map(({ name }) => name.fr)).toEqual([
      'Broche en fer',
      'Perce-cou',
      'Cœur de cristal',
      "Voile d'ombre",
    ])
    expect(carriable('consumable').map(({ name }) => name.fr)).toEqual([
      'Hydromel de résistance au gel',
      "Vin d'orge de résistance au feu",
      'Hydromel de résistance au poison',
      'Hydromel des berserkir',
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

describe('carry', () => {
  const carried = (id: string) => {
    const effect = effectOf(id)
    if (!isCarried(effect)) throw new Error(`${id} is not carried`)
    return effect
  }
  const carrying = {
    trinket: 'TrinketIronHealth',
    power: 'GP_Bonemass',
    drinks: ['Potion_frostresist'],
  }

  it('takes a trinket or a power in place of the one carried', () => {
    expect(carry(carrying, carried('TrinketBlackStamina')).trinket).toBe('TrinketBlackStamina')
    expect(carry(carrying, carried('GP_Moder')).power).toBe('GP_Moder')
  })

  it('adds a drink to the others, once', () => {
    expect(carry(carrying, carried('Potion_bzerker')).drinks).toEqual([
      'Potion_frostresist',
      'Potion_bzerker',
    ])
    expect(carry(carrying, carried('Potion_frostresist'))).toEqual(carrying)
  })
})
