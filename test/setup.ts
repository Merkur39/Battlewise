import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { installMatchMedia, setViewportWidth } from './viewport'

// jsdom 30 has no showModal nor close. Opening and closing are enough for the journeys; the top layer,
// the inert background, Escape and focus are the browser's, checked there.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  if (!this.open) return
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// Nor scrollIntoView: where the page scrolls to is the browser's, checked there.
Element.prototype.scrollIntoView = function () {
  // Nothing to scroll in jsdom.
}

installMatchMedia()

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  setViewportWidth('phone')
  window.history.replaceState(null, '', '/')
})
