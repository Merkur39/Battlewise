import { useMemo } from 'react'
import { gearDefence } from '@/app/context'
import { useAppState } from '@/app/useAppState'
import type { AttackVerdicts } from '@/combat/attack'
import type { Verdict } from '@/combat/hit'
import { game } from '@/data'
import type { GameAttack } from '@/data/types'
import type { Language } from '@/i18n/detect'
import type { Catalog } from '@/i18n/fr'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { dodgeTone, verdictTone, type Tone } from '@/ui/tones'
import { attackTypes, type Assessment } from './model'

export interface Shown {
  readonly tone: Tone
  readonly text: string
}

const ADVICE_TONES = {
  unknown: 'none',
  blockAll: 'ok',
  parryAll: 'warn',
  dodgeAll: 'bad',
  dodgeSome: 'bad',
} as const

/** The advice on a creature, in words and in its verdict colour. */
export function adviceShown(assessment: Assessment, t: Catalog, language: Language): Shown {
  const { advice } = assessment
  const tone = ADVICE_TONES[advice.kind]
  switch (advice.kind) {
    case 'dodgeAll':
      return { tone, text: t.advice.dodgeAll(advice.rollsAvoid, assessment.canParry) }
    case 'dodgeSome':
      return {
        tone,
        text: t.advice.dodgeSome(
          advice.rollsAvoid,
          advice.dodge.map((assessed) => assessed.attack.name[language]),
          advice.rest,
        ),
      }
    default:
      return { tone, text: t.advice[advice.kind] }
  }
}

export const blockShown = (verdict: Verdict | null, t: Catalog): Shown => ({
  tone: verdictTone(verdict),
  text: verdict === null ? t.verdicts.nothing : t.verdicts[verdict],
})

export const parryShown = (verdict: Verdict | null, canParry: boolean, t: Catalog): Shown =>
  canParry ? blockShown(verdict, t) : { tone: 'none', text: t.verdicts.cannotParry }

export const dodgeShown = (dodgeable: boolean | null, t: Catalog): Shown => ({
  tone: dodgeTone(dodgeable),
  text:
    dodgeable === null
      ? t.verdicts.nothing
      : dodgeable
        ? t.verdicts.dodgeable
        : t.verdicts.undodgeable,
})

/** The gear and the world every verdict is worked out with. */
export function useFight() {
  const { gear, world } = useAppState()
  const defence = useMemo(() => gearDefence(gear), [gear])
  return { defence, world }
}

/** An attack in one sentence, for the label of the row that shows it. */
export function useAttackSummary() {
  const t = useT()
  const language = useLanguage()
  return (attack: GameAttack, damage: number | null, verdicts: AttackVerdicts | null) =>
    t.creature.attackSummary({
      name: attack.name[language],
      types: attackTypes(attack).map((type) => game.damageTypes[type][language]),
      damage: damage === null ? null : Math.round(damage),
      block: verdicts === null ? '' : blockShown(verdicts.block, t).text,
      parry: verdicts === null ? '' : parryShown(verdicts.parry, verdicts.parry !== null, t).text,
      dodgeable: verdicts?.dodgeable ?? false,
    })
}

export const damageText = (damage: number | null, language: Language) =>
  damage === null ? '—' : formatNumber(Math.round(damage), language)
