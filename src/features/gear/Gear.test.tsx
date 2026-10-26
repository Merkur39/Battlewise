import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const fr = { language: 'fr', gear: MOCKUP_GEAR } as const
const chip = () => screen.getByRole('link', { name: /^Ton équipement :/ })

async function openGear(user: UserEvent) {
  await user.click(chip())
  return screen.findByRole('dialog', { name: 'Ton équipement' })
}

describe('Your gear', () => {
  it('opens from its chip and shows what you can take with an empty bar', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    const block = within(withstand).getByRole('group', { name: 'Bloquer' })
    expect(block).toHaveTextContent('VD 81')
    expect(block).toHaveTextContent('sans tituber 124 · tient 139')
    const parry = within(withstand).getByRole('group', { name: 'Parer' })
    expect(parry).toHaveTextContent('VD 121,5')
    expect(parry).toHaveTextContent('sans tituber 151 · tient 170')
    expect(withstand).toHaveTextContent('Titube à 60 (40 % de 150 PV) · armure 45')
  })

  it('works out what you can take again as the gear changes, before it is saved', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })

    await user.clear(within(dialog).getByRole('textbox', { name: 'PV max' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'PV max' }), '200')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Objet qui bloque' }), [
      'Écu en bois',
    ])

    expect(withstand).toHaveTextContent('Titube à 80 (40 % de 200 PV)')
    expect(within(withstand).getByRole('group', { name: 'Parer' })).toHaveTextContent(
      'ton objet ne pare pas',
    )
  })

  it('saves the gear on Valider: the chip follows', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'Niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual({ ...MOCKUP_GEAR, level: 2 })
    expect(chip()).toHaveTextContent('N2 · VD 74,25')
  })

  it('changes nothing when closed without saving', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'Niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual(MOCKUP_GEAR)
  })

  it("keeps the level within the item's, past its max only for the Forge of Potential", async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const item = within(dialog).getByRole('combobox', { name: 'Objet qui bloque' })
    const level = within(dialog).getByRole('textbox', { name: 'Niveau' })
    const raise = within(dialog).getByRole('button', { name: 'Niveau supérieur' })

    await user.selectOptions(item, ['Lanterne dvergr'])

    expect(level).toHaveValue('1')
    expect(raise).toBeDisabled()
    expect(dialog).toHaveTextContent("Cet objet ne s'améliore pas.")

    await user.selectOptions(item, ['Bouclier en argent'])
    for (let step = 1; step < 12; step += 1) {
      if (!(raise as HTMLButtonElement).disabled) await user.click(raise)
    }

    expect(level).toHaveValue('10')
    expect(dialog).toHaveTextContent(
      '+6 de VD par niveau ; au-delà du niveau 3 : Forge du potentiel.',
    )
  })

  describe('on a desktop', () => {
    it('changes nothing on Annuler', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      const { store } = renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'Niveau inférieur' }))
      await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

      expect(dialog).not.toBeInTheDocument()
      expect(store.getState().gear).toEqual(MOCKUP_GEAR)
    })

    it('updates the verdicts of the Bestiary once saved', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Objet qui bloque' }), [
        'Écu en bois',
      ])
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(screen.getByRole('group', { name: 'Ta parade' })).toHaveTextContent(
        'Ton objet ne pare pas',
      )
    })

    it('opens from the Simulation, where the thresholds are not', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, fr)

      await user.click(screen.getByRole('link', { name: 'Tes seuils sont dans Ton équipement' }))

      expect(await screen.findByRole('dialog', { name: 'Ton équipement' })).toBeInTheDocument()
    })
  })
})
