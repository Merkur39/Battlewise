import { useEffect, useId, useState } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { openModal, useRoute } from '@/app/useRoute'
import { attackAdvice } from '@/combat/advice'
import { attackDamage, hardestHit, type AttackHit } from '@/combat/attack'
import type { HitResult } from '@/combat/hit'
import { game } from '@/data'
import type { FoundAttack } from '@/features/bestiary/model'
import { AttackTags } from '@/features/bestiary/parts'
import { useFight } from '@/features/bestiary/wording'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { BestiaryIcon, ChevronRightIcon, DodgeIcon, MinusIcon, PlusIcon } from '@/ui/icons'
import { verdictTone, type Tone } from '@/ui/tones'
import { AdviceLine } from '@/ui/verdicts'
import { findAttack, refOf, withRecent } from './model'
import styles from './SimulationScreen.module.css'

const BAR_STEPS = [0, 25, 50, 75] as const
const DEFAULT_VALUE = 90
const VALUE_STEP = 5

// A free value hits as a plain physical blow the guard can take; the world scales it, no star does.
const freeHit = (value: number): AttackHit => ({
  damages: { blunt: value },
  staggerMultiplier: 1,
  blockable: true,
  dodgeable: true,
})

const oneDecimal = (value: number) => Math.round(value * 10) / 10

/** « L'attaque d'abord »: the attack of the address, else the last one simulated, against your
 * gear; a free value stands in for an attack on demand. */
export function SimulationScreen({ route }: { readonly route: Route }) {
  const { recentAttacks } = useAppState()
  const update = useUpdate()
  const ref = refOf(route) ?? recentAttacks[0] ?? null
  const found = ref ? findAttack(ref) : null

  // The attack an address names joins the recent ones; the store saves them.
  useEffect(() => {
    const named = refOf(route)
    if (named === null || findAttack(named) === null) return
    const first = recentAttacks[0]
    if (first?.fighter === named.fighter && first.attack === named.attack) return
    update({ recentAttacks: withRecent(recentAttacks, named) })
  }, [route, recentAttacks, update])

  return (
    <Simulator
      key={found ? `${found.fighter.id}/${found.attack.ids[0] ?? ''}` : 'none'}
      found={found}
    />
  )
}

function Simulator({ found }: { readonly found: FoundAttack | null }) {
  const t = useT()
  const isDesktop = useIsDesktop()
  const { defence, world } = useFight()
  const [mode, setMode] = useState<'attack' | 'value'>('attack')
  const [stars, setStars] = useState(found?.creature.stars.min ?? 0)
  const [bar, setBar] = useState<number>(0)
  const [value, setValue] = useState(DEFAULT_VALUE)
  const barId = useId()

  const attackMode = mode === 'attack'
  const hits = attackMode ? (found?.attack.hits ?? null) : [freeHit(value)]
  const options = { stars: attackMode ? stars : 0, barBefore: bar / 100 }
  const block = hits && hardestHit(defence, hits, world, { guard: 'block', ...options })
  const parry = hits && hardestHit(defence, hits, world, { guard: 'parry', ...options })
  const dodgeable = attackMode && found ? found.attack.hits.every((hit) => hit.dodgeable) : null

  const modeSwitch = (
    <div role="group" aria-label={t.simulation.source} className={styles.segments}>
      {(['attack', 'value'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === mode}
          className={styles.segment}
          onClick={() => {
            setMode(option)
          }}
        >
          {t.simulation.modes[option]}
        </button>
      ))}
    </div>
  )

  const starOptions = found
    ? Array.from(
        { length: found.creature.stars.max - found.creature.stars.min + 1 },
        (_, index) => found.creature.stars.min + index,
      )
    : []

  const hitControls = attackMode ? (
    found ? (
      <>
        <AttackChip found={found} stars={stars} />
        {starOptions.length > 1 && (
          <div className={styles.labelled}>
            {isDesktop && (
              <span aria-hidden="true" className={styles.label}>
                {t.simulation.starsShort}
              </span>
            )}
            <div role="group" aria-label={t.simulation.stars} className={styles.segments}>
              {starOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === stars}
                  className={`${styles.segment ?? ''} ${styles.mono ?? ''}`}
                  onClick={() => {
                    setStars(option)
                  }}
                >
                  {t.creature.star(option)}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    ) : (
      <div className={styles.empty}>
        <span className={styles.note}>{t.simulation.noAttack}</span>
        <button
          type="button"
          className={styles.pick}
          onClick={() => {
            openModal('attack')
          }}
        >
          {t.simulation.pick}
        </button>
      </div>
    )
  ) : (
    <div className={styles.valueRow}>
      <div role="group" aria-label={t.simulation.value} className={styles.stepper}>
        <button
          type="button"
          aria-label={t.simulation.lower}
          className={styles.stepButton}
          onClick={() => {
            setValue((current) => Math.max(0, current - VALUE_STEP))
          }}
        >
          <MinusIcon />
        </button>
        <span className={styles.value}>{value}</span>
        <button
          type="button"
          aria-label={t.simulation.raise}
          className={styles.stepButton}
          onClick={() => {
            setValue((current) => current + VALUE_STEP)
          }}
        >
          <PlusIcon />
        </button>
      </div>
      <span className={styles.note}>{t.simulation.valueNote}</span>
    </div>
  )

  const barControls = (
    <div className={styles.barRow}>
      <span id={barId} className={styles.label}>
        {t.simulation.bar}
      </span>
      <div role="group" aria-labelledby={barId} className={styles.segments}>
        {BAR_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            aria-pressed={step === bar}
            className={`${styles.segment ?? ''} ${styles.mono ?? ''}`}
            onClick={() => {
              setBar(step)
            }}
          >
            {t.simulation.barOption(step)}
          </button>
        ))}
      </div>
    </div>
  )

  const result = block && (
    <>
      <Advice block={block} parry={parry} dodgeable={dodgeable} />
      <div className={styles.cards}>
        <ResultCard label={t.simulation.blocking} result={block} />
        <ResultCard label={t.simulation.parrying} result={parry} />
      </div>
      {attackMode && dodgeable !== null && (
        <span
          className={`${styles.dodge ?? ''} ${dodgeable ? (styles.ok ?? '') : (styles.bad ?? '')}`}
        >
          <DodgeIcon size={16} strokeWidth={2} />
          <span>{dodgeable ? t.simulation.dodgeable : t.simulation.undodgeable}</span>
        </span>
      )}
      {attackMode && found && found.attack.hits.length > 1 && (
        <span className={styles.note}>{t.simulation.hits(found.attack.hits.length)}</span>
      )}
    </>
  )

  if (isDesktop) {
    return (
      <main className={styles.desktop}>
        <div className={styles.desktopBody}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{t.screens.simulation}</h1>
            <p className={styles.intro}>{t.simulation.intro}</p>
          </div>
          <div className={styles.columns}>
            <section aria-labelledby={`${barId}-hit`} className={styles.hitPanel}>
              <h2 id={`${barId}-hit`} className={styles.panelTitle}>
                {t.simulation.hit}
              </h2>
              {modeSwitch}
              {hitControls}
              {barControls}
            </section>
            <section aria-labelledby={`${barId}-result`} className={styles.result}>
              <h2 id={`${barId}-result`} className="visually-hidden">
                {t.simulation.result}
              </h2>
              {result}
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.simulation}</h1>
      {modeSwitch}
      <section aria-label={t.simulation.hit} className={styles.hitPanel}>
        {hitControls}
        {barControls}
      </section>
      {result}
    </main>
  )
}

/** The attack simulated: a way to change it. */
function AttackChip({ found, stars }: { readonly found: FoundAttack; readonly stars: number }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const route = useRoute()
  const { creature, attack } = found
  const damage = Math.round(attackDamage(attack.hits, stars) ?? 0)
  const biome = game.biomes.find((candidate) => candidate.id === creature.biomes[0])
  const extra = isDesktop ? (biome ? [biome.name[language]] : []) : [t.simulation.change]
  return (
    <RouteLink
      to={{ ...route, modal: 'attack' }}
      aria-label={t.simulation.changeLabel(creature.name[language], attack.name[language], damage)}
      className={styles.chip}
    >
      <BestiaryIcon size={22} className={styles.chipIcon} />
      <span className={styles.chipText}>
        <span className={styles.chipName}>
          {creature.name[language]} · {attack.name[language]}
        </span>
        <AttackTags attack={attack} withRange={false} extra={extra} />
      </span>
      <span className={styles.chipDamage}>{formatNumber(damage, language)}</span>
      {isDesktop ? (
        <span className={styles.change}>{t.simulation.change}</span>
      ) : (
        <ChevronRightIcon size={16} className={styles.chevron} />
      )}
    </RouteLink>
  )
}

function Advice({
  block,
  parry,
  dodgeable,
}: {
  readonly block: HitResult
  readonly parry: HitResult | null
  readonly dodgeable: boolean | null
}) {
  const t = useT()
  const advice = attackAdvice({ block: block.verdict, parry: parry?.verdict ?? null })
  let shown: { tone: Tone; text: string }
  if (advice.action === 'block') shown = { tone: 'ok', text: t.simulation.advice.block }
  else if (advice.action === 'parry')
    shown = {
      tone: 'warn',
      text: t.simulation.advice.parry(advice.block === 'broken' ? 'broken' : 'staggered'),
    }
  else
    shown = {
      tone: 'bad',
      text: t.simulation.advice.dodge(dodgeable, advice.guard, advice.setback),
    }
  return <AdviceLine tone={shown.tone} text={shown.text} className={styles.advice} />
}

/** One guard against the hit: its verdict, what you take, what it costs, and the bar it leaves. */
function ResultCard({
  label,
  result,
}: {
  readonly label: string
  readonly result: HitResult | null
}) {
  const t = useT()
  const language = useLanguage()
  if (result === null) {
    return (
      <div role="group" aria-label={label} className={`${styles.card ?? ''} ${styles.none ?? ''}`}>
        <span aria-hidden="true" className={styles.label}>
          {label}
        </span>
        <span className={styles.cannot}>{t.creature.cannotParry}</span>
      </div>
    )
  }
  const tone = verdictTone(result.verdict)
  const { before, shield, armor, limit } = result.bar
  const total = Math.min(limit, before + shield + armor)
  const overflows = result.staggered
  // Each part of the bar in its turn, never past the end.
  let used = 0
  const widths = [before, shield, armor].map((part) => {
    const width = Math.min(100 - used, (Math.max(0, part) / limit) * 100)
    used += width
    return width
  })
  return (
    <div role="group" aria-label={label} className={`${styles.card ?? ''} ${styles[tone] ?? ''}`}>
      <span aria-hidden="true" className={styles.label}>
        {label}
      </span>
      <span className={styles.verdict}>{t.verdicts[result.verdict]}</span>
      <span className={styles.taken}>
        {formatNumber(oneDecimal(result.taken), language)}{' '}
        <span className={styles.unit}>{t.simulation.taken}</span>
      </span>
      <span className={styles.stamina}>{t.simulation.stamina(Math.round(result.stamina))}</span>
      <div
        role="img"
        aria-label={t.simulation.barLabel(oneDecimal(total), oneDecimal(limit), overflows)}
        className={styles.bar}
      >
        <span className={styles.barBefore} style={{ width: `${String(widths[0])}%` }} />
        <span className={styles.barShield} style={{ width: `${String(widths[1])}%` }} />
        <span className={styles.barArmor} style={{ width: `${String(widths[2])}%` }} />
      </div>
      <span className={`${styles.barText ?? ''} ${overflows ? (styles.overflows ?? '') : ''}`}>
        {overflows
          ? t.simulation.barOverflows
          : t.simulation.barTotal(oneDecimal(total), oneDecimal(limit))}
      </span>
    </div>
  )
}
