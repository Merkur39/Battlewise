import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { game } from '@/data'
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

    const effects = sheet('Effets qui changent les règles')
    expect(effects).toHaveTextContent(`${String(game.ruleEffects.length)} effets`)
    expect(effects).toHaveTextContent('Pouvoir de Fader (pouvoir du gardien) : stagger reçu ×0,5.')
    expect(effects).toHaveTextContent(
      "Masse-d'Os (pouvoir du gardien) : bloquer ne coûte plus d'endurance et en rend 5.",
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
      'Fader (guardian power): stagger taken ×0.5.',
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
