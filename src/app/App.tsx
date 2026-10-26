import { useEffect, useLayoutEffect, useState } from 'react'
import { BestiaryScreen } from '@/features/bestiary/BestiaryScreen'
import { placeOf } from '@/features/bestiary/place'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { AttackPicker } from '@/features/simulation/AttackPicker'
import { SimulationScreen } from '@/features/simulation/SimulationScreen'
import { useLanguage, useT } from '@/i18n/useT'
import styles from './App.module.css'
import { APP_NAME } from './brand'
import { PreviewContext, usePreview, type Preview } from './preview'
import { routeHash, SCREENS, screenHash, type Route, type Screen } from './routes'
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

type Links = Readonly<Record<Screen, string>>

const screenLinks = (): Links =>
  Object.fromEntries(SCREENS.map((screen) => [screen, screenHash(screen)])) as Record<
    Screen,
    string
  >

/** Each tab returns to where its screen was left: the biome, the creature, the search. Kept up to
 * date while rendering, from the route of the previous render. */
function useScreenLinks(route: Route): Links {
  const [links, setLinks] = useState(screenLinks)
  const here = routeHash({ ...route, modal: null })
  if (links[route.screen] !== here) setLinks({ ...links, [route.screen]: here })
  return links
}

function Shell({ onPreview }: { readonly onPreview: (preview: Preview) => void }) {
  const route = useRoute()
  const { screen, modal } = route
  const isDesktop = useIsDesktop()
  const t = useT()
  const language = useLanguage()
  const preview = usePreview()
  const saved = useAppState()
  const theme = preview.theme ?? saved.theme
  const links = useScreenLinks(route)
  const creature = screen === 'bestiary' ? placeOf(route).creature : null
  // A creature's sheet takes the whole screen of a phone, bars included.
  const detail = !isDesktop && creature !== null
  const title = creature ? creature.name[language] : t.screens[screen]

  // On the root element, before the first paint: <html lang> for screen readers and hyphenation, the
  // theme for the palette of src/styles/themes.css.
  useLayoutEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.title = `${title} — ${APP_NAME}`
  }, [title])

  return (
    <div className={isDesktop ? styles.desktop : styles.phone}>
      {isDesktop ? <Sidebar screen={screen} links={links} /> : !detail && <TopBar />}
      {screen === 'bestiary' ? (
        <BestiaryScreen route={route} />
      ) : screen === 'simulation' ? (
        <SimulationScreen route={route} />
      ) : (
        <ScreenView screen={screen} />
      )}
      {!isDesktop && !detail && <TabBar screen={screen} links={links} />}
      {modal === 'settings' && <SettingsModal onPreview={onPreview} />}
      {modal === 'attack' && <AttackPicker />}
    </div>
  )
}
