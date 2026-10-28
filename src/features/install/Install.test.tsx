import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import type { AppState } from '@/app/store'
import { renderWithStore } from '../../../test/utils'
import { setDisplayMode, setViewportWidth } from '../../../test/viewport'
import { listenForInstallPrompt } from './prompt'
import { InstallPromptContext } from './useInstall'

const IPHONE_SAFARI_26 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'

/** A browser that offers its own prompt (Chrome, Edge), when the test says it does. */
function chromium() {
  const target = new EventTarget()
  const install = listenForInstallPrompt(target)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
  })
  return {
    install,
    event,
    offers: () => {
      act(() => {
        target.dispatchEvent(event)
      })
    },
    installs: () => {
      act(() => {
        target.dispatchEvent(new Event('appinstalled'))
      })
    },
  }
}

const safariOnIPhone = () =>
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI_26)

function launch(
  browser: ReturnType<typeof chromium> = chromium(),
  state: Partial<AppState> = { language: 'fr' },
) {
  return renderWithStore(
    <InstallPromptContext value={browser.install}>
      <App />
    </InstallPromptContext>,
    state,
  )
}

const offer = () => screen.queryByRole('dialog', { name: 'Installe Battlewise' })

async function openSettings(user: UserEvent) {
  await user.click(screen.getByRole('link', { name: 'Réglages' }))
  return screen.findByRole('dialog', { name: 'Réglages' })
}

describe('Offering to install Battlewise', () => {
  it('offers it over the whole screen at the first launch, where the browser can install it', () => {
    const browser = chromium()
    browser.offers()

    launch(browser)

    const dialog = screen.getByRole('dialog', { name: 'Installe Battlewise' })
    expect(dialog).toHaveTextContent("Pour l'avoir sous la main, à côté du jeu.")
    expect(dialog).toHaveTextContent("Une icône sur ton écran d'accueil")
    expect(dialog).toHaveTextContent("En plein écran, sans barre d'adresse")
    expect(dialog).toHaveTextContent('Marche sans connexion')
    expect(dialog).toHaveTextContent('Tu la retrouves dans Réglages › À propos.')
  })

  it('opens the browser’s prompt from « Installer », and leaves the app to it', async () => {
    const user = userEvent.setup()
    const browser = chromium()
    browser.offers()
    launch(browser)

    await user.click(screen.getByRole('button', { name: 'Installer' }))

    expect(browser.event.prompt).toHaveBeenCalledOnce()
    expect(offer()).not.toBeInTheDocument()
  })

  it('offers it once: shown, it is offered, whatever the player does next', () => {
    const browser = chromium()
    browser.offers()

    const { store } = launch(browser)

    expect(offer()).toBeInTheDocument()
    expect(store.getState().installOffered).toBe(true)
  })

  it('goes on in the browser, and does not offer it again', async () => {
    const user = userEvent.setup()
    const browser = chromium()
    browser.offers()
    launch(browser)

    await user.click(screen.getByRole('button', { name: 'Continuer dans le navigateur' }))

    expect(offer()).not.toBeInTheDocument()
    expect(browser.event.prompt).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1, name: 'Bestiaire' })).toBeInTheDocument()
  })

  it('offers it no more to a player it was offered to', () => {
    const browser = chromium()
    browser.offers()

    launch(browser, { language: 'fr', installOffered: true })

    expect(offer()).not.toBeInTheDocument()
  })

  it('offers it when the browser’s prompt comes a moment after the app', () => {
    const browser = chromium()
    launch(browser)
    expect(offer()).not.toBeInTheDocument()

    browser.offers()

    expect(offer()).toBeInTheDocument()
  })

  it('gives Safari’s steps on an iPhone, to follow before setting anything', async () => {
    const user = userEvent.setup()
    safariOnIPhone()
    launch()

    const dialog = screen.getByRole('dialog', { name: 'Installe Battlewise' })
    const steps = within(within(dialog).getByRole('list', { name: 'Dans Safari' })).getAllByRole(
      'listitem',
    )
    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveTextContent(/^Touche ⋯ à côté de l'adresse, puis « Partager »\.$/)
    expect(steps[1]).toHaveTextContent(/^Choisis « Sur l'écran d'accueil », puis « Ajouter »\.$/)
    expect(steps[2]).toHaveTextContent("Ouvre Battlewise depuis ton écran d'accueil.")
    expect(dialog).toHaveTextContent(
      "Fais-le avant de régler quoi que ce soit : l'app installée ne reprend pas ce que tu règles dans Safari.",
    )

    await user.click(within(dialog).getByRole('button', { name: 'Continuer dans Safari' }))

    expect(offer()).not.toBeInTheDocument()
  })

  it('offers nothing where the browser cannot install the app', async () => {
    const user = userEvent.setup()
    launch()
    expect(offer()).not.toBeInTheDocument()

    const settings = await openSettings(user)

    expect(
      within(settings).queryByRole('button', { name: /^Installer Battlewise/ }),
    ).not.toBeInTheDocument()
  })

  it('offers nothing in the installed app', async () => {
    const user = userEvent.setup()
    safariOnIPhone()
    setDisplayMode('standalone')
    launch()
    expect(offer()).not.toBeInTheDocument()

    const settings = await openSettings(user)

    expect(
      within(settings).queryByRole('button', { name: /^Installer Battlewise/ }),
    ).not.toBeInTheDocument()
  })

  it('speaks English', () => {
    const browser = chromium()
    browser.offers()

    launch(browser, { language: 'en' })

    const dialog = screen.getByRole('dialog', { name: 'Install Battlewise' })
    expect(within(dialog).getByRole('button', { name: 'Install' })).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Continue in the browser' }),
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent('An icon on your home screen')
    expect(dialog).toHaveTextContent("You'll find it in Settings › About.")
  })

  it('speaks of a window, not a home screen, on a desktop', () => {
    setViewportWidth('desktop')
    const browser = chromium()
    browser.offers()

    launch(browser)

    const dialog = screen.getByRole('dialog', { name: 'Installe Battlewise' })
    expect(dialog).toHaveTextContent('Une icône à côté de tes autres apps')
    expect(dialog).toHaveTextContent("Sa propre fenêtre, sans barre d'adresse")
  })
})

describe('Installing from Settings', () => {
  it('opens the browser’s prompt from Settings › About', async () => {
    const user = userEvent.setup()
    const browser = chromium()
    browser.offers()
    launch(browser, { language: 'fr', installOffered: true })
    const settings = await openSettings(user)

    await user.click(within(settings).getByRole('button', { name: /^Installer Battlewise/ }))

    expect(browser.event.prompt).toHaveBeenCalledOnce()
  })

  it('opens Safari’s steps on an iPhone, and says the installed app starts from scratch', async () => {
    const user = userEvent.setup()
    safariOnIPhone()
    launch(undefined, { language: 'fr', installOffered: true })
    const settings = await openSettings(user)

    await user.click(within(settings).getByRole('button', { name: /^Installer Battlewise/ }))

    const sheet = screen.getByRole('dialog', { name: 'Installe Battlewise' })
    expect(
      within(within(sheet).getByRole('list', { name: 'Dans Safari' })).getAllByRole('listitem'),
    ).toHaveLength(3)
    expect(sheet).toHaveTextContent(
      "L'app installée repart de zéro : Safari ne lui passe pas tes réglages, tu les y refais une fois.",
    )

    await user.click(within(sheet).getByRole('button', { name: 'Fermer' }))

    await waitFor(() => {
      expect(offer()).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: 'Réglages' })).toBeInTheDocument()
  })

  it('offers it no more once the app is installed', async () => {
    const user = userEvent.setup()
    const browser = chromium()
    browser.offers()
    launch(browser, { language: 'fr', installOffered: true })
    const settings = await openSettings(user)

    browser.installs()

    expect(
      within(settings).queryByRole('button', { name: /^Installer Battlewise/ }),
    ).not.toBeInTheDocument()
  })
})
