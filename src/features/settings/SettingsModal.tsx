import { useId, useLayoutEffect, useState } from 'react'
import { APP_NAME, COPYRIGHT, SOURCE_URL } from '@/app/brand'
import { RELEASES } from '@/app/releases'
import { RouteLink } from '@/app/RouteLink'
import type { Preview } from '@/app/preview'
import { THEMES, type LanguageSetting, type Theme } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { closeModal, useRoute } from '@/app/useRoute'
import { game } from '@/data'
import { InstallSheet } from '@/features/install/Install'
import { useInstallPrompt, useInstallWay } from '@/features/install/useInstall'
import { detectLanguage } from '@/i18n/detect'
import { catalogOf } from '@/i18n/useT'
import { reportState } from '@/features/report/loop'
import { dateOf } from '@/features/report/wording'
import { SETTINGS_ORIGIN } from '@/features/report/origins'
import { useIssueStates, useOpenReport, useOutbox } from '@/features/report/useReport'
import { CheckIcon, ChevronRightIcon, ExternalIcon, FlagIcon, InstallIcon } from '@/ui/icons'
import { Modal } from '@/ui/Modal'
import styles from './SettingsModal.module.css'

const DEFAULT_THEME: Theme = 'origine'

interface Draft {
  readonly language: LanguageSetting
  readonly theme: Theme
}

/** Language and theme, previewed by the whole app as soon as they are picked, saved on Save only. */
export function SettingsModal({ onPreview }: { readonly onPreview: (preview: Preview) => void }) {
  const saved = useAppState()
  const update = useUpdate()
  const isDesktop = useIsDesktop()
  const openReport = useOpenReport()
  const route = useRoute()
  const feedback = useFeedbackSummary()
  const installWay = useInstallWay()
  const install = useInstallPrompt()
  const [installSteps, setInstallSteps] = useState(false)
  const [draft, setDraft] = useState<Draft>({ language: saved.language, theme: saved.theme })
  const detected = detectLanguage(navigator.languages)
  const speaks = draft.language === 'auto' ? detected : draft.language
  const t = catalogOf(speaks)
  const languageId = useId()
  const themeId = useId()

  useLayoutEffect(() => {
    onPreview(draft)
  }, [draft, onPreview])
  // The saved choices come back in the commit that takes the dialog away, before the next paint,
  // however it closes: Back closes it in a render whose passive effects may wait for a frame.
  useLayoutEffect(
    () => () => {
      onPreview({})
    },
    [onPreview],
  )

  const pick = (change: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...change }))
  }

  const languages: {
    readonly id: LanguageSetting
    readonly label: string
    readonly lang: string
  }[] = [
    { id: 'auto', label: t.settings.automatic, lang: speaks },
    { id: 'fr', label: 'Français', lang: 'fr' },
    { id: 'en', label: 'English', lang: 'en' },
  ]

  return (
    <>
      <Modal
        title={t.settings.title}
        lang={speaks}
        closeLabel={t.modal.close}
        footer={{
          cancel: t.modal.cancel,
          save: t.modal.save,
          onSave: () => {
            update(draft)
          },
        }}
        onClose={closeModal}
      >
        <section className={styles.section}>
          <span id={languageId} className={styles.label}>
            {t.settings.language}
          </span>
          <div className={styles.languageRow}>
            <div role="radiogroup" aria-labelledby={languageId} className={styles.segments}>
              {languages.map(({ id, label, lang }) => (
                <label key={id} lang={lang} className={styles.segment}>
                  <input
                    type="radio"
                    name="language"
                    value={id}
                    checked={draft.language === id}
                    onChange={() => {
                      pick({ language: id })
                    }}
                    className={styles.radio}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className={styles.note}>{t.settings.languageNote(detected)}</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span id={themeId} className={styles.label}>
              {t.settings.theme}
            </span>
            {isDesktop && <p className={styles.note}>{t.settings.themeNoteDesktop}</p>}
          </div>
          <div role="radiogroup" aria-labelledby={themeId} className={styles.themes}>
            {THEMES.map((id) => {
              const { name, description } = t.settings.themes[id]
              const checked = draft.theme === id
              return (
                <label key={id} className={styles.theme}>
                  <input
                    type="radio"
                    name="theme"
                    value={id}
                    checked={checked}
                    onChange={() => {
                      pick({ theme: id })
                    }}
                    className={styles.radio}
                  />
                  <Swatch theme={id} large={isDesktop} />
                  <span className={styles.themeLine}>
                    <span className={styles.themeText}>
                      <span className={styles.themeName}>
                        {name}
                        {id === DEFAULT_THEME && (
                          <span className={styles.tag}>{t.settings.byDefault}</span>
                        )}
                      </span>
                      <span className={styles.themeDescription}>{description}</span>
                    </span>
                    {checked && (
                      <CheckIcon
                        size={isDesktop ? 18 : 20}
                        strokeWidth={2.25}
                        className={styles.check}
                      />
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          {!isDesktop && <p className={styles.note}>{t.settings.themeNote}</p>}
        </section>

        <section className={styles.about}>
          <span className={styles.label}>{t.loop.feedback}</span>
          <span className={styles.feedbackRows}>
            <RouteLink
              to={{ ...route, modal: 'reports' }}
              how="replace"
              className={styles.feedbackRow}
            >
              <span className={styles.feedbackText}>
                <span className={styles.feedbackName}>{t.loop.reports}</span>
                <span className={styles.feedbackMeta}>
                  {t.loop.reportsSummary(feedback.sent, feedback.fixed)}
                </span>
              </span>
              <ChevronRightIcon size={16} className={styles.go} />
            </RouteLink>
            {feedback.latest && (
              <RouteLink
                to={{ ...route, modal: 'news' }}
                how="replace"
                className={styles.feedbackRow}
              >
                <span className={styles.feedbackText}>
                  <span className={styles.feedbackName}>{t.loop.news}</span>
                  <span className={`${styles.feedbackMeta ?? ''} ${styles.mono ?? ''}`}>
                    {t.loop.newsSummary(
                      feedback.latest.version,
                      dateOf(feedback.latest.date, speaks),
                    )}
                  </span>
                </span>
                <ChevronRightIcon size={16} className={styles.go} />
              </RouteLink>
            )}
          </span>
        </section>

        <section className={styles.about}>
          <span className={styles.label}>{t.settings.about}</span>
          <span className={styles.aboutLines}>
            <span className={styles.aboutTitle}>
              <span className={styles.aboutName}>{APP_NAME}</span>{' '}
              <span className={styles.version}>{__APP_VERSION__}</span>
            </span>
            <span className={styles.dataSource}>
              {t.settings.dataSource(game.game.version ?? String(game.game.build))}
            </span>
            <span className={styles.aboutLinks}>
              {installWay !== null && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className={`${styles.source ?? ''} ${styles.install ?? ''}`}
                  onClick={() => {
                    if (installWay === 'prompt') void install.prompt()
                    else setInstallSteps(true)
                  }}
                >
                  <InstallIcon size={isDesktop ? 13 : 16} strokeWidth={2} />
                  <span className={styles.installText}>
                    <span className={styles.sourceLabel}>{t.install.row}</span>
                    {!isDesktop && <span className={styles.installMeta}>{t.install.rowMeta}</span>}
                  </span>
                  {!isDesktop && <ChevronRightIcon size={14} className={styles.go} />}
                </button>
              )}
              <button
                type="button"
                aria-haspopup="dialog"
                className={styles.source}
                onClick={() => {
                  openReport(SETTINGS_ORIGIN)
                  closeModal()
                }}
              >
                <FlagIcon size={isDesktop ? 13 : 16} strokeWidth={2} />
                <span className={styles.sourceLabel}>{t.report.fromSettings}</span>
                {!isDesktop && <ChevronRightIcon size={14} className={styles.go} />}
              </button>
              <a className={styles.source} href={SOURCE_URL} target="_blank" rel="noopener">
                <span className={styles.sourceLabel}>{t.settings.source}</span>{' '}
                {!isDesktop && <span className={styles.sourceHost}>GitHub</span>}
                <ExternalIcon size={isDesktop ? 12 : 14} strokeWidth={2} />
              </a>
            </span>
            <span className={styles.note}>{t.settings.licence(COPYRIGHT)}</span>
          </span>
        </section>
      </Modal>
      {installSteps && installWay !== null && installWay !== 'prompt' && (
        <InstallSheet
          way={installWay}
          onClose={() => {
            setInstallSteps(false)
          }}
        />
      )}
    </>
  )
}

/** How many reports this device sent, how many are fixed (from the versions it runs, and from what
 * GitHub last said), and the latest version. */
function useFeedbackSummary() {
  const outbox = useOutbox()
  const issues = useIssueStates()
  const receipts = outbox.receipts()
  const fixed = receipts.filter((receipt) =>
    reportState(
      receipt.number,
      issues.get(receipt.number),
      RELEASES,
      __APP_VERSION__,
    ).kind.startsWith('fixed'),
  ).length
  return { sent: receipts.length + outbox.waiting().length, fixed, latest: RELEASES[0] }
}

/** A theme in miniature, drawn with its own tokens: data-theme scopes the palette to the swatch. */
function Swatch({ theme, large }: { readonly theme: Theme; readonly large: boolean }) {
  if (large) {
    return (
      <span data-theme={theme} aria-hidden="true" className={styles.preview}>
        <span className={styles.previewSide} />
        <span className={styles.previewBody}>
          <span className={styles.previewText} />
          <span className={styles.previewGauge}>
            <span className={styles.ok} />
            <span className={styles.warn} />
            <span className={styles.bad} />
          </span>
          <span className={styles.previewAction} />
        </span>
      </span>
    )
  }
  return (
    <span data-theme={theme} aria-hidden="true" className={styles.swatch}>
      <span className={styles.swatchSurface} />
      <span className={styles.swatchAccent} />
      <span className={styles.swatchVerdicts}>
        <span className={styles.ok} />
        <span className={styles.warn} />
        <span className={styles.bad} />
      </span>
    </span>
  )
}
