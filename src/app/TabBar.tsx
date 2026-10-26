import { useT } from '@/i18n/useT'
import { routeHash, SCREENS, type Screen } from './routes'
import { ScreenIcon } from './ScreenIcon'
import styles from './TabBar.module.css'

/** Phone: the four screens at the bottom; each tab is a link, so Back walks the tabs again. */
export function TabBar({ screen }: { readonly screen: Screen }) {
  const t = useT()
  return (
    <nav aria-label={t.shell.navigation} className={styles.tabBar}>
      {SCREENS.map((tab) => (
        <a
          key={tab}
          href={routeHash({ screen: tab, modal: null })}
          aria-current={tab === screen ? 'page' : undefined}
          className={styles.tab}
        >
          <ScreenIcon screen={tab} size={22} />
          {t.screens[tab]}
        </a>
      ))}
    </nav>
  )
}
