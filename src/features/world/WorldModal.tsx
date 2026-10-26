import { useId, useState } from 'react'
import { presetOf } from '@/app/context'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { closeModal } from '@/app/useRoute'
import { worldScale, type World } from '@/combat/world'
import { game } from '@/data'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { Modal } from '@/ui/Modal'
import styles from './WorldModal.module.css'

const PLAYER_COUNTS = Array.from({ length: game.world.maxPlayers }, (_, index) => index + 1)

/** « Ton monde »: the game's Combat setting and the players nearby, with what they do to the fight.
 * Valider saves them, any other way out leaves the world as it was. */
export function WorldModal() {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const saved = useAppState()
  const update = useUpdate()
  const [draft, setDraft] = useState<World>(saved.world)
  const playersId = useId()
  const effectsId = useId()
  const scale = worldScale(draft)

  const pick = (change: Partial<World>) => {
    setDraft((current) => ({ ...current, ...change }))
  }

  return (
    <Modal
      title={t.world.title}
      closeLabel={t.modal.close}
      size="narrow"
      footer={{
        cancel: t.modal.cancel,
        save: t.modal.save,
        onSave: () => {
          update({ world: draft })
        },
      }}
      onClose={closeModal}
    >
      <fieldset className={styles.section}>
        <legend className={styles.label}>{t.world.difficulty}</legend>
        <div className={styles.presets}>
          {game.world.presets.map((preset) => (
            <label key={preset.id} className={styles.preset}>
              <input
                type="radio"
                name="difficulty"
                value={preset.id}
                checked={draft.difficulty === preset.id}
                className={styles.radio}
                onChange={() => {
                  pick({ difficulty: preset.id })
                }}
              />
              <span className={styles.presetName}>
                {[preset.name, ...preset.worldPresets].map((name) => name[language]).join(', ')}
              </span>{' '}
              <span className={styles.multiplier}>{t.world.multiplier(preset.enemyDamage)}</span>
            </label>
          ))}
        </div>
        <p className={styles.note}>{t.world.difficultyNote}</p>
      </fieldset>

      <div className={styles.section}>
        <span id={playersId} className={styles.label}>
          {t.world.players(game.world.range)}
        </span>
        <div role="group" aria-labelledby={playersId} className={styles.segments}>
          {PLAYER_COUNTS.map((count) => {
            const last = count === game.world.maxPlayers
            return (
              <button
                key={count}
                type="button"
                aria-pressed={draft.players === count}
                aria-label={last ? t.world.orMoreLabel(count) : undefined}
                className={styles.segment}
                onClick={() => {
                  pick({ players: count })
                }}
              >
                {last ? t.world.orMore(count) : formatNumber(count, language)}
              </button>
            )
          })}
        </div>
      </div>

      <section aria-labelledby={effectsId} className={styles.section}>
        <h3 id={effectsId} className={styles.label}>
          {t.world.effects}
        </h3>
        <div className={styles.effects}>
          <Effect label={t.world.enemyHits} value={scale.enemy} />
          <Effect
            label={isDesktop ? t.world.yourDamageShort : t.world.yourDamage}
            value={scale.you}
          />
          <Effect label={t.world.starChance} value={presetOf(draft).levelUpRate} />
        </div>
        <p className={styles.note}>{t.world.rulesNote}</p>
      </section>
    </Modal>
  )
}

function Effect({ label, value }: { readonly label: string; readonly value: number }) {
  const t = useT()
  return (
    <div role="group" aria-label={label} className={styles.effect}>
      <span aria-hidden="true" className={styles.effectLabel}>
        {label}
      </span>{' '}
      <span className={styles.effectValue}>{t.world.multiplier(value)}</span>
    </div>
  )
}
