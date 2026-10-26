import { useId, useState } from 'react'
import { blockerOf, gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { closeModal } from '@/app/useRoute'
import { game } from '@/data'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronDownIcon } from '@/ui/icons'
import { Modal } from '@/ui/Modal'
import { NumberField } from '@/ui/NumberField'
import { blockerGroups, blockPowerParts, maxLevel, withstand, type GuardGauge } from './model'
import styles from './GearModal.module.css'

// Wide enough for any gear of the game; the fields only keep a typo in bounds.
const MAX_ARMOR = 999
const MAX_HEALTH = 999

/** « Ton équipement »: what every verdict is worked out with. What you can take follows the draft as it
 * changes; Valider saves it, any other way out leaves the gear as it was. */
export function GearModal() {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const saved = useAppState()
  const update = useUpdate()
  const [draft, setDraft] = useState<Gear>(saved.gear)
  const withstandId = useId()
  const itemId = useId()
  const skillId = useId()

  const blocker = blockerOf(draft.blocker)
  const top = maxLevel(blocker)
  const taken = withstand(gearDefence(draft), saved.world)
  const parts = blockPowerParts(blocker, draft.level, draft.skill)
  const n = (value: number) => formatNumber(value, language)
  const group = blocker.group === 'unarmed' ? 'other' : blocker.group

  const pick = (change: Partial<Gear>) => {
    setDraft((current) => ({ ...current, ...change }))
  }

  const levelNote =
    top === 1
      ? t.gear.notUpgradable
      : t.gear.levelNote(
          blocker.blockPowerPerLevel,
          blocker.maxQuality,
          top > blocker.maxQuality && game.forge ? game.forge.name[language] : null,
        )

  return (
    <Modal
      title={t.gear.title}
      closeLabel={t.modal.close}
      size="medium"
      footer={{
        cancel: t.modal.cancel,
        save: t.modal.save,
        onSave: () => {
          update({ gear: draft })
        },
      }}
      onClose={closeModal}
    >
      <div className={styles.form}>
        <section aria-labelledby={withstandId} className={styles.withstand}>
          <div className={styles.withstandHeader}>
            <h3 id={withstandId} className={styles.label}>
              {t.gear.withstand}
            </h3>
            <span className={styles.meta}>{t.gear.emptyBar}</span>
          </div>
          <GuardRow name={t.gear.block} gauge={taken.block} scale={taken.scale} />
          <GuardRow name={t.gear.parry} gauge={taken.parry} scale={taken.scale} />
          <span className={styles.meta}>
            {t.gear.staggersAt(
              taken.staggerAt,
              game.player.staggerFactor * 100,
              draft.maxHealth,
              draft.armor,
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
              value={draft.blocker}
              className={styles.selectInput}
              onChange={(event) => {
                const next = blockerOf(event.target.value)
                pick({ blocker: next.id, level: Math.min(draft.level, maxLevel(next)) })
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
            <span className={styles.tag}>
              {t.gear.groupTags[group]} ·{' '}
              {blocker.timedBlockBonus > 1
                ? t.gear.parryBonus(blocker.timedBlockBonus)
                : t.gear.noParry}
            </span>
            <ChevronDownIcon size={18} className={styles.chevron} />
          </div>
          {isDesktop && <p className={styles.note}>{t.gear.torch}</p>}
        </div>

        <div className={styles.level}>
          <NumberField
            label={isDesktop ? t.gear.levelLong : t.gear.level}
            value={draft.level}
            min={1}
            max={top}
            lowerLabel={t.gear.lowerLevel}
            raiseLabel={t.gear.raiseLevel}
            compact={isDesktop}
            onChange={(level) => {
              pick({ level })
            }}
          />
          {isDesktop && <p className={styles.note}>{levelNote}</p>}
        </div>

        <div className={styles.skill}>
          <div className={styles.skillHeader}>
            <label htmlFor={skillId} className={styles.label}>
              {t.gear.skill}
            </label>
            <span className={styles.skillValue}>{n(draft.skill)}</span>
          </div>
          <input
            id={skillId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={draft.skill}
            className={styles.range}
            onChange={(event) => {
              pick({ skill: Number(event.target.value) })
            }}
          />
        </div>

        <NumberField
          label={t.gear.armor}
          value={draft.armor}
          min={0}
          max={MAX_ARMOR}
          lowerLabel={t.gear.lowerArmor}
          raiseLabel={t.gear.raiseArmor}
          onChange={(armor) => {
            pick({ armor })
          }}
        />
        <NumberField
          label={t.gear.health}
          value={draft.maxHealth}
          min={1}
          max={MAX_HEALTH}
          lowerLabel={t.gear.lowerHealth}
          raiseLabel={t.gear.raiseHealth}
          onChange={(maxHealth) => {
            pick({ maxHealth })
          }}
        />

        {!isDesktop && <p className={styles.footnote}>{`${t.gear.torch} ${levelNote}`}</p>}
      </div>
    </Modal>
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
}: {
  readonly name: string
  readonly gauge: GuardGauge | null
  readonly scale: number
}) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  return (
    <div role="group" aria-label={name} className={styles.guard}>
      <div className={styles.guardLine}>
        <span className={styles.guardName}>
          {name}
          {gauge && <span className={styles.power}> · {t.gear.power(gauge.power)}</span>}
        </span>
        {gauge ? (
          <span className={styles.thresholds}>
            {t.gear.unstaggered}{' '}
            <span className={styles.ok}>{n(Math.floor(gauge.unstaggered))}</span> ·{' '}
            {t.gear.unbroken} <span className={styles.warn}>{n(Math.floor(gauge.unbroken))}</span>
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
