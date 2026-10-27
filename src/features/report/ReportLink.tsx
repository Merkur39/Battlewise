import { FlagIcon } from '@/ui/icons'
import type { ReportOrigin } from './model'
import styles from './ReportLink.module.css'
import { useOpenReport } from './useReport'

/** A sentence under what one reads, where a doubt comes, that opens a report about it. */
export function ReportLink({
  origin,
  label,
}: {
  readonly origin: ReportOrigin
  readonly label: string
}) {
  const open = useOpenReport()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={styles.link}
      onClick={() => {
        open(origin)
      }}
    >
      <FlagIcon size={16} strokeWidth={2} className={styles.icon} />
      {label}
    </button>
  )
}
