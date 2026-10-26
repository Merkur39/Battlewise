import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { createStore, type AppState } from '@/app/store'
import { StoreContext } from '@/app/useAppState'

/** Renders `ui` with a store of its own, unsaved, on the defaults with `state` over them. */
export function renderWithStore(ui: ReactNode, state: Partial<AppState> = {}) {
  const store = createStore(null)
  store.update(state)
  return { store, ...render(<StoreContext value={store}>{ui}</StoreContext>) }
}

/** The device's preferred languages (navigator.languages), restored after each test. */
export const deviceSpeaks = (...languages: string[]) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
