import { game } from '@/data'
import type { GameRuleEffect, RuleEffectKind } from '@/data/types'
import type { Language } from '@/i18n/detect'

/** What Your gear says the player carries, by the ids of their effects in the game data: none of it
 * counts until it is switched on, on a creature's sheet or in the Simulation. */
export interface Carried {
  readonly trinket: string | null
  readonly power: string | null
  /** Each a different drink: the game takes one of each at a time. */
  readonly drinks: readonly string[]
}

export const NOTHING_CARRIED: Carried = { trinket: null, power: null, drinks: [] }

/** The kinds of effects one carries: a trinket, a guardian power, drinks. */
export type CarriedKind = Extract<RuleEffectKind, 'trinket' | 'power' | 'consumable'>

export type CarriedEffect = GameRuleEffect & { readonly kind: CarriedKind }

const CARRIED_KINDS: readonly RuleEffectKind[] = ['trinket', 'power', 'consumable']

export const isCarried = (effect: GameRuleEffect): effect is CarriedEffect =>
  CARRIED_KINDS.includes(effect.kind)

// The store only holds ids the game data has (checked on load), so a miss is a bug.
export function effectOf(id: string): GameRuleEffect {
  const effect = game.ruleEffects.find((candidate) => candidate.id === id)
  if (!effect) throw new Error(`No rule effect ${id} in the game data`)
  return effect
}

/** The effects of a kind one can carry, sorted by name in the language shown. */
export const carriable = (kind: CarriedKind, language: Language): CarriedEffect[] =>
  game.ruleEffects
    .filter((effect): effect is CarriedEffect => effect.kind === kind)
    .toSorted((a, b) => a.name[language].localeCompare(b.name[language], language))

/** What is carried, as a creature's sheet lists it: the trinket, the power, then the drinks. */
export const carriedEffects = ({ trinket, power, drinks }: Carried): CarriedEffect[] =>
  [trinket, power, ...drinks].flatMap((id) => (id === null ? [] : [effectOf(id)])).filter(isCarried)
