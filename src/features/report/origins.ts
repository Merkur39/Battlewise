import { blockerOf, gearBlockPower, gearDefence, presetOf } from '@/app/context'
import { useAppState } from '@/app/useAppState'
import type { HitResult } from '@/combat/hit'
import { game } from '@/data'
import type { GameCreature } from '@/data/types'
import {
  creatureName,
  isTool,
  modifierRows,
  type Assessment,
  type FoundAttack,
} from '@/features/bestiary/model'
import { useAttackSummary } from '@/features/bestiary/wording'
import { pieceOf, SLOTS } from '@/features/gear/pieces'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import type { ReportLine, ReportOrigin } from './model'

/** Reports from Settings › About: nothing on screen to attach, and no kind picked in advance. */
export const SETTINGS_ORIGIN: ReportOrigin = {
  screen: 'settings',
  kind: null,
  heading: null,
  title: null,
  subject: null,
  ids: {},
  shows: [],
  lines: [],
}

/** Your gear and Your world, as their summaries put them, with the armor, the max health and the pieces
 * worn: every verdict hangs on them. */
function useSetupLines(): readonly string[] {
  const t = useT()
  const language = useLanguage()
  const { gear, world } = useAppState()
  const worn = gear.pieces
    ? SLOTS.flatMap((slot) => {
        const piece = gear.pieces?.[slot]
        return piece
          ? [`${pieceOf(piece.id).name[language]} ${t.gear.levelValue(piece.level)}`]
          : []
      })
    : null
  return [
    t.gear.summary(
      blockerOf(gear.blocker).name[language],
      gear.level,
      gearBlockPower(gear),
      gear.skill,
    ),
    t.gear.bodySummary(gearDefence(gear).armor, gear.maxHealth, worn),
    t.world.summary(presetOf(world).name[language], world.players),
  ]
}

/** A creature's sheet at the stars picked: each of its lines, which a wrong-data report can point at. */
export function useCreatureOrigin({
  creature,
  stars,
  assessment,
  health,
  toInflict,
}: {
  readonly creature: GameCreature
  readonly stars: number
  readonly assessment: Assessment
  /** As the sheet shows them. */
  readonly health: string
  readonly toInflict: string
}): ReportOrigin {
  const t = useT()
  const language = useLanguage()
  const summary = useAttackSummary()
  const setup = useSetupLines()
  const name = `${creatureName(creature, language)} · ${t.creature.star(stars)}`
  const weaknesses = modifierRows(creature)
    .map(({ part, modifiers }) => {
      const shown = modifiers.map(({ type, modifier, multiplier }) =>
        t.creature.modifier(
          (isTool(type) ? game.toolTypes[type] : game.damageTypes[type])[language],
          modifier === null ? null : game.modifiers[modifier][language],
          multiplier,
        ),
      )
      return `${part?.[language] ?? t.creature.body} : ${shown.length > 0 ? shown.join(', ') : t.creature.noModifier}`
    })
    .join(' · ')
  const lines: ReportLine[] = [
    {
      id: 'health',
      label: t.creature.health,
      subject: 'Health',
      shows: `${t.creature.health} ${health}`,
    },
    {
      id: 'toInflict',
      label: t.creature.toInflict,
      subject: 'Stagger',
      shows: `${t.creature.toInflict} ${toInflict}`,
    },
    { id: 'modifiers', label: t.report.weaknesses, subject: 'Damage modifiers', shows: weaknesses },
    ...assessment.attacks.map(({ fighter, attack, damage, verdicts }) => ({
      id: `${fighter.id}/${attack.ids[0] ?? ''}`,
      label: attack.name[language],
      subject: attack.name.en,
      shows: summary(attack, damage, verdicts),
    })),
  ]
  return {
    screen: 'creature',
    kind: 'data',
    heading: name,
    title: creatureName(creature, language),
    subject: creatureName(creature, 'en'),
    ids: { creature: creature.id, stars },
    shows: [name, ...lines.map((line) => line.shows), ...setup],
    lines,
  }
}

const tenths = (value: number) => Math.round(value * 10) / 10

/** The Simulation as it stands: the hit, the stagger bar, both guards' verdicts and your setup. */
export function useSimulationOrigin({
  found,
  stars,
  value,
  bar,
  block,
  parry,
  dodgeable,
}: {
  /** The attack simulated, null when the hit is a value typed in. */
  readonly found: FoundAttack | null
  readonly stars: number
  readonly value: number
  readonly bar: number
  readonly block: HitResult | null
  readonly parry: HitResult | null
  readonly dodgeable: boolean | null
}): ReportOrigin {
  const t = useT()
  const language = useLanguage()
  const setup = useSetupLines()
  const guard = (label: string, result: HitResult | null) =>
    result === null
      ? `${label} : ${t.creature.cannotParry}`
      : `${label} : ${t.verdicts[result.verdict]} · ${formatNumber(tenths(result.taken), language)} ${t.simulation.taken}`
  const heading = found
    ? `${creatureName(found.creature, language)} · ${found.attack.name[language]}`
    : null
  return {
    screen: 'simulation',
    kind: 'data',
    heading,
    title: found
      ? `${creatureName(found.creature, language)} › ${found.attack.name[language]}`
      : null,
    subject: found ? `${creatureName(found.creature, 'en')} › ${found.attack.name.en}` : null,
    ids: found ? { creature: found.creature.id, stars, attack: found.attack.ids[0] ?? '' } : {},
    shows: [
      found
        ? `${heading ?? ''} · ${t.creature.star(stars)}`
        : `${t.simulation.modes.value} : ${formatNumber(value, language)}`,
      `${t.simulation.bar} : ${t.simulation.barOption(bar)}`,
      ...(block ? [guard(t.simulation.blocking, block), guard(t.simulation.parrying, parry)] : []),
      ...(dodgeable === null
        ? []
        : [dodgeable ? t.simulation.dodgeable : t.simulation.undodgeable]),
      ...setup,
    ],
    lines: [],
  }
}
