import type { AttackVerdicts } from '@/combat/attack'
import type { DamageType } from '@/combat/damage'
import { game } from '@/data'
import type { GameAttack } from '@/data/types'
import { useLanguage, useT } from '@/i18n/useT'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { VerdictPill } from '@/ui/verdicts'
import { attackRange, attackTypes, matchRange } from './model'
import styles from './parts.module.css'
import { blockShown, dodgeShown, parryShown } from './wording'

/** A name, the part the search found in it marked. */
export function Highlighted({ text, query }: { readonly text: string; readonly query: string }) {
  const range = matchRange(text, query)
  if (range === null) return text
  const [start, end] = range
  const chars = Array.from(text)
  return (
    <>
      {chars.slice(0, start).join('')}
      <mark className={styles.mark}>{chars.slice(start, end).join('')}</mark>
      {chars.slice(end).join('')}
    </>
  )
}

/** An attack's tag line: its damage types, icon and word, then its kind and reach, and whatever
 * else the place it shows in adds (its biome, a call to change it). */
export function AttackTags({
  attack,
  withRange = true,
  extra = [],
  className,
}: {
  readonly attack: GameAttack
  readonly withRange?: boolean
  readonly extra?: readonly string[]
  readonly className?: string | undefined
}) {
  const t = useT()
  const tags = [t.creature.kinds[attack.kind]]
  if (withRange && attack.kind !== 'summon') {
    tags.push(t.creature.metres(attackRange(attack)))
  }
  tags.push(...extra)
  return <TypeTags types={attackTypes(attack)} tags={tags} className={className} />
}

/** A tag line: damage types, icon and word, then the other tags. */
export function TypeTags({
  types,
  tags,
  className,
}: {
  readonly types: readonly DamageType[]
  readonly tags: readonly string[]
  readonly className?: string | undefined
}) {
  const language = useLanguage()
  return (
    <span className={`${styles.tags ?? ''} ${className ?? ''}`}>
      {types.map((type) => (
        <span key={type} className={styles.type}>
          <DamageTypeIcon type={type} />
          {game.damageTypes[type][language]}
        </span>
      ))}
      {types.length > 0 && tags.length > 0 && ' · '}
      {tags.join(' · ')}
    </span>
  )
}

/** The three verdicts of an attack, hidden from screen readers: the row says them in its label. */
export function AttackPills({
  verdicts,
  size = 'compact',
}: {
  readonly verdicts: AttackVerdicts
  readonly size?: 'row' | 'compact'
}) {
  const t = useT()
  return (
    <span className={styles.pills} aria-hidden="true">
      <VerdictPill guard="block" tone={blockShown(verdicts.block, t).tone} size={size} />
      <VerdictPill
        guard="parry"
        tone={parryShown(verdicts.parry, verdicts.parry !== null, t).tone}
        size={size}
      />
      <VerdictPill guard="dodge" tone={dodgeShown(verdicts.dodgeable, t).tone} size={size} />
    </span>
  )
}
