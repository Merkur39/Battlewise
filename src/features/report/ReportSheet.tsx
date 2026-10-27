import { useId, useLayoutEffect, useRef, useState } from 'react'
import { SOURCE_URL } from '@/app/brand'
import { useIsDesktop } from '@/app/useMediaQuery'
import { game } from '@/data'
import { useLanguage, useT } from '@/i18n/useT'
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  ExternalIcon,
  WarningIcon,
} from '@/ui/icons'
import {
  buildReport,
  canSend,
  MAX_LENGTH,
  REPORT_KINDS,
  titleOf,
  type ReportDraft,
  type ReportOrigin,
} from './model'
import type { Receipt } from './outbox'
import styles from './ReportSheet.module.css'
import { useOutbox } from './useReport'

/** Lines of a crash's stack the sheet shows. */
const STACK_SHOWN = 3

type Step =
  | { readonly step: 'form' }
  | { readonly step: 'sending' }
  | { readonly step: 'sent'; readonly receipt: Receipt }
  | { readonly step: 'kept' }
  | { readonly step: 'refused' }

/** A report, written in a sheet from the bottom on a phone and a dialog on a desktop, which shows
 * what it attaches before it leaves; then its issue number, or that it waits on the device. */
export function ReportSheet({
  origin,
  onClose,
}: {
  readonly origin: ReportOrigin
  /** Every way out ends here: the close button, Escape, a tap on the shade. */
  readonly onClose: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const outbox = useOutbox()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState<ReportDraft>({
    kind: origin.kind,
    line: null,
    text: '',
    game: '',
    nickname: '',
    website: '',
  })
  const [step, setStep] = useState<Step>({ step: 'form' })

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()
  const change = (next: Partial<ReportDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
  }
  const device = {
    version: __APP_VERSION__,
    gameVersion: game.game.version ?? String(game.game.build),
    language,
    width: window.innerWidth,
  }
  const pickLines = draft.kind === 'data' && origin.lines.length > 0
  const { crash } = origin
  // The error, then the first lines of its stack: the rest leaves with it, unshown.
  const stack = crash
    ? crash.stack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && line !== crash.message)
    : []

  const send = async () => {
    if (!canSend(draft, origin)) return
    setStep({ step: 'sending' })
    const outcome = await outbox.submit(buildReport(origin, draft, device), titleOf(origin, draft))
    setStep(
      outcome.status === 'sent'
        ? { step: 'sent', receipt: outcome.receipt }
        : { step: outcome.status },
    )
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={styles.sheet}
      onClose={onClose}
      onClick={(event) => {
        // Outside the box, the click lands on the dialog itself: the shade.
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className={styles.content}>
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {t.report.title}
          </h2>
          <button
            type="button"
            aria-label={t.report.close}
            className={styles.close}
            onClick={close}
          >
            <CloseIcon size={20} />
          </button>
        </header>

        {step.step === 'sent' ? (
          <div role="status" className={styles.outcome}>
            <p className={styles.outcomeTitle}>
              <CheckIcon size={22} strokeWidth={2} /> {t.report.received}{' '}
              <span className={styles.number}>#{step.receipt.number}</span>
            </p>
            <p className={styles.outcomeNote}>{t.report.receivedNote}</p>
            <a
              href={`${SOURCE_URL}/issues/${String(step.receipt.number)}`}
              target="_blank"
              rel="noopener"
              className={styles.view}
            >
              {t.report.view}
              <ExternalIcon size={12} strokeWidth={2} />
            </a>
            {/* The form it replaces held the focus: it moves here rather than to the page. */}
            <button type="button" autoFocus className={styles.done} onClick={close}>
              {t.report.done}
            </button>
          </div>
        ) : step.step === 'kept' ? (
          <div role="status" className={styles.outcome}>
            <p className={styles.outcomeTitle}>
              <ClockIcon size={22} strokeWidth={2} /> {t.report.queued}
            </p>
            <p className={styles.outcomeNote}>{t.report.queuedNote}</p>
            <button type="button" autoFocus className={styles.done} onClick={close}>
              {t.report.done}
            </button>
          </div>
        ) : step.step === 'refused' ? (
          <div role="status" className={styles.outcome}>
            <p className={styles.outcomeTitle}>
              <WarningIcon size={22} strokeWidth={2} /> {t.report.refused}
            </p>
            <p className={styles.outcomeNote}>{t.report.refusedNote}</p>
            <a
              href={`${SOURCE_URL}/issues/new/choose`}
              target="_blank"
              rel="noopener"
              className={styles.view}
            >
              {t.report.onGitHub}
              <ExternalIcon size={12} strokeWidth={2} />
            </a>
            <button type="button" autoFocus className={styles.done} onClick={close}>
              {t.report.done}
            </button>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <div className={styles.body}>
              <div role="group" aria-label={t.report.kinds} className={styles.kinds}>
                {REPORT_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={draft.kind === kind}
                    className={styles.kind}
                    onClick={() => {
                      change({ kind })
                    }}
                  >
                    {t.report.kind[kind]}
                  </button>
                ))}
              </div>

              {origin.heading !== null && (
                <div className={styles.subject}>
                  <p className={styles.heading}>
                    <span className={styles.headingName}>{origin.heading}</span>
                    {pickLines && (
                      <>
                        {' · '}
                        {t.report.whichLine}{' '}
                        <span className={styles.optional}>· {t.report.optional}</span>
                      </>
                    )}
                  </p>
                  {pickLines && (
                    <div role="group" aria-label={t.report.whichLine} className={styles.lines}>
                      {origin.lines.map((line) => (
                        <button
                          key={line.id}
                          type="button"
                          aria-pressed={draft.line === line.id}
                          className={styles.line}
                          onClick={() => {
                            change({ line: draft.line === line.id ? null : line.id })
                          }}
                        >
                          {line.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.label}>
                  {crash ? (
                    <>
                      {t.report.crashText}{' '}
                      <span className={styles.optional}>· {t.report.optional}</span>
                    </>
                  ) : draft.kind ? (
                    t.report.text[draft.kind]
                  ) : (
                    t.report.message
                  )}
                </span>
                <textarea
                  value={draft.text}
                  maxLength={MAX_LENGTH.text}
                  rows={isDesktop ? 4 : 3}
                  placeholder={
                    crash
                      ? t.report.crashHint[origin.screen === 'settings' ? 'app' : origin.screen]
                      : draft.kind
                        ? t.report.textHint[draft.kind]
                        : undefined
                  }
                  className={styles.text}
                  onChange={(event) => {
                    change({ text: event.target.value })
                  }}
                />
              </label>

              <div className={styles.pair}>
                {draft.kind === 'data' && (
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {t.report.game} <span className={styles.optional}>· {t.report.optional}</span>
                    </span>
                    <input
                      type="text"
                      value={draft.game}
                      maxLength={MAX_LENGTH.game}
                      placeholder={t.report.gameHint}
                      className={styles.input}
                      onChange={(event) => {
                        change({ game: event.target.value })
                      }}
                    />
                  </label>
                )}
                <label className={styles.field}>
                  <span className={styles.label}>
                    {t.report.nickname}{' '}
                    <span className={styles.optional}>· {t.report.optional}</span>
                  </span>
                  <input
                    type="text"
                    value={draft.nickname}
                    maxLength={MAX_LENGTH.nickname}
                    autoComplete="nickname"
                    placeholder={t.report.nicknameHint}
                    className={styles.input}
                    onChange={(event) => {
                      change({ nickname: event.target.value })
                    }}
                  />
                </label>
              </div>

              {/* Left empty by people, who never see it; bots fill it in, and the server drops them. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={draft.website}
                className={styles.trap}
                onChange={(event) => {
                  change({ website: event.target.value })
                }}
              />

              {/* A crash shows what it sends at once: an error and its stack are not what one expects. */}
              <details open={isDesktop || crash !== undefined} className={styles.attached}>
                <summary className={styles.summary}>
                  <span className={styles.summaryText}>
                    <span>{t.report.attached}</span>
                    <span className={styles.summaryNote}>
                      {crash ? t.report.crashSummary : t.report.attachedSummary}
                    </span>
                  </span>
                  <ChevronDownIcon size={16} strokeWidth={2} className={styles.chevron} />
                </summary>
                <div role="group" aria-label={t.report.attached} className={styles.attachedLines}>
                  <span>{t.report.device(device.version, device.gameVersion)}</span>
                  <span>{t.report.screen(language, origin.screen, device.width)}</span>
                  {origin.shows.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {crash && (
                    <>
                      <span className={styles.crashLine}>{crash.message}</span>
                      {stack.slice(0, STACK_SHOWN).map((line, index) => (
                        <span key={index} className={styles.stackLine}>
                          {line}
                        </span>
                      ))}
                      {stack.length > STACK_SHOWN && (
                        <span className={styles.stackLine}>
                          {t.report.moreLines(stack.length - STACK_SHOWN)}
                        </span>
                      )}
                    </>
                  )}
                  <span className={styles.nothingElse}>{t.report.nothingElse}</span>
                </div>
              </details>
            </div>

            <div className={styles.footer}>
              <p className={styles.public}>{t.report.public}</p>
              {isDesktop && (
                <button type="button" className={styles.cancel} onClick={close}>
                  {t.report.cancel}
                </button>
              )}
              <button
                type="submit"
                disabled={!canSend(draft, origin) || step.step === 'sending'}
                className={styles.send}
              >
                {step.step === 'sending' ? t.report.sending : t.report.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
