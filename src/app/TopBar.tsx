import { ShieldIcon } from '@/ui/icons'
import { APP_NAME } from './brand'
import { ContextMenu } from './ContextMenu'
import { SettingsLink } from './SettingsLink'
import styles from './TopBar.module.css'

/** Phone: the app name takes the place of the page title (kept for screen readers by the screen),
 * then the context menu, Your gear and Your world, and the Settings. */
export function TopBar() {
  return (
    <header className={styles.topBar}>
      <span className={styles.brand}>
        <ShieldIcon size={20} className={styles.shield} />
        {APP_NAME}
      </span>
      <ContextMenu />
      <SettingsLink variant="icon" className={styles.settings} />
    </header>
  )
}
