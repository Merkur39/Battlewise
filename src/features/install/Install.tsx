import { useId, useLayoutEffect, useRef } from 'react'
import { APP_NAME } from '@/app/brand'
import { useIsDesktop } from '@/app/useMediaQuery'
import { useT } from '@/i18n/useT'
import {
  AppsIcon,
  CloseIcon,
  ExpandIcon,
  InstallIcon,
  MoreIcon,
  OfflineIcon,
  ShareIcon,
  ShieldIcon,
} from '@/ui/icons'
import styles from './Install.module.css'
import type { InstallWay } from './platform'
import { useInstallPrompt } from './useInstall'

/** A way through Safari's own buttons: steps to follow, the app cannot press them. */
type SafariWay = Exclude<InstallWay, 'prompt'>

const PERK_ICONS = [AppsIcon, ExpandIcon, OfflineIcon] as const

/** What installing brings: a home screen on a phone, a window of its own on a desktop. */
function Perks() {
  const t = useT()
  const isDesktop = useIsDesktop()
  return (
    <ul className={styles.perks}>
      {t.install.perks[isDesktop ? 'desktop' : 'phone'].map((perk, index) => {
        const PerkIcon = PERK_ICONS[index] ?? AppsIcon
        return (
          <li key={perk} className={styles.perk}>
            <PerkIcon size={20} className={styles.perkIcon} />
            {perk}
          </li>
        )
      })}
    </ul>
  )
}

/** A step's words, Safari's buttons drawn where they stand. */
function StepText({ text }: { readonly text: string }) {
  return text.split(/(\{more\}|\{share\})/).map((part, index) =>
    part === '{more}' ? (
      <span key={index}>
        <MoreIcon size={18} strokeWidth={2} className={styles.button} />
        <span className="visually-hidden">⋯</span>
      </span>
    ) : part === '{share}' ? (
      <ShareIcon key={index} size={18} strokeWidth={2} className={styles.button} />
    ) : (
      part
    ),
  )
}

/** Safari's steps. `first`: nothing set yet, so do it now; otherwise, what the installed app lacks.
 * Either way, an app installed from Safari keeps nothing of what was set in Safari. */
function SafariSteps({ way, first }: { readonly way: SafariWay; readonly first: boolean }) {
  const t = useT()
  const labelId = useId()
  return (
    <div className={styles.how}>
      <span id={labelId} className={styles.label}>
        {t.install.inSafari}
      </span>
      <ol aria-labelledby={labelId} className={styles.steps}>
        {t.install.steps[way].map((step) => (
          <li key={step} className={styles.step}>
            <span>
              <StepText text={step} />
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.why}>{first ? t.install.first : t.install.later}</p>
    </div>
  )
}

/** The offer of the first launch, once: a page over the whole app. With the browser's prompt, a button
 * opens it; on Safari, its steps. Every way out ends at `onClose`, Escape included. */
export function InstallOffer({
  way,
  onClose,
}: {
  readonly way: InstallWay
  readonly onClose: () => void
}) {
  const t = useT()
  const install = useInstallPrompt()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()

  return (
    <dialog ref={dialog} aria-labelledby={titleId} className={styles.page} onClose={onClose}>
      <div className={styles.frame}>
        <span className={styles.brand}>
          <ShieldIcon size={20} className={styles.shield} />
          {APP_NAME}
        </span>
        <div className={styles.column}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {t.install.title}
            </h2>
            <p className={styles.lead}>{t.install.lead}</p>
          </div>
          <Perks />
          {way !== 'prompt' && <SafariSteps way={way} first />}
        </div>
        <footer className={styles.footer}>
          {way === 'prompt' ? (
            <>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  void install.prompt()
                  close()
                }}
              >
                <InstallIcon size={20} strokeWidth={2} />
                {t.install.install}
              </button>
              <button type="button" className={styles.quiet} onClick={close}>
                {t.install.continueInBrowser}
              </button>
            </>
          ) : (
            <button type="button" className={styles.outlined} onClick={close}>
              {t.install.continueInSafari}
            </button>
          )}
          <p className={styles.note}>{t.install.inSettings}</p>
        </footer>
      </div>
    </dialog>
  )
}

/** Safari's steps from Settings: a sheet from the bottom on a phone, a dialog on a desktop. */
export function InstallSheet({
  way,
  onClose,
}: {
  readonly way: SafariWay
  readonly onClose: () => void
}) {
  const t = useT()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={styles.sheet}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className={styles.content}>
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <h2 id={titleId} className={styles.sheetTitle}>
            {t.install.title}
          </h2>
          <button
            type="button"
            aria-label={t.install.close}
            className={styles.close}
            onClick={close}
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.sheetLead}>{t.install.lead}</p>
          <Perks />
          <SafariSteps way={way} first={false} />
        </div>
      </div>
    </dialog>
  )
}
