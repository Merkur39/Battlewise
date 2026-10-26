import type { Language } from './detect'

const FORMATS: Record<Language, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat('fr', { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat('en', { maximumFractionDigits: 2 }),
}

/** A number as the language writes it: `41,5` in French, `41.5` in English. */
export const formatNumber = (value: number, language: Language) => FORMATS[language].format(value)
