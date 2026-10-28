import { useMemo, useSyncExternalStore } from 'react'
import { parseRoute, routeHash, type Modal, type Route } from './routes'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
  }
}

// pushState and replaceState fire no event.
const emit = () => {
  for (const listener of listeners) listener()
}

/** The route of the address: links to `#/…` move between screens, and Back moves back. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseRoute(hash), [hash])
}

// The history state of an entry the app pushed to open something from where the user stood: a modal,
// the sheet of a creature. Back, or the way out the app offers, returns there.
const OPENED_HERE = 'foelore:opened'

/** Opens `route` from the current one, as a history entry of its own: Back returns. */
export function openRoute(route: Route) {
  window.history.pushState(OPENED_HERE, '', routeHash(route))
  emit()
}

/** Returns to `parent`: through the history when the app opened the current route from there, in
 * place when an address led straight to it. */
export function returnTo(parent: Route) {
  if (window.history.state === OPENED_HERE) {
    window.history.back()
  } else {
    window.history.replaceState(null, '', routeHash(parent))
    emit()
  }
}

/** Opens `modal` over the current screen. */
export function openModal(modal: Modal) {
  openRoute({ ...parseRoute(window.location.hash), modal })
}

/** Back to the screen under the modal. */
export function closeModal() {
  const route = parseRoute(window.location.hash)
  if (route.modal !== null) returnTo({ ...route, modal: null })
}

/** Changes the address in place, without a history entry: a search as it is typed. */
export function replaceRoute(route: Route) {
  window.history.replaceState(window.history.state, '', routeHash(route))
  emit()
}
