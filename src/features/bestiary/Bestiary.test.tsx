import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const list = () => screen.getByRole('list', { name: 'Créatures du biome' })
const row = (name: string) => within(list()).getByRole('link', { name: new RegExp(`^${name}`) })
const sheetHeading = (name: string) => screen.findByRole('heading', { level: 1, name })
const chips = (name: string) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

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

  it('sums up the weaknesses and resistances, tools included, in the words of the game', () => {
    window.history.replaceState(null, '', '#/bestiary/mountain/StoneGolem')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances')).toEqual([
      'Pioche · Très faible ×2',
      'Coupant · Résistant ×0,5',
      'Perforant · Résistant ×0,5',
      'Feu · Immunisé ×0',
      'Glace · Immunisé ×0',
      'Poison · Immunisé ×0',
      'Esprit · Immunisé ×0',
    ])
    expect(screen.getByText('Tout le reste ×1')).toBeInTheDocument()
  })

  it('gives a weak spot its own row beside the body, by the name of the part', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances · Corps')).toEqual([
      'Perforant · Faible ×1,5',
      'Contondant · Résistant ×0,5',
      'Esprit · Immunisé ×0',
    ])
    expect(chips('Faiblesses et résistances · Tête')).toEqual([
      'Perforant · Très faible ×2',
      'Esprit · Immunisé ×0',
    ])
    expect(screen.getAllByText('Tout le reste ×1')).toHaveLength(2)
  })

  it('shows a tool taken normally without a word, the game having none', () => {
    window.history.replaceState(null, '', '#/bestiary/deepNorth/Barka')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances')).toContain('Couper ×1')
  })

  it('adds the trampling of a creature that runs into you, without a way to the Simulation', () => {
    window.history.replaceState(null, '', '#/bestiary/plains/Lox')
    renderWithStore(<App />, { language: 'fr' })

    expect(
      screen.getByText(/^Écrasement, contondant, 20 dégâts\. Blocage : \S.*\. Esquivable\.$/),
    ).toBeInTheDocument()
    expect(screen.getByText('En course', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Écrasement/ })).not.toBeInTheDocument()
  })

  it('tells what the death of a creature deals, under its own heading', () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Writhan')
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByText('À sa mort')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Explosion, contondant et poison, 100 dégâts. Blocage : imparable. Parade : imparable. Esquivable.',
      ),
    ).toBeInTheDocument()
  })

  it('opens the sheet of a creature a death brings, as many as the stars make', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/swamp/BlobElite')
    renderWithStore(<App />, { language: 'fr' })

    const blobs = screen.getByRole('link', { name: 'Blob ×2. Ouvrir la fiche Blob.' })
    expect(blobs).toHaveAttribute('href', '#/bestiary/swamp/Blob')

    await user.click(blobs)

    expect(await sheetHeading('Blob')).toBeInTheDocument()
  })

  it('puts what the end of a phase brings under that phase', () => {
    window.history.replaceState(null, '', '#/bestiary/deepNorth/FrozenKing')
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByText('Fin de la phase')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Aspect du Cerf de l'orage ×1\./ })).toHaveAttribute(
      'href',
      '#/bestiary/deepNorth/Aspect_Eikthyr',
    )
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

  it('sets apart, by the biome they come from, the creatures a biome lists under one name', () => {
    window.history.replaceState(null, '', '#/bestiary/meadows')
    renderWithStore(<App />, { language: 'fr' })

    const skeletons = within(list()).getAllByRole('link', { name: /^Squelette/ })
    expect(skeletons).toHaveLength(2)
    expect(skeletons[0]).toHaveTextContent(/^Squelette · Prairies\s?30 PV/)
    expect(skeletons[1]).toHaveTextContent(/^Squelette\s?40 PV/)
  })

  it('names the sheet after the biome the creature comes from', async () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Skeleton_Swamps')
    renderWithStore(<App />, { language: 'fr' })

    expect(await sheetHeading('Squelette · Marécages')).toBeInTheDocument()
    expect(document.title).toBe('Squelette · Marécages — Battlewise')
  })

  it('finds the creatures of one name apart', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'squelette',
    )

    const creatures = await screen.findByRole('region', { name: /^Créatures · \d+$/ })
    expect(within(creatures).getByRole('link', { name: /^Squelette · Montagne/ })).toHaveAttribute(
      'href',
      '#/bestiary/mountain/Skeleton_Mountains?q=squelette',
    )
  })

  it('speaks English, the names of the game included', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Troll' })).toBeInTheDocument()
    expect(screen.getByText('Black Forest')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Ground slam,/ })).toHaveTextContent('Blunt')
    expect(chips('Weaknesses and resistances · Body')[0]).toBe('Pierce · Weak ×1.5')
    expect(chips('Weaknesses and resistances · Head')[0]).toBe('Pierce · Very weak ×2')
  })

  it('sets namesakes apart in English too', () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Skeleton_Swamps')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Skeleton · Swamp' })).toBeInTheDocument()
  })

  it('names trampling and death in English too', () => {
    window.history.replaceState(null, '', '#/bestiary/plains/Lox')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByText(/^Trample, blunt, 20 damage\./)).toBeInTheDocument()
    expect(screen.getByText('When running', { exact: false })).toBeInTheDocument()
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
      expect(
        screen.getByRole('heading', { level: 2, name: 'Squelette · Prairies' }),
      ).toBeInTheDocument()

      await user.click(row('Troll'))

      expect(await screen.findByRole('heading', { level: 2, name: 'Troll' })).toBeInTheDocument()
      expect(row('Troll')).toHaveAttribute('aria-current', 'true')
      expect(screen.getByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    })

    it('puts what a death brings in the table, with a way to its sheet', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/swamp/BlobElite')
      renderWithStore(<App />, { language: 'fr' })

      const table = screen.getByRole('table', { name: 'Ses attaques' })
      expect(within(table).getByRole('columnheader', { name: 'À sa mort' })).toBeInTheDocument()
      expect(
        within(table).getByRole('link', { name: 'Blob ×2. Ouvrir la fiche Blob.' }),
      ).toHaveTextContent('Sa fiche')
    })

    it('gives trampling its range, when running', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr' })

      const trample = screen.getByRole('row', { name: /^Écrasement/ })
      expect(trample).toHaveTextContent('En course')
      expect(within(trample).queryByRole('link')).not.toBeInTheDocument()
    })

    it('gives the death blast its radius', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/swamp/Writhan')
      renderWithStore(<App />, { language: 'fr' })

      const rows = screen.getAllByRole('row', { name: /^Explosion/ })
      expect(rows).toHaveLength(2)
      expect(rows[1]).toHaveTextContent('6 m')
      expect(within(rows[1]!).queryByRole('link')).not.toBeInTheDocument()
    })
  })
})
