import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const chip = () => screen.getByRole('link', { name: /^Ton monde :/ })

async function openWorld(user: UserEvent) {
  await user.click(chip())
  return screen.findByRole('dialog', { name: 'Ton monde' })
}

describe('Your world', () => {
  it('opens from its chip on the Combat settings of the game, with the presets that pick them', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    const dialog = await openWorld(user)

    expect(within(dialog).getByRole('radio', { name: 'Normal ×1' })).toBeChecked()
    expect(
      within(dialog).getByRole('radio', { name: 'Très facile, Tranquille ×0,5' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('radio', { name: 'Très difficile, Cauchemar ×2' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(dialog).getByRole('button', { name: '5 ou plus' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Joueurs à moins de 100 m, toi compris')
  })

  it('shows what a world does before it is saved', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })
    const dialog = await openWorld(user)

    await user.click(within(dialog).getByRole('radio', { name: 'Difficile ×1,5' }))
    await user.click(within(dialog).getByRole('button', { name: '3' }))

    const effects = within(dialog).getByRole('region', { name: 'Ce que ça donne' })
    expect(within(effects).getByRole('group', { name: 'Coups des monstres' })).toHaveTextContent(
      '×1,62',
    )
    expect(
      within(effects).getByRole('group', { name: 'Tes dégâts et ton stagger' }),
    ).toHaveTextContent('×0,53')
    expect(within(effects).getByRole('group', { name: "Chance d'étoiles" })).toHaveTextContent(
      '×1,2',
    )
  })

  it('changes nothing when closed without saving', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openWorld(user)

    await user.click(within(dialog).getByRole('radio', { name: 'Difficile ×1,5' }))
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().world).toEqual({ difficulty: 'normal', players: 1 })
  })

  it('saves the world on Valider: the chip and what to inflict follow', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    const { store } = renderWithStore(<App />, { language: 'fr' })
    expect(screen.getByRole('group', { name: 'À infliger' })).toHaveTextContent('180')
    const dialog = await openWorld(user)

    await user.click(within(dialog).getByRole('radio', { name: 'Difficile ×1,5' }))
    await user.click(within(dialog).getByRole('button', { name: '3' }))
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(store.getState().world).toEqual({ difficulty: 'hard', players: 3 })
    expect(chip()).toHaveTextContent('Difficile3 joueurs · ×1,62')
    expect(screen.getByRole('group', { name: 'À infliger' })).toHaveTextContent('339')
  })
})
