import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('names the app in its top bar', () => {
    render(<App />)

    expect(within(screen.getByRole('banner')).getByText('Battlewise')).toBeInTheDocument()
  })
})
