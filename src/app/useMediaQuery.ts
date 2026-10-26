import { useCallback, useSyncExternalStore } from 'react'

/** From this width on, the sidebar takes the place of the top bar and the tabs. Keep it in step with
 * the `min-width: 1024px` media queries of the styles. */
export const DESKTOP = '(min-width: 1024px)'

const lists = new Map<string, MediaQueryList>()

function listOf(query: string): MediaQueryList {
  let list = lists.get(query)
  if (!list) {
    list = window.matchMedia(query)
    lists.set(query, list)
  }
  return list
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = listOf(query)
      list.addEventListener('change', listener)
      return () => {
        list.removeEventListener('change', listener)
      }
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => listOf(query).matches)
}

export const useIsDesktop = () => useMediaQuery(DESKTOP)
