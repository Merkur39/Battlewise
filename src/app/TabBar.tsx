import { useT } from '@/i18n/useT'
import { SCREENS, type Screen } from './routes'
import { ScreenIcon } from './ScreenIcon'
import styles from './TabBar.module.css'

/** Phone: the four screens at the bottom; each tab is a link to where that screen was left, so Back
 * walks the tabs again. */
export function TabBar({
  screen,
  links,
}: {
  readonly screen: Screen
  readonly links: Readonly<Record<Screen, string>>
}) {
  const t = useT()
  return (
    <nav aria-label={t.shell.navigation} className={styles.tabBar}>
      {SCREENS.map((tab) => (
        <a
          key={tab}
          href={links[tab]}
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
