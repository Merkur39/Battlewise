import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import type { AppState } from '@/app/store'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'
import type { Report } from './model'
import { createOutbox, SendError, type Sender } from './outbox'

// The versions of these journeys: the one the app runs fixes issue 48, Ragnar's report.
vi.mock('@/app/releases', async (actual) => ({
  ...(await actual<typeof import('@/app/releases')>()),
  RELEASES: [
    {
      version: __APP_VERSION__,
      date: '2026-11-02',
      notes: [
        {
          text: {
            fr: 'Troll › Frappe au sol : 60 dégâts, plus 70.',
            en: 'Troll › Ground slam: 60.',
          },
          fixes: [48],
          thanks: ['Ragnar'],
        },
        { text: { fr: 'Mes signalements, dans Réglages.', en: 'My reports, in Settings.' } },
      ],
    },
    {
      version: '1.0.0',
      date: '2026-10-20',
      notes: [{ text: { fr: 'La première version.', en: 'The first version.' } }],
    },
  ],
}))

const report = (kind: Report['kind'], text: string): Report => ({
  kind,
  text,
  website: '',
  context: {
    version: '1.0.0',
    gameVersion: '0.221.4',
    language: 'fr',
    width: 390,
    screen: 'settings',
    shows: [],
  },
})

/** Ragnar's report #48, fixed; #52, open on GitHub; an idea still on the device. */
async function reportsOnDevice() {
  const send = vi
    .fn<Sender>()
    .mockResolvedValueOnce({ number: 48 })
    .mockResolvedValueOnce({ number: 52 })
    .mockRejectedValue(new SendError(null))
  const outbox = createOutbox(null, send)
  await outbox.submit(
    { ...report('data', 'Elle fait 60.'), nickname: 'Ragnar' },
    'Troll › Frappe au sol',
  )
  await outbox.submit(report('bug', 'La fiche reste vide.'), 'La fiche reste vide.')
  await outbox.submit(report('idea', 'Les boss phase par phase.'), 'Les boss phase par phase.')
  return outbox
}

function githubSays() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = input instanceof Request ? input.url : input.toString()
    return Promise.resolve(
      url.endsWith('/52')
        ? Response.json({ state: 'open', state_reason: null })
        : Response.json({ state: 'closed', state_reason: 'completed' }),
    )
  })
}

async function renderApp(hash: string, state: Partial<AppState> = {}) {
  window.history.replaceState(null, '', hash)
  const outbox = await reportsOnDevice()
  return { outbox, ...renderWithStore(<App />, { language: 'fr', ...state }, { outbox }) }
}

const dialog = (name: string) => screen.getByRole('dialog', { name })

describe('Closing the loop', () => {
  it('shows Your feedback in Settings, with the reports sent and fixed, and the latest version', async () => {
    await renderApp('#/bestiary?modal=settings', { seenVersion: __APP_VERSION__ })

    const settings = within(dialog('Réglages'))
    expect(settings.getByRole('link', { name: /^Mes signalements/ })).toHaveTextContent(
      '3 envoyés · 1 corrigé',
    )
    expect(settings.getByRole('link', { name: /^Nouveautés/ })).toHaveTextContent(__APP_VERSION__)
  })

  it('lists the reports sent from this device, newest first, their state read from GitHub', async () => {
    const user = userEvent.setup()
    const fetch = githubSays()
    await renderApp('#/bestiary?modal=settings', { seenVersion: __APP_VERSION__ })

    await user.click(within(dialog('Réglages')).getByRole('link', { name: /^Mes signalements/ }))

    const reports = within(dialog('Mes signalements'))
    expect(await reports.findByText('Ouvert')).toBeInTheDocument()
    const rows = reports.getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Les boss phase par phase.*En attente d'envoi/),
      expect.stringMatching(/La fiche reste vide\..*#52.*Ouvert/),
      expect.stringMatching(/Troll › Frappe au sol.*#48.*Corrigé dans/),
    ])
    expect(reports.getByRole('link', { name: /Troll › Frappe au sol/ })).toHaveAttribute(
      'href',
      'https://github.com/Merkur39/Battlewise/issues/48',
    )
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/Merkur39/Battlewise/issues/52',
      expect.anything(),
    )
  })

  it('goes back to Settings from My reports', async () => {
    const user = userEvent.setup()
    githubSays()
    await renderApp('#/bestiary?modal=reports', { seenVersion: __APP_VERSION__ })

    await user.click(
      within(dialog('Mes signalements')).getByRole('button', { name: 'Retour aux réglages' }),
    )

    expect(dialog('Réglages')).toBeInTheDocument()
  })

  it('shows what each version brings, and thanks the players who reported it', async () => {
    const user = userEvent.setup()
    await renderApp('#/bestiary?modal=settings', { seenVersion: __APP_VERSION__ })

    await user.click(within(dialog('Réglages')).getByRole('link', { name: /^Nouveautés/ }))

    const news = within(dialog('Nouveautés'))
    expect(
      news.getByRole('heading', { name: new RegExp(`^${__APP_VERSION__}`) }),
    ).toBeInTheDocument()
    expect(news.getByText('Troll › Frappe au sol : 60 dégâts, plus 70.')).toBeInTheDocument()
    expect(news.getByText(/^Merci Ragnar/)).toHaveTextContent('Merci Ragnar · ton signalement #48')
    expect(news.getByText('La première version.')).toBeInTheDocument()
  })

  it('thanks the player once, after the update that fixed their report', async () => {
    const user = userEvent.setup()
    const { store } = await renderApp('#/bestiary', { seenVersion: '1.0.0' })

    const thanks = within(await screen.findByRole('dialog', { name: 'Corrigé grâce à toi' }))
    expect(thanks.getByText('Troll › Frappe au sol')).toBeInTheDocument()
    expect(thanks.getByText('Troll › Frappe au sol : 60 dégâts, plus 70.')).toBeInTheDocument()
    expect(
      thanks.getByText(
        `Ton signalement est corrigé dans ${__APP_VERSION__}. Merci, Ragnar : chaque correction sert à tous les joueurs.`,
      ),
    ).toBeInTheDocument()
    expect(store.getState().seenVersion).toBe(__APP_VERSION__)

    await user.click(thanks.getByRole('link', { name: 'Voir les nouveautés' }))
    expect(dialog('Nouveautés')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Corrigé grâce à toi' })).not.toBeInTheDocument()
  })

  it('says nothing on the first launch, which has no version before it', async () => {
    const { store } = await renderApp('#/bestiary')

    await waitFor(() => {
      expect(store.getState().seenVersion).toBe(__APP_VERSION__)
    })
    expect(screen.queryByRole('dialog', { name: 'Corrigé grâce à toi' })).not.toBeInTheDocument()
  })

  it('is a dialog with Close on a desktop', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    await renderApp('#/bestiary', { seenVersion: '1.0.0' })

    const thanks = within(await screen.findByRole('dialog', { name: 'Corrigé grâce à toi' }))
    // The close button at its head, and Close at its foot.
    const closes = thanks.getAllByRole('button', { name: 'Fermer' })
    expect(closes).toHaveLength(2)
    await user.click(closes[1]!)

    expect(screen.queryByRole('dialog', { name: 'Corrigé grâce à toi' })).not.toBeInTheDocument()
  })
})
