import type { MouseEvent, ReactNode } from 'react'
import { routeHash, type Route } from './routes'
import { openRoute, returnTo } from './useRoute'

interface RouteLinkProps {
  readonly to: Route
  /** `open` makes a history entry Back returns from; `return` goes back to `to`, the route this one
   * was opened from. */
  readonly how?: 'open' | 'return'
  readonly className?: string | undefined
  readonly 'aria-label'?: string
  readonly 'aria-current'?: 'true' | undefined
  readonly children: ReactNode
}

// A click that opens a new tab or window keeps the browser's own behaviour.
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/** A link inside the app: a real address to share or open elsewhere, followed through the app's
 * history. */
export function RouteLink({ to, how = 'open', children, ...props }: RouteLinkProps) {
  return (
    <a
      href={routeHash(to)}
      onClick={(event) => {
        if (!plainClick(event)) return
        event.preventDefault()
        if (how === 'open') openRoute(to)
        else returnTo(to)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
