import { describe, expect, it } from 'vitest'
import { blockerOf } from '@/app/context'
import { game } from '@/data'
import { arsenalRows, categoryOf, type ArsenalOptions } from './model'

const mockup: ArsenalOptions = { level: 3, skill: 25, equipped: 'ShieldSilver', sort: 'power' }
const ids = (rows: readonly { readonly blocker: { readonly id: string } }[]) =>
  rows.map(({ blocker }) => blocker.id)

describe('categoryOf', () => {
  it('sorts shields, weapons and the rest apart, and leaves out what is thrown away', () => {
    expect(categoryOf(blockerOf('ShieldGoldBuckler'))).toBe('shields')
    expect(categoryOf(blockerOf('ShieldWoodTower'))).toBe('shields')
    expect(categoryOf(blockerOf('AtgeirGold'))).toBe('weapons')
    expect(categoryOf(blockerOf('Torch'))).toBe('others')
    expect(categoryOf(blockerOf('PlayerUnarmed'))).toBe('others')
    expect(categoryOf(blockerOf('BombOoze'))).toBeNull()
  })
})

describe('arsenalRows', () => {
  it('gives each item at your skill and the level picked: the mockup silver shield', () => {
    const silver = arsenalRows('shields', mockup).find(
      ({ blocker }) => blocker.id === 'ShieldSilver',
    )

    expect(silver).toMatchObject({ level: 3, power: 81, parry: 121.5, force: 50, speed: -0.05 })
    expect(silver?.equipped).toBe(true)
  })

  it('puts the item you hold first, then sorts by block power', () => {
    const rows = arsenalRows('shields', mockup)

    expect(rows[0]?.blocker.id).toBe('ShieldSilver')
    const powers = rows.slice(1).map(({ power }) => power)
    expect(powers).toEqual(powers.toSorted((a, b) => b - a))
    expect(rows).toHaveLength(game.blockers.filter((b) => categoryOf(b) === 'shields').length)
  })

  it('has no parry for an item that cannot parry, and sorts it last by parry', () => {
    const rows = arsenalRows('shields', { ...mockup, equipped: 'None', sort: 'parry' })

    expect(rows.find(({ blocker }) => blocker.id === 'ShieldWoodTower')?.parry).toBeNull()
    expect(rows.at(-1)?.parry).toBeNull()
    expect(rows[0]?.parry).not.toBeNull()
  })

  it('sorts by speed, the least slowed first', () => {
    const rows = arsenalRows('shields', { ...mockup, equipped: 'None', sort: 'speed' })

    expect(rows[0]?.blocker.id).toBe('ShieldRoots')
    expect(rows.at(-1)?.speed).toBe(-0.1)
  })

  it('stops each item at its own max level, past it only for the Forge of Potential', () => {
    const at = (category: 'weapons' | 'others' | 'shields', id: string) =>
      arsenalRows(category, { ...mockup, level: 10 }).find(({ blocker }) => blocker.id === id)

    expect(at('others', 'Torch')?.level).toBe(1)
    expect(at('weapons', 'AxeWood')?.level).toBe(4)
    expect(at('shields', 'ShieldSilver')?.level).toBe(10)
  })

  it('leaves out what is thrown away', () => {
    expect(ids(arsenalRows('weapons', mockup))).not.toContain('BombOoze')
  })
})
