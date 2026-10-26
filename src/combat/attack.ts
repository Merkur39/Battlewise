import { worstVerdict } from './advice'
import type { Defence } from './block'
import { listedDamage, resolveHit, type Guard, type Hit, type Verdict } from './hit'
import type { World } from './world'

/** One hit of a monster attack, and whether a roll avoids it. */
export interface AttackHit extends Hit {
  readonly dodgeable: boolean
}

/** How an attack fares against each guard; parry is null when the item cannot parry. */
export interface AttackVerdicts {
  readonly block: Verdict
  readonly parry: Verdict | null
  readonly dodgeable: boolean
}

/**
 * An attack at a glance, with an empty bar: for each guard the worst verdict among its hits, and a
 * roll avoids it only when it avoids every hit. Null for an attack that only summons.
 */
export function attackVerdicts(
  defence: Defence,
  hits: readonly AttackHit[],
  world: World,
  stars: number,
): AttackVerdicts | null {
  const verdictOf = (guard: Guard) => {
    const verdicts: Verdict[] = []
    for (const hit of hits) {
      const result = resolveHit(defence, hit, world, { guard, stars, barBefore: 0 })
      if (result === null) return null
      verdicts.push(result.verdict)
    }
    return worstVerdict(verdicts)
  }
  const block = verdictOf('block')
  if (block === null) return null
  return { block, parry: verdictOf('parry'), dodgeable: hits.every((hit) => hit.dodgeable) }
}

/** The largest hit of an attack as the game lists it at these stars; null when it only summons. */
export const attackDamage = (hits: readonly AttackHit[], stars: number) =>
  hits.length === 0 ? null : Math.max(...hits.map((hit) => listedDamage(hit, stars)))
