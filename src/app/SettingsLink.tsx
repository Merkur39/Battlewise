import { useT } from '@/i18n/useT'
import { SettingsIcon } from '@/ui/icons'
import { routeHash, type Screen } from './routes'
import { openModal } from './useRoute'

/** Opens the Settings over the current screen: an icon in the top bar, a labelled link in the
 * sidebar. */
export function SettingsLink({
  screen,
  variant,
  className,
}: {
  readonly screen: Screen
  readonly variant: 'icon' | 'labelled'
  readonly className: string | undefined
}) {
  const t = useT()
  return (
    <a
      href={routeHash({ screen, modal: 'settings' })}
      aria-label={variant === 'icon' ? t.shell.settings : undefined}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        openModal('settings')
      }}
    >
      <SettingsIcon size={variant === 'icon' ? 22 : 20} />
      {variant === 'labelled' && t.shell.settings}
    </a>
  )
}
