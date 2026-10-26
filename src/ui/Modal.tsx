import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useIsDesktop } from '@/app/useMediaQuery'
import type { Catalog } from '@/i18n/fr'
import { CloseIcon } from './icons'
import styles from './Modal.module.css'

interface ModalProps {
  readonly title: string
  /** The dialog's own language and labels, when it shows another than the app's (the Settings
   * preview the language picked). */
  readonly lang?: string
  readonly labels: Catalog['modal']
  /** Every way out ends here: Save, Cancel, the close button, Escape. */
  readonly onClose: () => void
  readonly onSave: () => void
  readonly children: ReactNode
}

/** A modal dialog: full screen with Save on a phone, centred with Cancel and Save on a desktop. The
 * browser keeps the rest of the page inert behind it and closes it on Escape. */
export function Modal({ title, lang, labels, onClose, onSave, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const isDesktop = useIsDesktop()

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      className={styles.modal}
      aria-labelledby={titleId}
      lang={lang}
      onClose={onClose}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label={labels.close} onClick={close}>
          <CloseIcon size={isDesktop ? 20 : 22} />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
      <footer className={styles.footer}>
        {isDesktop && (
          <button type="button" className={styles.cancel} onClick={close}>
            {labels.cancel}
          </button>
        )}
        <button
          type="button"
          className={styles.save}
          onClick={() => {
            onSave()
            close()
          }}
        >
          {labels.save}
        </button>
      </footer>
    </dialog>
  )
}
