import { useT } from '@/i18n/useT'
import { ShieldIcon } from '@/ui/icons'
import { APP_NAME } from './brand'
import { ContextChips } from './ContextChips'
import { SCREENS, type Screen } from './routes'
import { ScreenIcon } from './ScreenIcon'
import { SettingsLink } from './SettingsLink'
import styles from './Sidebar.module.css'

/** Desktop: the name, the four screens, then Your gear, Your world and the Settings at the bottom. */
export function Sidebar({
  screen,
  links,
}: {
  readonly screen: Screen
  readonly links: Readonly<Record<Screen, string>>
}) {
  const t = useT()
  return (
    <nav aria-label={t.shell.mainNavigation} className={styles.sidebar}>
      <div className={styles.brand}>
        <ShieldIcon size={22} className={styles.shield} />
        <span className={styles.name}>{APP_NAME}</span>
      </div>
      <div className={styles.links}>
        {SCREENS.map((target) => (
          <a
            key={target}
            href={links[target]}
            aria-current={target === screen ? 'page' : undefined}
            className={styles.link}
          >
            <ScreenIcon screen={target} size={20} />
            {t.screens[target]}
          </a>
        ))}
      </div>
      <div className={styles.context}>
        <span className={styles.label}>{t.shell.context}</span>
        <ContextChips variant="sidebar" />
        <SettingsLink variant="labelled" className={styles.link} />
      </div>
    </nav>
  )
}
