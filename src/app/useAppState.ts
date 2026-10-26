import { createContext, use, useSyncExternalStore } from 'react'
import type { AppState, Store } from './store'

export const StoreContext = createContext<Store | null>(null)

function useStore(): Store {
  const store = use(StoreContext)
  if (!store) throw new Error('No store: render the app inside a StoreContext')
  return store
}

export function useAppState(): AppState {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getState)
}

export const useUpdate = () => useStore().update
