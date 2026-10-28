import { useId } from 'react'
import { blockerOf, gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { useIsDesktop } from '@/app/useMediaQuery'
import type { World } from '@/combat/world'
import { game } from '@/data'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronDownIcon } from '@/ui/icons'
import { NumberField } from '@/ui/NumberField'
import { blockerGroups, blockPowerParts, maxLevel, withstand, type GuardGauge } from './model'
import styles from './GearForm.module.css'

// Wide enough for any gear of the game; the fields only keep a typo in bounds.
const MAX_ARMOR = 999
const MAX_HEALTH = 999

/** The fields of « Ton équipement », and what you can take with them in `world`, worked out again as
 * `gear` changes: in its dialog, and as a question of the first arrival. */
export function GearForm({
  gear,
  world,
  onChange,
}: {
  readonly gear: Gear
  readonly world: World
  readonly onChange: (change: Partial<Gear>) => void
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const withstandId = useId()
  const itemId = useId()
  const skillId = useId()

  const blocker = blockerOf(gear.blocker)
  const top = maxLevel(blocker)
  const taken = withstand(gearDefence(gear), world)
  const parts = blockPowerParts(blocker, gear.level, gear.skill)
  const n = (value: number) => formatNumber(value, language)
  const group = blocker.group === 'unarmed' ? 'other' : blocker.group

  const levelNote =
    top === 1
      ? t.gear.notUpgradable
      : t.gear.levelNote(
          blocker.blockPowerPerLevel,
          blocker.maxQuality,
          top > blocker.maxQuality && game.forge ? game.forge.name[language] : null,
        )

  return (
    <div className={styles.form}>
      <section aria-labelledby={withstandId} className={styles.withstand}>
        <div className={styles.withstandHeader}>
          <h3 id={withstandId} className={styles.label}>
            {t.gear.withstand}
          </h3>
          <span className={styles.meta}>{t.gear.emptyBar}</span>
        </div>
        {!isDesktop && (
          <div aria-hidden="true" className={styles.legend}>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.okFill ?? ''}`} />
              {t.gear.unstaggered}
            </span>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.warnFill ?? ''}`} />
              {t.gear.unbroken}
            </span>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.badFill ?? ''}`} />
              {t.verdicts.broken}
            </span>
          </div>
        )}
        <GuardRow
          name={t.gear.block}
          gauge={taken.block}
          scale={taken.scale}
          compact={!isDesktop}
        />
        <GuardRow
          name={t.gear.parry}
          gauge={taken.parry}
          scale={taken.scale}
          compact={!isDesktop}
        />
        <span className={styles.meta}>
          {t.gear.staggersAt(
            taken.staggerAt,
            game.player.staggerFactor * 100,
            gear.maxHealth,
            gear.armor,
          )}
          {isDesktop && ` · ${t.gear.powerParts(parts.base, parts.skill)}`}
        </span>
      </section>

      <div className={styles.item}>
        <label htmlFor={itemId} className={styles.label}>
          {t.gear.item}
        </label>
        <div className={styles.select}>
          <select
            id={itemId}
            value={gear.blocker}
            className={styles.selectInput}
            onChange={(event) => {
              const next = blockerOf(event.target.value)
              onChange({ blocker: next.id, level: Math.min(gear.level, maxLevel(next)) })
            }}
          >
            {blockerGroups(language).map(({ group: id, blockers }) => (
              <optgroup key={id} label={t.gear.groups[id]}>
                {blockers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name[language]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className={styles.extras}>
            <span className={styles.tag}>
              {t.gear.groupTags[group]} ·{' '}
              {blocker.timedBlockBonus > 1
                ? t.gear.parryBonus(blocker.timedBlockBonus)
                : t.gear.noParry}
            </span>
            <ChevronDownIcon size={18} className={styles.chevron} />
          </span>
        </div>
        {isDesktop && <p className={styles.note}>{t.gear.torch}</p>}
      </div>

      <div className={styles.level}>
        <NumberField
          label={isDesktop ? t.gear.levelLong : t.gear.level}
          value={gear.level}
          min={1}
          max={top}
          lowerLabel={t.gear.lowerLevel}
          raiseLabel={t.gear.raiseLevel}
          compact={isDesktop}
          onChange={(level) => {
            onChange({ level })
          }}
        />
        {isDesktop && <p className={styles.note}>{levelNote}</p>}
      </div>

      <div className={styles.skill}>
        <label htmlFor={skillId} className={styles.label}>
          {t.gear.skill}
        </label>
        <div className={styles.skillControl}>
          <input
            id={skillId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={gear.skill}
            className={styles.range}
            onChange={(event) => {
              onChange({ skill: Number(event.target.value) })
            }}
          />
          <span className={styles.skillValue}>{n(gear.skill)}</span>
        </div>
      </div>

      <NumberField
        label={t.gear.armor}
        value={gear.armor}
        min={0}
        max={MAX_ARMOR}
        lowerLabel={t.gear.lowerArmor}
        raiseLabel={t.gear.raiseArmor}
        onChange={(armor) => {
          onChange({ armor })
        }}
      />
      <NumberField
        label={t.gear.health}
        value={gear.maxHealth}
        min={1}
        max={MAX_HEALTH}
        lowerLabel={t.gear.lowerHealth}
        raiseLabel={t.gear.raiseHealth}
        onChange={(maxHealth) => {
          onChange({ maxHealth })
        }}
      />

      {!isDesktop && <p className={styles.footnote}>{`${t.gear.torch} ${levelNote}`}</p>}
    </div>
  )
}

const percent = (value: number, scale: number) =>
  `${String((Math.min(value, scale) / scale) * 100)}%`

/** A guard's thresholds, and the gauge that draws them: ok up to the first, warn up to the second,
 * bad past it. Hits are counted whole: the largest whole hit the guard takes. */
function GuardRow({
  name,
  gauge,
  scale,
  compact,
}: {
  readonly name: string
  readonly gauge: GuardGauge | null
  readonly scale: number
  /** Phone: the legend above names the thresholds, so the line shows the numbers alone; the words stay
   * for screen readers. */
  readonly compact: boolean
}) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  const word = compact ? 'visually-hidden' : undefined
  return (
    <div role="group" aria-label={name} className={styles.guard}>
      <div className={styles.guardLine}>
        <span className={styles.guardName}>
          {name}
          {gauge && <span className={styles.power}> · {t.gear.power(gauge.power)}</span>}
        </span>
        {gauge ? (
          <span className={styles.thresholds}>
            <span className={word}>{t.gear.unstaggered} </span>
            <span className={styles.ok}>{n(Math.floor(gauge.unstaggered))}</span> ·{' '}
            <span className={word}>{t.gear.unbroken} </span>
            <span className={styles.warn}>{n(Math.floor(gauge.unbroken))}</span>
          </span>
        ) : (
          <span className={styles.thresholds}>{t.gear.cannotParry}</span>
        )}
      </div>
      <div aria-hidden="true" className={styles.gauge}>
        {gauge && (
          <>
            <span className={styles.okFill} style={{ width: percent(gauge.unstaggered, scale) }} />
            <span
              className={styles.warnFill}
              style={{ width: percent(gauge.unbroken - gauge.unstaggered, scale) }}
            />
            <span className={styles.badFill} />
          </>
        )}
      </div>
    </div>
  )
}
