import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { passTime } from '../../test/utils'
import { StepButton } from './StepButton'

/** A count raised by a StepButton, up to `max`, past which the button is disabled. */
function Counter({ max = 1000 }: { readonly max?: number }) {
  const [count, setCount] = useState(0)
  return (
    <>
      <output aria-label="Count">{count}</output>
      <StepButton
        label="More"
        disabled={count >= max}
        onStep={() => {
          setCount(count + 1)
        }}
      >
        +
      </StepButton>
      <p>Elsewhere</p>
    </>
  )
}

const more = () => screen.getByRole('button', { name: 'More' })
const count = () => Number(screen.getByRole('status', { name: 'Count' }).textContent)

describe('StepButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })

  it('steps once per click', async () => {
    const user = setup()
    render(<Counter />)

    await user.click(more())
    await user.click(more())

    expect(count()).toBe(2)
  })

  it('steps once per press of a key', async () => {
    const user = setup()
    render(<Counter />)

    more().focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(count()).toBe(2)
  })

  it('steps once when let go before the press is held', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(300)
    await user.pointer({ keys: '[/MouseLeft]', target: more() })
    passTime(1000)

    expect(count()).toBe(1)
  })

  it('steps again and again while held, and no more once let go', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(1000)
    const held = count()
    await user.pointer({ keys: '[/MouseLeft]', target: more() })
    passTime(1000)

    expect(held).toBeGreaterThan(3)
    expect(count()).toBe(held)
  })

  it('steps faster the longer it is held', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(1000)
    const firstSecond = count()
    passTime(1000)

    expect(count() - firstSecond).toBeGreaterThan(firstSecond)
  })

  it('stops when the pointer leaves it', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(1000)
    await user.pointer({ target: screen.getByText('Elsewhere') })
    const left = count()
    passTime(1000)
    await user.pointer({ keys: '[/MouseLeft]', target: screen.getByText('Elsewhere') })

    expect(count()).toBe(left)
  })

  it('steps once per press of a key after a hold let go elsewhere, with no click', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(1000)
    await user.pointer({ keys: '[/MouseLeft]', target: screen.getByText('Elsewhere') })
    const held = count()
    more().focus()
    await user.keyboard('{Enter}')

    expect(count()).toBe(held + 1)
  })

  it('stops once disabled, at the end of its range', async () => {
    const user = setup()
    render(<Counter max={3} />)

    await user.pointer({ keys: '[MouseLeft>]', target: more() })
    passTime(3000)

    expect(count()).toBe(3)
    expect(more()).toBeDisabled()
  })

  it('takes no step when the browser takes the touch over, to scroll', async () => {
    const user = setup()
    render(<Counter />)

    await user.pointer({ keys: '[TouchA>]', target: more() })
    fireEvent.pointerCancel(more(), { pointerType: 'touch' })
    passTime(1000)

    expect(count()).toBe(0)
  })

  it('keeps a long touch from opening a menu or selecting text, not a right click', async () => {
    const user = setup()
    render(<Counter />)

    expect(fireEvent.contextMenu(more())).toBe(true)
    await user.pointer({ keys: '[TouchA>]', target: more() })
    passTime(500)

    expect(fireEvent.contextMenu(more())).toBe(false)
  })
})
