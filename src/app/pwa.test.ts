import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import icon from '../../public/icon.svg?raw'
import { iconPreset, manifest } from './pwa'

// Read from the disk: Vitest empties every stylesheet it imports, raw ones included.
const themes = readFileSync('src/styles/themes.css', 'utf8')

const tokenOf = (theme: string, token: string) => {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(themes)?.[1] ?? ''
  return new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1]
}

describe('the web app manifest', () => {
  it('names the app the same in every language and opens it on its own', () => {
    expect(manifest).toMatchObject({
      name: 'Battlewise',
      short_name: 'Battlewise',
      display: 'standalone',
      start_url: '.',
      scope: '.',
    })
  })

  it("takes the default theme's background, for the splash screen and the bars", () => {
    expect(manifest.background_color).toBe(tokenOf('origine', 'bg'))
    expect(manifest.theme_color).toBe(tokenOf('origine', 'bg'))
  })
})

describe('the app icon', () => {
  it('is the brand shield in trait, on the default background: track A of the canvas', () => {
    expect(icon).toContain('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z')
    expect(icon).toContain(`fill="${String(tokenOf('origine', 'bg'))}"`)
    expect(icon).toContain(`stroke="${String(tokenOf('origine', 'accent'))}"`)
  })

  it('fills the corners a launcher or iOS crops with that background', () => {
    expect(iconPreset.maskable.resizeOptions.background).toBe(tokenOf('origine', 'bg'))
    expect(iconPreset.apple.resizeOptions.background).toBe(tokenOf('origine', 'bg'))
  })
})
