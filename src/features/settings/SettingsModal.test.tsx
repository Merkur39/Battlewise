import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { parseRoute } from '@/app/routes'
import { version } from '../../../package.json'
import { deviceSpeaks, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

async function openSettings(user: UserEvent) {
  await user.click(screen.getByRole('link', { name: 'Réglages' }))
  return screen.findByRole('dialog', { name: 'Réglages' })
}

const settingsClosed = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

describe('Settings', () => {
  it('opens over the screen, on the saved choices', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr', theme: 'brume' })

    const dialog = await openSettings(user)

    expect(within(dialog).getByRole('radio', { name: 'Français' })).toBeChecked()
    expect(within(dialog).getByRole('radio', { name: /^Brume/ })).toBeChecked()
    expect(window.location.hash).toBe('#/bestiary?modal=settings')
  })

  it('previews a theme at once, and keeps it once saved', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)

    await user.click(within(dialog).getByRole('radio', { name: /^Plein jour/ }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'jour')
    expect(store.getState().theme).toBe('origine')

    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    await settingsClosed()
    expect(store.getState().theme).toBe('jour')
    expect(document.documentElement).toHaveAttribute('data-theme', 'jour')
    expect(parseRoute(window.location.hash)).toMatchObject({ screen: 'bestiary', modal: null })
  })

  it('previews a language at once, in the dialog and behind it', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)

    await user.click(within(dialog).getByRole('radio', { name: 'English' }))

    expect(dialog).toHaveAccessibleName('Settings')
    expect(screen.getByRole('heading', { level: 1, hidden: true })).toHaveTextContent('Bestiary')

    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await settingsClosed()
    expect(store.getState().language).toBe('en')
  })

  it('puts the saved choices back when closed without saving', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)
    await user.click(within(dialog).getByRole('radio', { name: /^Runes/ }))
    await user.click(within(dialog).getByRole('radio', { name: 'English' }))

    await user.click(within(dialog).getByRole('button', { name: 'Close without saving' }))

    await settingsClosed()
    expect(store.getState()).toMatchObject({ theme: 'origine', language: 'fr' })
    expect(document.documentElement).toHaveAttribute('data-theme', 'origine')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bestiaire')
  })

  it('closes without saving when the browser closes it (Escape)', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)
    await user.click(within(dialog).getByRole('radio', { name: /^Runes/ }))

    act(() => {
      ;(dialog as HTMLDialogElement).close()
    })

    await settingsClosed()
    expect(store.getState().theme).toBe('origine')
    // A closed <dialog> leaves the accessibility tree at once; the address follows on history.back().
    await waitFor(() => {
      expect(parseRoute(window.location.hash)).toMatchObject({ screen: 'bestiary', modal: null })
    })
  })

  it('closes without saving on Back', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)
    await user.click(within(dialog).getByRole('radio', { name: /^Runes/ }))

    window.history.back()

    await settingsClosed()
    expect(store.getState().theme).toBe('origine')
    expect(document.documentElement).toHaveAttribute('data-theme', 'origine')
  })

  it('closes onto its screen when it was reached by its address', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal?modal=settings')
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))

    await settingsClosed()
    expect(window.location.hash).toBe('#/arsenal')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arsenal')
  })

  it('recalls on Automatic which language the device speaks', async () => {
    const user = userEvent.setup()
    deviceSpeaks('fr-CA')
    renderWithStore(<App />)

    const dialog = await openSettings(user)

    expect(within(dialog).getByRole('radio', { name: 'Automatique' })).toBeChecked()
    expect(dialog).toHaveTextContent('Automatique suit ton appareil (français détecté)')
  })

  it('says which game version the data comes from', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    const dialog = await openSettings(user)

    expect(dialog).toHaveTextContent('Lues dans Valheim 1.0.20 · sans mod')
  })

  it('shows the version of the build next to the name', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    const dialog = await openSettings(user)

    expect(dialog).toHaveTextContent(`Battlewise ${version}`)
  })

  it('links to its source code and licence, in a new tab', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    const dialog = await openSettings(user)

    const source = within(dialog).getByRole('link', { name: 'Code source et licence GitHub' })
    expect(source).toHaveAttribute('href', 'https://github.com/Merkur39/Battlewise')
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noopener')
  })

  it('states its copyright, its licence and the lack of warranty', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    const dialog = await openSettings(user)

    expect(dialog).toHaveTextContent('© 2026 Merkur39 · logiciel libre sous GPLv3, sans garantie.')
  })

  it('states its licence in English', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'en' })

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })

    expect(within(dialog).getByRole('link', { name: /^Source code and licence/ })).toBeVisible()
    expect(dialog).toHaveTextContent(
      '© 2026 Merkur39 · free software under the GPLv3, no warranty.',
    )
  })

  it('offers Cancel next to Save on a desktop', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    const { store } = renderWithStore(<App />, { language: 'fr' })
    const dialog = await openSettings(user)
    await user.click(within(dialog).getByRole('radio', { name: /^Braise/ }))

    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    await settingsClosed()
    expect(store.getState().theme).toBe('origine')
  })
})
