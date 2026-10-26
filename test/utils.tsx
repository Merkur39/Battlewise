import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { createStore, type AppState, type Gear } from '@/app/store'
import { StoreContext } from '@/app/useAppState'

/** The gear of the mockups, whose numbers the journeys check: a silver shield early in the Mountain. */
export const MOCKUP_GEAR: Gear = {
  blocker: 'ShieldSilver',
  level: 3,
  skill: 25,
  armor: 45,
  maxHealth: 150,
}

/** Renders `ui` with a store of its own, unsaved, on the defaults with `state` over them. */
export function renderWithStore(ui: ReactNode, state: Partial<AppState> = {}) {
  const store = createStore(null)
  store.update(state)
  return { store, ...render(<StoreContext value={store}>{ui}</StoreContext>) }
}

/** The device's preferred languages (navigator.languages), restored after each test. */
export const deviceSpeaks = (...languages: string[]) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
