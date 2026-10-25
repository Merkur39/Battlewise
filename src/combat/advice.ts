import type { Guard, Verdict } from './hit'

/** How an attack fares against each guard; parry is null when the item cannot parry. */
export interface GuardVerdicts {
  readonly block: Verdict
  readonly parry: Verdict | null
}

export type Setback = Exclude<Verdict, 'holds'>

export type AttackAdvice =
  | { readonly action: 'block' }
  /** `block` says why blocking is not enough. */
  | { readonly action: 'parry'; readonly block: Setback }
  /** `setback` is what the best guard available does. */
  | { readonly action: 'dodge'; readonly guard: Guard; readonly setback: Setback }

export function attackAdvice({ block, parry }: GuardVerdicts): AttackAdvice {
  if (block === 'holds') return { action: 'block' }
  if (parry === 'holds') return { action: 'parry', block }
  return parry === null
    ? { action: 'dodge', guard: 'block', setback: block }
    : { action: 'dodge', guard: 'parry', setback: parry }
}

export type CreatureAdvice =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'blockAll' }
  | { readonly kind: 'parryAll' }
  | { readonly kind: 'dodgeAll' }
  /** `dodge` holds the indexes of the attacks no guard takes; `rest` is how to take the others. */
  | {
      readonly kind: 'dodgeSome'
      readonly dodge: readonly number[]
      readonly rest: 'block' | 'parry'
    }

const guarded = ({ block, parry }: GuardVerdicts) => block === 'holds' || parry === 'holds'

/** One piece of advice for all of a creature's attacks, worded by the interface. */
export function creatureAdvice(attacks: readonly GuardVerdicts[]): CreatureAdvice {
  if (attacks.length === 0) return { kind: 'unknown' }
  const dodge = attacks.flatMap((attack, index) => (guarded(attack) ? [] : [index]))
  const restBlocks = attacks.every(
    (attack, index) => dodge.includes(index) || attack.block === 'holds',
  )
  if (dodge.length === 0) return { kind: restBlocks ? 'blockAll' : 'parryAll' }
  if (dodge.length === attacks.length) return { kind: 'dodgeAll' }
  return { kind: 'dodgeSome', dodge, rest: restBlocks ? 'block' : 'parry' }
}

const SEVERITY: readonly Verdict[] = ['holds', 'staggered', 'broken', 'unblockable']

/** A creature's verdict for one guard in the Bestiaire: the worst of its attacks. */
export function worstVerdict(verdicts: readonly Verdict[]): Verdict | null {
  if (verdicts.length === 0) return null
  return verdicts.reduce((worst, verdict) =>
    SEVERITY.indexOf(verdict) > SEVERITY.indexOf(worst) ? verdict : worst,
  )
}
