/** How this browser installs Battlewise: its own prompt; Safari's steps on an iPhone (its Share button
 * behind ⋯ since Safari 26, in its bar before), on an iPad (in its bar), on a Mac (File › Add to Dock,
 * from Safari 17). */
export type InstallWay = 'prompt' | 'ios-menu' | 'ios-bar' | 'mac'

export interface Device {
  readonly userAgent: string
  readonly maxTouchPoints: number
  /** The app runs installed: display-mode standalone, or navigator.standalone on iOS. */
  readonly standalone: boolean
  /** The browser offered its own prompt (beforeinstallprompt). */
  readonly prompt: boolean
}

// Safari says Version/; Chrome, Edge, Firefox and Opera on iOS are Safari underneath, but their menus
// are their own.
const SAFARI = /Version\/(\d+)[\d.]*.*Safari\//
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\/|Firefox/

/** Null where the app already runs installed, or where the browser neither prompts nor has steps we
 * know. */
export function installWay({
  userAgent,
  maxTouchPoints,
  standalone,
  prompt,
}: Device): InstallWay | null {
  if (standalone) return null
  if (prompt) return 'prompt'
  const version = SAFARI.exec(userAgent)?.[1]
  if (version === undefined || NOT_SAFARI.test(userAgent)) return null
  if (/iPhone|iPod/.test(userAgent)) return Number(version) >= 26 ? 'ios-menu' : 'ios-bar'
  // An iPad asks for the desktop site: it says Macintosh, and only its touch points give it away.
  const mac = userAgent.includes('Macintosh')
  if (userAgent.includes('iPad') || (mac && maxTouchPoints > 1)) return 'ios-bar'
  if (mac && Number(version) >= 17) return 'mac'
  return null
}
