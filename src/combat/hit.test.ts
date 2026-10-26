import { describe, expect, it } from 'vitest'
import type { Defence } from './block'
import type { Damages } from './damage'
import { resolveHit, type Hit, type HitOptions } from './hit'
import type { World } from './world'

// Silver shield level 3, blocking skill 25, armor 45, 150 health: the worked example of the
// « Le combat dans Valheim » page and of the design mockups.
const silverShield: Defence = { blockPower: 81, parryPower: 121.5, armor: 45, maxHealth: 150 }
const ironTower: Defence = { blockPower: 81, parryPower: null, armor: 45, maxHealth: 150 }

const alone = (difficulty: World['difficulty'] = 'normal'): World => ({ difficulty, players: 1 })
const hitOf = (damages: Damages, more: Partial<Hit> = {}): Hit => ({
  damages,
  staggerMultiplier: 1,
  blockable: true,
  ...more,
})
const block: HitOptions = { guard: 'block', stars: 0, barBefore: 0 }
const parry: HitOptions = { guard: 'parry', stars: 0, barBefore: 0 }

describe('resolveHit', () => {
  it('holds a 90 blocked on normal, taking 3.5 for 8 stamina', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), block)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(3.47, 2)
    expect(result?.stamina).toBeCloseTo(8.02, 2)
  })

  it('takes 1.5 for no stamina when the same hit is parried', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), parry)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(1.54, 2)
    expect(result?.stamina).toBe(0)
  })

  it('fills the bar with what passes the shield, then with what passes the armor', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), block)

    expect(result?.bar.before).toBe(0)
    expect(result?.bar.shield).toBeCloseTo(25, 6)
    expect(result?.bar.armor).toBeCloseTo(3.47, 2)
    expect(result?.bar.limit).toBe(60)
  })

  it('holds but staggers when the same hit lands on hard', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('hard'), block)

    expect(result?.received).toBe(135)
    expect(result?.verdict).toBe('staggered')
    expect(result?.taken).toBeCloseTo(17.58, 2)
  })

  it('still holds a parry on hard, taking 7.8', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('hard'), parry)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(7.81, 2)
  })

  it('breaks on very hard: the shield gives way and the whole hit meets the armor', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('veryHard'), block)

    expect(result?.verdict).toBe('broken')
    expect(result?.staggered).toBe(true)
    expect(result?.taken).toBe(135)
  })

  it('matches the mockups for a 130 blow: blocking staggers, parrying holds', () => {
    const blocked = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), block)
    const parried = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), parry)

    expect(blocked?.verdict).toBe('staggered')
    expect(blocked?.taken).toBeCloseTo(15.1, 1)
    expect(blocked?.stamina).toBeCloseTo(9.6, 1)
    expect(parried?.verdict).toBe('holds')
    expect(parried?.taken).toBeCloseTo(6.7, 1)
  })

  it('raises the damage by half per star', () => {
    const oneStar = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), { ...block, stars: 1 })
    const twoStars = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), {
      ...block,
      stars: 2,
    })

    expect(oneStar?.received).toBe(195)
    expect(twoStars?.received).toBe(260)
  })

  it('starts from the bar already filled before the hit', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), {
      ...block,
      barBefore: 0.5,
    })

    expect(result?.bar.before).toBe(30)
    expect(result?.verdict).toBe('holds')
  })

  it('breaks when the bar already filled leaves too little room', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), {
      ...block,
      barBefore: 0.75,
    })

    expect(result?.verdict).toBe('broken')
  })

  it('keeps fire out of the bar while it still hurts', () => {
    const result = resolveHit(silverShield, hitOf({ slash: 45, fire: 45 }), alone(), block)

    expect(result?.taken).toBeCloseTo(3.47, 2)
    expect(result?.bar.shield).toBeCloseTo(12.5, 6)
    expect(result?.bar.armor).toBeCloseTo(3.47 / 2, 2)
  })

  it("weighs the attack's stagger multiplier on what passes the armor only", () => {
    // At ×1 this blow staggers: 48.2 past the shield + 12.9 past the armor tops the 60 limit.
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 125 }, { staggerMultiplier: 0.8 }),
      alone(),
      block,
    )

    expect(result?.bar.shield).toBeCloseTo(48.23, 2)
    expect(result?.bar.armor).toBeCloseTo(12.92 * 0.8, 2)
    expect(result?.verdict).toBe('holds')
  })

  it('sends an unblockable hit straight to the armor', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { blockable: false }),
      alone(),
      block,
    )

    expect(result?.verdict).toBe('unblockable')
    expect(result?.taken).toBe(45)
    expect(result?.stamina).toBe(0)
    expect(result?.bar.shield).toBe(0)
  })

  it('ignores what is left at 0.1 or less, as the game does', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 5 }), alone(), block)

    expect(result?.taken).toBe(0)
    expect(result?.bar.armor).toBe(0)
  })

  it('has no parry to resolve with an item that cannot parry', () => {
    expect(resolveHit(ironTower, hitOf({ blunt: 90 }), alone(), parry)).toBeNull()
  })

  it('leaves the stars out of a hit with its own damage', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { scaling: 'world' }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(135)
  })

  it('leaves the world out of a hit with no owner', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { scaling: 'none' }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(90)
  })

  it('adds true damage past the guard and the armor, without stagger', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 80, frost: 10 }, { trueDamage: 15 }),
      alone(),
      block,
    )

    expect(result?.received).toBe(105)
    expect(result?.taken).toBeCloseTo(3.47 + 15, 2)
    expect(result?.bar.armor).toBeCloseTo(3.47 * (80 / 90), 2)
  })

  it('scales true damage with the stars but not with the world', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { trueDamage: 15 }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(90 * 1.5 * 1.5 + 15 * 1.5)
  })

  it("applies the player's modifiers past the guard, before the armor", () => {
    const immune: Defence = { ...silverShield, modifiers: { spirit: 'immune' } }
    const result = resolveHit(immune, hitOf({ slash: 90, spirit: 30 }), alone(), block)

    // 120 against 81 leaves 44.4, of which 11.1 spirit: only the 33.3 slash meets the armor.
    expect(result?.taken).toBeCloseTo(33.33 ** 2 / 180, 2)
  })

  it("applies the shield's modifiers before the block, and keeps them when it breaks", () => {
    const serpent: Defence = { ...silverShield, blockerModifiers: { pierce: 'resistant' } }
    const result = resolveHit(serpent, hitOf({ pierce: 400 }), alone(), block)

    expect(result?.received).toBe(400)
    expect(result?.verdict).toBe('broken')
    expect(result?.taken).toBe(200 - 45)
  })

  it('gives stamina back on a parry with an item that refunds it', () => {
    const torch: Defence = { ...silverShield, parryStaminaRegen: 10 }

    expect(resolveHit(torch, hitOf({ blunt: 90 }), alone(), parry)?.stamina).toBe(-10)
  })

  it('tells apart what burns over time', () => {
    const result = resolveHit(silverShield, hitOf({ slash: 45, fire: 45 }), alone(), block)

    expect(result?.overTime).toBeCloseTo(3.47 / 2, 2)
  })

  it('drops a direct remainder of 0.1 or less but still burns', () => {
    const bare: Defence = { ...silverShield, armor: 0 }
    const result = resolveHit(bare, hitOf({ blunt: 2, fire: 8 }), alone(), block)

    // 10 against 81 leaves 0.31: 0.06 blunt, dropped, and 0.25 fire, burned.
    expect(result?.taken).toBeCloseTo(0.247, 3)
    expect(result?.bar.armor).toBe(0)
  })
})
