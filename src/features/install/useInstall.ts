import { createContext, use, useEffect, useState, useSyncExternalStore } from 'react'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useMediaQuery } from '@/app/useMediaQuery'
import { installWay, type InstallWay } from './platform'
import { listenForInstallPrompt, type InstallPrompt } from './prompt'

/** The browser's prompt, listened for from the start of the app (main.tsx). Without a provider, a
 * browser that never prompts. */
export const InstallPromptContext = createContext<InstallPrompt>(
  listenForInstallPrompt(new EventTarget()),
)

export const useInstallPrompt = () => use(InstallPromptContext)

const STANDALONE = '(display-mode: standalone)'

/** Safari on iOS says so on its own: a page opened from the home screen. */
const openedFromHomeScreen = () =>
  (navigator as Navigator & { readonly standalone?: boolean }).standalone === true

/** How this browser installs Battlewise now; null in the installed app, or where it cannot. */
export function useInstallWay(): InstallWay | null {
  const install = useInstallPrompt()
  const canPrompt = useSyncExternalStore(install.subscribe, install.canPrompt)
  const installed = useSyncExternalStore(install.subscribe, install.installed)
  const standalone = useMediaQuery(STANDALONE)
  return installWay({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: standalone || installed || openedFromHomeScreen(),
    prompt: canPrompt,
  })
}

/** The offer of the first launch, made once: from the first render where the browser can install the
 * app (its prompt may come a moment after), until the player leaves it. Made as soon as it shows,
 * whatever the player does next. */
export function useInstallOffer(): readonly [InstallWay | null, () => void] {
  const way = useInstallWay()
  const { installOffered } = useAppState()
  const update = useUpdate()
  const [offer, setOffer] = useState<InstallWay | null>(null)
  if (way !== null && !installOffered && offer === null) setOffer(way)

  useEffect(() => {
    if (offer !== null && !installOffered) update({ installOffered: true })
  }, [offer, installOffered, update])

  return [
    offer,
    () => {
      setOffer(null)
    },
  ]
}
