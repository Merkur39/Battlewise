import type { Language } from '@/i18n/detect'
import type { Catalog } from '@/i18n/fr'
import type { ReportShown } from './loop'

/** A report's state, as My reports says it. */
export const stateText = (shown: ReportShown, t: Catalog) =>
  shown.kind === 'fixedIn' ? t.loop.states.fixedIn(shown.version) : t.loop.states[shown.kind]

/** A release's day, as people read it: « 2 nov. 2026 ». */
export const dateOf = (date: string, language: Language) =>
  new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  )
