import type { MouseEvent, ReactNode } from 'react'
import { routeHash, type Route } from './routes'
import { openRoute, replaceRoute, returnTo } from './useRoute'

interface RouteLinkProps {
  readonly to: Route
  /** `open` makes a history entry Back returns from; `return` goes back to `to`, the route this one
   * was opened from; `replace` takes the place of the current entry (a modal's choice). */
  readonly how?: 'open' | 'return' | 'replace'
  readonly className?: string | undefined
  readonly 'aria-label'?: string
  readonly 'aria-current'?: 'true' | undefined
  /** Called as the link is followed, before the route changes: a sheet that closes as it leads away. */
  readonly onFollow?: () => void
  readonly children: ReactNode
}

// A click that opens a new tab or window keeps the browser's own behaviour.
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/** A link inside the app: a real address to share or open elsewhere, followed through the app's
 * history. */
export function RouteLink({ to, how = 'open', onFollow, children, ...props }: RouteLinkProps) {
  return (
    <a
      href={routeHash(to)}
      onClick={(event) => {
        if (!plainClick(event)) return
        event.preventDefault()
        onFollow?.()
        if (how === 'open') openRoute(to)
        else if (how === 'return') returnTo(to)
        else replaceRoute(to)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
