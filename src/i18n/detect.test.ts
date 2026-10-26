import { describe, expect, it } from 'vitest'
import { detectLanguage } from './detect'

describe('detectLanguage', () => {
  it('speaks French to a French-speaking device, whatever its region', () => {
    expect(detectLanguage(['fr-CA'])).toBe('fr')
  })

  it('takes the first language it speaks, skipping the others', () => {
    expect(detectLanguage(['de', 'en-GB'])).toBe('en')
    expect(detectLanguage(['de-DE', 'fr'])).toBe('fr')
  })

  it('keeps the order of the device preferences', () => {
    expect(detectLanguage(['en-US', 'fr-FR'])).toBe('en')
  })

  it('reads the language subtag only, in any case', () => {
    expect(detectLanguage(['FR-be'])).toBe('fr')
    expect(detectLanguage(['frr', 'fr'])).toBe('fr')
  })

  it('falls back to English when the device speaks none of its languages', () => {
    expect(detectLanguage(['de'])).toBe('en')
    expect(detectLanguage(['frr'])).toBe('en')
  })

  it('falls back to English when the device states no language', () => {
    expect(detectLanguage([])).toBe('en')
  })
})
