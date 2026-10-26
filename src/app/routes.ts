export const SCREENS = ['bestiary', 'simulation', 'arsenal', 'guide'] as const
export type Screen = (typeof SCREENS)[number]

/** The modals an address can open over a screen; Your gear and Your world join them with part 5. */
export const MODALS = ['settings'] as const
export type Modal = (typeof MODALS)[number]

export interface Route {
  readonly screen: Screen
  readonly modal: Modal | null
}

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | undefined =>
  values.find((option) => option === value)

/** `#/arsenal`, `#/arsenal?modal=settings`; any other address is the Bestiary. */
export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  return {
    screen: oneOf(SCREENS, path) ?? 'bestiary',
    modal: oneOf(MODALS, new URLSearchParams(query).get('modal')) ?? null,
  }
}

export const routeHash = ({ screen, modal }: Route) =>
  modal ? `#/${screen}?modal=${modal}` : `#/${screen}`
