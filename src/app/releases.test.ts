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

  it('say each note in both languages, and fix issues by their numbers', () => {
    for (const { notes } of RELEASES) {
      expect(notes.length).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.text.fr.trim()).not.toBe('')
        expect(note.text.en.trim()).not.toBe('')
        for (const issue of note.fixes ?? [])
          expect(Number.isInteger(issue) && issue > 0).toBe(true)
      }
    }
  })
})
