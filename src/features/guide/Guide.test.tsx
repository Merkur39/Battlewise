import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const sheet = (title: string) =>
  screen.getByText(title, { selector: 'summary *' }).closest('details')

describe('Guide', () => {
  it('folds the rules into sheets, the first one open', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mémo')
    expect(sheet('Parade')).toHaveAttribute('open')
    expect(sheet('Roulade')).not.toHaveAttribute('open')
    expect(sheet('Roulade')).toHaveTextContent('15 end.')
  })

  it('lists the effects that change the rules from the game, with their names', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'fr' })

    const effects = sheet('Effets qui changent les règles')!
    // How they add up and the cold of the Mountain, then the 17 effects of 1.0.21 and the 3 capes
    // whose stats change a cost.
    expect(within(effects).getAllByRole('listitem')).toHaveLength(2 + 20)
    expect(effects).toHaveTextContent('20 effets')
    expect(effects).toHaveTextContent(
      'Pouvoir de Fader (pouvoir du gardien, 300 s) : Feu · Résistant ×0,5 ; stagger reçu ×0,5.',
    )
    expect(effects).toHaveTextContent(
      "Masse-d'Os (pouvoir du gardien, 300 s) : Contondant, Coupant et Perforant · Légèrement résistant ×0,75 ; bloquer ne coûte plus d'endurance et en rend 5 (10 sur une parade qui tient).",
    )
  })

  it('says first that resistances never multiply', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'fr' })

    const effects = sheet('Effets qui changent les règles')!
    expect(within(effects).getAllByRole('listitem')[0]).toHaveTextContent(
      "Pour un même type de dégâts, rien ne se multiplie : la meilleure résistance l'emporte, et une résistance l'emporte toujours sur une faiblesse.",
    )
  })

  it('says what the cold of the Mountain does without a frost resistance', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'fr' })

    const effects = sheet('Effets qui changent les règles')!
    expect(within(effects).getAllByRole('listitem')[1]).toHaveTextContent(
      "Montagne : hors du feu et des abris, « En train de geler » retire 1 PV par seconde et coupe la régénération de vie. Toute résistance à la glace l'évite, ainsi que le ralentissement des coups de glace, comme le Souffle glacial de Moder.",
    )
  })

  it('gives each effect its resistances, its armor and how long it lasts', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'fr' })

    const effects = sheet('Effets qui changent les règles')
    expect(effects).toHaveTextContent(
      'Hydromel des berserkir (consommable, 20 s) : Contondant, Coupant et Perforant · Faible ×1,5 ; endurance de blocage −80 % ; endurance de roulade −80 %.',
    )
    expect(effects).toHaveTextContent(
      "Broche en fer (bibelot, 30 s dès 65 d'adrénaline) : armure +20.",
    )
    expect(effects).toHaveTextContent(
      "Bénédiction de Fenris (bonus d'ensemble, 3 pièces) : Feu · Résistant ×0,5.",
    )
    expect(effects).toHaveTextContent(
      'Cape des cendres (équipement) : Glace · Résistant ×0,5 ; endurance de blocage −20 %.',
    )
  })

  it('keeps the sheets that hold the search, open', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/guide')
    renderWithStore(<App />, { language: 'fr' })

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher dans le mémo' }), 'sournoise')

    const rules = screen.getByRole('region', { name: 'Règles' })
    expect(within(rules).getAllByRole('group')).toHaveLength(1)
    expect(sheet('Combos et sournoise')).toHaveAttribute('open')
    expect(window.location.hash).toBe('#/guide?q=sournoise')
  })

  it('says when no rule holds the search', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/guide')
    renderWithStore(<App />, { language: 'fr' })

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher dans le mémo' }), 'xyz')

    expect(screen.getByText('Aucune règle ne correspond à « xyz ».')).toBeInTheDocument()
  })

  it('speaks English, game names included', () => {
    window.history.replaceState(null, '', '#/guide')

    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Guide')
    expect(sheet('Parry')).toHaveAttribute('open')
    expect(sheet('Effects that change the rules')).toHaveTextContent(
      'Fader (guardian power, 300 s): Fire · Resistant ×0.5; stagger taken ×0.5.',
    )
    expect(sheet('Effects that change the rules')).toHaveTextContent(
      'Iron Brooch (trinket, 30 s from 65 adrenaline): armor +20.',
    )
    expect(sheet('Effects that change the rules')).toHaveTextContent(
      'Bonemass (guardian power, 300 s): Blunt, Slash, and Pierce · Slightly resistant ×0.75; blocking costs no stamina and gives 5 back (10 on a parry that holds).',
    )
    expect(sheet('Effects that change the rules')).toHaveTextContent(
      'For one damage type, nothing multiplies: the best resistance wins, and a resistance always wins over a weakness.',
    )
    expect(sheet('Effects that change the rules')).toHaveTextContent(
      "Mountain: away from fire and shelter, “Freezing” takes 1 health a second and stops health regeneration. Any frost resistance spares you that, and the slow of frost hits too, such as Moder's Cold breath.",
    )
  })

  describe('on a desktop', () => {
    it('shows every sheet open, with a table of contents that leads to each', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/guide')
      renderWithStore(<App />, { language: 'fr' })

      const contents = screen.getByRole('navigation', { name: 'Sommaire du mémo' })
      expect(within(contents).getByRole('link', { name: /^Parade/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
      expect(screen.getByRole('heading', { level: 2, name: 'Roulade' })).toBeInTheDocument()

      await user.click(within(contents).getByRole('link', { name: /^Roulade/ }))

      expect(window.location.hash).toBe('#/guide/roll')
      expect(within(contents).getByRole('link', { name: /^Roulade/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })
  })
})
