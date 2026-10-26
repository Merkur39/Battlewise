import { usePreview } from '@/app/preview'
import { useAppState } from '@/app/useAppState'
import { detectLanguage, type Language } from './detect'
import { en } from './en'
import { fr, type Catalog } from './fr'

const CATALOGS: Record<Language, Catalog> = { fr, en }

export const catalogOf = (language: Language): Catalog => CATALOGS[language]

/** The language the app speaks: the one chosen in the settings (or previewed there), or on Automatic
 * the device's, read at each render so it follows the device. Game names are read as
 * `name[language]`. */
export function useLanguage(): Language {
  const { language } = useAppState()
  const setting = usePreview().language ?? language
  return setting === 'auto' ? detectLanguage(navigator.languages) : setting
}

export const useT = (): Catalog => catalogOf(useLanguage())
