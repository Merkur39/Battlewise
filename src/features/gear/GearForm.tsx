import { useId, useState, type ReactNode } from 'react'
import { blockerOf, gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { useIsDesktop } from '@/app/useMediaQuery'
import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier } from '@/combat/modifiers'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { ArmorSlot, GameRuleEffect } from '@/data/types'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { useEffectWording } from '@/features/effects/wording'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { ChevronDownIcon, MinusIcon, PlusIcon } from '@/ui/icons'
import { NumberField } from '@/ui/NumberField'
import { carriable, effectOf, NOTHING_CARRIED, type Carried, type CarriedEffect } from './carried'
import { blockerGroups, blockPowerParts, maxLevel, withstand, type GuardGauge } from './model'
import { pieceOf, SLOTS, slotPieces, summarize, type Pieces, type Worn } from './pieces'
import styles from './GearForm.module.css'

// Wide enough for any gear of the game; the field only keeps a typo in bounds.
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

  const blocker = blockerOf(gear.blocker)
  const defence = gearDefence(gear)
  const taken = withstand(defence, world)
  const parts = blockPowerParts(blocker, gear.level, gear.skill)

  // Picking a piece wears the pieces from then on: an earlier player's typed armor makes way for them.
  const wear = (slot: ArmorSlot, worn: Worn | null) => {
    const others = Object.fromEntries(
      Object.entries(gear.pieces ?? {}).filter(([key]) => key !== slot),
    ) as Pieces
    onChange({ pieces: worn ? { ...others, [slot]: worn } : others, armor: 0 })
  }

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
            defence.armor,
          )}
          {isDesktop && ` · ${t.gear.powerParts(parts.base, parts.skill)}`}
        </span>
      </section>

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
      <NumberField
        label={t.gear.skill}
        value={gear.skill}
        min={0}
        max={100}
        lowerLabel={t.gear.lowerSkill}
        raiseLabel={t.gear.raiseSkill}
        onChange={(skill) => {
          onChange({ skill })
        }}
      />

      <div className={styles.rows}>
        <Row
          label={t.gear.held}
          value={gear.blocker}
          onSelect={(id) => {
            const next = blockerOf(id)
            onChange({ blocker: next.id, level: Math.min(gear.level, maxLevel(next)) })
          }}
          level={gear.level}
          max={maxLevel(blocker)}
          onLevel={(level) => {
            onChange({ level })
          }}
        >
          {blockerGroups(language).map(({ group, blockers }) => (
            <optgroup key={group} label={t.gear.groups[group]}>
              {blockers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name[language]}
                </option>
              ))}
            </optgroup>
          ))}
        </Row>
      </div>

      <PiecesSection gear={gear} onWear={wear} />
      <CarriedSection
        carried={gear.carried ?? NOTHING_CARRIED}
        onCarry={(carried) => {
          onChange({ carried })
        }}
      />
    </div>
  )
}

const NONE = ''

/** The pieces worn, slot by slot, their armor, and what they and their complete sets resist. */
function PiecesSection({
  gear,
  onWear,
}: {
  readonly gear: Gear
  readonly onWear: (slot: ArmorSlot, worn: Worn | null) => void
}) {
  const t = useT()
  const language = useLanguage()
  const headingId = useId()
  const pieces: Pieces = gear.pieces ?? {}
  const summary = summarize(pieces)
  const typed = gear.pieces === undefined && gear.armor > 0
  const n = (value: number) => formatNumber(value, language)

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.label}>
        {t.gear.pieces}
      </h3>
      <div className={styles.rows}>
        {SLOTS.map((slot) => {
          const worn = pieces[slot]
          return (
            <Row
              key={slot}
              label={t.gear.slots[slot]}
              value={worn?.id ?? NONE}
              onSelect={(id) => {
                onWear(
                  slot,
                  id === NONE
                    ? null
                    : { id, level: Math.min(worn?.level ?? 1, maxLevel(pieceOf(id))) },
                )
              }}
              level={worn?.level ?? null}
              max={worn ? maxLevel(pieceOf(worn.id)) : 1}
              onLevel={(level) => {
                if (worn) onWear(slot, { ...worn, level })
              }}
            >
              <option value={NONE}>{t.gear.noPiece}</option>
              {slotPieces(slot, language).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name[language]}
                </option>
              ))}
            </Row>
          )
        })}
      </div>

      <div className={styles.total}>
        <div className={styles.totalLine}>
          <span className={styles.totalName}>
            <span className={styles.totalLabel}>{t.gear.armor}</span>
            <span className={styles.totalValue}>{n(typed ? gear.armor : summary.armor)}</span>
          </span>
          {summary.parts.length > 0 && (
            <span className={styles.parts}>{t.gear.armorParts(summary.parts)}</span>
          )}
        </div>
        {typed && <p className={styles.note}>{t.gear.typedArmor}</p>}
        <Resistances modifiers={summary.modifiers} />
        {summary.sets.map((set) => (
          <SetBlock key={set.id} set={set} />
        ))}
      </div>
    </section>
  )
}

/** The trinket, the power and the drinks one carries, each with how long it lasts and what it changes:
 * none counts until switched on, on a creature's sheet or in the Simulation. */
function CarriedSection({
  carried,
  onCarry,
}: {
  readonly carried: Carried
  readonly onCarry: (carried: Carried) => void
}) {
  const t = useT()
  const headingId = useId()
  // A drink row picked nothing yet: the first while none is carried, then one at a time on demand.
  const [adding, setAdding] = useState(false)
  const drinks = carriable('consumable')
  const rows = [...carried.drinks, ...(adding || carried.drinks.length === 0 ? [NONE] : [])]
  const canAdd = !rows.includes(NONE) && carried.drinks.length < drinks.length

  // The row past the drinks carried adds one; « Aucune » on another takes its drink off.
  const drinkAt = (index: number, id: string) => {
    if (index >= carried.drinks.length) {
      if (id === NONE) return
      setAdding(false)
      onCarry({ ...carried, drinks: [...carried.drinks, id] })
    } else {
      onCarry({
        ...carried,
        drinks:
          id === NONE
            ? carried.drinks.filter((_, at) => at !== index)
            : carried.drinks.map((drink, at) => (at === index ? id : drink)),
      })
    }
  }

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.label}>
        {t.gear.carry}
      </h3>
      <div className={styles.rows}>
        <CarriedRow
          label={t.effects.kinds.trinket}
          value={carried.trinket ?? NONE}
          none={t.gear.noTrinket}
          options={carriable('trinket')}
          onSelect={(id) => {
            onCarry({ ...carried, trinket: id === NONE ? null : id })
          }}
        />
        <CarriedRow
          label={t.effects.kinds.power}
          value={carried.power ?? NONE}
          none={t.gear.noPower}
          options={carriable('power')}
          onSelect={(id) => {
            onCarry({ ...carried, power: id === NONE ? null : id })
          }}
        />
        {rows.map((drink, index) => (
          <CarriedRow
            key={drink === NONE ? 'new' : drink}
            label={t.effects.kinds.consumable}
            value={drink}
            none={t.gear.noDrink}
            // A drink once at a time: the others carried are not offered again.
            options={drinks.filter(({ id }) => id === drink || !carried.drinks.includes(id))}
            onSelect={(id) => {
              drinkAt(index, id)
            }}
          />
        ))}
        {canAdd && (
          <button
            type="button"
            className={styles.add}
            onClick={() => {
              setAdding(true)
            }}
          >
            <PlusIcon size={16} />
            {t.gear.addDrink}
          </button>
        )}
      </div>
      <p className={styles.note}>{t.gear.carriedNote}</p>
    </section>
  )
}

/** A row of what one carries: its kind over a list to change it, then how long it lasts and what it
 * changes. */
function CarriedRow({
  label,
  value,
  none,
  options,
  onSelect,
}: {
  readonly label: string
  readonly value: string
  readonly none: string
  readonly options: readonly CarriedEffect[]
  readonly onSelect: (id: string) => void
}) {
  const language = useLanguage()
  const wording = useEffectWording()
  const id = useId()
  return (
    <div className={styles.carriedRow}>
      <span className={styles.rowMain}>
        <label htmlFor={id} className={styles.rowLabel}>
          {label}
        </label>
        <select
          id={id}
          value={value}
          className={styles.selectInput}
          onChange={(event) => {
            onSelect(event.target.value)
          }}
        >
          <option value={NONE}>{none}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name[language]}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={14} className={styles.chevron} />
      </span>
      {value !== NONE && (
        <span className={styles.effectLines}>
          {wording.lines(effectOf(value)).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      )}
    </div>
  )
}

/** One chip per damage type, the game's names: a weakness stands out, a resistance recedes. */
function Resistances({
  modifiers,
}: {
  readonly modifiers: ReturnType<typeof summarize>['modifiers']
}) {
  const t = useT()
  const language = useLanguage()
  const shown = DAMAGE_TYPES.flatMap((type) => {
    const modifier = modifiers[type]
    return modifier === undefined || modifier === 'normal' || modifier === 'ignore'
      ? []
      : [{ type, modifier, multiplier: damageMultiplier(modifier) }]
  })
  if (shown.length === 0) return null
  return (
    <ul aria-label={t.gear.resistances} className={styles.chips}>
      {shown.map(({ type, modifier, multiplier }) => (
        <li
          key={type}
          className={`${styles.chip ?? ''} ${multiplier > 1 ? (styles.weak ?? '') : ''}`}
        >
          <DamageTypeIcon type={type} className={styles.chipIcon} />
          {t.creature.modifier(
            game.damageTypes[type][language],
            game.modifiers[modifier][language],
            multiplier,
          )}
        </li>
      ))}
    </ul>
  )
}

/** A set worn whole, by its name in the game, and what it changes. */
function SetBlock({ set }: { readonly set: GameRuleEffect }) {
  const t = useT()
  const language = useLanguage()
  const byMultiplier = new Map<number, string[]>()
  for (const type of DAMAGE_TYPES) {
    const modifier = set.modifiers?.[type]
    if (modifier === undefined || modifier === 'normal' || modifier === 'ignore') continue
    const multiplier = damageMultiplier(modifier)
    byMultiplier.set(multiplier, [
      ...(byMultiplier.get(multiplier) ?? []),
      game.damageTypes[type][language],
    ])
  }
  const changes = [
    ...[...byMultiplier].map(([multiplier, types]) => t.gear.setModifier(types, multiplier)),
    ...(set.dodgeStaminaModifier ? [t.gear.dodgeCost(-set.dodgeStaminaModifier * 100)] : []),
  ]
  return (
    <div role="group" aria-label={t.gear.fullSet} className={styles.set}>
      <span className={styles.setLabel}>{t.gear.fullSet}</span>
      <span className={styles.setName}>{set.name[language]}</span>
      {changes.map((change) => (
        <span key={change} className={styles.setChange}>
          {change}
        </span>
      ))}
    </div>
  )
}

/** A row of what Your gear holds: its name over a list to change it, its level on the right. */
function Row({
  label,
  value,
  onSelect,
  level,
  max,
  onLevel,
  children,
}: {
  readonly label: string
  readonly value: string
  readonly onSelect: (id: string) => void
  /** Null when the row holds nothing. */
  readonly level: number | null
  readonly max: number
  readonly onLevel: (level: number) => void
  readonly children: ReactNode
}) {
  const t = useT()
  const id = useId()
  return (
    <div className={styles.row}>
      <span className={styles.rowMain}>
        <label htmlFor={id} className={styles.rowLabel}>
          {label}
        </label>
        <span className={styles.rowSelect}>
          <select
            id={id}
            value={value}
            className={styles.selectInput}
            onChange={(event) => {
              onSelect(event.target.value)
            }}
          >
            {children}
          </select>
          <ChevronDownIcon size={14} className={styles.chevron} />
        </span>
      </span>
      <span role="group" aria-label={t.gear.levelOf(label, level)} className={styles.stepper}>
        <button
          type="button"
          aria-label={t.gear.lowerLevelOf(label)}
          disabled={level === null || level <= 1}
          className={styles.step}
          onClick={() => {
            if (level !== null) onLevel(level - 1)
          }}
        >
          <MinusIcon size={14} />
        </button>
        <span className={styles.stepValue}>{level === null ? '—' : t.gear.levelValue(level)}</span>
        <button
          type="button"
          aria-label={t.gear.raiseLevelOf(label)}
          disabled={level === null || level >= max}
          className={styles.step}
          onClick={() => {
            if (level !== null) onLevel(level + 1)
          }}
        >
          <PlusIcon size={14} />
        </button>
      </span>
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
