import { describe, expect, it } from 'vitest'
import { worldScale, type Difficulty } from './world'

describe('worldScale', () => {
  it.each<[Difficulty, number, number]>([
    ['veryEasy', 0.5, 1.25],
    ['easy', 0.75, 1.1],
    ['normal', 1, 1],
    ['hard', 1.5, 0.85],
    ['veryHard', 2, 0.7],
  ])('alone on %s, monsters hit ×%s and you deal ×%s', (difficulty, enemy, you) => {
    expect(worldScale({ difficulty, players: 1 })).toEqual({ enemy, you })
  })

  it('makes monsters hit 4 % harder for each nearby player beyond the first', () => {
    expect(worldScale({ difficulty: 'normal', players: 3 }).enemy).toBeCloseTo(1.08, 9)
  })

  it('divides what you deal by 1 + 0.3 for each nearby player beyond the first', () => {
    expect(worldScale({ difficulty: 'normal', players: 3 }).you).toBeCloseTo(1 / 1.6, 9)
  })

  it('counts at most 5 players (Game.m_difficultyScaleMaxPlayers)', () => {
    expect(worldScale({ difficulty: 'normal', players: 8 })).toEqual(
      worldScale({ difficulty: 'normal', players: 5 }),
    )
  })

  it('counts at least the player being hit', () => {
    expect(worldScale({ difficulty: 'normal', players: 0 })).toEqual({ enemy: 1, you: 1 })
  })

  it('stacks the difficulty and the players', () => {
    const scale = worldScale({ difficulty: 'hard', players: 2 })

    expect(scale.enemy).toBeCloseTo(1.5 * 1.04, 9)
    expect(scale.you).toBeCloseTo(0.85 / 1.3, 9)
  })
})
