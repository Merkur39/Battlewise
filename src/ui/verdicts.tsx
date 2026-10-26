import type { Catalog } from '@/i18n/fr'
import { CheckIcon, CloseIcon, DodgeIcon, ParryIcon, ShieldIcon, WarningIcon } from './icons'
import type { GuardKind, Tone } from './tones'
import styles from './verdicts.module.css'

const GUARD_ICONS = { block: ShieldIcon, parry: ParryIcon, dodge: DodgeIcon }

export function GuardIcon({ guard, size }: { readonly guard: GuardKind; readonly size: number }) {
  const Icon = GUARD_ICONS[guard]
  return <Icon size={size} strokeWidth={2} />
}

/** A guard's verdict as a coloured square: named for screen readers, unless what holds it says it
 * all. */
export function VerdictPill({
  guard,
  tone,
  label,
  size = 'row',
}: {
  readonly guard: GuardKind
  readonly tone: Tone
  readonly label?: string
  readonly size?: 'row' | 'compact'
}) {
  return (
    <span
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
      className={`${styles.pill ?? ''} ${styles[size] ?? ''} ${styles[tone] ?? ''}`}
    >
      <GuardIcon guard={guard} size={size === 'row' ? 17 : 15} />
    </span>
  )
}

/** A piece of advice in its verdict colour, with its icon. */
export function AdviceLine({
  tone,
  text,
  withIcon = true,
  className,
}: {
  readonly tone: Tone
  readonly text: string
  readonly withIcon?: boolean
  readonly className?: string | undefined
}) {
  const Icon = tone === 'ok' ? CheckIcon : tone === 'warn' ? WarningIcon : CloseIcon
  return (
    <span className={`${styles.advice ?? ''} ${styles[`${tone}Text`] ?? ''} ${className ?? ''}`}>
      {withIcon && tone !== 'none' && <Icon size={15} strokeWidth={2.25} />}
      <span>{text}</span>
    </span>
  )
}

/** What the pills and their colours mean. */
export function VerdictLegend({ words }: { readonly words: Catalog['verdicts'] }) {
  return (
    <div className={styles.legend}>
      {(['block', 'parry', 'dodge'] as const).map((guard) => (
        <span key={guard} className={styles.legendItem}>
          <GuardIcon guard={guard} size={14} />
          {words[guard].toLocaleLowerCase()}
        </span>
      ))}
      <span>
        <span className={styles.okText}>{words.holds}</span> ·{' '}
        <span className={styles.warnText}>{words.staggered}</span> ·{' '}
        <span className={styles.badText}>{words.broken}</span>
      </span>
    </div>
  )
}
