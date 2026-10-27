import type { ReactNode } from 'react'

export interface IconProps {
  readonly size?: number
  readonly strokeWidth?: number
  readonly className?: string | undefined
}

// Single strokes on a 24 grid, as drawn in the design canvas; they take the colour of the text.
function Icon({
  size = 20,
  strokeWidth = 1.75,
  className,
  children,
}: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
  </Icon>
)

export const WorldIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
  </Icon>
)

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icon>
)

export const BestiaryIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="6.5" cy="10" r="2" />
    <circle cx="12" cy="6.5" r="2" />
    <circle cx="17.5" cy="10" r="2" />
    <path d="M8 18c0-3 1.8-5 4-5s4 2 4 5c0 1.7-1.8 2.5-4 2.5S8 19.7 8 18z" />
  </Icon>
)

export const SimulationIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
)

export const ArsenalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4z" />
    <path d="M6 13l5 5" />
  </Icon>
)

export const GuideIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2V5z" />
    <path d="M5 20a2 2 0 0 0 2 1h12v-3" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12l5 5L20 7" />
  </Icon>
)

export const WarningIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Icon>
)

export const ParryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M13 7.5l-3 4.5h4l-3 4.5" />
  </Icon>
)

export const DodgeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 16a8 8 0 0 1 14.5-6.5" />
    <path d="M19 4.5v5h-5" />
    <path d="M3 20h8" />
  </Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
)

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ExternalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 17L17 7M9 7h8v8" />
  </Icon>
)

export const BackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)
