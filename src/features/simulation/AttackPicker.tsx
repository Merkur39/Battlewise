import { useId, useMemo, useState } from 'react'
import { RouteLink } from '@/app/RouteLink'
import { useAppState } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { closeModal, replaceRoute, useRoute } from '@/app/useRoute'
import { attackDamage, attackVerdicts } from '@/combat/attack'
import { game } from '@/data'
import type { BiomeId, GameCreature } from '@/data/types'
import { BiomeStepper } from '@/features/bestiary/BiomeStepper'
import {
  creatureName,
  creaturesOf,
  fightersOf,
  search,
  type FoundAttack,
} from '@/features/bestiary/model'
import { AttackPills, AttackTags, CreatureName, Highlighted } from '@/features/bestiary/parts'
import { bestiaryRoute } from '@/features/bestiary/place'
import { damageText, useAttackSummary, useFight } from '@/features/bestiary/wording'
import { useLanguage, useT } from '@/i18n/useT'
import { BestiaryIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '@/ui/icons'
import { GuardIcon } from '@/ui/verdicts'
import { Modal } from '@/ui/Modal'
import styles from './AttackPicker.module.css'
import { findAttack, refOfFound, simulableCount, simulationRoute } from './model'

/** « Choisir une attaque »: the recent ones, the enemies of a biome, or what a search finds in every
 * biome. On a phone an enemy opens its sheet, whose attacks open the Simulation; on a desktop its
 * attacks show beside the list. */
export function AttackPicker() {
  const t = useT()
  const isDesktop = useIsDesktop()
  const route = useRoute()
  const [biome, setBiome] = useState<BiomeId>(game.biomes[0]!.id)
  const [picked, setPicked] = useState<string | null>(null)
  const enemies = creaturesOf(biome)
  const selected = game.creatures.find((creature) => creature.id === picked) ?? enemies[0] ?? null
  const searching = route.query.trim() !== ''

  const searchField = (
    <label className={styles.search}>
      <SearchIcon size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={t.picker.search}
        placeholder={t.picker.searchPlaceholder}
        value={route.query}
        onChange={(event) => {
          replaceRoute({ ...route, query: event.target.value })
        }}
        className={styles.searchInput}
      />
      {route.query !== '' && (
        <button
          type="button"
          aria-label={t.bestiary.clearSearch}
          className={styles.clear}
          onClick={() => {
            replaceRoute({ ...route, query: '' })
          }}
        >
          <CloseIcon size={18} />
        </button>
      )}
    </label>
  )

  const lists = searching ? (
    <Results query={route.query} onEnemy={setPicked} />
  ) : (
    <>
      <Recent />
      <section aria-label={t.picker.enemies} className={styles.enemies}>
        <span className={styles.heading}>{t.picker.enemies}</span>
        <BiomeStepper
          biome={biome}
          compact
          detail={t.picker.biomeCount}
          onChange={(next) => {
            setBiome(next)
            setPicked(null)
          }}
        />
        <ul className={styles.list}>
          {enemies.map((creature) => (
            <li key={creature.id} className={styles.item}>
              <Enemy
                creature={creature}
                biome={biome}
                current={creature.id === selected?.id}
                onPick={setPicked}
              />
            </li>
          ))}
        </ul>
        {!isDesktop && <span className={styles.note}>{t.picker.enemiesNote}</span>}
      </section>
    </>
  )

  return (
    <Modal title={t.picker.title} closeLabel={t.picker.close} size="wide" onClose={closeModal}>
      {isDesktop ? (
        <div className={styles.columns}>
          <div className={styles.side}>
            {searchField}
            <div className={styles.sideLists}>{lists}</div>
          </div>
          {selected && <EnemyAttacks creature={selected} />}
        </div>
      ) : (
        <div className={styles.phone}>
          {searchField}
          {lists}
        </div>
      )}
    </Modal>
  )
}

/** An enemy: on a phone, a link to its sheet; on a desktop, a button showing its attacks beside. */
function Enemy({
  creature,
  biome,
  current,
  onPick,
  query = '',
}: {
  readonly creature: GameCreature
  readonly biome: BiomeId
  readonly current: boolean
  readonly onPick: (id: string) => void
  readonly query?: string
}) {
  const t = useT()
  const isDesktop = useIsDesktop()
  const content = (
    <>
      <span className={styles.enemyName}>
        <CreatureName creature={creature} query={query} />
      </span>
      <span className={styles.count}>{t.picker.attackCount(simulableCount(creature))}</span>
      <ChevronRightIcon size={16} className={styles.chevron} />
    </>
  )
  return isDesktop ? (
    <button
      type="button"
      aria-current={current ? 'true' : undefined}
      className={styles.enemy}
      onClick={() => {
        onPick(creature.id)
      }}
    >
      {content}
    </button>
  ) : (
    <RouteLink to={bestiaryRoute(biome, creature.id, '')} className={styles.enemy}>
      {content}
    </RouteLink>
  )
}

/** An attack to simulate: it takes the place of the dialog in the history. */
function AttackRow({
  found,
  query = '',
}: {
  readonly found: FoundAttack
  readonly query?: string
}) {
  const language = useLanguage()
  const { creature, attack } = found
  const biome = game.biomes.find((candidate) => candidate.id === creature.biomes[0])
  return (
    <RouteLink to={simulationRoute(refOfFound(found))} how="replace" className={styles.attack}>
      <BestiaryIcon size={18} className={styles.attackIcon} />
      <span className={styles.attackText}>
        <span className={styles.attackName}>
          {creatureName(creature, language)} ·{' '}
          <Highlighted text={attack.name[language]} query={query} />
        </span>
        <AttackTags attack={attack} withRange={false} extra={biome ? [biome.name[language]] : []} />
      </span>
      <span className={styles.damage}>
        {damageText(attackDamage(attack.hits, creature.stars.min), language)}
      </span>
    </RouteLink>
  )
}

function Recent() {
  const t = useT()
  const { recentAttacks } = useAppState()
  const headingId = useId()
  const recent = recentAttacks.flatMap((ref) => {
    const found = findAttack(ref)
    return found ? [found] : []
  })
  if (recent.length === 0) return null
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.heading}>
        {t.picker.recent}
      </h3>
      {recent.map((found) => (
        <AttackRow key={`${found.fighter.id}/${found.attack.ids[0] ?? ''}`} found={found} />
      ))}
    </section>
  )
}

function Results({
  query,
  onEnemy,
}: {
  readonly query: string
  readonly onEnemy: (id: string) => void
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const found = useMemo(() => search(query, language), [query, language])
  const attacks = found.attacks.filter(({ attack }) => attack.hits.length > 0)
  const attacksId = useId()
  const enemiesId = useId()
  const shown = query.trim()
  return (
    <div aria-live="polite" className={styles.results}>
      <section aria-labelledby={attacksId} className={styles.section}>
        <h3 id={attacksId} className={styles.heading}>
          {t.picker.foundAttacks(attacks.length)}
        </h3>
        {attacks.length === 0 ? (
          <span className={styles.none}>{t.picker.noAttack(shown)}</span>
        ) : (
          <>
            {attacks.map((attack) => (
              <AttackRow
                key={`${attack.fighter.id}/${attack.attack.ids[0] ?? ''}`}
                found={attack}
                query={query}
              />
            ))}
            {!isDesktop && <span className={styles.note}>{t.picker.openNote}</span>}
          </>
        )}
      </section>
      <section aria-labelledby={enemiesId} className={styles.section}>
        <h3 id={enemiesId} className={styles.heading}>
          {t.picker.foundEnemies(found.creatures.length)}
        </h3>
        {found.creatures.length === 0 ? (
          <span className={styles.none}>{t.picker.noEnemy(shown)}</span>
        ) : (
          <ul className={styles.list}>
            {found.creatures.map((creature) => (
              <li key={creature.id} className={styles.item}>
                <Enemy
                  creature={creature}
                  biome={creature.biomes[0] ?? game.biomes[0]!.id}
                  current={false}
                  onPick={onEnemy}
                  query={query}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <span className={styles.note}>{t.picker.resultsNote}</span>
    </div>
  )
}

/** Desktop: the attacks of the enemy picked, at its lowest stars, each opening the Simulation. */
function EnemyAttacks({ creature }: { readonly creature: GameCreature }) {
  const t = useT()
  const language = useLanguage()
  const summary = useAttackSummary()
  const { defence, world } = useFight()
  const headingId = useId()
  const stars = creature.stars.min
  const biome = game.biomes.find((candidate) => candidate.id === creature.biomes[0])
  const attacks = fightersOf(creature).flatMap((fighter) =>
    fighter.attacks
      .filter((attack) => attack.hits.length > 0)
      .map((attack) => ({ creature, fighter, attack })),
  )
  return (
    <section aria-labelledby={headingId} className={styles.detail}>
      <div className={styles.detailHeader}>
        <h3 id={headingId} className={styles.detailTitle}>
          <CreatureName creature={creature} />
        </h3>
        <span className={styles.count}>
          {[biome?.name[language], t.picker.attackCount(attacks.length)]
            .filter((part) => part !== undefined)
            .join(' · ')}
        </span>
      </div>
      <div className={styles.attacks}>
        <div aria-hidden="true" className={`${styles.attacksHead ?? ''} ${styles.grid ?? ''}`}>
          <span>{t.creature.attack}</span>
          <span className={styles.right}>{t.creature.damage}</span>
          <span className={styles.pillHeads}>
            <GuardIcon guard="block" size={13} />
            <GuardIcon guard="parry" size={13} />
            <GuardIcon guard="dodge" size={13} />
          </span>
          <span />
        </div>
        {attacks.map((found) => {
          const damage = attackDamage(found.attack.hits, stars)
          const verdicts = attackVerdicts(defence, found.attack.hits, world, stars)
          return (
            <RouteLink
              key={`${found.fighter.id}/${found.attack.ids[0] ?? ''}`}
              to={simulationRoute(refOfFound(found))}
              how="replace"
              aria-label={`${summary(found.attack, damage, verdicts)} ${t.creature.openSimulation}`}
              className={`${styles.attackLine ?? ''} ${styles.grid ?? ''}`}
            >
              <span className={styles.attackText}>
                <span className={styles.attackName}>{found.attack.name[language]}</span>
                <AttackTags attack={found.attack} />
              </span>
              <span className={`${styles.damage ?? ''} ${styles.right ?? ''}`}>
                {damageText(damage, language)}
              </span>
              {verdicts ? <AttackPills verdicts={verdicts} /> : <span />}
              <ChevronRightIcon size={16} className={styles.chevron} />
            </RouteLink>
          )
        })}
      </div>
      <span className={styles.note}>{t.picker.attacksNote}</span>
    </section>
  )
}
