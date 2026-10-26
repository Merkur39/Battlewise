import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { STORAGE_KEY } from './store'

/** Runs the classic scripts of the page head, as the browser does before the app's module loads. */
function runHeadScripts() {
  const page = new DOMParser().parseFromString(html, 'text/html')
  for (const source of page.head.querySelectorAll('script:not([type="module"])')) {
    const script = document.createElement('script')
    script.textContent = source.textContent
    document.head.append(script)
    script.remove()
  }
}

describe('index.html', () => {
  const errors: ErrorEvent[] = []
  const collect = (event: ErrorEvent) => errors.push(event)

  beforeEach(() => {
    window.addEventListener('error', collect)
  })

  afterEach(() => {
    window.removeEventListener('error', collect)
    errors.length = 0
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('paints the page in the saved theme before the app loads', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'jour', language: 'fr' }))

    runHeadScripts()

    expect(document.documentElement).toHaveAttribute('data-theme', 'jour')
  })

  it.each([
    ['nothing is saved', null],
    ['the saved state is unreadable', '{"theme": "jour"'],
    ['the saved state has no theme', '{"language": "fr"}'],
  ])('keeps the default theme, without an error, when %s', (_, saved) => {
    if (saved !== null) localStorage.setItem(STORAGE_KEY, saved)

    runHeadScripts()

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(errors).toEqual([])
  })
})
