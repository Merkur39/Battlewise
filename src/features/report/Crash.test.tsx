import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import { Root } from '@/app/Root'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'
import type { Report } from './model'
import { createOutbox, type Sender } from './outbox'

const ERROR = "Cannot read properties of undefined (reading 'hits')"

// What fails while drawing: the creature sheet alone (only it asks for the stagger threshold), or the
// frame of every screen (it reads the place from the route).
const failing = vi.hoisted(() => ({ sheet: false, frame: false }))

vi.mock('@/combat/creature', async (actual) => {
  const real = await actual<typeof import('@/combat/creature')>()
  return {
    ...real,
    staggerThreshold: (...args: Parameters<typeof real.staggerThreshold>) => {
      if (failing.sheet) throw new TypeError(ERROR)
      return real.staggerThreshold(...args)
    },
  }
})

vi.mock('@/features/bestiary/place', async (actual) => {
  const real = await actual<typeof import('@/features/bestiary/place')>()
  return {
    ...real,
    placeOf: (...args: Parameters<typeof real.placeOf>) => {
      if (failing.frame) throw new TypeError(ERROR)
      return real.placeOf(...args)
    },
  }
})

beforeEach(() => {
  // React tells the console of every error a boundary catches.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  failing.sheet = false
  failing.frame = false
})

const sheet = () => screen.getByRole('dialog', { name: 'Signaler' })
const sentReport = (sender: ReturnType<typeof vi.fn<Sender>>): Report | undefined =>
  sender.mock.calls[0]?.[0]

function renderApp(hash: string, sender: Sender = vi.fn<Sender>(), root = false) {
  window.history.replaceState(null, '', hash)
  renderWithStore(
    root ? <Root /> : <App />,
    { language: 'fr' },
    { outbox: createOutbox(null, sender) },
  )
}

describe('When a creature sheet fails', () => {
  it('shows a card in its place, with the way back, and tries again', async () => {
    const user = userEvent.setup()
    failing.sheet = true
    renderApp('#/bestiary/blackForest/Troll')

    expect(screen.getByRole('heading', { name: 'Cette fiche a planté' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Le reste de Battlewise marche : change de monstre, ou passe à la Simulation.',
      ),
    ).toBeInTheDocument()

    failing.sheet = false
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(screen.queryByRole('heading', { name: 'Cette fiche a planté' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }),
    ).toBeInTheDocument()
  })

  it('reports it in the report sheet, Bug picked, the error attached, without a word', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 53 })
    failing.sheet = true
    renderApp('#/bestiary/blackForest/Troll', sender)

    await user.click(screen.getByRole('button', { name: 'Envoyer le rapport' }))

    const report = within(sheet())
    expect(report.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
    expect(
      report.getByRole('textbox', { name: 'Ce que tu faisais · facultatif' }),
    ).toBeInTheDocument()
    expect(report.getByRole('group', { name: 'Joint au signalement' })).toHaveTextContent(
      `TypeError: ${ERROR}`,
    )
    await user.click(report.getByRole('button', { name: 'Envoyer' }))

    expect(await report.findByText(/^Reçu, c'est le/)).toHaveTextContent("Reçu, c'est le #53")
    expect(sentReport(sender)).toMatchObject({
      kind: 'bug',
      text: '',
      subject: 'Troll',
      crash: { message: `TypeError: ${ERROR}` },
      context: { screen: 'creature', creature: 'Troll' },
    })
  })

  it('on a desktop, takes the panel only: the list of the biome stays', () => {
    setViewportWidth('desktop')
    failing.sheet = true
    renderApp('#/bestiary/blackForest/Troll')

    expect(screen.getByRole('heading', { name: 'Cette fiche a planté' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer le rapport' })).toBeInTheDocument()
  })
})

describe('When the frame of every screen fails', () => {
  it('shows the page of last resort, and reports from it', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 54 })
    failing.frame = true
    renderApp('#/bestiary/blackForest/Troll', sender, true)

    expect(screen.getByRole('heading', { name: 'Battlewise a planté' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Envoyer le rapport' }))
    const report = within(sheet())
    expect(report.getByRole('group', { name: 'Joint au signalement' })).toHaveTextContent(
      'Français · écran de 390 px',
    )
    await user.click(report.getByRole('button', { name: 'Envoyer' }))

    expect(await report.findByText(/^Reçu, c'est le/)).toHaveTextContent("Reçu, c'est le #54")
    expect(sentReport(sender)).toMatchObject({
      kind: 'bug',
      crash: { message: `TypeError: ${ERROR}` },
      context: { screen: 'app' },
    })
  })
})
