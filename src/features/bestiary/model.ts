import { creatureAdvice, worstVerdict, type CreatureAdvice } from '@/combat/advice'
import { attackDamage, attackVerdicts, type AttackVerdicts } from '@/combat/attack'
import type { Defence } from '@/combat/block'
import { DAMAGE_TYPES, type DamageType } from '@/combat/damage'
import { damageMultiplier, type DamageModifier, type DamageModifiers } from '@/combat/modifiers'
import type { Verdict } from '@/combat/hit'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type {
  BiomeId,
  GameAttack,
  GameCreature,
  GameHit,
  GamePhase,
  Localized,
  ToolModifiers,
  ToolType,
} from '@/data/types'
import type { Language } from '@/i18n/detect'

/** A creature, or one of the later phases of a boss: what has attacks. */
export type Fighter = GameCreature | GamePhase

export interface AssessedAttack {
  readonly fighter: Fighter
  readonly attack: GameAttack
  /** Its largest hit as listed at the stars; null for an attack that only summons. */
  readonly damage: number | null
  readonly verdicts: AttackVerdicts | null
}

type GuardedAttack = AssessedAttack & { readonly verdicts: AttackVerdicts }

/** Hits that come from no attack, as listed at the stars and against the gear. */
export interface AssessedHits {
  readonly hits: readonly GameHit[]
  readonly damage: number | null
  readonly verdicts: AttackVerdicts | null
}

/** A creature a death brings, how many at the stars, and its sheet when the Bestiary has one. */
export interface DeathSummon {
  readonly name: Localized
  readonly count: readonly [number, number]
  readonly creature: GameCreature | null
}

/** What a fighter deals apart from its attacks: running into you, and its death. */
export interface Hazards {
  readonly fighter: Fighter
  readonly trample: AssessedHits | null
  readonly death: AssessedHits | null
  readonly summons: readonly DeathSummon[]
}

/** The engine's advice, with the attacks to get away from: rolled under when `rollsAvoid`, else kept
 * out of reach. */
export type Advice =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'blockAll' }
  | { readonly kind: 'parryAll' }
  | { readonly kind: 'dodgeAll'; readonly rollsAvoid: boolean }
  | {
      readonly kind: 'dodgeSome'
      readonly dodge: readonly AssessedAttack[]
      readonly rest: 'block' | 'parry'
      readonly rollsAvoid: boolean
    }

export interface Assessment {
  /** Every phase's attacks, the creature's first. */
  readonly attacks: readonly AssessedAttack[]
  /** The Bestiary's pills: the worst verdict of each guard among the attacks; null when there is
   * nothing to guard, or for the parry when the item cannot parry. */
  readonly block: Verdict | null
  readonly parry: Verdict | null
  readonly canParry: boolean
  /** Whether a roll avoids every attack; null when there is nothing to avoid. */
  readonly dodgeable: boolean | null
  readonly advice: Advice
  /** Of each fighter that has any, in the order of the phases; never part of the advice. */
  readonly hazards: readonly Hazards[]
}

/** The creatures living in a biome, in the order of the game data; where one appears only under a
 * condition (a raid, an event) does not count. */
export const creaturesOf = (biome: BiomeId) =>
  game.creatures.filter((creature) => creature.biomes.includes(biome))

export const fightersOf = (creature: GameCreature): readonly Fighter[] => [
  creature,
  ...(creature.phases ?? []),
]

/** How to take a creature at these stars with this defence, each attack with an empty bar. */
export function assess(
  creature: GameCreature,
  defence: Defence,
  world: World,
  stars: number,
): Assessment {
  const attacks = fightersOf(creature).flatMap((fighter) =>
    fighter.attacks.map((attack) => ({
      fighter,
      attack,
      damage: attackDamage(attack.hits, stars),
      verdicts: attackVerdicts(defence, attack.hits, world, stars),
    })),
  )
  const guarded = attacks.filter(
    (assessed): assessed is GuardedAttack => assessed.verdicts !== null,
  )
  const verdicts = guarded.map((assessed) => assessed.verdicts)
  const canParry = defence.parryPower !== null
  return {
    attacks,
    block: worstVerdict(verdicts.map((v) => v.block)),
    parry: canParry
      ? worstVerdict(verdicts.flatMap((v) => (v.parry === null ? [] : [v.parry])))
      : null,
    canParry,
    dodgeable: verdicts.length === 0 ? null : verdicts.every((v) => v.dodgeable),
    advice: adviceOf(creatureAdvice(verdicts), guarded),
    hazards: fightersOf(creature).flatMap((fighter) => {
      const hazards = hazardsOf(fighter, defence, world, stars)
      const none = !hazards.trample && !hazards.death && hazards.summons.length === 0
      return none ? [] : [hazards]
    }),
  }
}

function hazardsOf(fighter: Fighter, defence: Defence, world: World, stars: number): Hazards {
  const assessed = (hits: readonly GameHit[] | undefined): AssessedHits | null =>
    hits && hits.length > 0
      ? {
          hits,
          damage: attackDamage(hits, stars),
          verdicts: attackVerdicts(defence, hits, world, stars),
        }
      : null
  return {
    fighter,
    trample: assessed(fighter.trample?.hits),
    death: assessed(fighter.onDeath),
    summons: (fighter.deathSummons ?? []).map((summon) => {
      const creature = game.creatures.find((candidate) => candidate.id === summon.id) ?? null
      const factor = summon.doublesPerStar ? 2 ** stars : 1
      return {
        name: summon.name ?? creature?.name ?? { fr: summon.id, en: summon.id },
        count: [summon.min * factor, summon.max * factor],
        creature,
      }
    }),
  }
}

function adviceOf(advice: CreatureAdvice, guarded: readonly GuardedAttack[]): Advice {
  const rollsAvoid = (attacks: readonly GuardedAttack[]) =>
    attacks.every((assessed) => assessed.verdicts.dodgeable)
  switch (advice.kind) {
    case 'dodgeAll':
      return { kind: 'dodgeAll', rollsAvoid: rollsAvoid(guarded) }
    case 'dodgeSome': {
      const dodge = advice.dodge.map((index) => guarded[index]!)
      return { kind: 'dodgeSome', dodge, rest: advice.rest, rollsAvoid: rollsAvoid(dodge) }
    }
    default:
      return advice
  }
}

// The AI reaches out to 2 m unless the data says otherwise (AttackAi).
const DEFAULT_RANGE = 2

/** How far the creature's AI uses the attack from, in metres. */
export const attackRange = (attack: GameAttack) => attack.ai?.range ?? DEFAULT_RANGE

/** The damage types an attack deals over all its hits, the largest first. */
export const attackTypes = (attack: GameAttack) => hitTypes(attack.hits)

/** The damage types some hits deal, the largest first. */
export function hitTypes(hits: readonly GameHit[]): readonly DamageType[] {
  const totals = DAMAGE_TYPES.map((type) => ({
    type,
    total: hits.reduce((sum, hit) => sum + (hit.damages[type] ?? 0), 0),
  }))
  return totals
    .filter(({ total }) => total > 0)
    .sort((a, b) => b.total - a.total)
    .map(({ type }) => type)
}

export interface ShownModifier {
  readonly type: DamageType | ToolType
  /** Null for a tool taken normally: the game has no word for it. */
  readonly modifier: Exclude<DamageModifier, 'normal' | 'ignore'> | null
  readonly multiplier: number
}

type Named = Exclude<DamageModifier, 'normal' | 'ignore'>

const named = (modifier: DamageModifier | undefined): modifier is Named =>
  modifier !== undefined && modifier !== 'normal' && modifier !== 'ignore'

const TOOL_TYPES: readonly ToolType[] = ['chop', 'pickaxe']

export const isTool = (type: DamageType | ToolType): type is ToolType =>
  (TOOL_TYPES as readonly string[]).includes(type)

/** How a creature takes each damage type it does not take normally, and each tool it does not ignore
 * (most ignore them all): its weaknesses first. */
export function modifiersOf(
  modifiers: DamageModifiers,
  tools: ToolModifiers = {},
): readonly ShownModifier[] {
  const types = DAMAGE_TYPES.flatMap((type) => {
    const modifier = modifiers[type]
    return named(modifier) ? [{ type, modifier, multiplier: damageMultiplier(modifier) }] : []
  })
  const taken = TOOL_TYPES.flatMap((type) => {
    const modifier = tools[type]
    if (modifier === undefined || modifier === 'ignore') return []
    return [
      { type, modifier: named(modifier) ? modifier : null, multiplier: damageMultiplier(modifier) },
    ]
  })
  return [...types, ...taken].sort((a, b) => b.multiplier - a.multiplier)
}

/** « Weaknesses and resistances » of a creature: its body (part null), then each weak spot, whose
 * modifiers replace the body's where it is hit. */
export interface ModifierRow {
  readonly part: Localized | null
  readonly modifiers: readonly ShownModifier[]
}

export const modifierRows = (fighter: Fighter): readonly ModifierRow[] => [
  { part: null, modifiers: modifiersOf(fighter.modifiers, fighter.toolModifiers) },
  ...(fighter.weakSpots ?? []).map((spot) => ({
    part: spot.name,
    modifiers: modifiersOf(spot.modifiers, spot.toolModifiers),
  })),
]

// Each character folded on its own, so that a match in the folded name sits at the same place in the
// name: no case, no accent, one apostrophe.
const foldChar = (char: string) =>
  char
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
const fold = (text: string) => Array.from(text, foldChar).join('')

/** Where the search sits in a name, as [start, end) in its characters; null when it is not there. */
export function matchRange(text: string, query: string): readonly [number, number] | null {
  const needle = fold(query.trim())
  if (needle === '') return null
  const start = fold(text).indexOf(needle)
  return start === -1 ? null : [start, start + needle.length]
}

export interface FoundAttack {
  readonly creature: GameCreature
  readonly fighter: Fighter
  readonly attack: GameAttack
}

export interface Found {
  readonly creatures: readonly GameCreature[]
  readonly attacks: readonly FoundAttack[]
}

/** Creatures and attacks of every biome whose name, in the language shown, holds the search. */
export function search(query: string, language: Language): Found {
  if (query.trim() === '') return { creatures: [], attacks: [] }
  const matches = (name: { readonly fr: string; readonly en: string }) =>
    matchRange(name[language], query) !== null
  return {
    creatures: game.creatures.filter((creature) => matches(creature.name)),
    attacks: game.creatures.flatMap((creature) =>
      fightersOf(creature).flatMap((fighter) =>
        fighter.attacks
          .filter((attack) => matches(attack.name))
          .map((attack) => ({ creature, fighter, attack })),
      ),
    ),
  }
}
