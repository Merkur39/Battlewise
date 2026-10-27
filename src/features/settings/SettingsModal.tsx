import { useEffect, useId, useLayoutEffect, useState } from 'react'
import { APP_NAME, COPYRIGHT, SOURCE_URL } from '@/app/brand'
import type { Preview } from '@/app/preview'
import { THEMES, type LanguageSetting, type Theme } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { closeModal } from '@/app/useRoute'
import { game } from '@/data'
import { detectLanguage } from '@/i18n/detect'
import { catalogOf } from '@/i18n/useT'
import { CheckIcon, ExternalIcon } from '@/ui/icons'
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
  const [draft, setDraft] = useState<Draft>({ language: saved.language, theme: saved.theme })
  const detected = detectLanguage(navigator.languages)
  const speaks = draft.language === 'auto' ? detected : draft.language
  const t = catalogOf(speaks)
  const languageId = useId()
  const themeId = useId()

  useLayoutEffect(() => {
    onPreview(draft)
  }, [draft, onPreview])
  useEffect(
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
        <span className={styles.label}>{t.settings.about}</span>
        <span className={styles.aboutLines}>
          <span className={styles.aboutTitle}>
            <span className={styles.aboutName}>{APP_NAME}</span>{' '}
            <span className={styles.version}>{__APP_VERSION__}</span>
          </span>
          <span className={styles.dataSource}>
            {t.settings.dataSource(game.game.version ?? String(game.game.build))}
          </span>
          <a className={styles.source} href={SOURCE_URL} target="_blank" rel="noopener">
            <span className={styles.sourceLabel}>{t.settings.source}</span>{' '}
            {!isDesktop && <span className={styles.sourceHost}>GitHub</span>}
            <ExternalIcon size={isDesktop ? 12 : 14} strokeWidth={2} />
          </a>
          <span className={styles.note}>{t.settings.licence(COPYRIGHT)}</span>
        </span>
      </section>
    </Modal>
  )
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
