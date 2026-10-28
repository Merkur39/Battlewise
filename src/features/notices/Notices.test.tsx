import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import type { AppState } from '@/app/store'
import { renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

function renderApp(hash: string, state: Partial<AppState> = {}) {
  window.history.replaceState(null, '', hash)
  return renderWithStore(<App />, { language: 'fr', seenVersion: __APP_VERSION__, ...state })
}

const dialog = (name: string) => screen.getByRole('dialog', { name })

/** The page, as Settings › About opens it. */
async function openNotices() {
  const user = userEvent.setup()
  renderApp('#/bestiary?modal=settings')
  await user.click(within(dialog('Réglages')).getByRole('link', { name: /^Mentions et crédits/ }))
  return { user, notices: within(dialog('Mentions et crédits')) }
}

const expectNewTab = (link: HTMLElement, href: string) => {
  expect(link).toHaveAttribute('href', href)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener')
}

describe('Notices and credits', () => {
  it('opens from Settings › About, under what it holds, and goes back to Settings', async () => {
    const user = userEvent.setup()
    renderApp('#/bestiary?modal=settings')
    const row = within(dialog('Réglages')).getByRole('link', { name: /^Mentions et crédits/ })
    expect(row).toHaveTextContent('Projet de fan, crédits, tes données')

    await user.click(row)
    expect(window.location.hash).toBe('#/bestiary?modal=notices')
    await user.click(
      within(dialog('Mentions et crédits')).getByRole('button', { name: 'Retour aux réglages' }),
    )

    expect(dialog('Réglages')).toBeInTheDocument()
  })

  it('says the app is an unofficial fan project, and the game Iron Gate’s', async () => {
    const { notices } = await openNotices()

    expect(notices.getByRole('heading', { name: 'Projet de fan' })).toBeInTheDocument()
    expect(
      notices.getByText(
        "Foelore est un projet de fan, non officiel : ni Iron Gate ni Coffee Stain ne l'ont fait ni approuvé. Valheim, et les noms et données tirés du jeu, appartiennent à Iron Gate.",
      ),
    ).toBeInTheDocument()
  })

  it('credits the wiki’s contributors for the attack names, under CC BY-SA 3.0', async () => {
    const { notices } = await openNotices()

    expect(notices.getByText(/^Noms d'attaques/)).toHaveTextContent(
      "Noms d'attaques : en partie tirés du wiki Valheim, écrits par ses contributeurs, sous licence CC BY-SA 3.0. Les noms français en sont pour la plupart des traductions.",
    )
    expectNewTab(notices.getByRole('link', { name: 'wiki Valheim' }), 'https://valheim.fandom.com')
    expectNewTab(
      notices.getByRole('link', { name: 'CC BY-SA 3.0' }),
      'https://creativecommons.org/licenses/by-sa/3.0/',
    )
  })

  it('credits the fonts and the libraries, and links to their licences in full', async () => {
    const { notices } = await openNotices()

    expect(
      notices.getByText(
        'Polices : IBM Plex Sans et IBM Plex Mono, © IBM Corp., sous SIL Open Font License 1.1.',
      ),
    ).toBeInTheDocument()
    expect(
      notices.getByText(
        'Bibliothèques : React, © Meta Platforms, et Workbox, © Google, sous licence MIT.',
      ),
    ).toBeInTheDocument()
    expectNewTab(
      notices.getByRole('link', { name: /^Textes complets des licences/ }),
      '/licences.txt',
    )
  })

  it('tells the player what stays on the device, what a report makes public, and who sees what', async () => {
    const { notices } = await openNotices()

    expect(notices.getByRole('heading', { name: 'Tes données' })).toBeInTheDocument()
    expect(
      notices.getByText(
        "Tes réglages, ton équipement et la liste de tes signalements restent sur cet appareil. Pas de compte, pas de cookie, pas de mesure d'audience.",
      ),
    ).toBeInTheDocument()
    expect(
      notices.getByText(
        "Un signalement devient une issue publique sur GitHub, envoyée par Vercel : ton texte, ton pseudo si tu en donnes un, et ce que l'app joint. Ton pseudo peut aussi paraître dans les Nouveautés, pour te remercier.",
      ),
    ).toBeInTheDocument()
    expect(
      notices.getByText(
        "Pour suivre tes signalements, l'app demande leur état à GitHub. Comme pour tout site, Vercel, qui sert l'app, et GitHub voient l'adresse IP de ta connexion ; elle n'est jamais jointe à un signalement.",
      ),
    ).toBeInTheDocument()
  })

  it('gives an address to have a report or a nickname removed', async () => {
    const { notices } = await openNotices()

    expect(notices.getByText(/^Pour faire retirer/)).toHaveTextContent(
      'Pour faire retirer un signalement ou ton pseudo, écris à merkkur39@gmail.com.',
    )
    expect(notices.getByRole('link', { name: 'merkkur39@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:merkkur39@gmail.com',
    )
  })

  it('names its publisher and its host', async () => {
    const { notices } = await openNotices()

    expect(notices.getByRole('heading', { name: 'Mentions légales' })).toBeInTheDocument()
    expect(notices.getByText('Éditeur : Merkur39, à titre non professionnel.')).toBeInTheDocument()
    expect(
      notices.getByText(
        'Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
      ),
    ).toBeInTheDocument()
  })

  it('reads in English', async () => {
    const user = userEvent.setup()
    renderApp('#/bestiary?modal=settings', { language: 'en' })

    await user.click(within(dialog('Settings')).getByRole('link', { name: /^Notices and credits/ }))

    const notices = within(dialog('Notices and credits'))
    expect(notices.getByRole('heading', { name: 'Fan project' })).toBeInTheDocument()
    expect(notices.getByText(/^Attack names/)).toHaveTextContent(
      'Attack names: partly from the Valheim wiki, written by its contributors, under CC BY-SA 3.0. Most of the French names translate them.',
    )
    expect(notices.getByText(/^To have a report/)).toHaveTextContent(
      'To have a report or your nickname removed, write to merkkur39@gmail.com.',
    )
    expect(notices.getByText('Publisher: Merkur39, as a private individual.')).toBeInTheDocument()
    expect(
      notices.getByText('Host: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.'),
    ).toBeInTheDocument()
  })

  it('is a dialog with Back, and Close at its foot, on a desktop', async () => {
    setViewportWidth('desktop')
    const { user, notices } = await openNotices()

    expect(notices.getByRole('button', { name: 'Retour aux réglages' })).toBeInTheDocument()
    const closes = notices.getAllByRole('button', { name: 'Fermer' })
    expect(closes).toHaveLength(2)
    await user.click(closes[1]!)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
