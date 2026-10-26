import type { Preset } from '@vite-pwa/assets-generator/config'
import type { ManifestOptions } from 'vite-plugin-pwa'
// Imported by vite.config.ts: with its extension, as Vite's native config loader asks.
import { APP_NAME } from './brand.ts'

// The background of the default theme, Origine (src/styles/themes.css; the tests check they agree).
const DEFAULT_BACKGROUND = '#0d1214'

/** The web app manifest, read by vite.config.ts: one for both languages, as the name is. Its icons
 * come from the assets generator. */
export const manifest = {
  name: APP_NAME,
  short_name: APP_NAME,
  display: 'standalone',
  start_url: '.',
  scope: '.',
  background_color: DEFAULT_BACKGROUND,
  theme_color: DEFAULT_BACKGROUND,
} satisfies Partial<ManifestOptions>

/** The icons drawn from public/icon.svg (track A of the design canvas), as minimal-2023 lists them.
 * The source already holds the shield inside the safe zone of a maskable icon: no padding, and the
 * corners a launcher or iOS fills take the default background. */
export const iconPreset = {
  transparent: { sizes: [64, 192, 512], padding: 0, favicons: [[48, 'favicon.ico']] },
  maskable: { sizes: [512], padding: 0, resizeOptions: { background: DEFAULT_BACKGROUND } },
  apple: { sizes: [180], padding: 0, resizeOptions: { background: DEFAULT_BACKGROUND } },
} satisfies Preset
