import { useLanguage, useT } from '@/i18n/useT'
import { ChevronRightIcon, ShieldIcon, WorldIcon } from '@/ui/icons'
import { blockerOf, enemyScale, gearBlockPower, presetOf } from './context'
import styles from './ContextChips.module.css'
import { RouteLink } from './RouteLink'
import { useAppState } from './useAppState'
import { useRoute } from './useRoute'

/** « Ton équipement » and « Ton monde » at a glance, each opening its dialog: in the sidebar on a
 * desktop, in the top bar's context sheet on a phone, where each says which it is. Each says it all to
 * a screen reader in one label; the lines are what the eye reads. */
export function ContextChips({ variant }: { readonly variant: 'sidebar' | 'sheet' }) {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const { gear, world } = useAppState()
  const item = blockerOf(gear.blocker).name[language]
  const power = gearBlockPower(gear)
  const difficulty = presetOf(world).name[language]
  const inSheet = variant === 'sheet'
  const iconSize = inSheet ? 22 : 18

  return (
    <div className={inSheet ? styles.sheet : styles.sidebar}>
      <RouteLink
        to={{ ...route, modal: 'gear' }}
        aria-label={t.gear.summary(item, gear.level, power, gear.skill)}
        className={styles.chip}
      >
        <ShieldIcon size={iconSize} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          {inSheet && <span className={styles.label}>{t.gear.title}</span>}
          <span className={styles.name}>{item}</span>
          <span className={styles.meta}>{t.gear.levelAndPower(gear.level, power)}</span>
        </span>
        {inSheet && <ChevronRightIcon size={18} className={styles.go} />}
      </RouteLink>
      <RouteLink
        to={{ ...route, modal: 'world' }}
        aria-label={t.world.summary(difficulty, world.players)}
        className={styles.chip}
      >
        <WorldIcon size={iconSize} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          {inSheet && <span className={styles.label}>{t.world.title}</span>}
          <span className={styles.name}>{difficulty}</span>
          <span className={styles.meta}>
            {t.world.playersAndScale(world.players, enemyScale(world))}
          </span>
        </span>
        {inSheet && <ChevronRightIcon size={18} className={styles.go} />}
      </RouteLink>
    </div>
  )
}
