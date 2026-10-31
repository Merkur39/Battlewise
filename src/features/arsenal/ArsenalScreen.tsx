import { useId, useState, type ReactNode } from 'react'
import { CrashBoundary } from '@/app/CrashBoundary'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute } from '@/app/useRoute'
import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier, type DamageModifiers } from '@/combat/modifiers'
import { game } from '@/data'
import type { Localized } from '@/data/types'
import { Highlighted } from '@/features/bestiary/parts'
import { useEffectWording } from '@/features/effects/wording'
import { NOTHING_CARRIED, type CarriedEffect } from '@/features/gear/carried'
import { BrokenRow } from '@/features/report/Crash'
import { orElse, type Crash } from '@/features/report/model'
import { useOpenReport } from '@/features/report/useReport'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { CheckIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '@/ui/icons'
import {
  CATEGORIES,
  categorySize,
  FAMILIES,
  familyOf,
  rowsOf,
  searchArsenal,
  SORTS,
  type ArsenalCategory,
  type ArsenalGear,
  type ArsenalSort,
  type BlockerRow,
  type CategoryRows,
  type EffectRow,
  type PieceRow,
} from './model'
import styles from './ArsenalScreen.module.css'

const categoryOfRoute = (route: Route): ArsenalCategory =>
  CATEGORIES.find((category) => category === route.path[0]) ?? 'shields'

const categoryRoute = (route: Route, category: ArsenalCategory): Route => ({
  ...route,
  path: category === 'shields' ? [] : [category],
  query: '',
  modal: null,
})

/** What opens Your gear with an item, held, worn or carried, to save there. */
type Open = (id: string) => Route

/**
 * Everything Your gear can hold, wear or carry, compared at level 1 and your skill: by family then
 * category on a phone, categories in a column beside a table on a desktop, or what a search finds in
 * every category. Each opens Your gear with it.
 */
export function ArsenalScreen({ route }: { readonly route: Route }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const { gear } = useAppState()
  const category = categoryOfRoute(route)
  const [sort, setSort] = useState<ArsenalSort>('power')
  const owned: ArsenalGear = {
    skill: gear.skill,
    equipped: gear.blocker,
    pieces: gear.pieces ?? {},
    carried: gear.carried ?? NOTHING_CARRIED,
  }
  const sorted = isDesktop ? sort : 'power'
  const searching = route.query.trim() !== ''
  const found = searchArsenal(route.query, language, owned, sorted)
  const shown = rowsOf(category, owned, language, sorted)
  const open: Open = (id) => ({ ...route, modal: 'gear', equip: { item: id } })
  const search = (query: string) => {
    replaceRoute({ ...route, query })
  }
  const nothing = <p className={styles.note}>{t.arsenal.nothingFound(route.query.trim())}</p>

  if (isDesktop) {
    const hits = (option: ArsenalCategory) =>
      found.find((group) => group.category === option)?.rows.length ?? 0
    return (
      <main className={styles.desktop}>
        <nav aria-label={t.arsenal.nav} className={styles.aside}>
          <SearchField query={route.query} onSearch={search} compact />
          {FAMILIES.map((family) => (
            <div
              key={family.id}
              role="group"
              aria-label={t.arsenal.families[family.id]}
              className={styles.navGroup}
            >
              <span aria-hidden="true" className={styles.navCaption}>
                {t.arsenal.families[family.id]}
              </span>
              {family.categories.map((option) => {
                const count = searching ? hits(option) : categorySize(option)
                return (
                  <RouteLink
                    key={option}
                    to={categoryRoute(route, option)}
                    how="replace"
                    aria-current={!searching && option === category ? 'true' : undefined}
                    className={`${styles.navItem ?? ''} ${searching && count === 0 ? (styles.navNone ?? '') : ''}`}
                  >
                    <span className={styles.navLabel}>{t.arsenal.categories[option]}</span>
                    <span className={styles.navCount}>{formatNumber(count, language)}</span>
                  </RouteLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{t.screens.arsenal}</h1>
            <p className={styles.intro}>
              {searching ? (
                found.length > 0 && (
                  <>
                    {t.arsenal.foundFor(
                      found.reduce((sum, group) => sum + group.rows.length, 0),
                      route.query.trim(),
                      found.length,
                    )}{' '}
                    {t.arsenal.atLevelOne} <Skill skill={gear.skill} />.
                  </>
                )
              ) : (
                <Lede category={category} skill={gear.skill} />
              )}
            </p>
          </div>
          {searching ? (
            found.length > 0 ? (
              <div className={styles.results}>
                {found.map((group) => (
                  <section
                    key={group.category}
                    aria-labelledby={`${group.category}-found`}
                    className={styles.group}
                  >
                    <GroupHead group={group} id={`${group.category}-found`} />
                    <CategoryTable found={group} query={route.query} sort={sorted} open={open} />
                  </section>
                ))}
              </div>
            ) : (
              nothing
            )
          ) : (
            <>
              {shown.kind === 'blocker' && <SortPicker sort={sort} onChange={setSort} />}
              <CategoryTable found={shown} query="" sort={sorted} open={open} scrolls />
            </>
          )}
        </div>
      </main>
    )
  }

  const family = FAMILIES.find(({ id }) => id === familyOf(category)) ?? FAMILIES[0]
  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.arsenal}</h1>
      <SearchField query={route.query} onSearch={search} />
      {searching ? (
        found.length > 0 ? (
          <>
            <p className={styles.count}>
              {t.arsenal.found(
                found.reduce((sum, group) => sum + group.rows.length, 0),
                found.length,
              )}
            </p>
            <div className={styles.results}>
              {found.map((group) => (
                <section
                  key={group.category}
                  aria-labelledby={`${group.category}-found`}
                  className={styles.group}
                >
                  <GroupHead group={group} id={`${group.category}-found`} />
                  <Cards found={group} query={route.query} open={open} limit={3} />
                  {group.rows.length > 3 && (
                    <RouteLink
                      to={categoryRoute(route, group.category)}
                      how="replace"
                      className={styles.seeAll}
                    >
                      {t.arsenal.seeAll(group.rows.length, t.arsenal.categories[group.category])}
                    </RouteLink>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          nothing
        )
      ) : (
        <>
          <div role="group" aria-label={t.arsenal.family} className={styles.segments}>
            {FAMILIES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === family.id}
                className={styles.segment}
                onClick={() => {
                  replaceRoute(categoryRoute(route, option.categories[0]))
                }}
              >
                {t.arsenal.familiesShort[option.id]}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t.arsenal.category} className={styles.pills}>
            {family.categories.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === category}
                className={styles.pill}
                onClick={() => {
                  replaceRoute(categoryRoute(route, option))
                }}
              >
                {t.arsenal.categories[option]}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            <Cards found={shown} query="" open={open} />
          </div>
        </>
      )}
    </main>
  )
}

function Skill({ skill }: { readonly skill: number }) {
  const language = useLanguage()
  return <span className={styles.skill}>{formatNumber(skill, language)}</span>
}

/** What the figures of a family are worked out with, and what picking a row does. */
function Lede({ category, skill }: { readonly category: ArsenalCategory; readonly skill: number }) {
  const t = useT()
  const family = familyOf(category)
  if (family === 'hand')
    return (
      <>
        {t.arsenal.atLevelOne} <Skill skill={skill} />
        {t.arsenal.pickLevel.hand}
      </>
    )
  return family === 'armor' ? t.arsenal.pickLevel.armor : t.arsenal.carryLede
}

function SearchField({
  query,
  onSearch,
  compact = false,
}: {
  readonly query: string
  readonly onSearch: (query: string) => void
  readonly compact?: boolean
}) {
  const t = useT()
  // A label around the field: the whole box takes a tap, not only the text line.
  return (
    <label className={`${styles.search ?? ''} ${compact ? (styles.compact ?? '') : ''}`}>
      <SearchIcon size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={t.arsenal.search}
        placeholder={compact ? t.arsenal.searchPlaceholderShort : t.arsenal.searchPlaceholder}
        value={query}
        onChange={(event) => {
          onSearch(event.target.value)
        }}
        className={styles.searchInput}
      />
      {query !== '' && (
        <button
          type="button"
          aria-label={t.arsenal.clearSearch}
          className={styles.clear}
          onClick={() => {
            onSearch('')
          }}
        >
          <CloseIcon size={compact ? 16 : 18} />
        </button>
      )}
    </label>
  )
}

/** A category the search found something in: its name and count, then its family. */
function GroupHead({ group, id }: { readonly group: CategoryRows; readonly id: string }) {
  const t = useT()
  return (
    <div className={styles.groupHead}>
      <h2 id={id} className={styles.groupTitle}>
        {t.arsenal.categories[group.category]} · {group.rows.length}
      </h2>
      <span className={styles.groupFamily}>{t.arsenal.families[familyOf(group.category)]}</span>
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
    <div className={styles.toolbar}>
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

// ---- What every row shows, on a phone and on a desktop. ----

type AnyRow = BlockerRow | PieceRow | EffectRow

const nameOf = (row: AnyRow): Localized =>
  'blocker' in row ? row.blocker.name : 'piece' in row ? row.piece.name : row.effect.name

const stateOf = (row: AnyRow) =>
  'carried' in row ? (row.carried ? 'carried' : null) : row.equipped ? 'equipped' : null

/** A row of the Arsenal that failed while drawing: its item, and a way to report it; the others stay. */
function BrokenItemRow({
  row,
  crash,
  className,
}: {
  readonly row: AnyRow
  readonly crash: Crash
  readonly className: string | undefined
}) {
  const language = useLanguage()
  const openReport = useOpenReport()
  const name = orElse(() => nameOf(row)[language], row.id)
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
          subject: orElse(() => nameOf(row).en, row.id),
          ids: {},
          shows: [],
          lines: [],
          crash,
        })
      }}
    />
  )
}

/** The figures of what blocks: its block power, and its parry or why it has none. */
function useBlockerText(row: BlockerRow) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  const { group } = row.blocker
  return {
    type:
      group === 'weapon' || group === 'other' || group === 'unarmed'
        ? null
        : t.gear.groupTags[group],
    power: n(row.power),
    parry: row.parry === null ? '—' : n(row.parry),
    parryNote: row.parry === null ? t.gear.noParry : t.gear.parryBonus(row.blocker.timedBlockBonus),
  }
}

const capitalised = (text: string) => `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`

/** What an effect changes, a change a line, each starting with a capital. */
function useEffectText(effect: CarriedEffect) {
  const t = useT()
  const wording = useEffectWording()
  const duration = effect.ttl === undefined ? '' : t.effects.duration(effect.ttl)
  const extra =
    effect.adrenaline !== undefined
      ? t.arsenal.trigger(effect.adrenaline)
      : effect.cooldown !== undefined
        ? t.arsenal.cooldown(t.effects.duration(effect.cooldown))
        : null
  return {
    duration,
    extra,
    // The column says what it is: « 20 min », « dès 65 d'adrénaline ».
    column:
      effect.cooldown !== undefined && effect.adrenaline === undefined
        ? t.effects.duration(effect.cooldown)
        : extra,
    changes: wording.changes(effect).map(capitalised),
  }
}

/** A piece's set, when its bonus changes a fight: its name, its size, what it changes. */
function usePieceText(row: PieceRow) {
  const t = useT()
  const language = useLanguage()
  const wording = useEffectWording()
  return {
    armor: formatNumber(row.armor, language),
    perLevel: t.arsenal.perLevel(row.perLevel),
    set: row.set && {
      name: row.set.name[language],
      size: row.set.set?.size ?? 0,
      changes: wording.changes(row.set).join(' · '),
    },
    dodge: row.piece.dodgeStaminaModifier
      ? t.gear.dodgeCost(-row.piece.dodgeStaminaModifier * 100)
      : null,
  }
}

function Tag({
  children,
  owned = false,
}: {
  readonly children: ReactNode
  readonly owned?: boolean
}) {
  return <span className={owned ? styles.ownedTag : styles.tag}>{children}</span>
}

/** One chip per damage type, in the game's words: a weakness outlined. */
function Chips({ modifiers }: { readonly modifiers: DamageModifiers }) {
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
    <ul aria-label={t.arsenal.columns.resistances} className={styles.chips}>
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

// ---- Phone: a card per row. ----

function Cards({
  found,
  query,
  open,
  limit = Infinity,
}: {
  readonly found: CategoryRows
  readonly query: string
  readonly open: Open
  readonly limit?: number
}) {
  const t = useT()
  const rows: readonly AnyRow[] = found.rows.slice(0, limit)
  return (
    <ul aria-label={t.arsenal.categories[found.category]} className={styles.cards}>
      {rows.map((row) => (
        <li key={row.id}>
          <CrashBoundary
            fallback={(crash) => (
              <BrokenItemRow row={row} crash={crash} className={styles.brokenCard} />
            )}
          >
            <Card row={row} query={query} to={open(row.id)} />
          </CrashBoundary>
        </li>
      ))}
    </ul>
  )
}

function Card({
  row,
  query,
  to,
}: {
  readonly row: AnyRow
  readonly query: string
  readonly to: Route
}) {
  const t = useT()
  const language = useLanguage()
  const name = nameOf(row)[language]
  const state = stateOf(row)
  return (
    <RouteLink
      to={to}
      aria-label={t.arsenal.rowLabel(name, state)}
      className={`${styles.card ?? ''} ${state ? (styles.owned ?? '') : ''}`}
    >
      <span className={styles.cardTop}>
        <span className={styles.cardName}>
          <Highlighted text={name} query={query} />
        </span>
        {'blocker' in row && <BlockerType row={row} />}
        {state && <Tag owned>{state === 'carried' ? t.arsenal.carried : t.arsenal.equipped}</Tag>}
        <span className={styles.spacer} />
        <ChevronRightIcon size={16} className={styles.chevron} />
      </span>
      {'blocker' in row ? (
        <BlockerFigures row={row} />
      ) : 'piece' in row ? (
        <PieceFigures row={row} />
      ) : (
        <EffectFigures effect={row.effect} />
      )}
    </RouteLink>
  )
}

function BlockerType({ row }: { readonly row: BlockerRow }) {
  const text = useBlockerText(row)
  return text.type && <Tag>{text.type}</Tag>
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

function BlockerFigures({ row }: { readonly row: BlockerRow }) {
  const t = useT()
  const text = useBlockerText(row)
  return (
    <span className={styles.stats}>
      <Stat label={t.arsenal.columns.power} value={text.power} strong />
      <Stat
        label={t.arsenal.columns.parry}
        value={text.parry}
        note={text.parryNote}
        faint={row.parry === null}
      />
    </span>
  )
}

function PieceFigures({ row }: { readonly row: PieceRow }) {
  const t = useT()
  const text = usePieceText(row)
  return (
    <>
      <span className={styles.stats}>
        <Stat label={t.arsenal.columns.armor} value={text.armor} strong />
        <Stat label={t.arsenal.columns.perLevel} value={text.perLevel} />
      </span>
      <Chips modifiers={row.piece.modifiers} />
      {text.set && (
        <span className={styles.line}>
          {t.arsenal.setLine(text.set.name, text.set.size, text.set.changes)}
        </span>
      )}
      {text.dodge && <span className={styles.line}>{text.dodge}</span>}
    </>
  )
}

function EffectFigures({ effect }: { readonly effect: CarriedEffect }) {
  const text = useEffectText(effect)
  return (
    <>
      <span className={styles.when}>
        {[text.duration, text.extra].filter((part) => part !== null && part !== '').join(' · ')}
      </span>
      <span className={styles.changes}>
        {text.changes.map((change) => (
          <span key={change}>{change}</span>
        ))}
      </span>
    </>
  )
}

// ---- Desktop: a table per category. ----

function CategoryTable({
  found,
  query,
  sort,
  open,
  scrolls = false,
}: {
  readonly found: CategoryRows
  readonly query: string
  readonly sort: ArsenalSort
  readonly open: Open
  readonly scrolls?: boolean
}) {
  const t = useT()
  const { category } = found
  const sortedBy = (column: ArsenalSort) => (column === sort ? 'descending' : undefined)
  const head = (label: string, className?: string, sorting?: ArsenalSort) => (
    <th key={label} scope="col" aria-sort={sorting && sortedBy(sorting)} className={className}>
      {label}
      {sorting === sort && <span aria-hidden="true"> ↓</span>}
    </th>
  )
  const columns =
    found.kind === 'blocker'
      ? [
          ...(category === 'shields' ? [head(t.arsenal.columns.type, styles.typeColumn)] : []),
          head(t.arsenal.columns.power, styles.number, 'power'),
          head(t.arsenal.columns.parry, styles.number, 'parry'),
        ]
      : found.kind === 'piece'
        ? [
            <th key="armor" scope="col" aria-sort="descending" className={styles.number}>
              {t.arsenal.columns.armor}
              <span aria-hidden="true"> ↓</span>
            </th>,
            head(t.arsenal.columns.perLevel, styles.number),
            head(t.arsenal.columns.resistances, styles.wide),
            head(t.arsenal.columns.set, styles.wide),
          ]
        : [
            head(t.arsenal.columns.duration, styles.durationColumn),
            ...(found.category === 'drinks'
              ? []
              : [
                  head(
                    found.category === 'powers'
                      ? t.arsenal.columns.cooldown
                      : t.arsenal.columns.trigger,
                  ),
                ]),
            head(t.arsenal.changes[found.category], styles.wide),
          ]
  const rows: readonly AnyRow[] = found.rows
  return (
    <div className={`${styles.tableBox ?? ''} ${scrolls ? (styles.scrolls ?? '') : ''}`}>
      <table aria-label={t.arsenal.categories[category]} className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.nameColumn}>
              {t.arsenal.item[category]}
            </th>
            {columns}
            <th scope="col" className={styles.actionColumn}>
              <span className="visually-hidden">{t.arsenal.columns.action}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CrashBoundary
              key={row.id}
              fallback={(crash) => (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <BrokenItemRow row={row} crash={crash} className={styles.brokenRow} />
                  </td>
                </tr>
              )}
            >
              <TableRow
                row={row}
                query={query}
                shields={category === 'shields'}
                to={open(row.id)}
              />
            </CrashBoundary>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({
  row,
  query,
  shields,
  to,
}: {
  readonly row: AnyRow
  readonly query: string
  readonly shields: boolean
  readonly to: Route
}) {
  const t = useT()
  const language = useLanguage()
  const name = nameOf(row)[language]
  const state = stateOf(row)
  const carries = 'effect' in row
  return (
    <tr className={state ? styles.owned : undefined}>
      <th scope="row" className={styles.nameCell}>
        <Highlighted text={name} query={query} />
        {state && <Tag owned>{state === 'carried' ? t.arsenal.carried : t.arsenal.equipped}</Tag>}
      </th>
      {'blocker' in row ? (
        <BlockerCells row={row} shields={shields} />
      ) : 'piece' in row ? (
        <PieceCells row={row} />
      ) : (
        <EffectCells row={row} />
      )}
      <td className={styles.actionCell}>
        {state ? (
          <span className={styles.ownedAction}>
            <CheckIcon size={16} strokeWidth={2} />
            {state === 'carried' ? t.arsenal.carried : t.arsenal.equipped}
          </span>
        ) : (
          <RouteLink
            to={to}
            aria-label={carries ? t.arsenal.carryLabel(name) : t.arsenal.equipLabel(name)}
            className={styles.action}
          >
            {carries ? t.arsenal.carry : t.arsenal.equip}
          </RouteLink>
        )}
      </td>
    </tr>
  )
}

function BlockerCells({ row, shields }: { readonly row: BlockerRow; readonly shields: boolean }) {
  const text = useBlockerText(row)
  return (
    <>
      {shields && <td className={styles.typeCell}>{text.type}</td>}
      <td className={styles.powerCell}>{text.power}</td>
      <td
        className={`${styles.numberCell ?? ''} ${row.parry === null ? (styles.faint ?? '') : ''}`}
      >
        {text.parry} <span className={styles.cellNote}>{text.parryNote}</span>
      </td>
    </>
  )
}

function PieceCells({ row }: { readonly row: PieceRow }) {
  const t = useT()
  const text = usePieceText(row)
  const chips = <Chips modifiers={row.piece.modifiers} />
  return (
    <>
      <td className={styles.powerCell}>{text.armor}</td>
      <td className={styles.numberCell}>{text.perLevel}</td>
      <td className={styles.listCell}>
        {Object.keys(row.piece.modifiers).length > 0 ? (
          chips
        ) : (
          <span className={styles.faint}>—</span>
        )}
        {text.dodge && <span className={styles.line}>{text.dodge}</span>}
      </td>
      <td className={styles.listCell}>
        {text.set ? (
          <>
            {text.set.name}{' '}
            <span className={styles.faint}>· {t.arsenal.setSize(text.set.size)}</span>
            <span className={styles.line}>{capitalised(text.set.changes)}</span>
          </>
        ) : (
          <span className={styles.faint}>—</span>
        )}
      </td>
    </>
  )
}

function EffectCells({ row }: { readonly row: EffectRow }) {
  const text = useEffectText(row.effect)
  return (
    <>
      <td className={styles.monoCell}>{text.duration}</td>
      {row.effect.kind !== 'consumable' && <td className={styles.monoCell}>{text.column}</td>}
      <td className={styles.listCell}>
        <span className={styles.changes}>
          {text.changes.map((change) => (
            <span key={change}>{change}</span>
          ))}
        </span>
      </td>
    </>
  )
}
