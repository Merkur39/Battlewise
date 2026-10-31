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
    version: '1.13.0',
    date: '2026-10-31',
    notes: [
      {
        text: {
          fr: "Dans Ton équipement, tu choisis ton casque, ton plastron, tes jambières et ta cape, chacun à son niveau, au lieu de taper ton armure : Foelore en connaît l'armure et les résistances, comme la Cape en fourrure de loup contre la glace ou la Cuirasse de racines contre le perforant, mais faible au feu, et le bonus d'un ensemble complet. Les verdicts, la fiche, la Simulation et ce que tu encaisses en tiennent compte. Si tu avais tapé ton armure, elle compte jusqu'à ce que tu choisisses une pièce.",
          en: 'In Your gear, you pick your helmet, chest, legs and cape, each at its level, instead of typing your armor: Foelore knows their armor and resistances, such as the Wolf Fur Cape against frost or the Root Harnesk against pierce, though weak to fire, and the bonus of a full set. The verdicts, the sheet, the Simulation and what you can take count them. If you had typed your armor, it counts until you pick a piece.',
        },
      },
      {
        text: {
          fr: 'Ta compétence Blocage se règle comme tes PV max, et ce que tu tiens devient « En main », une ligne avec son niveau à droite.',
          en: 'Your Blocking skill is set like your max HP, and what you hold becomes “In hand”, one row with its level on the right.',
        },
      },
      {
        text: {
          fr: "Dans le Mémo, chaque effet donne ses résistances, son armure et sa durée : les résistances ne se multiplient jamais, la plus forte l'emporte. Une ligne explique aussi le gel de la Montagne, qui épargne qui résiste à la glace.",
          en: 'In the Guide, each effect gives its resistances, armor and duration: resistances never multiply, the strongest wins. A line also explains freezing in the Mountain, which spares anyone resistant to frost.',
        },
      },
    ],
  },
  {
    version: '1.12.1',
    date: '2026-10-30',
    notes: [
      {
        text: {
          fr: "Quand chaque parade tient mais qu'un blocage cède, le Bestiaire et la fiche de la créature disent que le blocage cède, comme la Simulation, et non plus que tu titubes en bloquant.",
          en: "When every parry holds but a block gives way, the Bestiary and the creature's sheet say that the block gives way, as the Simulation does, no longer that blocking staggers you.",
        },
      },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "À la première ouverture, Foelore pose trois questions avant le Bestiaire : où tu en es, ton équipement et ton monde, pour que ses verdicts parlent de toi dès le début. Chacune se passe, et tout reste réglable ensuite. Si tu utilisais déjà l'app, tu les verras une fois, tes réglages déjà remplis.",
          en: 'When first opened, Foelore asks three questions before the Bestiary: where you are, your gear and your world, so that its verdicts are about you from the start. Each can be skipped, and everything can still be set later. If you already used the app, you will see them once, your settings already filled in.',
        },
      },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-28',
    notes: [
      {
        text: {
          fr: "Le Bestiaire s'ouvre sur le dernier biome que tu as choisi, plus sur les Prairies. Une créature ouverte depuis la recherche ne le change pas, et un lien vers un autre biome ouvre toujours celui-là.",
          en: 'The Bestiary opens on the biome you last picked, no longer on the Meadows. A creature opened from the search does not change it, and a link to another biome still opens that one.',
        },
      },
    ],
  },
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
