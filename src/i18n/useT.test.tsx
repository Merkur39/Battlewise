import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deviceSpeaks, renderWithStore } from '../../test/utils'
import { useT } from './useT'

function GuideTab() {
  return <span>{useT().screens.guide}</span>
}

describe('useT', () => {
  it('speaks the device language on Automatic', () => {
    deviceSpeaks('fr-FR', 'en')

    renderWithStore(<GuideTab />)

    expect(screen.getByText('Mémo')).toBeInTheDocument()
  })

  it('speaks English on Automatic when the device speaks none of its languages', () => {
    deviceSpeaks('de-DE')

    renderWithStore(<GuideTab />)

    expect(screen.getByText('Guide')).toBeInTheDocument()
  })

  it('speaks the chosen language over the device one', () => {
    deviceSpeaks('fr-FR')

    renderWithStore(<GuideTab />, { language: 'en' })

    expect(screen.getByText('Guide')).toBeInTheDocument()
  })

  it('changes language as soon as one is chosen', () => {
    deviceSpeaks('en-US')
    const { store } = renderWithStore(<GuideTab />)

    act(() => {
      store.update({ language: 'fr' })
    })

    expect(screen.getByText('Mémo')).toBeInTheDocument()
  })
})
