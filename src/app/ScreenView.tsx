import { useT } from '@/i18n/useT'
import type { Screen } from './routes'
import styles from './ScreenView.module.css'
import { useIsDesktop } from './useMediaQuery'

/** The screen itself. Its title is the page's heading: shown on a desktop, kept for screen readers
 * on a phone, where the app name stands in the top bar. The screens fill in from part 3 on. */
export function ScreenView({ screen }: { readonly screen: Screen }) {
  const t = useT()
  const isDesktop = useIsDesktop()
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={isDesktop ? styles.title : 'visually-hidden'}>{t.screens[screen]}</h1>
      </div>
    </main>
  )
}
