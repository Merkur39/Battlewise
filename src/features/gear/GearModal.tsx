import { useState } from 'react'
import type { Gear } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import type { Equip } from '@/app/routes'
import { closeModal, useRoute } from '@/app/useRoute'
import { game } from '@/data'
import { useT } from '@/i18n/useT'
import { Modal } from '@/ui/Modal'
import { GearForm } from './GearForm'
import { maxLevel } from './model'

/** The gear the dialog opens on: the saved one, with the item of the address when there is one (the
 * Arsenal's « Équiper »), its level kept within the item's. */
function startingGear(gear: Gear, equip: Equip | undefined): Gear {
  const blocker = game.blockers.find((candidate) => candidate.id === equip?.item)
  if (!equip || !blocker) return gear
  return { ...gear, blocker: blocker.id, level: Math.min(equip.level, maxLevel(blocker)) }
}

/** « Ton équipement »: what every verdict is worked out with. What you can take follows the draft as it
 * changes; Valider saves it, any other way out leaves the gear as it was. */
export function GearModal() {
  const t = useT()
  const saved = useAppState()
  const update = useUpdate()
  const { equip } = useRoute()
  const [draft, setDraft] = useState<Gear>(() => startingGear(saved.gear, equip))

  return (
    <Modal
      title={t.gear.title}
      closeLabel={t.modal.close}
      size="medium"
      footer={{
        cancel: t.modal.cancel,
        save: t.modal.save,
        onSave: () => {
          update({ gear: draft })
        },
      }}
      onClose={closeModal}
    >
      <GearForm
        gear={draft}
        world={saved.world}
        onChange={(change) => {
          setDraft((current) => ({ ...current, ...change }))
        }}
      />
    </Modal>
  )
}
