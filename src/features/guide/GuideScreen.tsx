import { useEffect } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute } from '@/app/useRoute'
import { game } from '@/data'
import { matchRange } from '@/features/bestiary/model'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronRightIcon, CloseIcon, SearchIcon } from '@/ui/icons'
import { guideEn } from './content/en'
import { guideFr } from './content/fr'
import { SHEETS, type GuideSheet, type SheetId } from './sheets'
import styles from './GuideScreen.module.css'

const holds = (sheet: GuideSheet, query: string) =>
  [sheet.title, sheet.fact, ...sheet.items].some((text) => matchRange(text, query) !== null)

const anchor = (id: SheetId) => `guide-${id}`

/** The rules of combat, a sheet each, searchable: folded on a phone, all open beside a table of
 * contents on a desktop. The address names the sheet read (`#/guide/roll`). */
export function GuideScreen({ route }: { readonly route: Route }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const sheets = language === 'fr' ? guideFr : guideEn
  const searching = route.query.trim() !== ''
  const found = searching ? sheets.filter((sheet) => holds(sheet, route.query)) : sheets
  const named = SHEETS.find((id) => id === route.path[0]) ?? null
  const current = named ?? found[0]?.id ?? null

  // A sheet picked in the table of contents comes into view.
  useEffect(() => {
    if (isDesktop && named)
      document.getElementById(anchor(named))?.scrollIntoView({ block: 'start' })
  }, [isDesktop, named])

  const search = <SearchField route={route} />
  const empty = found.length === 0 && <p className={styles.empty}>{t.guide.noMatch(route.query)}</p>

  if (isDesktop) {
    return (
      <main className={styles.desktop}>
        <div className={styles.pageHeader}>
          <div className={styles.titles}>
            <h1 className={styles.pageTitle}>{t.screens.guide}</h1>
            <p className={styles.intro}>
              {t.guide.intro(game.game.version ?? String(game.game.build))}
            </p>
          </div>
          {search}
        </div>
        <div className={styles.split}>
          <nav aria-label={t.guide.contents} className={styles.contents}>
            {found.map((sheet) => (
              <RouteLink
                key={sheet.id}
                to={{ ...route, path: [sheet.id] }}
                how="replace"
                aria-current={sheet.id === current ? 'true' : undefined}
                className={styles.entry}
              >
                <span className={styles.entryTitle}>{sheet.title}</span>
                <span className={styles.fact}>{sheet.fact}</span>
              </RouteLink>
            ))}
          </nav>
          <section aria-label={t.guide.rules} className={styles.sheets}>
            {empty}
            <div className={styles.grid}>
              {found.map((sheet) => (
                <section
                  key={sheet.id}
                  id={anchor(sheet.id)}
                  aria-labelledby={`${anchor(sheet.id)}-title`}
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <h2 id={`${anchor(sheet.id)}-title`} className={styles.cardTitle}>
                      {sheet.title}
                    </h2>
                    <span className={styles.fact}>{sheet.fact}</span>
                  </div>
                  <ul className={styles.items}>
                    {sheet.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.guide}</h1>
      {search}
      <section aria-label={t.guide.rules} className={styles.folds}>
        {empty}
        {found.map((sheet) => (
          <details key={sheet.id} open={searching || sheet.id === current} className={styles.fold}>
            <summary className={styles.summary}>
              <ChevronRightIcon size={18} className={styles.chevron} />
              <span className={styles.foldTitle}>{sheet.title}</span>
              <span className={styles.fact}>{sheet.fact}</span>
            </summary>
            <ul className={styles.foldItems}>
              {sheet.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </main>
  )
}

function SearchField({ route }: { readonly route: Route }) {
  const t = useT()
  const searchFor = (query: string) => {
    replaceRoute({ ...route, path: [], query })
  }
  // A label around the field: the whole box takes a tap, not only the text line.
  return (
    <label className={styles.search}>
      <SearchIcon size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={t.guide.search}
        placeholder={t.guide.searchPlaceholder}
        value={route.query}
        onChange={(event) => {
          searchFor(event.target.value)
        }}
        className={styles.searchInput}
      />
      {route.query !== '' && (
        <button
          type="button"
          aria-label={t.guide.clearSearch}
          className={styles.clear}
          onClick={() => {
            searchFor('')
          }}
        >
          <CloseIcon size={18} />
        </button>
      )}
    </label>
  )
}
