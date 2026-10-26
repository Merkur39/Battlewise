import raw from './game.json'
import type { GameData } from './types'

/** Combat data extracted from Valheim by tools/extract; its shape is checked by game.test.ts. */
export const game = raw as GameData
