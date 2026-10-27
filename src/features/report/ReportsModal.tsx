import { useEffect, useReducer } from 'react'
import { SOURCE_URL } from '@/app/brand'
import { RELEASES } from '@/app/releases'
import { closeModal, replaceRoute, useRoute } from '@/app/useRoute'
import type { Language } from '@/i18n/detect'
import { useLanguage, useT } from '@/i18n/useT'
import { BugIcon, CheckIcon, ClockIcon, CloseIcon, FlagIcon, IdeaIcon, OpenIcon } from '@/ui/icons'
import { Modal } from '@/ui/Modal'
import { reportState, type ReportShown } from './loop'
import { stateText } from './wording'
import styles from './Feedback.module.css'
import type { ReportKind } from './model'
import { useIssueStates, useOutbox } from './useReport'

// GitHub lets an address read 60 issues an hour without an account: the most recent are enough.
const READ_AT_MOST = 30

const KIND_ICONS = { data: FlagIcon, bug: BugIcon, idea: IdeaIcon } as const

export function KindIcon({ kind }: { readonly kind: ReportKind }) {
  const Icon = KIND_ICONS[kind]
  return <Icon size={16} strokeWidth={2} className={styles.kind} />
}

function StateIcon({ shown }: { readonly shown: ReportShown }) {
  const props = { size: 13, strokeWidth: 2 }
  switch (shown.kind) {
    case 'waiting':
      return <ClockIcon {...props} />
    case 'fixedIn':
    case 'fixedNext':
      return <CheckIcon {...props} />
    case 'duplicate':
    case 'declined':
      return <CloseIcon {...props} />
    default:
      return <OpenIcon {...props} />
  }
}

const dayOf = (at: string, language: Language) =>
  at === ''
    ? ''
    : new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(at))

/** My reports: the reports sent from this device, newest first, their state read from GitHub when
 * online and kept for offline; those still waiting to leave come first. */
export function ReportsModal() {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const outbox = useOutbox()
  const issues = useIssueStates()
  const [, refreshed] = useReducer((count: number) => count + 1, 0)
  const waiting = outbox.waiting().toReversed()
  const receipts = outbox.receipts().toReversed()
  const numbers = receipts.slice(0, READ_AT_MOST).map((receipt) => receipt.number)
  const key = numbers.join(',')

  useEffect(() => {
    let open = true
    void issues.refresh(key === '' ? [] : key.split(',').map(Number)).then(() => {
      if (open) refreshed()
    })
    return () => {
      open = false
    }
  }, [issues, key])

  const row = (kind: ReportKind, title: string, shown: ReportShown, number: string, at: string) => (
    <>
      <KindIcon kind={kind} />
      <span className={styles.subject}>{title === '' ? t.report.kind[kind] : title}</span>
      <span className={styles.number}>{number}</span>
      <span
        className={`${styles.state ?? ''} ${shown.kind.startsWith('fixed') ? (styles.fixed ?? '') : ''}`}
      >
        <StateIcon shown={shown} />
        {stateText(shown, t)}
      </span>
      <span className={styles.date}>{dayOf(at, language)}</span>
    </>
  )

  return (
    <Modal
      title={t.loop.reports}
      closeLabel={t.loop.close}
      back={{
        label: t.loop.back,
        onBack: () => {
          replaceRoute({ ...route, modal: 'settings' })
        },
      }}
      done={t.loop.close}
      size="default"
      onClose={closeModal}
    >
      {waiting.length + receipts.length === 0 ? (
        <p className={styles.note}>{t.loop.noReports}</p>
      ) : (
        <ul className={styles.reports}>
          {waiting.map((report, index) => (
            <li key={`waiting-${String(index)}`} className={styles.report}>
              {row(report.kind, report.title, { kind: 'waiting' }, '', report.at)}
            </li>
          ))}
          {receipts.map((receipt) => (
            <li key={receipt.number}>
              <a
                href={`${SOURCE_URL}/issues/${String(receipt.number)}`}
                target="_blank"
                rel="noopener"
                className={styles.report}
              >
                {row(
                  receipt.kind,
                  receipt.title,
                  reportState(
                    receipt.number,
                    issues.get(receipt.number),
                    RELEASES,
                    __APP_VERSION__,
                  ),
                  `#${String(receipt.number)}`,
                  receipt.at,
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>{t.loop.reportsNote}</p>
    </Modal>
  )
}
