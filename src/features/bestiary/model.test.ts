import { describe, expect, it } from 'vitest'
import { gearDefence } from '@/app/context'
import { DEFAULT_STATE } from '@/app/store'
import type { Defence } from '@/combat/block'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { GameAttack, GameCreature, GameHit } from '@/data/types'
import { assess, attackTypes, creaturesOf, matchRange, modifiersOf, search } from './model'

// Stagger limit 40: blunt 10 holds; 70 staggers a block but a parry holds it; 200 breaks both.
const defence: Defence = { blockPower: 50, parryPower: 75, armor: 0, maxHealth: 100 }
const world: World = { difficulty: 'normal', players: 1 }

const hit = (blunt: number, rest: Partial<GameHit> = {}): GameHit => ({
  damages: { blunt },
  staggerMultiplier: 1,
  blockable: true,
  dodgeable: true,
  scaling: 'attack',
  source: 'weapon',
  ...rest,
})
const attack = (name: string, hits: GameHit[]): GameAttack => ({
  ids: [name],
  name: { fr: name, en: name },
  kind: hits.length === 0 ? 'summon' : 'melee',
  hits,
})
const creature = (attacks: GameAttack[], rest: Partial<GameCreature> = {}): GameCreature => ({
  id: 'Test',
  name: { fr: 'Test', en: 'Test' },
  boss: false,
  biomes: ['meadows'],
  stars: { min: 0, max: 2 },
  health: 100,
  staggerFactor: 0.5,
  staggerable: true,
  staggeredByParry: true,
  modifiers: {},
  attacks,
  ...rest,
})
const id = (thing: { readonly id: string }) => thing.id

describe('creaturesOf', () => {
  it('lists the creatures that live in a biome, in the order of the game data', () => {
    const blackForest = creaturesOf('blackForest').map(id)

    expect(blackForest).toEqual(expect.arrayContaining(['Greydwarf', 'Troll']))
    expect(blackForest).not.toContain('Boar')
    expect(blackForest.indexOf('Greydwarf')).toBeLessThan(blackForest.indexOf('Troll'))
  })

  it('leaves out no creature', () => {
    const listed = new Set(game.biomes.flatMap((biome) => creaturesOf(biome.id).map(id)))

    expect(game.creatures.filter((c) => !listed.has(c.id)).map(id)).toEqual([])
  })
})

describe('assess', () => {
  it('sums up a creature by the worst verdict of each guard among its attacks', () => {
    const assessment = assess(
      creature([attack('a', [hit(10)]), attack('b', [hit(70)])]),
      defence,
      world,
      0,
    )

    expect(assessment).toMatchObject({ block: 'staggered', parry: 'holds', dodgeable: true })
    expect(assessment.advice).toEqual({ kind: 'parryAll' })
  })

  it('lists the attacks of every phase of a boss, the creature first', () => {
    const boss = creature([attack('a', [hit(10)])], {
      phases: [{ ...creature([attack('b', [hit(10)])]), id: 'Phase2' }],
    })

    expect(assess(boss, defence, world, 0).attacks.map((a) => a.fighter.id)).toEqual([
      'Test',
      'Phase2',
    ])
  })

  it('leaves an attack that only summons out of the verdicts and the advice', () => {
    const assessment = assess(
      creature([attack('call', []), attack('bite', [hit(10)])]),
      defence,
      world,
      0,
    )

    expect(assessment.attacks[0]).toMatchObject({ damage: null, verdicts: null })
    expect(assessment.advice).toEqual({ kind: 'blockAll' })
  })

  it('has no advice for a creature that only summons', () => {
    expect(assess(creature([attack('call', [])]), defence, world, 0)).toMatchObject({
      block: null,
      dodgeable: null,
      advice: { kind: 'unknown' },
    })
  })

  it('names the attacks no guard takes, and whether a roll avoids them all', () => {
    const rolled = attack('slam', [hit(200)])
    const zone = attack('zone', [hit(200, { blockable: false, dodgeable: false })])

    const advice = assess(
      creature([attack('bite', [hit(10)]), rolled, zone]),
      defence,
      world,
      0,
    ).advice

    expect(advice).toMatchObject({ kind: 'dodgeSome', rest: 'block', rollsAvoid: false })
    expect(advice.kind === 'dodgeSome' && advice.dodge.map((a) => a.attack.name.fr)).toEqual([
      'slam',
      'zone',
    ])
  })

  it('leaves the parry out when the item cannot parry', () => {
    expect(
      assess(creature([attack('bite', [hit(10)])]), { ...defence, parryPower: null }, world, 0),
    ).toMatchObject({ parry: null, canParry: false })
  })

  it('assesses every creature of the game, at every star it can have, with the default gear', () => {
    const gear = gearDefence(DEFAULT_STATE.gear)
    const assessed = game.creatures.flatMap((c) =>
      Array.from({ length: c.stars.max - c.stars.min + 1 }, (_, index) =>
        assess(c, gear, DEFAULT_STATE.world, c.stars.min + index),
      ),
    )

    expect(assessed.filter((a) => a.attacks.length === 0)).toEqual([])
    expect(assessed.filter((a) => a.advice.kind === 'unknown')).toEqual([])
  })
})

describe('search', () => {
  it('finds creatures and attacks by part of their name, whatever the case and the accents', () => {
    expect(search('aine', 'fr').creatures.map(id)).toContain('gd_king')
    expect(
      search('FRAPPE', 'fr').attacks.map(({ creature, attack }) => [creature.id, attack.name.fr]),
    ).toContainEqual(['Troll', 'Frappe au sol'])
  })

  it('searches the names of the language the interface speaks', () => {
    expect(search('ground slam', 'en').attacks.map((found) => found.creature.id)).toContain('Troll')
    expect(search('ground slam', 'fr').attacks).toEqual([])
  })

  it('finds nothing for an empty search', () => {
    expect(search('  ', 'fr')).toEqual({ creatures: [], attacks: [] })
  })
})

describe('attackTypes', () => {
  it('lists the damage types an attack deals, the largest first', () => {
    const fireball = attack('fireball', [
      hit(0, { damages: { blunt: 10, fire: 30 } }),
      hit(0, { damages: { fire: 5, pierce: 0 } }),
    ])

    expect(attackTypes(fireball)).toEqual(['fire', 'blunt'])
  })
})

describe('modifiersOf', () => {
  it('lists how a creature takes each type it does not take normally, its weaknesses first', () => {
    expect(
      modifiersOf({ blunt: 'resistant', fire: 'normal', pierce: 'weak', spirit: 'immune' }),
    ).toEqual([
      { type: 'pierce', modifier: 'weak', multiplier: 1.5 },
      { type: 'blunt', modifier: 'resistant', multiplier: 0.5 },
      { type: 'spirit', modifier: 'immune', multiplier: 0 },
    ])
  })
})

describe('matchRange', () => {
  it('places the search in the name, accents and case aside', () => {
    expect(matchRange("L'Aîné", 'AINE')).toEqual([2, 6])
    expect(matchRange('Troll', 'x')).toBeNull()
  })
})
