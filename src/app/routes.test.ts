import { describe, expect, it } from 'vitest'
import { MODALS, parseRoute, routeHash, SCREENS, type Route } from './routes'

const route = (screen: Route['screen'], rest: Partial<Route> = {}): Route => ({
  screen,
  path: [],
  query: '',
  modal: null,
  ...rest,
})

describe('parseRoute', () => {
  it('opens on the Bestiary', () => {
    expect(parseRoute('')).toEqual(route('bestiary'))
    expect(parseRoute('#/')).toEqual(route('bestiary'))
  })

  it('reads the screen of the address', () => {
    expect(parseRoute('#/arsenal')).toEqual(route('arsenal'))
  })

  it('reads what the screen shows inside it', () => {
    expect(parseRoute('#/bestiary/swamp/Troll')).toEqual(
      route('bestiary', { path: ['swamp', 'Troll'] }),
    )
  })

  it('reads a search typed on the screen', () => {
    expect(parseRoute('#/bestiary?q=frappe%20au%20sol')).toEqual(
      route('bestiary', { query: 'frappe au sol' }),
    )
  })

  it('reads a modal over its screen', () => {
    expect(parseRoute('#/guide?modal=settings')).toEqual(route('guide', { modal: 'settings' }))
    expect(parseRoute('#/bestiary?modal=gear')).toEqual(route('bestiary', { modal: 'gear' }))
    expect(parseRoute('#/simulation?modal=world')).toEqual(route('simulation', { modal: 'world' }))
  })

  it('falls back to the Bestiary for a screen it does not know, and drops a modal it does not know', () => {
    expect(parseRoute('#/nowhere')).toEqual(route('bestiary'))
    expect(parseRoute('#/arsenal?modal=nope')).toEqual(route('arsenal'))
  })
})

describe('routeHash', () => {
  it('writes a screen, what it shows, its search and a modal over it', () => {
    expect(routeHash(route('simulation'))).toBe('#/simulation')
    expect(routeHash(route('simulation', { modal: 'settings' }))).toBe(
      '#/simulation?modal=settings',
    )
    expect(routeHash(route('bestiary', { path: ['swamp', 'Troll'], query: 'tro' }))).toBe(
      '#/bestiary/swamp/Troll?q=tro',
    )
  })

  it('writes what parseRoute reads back, whatever the names hold', () => {
    const routes: Route[] = [
      ...SCREENS.flatMap((screen) => [null, ...MODALS].map((modal) => route(screen, { modal }))),
      route('bestiary', { path: ['a b/c', 'é&?#'], query: 'l’Aîné & co' }),
    ]

    for (const written of routes) expect(parseRoute(routeHash(written))).toEqual(written)
  })
})
