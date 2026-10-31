import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

/** How long a press is held before it repeats, then the pace of the first repeats and the fastest one
 * (ms): each repeat comes a little sooner than the one before. */
const HOLD = 400
const FIRST_PACE = 100
const FASTEST_PACE = 30
const SPEED_UP = 0.8

interface StepButtonProps {
  readonly label: string
  readonly disabled?: boolean
  readonly className?: string | undefined
  readonly onStep: () => void
  readonly children: ReactNode
}

/** A button that steps a value: once per click or key, and, held down, again and again, faster and
 * faster, until it is let go, left or disabled. The click that ends a hold takes no step of its own. */
export function StepButton({
  label,
  disabled = false,
  className,
  onStep,
  children,
}: StepButtonProps) {
  // A hold outlives the render it began in: it steps from the value of the last one.
  const step = useRef(onStep)
  useLayoutEffect(() => {
    step.current = onStep
  })
  const hold = useRef<{ timer: number | undefined; repeated: boolean }>({
    timer: undefined,
    repeated: false,
  })
  useEffect(() => {
    const state = hold.current
    return () => {
      window.clearTimeout(state.timer)
    }
  }, [])

  const stop = () => {
    window.clearTimeout(hold.current.timer)
    hold.current.timer = undefined
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={className}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const button = event.currentTarget
        const repeat = (delay: number, pace: number) => {
          hold.current.timer = window.setTimeout(() => {
            if (button.disabled) {
              stop()
              return
            }
            hold.current.repeated = true
            step.current()
            repeat(pace, Math.max(FASTEST_PACE, pace * SPEED_UP))
          }, delay)
        }
        stop()
        hold.current.repeated = false
        repeat(HOLD, FIRST_PACE)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      // The browser takes the touch over, to scroll: no click follows.
      onPointerCancel={stop}
      onBlur={stop}
      onContextMenu={(event) => {
        // A long touch would open a menu, or select the text nearby.
        if (hold.current.timer !== undefined) event.preventDefault()
      }}
      onClick={(event) => {
        // A key's click (detail 0) always steps; a pointer's, unless its press repeated.
        if (!hold.current.repeated || event.detail === 0) onStep()
        hold.current.repeated = false
      }}
    >
      {children}
    </button>
  )
}
