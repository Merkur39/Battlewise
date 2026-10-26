import { ShieldIcon } from '@/ui/icons'
import { APP_NAME } from './brand'
import { ContextChips } from './ContextChips'
import type { Screen } from './routes'
import { SettingsLink } from './SettingsLink'
import styles from './TopBar.module.css'

/** Phone: the app name takes the place of the page title (kept for screen readers by the screen),
 * then Your gear and Your world. */
export function TopBar({ screen }: { readonly screen: Screen }) {
  return (
    <header className={styles.topBar}>
      <div className={styles.brandRow}>
        <span className={styles.brand}>
          <ShieldIcon size={20} className={styles.shield} />
          {APP_NAME}
        </span>
        <SettingsLink screen={screen} variant="icon" className={styles.settings} />
      </div>
      <ContextChips variant="bar" />
    </header>
  )
}
