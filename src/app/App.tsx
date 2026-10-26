import { useEffect, useLayoutEffect, useState } from 'react'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { useLanguage, useT } from '@/i18n/useT'
import styles from './App.module.css'
import { APP_NAME } from './brand'
import { PreviewContext, usePreview, type Preview } from './preview'
import { ScreenView } from './ScreenView'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { TopBar } from './TopBar'
import { useAppState } from './useAppState'
import { useIsDesktop } from './useMediaQuery'
import { useRoute } from './useRoute'

export function App() {
  const [preview, setPreview] = useState<Preview>({})
  return (
    <PreviewContext value={preview}>
      <Shell onPreview={setPreview} />
    </PreviewContext>
  )
}

function Shell({ onPreview }: { readonly onPreview: (preview: Preview) => void }) {
  const { screen, modal } = useRoute()
  const isDesktop = useIsDesktop()
  const t = useT()
  const language = useLanguage()
  const preview = usePreview()
  const saved = useAppState()
  const theme = preview.theme ?? saved.theme

  // On the root element, before the first paint: <html lang> for screen readers and hyphenation, the
  // theme for the palette of src/styles/themes.css.
  useLayoutEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.title = `${t.screens[screen]} — ${APP_NAME}`
  }, [t, screen])

  return (
    <div className={isDesktop ? styles.desktop : styles.phone}>
      {isDesktop ? <Sidebar screen={screen} /> : <TopBar screen={screen} />}
      <ScreenView screen={screen} />
      {!isDesktop && <TabBar screen={screen} />}
      {modal === 'settings' && <SettingsModal onPreview={onPreview} />}
    </div>
  )
}
