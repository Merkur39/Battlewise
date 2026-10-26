import { formatNumber } from './format'
import type { Catalog } from './fr'

const n = (value: number) => formatNumber(value, 'en')
const plurals = new Intl.PluralRules('en')
const players = (count: number) =>
  `${n(count)} ${plurals.select(count) === 'one' ? 'player' : 'players'}`

export const en: Catalog = {
  screens: { bestiary: 'Bestiary', simulation: 'Simulation', arsenal: 'Arsenal', guide: 'Guide' },
  shell: {
    navigation: 'Navigation',
    mainNavigation: 'Main navigation',
    settings: 'Settings',
    context: 'Your setup',
  },
  gear: {
    summary: (item, level, blockPower, skill) =>
      `Your gear: ${item} level ${n(level)}, block power ${n(blockPower)}, Blocking skill ${n(skill)}`,
    levelAndPower: (level, blockPower) => `Lv${n(level)} · Block ${n(blockPower)}`,
  },
  world: {
    summary: (difficulty, count) =>
      `Your world: ${difficulty.toLocaleLowerCase('en')} combat, ${players(count)}`,
    playersAndScale: (count, enemyScale) => `${players(count)} · ×${n(enemyScale)}`,
  },
  modal: { close: 'Close without saving', cancel: 'Cancel', save: 'Save' },
  settings: {
    title: 'Settings',
    language: 'Language',
    automatic: 'Automatic',
    languageNote: (detected) =>
      `Automatic follows your device (${detected === 'fr' ? 'French' : 'English'} detected), otherwise English. Game names follow the chosen language.`,
    theme: 'Theme',
    byDefault: 'Default',
    themeNote: 'Saved on this device. The preview changes as soon as you tap a choice.',
    themeNoteDesktop: 'The preview changes as soon as you choose.',
    about: 'About',
    dataSource: (version) => `Read from Valheim ${version} · no mods`,
    themes: {
      origine: { name: 'Origin', description: 'Cold black, glacier blue accent' },
      braise: { name: 'Ember', description: 'Warm charcoal, bone accent' },
      brume: { name: 'Mist', description: 'Violet night, lilac accent' },
      jour: { name: 'Daylight', description: 'Light, readable in full sun' },
      runes: { name: 'Runes', description: 'Dark stone, turquoise rune' },
      graphite: { name: 'Graphite', description: 'Neutral greys, understated' },
      parchemin: { name: 'Parchment', description: 'Warm light, blue ink' },
    },
  },
}
