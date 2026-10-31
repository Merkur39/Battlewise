import { describe, expect, it } from 'vitest'
import { compareVersions, RELEASES } from './releases'

describe('compareVersions', () => {
  it('orders versions by their numbers, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0)
    expect(compareVersions('1.4.1', '1.5.0')).toBeLessThan(0)
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0)
  })
})

describe('the releases', () => {
  it('begin with the version the app runs: each pull request that bumps it adds its notes', () => {
    expect(RELEASES[0]?.version).toBe(__APP_VERSION__)
  })

  it('go from the newest to the oldest, each version once, each with its date', () => {
    for (const [index, release] of RELEASES.entries()) {
      const older = RELEASES[index + 1]
      if (older) {
        expect(compareVersions(release.version, older.version)).toBeGreaterThan(0)
        expect(release.date >= older.date).toBe(true)
      }
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('give each note its kind and its title in both languages, and fix issues by their numbers', () => {
    for (const { notes } of RELEASES) {
      expect(notes.length).toBeGreaterThan(0)
      for (const note of notes) {
        expect(['new', 'improved', 'fixed']).toContain(note.kind)
        for (const text of [note.title, ...(note.detail ? [note.detail] : [])]) {
          expect(text.fr.trim()).not.toBe('')
          expect(text.en.trim()).not.toBe('')
        }
        for (const issue of note.fixes ?? [])
          expect(Number.isInteger(issue) && issue > 0).toBe(true)
      }
    }
  })

  it('stay short: a title of ten words at most, a detail of sixteen', () => {
    const words = (text: string) => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word))
    for (const { notes } of RELEASES) {
      for (const { title, detail } of notes) {
        for (const language of ['fr', 'en'] as const) {
          expect(words(title[language]).length, title[language]).toBeLessThanOrEqual(10)
          if (detail)
            expect(words(detail[language]).length, detail[language]).toBeLessThanOrEqual(16)
        }
      }
    }
  })
})
