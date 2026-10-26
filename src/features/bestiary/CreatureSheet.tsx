import { useId, useState, type ReactNode } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { creatureHealth, staggerThreshold, toInflict } from '@/combat/creature'
import { game } from '@/data'
import type { GameCreature } from '@/data/types'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { BackIcon, ChevronRightIcon } from '@/ui/icons'
import type { Tone } from '@/ui/tones'
import { AdviceLine, GuardIcon } from '@/ui/verdicts'
import styles from './CreatureSheet.module.css'
import {
  assess,
  attackRange,
  fightersOf,
  modifiersOf,
  type AssessedAttack,
  type Fighter,
} from './model'
import { AttackPills, AttackTags } from './parts'
import { bestiaryRoute, type Place } from './place'
import {
  adviceShown,
  blockShown,
  damageText,
  dodgeShown,
  parryShown,
  useAttackSummary,
  useFight,
} from './wording'

const simulationRoute = ({ fighter, attack }: AssessedAttack): Route => ({
  screen: 'simulation',
  path: [fighter.id, attack.ids[0] ?? ''],
  query: '',
  modal: null,
})

/**
 * Everything about taking one creature, at the stars picked: health, what staggers it, its weaknesses
 * and each attack against your gear. A page of its own on a phone, a panel beside the list on a
 * desktop.
 */
export function CreatureSheet({
  creature,
  place,
  layout,
}: {
  readonly creature: GameCreature
  readonly place: Place
  readonly layout: 'page' | 'panel'
}) {
  const t = useT()
  const language = useLanguage()
  const { defence, world } = useFight()
  const [stars, setStars] = useState(creature.stars.min)
  const assessment = assess(creature, defence, world, stars)
  const advice = adviceShown(assessment, t, language)
  const threshold = staggerThreshold(creature, stars)
  const biome = game.biomes.find((candidate) => candidate.id === place.biome)?.name[language]
  const name = creature.name[language]
  const Title = layout === 'page' ? 'h1' : 'h2'

  const parry: { tone: Tone; text: string } = !assessment.canParry
    ? { tone: 'none', text: t.creature.cannotParry }
    : creature.staggeredByParry
      ? { tone: 'ok', text: t.creature.parryStaggers }
      : { tone: 'none', text: t.creature.parryDoesNot }

  const starOptions = Array.from(
    { length: creature.stars.max - creature.stars.min + 1 },
    (_, index) => creature.stars.min + index,
  )

  const body = (
    <>
      <div className={styles.stats}>
        <Stat
          label={t.creature.health}
          short={t.creature.healthShort}
          value={formatNumber(creatureHealth(creature.health, stars), language)}
          numeric
        />
        <Stat
          label={t.creature.toInflict}
          value={
            threshold === null
              ? t.creature.neverStaggers
              : formatNumber(Math.round(toInflict(threshold, world)), language)
          }
          numeric={threshold !== null}
        />
        <Stat label={t.creature.yourParry} value={parry.text} tone={parry.tone} />
        {layout === 'panel' && (
          <Stat label={t.bestiary.howToTake} value={advice.text} tone={advice.tone} />
        )}
      </div>
      {layout === 'page' && (
        <AdviceLine tone={advice.tone} text={advice.text} className={styles.advice} />
      )}
      <Modifiers creature={creature} />
      {layout === 'page' ? (
        <AttackList creature={creature} attacks={assessment.attacks} />
      ) : (
        <AttackTable creature={creature} attacks={assessment.attacks} />
      )}
    </>
  )

  const starPicker = starOptions.length > 1 && (
    <div role="group" aria-label={t.creature.stars} className={styles.stars}>
      {starOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === stars}
          className={styles.star}
          onClick={() => {
            setStars(option)
          }}
        >
          {t.creature.star(option)}
        </button>
      ))}
    </div>
  )

  if (layout === 'page') {
    return (
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <RouteLink
            to={bestiaryRoute(place.biome, null, place.query)}
            how="return"
            aria-label={t.creature.back}
            className={styles.back}
          >
            <BackIcon size={22} />
          </RouteLink>
          <Title className={styles.pageTitle}>{name}</Title>
          {biome && <span className={styles.biome}>{biome}</span>}
        </div>
        <div className={styles.pageBody}>
          {starPicker}
          {body}
        </div>
      </main>
    )
  }

  return (
    <section aria-label={name} className={styles.panel}>
      <div className={styles.panelBody}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitles}>
            <Title className={styles.panelTitle}>{name}</Title>
            {biome && <span className={styles.biome}>{biome}</span>}
          </div>
          {starPicker}
        </div>
        {body}
      </div>
    </section>
  )
}

function Stat({
  label,
  short,
  value,
  numeric = false,
  tone,
}: {
  readonly label: string
  readonly short?: string
  readonly value: string
  readonly numeric?: boolean
  readonly tone?: Tone
}) {
  return (
    <div role="group" aria-label={label} className={styles.stat}>
      <span aria-hidden="true" className={styles.statLabel}>
        {short ?? label}
      </span>
      <span
        className={`${numeric ? (styles.statNumber ?? '') : (styles.statText ?? '')} ${tone ? (styles[tone] ?? '') : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

/** One chip per damage type not taken normally, in the game's words; neutral, never a verdict. */
function Modifiers({ creature }: { readonly creature: GameCreature }) {
  const t = useT()
  const language = useLanguage()
  const labelId = useId()
  const modifiers = modifiersOf(creature.modifiers)
  const look = (multiplier: number) =>
    multiplier === 0 ? styles.immune : multiplier > 1 ? styles.weak : styles.resistant
  return (
    <div className={styles.modifiers}>
      <span id={labelId} className={styles.label}>
        {t.creature.modifiers}
      </span>
      <div className={styles.chips}>
        {modifiers.length > 0 && (
          <ul aria-labelledby={labelId} className={styles.chipList}>
            {modifiers.map(({ type, modifier, multiplier }) => (
              <li key={type} className={`${styles.chip ?? ''} ${look(multiplier) ?? ''}`}>
                <DamageTypeIcon type={type} className={styles.chipIcon} />
                {t.creature.modifier(
                  game.damageTypes[type][language],
                  game.modifiers[modifier][language],
                  multiplier,
                )}
              </li>
            ))}
          </ul>
        )}
        <span className={styles.rest}>
          {modifiers.length > 0 ? t.creature.everythingElse : t.creature.noModifier}
        </span>
      </div>
    </div>
  )
}

/** The attacks by phase: one group without a heading for a creature that has none. */
function byFighter(creature: GameCreature, attacks: readonly AssessedAttack[]) {
  return fightersOf(creature).map((fighter, index) => ({
    fighter,
    index,
    attacks: attacks.filter((assessed) => assessed.fighter === fighter),
  }))
}

function PhaseHeading({
  creature,
  fighter,
  index,
  children,
}: {
  readonly creature: GameCreature
  readonly fighter: Fighter
  readonly index: number
  readonly children?: ReactNode
}) {
  const t = useT()
  if (!creature.phases) return null
  return (
    <span className={styles.phase}>
      {t.creature.phase(index + 1, fighter.health)}
      {children}
    </span>
  )
}

/** Phone: one link per attack, its verdicts in one sentence for screen readers. */
function AttackList({
  creature,
  attacks,
}: {
  readonly creature: GameCreature
  readonly attacks: readonly AssessedAttack[]
}) {
  const t = useT()
  const language = useLanguage()
  const summary = useAttackSummary()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={styles.attacks}>
      <div className={styles.attacksHeader}>
        <h2 id={headingId} className={styles.label}>
          {t.creature.attacks}
        </h2>
        <span aria-hidden="true" className={styles.damageHead}>
          {t.creature.damageShort}
        </span>
        <span aria-hidden="true" className={styles.pillHeads}>
          <GuardIcon guard="block" size={13} />
          <GuardIcon guard="parry" size={13} />
          <GuardIcon guard="dodge" size={13} />
        </span>
      </div>
      {byFighter(creature, attacks).map(({ fighter, index, attacks: own }) => (
        <div key={fighter.id} className={styles.group}>
          <PhaseHeading creature={creature} fighter={fighter} index={index}>
            {own.length === 0 && ` · ${t.creature.noAttack}`}
          </PhaseHeading>
          {own.map((assessed) => {
            const { attack, damage, verdicts } = assessed
            const content = (
              <>
                <span className={styles.attackName}>
                  <span className={styles.attackTitle}>{attack.name[language]}</span>
                  <AttackTags attack={attack} />
                </span>
                <span className={styles.damage}>{damageText(damage, language)}</span>
                {verdicts ? <AttackPills verdicts={verdicts} /> : <span />}
              </>
            )
            return verdicts ? (
              <RouteLink
                key={attack.ids[0]}
                to={simulationRoute(assessed)}
                aria-label={`${summary(attack, damage, verdicts)} ${t.creature.openSimulation}`}
                className={styles.attackRow}
              >
                {content}
                <ChevronRightIcon size={16} className={styles.chevron} />
              </RouteLink>
            ) : (
              <div key={attack.ids[0]} className={styles.attackRow}>
                {content}
              </div>
            )
          })}
        </div>
      ))}
      <p className={styles.note}>{t.creature.tapToSimulate}</p>
    </section>
  )
}

/** Desktop: the attacks as a table, the verdicts spelt out. */
function AttackTable({
  creature,
  attacks,
}: {
  readonly creature: GameCreature
  readonly attacks: readonly AssessedAttack[]
}) {
  const t = useT()
  const language = useLanguage()
  return (
    <>
      <div className={styles.tableBox}>
        <table aria-label={t.creature.attacks} className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.creature.attack}</th>
              <th scope="col">{t.creature.range}</th>
              <th scope="col" className={styles.numeric}>
                {t.creature.damage}
              </th>
              <th scope="col">{t.verdicts.block}</th>
              <th scope="col">{t.verdicts.parry}</th>
              <th scope="col">{t.verdicts.dodge}</th>
              <th scope="col">
                <span className="visually-hidden">{t.creature.simulate}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {byFighter(creature, attacks).map(({ fighter, index, attacks: own }) => [
              creature.phases ? (
                <tr key={`${fighter.id}-phase`} className={styles.phaseRow}>
                  <th scope="colgroup" colSpan={7}>
                    <PhaseHeading creature={creature} fighter={fighter} index={index}>
                      {own.length === 0 && ` · ${t.creature.noAttack}`}
                    </PhaseHeading>
                  </th>
                </tr>
              ) : null,
              ...own.map((assessed) => {
                const { attack, damage, verdicts } = assessed
                const block = verdicts ? blockShown(verdicts.block, t) : null
                const parry = verdicts
                  ? parryShown(verdicts.parry, verdicts.parry !== null, t)
                  : null
                const dodge = verdicts ? dodgeShown(verdicts.dodgeable, t) : null
                return (
                  <tr key={`${fighter.id}/${attack.ids[0] ?? ''}`}>
                    <th scope="row" className={styles.attackCell}>
                      <span className={styles.attackTitle}>{attack.name[language]}</span>
                      <AttackTags attack={attack} withRange={false} />
                    </th>
                    <td className={styles.range}>
                      {attack.kind === 'summon'
                        ? t.creature.kinds.summon
                        : t.creature.metres(attackRange(attack))}
                    </td>
                    <td className={`${styles.numeric ?? ''} ${styles.tableDamage ?? ''}`}>
                      {damageText(damage, language)}
                    </td>
                    {[block, parry, dodge].map((shown, column) => (
                      <td
                        key={column}
                        className={`${styles.verdict ?? ''} ${shown ? (styles[shown.tone] ?? '') : ''}`}
                      >
                        {shown?.text ?? '—'}
                      </td>
                    ))}
                    <td>
                      {verdicts && damage !== null && (
                        <RouteLink
                          to={simulationRoute(assessed)}
                          aria-label={t.creature.simulateLabel(
                            attack.name[language],
                            Math.round(damage),
                          )}
                          className={styles.simulate}
                        >
                          {t.creature.simulate}
                          <ChevronRightIcon size={14} />
                        </RouteLink>
                      )}
                    </td>
                  </tr>
                )
              }),
            ])}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{t.creature.desktopNote}</p>
    </>
  )
}
