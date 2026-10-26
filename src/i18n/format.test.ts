import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it('writes decimals the way each language does', () => {
    expect(formatNumber(1.5, 'fr')).toBe('1,5')
    expect(formatNumber(1.5, 'en')).toBe('1.5')
  })

  it('keeps two decimals at most, and no trailing zero', () => {
    expect(formatNumber(0.75, 'fr')).toBe('0,75')
    expect(formatNumber(41.536, 'en')).toBe('41.54')
    expect(formatNumber(60, 'en')).toBe('60')
  })

  it('groups thousands the way each language does', () => {
    expect(formatNumber(1500, 'fr')).toBe('1 500')
    expect(formatNumber(1500, 'en')).toBe('1,500')
  })
})
