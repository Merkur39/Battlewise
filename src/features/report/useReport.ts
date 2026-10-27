import { createContext, use, useEffect, useState } from 'react'
import { RELEASES } from '@/app/releases'
import { useAppState, useUpdate } from '@/app/useAppState'
import type { IssueStates } from './issues'
import { fixedSince, type Fix } from './loop'
import type { ReportOrigin } from './model'
import type { Outbox } from './outbox'

export const OutboxContext = createContext<Outbox | null>(null)

export function useOutbox(): Outbox {
  const outbox = use(OutboxContext)
  if (!outbox) throw new Error('No outbox: render the app inside an OutboxContext')
  return outbox
}

/** Sends the reports that wait on the device when the app opens and when the network comes back. */
export function useSendWaitingReports() {
  const outbox = useOutbox()
  useEffect(() => {
    const flush = () => {
      void outbox.flush()
    }
    flush()
    window.addEventListener('online', flush)
    return () => {
      window.removeEventListener('online', flush)
    }
  }, [outbox])
}

/** Opens the report sheet, with what the screen it is opened from attaches to it. */
export const OpenReportContext = createContext<(origin: ReportOrigin) => void>(() => undefined)

export const useOpenReport = () => use(OpenReportContext)

export const IssueStatesContext = createContext<IssueStates | null>(null)

export function useIssueStates(): IssueStates {
  const states = use(IssueStatesContext)
  if (!states) throw new Error('No issue states: render the app inside an IssueStatesContext')
  return states
}

/** The player's reports the update fixed, read once as the app opens; the device then records the
 * version it runs, so that they are told only once. Dismissing them empties the list. */
export function useFixesSinceUpdate(): readonly [readonly Fix[], () => void] {
  const outbox = useOutbox()
  const { seenVersion } = useAppState()
  const update = useUpdate()
  const [fixes, setFixes] = useState(() =>
    fixedSince(outbox.receipts(), RELEASES, seenVersion, __APP_VERSION__),
  )
  useEffect(() => {
    if (seenVersion !== __APP_VERSION__) update({ seenVersion: __APP_VERSION__ })
  }, [seenVersion, update])
  return [
    fixes,
    () => {
      setFixes([])
    },
  ] as const
}
