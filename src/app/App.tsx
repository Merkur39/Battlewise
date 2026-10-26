import { useLayoutEffect } from 'react'
import { useLanguage } from '@/i18n/useT'
import { useAppState } from './useAppState'

export function App() {
  const language = useLanguage()
  const { theme } = useAppState()

  // On the root element, before the first paint: <html lang> for screen readers and hyphenation, the
  // theme for the palette of src/styles/themes.css.
  useLayoutEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <header>
      <span>Battlewise</span>
    </header>
  )
}
