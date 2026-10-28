import { render, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { createStore, type AppState, type Gear, type Store } from '@/app/store'
import { StoreContext } from '@/app/useAppState'
import { createIssueStates } from '@/features/report/issues'
import { createOutbox, SendError, type Outbox } from '@/features/report/outbox'
import { IssueStatesContext, OutboxContext } from '@/features/report/useReport'

/** The gear of the mockups, whose numbers the journeys check: a silver shield early in the Mountain. */
export const MOCKUP_GEAR: Gear = {
  blocker: 'ShieldSilver',
  level: 3,
  skill: 25,
  armor: 45,
  maxHealth: 150,
}

/** An outbox kept in memory, offline: what is reported waits in it. */
export const offlineOutbox = () => createOutbox(null, () => Promise.reject(new SendError(null)))

/** Renders `ui` with a store of its own, unsaved, on the defaults (or the store given, as a relaunch
 * finds it) with `state` over them, an outbox of its own, offline unless one is given, and issue states
 * kept nowhere (GitHub is what fetch answers). The questions of the first arrival are behind the player
 * unless `state` asks them (`onboarding: false`). */
export function renderWithStore(
  ui: ReactNode,
  state: Partial<AppState> = {},
  {
    outbox = offlineOutbox(),
    store = createStore(null),
  }: { readonly outbox?: Outbox; readonly store?: Store } = {},
) {
  store.update({ onboarding: true, ...state })
  return {
    store,
    ...render(
      <StoreContext value={store}>
        <OutboxContext value={outbox}>
          <IssueStatesContext value={createIssueStates(null)}>{ui}</IssueStatesContext>
        </OutboxContext>
      </StoreContext>,
    ),
  }
}

/** The device's preferred languages (navigator.languages), restored after each test. */
export const deviceSpeaks = (...languages: string[]) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)

/** Shows Ton équipement and Ton monde: on a phone they wait in the top bar's context menu, on a desktop
 * the sidebar shows them. */
export async function openContext(user: UserEvent) {
  const summary = screen.queryByRole('button', { name: /^(Ton contexte|Your setup)/ })
  if (summary) await user.click(summary)
}
