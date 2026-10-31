export const SCREENS = ['bestiary', 'simulation', 'arsenal', 'guide'] as const
export type Screen = (typeof SCREENS)[number]

/** The modals an address can open over a screen. */
export const MODALS = ['settings', 'attack', 'gear', 'world', 'reports', 'news', 'notices'] as const
export type Modal = (typeof MODALS)[number]

/** What Your gear opens with besides what is saved: the Arsenal's « Équiper » or « Emporter ». */
export interface Equip {
  /** The id of an item that blocks, an armor piece or an effect one carries, checked by the dialog. */
  readonly item: string
}

export interface Route {
  readonly screen: Screen
  /** What the screen shows inside it: a biome and a creature of the Bestiary… */
  readonly path: readonly string[]
  /** A search typed on the screen; empty when there is none. */
  readonly query: string
  readonly modal: Modal | null
  /** Read and written with the Your gear dialog only. */
  readonly equip?: Equip
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

/** `#/bestiary/swamp/Troll?q=tro&modal=settings`; an unknown screen is the Bestiary. Your gear may
 * open with an item: `?modal=gear&item=ShieldWood`. */
export function parseRoute(hash: string): Route {
  const [location = '', search = ''] = hash.replace(/^#\/?/, '').split('?')
  const [screen, ...path] = location
    .split('/')
    .filter((segment) => segment !== '')
    .map(decode)
  const params = new URLSearchParams(search)
  const modal = oneOf(MODALS, params.get('modal')) ?? null
  const item = params.get('item')
  return {
    screen: oneOf(SCREENS, screen) ?? 'bestiary',
    path,
    query: params.get('q') ?? '',
    modal,
    ...(modal === 'gear' && item !== null ? { equip: { item } } : {}),
  }
}

export function routeHash({ screen, path, query, modal, equip }: Route): string {
  const params = new URLSearchParams()
  if (query !== '') params.set('q', query)
  if (modal !== null) params.set('modal', modal)
  if (modal === 'gear' && equip) params.set('item', equip.item)
  const search = params.toString()
  const location = [screen, ...path].map(encodeURIComponent).join('/')
  return search === '' ? `#/${location}` : `#/${location}?${search}`
}

/** A screen, as its tab opens it. */
export const screenHash = (screen: Screen) =>
  routeHash({ screen, path: [], query: '', modal: null })
