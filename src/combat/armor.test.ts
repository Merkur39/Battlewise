import { describe, expect, it } from 'vitest'
import { applyArmor, applyArmorTo } from './armor'

describe('applyArmor', () => {
  it('scales a hit down quadratically while the armor is at least half of it', () => {
    // 90 against 81: 90 / (4 × 81) × 90
    expect(applyArmor(90, 81)).toBeCloseTo(25, 6)
  })

  it('subtracts the armor once the hit is more than twice the armor', () => {
    expect(applyArmor(180, 81)).toBe(99)
  })

  it('lets the hit through untouched without armor', () => {
    expect(applyArmor(50, 0)).toBe(50)
  })

  it('leaves nothing of an empty hit', () => {
    expect(applyArmor(0, 45)).toBe(0)
  })
})

describe('applyArmorTo', () => {
  it('applies the curve to the total and shares the result out by type', () => {
    const after = applyArmorTo({ blunt: 60, fire: 30 }, 81)

    expect(after.blunt).toBeCloseTo(50 / 3, 6)
    expect(after.fire).toBeCloseTo(25 / 3, 6)
  })

  it('keeps the damage as it is without armor', () => {
    expect(applyArmorTo({ slash: 12 }, 0)).toEqual({ slash: 12 })
  })
})
