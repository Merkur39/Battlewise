import { describe, expect, it } from 'vitest'
import { MODALS, parseRoute, routeHash, SCREENS, type Route } from './routes'

describe('parseRoute', () => {
  it('opens on the Bestiary', () => {
    expect(parseRoute('')).toEqual({ screen: 'bestiary', modal: null })
    expect(parseRoute('#/')).toEqual({ screen: 'bestiary', modal: null })
  })

  it('reads the screen of the address', () => {
    expect(parseRoute('#/arsenal')).toEqual({ screen: 'arsenal', modal: null })
  })

  it('reads a modal over its screen', () => {
    expect(parseRoute('#/guide?modal=settings')).toEqual({ screen: 'guide', modal: 'settings' })
  })

  it('falls back to the Bestiary for a screen it does not know, and drops a modal it does not know', () => {
    expect(parseRoute('#/nowhere')).toEqual({ screen: 'bestiary', modal: null })
    expect(parseRoute('#/arsenal?modal=nope')).toEqual({ screen: 'arsenal', modal: null })
  })
})

describe('routeHash', () => {
  it('writes a screen, and a modal over it', () => {
    expect(routeHash({ screen: 'simulation', modal: null })).toBe('#/simulation')
    expect(routeHash({ screen: 'simulation', modal: 'settings' })).toBe(
      '#/simulation?modal=settings',
    )
  })

  it('writes what parseRoute reads back', () => {
    const routes: Route[] = SCREENS.flatMap((screen) =>
      [null, ...MODALS].map((modal) => ({ screen, modal })),
    )

    for (const route of routes) expect(parseRoute(routeHash(route))).toEqual(route)
  })
})
