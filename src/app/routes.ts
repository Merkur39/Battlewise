export const SCREENS = ['bestiary', 'simulation', 'arsenal', 'guide'] as const
export type Screen = (typeof SCREENS)[number]

/** The modals an address can open over a screen; Your gear and Your world join them with part 5. */
export const MODALS = ['settings', 'attack'] as const
export type Modal = (typeof MODALS)[number]

export interface Route {
  readonly screen: Screen
  /** What the screen shows inside it: a biome and a creature of the Bestiary… */
  readonly path: readonly string[]
  /** A search typed on the screen; empty when there is none. */
  readonly query: string
  readonly modal: Modal | null
}

const oneOf = <T extends string>(values: readonly T[], value: string | null | undefined) =>
  values.find((option) => option === value)

// An address typed by hand may hold a broken escape: keep it as it is.
function decode(segment: string) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** `#/bestiary/swamp/Troll?q=tro&modal=settings`; an unknown screen is the Bestiary. */
export function parseRoute(hash: string): Route {
  const [location = '', search = ''] = hash.replace(/^#\/?/, '').split('?')
  const [screen, ...path] = location
    .split('/')
    .filter((segment) => segment !== '')
    .map(decode)
  const params = new URLSearchParams(search)
  return {
    screen: oneOf(SCREENS, screen) ?? 'bestiary',
    path,
    query: params.get('q') ?? '',
    modal: oneOf(MODALS, params.get('modal')) ?? null,
  }
}

export function routeHash({ screen, path, query, modal }: Route): string {
  const params = new URLSearchParams()
  if (query !== '') params.set('q', query)
  if (modal !== null) params.set('modal', modal)
  const search = params.toString()
  const location = [screen, ...path].map(encodeURIComponent).join('/')
  return search === '' ? `#/${location}` : `#/${location}?${search}`
}

/** A screen, as its tab opens it. */
export const screenHash = (screen: Screen) =>
  routeHash({ screen, path: [], query: '', modal: null })
