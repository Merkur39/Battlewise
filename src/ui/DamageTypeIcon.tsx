import type { DamageType } from '@/combat/damage'

// design/scripts/damage_types.py: one stroke per type on a 24 grid, always shown with the word.
const PATHS: Record<DamageType, string> = {
  blunt: 'M13 3l8 8-4 4-8-8zM13 11l-9 9',
  slash: 'M4 14L14 4M7 19L19 7M13 20l7-7',
  pierce: 'M20 4l-7 3 4 4zM15 9L4 20',
  fire: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z',
  frost: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  lightning: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  poison: 'M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z',
  spirit: 'M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01',
}

/** A damage type's icon, in the colour of the text: types stay neutral, never verdict colours. */
export function DamageTypeIcon({
  type,
  size = 12,
  className,
}: {
  readonly type: DamageType
  readonly size?: number
  readonly className?: string | undefined
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[type]} />
    </svg>
  )
}
