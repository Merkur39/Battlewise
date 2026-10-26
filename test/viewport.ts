import { act } from '@testing-library/react'

// jsdom has no matchMedia. This one answers min-width queries against a width the tests set: a phone
// unless a test says otherwise.
const WIDTHS = { phone: 390, desktop: 1440 } as const
let width: number = WIDTHS.phone
const lists = new Set<{ readonly update: () => void }>()

function matches(query: string): boolean {
  const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query)?.[1]
  if (minWidth === undefined) throw new Error(`matchMedia stub: unsupported query ${query}`)
  return width >= Number(minWidth)
}

export function installMatchMedia() {
  window.matchMedia = (query: string) => {
    const target = new EventTarget()
    const list = Object.assign(target, {
      media: query,
      matches: matches(query),
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
    }) as unknown as MediaQueryList & { matches: boolean }
    lists.add({
      update: () => {
        const now = matches(query)
        if (now === list.matches) return
        list.matches = now
        list.dispatchEvent(new Event('change'))
      },
    })
    return list
  }
}

export function setViewportWidth(viewport: keyof typeof WIDTHS) {
  width = WIDTHS[viewport]
  act(() => {
    for (const list of lists) list.update()
  })
}
