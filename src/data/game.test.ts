import { describe, expect, it } from 'vitest'
import { defenceOf } from '@/combat/block'
import { damageMultiplier, type DamageModifier } from '@/combat/creature'
import { DAMAGE_TYPES } from '@/combat/damage'
import { resolveHit } from '@/combat/hit'
import { game } from '.'

const biomeIds = new Set(game.biomes.map((biome) => biome.id))
const hits = game.creatures.flatMap((c) => c.attacks.flatMap((a) => a.hits ?? []))
const names = [
  ...game.biomes.map((b) => b.name),
  ...game.creatures.flatMap((c) => [c.name, ...c.attacks.map((a) => a.name)]),
  ...game.blockers.map((b) => b.name),
]
const blocker = (id: string) => {
  const found = game.blockers.find((b) => b.id === id)
  if (!found) throw new Error(`no blocker ${id}`)
  return found
}
const duplicates = (ids: string[]) => ids.filter((id, index) => ids.indexOf(id) !== index)

describe('game data', () => {
  it('places every creature in biomes the data lists', () => {
    expect(game.creatures.filter((c) => !c.biomes.every((b) => biomeIds.has(b)))).toEqual([])
  })

  it('deals only the damage types the engine knows', () => {
    const types = new Set<string>(DAMAGE_TYPES)
    expect(hits.flatMap((hit) => Object.keys(hit.damages)).filter((t) => !types.has(t))).toEqual([])
  })

  it('uses only damage modifiers the engine can apply', () => {
    const states = game.creatures.flatMap<DamageModifier>((c) => Object.values(c.modifiers))
    expect(states.filter((state) => typeof damageMultiplier(state) !== 'number')).toEqual([])
  })

  it('names everything in French and in English', () => {
    expect(names.filter((name) => !name.fr || !name.en)).toEqual([])
  })

  it('has unique creature and blocker ids', () => {
    expect(duplicates(game.creatures.map((c) => c.id))).toEqual([])
    expect(duplicates(game.blockers.map((b) => b.id))).toEqual([])
  })

  it('charges the stamina and fills the bar the way the engine does', () => {
    const defence = { blockPower: 10, parryPower: 15, armor: 0, maxHealth: 100 }
    const overwhelming = { damages: { blunt: 1000 }, staggerMultiplier: 1, blockable: true }
    const world = { difficulty: 'normal', players: 1 } as const
    const blocked = resolveHit(defence, overwhelming, world, {
      guard: 'block',
      stars: 0,
      barBefore: 0,
    })
    const parried = resolveHit(defence, overwhelming, world, {
      guard: 'parry',
      stars: 0,
      barBefore: 0,
    })

    expect(blocked?.stamina).toBe(game.player.blockStaminaDrain)
    expect(parried?.stamina).toBe(game.player.perfectBlockStaminaDrain)
    expect(blocked?.bar.limit).toBeCloseTo(game.player.staggerFactor * 100, 9)
  })

  it('rebuilds the worked example from the extracted silver shield', () => {
    expect(
      defenceOf({
        blocker: blocker('ShieldSilver'),
        level: 3,
        skill: 25,
        armor: 45,
        maxHealth: 150,
      }),
    ).toEqual({ blockPower: 81, parryPower: 121.5, armor: 45, maxHealth: 150 })
  })
})
