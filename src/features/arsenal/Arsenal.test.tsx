import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const fr = { language: 'fr', gear: MOCKUP_GEAR } as const

describe('Arsenal', () => {
  it('lists the shields at your skill and your level, the one you hold first', () => {
    window.history.replaceState(null, '', '#/arsenal')

    renderWithStore(<App />, fr)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arsenal')
    expect(screen.getByText(/^Chiffres calculés avec ta compétence Blocage/)).toHaveTextContent(
      'Blocage 25',
    )
    const items = within(screen.getByRole('list', { name: 'Boucliers' })).getAllByRole('link')
    expect(items[0]).toHaveAccessibleName(/^Bouclier en argent, équipé\./)
    expect(items[0]).toHaveTextContent('81')
    expect(items[0]).toHaveTextContent('121,5')
    expect(items[0]).toHaveTextContent('−5 %')
  })

  it('works every item out again at the level picked', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    renderWithStore(<App />, fr)

    await user.click(screen.getByRole('button', { name: 'Niveau supérieur' }))

    expect(screen.getByRole('group', { name: "Niveau d'amélioration" })).toHaveTextContent('N4')
    expect(screen.getByRole('link', { name: /^Bouclier en argent/ })).toHaveTextContent('87,75')
  })

  it('shows the weapons and the others on their own tabs', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    renderWithStore(<App />, fr)

    await user.click(screen.getByRole('button', { name: 'Armes' }))

    expect(window.location.hash).toBe('#/arsenal/weapons')
    expect(
      within(screen.getByRole('list', { name: 'Armes' })).getByRole('link', {
        name: /^Atgeir nordique\./,
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Autres' }))

    expect(
      within(screen.getByRole('list', { name: 'Autres' })).getByRole('link', { name: /^Torche\./ }),
    ).toHaveTextContent('N1 max')
  })

  it('opens Your gear with the item picked, which Valider saves', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Bouclier en sombracier\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })

    expect(within(dialog).getByRole('combobox', { name: 'Objet qui bloque' })).toHaveValue(
      'ShieldBlackmetal',
    )
    expect(within(dialog).getByRole('textbox', { name: 'Niveau' })).toHaveValue('3')

    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(store.getState().gear).toEqual({ ...MOCKUP_GEAR, blocker: 'ShieldBlackmetal' })
    expect(window.location.hash).toBe('#/arsenal')
  })

  it('leaves your gear alone when Your gear is closed without saving', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Bouclier en sombracier\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(store.getState().gear).toEqual(MOCKUP_GEAR)
  })

  describe('on a desktop', () => {
    it('shows a table, sorted as asked', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal')
      renderWithStore(<App />, fr)

      const table = screen.getByRole('table', { name: 'Boucliers' })
      expect(within(table).getByRole('columnheader', { name: 'VD' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )

      await user.selectOptions(screen.getByRole('combobox', { name: 'Trier par' }), ['Vitesse'])

      const rows = within(table).getAllByRole('row')
      // The header, then the item you hold, then the least slowed.
      expect(rows[1]).toHaveTextContent('Bouclier en argent')
      expect(rows[1]).toHaveTextContent('Équipé')
      expect(rows[2]).toHaveTextContent('Bouclier des racines')
      expect(within(table).getByRole('columnheader', { name: 'Vitesse' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
    })

    it('opens Your gear from Équiper', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal')
      renderWithStore(<App />, fr)

      await user.click(screen.getByRole('link', { name: 'Équiper : Targe nordique' }))

      const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
      expect(within(dialog).getByRole('combobox', { name: 'Objet qui bloque' })).toHaveValue(
        'ShieldGoldBuckler',
      )
    })
  })
})
