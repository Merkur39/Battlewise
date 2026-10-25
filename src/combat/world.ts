/** The presets of the game's « Combat » world modifier. */
export type Difficulty = 'veryEasy' | 'easy' | 'normal' | 'hard' | 'veryHard'

export interface World {
  readonly difficulty: Difficulty
  /** Players within range of the fight, the local one included. */
  readonly players: number
}

export interface WorldScale {
  /** Multiplies the hits monsters land on you. */
  readonly enemy: number
  /** Multiplies the damage and stagger you deal to monsters. */
  readonly you: number
}

const DIFFICULTIES: Record<Difficulty, WorldScale> = {
  veryEasy: { enemy: 0.5, you: 1.25 },
  easy: { enemy: 0.75, you: 1.1 },
  normal: { enemy: 1, you: 1 },
  hard: { enemy: 1.5, you: 0.85 },
  veryHard: { enemy: 2, you: 0.7 },
}

// Game.GetDifficultyDamageScalePlayer and GetDifficultyDamageScaleEnemy.
const ENEMY_DAMAGE_PER_PLAYER = 0.04
const ENEMY_HEALTH_PER_PLAYER = 0.3

export function worldScale({ difficulty, players }: World): WorldScale {
  const preset = DIFFICULTIES[difficulty]
  const others = players - 1
  return {
    enemy: preset.enemy * (1 + others * ENEMY_DAMAGE_PER_PLAYER),
    you: preset.you / (1 + others * ENEMY_HEALTH_PER_PLAYER),
  }
}
