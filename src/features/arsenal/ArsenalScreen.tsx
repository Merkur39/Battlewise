import { useId, useState } from 'react'
import { CrashBoundary } from '@/app/CrashBoundary'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute } from '@/app/useRoute'
import type { GameBlocker } from '@/data/types'
import { FORGE_MAX_LEVEL } from '@/features/gear/model'
import { BrokenRow } from '@/features/report/Crash'
import { orElse, type Crash } from '@/features/report/model'
import { useOpenReport } from '@/features/report/useReport'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { CheckIcon, ChevronRightIcon, MinusIcon, PlusIcon } from '@/ui/icons'
import {
  arsenalRows,
  CATEGORIES,
  SORTS,
  type ArsenalCategory,
  type ArsenalRow,
  type ArsenalSort,
} from './model'
import styles from './ArsenalScreen.module.css'

const categoryOfRoute = (route: Route): ArsenalCategory =>
  CATEGORIES.find((category) => category === route.path[0]) ?? 'shields'

/** Shields, weapons and the rest, compared at your skill and an upgrade level: cards on a phone, a
 * table on a desktop. Each opens Your gear with it, to save there. */
export function ArsenalScreen({ route }: { readonly route: Route }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const { gear } = useAppState()
  const category = categoryOfRoute(route)
  const [level, setLevel] = useState(gear.level)
  const [sort, setSort] = useState<ArsenalSort>('power')
  const rows = arsenalRows(category, {
    level,
    skill: gear.skill,
    equipped: gear.blocker,
    sort: isDesktop ? sort : 'power',
  })
  const equip = (row: ArsenalRow): Route => ({
    ...route,
    modal: 'gear',
    equip: { item: row.blocker.id, level: row.level },
  })

  const categorySwitch = (
    <div role="group" aria-label={t.arsenal.category} className={styles.segments}>
      {CATEGORIES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === category}
          className={styles.segment}
          onClick={() => {
            replaceRoute({ ...route, path: option === 'shields' ? [] : [option] })
          }}
        >
          {t.arsenal.categories[option]}
        </button>
      ))}
    </div>
  )
  const skill = <span className={styles.skill}>{formatNumber(gear.skill, language)}</span>
  const stepper = <LevelStepper level={level} onChange={setLevel} />

  if (isDesktop) {
    return (
      <main className={styles.desktop}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{t.screens.arsenal}</h1>
          <p className={styles.intro}>
            {t.arsenal.intro} {skill}
            {t.arsenal.atLevel}
          </p>
        </div>
        <div className={styles.toolbar}>
          {categorySwitch}
          <span className={styles.spacer} />
          {stepper}
          <SortPicker sort={sort} onChange={setSort} />
        </div>
        <ArsenalTable category={category} rows={rows} level={level} sort={sort} equip={equip} />
      </main>
    )
  }

  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.arsenal}</h1>
      {categorySwitch}
      <div className={styles.phoneToolbar}>
        <span className={styles.phoneIntro}>
          <span>
            {t.arsenal.intro} {skill}
          </span>
          <span className={styles.faint}>{t.arsenal.sortedByPower}</span>
        </span>
        {stepper}
      </div>
      <ul aria-label={t.arsenal.categories[category]} className={styles.cards}>
        {rows.map((row) => (
          <li key={row.blocker.id}>
            <CrashBoundary
              fallback={(crash) => (
                <BrokenBlockerRow
                  blocker={row.blocker}
                  crash={crash}
                  className={styles.brokenCard}
                />
              )}
            >
              <ArsenalCard category={category} row={row} level={level} to={equip(row)} />
            </CrashBoundary>
          </li>
        ))}
      </ul>
    </main>
  )
}

/** A row of the Arsenal that failed while drawing: its item, and a way to report it; the others stay. */
function BrokenBlockerRow({
  blocker,
  crash,
  className,
}: {
  readonly blocker: GameBlocker
  readonly crash: Crash
  readonly className: string | undefined
}) {
  const language = useLanguage()
  const openReport = useOpenReport()
  const name = orElse(() => blocker.name[language], blocker.id)
  return (
    <BrokenRow
      name={name}
      className={className}
      onReport={() => {
        openReport({
          screen: 'arsenal',
          kind: 'bug',
          heading: name,
          title: name,
          subject: orElse(() => blocker.name.en, blocker.id),
          ids: {},
          shows: [],
          lines: [],
          crash,
        })
      }}
    />
  )
}

function LevelStepper({
  level,
  onChange,
}: {
  readonly level: number
  readonly onChange: (level: number) => void
}) {
  const t = useT()
  const labelId = useId()
  return (
    <div className={styles.level}>
      <span id={labelId} className={styles.label}>
        {t.arsenal.level}
      </span>
      <div role="group" aria-label={t.arsenal.levelGroup} className={styles.stepper}>
        <button
          type="button"
          aria-label={t.gear.lowerLevel}
          disabled={level <= 1}
          className={styles.step}
          onClick={() => {
            onChange(level - 1)
          }}
        >
          <MinusIcon size={18} />
        </button>
        <span className={styles.levelValue}>{t.arsenal.levelValue(level)}</span>
        <button
          type="button"
          aria-label={t.gear.raiseLevel}
          disabled={level >= FORGE_MAX_LEVEL}
          className={styles.step}
          onClick={() => {
            onChange(level + 1)
          }}
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </div>
  )
}

function SortPicker({
  sort,
  onChange,
}: {
  readonly sort: ArsenalSort
  readonly onChange: (sort: ArsenalSort) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div className={styles.level}>
      <label htmlFor={id} className={styles.label}>
        {t.arsenal.sort}
      </label>
      <select
        id={id}
        value={sort}
        className={styles.sort}
        onChange={(event) => {
          onChange(SORTS.find((option) => option === event.target.value) ?? 'power')
        }}
      >
        {SORTS.map((option) => (
          <option key={option} value={option}>
            {t.arsenal.columns[option]}
          </option>
        ))}
      </select>
    </div>
  )
}

/** The figures of a row, as both layouts write them; `picked` is the level picked, which a row stops
 * below at its own max. */
function useRowText(category: ArsenalCategory, row: ArsenalRow, picked: number) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  const group = row.blocker.group
  return {
    name: row.blocker.name[language],
    type:
      category === 'shields' && group !== 'weapon' && group !== 'other' && group !== 'unarmed'
        ? t.gear.groupTags[group]
        : null,
    power: n(row.power),
    stopsAt: row.level < picked ? t.arsenal.stopsAt(row.level) : null,
    parry: row.parry === null ? '—' : n(row.parry),
    parryNote: row.parry === null ? t.gear.noParry : t.gear.parryBonus(row.blocker.timedBlockBonus),
    force: n(row.force),
    speed: t.arsenal.speed(row.speed),
  }
}

function ArsenalCard({
  category,
  row,
  level,
  to,
}: {
  readonly category: ArsenalCategory
  readonly row: ArsenalRow
  readonly level: number
  readonly to: Route
}) {
  const t = useT()
  const text = useRowText(category, row, level)
  return (
    <RouteLink
      to={to}
      aria-label={t.arsenal.rowLabel(text.name, row.equipped)}
      className={`${styles.card ?? ''} ${row.equipped ? (styles.equipped ?? '') : ''}`}
    >
      <span className={styles.cardTop}>
        <span className={styles.cardName}>{text.name}</span>
        {text.type && <span className={styles.tag}>{text.type}</span>}
        {row.equipped && <span className={styles.equippedTag}>{t.arsenal.equipped}</span>}
        <span className={styles.spacer} />
        <ChevronRightIcon size={16} className={styles.chevron} />
      </span>
      <span className={styles.stats}>
        <Stat label={t.arsenal.columns.power} value={text.power} note={text.stopsAt} strong />
        <Stat
          label={t.arsenal.columns.parry}
          value={text.parry}
          note={text.parryNote}
          faint={row.parry === null}
        />
        <Stat label={t.arsenal.columns.force} value={text.force} />
        <Stat label={t.arsenal.columns.speed} value={text.speed} />
      </span>
    </RouteLink>
  )
}

function Stat({
  label,
  value,
  note = null,
  strong = false,
  faint = false,
}: {
  readonly label: string
  readonly value: string
  readonly note?: string | null
  readonly strong?: boolean
  readonly faint?: boolean
}) {
  return (
    <span className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={`${strong ? (styles.statStrong ?? '') : (styles.statValue ?? '')} ${faint ? (styles.faint ?? '') : ''}`}
      >
        {value}
      </span>
      {note && <span className={styles.statNote}>{note}</span>}
    </span>
  )
}

function ArsenalTable({
  category,
  rows,
  level,
  sort,
  equip,
}: {
  readonly category: ArsenalCategory
  readonly rows: readonly ArsenalRow[]
  readonly level: number
  readonly sort: ArsenalSort
  readonly equip: (row: ArsenalRow) => Route
}) {
  const t = useT()
  const shields = category === 'shields'
  const sorted = (column: ArsenalSort) => (column === sort ? 'descending' : undefined)
  return (
    <div className={styles.tableBox}>
      <table aria-label={t.arsenal.categories[category]} className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.nameColumn}>
              {t.arsenal.item[category]}
            </th>
            {shields && <th scope="col">{t.arsenal.columns.type}</th>}
            {SORTS.map((column) => (
              <th key={column} scope="col" aria-sort={sorted(column)} className={styles.number}>
                {t.arsenal.columns[column]}
                {column === sort && <span aria-hidden="true"> ↓</span>}
              </th>
            ))}
            <th scope="col" className={styles.actionColumn}>
              <span className="visually-hidden">{t.arsenal.columns.action}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CrashBoundary
              key={row.blocker.id}
              fallback={(crash) => (
                <tr>
                  <td colSpan={(shields ? 2 : 1) + SORTS.length + 1}>
                    <BrokenBlockerRow
                      blocker={row.blocker}
                      crash={crash}
                      className={styles.brokenRow}
                    />
                  </td>
                </tr>
              )}
            >
              <TableRow category={category} row={row} level={level} to={equip(row)} />
            </CrashBoundary>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({
  category,
  row,
  level,
  to,
}: {
  readonly category: ArsenalCategory
  readonly row: ArsenalRow
  readonly level: number
  readonly to: Route
}) {
  const t = useT()
  const text = useRowText(category, row, level)
  return (
    <tr className={row.equipped ? styles.equipped : undefined}>
      <th scope="row" className={styles.nameCell}>
        {text.name}
        {row.equipped && <span className={styles.equippedTag}>{t.arsenal.equipped}</span>}
      </th>
      {category === 'shields' && <td className={styles.typeCell}>{text.type}</td>}
      <td className={styles.powerCell}>
        {text.power}
        {text.stopsAt && <span className={styles.cellNote}> {text.stopsAt}</span>}
      </td>
      <td
        className={`${styles.numberCell ?? ''} ${row.parry === null ? (styles.faint ?? '') : ''}`}
      >
        {text.parry} <span className={styles.cellNote}>{text.parryNote}</span>
      </td>
      <td className={styles.numberCell}>{text.force}</td>
      <td className={styles.numberCell}>{text.speed}</td>
      <td className={styles.actionCell}>
        {row.equipped ? (
          <span className={styles.equippedAction}>
            <CheckIcon size={16} strokeWidth={2} />
            {t.arsenal.equipped}
          </span>
        ) : (
          <RouteLink to={to} aria-label={t.arsenal.equipLabel(text.name)} className={styles.equip}>
            {t.arsenal.equip}
          </RouteLink>
        )}
      </td>
    </tr>
  )
}
