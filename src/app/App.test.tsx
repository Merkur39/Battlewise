import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { deviceSpeaks, MOCKUP_GEAR, renderWithStore } from '../../test/utils'
import { setViewportWidth } from '../../test/viewport'
import { App } from './App'

const mainHeading = () => screen.getByRole('heading', { level: 1 })

describe('App', () => {
  it('names the app in its top bar', () => {
    renderWithStore(<App />)

    expect(within(screen.getByRole('banner')).getByText('Battlewise')).toBeInTheDocument()
  })

  it('opens on the Bestiary, named for screen readers and in the browser tab', () => {
    renderWithStore(<App />, { language: 'fr' })

    expect(mainHeading()).toHaveTextContent('Bestiaire')
    expect(document.title).toBe('Bestiaire — Battlewise')
    expect(screen.getByRole('link', { name: 'Bestiaire' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens on the screen of its address', () => {
    window.history.replaceState(null, '', '#/arsenal')

    renderWithStore(<App />, { language: 'fr' })

    expect(mainHeading()).toHaveTextContent('Arsenal')
  })

  it('moves to the tab chosen, and back through the history', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('link', { name: 'Simulation' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Simulation' })).toBeInTheDocument()
    expect(document.title).toBe('Simulation — Battlewise')
    expect(screen.getByRole('link', { name: 'Simulation' })).toHaveAttribute('aria-current', 'page')

    window.history.back()

    expect(await screen.findByRole('heading', { level: 1, name: 'Bestiaire' })).toBeInTheDocument()
  })

  it('sums up your gear and your world under the app name', () => {
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    const gear = screen.getByRole('link', {
      name: 'Ton équipement : Bouclier en argent niveau 3, VD 81, compétence Blocage 25',
    })
    expect(gear).toHaveTextContent('Bouclier en argent')
    expect(gear).toHaveTextContent('N3 · VD 81')
    const world = screen.getByRole('link', { name: 'Ton monde : combat normal, 1 joueur' })
    expect(world).toHaveTextContent('Normal')
    expect(world).toHaveTextContent('1 joueur · ×1')
  })

  it('follows your gear and your world as they change', () => {
    const { store } = renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    act(() => {
      store.update({
        gear: { ...MOCKUP_GEAR, blocker: 'ShieldWood', level: 1, skill: 0 },
        world: { difficulty: 'hard', players: 3 },
      })
    })

    expect(screen.getByRole('link', { name: /^Ton équipement/ })).toHaveTextContent(
      'Bouclier en boisN1 · VD',
    )
    expect(
      screen.getByRole('link', { name: 'Ton monde : combat difficile, 3 joueurs' }),
    ).toHaveTextContent('Difficile3 joueurs · ×1,62')
  })

  it('speaks English to an English-speaking device, game names included', () => {
    deviceSpeaks('en-GB')

    renderWithStore(<App />, { gear: MOCKUP_GEAR })

    expect(mainHeading()).toHaveTextContent('Bestiary')
    expect(document.title).toBe('Bestiary — Battlewise')
    expect(screen.getByRole('link', { name: /^Your gear/ })).toHaveTextContent(
      'Silver ShieldLv3 · Block 81',
    )
    expect(
      screen.getByRole('link', { name: 'Your world: normal combat, 1 player' }),
    ).toBeInTheDocument()
  })

  it('tells the browser which language the page speaks', () => {
    deviceSpeaks('fr-CA')
    const { store } = renderWithStore(<App />)

    expect(document.documentElement).toHaveAttribute('lang', 'fr')

    act(() => {
      store.update({ language: 'en' })
    })

    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it('paints the whole page in the chosen theme', () => {
    const { store } = renderWithStore(<App />, { theme: 'jour' })

    expect(document.documentElement).toHaveAttribute('data-theme', 'jour')

    act(() => {
      store.update({ theme: 'runes' })
    })

    expect(document.documentElement).toHaveAttribute('data-theme', 'runes')
  })

  describe('on a desktop', () => {
    it('gathers the navigation, your context and the settings in a sidebar', () => {
      setViewportWidth('desktop')

      renderWithStore(<App />, { language: 'fr' })

      const sidebar = screen.getByRole('navigation', { name: 'Navigation principale' })
      expect(within(sidebar).getByRole('link', { name: 'Bestiaire' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(within(sidebar).getByRole('link', { name: /^Ton équipement/ })).toBeInTheDocument()
      expect(within(sidebar).getByRole('link', { name: 'Réglages' })).toBeInTheDocument()
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(screen.getAllByRole('navigation')).toHaveLength(1)
    })

    it('switches layout when the window crosses the desktop width', () => {
      renderWithStore(<App />, { language: 'fr' })

      setViewportWidth('desktop')

      expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })
  })
})
