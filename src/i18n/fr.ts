import type { Theme } from '@/app/store'
import type { Language } from './detect'
import { formatNumber } from './format'

const n = (value: number) => formatNumber(value, 'fr')
const plurals = new Intl.PluralRules('fr')
const players = (count: number) =>
  `${n(count)} ${plurals.select(count) === 'one' ? 'joueur' : 'joueurs'}`

const themes: Record<Theme, { readonly name: string; readonly description: string }> = {
  origine: { name: 'Origine', description: 'Noir froid, accent bleu glacier' },
  braise: { name: 'Braise', description: 'Charbon chaud, accent os' },
  brume: { name: 'Brume', description: 'Nuit violette, accent lilas' },
  jour: { name: 'Plein jour', description: 'Clair, lisible en plein soleil' },
  runes: { name: 'Runes', description: 'Pierre sombre, rune turquoise' },
  graphite: { name: 'Graphite', description: 'Gris neutres, sobre' },
  parchemin: { name: 'Parchemin', description: 'Clair chaud, encre bleue' },
}

/** The French interface. Its shape is the catalogue's: every language has the same keys, which the
 * typing checks. Short labels are written in sentence case; the styles capitalise them. */
export const fr = {
  screens: { bestiary: 'Bestiaire', simulation: 'Simulation', arsenal: 'Arsenal', guide: 'Mémo' },
  shell: {
    navigation: 'Navigation',
    mainNavigation: 'Navigation principale',
    settings: 'Réglages',
    context: 'Ton contexte',
  },
  gear: {
    summary: (item: string, level: number, blockPower: number, skill: number) =>
      `Ton équipement : ${item} niveau ${n(level)}, VD ${n(blockPower)}, compétence Blocage ${n(skill)}`,
    levelAndPower: (level: number, blockPower: number) => `N${n(level)} · VD ${n(blockPower)}`,
  },
  world: {
    summary: (difficulty: string, count: number) =>
      `Ton monde : combat ${difficulty.toLocaleLowerCase('fr')}, ${players(count)}`,
    playersAndScale: (count: number, enemyScale: number) => `${players(count)} · ×${n(enemyScale)}`,
  },
  modal: { close: 'Fermer sans enregistrer', cancel: 'Annuler', save: 'Valider' },
  settings: {
    title: 'Réglages',
    language: 'Langue',
    automatic: 'Automatique',
    languageNote: (detected: Language) =>
      `Automatique suit ton appareil (${detected === 'fr' ? 'français' : 'anglais'} détecté), sinon l'anglais. Les noms du jeu suivent la langue choisie.`,
    theme: 'Thème',
    byDefault: 'Par défaut',
    themeNote: "Gardés sur cet appareil. L'aperçu change dès que tu touches un choix.",
    themeNoteDesktop: "L'aperçu change dès que tu choisis.",
    about: 'À propos',
    dataSource: (version: string) => `Lues dans Valheim ${version} · sans mod`,
    themes,
  },
}

export type Catalog = typeof fr
