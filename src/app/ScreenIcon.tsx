import { ArsenalIcon, BestiaryIcon, GuideIcon, SimulationIcon, type IconProps } from '@/ui/icons'
import type { Screen } from './routes'

const ICONS = {
  bestiary: BestiaryIcon,
  simulation: SimulationIcon,
  arsenal: ArsenalIcon,
  guide: GuideIcon,
} satisfies Record<Screen, (props: IconProps) => React.JSX.Element>

export function ScreenIcon({ screen, ...props }: IconProps & { readonly screen: Screen }) {
  const Icon = ICONS[screen]
  return <Icon {...props} />
}
