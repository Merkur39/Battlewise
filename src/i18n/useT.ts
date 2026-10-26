import { useAppState } from '@/app/useAppState'
import { detectLanguage, type Language } from './detect'
import { en } from './en'
import { fr, type Catalog } from './fr'

const CATALOGS: Record<Language, Catalog> = { fr, en }

/** The language the app speaks: the one chosen in the settings, or on Automatic the device's, read
 * at each render so it follows the device. Game names are read as `name[language]`. */
export function useLanguage(): Language {
  const { language } = useAppState()
  return language === 'auto' ? detectLanguage(navigator.languages) : language
}

export const useT = (): Catalog => CATALOGS[useLanguage()]
