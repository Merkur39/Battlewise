import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { selectOnlyOnText } from './selection'

// jsdom lays nothing out: each text is drawn in the box given here, its glyphs and nothing around them.
const BOXES: Record<string, DOMRect> = {
  'PV max': new DOMRect(0, 0, 50, 12),
  'En ': new DOMRect(0, 60, 20, 12),
  main: new DOMRect(20, 60, 30, 12),
}

const doubleClick = (target: Element, x: number, y: number, detail = 2) =>
  // False once the browser is kept from selecting.
  fireEvent.mouseDown(target, { detail, clientX: x, clientY: y })

describe('selectOnlyOnText', () => {
  let stop: () => void
  beforeEach(() => {
    Range.prototype.getClientRects = function (this: Range) {
      const box = BOXES[this.startContainer.textContent ?? '']
      return (box ? [box] : []) as unknown as DOMRectList
    }
    document.body.innerHTML = `
      <label>PV max</label>
      <div class="stepper"><button>−</button><input value="140" /><select><option>N1</option></select></div>
      <h3>En <strong>main</strong></h3>`
    stop = selectOnlyOnText(document)
  })
  afterEach(() => {
    stop()
    // @ts-expect-error -- jsdom has none, the test gave it one.
    delete Range.prototype.getClientRects
  })
  const get = (selector: string) => {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`No ${selector}`)
    return element
  }

  it('lets a double or triple click on a text select it', () => {
    expect(doubleClick(get('label'), 10, 5)).toBe(true)
    expect(doubleClick(get('h3'), 5, 65, 3)).toBe(true)
    expect(doubleClick(get('strong'), 30, 65)).toBe(true)
  })

  it('keeps a double or triple click off any text from selecting the text nearest to it', () => {
    expect(doubleClick(get('label'), 80, 5)).toBe(false)
    expect(doubleClick(get('.stepper'), 10, 40)).toBe(false)
    expect(doubleClick(get('button'), 10, 30, 3)).toBe(false)
    expect(doubleClick(get('h3'), 80, 65)).toBe(false)
  })

  it('leaves a single click alone, wherever it lands', () => {
    expect(doubleClick(get('.stepper'), 10, 40, 1)).toBe(true)
  })

  it('leaves the fields their own double clicks', () => {
    expect(doubleClick(get('input'), 100, 30)).toBe(true)
    expect(doubleClick(get('select'), 200, 30)).toBe(true)
  })

  it('stops when asked', () => {
    stop()

    expect(doubleClick(get('.stepper'), 10, 40)).toBe(true)
  })
})
