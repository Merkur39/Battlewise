import type { Verdict } from '@/combat/hit'

/** ok / warn / bad are the verdict colours, and nothing else wears them; none is neutral. */
export type Tone = 'ok' | 'warn' | 'bad' | 'none'
export type GuardKind = 'block' | 'parry' | 'dodge'

export function verdictTone(verdict: Verdict | null): Tone {
  if (verdict === null) return 'none'
  if (verdict === 'holds') return 'ok'
  return verdict === 'staggered' ? 'warn' : 'bad'
}

export const dodgeTone = (dodgeable: boolean | null): Tone =>
  dodgeable === null ? 'none' : dodgeable ? 'ok' : 'bad'
