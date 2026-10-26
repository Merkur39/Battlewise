import type { Route } from '@/app/routes'
import { game } from '@/data'
import type { BiomeId, GameCreature } from '@/data/types'

/** Where the Bestiary stands: `#/bestiary/<biome>/<creature>?q=<search>`. */
export interface Place {
  readonly biome: BiomeId
  readonly creature: GameCreature | null
  readonly query: string
}

/** A biome or creature the address names but the data lacks is left out: the creature's own biome,
 * else the first, stands in. */
export function placeOf(route: Route): Place {
  const [biomeId, creatureId] = route.path
  const creature = game.creatures.find((candidate) => candidate.id === creatureId) ?? null
  const biome =
    game.biomes.find((candidate) => candidate.id === biomeId)?.id ??
    creature?.biomes[0] ??
    game.biomes[0]!.id
  return { biome, creature, query: route.query }
}

export const bestiaryRoute = (biome: BiomeId, creature: string | null, query: string): Route => ({
  screen: 'bestiary',
  path: creature === null ? [biome] : [biome, creature],
  query,
  modal: null,
})
