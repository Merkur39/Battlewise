import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const list = () => screen.getByRole('list', { name: 'Créatures du biome' })
const row = (name: string) => within(list()).getByRole('link', { name: new RegExp(`^${name}`) })
const sheetHeading = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('Bestiary', () => {
  it('lists the creatures of the Meadows first, with their health and how to take them', () => {
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Prairies')
    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent(
      'Biome 1 sur 9 · 9 créatures',
    )
    expect(row('Sanglier')).toHaveTextContent('10 PV')
    expect(
      within(row('Sanglier')).getByRole('img', { name: 'Blocage : tient' }),
    ).toBeInTheDocument()
    expect(row('Sanglier')).toHaveTextContent('Tu bloques tout sans tituber')
    expect(row('Eikthyr')).toHaveTextContent('Boss · 500 PV')
  })

  it('moves from biome to biome', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('button', { name: 'Biome suivant : Forêt noire' }))

    expect(await screen.findByText('Biome 2 sur 9 · 12 créatures')).toBeInTheDocument()
    expect(row('Troll')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest')
    expect(screen.getByRole('button', { name: 'Biome précédent : Prairies' })).toBeEnabled()
  })

  it('opens the sheet of a creature, in place of the bars on a phone, and comes back', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/blackForest')
    renderWithStore(<App />, { language: 'fr' })

    await user.click(row('Troll'))

    expect(await sheetHeading('Troll')).toBeInTheDocument()
    expect(document.title).toBe('Troll — Battlewise')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByText('Forêt noire')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Retour' }))

    expect(await screen.findByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest')
  })

  it('shows the creature at the stars picked', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })
    const punch = () => screen.getByRole('link', { name: /^Coup de poing,/ })

    expect(screen.getByRole('group', { name: 'Points de vie' })).toHaveTextContent('600')
    expect(punch()).toHaveTextContent('60')

    await user.click(screen.getByRole('button', { name: '1★' }))

    expect(screen.getByRole('button', { name: '1★' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Points de vie' })).toHaveTextContent('1 200')
    expect(punch()).toHaveTextContent('90')
  })

  it('sums up the weaknesses and resistances, in the words of the game', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })

    const modifiers = screen.getByRole('list', { name: 'Faiblesses et résistances' })
    expect(
      within(modifiers)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Perforant · Faible ×1,5', 'Contondant · Résistant ×0,5', 'Esprit · Immunisé ×0'])
    expect(screen.getByText('Tout le reste ×1')).toBeInTheDocument()
  })

  it('gives each attack its damage types, its verdicts and a way to the Simulation', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })

    const slam = screen.getByRole('link', { name: /^Frappe au sol,/ })
    expect(slam).toHaveAccessibleName(
      /^Frappe au sol, contondant, 70 dégâts\. Blocage : \S.*\. Parade : \S.*\. Esquivable\. Ouvrir la simulation\.$/,
    )
    expect(slam).toHaveTextContent('Contondant')
    expect(slam).toHaveAttribute('href', '#/simulation/Troll/troll_groundslam')
  })

  it('tells when the item cannot parry', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, {
      language: 'fr',
      gear: { ...MOCKUP_GEAR, blocker: 'ShieldWoodTower', level: 1 },
    })

    expect(screen.getByRole('group', { name: 'Ta parade' })).toHaveTextContent(
      'Ton objet ne pare pas',
    )
  })

  it('finds a creature or an attack in every biome, and opens its sheet', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'frappe',
    )

    const attacks = await screen.findByRole('region', { name: /^Attaques · \d+$/ })
    await user.click(within(attacks).getByRole('link', { name: /^Troll, Frappe au sol,/ }))

    expect(await sheetHeading('Troll')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest/Troll?q=frappe')
  })

  it('clears the search back to the biome', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'troll',
    )

    await user.click(await screen.findByRole('button', { name: 'Effacer la recherche' }))

    expect(await screen.findByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' })).toHaveValue(
      '',
    )
  })

  it('speaks English, the names of the game included', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Troll' })).toBeInTheDocument()
    expect(screen.getByText('Black Forest')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Ground slam,/ })).toHaveTextContent('Blunt')
    expect(
      within(screen.getByRole('list', { name: 'Weaknesses and resistances' })).getAllByRole(
        'listitem',
      )[0],
    ).toHaveTextContent('Pierce · Weak ×1.5')
  })

  it('brings the tab back to the biome it was left on', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/swamp')
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('link', { name: 'Simulation' }))
    await screen.findByRole('heading', { level: 1, name: 'Simulation' })
    await user.click(screen.getByRole('link', { name: 'Bestiaire' }))

    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Marécages')
    })
  })

  describe('on a desktop', () => {
    it('shows the list and the sheet side by side, the first creature to begin with', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest')
      renderWithStore(<App />, { language: 'fr' })

      expect(screen.getByRole('heading', { level: 1, name: 'Bestiaire' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Squelette' })).toBeInTheDocument()

      await user.click(row('Troll'))

      expect(await screen.findByRole('heading', { level: 2, name: 'Troll' })).toBeInTheDocument()
      expect(row('Troll')).toHaveAttribute('aria-current', 'true')
      expect(screen.getByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    })
  })
})
