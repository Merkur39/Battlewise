import { RELEASES } from '@/app/releases'
import { closeModal, replaceRoute, useRoute } from '@/app/useRoute'
import { useLanguage, useT } from '@/i18n/useT'
import { Modal } from '@/ui/Modal'
import styles from './Feedback.module.css'
import { useOutbox } from './useReport'
import { dateOf } from './wording'

/** What's new: each version's notes, newest first, thanking the players who reported what it fixes,
 * and this player for their own reports. */
export function NewsModal() {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const mine = new Set(
    useOutbox()
      .receipts()
      .map((receipt) => receipt.number),
  )

  return (
    <Modal
      title={t.loop.news}
      closeLabel={t.loop.close}
      back={{
        label: t.loop.back,
        onBack: () => {
          replaceRoute({ ...route, modal: 'settings' })
        },
      }}
      done={t.loop.close}
      onClose={closeModal}
    >
      {RELEASES.map((release) => (
        <section key={release.version} className={styles.release}>
          <h3 className={styles.version}>
            <span className={styles.versionNumber}>{release.version}</span>{' '}
            <span className={styles.date}>{dateOf(release.date, language)}</span>
          </h3>
          <ul className={styles.notes}>
            {release.notes.map((note) => {
              const yours = (note.fixes ?? []).filter((number) => mine.has(number))
              const credits = [
                note.thanks && note.thanks.length > 0 ? t.loop.thanks(note.thanks) : null,
                yours.length > 0 ? t.loop.yours(yours) : null,
              ].filter((part) => part !== null)
              const credit = credits.join(' · ')
              return (
                <li key={note.title.en} className={styles.entry}>
                  <span className={styles.noteKind}>{t.loop.noteKinds[note.kind]}</span>
                  <div className={styles.noteBody}>
                    <p className={styles.noteTitle}>{note.title[language]}</p>
                    {note.detail && <p className={styles.noteDetail}>{note.detail[language]}</p>}
                    {credit !== '' && (
                      <p className={styles.credit}>
                        {credit.charAt(0).toUpperCase() + credit.slice(1)}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </Modal>
  )
}
