/** Whether (x, y) falls on the glyphs of a text of `element` itself: a text of its children makes them
 * the target. */
function onTextOf(element: Element, x: number, y: number) {
  return [...element.childNodes].some((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return false
    const range = element.ownerDocument.createRange()
    range.selectNodeContents(node)
    return [...range.getClientRects()].some(
      (box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom,
    )
  })
}

/** A double or triple click selects a word or a line only where it lands on text. Off it (a button
 * clicked fast, a click falling just beside it), the browser would select the text nearest to it. The
 * fields keep their own. Returns what stops it. */
export function selectOnlyOnText(target: Document) {
  const onMouseDown = (event: MouseEvent) => {
    const element = event.target
    if (event.detail < 2 || !(element instanceof Element)) return
    if (element.closest('input, textarea, select, [contenteditable]')) return
    if (!onTextOf(element, event.clientX, event.clientY)) event.preventDefault()
  }
  target.addEventListener('mousedown', onMouseDown, { capture: true })
  return () => {
    target.removeEventListener('mousedown', onMouseDown, { capture: true })
  }
}
