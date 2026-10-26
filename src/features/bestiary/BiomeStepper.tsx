import { game } from '@/data'
import type { BiomeId } from '@/data/types'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronLeftIcon, ChevronRightIcon } from '@/ui/icons'
import styles from './BiomeStepper.module.css'

/** Previous and next biome, in the game's order, round from the last to the first. */
export function BiomeStepper({
  biome,
  detail,
  onChange,
  compact = false,
}: {
  readonly biome: BiomeId
  /** The line under the name: its rank, how many creatures… */
  readonly detail: (index: number, total: number) => string
  readonly onChange: (biome: BiomeId) => void
  readonly compact?: boolean
}) {
  const t = useT()
  const language = useLanguage()
  const { biomes } = game
  const index = biomes.findIndex((candidate) => candidate.id === biome)
  const previous = biomes[(index - 1 + biomes.length) % biomes.length]!
  const next = biomes[(index + 1) % biomes.length]!
  return (
    <div
      role="group"
      aria-label={t.bestiary.biome}
      className={`${styles.biomes ?? ''} ${compact ? (styles.compact ?? '') : ''}`}
    >
      <button
        type="button"
        aria-label={t.bestiary.previousBiome(previous.name[language])}
        className={styles.step}
        onClick={() => {
          onChange(previous.id)
        }}
      >
        <ChevronLeftIcon />
      </button>
      <div className={styles.biome}>
        <span className={styles.name}>{biomes[index]!.name[language]}</span>
        <span className={styles.detail}>{detail(index + 1, biomes.length)}</span>
      </div>
      <button
        type="button"
        aria-label={t.bestiary.nextBiome(next.name[language])}
        className={styles.step}
        onClick={() => {
          onChange(next.id)
        }}
      >
        <ChevronRightIcon />
      </button>
    </div>
  )
}
