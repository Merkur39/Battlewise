import { useState } from 'react'
import { useAppState, useUpdate } from '@/app/useAppState'
import { closeModal } from '@/app/useRoute'
import type { World } from '@/combat/world'
import { useT } from '@/i18n/useT'
import { Modal } from '@/ui/Modal'
import { WorldForm } from './WorldForm'

/** « Ton monde »: what the world does to the fight. Valider saves it, any other way out leaves the
 * world as it was. */
export function WorldModal() {
  const t = useT()
  const saved = useAppState()
  const update = useUpdate()
  const [draft, setDraft] = useState<World>(saved.world)

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
      <WorldForm
        world={draft}
        onChange={(change) => {
          setDraft((current) => ({ ...current, ...change }))
        }}
      />
    </Modal>
  )
}
