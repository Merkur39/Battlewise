import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import { game } from '@/data'
import type { GameBlocker } from '@/data/types'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'
import type { Report } from './model'
import { createOutbox, type Sender } from './outbox'

const ERROR = "Cannot read properties of undefined (reading 'hits')"

// What fails while drawing: one creature's assessment (its row, its sheet), one shield's data (its row of
// the Arsenal, which reads its name), the Simulation as a whole.
const failing: {
  creature: string | null
  hits: unknown
  shield: string | null
  simulation: boolean
} = vi.hoisted(() => ({
  creature: null,
  hits: null,
  shield: null,
  simulation: false,
}))

vi.mock('@/combat/attack', async (actual) => {
  const real = await actual<typeof import('@/combat/attack')>()
  return {
    ...real,
    attackDamage: (...args: Parameters<typeof real.attackDamage>) => {
      if (args[0] === failing.hits) throw new TypeError(ERROR)
      return real.attackDamage(...args)
    },
  }
})

vi.mock('@/features/bestiary/model', async (actual) => {
  const real = await actual<typeof import('@/features/bestiary/model')>()
  return {
    ...real,
    assess: (...args: Parameters<typeof real.assess>) => {
      if (args[0].id === failing.creature) throw new TypeError(ERROR)
      return real.assess(...args)
    },
  }
})

vi.mock('@/features/arsenal/model', async (actual) => {
  const real = await actual<typeof import('@/features/arsenal/model')>()
  return {
    ...real,
    arsenalRows: (...args: Parameters<typeof real.arsenalRows>) =>
      real
        .arsenalRows(...args)
        .map((row) =>
          row.blocker.id === failing.shield
            ? { ...row, blocker: { ...row.blocker, name: undefined } as unknown as GameBlocker }
            : row,
        ),
  }
})

vi.mock('@/features/simulation/SimulationScreen', async (actual) => {
  const real = await actual<typeof import('@/features/simulation/SimulationScreen')>()
  return {
    ...real,
    SimulationScreen: (props: Parameters<typeof real.SimulationScreen>[0]) => {
      if (failing.simulation) throw new TypeError(ERROR)
      return real.SimulationScreen(props)
    },
  }
})

beforeEach(() => {
  // React tells the console of every error a boundary catches.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  failing.creature = null
  failing.hits = null
  failing.shield = null
  failing.simulation = false
})

const sheet = () => within(screen.getByRole('dialog', { name: 'Signaler' }))
const sentReport = (sender: ReturnType<typeof vi.fn<Sender>>): Report | undefined =>
  sender.mock.calls[0]?.[0]

function renderApp(hash: string, sender: Sender = vi.fn<Sender>()) {
  window.history.replaceState(null, '', hash)
  renderWithStore(<App />, { language: 'fr' }, { outbox: createOutbox(null, sender) })
}

describe('When a row fails', () => {
  it('a creature of the list becomes a short row, the others stay, and it reports the crash', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 55 })
    failing.creature = 'Troll'
    renderApp('#/bestiary/blackForest', sender)

    const list = within(screen.getByRole('list', { name: 'Créatures du biome' }))
    expect(list.getByText('Cette ligne a planté')).toBeInTheDocument()
    expect(list.getByText('Troll')).toBeInTheDocument()
    expect(list.queryByRole('link', { name: /Troll/ })).not.toBeInTheDocument()
    expect(list.getByRole('link', { name: /Brute naingris/ })).toBeInTheDocument()

    await user.click(list.getByRole('button', { name: 'Signaler' }))
    expect(sheet().getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(sheet().getByRole('button', { name: 'Envoyer' }))

    expect(await sheet().findByText(/^Reçu, c'est le/)).toHaveTextContent("Reçu, c'est le #55")
    expect(sentReport(sender)).toMatchObject({
      kind: 'bug',
      subject: 'Troll',
      crash: { message: `TypeError: ${ERROR}` },
      context: { screen: 'bestiary', creature: 'Troll' },
    })
  })

  it('a creature the search finds fails the same way', () => {
    failing.creature = 'Troll'
    renderApp('#/bestiary/blackForest?q=troll')

    expect(screen.getByText('Cette ligne a planté')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signaler' })).toBeInTheDocument()
  })

  it('an attack the search finds becomes a short row, named by its creature', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 57 })
    const troll = game.creatures.find((creature) => creature.id === 'Troll')
    failing.hits = troll?.attacks.find((attack) => attack.ids[0] === 'troll_groundslam')?.hits
    renderApp('#/bestiary/blackForest?q=frappe', sender)

    expect(screen.getByText('Troll · Frappe au sol')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Signaler' }))
    await user.click(sheet().getByRole('button', { name: 'Envoyer' }))

    expect(await sheet().findByText(/^Reçu, c'est le/)).toBeInTheDocument()
    expect(sentReport(sender)).toMatchObject({
      subject: 'Troll · Ground slam',
      context: { screen: 'bestiary', creature: 'Troll', attack: 'troll_groundslam' },
    })
  })

  it('a shield whose data is broken becomes a short row of the Arsenal, the others stay', () => {
    failing.shield = 'ShieldBanded'
    renderApp('#/arsenal')

    const list = within(screen.getByRole('list', { name: 'Boucliers' }))
    expect(list.getByText('Cette ligne a planté')).toBeInTheDocument()
    expect(list.getByRole('button', { name: 'Signaler' })).toBeInTheDocument()
    expect(list.getByRole('link', { name: /Bouclier en argent/ })).toBeInTheDocument()
  })

  it('on a desktop, the table of the Arsenal keeps its other rows', () => {
    setViewportWidth('desktop')
    failing.shield = 'ShieldBanded'
    renderApp('#/arsenal')

    const table = within(screen.getByRole('table', { name: 'Boucliers' }))
    expect(table.getByText('Cette ligne a planté')).toBeInTheDocument()
    expect(table.getByRole('link', { name: /Bouclier en argent/ })).toBeInTheDocument()
  })
})

describe('When a screen fails', () => {
  it('shows its card between the bars, which stay, and tries again', async () => {
    const user = userEvent.setup()
    failing.simulation = true
    renderApp('#/simulation')

    expect(screen.getByRole('heading', { name: 'La Simulation a planté' })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Le reste de Battlewise marche : passe au Bestiaire, à l'Arsenal ou au Mémo.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeInTheDocument()

    failing.simulation = false
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(
      screen.queryByRole('heading', { name: 'La Simulation a planté' }),
    ).not.toBeInTheDocument()
  })

  it('reports it from its card, the screen attached', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 56 })
    failing.simulation = true
    renderApp('#/simulation', sender)

    await user.click(screen.getByRole('button', { name: 'Envoyer le rapport' }))
    await user.click(sheet().getByRole('button', { name: 'Envoyer' }))

    expect(await sheet().findByText(/^Reçu, c'est le/)).toHaveTextContent("Reçu, c'est le #56")
    expect(sentReport(sender)).toMatchObject({
      kind: 'bug',
      crash: { message: `TypeError: ${ERROR}` },
      context: { screen: 'simulation' },
    })
  })
})
