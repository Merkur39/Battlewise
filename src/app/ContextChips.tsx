import { useLanguage, useT } from '@/i18n/useT'
import { ShieldIcon, WorldIcon } from '@/ui/icons'
import { blockerOf, enemyScale, gearBlockPower, presetOf } from './context'
import styles from './ContextChips.module.css'
import { RouteLink } from './RouteLink'
import { useAppState } from './useAppState'
import { useRoute } from './useRoute'

/** « Ton équipement » and « Ton monde » at a glance, each opening its dialog: in the top bar on a
 * phone, in the sidebar on a desktop. Each says it all to a screen reader in one label; the lines are
 * what the eye reads. */
export function ContextChips({ variant }: { readonly variant: 'bar' | 'sidebar' }) {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const { gear, world } = useAppState()
  const item = blockerOf(gear.blocker).name[language]
  const power = gearBlockPower(gear)
  const difficulty = presetOf(world).name[language]

  return (
    <div className={variant === 'bar' ? styles.bar : styles.sidebar}>
      <RouteLink
        to={{ ...route, modal: 'gear' }}
        aria-label={t.gear.summary(item, gear.level, power, gear.skill)}
        className={styles.chip}
      >
        <ShieldIcon size={18} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          <span className={styles.name}>{item}</span>
          <span className={styles.meta}>{t.gear.levelAndPower(gear.level, power)}</span>
        </span>
      </RouteLink>
      <RouteLink
        to={{ ...route, modal: 'world' }}
        aria-label={t.world.summary(difficulty, world.players)}
        className={styles.chip}
      >
        <WorldIcon size={18} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          <span className={styles.name}>{difficulty}</span>
          <span className={styles.meta}>
            {t.world.playersAndScale(world.players, enemyScale(world))}
          </span>
        </span>
      </RouteLink>
    </div>
  )
}
