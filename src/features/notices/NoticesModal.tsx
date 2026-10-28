import { Fragment, type ReactNode } from 'react'
import { CONTACT_EMAIL } from '@/app/brand'
import { closeModal, replaceRoute, useRoute } from '@/app/useRoute'
import { useT } from '@/i18n/useT'
import { ExternalIcon } from '@/ui/icons'
import { Modal } from '@/ui/Modal'
import styles from './Notices.module.css'

const WIKI_URL = 'https://valheim.fandom.com'
const CC_BY_SA_URL = 'https://creativecommons.org/licenses/by-sa/3.0/'
/** Written beside the build and cached with it, so it opens offline too (vite.config.ts). */
const LICENCES_URL = `${import.meta.env.BASE_URL}licences.txt`

/** Notices and credits, from Settings › About: a fan project, what the app owes to others, what
 * becomes of the player's data, and who publishes and hosts it. */
export function NoticesModal() {
  const t = useT()
  const route = useRoute()
  const notices = t.notices

  return (
    <Modal
      title={notices.title}
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
      <Block title={notices.fan}>
        <p>{notices.fanText}</p>
      </Block>
      <Block title={notices.credits}>
        <p>
          {withLinks(notices.wikiText, {
            wiki: <NewTab href={WIKI_URL}>{notices.wiki}</NewTab>,
            licence: <NewTab href={CC_BY_SA_URL}>CC BY-SA 3.0</NewTab>,
          })}
        </p>
        <p>{notices.fonts}</p>
        <p>{notices.libraries}</p>
        <a className={styles.file} href={LICENCES_URL} target="_blank" rel="noopener">
          <span className={styles.fileName}>{notices.licenceTexts}</span>
          <span className={styles.fileKind}>TXT</span>
          <ExternalIcon size={14} strokeWidth={2} />
        </a>
      </Block>
      <Block title={notices.data}>
        <p>{notices.device}</p>
        <p>{notices.reports}</p>
        <p>{notices.network}</p>
        <p>
          {withLinks(notices.removal, {
            email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
          })}
        </p>
      </Block>
      <Block title={notices.legal}>
        <p>{notices.publisher}</p>
        <p>{notices.host}</p>
      </Block>
    </Modal>
  )
}

/** A block of notices: its name above it on a phone, beside it on a desktop. */
function Block({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.lines}>{children}</div>
    </section>
  )
}

function NewTab({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
    </a>
  )
}

/** A sentence whose {name} stands for the link of that name. */
function withLinks(text: string, links: Readonly<Record<string, ReactNode>>) {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={index}>{name === undefined ? part : links[name]}</Fragment>
  })
}
