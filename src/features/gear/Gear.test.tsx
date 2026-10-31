import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, MOCKUP_PIECES, openContext, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

// The mockups' gear, worn as pieces rather than typed: the same armor, 45.
const WORN = { ...MOCKUP_GEAR, armor: 0, pieces: MOCKUP_PIECES }
const fr = { language: 'fr', gear: WORN } as const
const chip = () => screen.getByRole('link', { name: /^Ton équipement :/ })

async function openGear(user: UserEvent) {
  await openContext(user)
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

  it('names the zones of the gauges once, in a legend, on a phone', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).getByText('ne passe pas')).toBeInTheDocument()
    expect(within(withstand).getAllByText('sans tituber')).toHaveLength(3)
  })

  it('keeps the words beside the numbers on a desktop, with no legend', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).queryByText('ne passe pas')).not.toBeInTheDocument()
    expect(within(withstand).getByRole('group', { name: 'Bloquer' })).toHaveTextContent(
      'sans tituber 124 · tient 139',
    )
  })

  it('works out what you can take again as the gear changes, before it is saved', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })

    await user.clear(within(dialog).getByRole('textbox', { name: 'PV max' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'PV max' }), '200')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'En main' }), [
      'Écu en bois',
    ])

    expect(withstand).toHaveTextContent('Titube à 80 (40 % de 200 PV)')
    expect(within(withstand).getByRole('group', { name: 'Parer' })).toHaveTextContent(
      'ton objet ne pare pas',
    )
  })

  it('takes the Blocking skill in a field, as the max health', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const skill = within(dialog).getByRole('textbox', { name: 'Compétence Blocage' })

    expect(skill).toHaveValue('25')

    await user.clear(skill)
    await user.type(skill, '50')

    expect(within(dialog).getByRole('group', { name: 'Bloquer' })).toHaveTextContent('VD 90')
  })

  it('saves the gear on Valider: the chip follows', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual({ ...WORN, level: 2 })
    await openContext(user)
    expect(chip()).toHaveTextContent('N2 · VD 74,25')
  })

  it('changes nothing when closed without saving', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual(WORN)
  })

  it("keeps the level within the item's, past its max only for the Forge of Potential", async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const item = within(dialog).getByRole('combobox', { name: 'En main' })
    const raise = within(dialog).getByRole('button', { name: 'En main : niveau supérieur' })

    await user.selectOptions(item, ['Lanterne dvergr'])

    expect(within(dialog).getByRole('group', { name: 'En main : niveau 1' })).toHaveTextContent(
      'N1',
    )
    expect(raise).toBeDisabled()

    await user.selectOptions(item, ['Bouclier en argent'])
    for (let step = 1; step < 12; step += 1) {
      if (!(raise as HTMLButtonElement).disabled) await user.click(raise)
    }

    expect(within(dialog).getByRole('group', { name: 'En main : niveau 10' })).toBeInTheDocument()
  })

  describe('its armor pieces', () => {
    it('adds up the armor of the pieces worn, and the resistances they bring', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })
      expect(within(pieces).getByRole('combobox', { name: 'Casque' })).toHaveDisplayValue(
        'Casque en fer',
      )
      expect(within(pieces).getByRole('group', { name: 'Cape : niveau 3' })).toHaveTextContent('N3')
      expect(pieces).toHaveTextContent('Armure45')
      expect(pieces).toHaveTextContent('14 + 14 + 14 + 3')
      expect(within(pieces).getByRole('list', { name: 'Tes résistances' })).toHaveTextContent(
        'Glace · Résistant ×0,5',
      )
    })

    it('follows a piece and its level, a weakness included, and so does what you can take', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })

      await user.selectOptions(within(pieces).getByRole('combobox', { name: 'Plastron' }), [
        'Cuirasse de racines',
      ])
      await user.click(within(pieces).getByRole('button', { name: 'Cape : niveau supérieur' }))

      expect(pieces).toHaveTextContent('Armure40')
      expect(pieces).toHaveTextContent('14 + 8 + 14 + 4')
      const resistances = within(pieces).getByRole('list', { name: 'Tes résistances' })
      expect(resistances).toHaveTextContent('Perforant · Résistant ×0,5')
      expect(resistances).toHaveTextContent('Feu · Faible ×1,5')
      expect(within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })).toHaveTextContent(
        'armure 40',
      )
    })

    it('empties a slot with « Aucun », its level with it', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })

      await user.selectOptions(within(pieces).getByRole('combobox', { name: 'Casque' }), ['Aucun'])

      expect(pieces).toHaveTextContent('Armure31')
      expect(
        within(pieces).getByRole('button', { name: 'Casque : niveau supérieur' }),
      ).toBeDisabled()
    })

    it('shows a complete set, by its name in the game, and what it changes', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })

      for (const [slot, piece] of [
        ['Casque', 'Capuche de Fenris'],
        ['Plastron', 'Manteau de Fenris'],
        ['Jambières', 'Braies de Fenris'],
      ] as const) {
        await user.selectOptions(within(pieces).getByRole('combobox', { name: slot }), [piece])
      }

      const set = within(pieces).getByRole('group', { name: 'Ensemble complet' })
      expect(set).toHaveTextContent('Bénédiction de Fenris')
      expect(set).toHaveTextContent('Feu ×0,5')
      expect(within(pieces).getByRole('list', { name: 'Tes résistances' })).toHaveTextContent(
        'Feu · Résistant ×0,5',
      )
    })

    it("keeps an earlier player's typed armor until they pick a piece, which takes its place", async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      const dialog = await openGear(user)
      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })

      expect(pieces).toHaveTextContent('Armure45')
      expect(pieces).toHaveTextContent('Armure tapée avant cette version')

      await user.selectOptions(within(pieces).getByRole('combobox', { name: 'Plastron' }), [
        "Armure d'écailles de fer",
      ])
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear).toEqual({
        ...MOCKUP_GEAR,
        armor: 0,
        pieces: { chest: { id: 'ArmorIronChest', level: 1 } },
      })
    })
  })

  describe('on a desktop', () => {
    it('changes nothing on Annuler', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      const { store } = renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
      await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

      expect(dialog).not.toBeInTheDocument()
      expect(store.getState().gear).toEqual(WORN)
    })

    it('updates the verdicts of the Bestiary once saved', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.selectOptions(within(dialog).getByRole('combobox', { name: 'En main' }), [
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
