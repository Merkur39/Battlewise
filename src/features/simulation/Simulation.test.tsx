import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const slam = { fighter: 'Troll', attack: 'troll_groundslam' }
const blocking = () => screen.getByRole('group', { name: 'En bloquant' })
const parrying = () => screen.getByRole('group', { name: 'En parant' })
const hitLink = (name: RegExp) => screen.getByRole('link', { name })

async function openPicker(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Choisir une attaque' }))
  return screen.findByRole('dialog', { name: 'Choisir une attaque' })
}

describe('Simulation', () => {
  it('simulates the attack of its address against your gear', () => {
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')

    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol, 70 dégâts$/)).toBeInTheDocument()
    expect(blocking()).toHaveTextContent('tient')
    expect(blocking()).toHaveTextContent('barre : 16,4 / 60')
    expect(parrying()).toHaveTextContent('tient')
    expect(screen.getByText('Bloque-le : tu tiens sans tituber')).toBeInTheDocument()
    expect(screen.getByText('Esquivable en roulade')).toBeInTheDocument()
    expect(screen.getByText(/^Cette attaque porte 2 coups/)).toBeInTheDocument()
  })

  it('weighs the bar already filled before the hit', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: '75 %' }))

    expect(blocking()).toHaveTextContent('ne passe pas')
    expect(blocking()).toHaveTextContent('barre : déborde')
    expect(parrying()).toHaveTextContent('tient')
    expect(screen.getByText('Pare-le : le blocage cède')).toBeInTheDocument()
  })

  it('weighs the stars of the monster', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: '2★' }))

    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol, 140 dégâts$/)).toBeInTheDocument()
    expect(blocking()).toHaveTextContent('ne passe pas')
  })

  it('takes a free value instead of an attack', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: 'Valeur libre' }))

    expect(screen.getByRole('group', { name: 'Dégâts du coup' })).toHaveTextContent('90')
    expect(screen.queryByText('Esquivable en roulade')).not.toBeInTheDocument()
    for (let step = 0; step < 8; step += 1) {
      await user.click(screen.getByRole('button', { name: 'Monter de 5' }))
    }
    expect(screen.getByRole('group', { name: 'Dégâts du coup' })).toHaveTextContent('130')
    expect(blocking()).toHaveTextContent('tu titubes')
    expect(screen.getByText('Pare-le : en bloquant, tu titubes')).toBeInTheDocument()
  })

  it('says when the item cannot parry', () => {
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')

    renderWithStore(<App />, {
      language: 'fr',
      gear: { ...MOCKUP_GEAR, blocker: 'ShieldWoodTower', level: 1 },
    })

    expect(parrying()).toHaveTextContent('Ton objet ne pare pas')
  })

  it('keeps the attacks simulated among the recent ones', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    const { store } = renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await waitFor(() => {
      expect(store.getState().recentAttacks).toEqual([slam])
    })
    await user.click(hitLink(/^Changer d'attaque/))

    const picker = await screen.findByRole('dialog', { name: 'Choisir une attaque' })
    const recent = within(picker).getByRole('region', { name: 'Récentes' })
    expect(within(recent).getByRole('link', { name: /^Troll · Frappe au sol/ })).toBeInTheDocument()
  })

  it('names the enemy after the biome it comes from when another bears its name', () => {
    window.history.replaceState(null, '', '#/simulation/Skeleton_Swamps/skeleton_sword_swamps')

    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    expect(
      hitLink(/^Changer d'attaque : Squelette · Marécages, Épée, 48 dégâts$/),
    ).toHaveTextContent('Squelette · Marécages · Épée')
  })

  it('picks an attack among the enemies of a biome, through the sheet of the creature', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.click(within(picker).getByRole('button', { name: 'Biome suivant : Forêt noire' }))
    await user.click(within(picker).getByRole('link', { name: /^Troll/ }))
    await screen.findByRole('heading', { level: 1, name: 'Troll' })
    await user.click(screen.getByRole('link', { name: /^Frappe au sol,/ }))

    expect(
      await screen.findByRole('link', { name: /^Changer d'attaque : Troll, Frappe au sol/ }),
    ).toBeInTheDocument()
  })

  it('opens an attack found by the search straight in the Simulation', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.type(
      within(picker).getByRole('searchbox', { name: 'Rechercher un ennemi ou une attaque' }),
      'frappe',
    )
    const attacks = await within(picker).findByRole('region', { name: /^Attaques · \d+$/ })
    await user.click(within(attacks).getByRole('link', { name: /^Troll · Frappe au sol/ }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol/)).toBeInTheDocument()
  })

  it('sets apart, in the search, the attacks of enemies of one name', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.type(
      within(picker).getByRole('searchbox', { name: 'Rechercher un ennemi ou une attaque' }),
      'épée',
    )

    const attacks = await within(picker).findByRole('region', { name: /^Attaques · \d+$/ })
    expect(
      within(attacks).getByRole('link', { name: /^Squelette · Montagne · Épée/ }),
    ).toBeInTheDocument()
  })

  describe('on a desktop', () => {
    it('picks an enemy, then one of its attacks, in the dialog', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/simulation')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      const picker = await openPicker(user)

      await user.click(within(picker).getByRole('button', { name: 'Biome suivant : Forêt noire' }))
      await user.click(within(picker).getByRole('button', { name: /^Troll/ }))
      await user.click(within(picker).getByRole('link', { name: /^Frappe au sol,/ }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Simulation' })).toBeInTheDocument()
    })
  })
})
