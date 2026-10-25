import type { Defence } from './block'
import { resolveHit, type Guard, type Verdict } from './hit'
import type { World } from './world'

/** How much a guard takes: without staggering, or at all before it breaks. */
export type Endurance = 'unstaggered' | 'unbroken'

const endures = (endurance: Endurance, verdict: Verdict) =>
  endurance === 'unbroken' ? verdict !== 'broken' : verdict === 'holds'

// Relative width at which the bisection stops; far below what the interface shows.
const PRECISION = 1e-12

/**
 * The largest physical hit, as listed before the difficulty, that the guard takes with an empty
 * bar; null when the item cannot parry. Every step of a hit grows with its damage, so the hits
 * a guard takes run from 0 up to an edge, found by bisection.
 */
export function maxHit(
  defence: Defence,
  world: World,
  guard: Guard,
  endurance: Endurance,
): number | null {
  const verdictAt = (damage: number) =>
    resolveHit(
      defence,
      { damages: { blunt: damage }, staggerMultiplier: 1, blockable: true },
      world,
      { guard, stars: 0, barBefore: 0 },
    )?.verdict
  if (verdictAt(0) === undefined) return null
  const within = (damage: number) => endures(endurance, verdictAt(damage)!)

  let low = 0
  let high = 1
  while (within(high)) {
    low = high
    high *= 2
  }
  while (high - low > high * PRECISION) {
    const middle = (low + high) / 2
    if (within(middle)) low = middle
    else high = middle
  }
  return low
}

const GAUGE_STEP = 50
const GAUGE_ROOM = 1.1

/** Common end of the « Ce que tu encaisses » gauges: room past the largest threshold, in steps. */
export function gaugeScale(thresholds: readonly number[]): number {
  const largest = Math.max(0, ...thresholds)
  return Math.max(GAUGE_STEP, Math.ceil((largest * GAUGE_ROOM) / GAUGE_STEP) * GAUGE_STEP)
}
