import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useIsDesktop } from '@/app/useMediaQuery'
import { BackIcon, CloseIcon } from './icons'
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
  /** A page reached from another dialog: its back button replaces the close button on a phone, and
   * comes before the title on a desktop. */
  readonly back?: { readonly label: string; readonly onBack: () => void }
  /** A dialog that only shows: on a desktop, one button at its foot closes it. */
  readonly done?: string
  /** The width of the desktop dialog. Wide: two columns, its body laid out by its content. */
  readonly size?: 'narrow' | 'medium' | 'default' | 'wide'
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
  back,
  done,
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
        {back && (
          <button
            type="button"
            className={styles.back}
            aria-label={back.label}
            onClick={back.onBack}
          >
            <BackIcon size={isDesktop ? 20 : 22} />
          </button>
        )}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {(!back || isDesktop) && (
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={close}>
            <CloseIcon size={isDesktop ? 20 : 22} />
          </button>
        )}
      </header>
      <div className={styles.body}>{children}</div>
      {done && isDesktop && (
        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={close}>
            {done}
          </button>
        </footer>
      )}
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
