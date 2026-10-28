import type { Localized } from '@/data/types'

/** A line of a version's notes. */
export interface ReleaseNote {
  readonly text: Localized
  /** The issues it fixes: a player who reported one of them is thanked for it. */
  readonly fixes?: readonly number[]
  /** The names the players who reported it gave, thanked under it. */
  readonly thanks?: readonly string[]
}

export interface Release {
  readonly version: string
  /** The day it shipped, yyyy-mm-dd. */
  readonly date: string
  readonly notes: readonly ReleaseNote[]
}

/**
 * What's new, newest first: every pull request that bumps the version adds its notes here, and lists
 * under `fixes` the reports it closes (#33). Settings › What's new shows them, and a player whose report
 * one of them fixes is told so after the update.
 */
export const RELEASES: readonly Release[] = [
  {
    version: '1.10.0',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "Réglages › À propos › Mentions et crédits : Foelore y dit qu'il est un projet de fan non officiel, ce qu'il doit au wiki Valheim, aux polices et aux bibliothèques qu'il utilise, ce que deviennent tes données, et à qui écrire pour faire retirer un signalement ou ton pseudo.",
          en: 'Settings › About › Notices and credits: Foelore says there that it is an unofficial fan project, what it owes to the Valheim wiki and to the fonts and libraries it uses, what becomes of your data, and whom to write to to have a report or your nickname removed.',
        },
      },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "Battlewise s'appelle désormais Foelore, à une nouvelle adresse : foelore.vercel.app. Ton équipement, ton monde et tes réglages ne suivent pas : règle-les une fois, et réinstalle l'app si tu l'avais installée.",
          en: 'Battlewise is now Foelore, at a new address: foelore.vercel.app. Your gear, your world and your settings do not follow: set them once, and install the app again if you had.',
        },
      },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "Les chiffres sont lus dans Valheim 1.0.21 : contre Kall Mandefimbul, le sol en feu que laisse la Nova de l'Aspect de l'Âme tourmentée inflige deux fois moins de Feu.",
          en: "The numbers are read from Valheim 1.0.21: against Kall Fimbulbringer, the burning ground the Aspect of the Twisted Soul's Nova leaves deals half the Fire.",
        },
      },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "Foelore propose une fois de s'installer, là où ton navigateur le permet : une icône sur ton écran d'accueil, en plein écran, sans connexion. Sur iPhone, il donne les étapes de Safari. L'offre reste dans Réglages › À propos.",
          en: "Foelore offers once to install itself, where your browser can: an icon on your home screen, full screen, offline. On an iPhone, it gives Safari's steps. The offer stays in Settings › About.",
        },
      },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: 'Fermer les Réglages avec Retour remet aussitôt le thème et la langue enregistrés, sans laisser voir un instant ceux que tu essayais.',
          en: 'Closing Settings with Back brings the saved theme and language back at once, without a glimpse of the ones you were trying.',
        },
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-27',
    notes: [
      {
        text: {
          fr: "Si une fiche, un écran ou une ligne plante, le reste de Foelore marche : réessaie, ou envoie le rapport, l'erreur jointe. Rien ne part sans toi.",
          en: 'If a sheet, a screen or a row crashes, the rest of Foelore works: try again, or send the report, the error attached. Nothing leaves without you.',
        },
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-27',
    notes: [
      {
        text: {
          fr: "Signaler une ligne déjà signalée, et pas encore corrigée, ajoute un +1 à son ticket au lieu d'en ouvrir un autre.",
          en: 'Reporting a line already reported, and not fixed yet, adds a +1 to its issue instead of opening another.',
        },
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-27',
    notes: [
      {
        text: {
          fr: 'Mes signalements et Nouveautés, dans Réglages : où en est chacun de tes signalements, et ce que corrige chaque version.',
          en: "My reports and What's new, in Settings: where each of your reports stands, and what each version fixes.",
        },
      },
      {
        text: {
          fr: 'Quand une mise à jour corrige un de tes signalements, Foelore te le dit, une fois.',
          en: 'When an update fixes one of your reports, Foelore tells you, once.',
        },
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-10-27',
    notes: [
      {
        text: {
          fr: "Le Bestiaire ne liste plus une créature là où le jeu ne la fait jamais apparaître, et une attaque à projectile n'est plus comptée comme une zone.",
          en: 'The Bestiary no longer lists a creature where the game never spawns it, and a projectile attack is no longer counted as an area.',
        },
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-27',
    notes: [
      {
        text: {
          fr: "Signale un chiffre ou un nom faux, un bug ou une idée depuis l'app.",
          en: 'Report a wrong number or name, a bug or an idea from the app.',
        },
      },
    ],
  },
]

/** Above zero when `a` is the newer version, below when it is the older, zero when they are the same. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}
