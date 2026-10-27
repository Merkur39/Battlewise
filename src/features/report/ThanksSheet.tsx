import { useId, useLayoutEffect, useRef } from 'react'
import { RouteLink } from '@/app/RouteLink'
import { useIsDesktop } from '@/app/useMediaQuery'
import { useRoute } from '@/app/useRoute'
import { useLanguage, useT } from '@/i18n/useT'
import { CloseIcon } from '@/ui/icons'
import type { Fix } from './loop'
import styles from './ThanksSheet.module.css'

/** « Fixed thanks to you »: once, as the app opens after an update that fixed some of the player's
 * reports. A sheet from the bottom on a phone, a dialog on a desktop; it leads to What's new. */
export function ThanksSheet({
  fixes,
  onClose,
}: {
  /** Newest version first. */
  readonly fixes: readonly Fix[]
  readonly onClose: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const route = useRoute()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [newest] = fixes

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()
  if (!newest) return null

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
          <h2 id={titleId} className={styles.title}>
            {t.loop.thanksTitle}
          </h2>
          <button type="button" aria-label={t.loop.close} className={styles.close} onClick={close}>
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={styles.body}>
          {fixes.map(({ receipt, note }) => (
            <div key={receipt.number} className={styles.card}>
              <span className={styles.cardHead}>
                <span>{receipt.title === '' ? t.report.kind[receipt.kind] : receipt.title}</span>
                <span className={styles.number}>#{receipt.number}</span>
              </span>
              <span className={styles.change}>{note.text[language]}</span>
            </div>
          ))}
          <p className={styles.thanks}>
            {t.loop.thanksBody(fixes.length, newest.version, newest.receipt.nickname)}
          </p>
        </div>
        <div className={styles.footer}>
          {isDesktop && (
            <button type="button" className={styles.dismiss} onClick={close}>
              {t.loop.close}
            </button>
          )}
          <RouteLink to={{ ...route, modal: 'news' }} onFollow={close} className={styles.news}>
            {t.loop.seeNews}
          </RouteLink>
        </div>
      </div>
    </dialog>
  )
}
