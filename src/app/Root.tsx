import { AppCrash } from '@/features/report/Crash'
import { App } from './App'
import { CrashBoundary } from './CrashBoundary'

/** The app under its net of last resort: what fails while drawing every screen shows a page that reloads
 * it, or reports the crash. */
export function Root() {
  return (
    <CrashBoundary fallback={(crash) => <AppCrash crash={crash} />}>
      <App />
    </CrashBoundary>
  )
}
