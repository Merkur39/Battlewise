/** The event Chrome and Edge fire once the page can be installed; not in TypeScript's DOM types. */
interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<unknown>
}

const isPromptEvent = (event: Event): event is BeforeInstallPromptEvent =>
  'prompt' in event && typeof event.prompt === 'function'

/** The browser's own install prompt, kept from the start of the app: it may come a moment after the
 * first render, or never (Safari, Firefox, an app already installed). */
export interface InstallPrompt {
  readonly canPrompt: () => boolean
  /** The app was installed from this page. */
  readonly installed: () => boolean
  readonly subscribe: (listener: () => void) => () => void
  /** Opens the browser's prompt. Its event serves once: the browser fires another if it will. */
  readonly prompt: () => Promise<void>
}

export function listenForInstallPrompt(target: EventTarget): InstallPrompt {
  let event: BeforeInstallPromptEvent | null = null
  let installed = false
  const listeners = new Set<() => void>()
  const tell = () => {
    for (const listener of listeners) listener()
  }

  target.addEventListener('beforeinstallprompt', (fired) => {
    if (!isPromptEvent(fired)) return
    // Without it, Chrome shows its own banner beside the app's offer.
    fired.preventDefault()
    event = fired
    tell()
  })
  target.addEventListener('appinstalled', () => {
    event = null
    installed = true
    tell()
  })

  return {
    canPrompt: () => event !== null,
    installed: () => installed,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    prompt: async () => {
      const kept = event
      if (!kept) return
      event = null
      tell()
      await kept.prompt()
    },
  }
}
