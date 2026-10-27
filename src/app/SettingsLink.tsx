import { useT } from '@/i18n/useT'
import { SettingsIcon } from '@/ui/icons'
import { routeHash } from './routes'
import { openModal, useRoute } from './useRoute'

/** Opens the Settings over the current screen: an icon in the top bar, a labelled link in the
 * sidebar. */
export function SettingsLink({
  variant,
  className,
  labelClassName,
}: {
  readonly variant: 'icon' | 'labelled'
  readonly className: string | undefined
  readonly labelClassName?: string | undefined
}) {
  const t = useT()
  const route = useRoute()
  return (
    <a
      href={routeHash({ ...route, modal: 'settings' })}
      aria-label={variant === 'icon' ? t.shell.settings : undefined}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        openModal('settings')
      }}
    >
      <SettingsIcon size={variant === 'icon' ? 22 : 20} />
      {variant === 'labelled' && <span className={labelClassName}>{t.shell.settings}</span>}
    </a>
  )
}
