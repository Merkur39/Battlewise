import { useId, useState } from 'react'
import { MinusIcon, PlusIcon } from './icons'
import styles from './NumberField.module.css'

interface NumberFieldProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly lowerLabel: string
  readonly raiseLabel: string
  readonly onChange: (value: number) => void
  /** Compact: as wide as a few digits, not as its column. */
  readonly compact?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** A whole number, typed or stepped one by one between `min` and `max`. What is typed counts as soon
 * as it is a number within them; leaving the field brings anything else back within them. */
export function NumberField({
  label,
  value,
  min,
  max,
  lowerLabel,
  raiseLabel,
  onChange,
  compact = false,
}: NumberFieldProps) {
  const id = useId()
  // What is being typed; null shows the value.
  const [typed, setTyped] = useState<string | null>(null)

  const set = (next: number) => {
    setTyped(null)
    onChange(clamp(next, min, max))
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.stepper ?? ''} ${compact ? (styles.compact ?? '') : ''}`}>
        <button
          type="button"
          aria-label={lowerLabel}
          disabled={value <= min}
          className={styles.step}
          onClick={() => {
            set(value - 1)
          }}
        >
          <MinusIcon size={18} />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={typed ?? String(value)}
          className={styles.input}
          onChange={(event) => {
            const text = event.target.value
            setTyped(text)
            const number = Number(text)
            if (text.trim() !== '' && Number.isInteger(number) && number >= min && number <= max) {
              onChange(number)
            }
          }}
          onBlur={() => {
            const number = Number(typed)
            if (typed !== null && typed.trim() !== '' && Number.isFinite(number)) {
              set(Math.round(number))
            } else {
              setTyped(null)
            }
          }}
        />
        <button
          type="button"
          aria-label={raiseLabel}
          disabled={value >= max}
          className={styles.step}
          onClick={() => {
            set(value + 1)
          }}
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </div>
  )
}
