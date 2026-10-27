import { useState } from 'react'
import { APP_NAME } from '@/app/brand'
import type { Screen } from '@/app/routes'
import { useT } from '@/i18n/useT'
import { BugIcon, ReloadIcon, ShieldIcon } from '@/ui/icons'
import styles from './Crash.module.css'
import type { Crash, ReportOrigin } from './model'
import { ReportSheet } from './ReportSheet'
import { useOpenReport } from './useReport'

/** In place of a creature sheet or a screen that failed while drawing: it says which, that the rest of
 * the app works; try it again, or report it. */
export function CrashCard({
  title,
  note,
  onRetry,
  onReport,
}: {
  readonly title: string
  readonly note: string
  readonly onRetry: () => void
  readonly onReport: () => void
}) {
  const t = useT()
  return (
    <div className={styles.crash}>
      <div className={styles.card}>
        <BugIcon size={28} className={styles.icon} />
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.note}>{note}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onRetry}>
            <ReloadIcon size={18} strokeWidth={2} />
            {t.crash.retry}
          </button>
          <button type="button" className={styles.secondary} onClick={onReport}>
            {t.crash.send}
          </button>
        </div>
      </div>
      <p className={styles.trust}>{t.crash.trust}</p>
    </div>
  )
}

/** In place of a screen that failed while drawing, between the bars, which stay: the other screens work. */
export function ScreenCrash({
  screen,
  crash,
  onRetry,
}: {
  readonly screen: Screen
  readonly crash: Crash
  readonly onRetry: () => void
}) {
  const t = useT()
  const openReport = useOpenReport()
  const { title, note } = t.crash.screens[screen]
  return (
    <main className={styles.screen}>
      <h1 className={styles.screenTitle}>{t.screens[screen]}</h1>
      <CrashCard
        title={title}
        note={note}
        onRetry={onRetry}
        onReport={() => {
          openReport({
            screen,
            kind: 'bug',
            heading: null,
            title: t.screens[screen],
            subject: null,
            ids: {},
            shows: [],
            lines: [],
            crash,
          })
        }}
      />
    </main>
  )
}

/** In place of a row of a list that failed while drawing, at its height: its name, that it crashed, and a
 * way to report it; the other rows stay. */
export function BrokenRow({
  name,
  onReport,
  className,
}: {
  readonly name: string
  readonly onReport: () => void
  readonly className?: string | undefined
}) {
  const t = useT()
  return (
    <div className={`${styles.row ?? ''} ${className ?? ''}`}>
      <BugIcon size={16} className={styles.icon} />
      <span className={styles.rowText}>
        <span className={styles.rowName}>{name}</span>
        <span className={styles.rowNote}>{t.crash.row}</span>
      </span>
      <button type="button" className={styles.rowReport} onClick={onReport}>
        {t.crash.report}
      </button>
    </div>
  )
}

/** The page of last resort, when what draws every screen failed: reload, or report it in the same sheet
 * as any report. */
export function AppCrash({ crash }: { readonly crash: Crash }) {
  const t = useT()
  const [reporting, setReporting] = useState(false)
  const origin: ReportOrigin = {
    screen: 'app',
    kind: 'bug',
    heading: null,
    title: null,
    subject: null,
    ids: {},
    shows: [],
    lines: [],
    crash,
  }
  return (
    <main className={styles.page}>
      <span className={styles.brand}>
        <ShieldIcon size={20} className={styles.shield} />
        {APP_NAME}
      </span>
      <div className={styles.column}>
        <BugIcon size={32} className={styles.icon} />
        <h1 className={styles.pageTitle}>{t.crash.appTitle}</h1>
        <p className={styles.note}>{t.crash.appNote}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              window.location.reload()
            }}
          >
            <ReloadIcon size={18} strokeWidth={2} />
            {t.crash.reload}
          </button>
          <button
            type="button"
            className={styles.outlined}
            onClick={() => {
              setReporting(true)
            }}
          >
            {t.crash.send}
          </button>
        </div>
        <p className={styles.trust}>{t.crash.trust}</p>
      </div>
      {reporting && (
        <ReportSheet
          origin={origin}
          onClose={() => {
            setReporting(false)
          }}
        />
      )}
    </main>
  )
}
