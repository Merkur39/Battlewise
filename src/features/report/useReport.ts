import { createContext, use, useEffect } from 'react'
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
