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

// The history state of an entry the app pushed to open a modal.
const OPENED_HERE = 'battlewise:modal'

/** Opens `modal` over the current screen, as a history entry of its own: Back closes it. */
export function openModal(modal: Modal) {
  const { screen } = parseRoute(window.location.hash)
  window.history.pushState(OPENED_HERE, '', routeHash({ screen, modal }))
  emit()
}

/** Back to the screen under the modal: through the history when the app opened it from there, in
 * place when an address led straight to it. */
export function closeModal() {
  const { screen, modal } = parseRoute(window.location.hash)
  if (modal === null) return
  if (window.history.state === OPENED_HERE) {
    window.history.back()
  } else {
    window.history.replaceState(null, '', routeHash({ screen, modal: null }))
    emit()
  }
}
