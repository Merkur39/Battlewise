import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useIsDesktop } from '@/app/useMediaQuery'
import { CloseIcon } from './icons'
import styles from './Modal.module.css'

interface ModalProps {
  readonly title: string
  /** The dialog's own language, when it shows another than the app's (the Settings preview the
   * language picked). */
  readonly lang?: string
  readonly closeLabel: string
  /** Save, and on a desktop Cancel next to it; a dialog without one closes from its header only. */
  readonly footer?: {
    readonly cancel: string
    readonly save: string
    readonly onSave: () => void
  }
  /** Wide: a desktop dialog for two columns, its body laid out by its content. */
  readonly size?: 'default' | 'wide'
  /** Every way out ends here: Save, Cancel, the close button, Escape. */
  readonly onClose: () => void
  readonly children: ReactNode
}

/** A modal dialog: full screen on a phone, centred on a desktop. The browser keeps the rest of the
 * page inert behind it and closes it on Escape. */
export function Modal({
  title,
  lang,
  closeLabel,
  footer,
  size = 'default',
  onClose,
  children,
}: ModalProps) {
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
      className={`${styles.modal ?? ''} ${styles[size] ?? ''}`}
      aria-labelledby={titleId}
      lang={lang}
      onClose={onClose}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label={closeLabel} onClick={close}>
          <CloseIcon size={isDesktop ? 20 : 22} />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && (
        <footer className={styles.footer}>
          {isDesktop && (
            <button type="button" className={styles.cancel} onClick={close}>
              {footer.cancel}
            </button>
          )}
          <button
            type="button"
            className={styles.save}
            onClick={() => {
              footer.onSave()
              close()
            }}
          >
            {footer.save}
          </button>
        </footer>
      )}
    </dialog>
  )
}
