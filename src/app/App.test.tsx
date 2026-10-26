import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deviceSpeaks, renderWithStore } from '../../test/utils'
import { App } from './App'

describe('App', () => {
  it('names the app in its top bar', () => {
    renderWithStore(<App />)

    expect(within(screen.getByRole('banner')).getByText('Battlewise')).toBeInTheDocument()
  })

  it('tells the browser which language the page speaks', () => {
    deviceSpeaks('fr-CA')
    const { store } = renderWithStore(<App />)

    expect(document.documentElement).toHaveAttribute('lang', 'fr')

    act(() => {
      store.update({ language: 'en' })
    })

    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it('paints the whole page in the chosen theme', () => {
    const { store } = renderWithStore(<App />, { theme: 'jour' })

    expect(document.documentElement).toHaveAttribute('data-theme', 'jour')

    act(() => {
      store.update({ theme: 'runes' })
    })

    expect(document.documentElement).toHaveAttribute('data-theme', 'runes')
  })
})
