import type { Theme } from '@/app/store'
import type { Language } from './detect'
import { formatNumber } from './format'

const n = (value: number) => formatNumber(value, 'fr')
const plurals = new Intl.PluralRules('fr')
const plural = (count: number, one: string, other: string) =>
  `${n(count)} ${plurals.select(count) === 'one' ? one : other}`
const players = (count: number) => plural(count, 'joueur', 'joueurs')
const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const listOf = (words: readonly string[]) =>
  new Intl.ListFormat('fr', { type: 'conjunction' }).format(
    words.map((word) => word.toLocaleLowerCase('fr')),
  )
// French guillemets hold their words apart with a no-break space.
const NO_BREAK_SPACE = String.fromCharCode(0xa0)
const quoted = (name: string) => `«${NO_BREAK_SPACE}${name}${NO_BREAK_SPACE}»`

const themes: Record<Theme, { readonly name: string; readonly description: string }> = {
  origine: { name: 'Origine', description: 'Noir froid, accent bleu glacier' },
  braise: { name: 'Braise', description: 'Charbon chaud, accent os' },
  brume: { name: 'Brume', description: 'Nuit violette, accent lilas' },
  jour: { name: 'Plein jour', description: 'Clair, lisible en plein soleil' },
  runes: { name: 'Runes', description: 'Pierre sombre, rune turquoise' },
  graphite: { name: 'Graphite', description: 'Gris neutres, sobre' },
  parchemin: { name: 'Parchemin', description: 'Clair chaud, encre bleue' },
}

/** An attack in one sentence, for screen readers. */
interface AttackWords {
  readonly name: string
  /** The game's names of its damage types, the largest first. */
  readonly types: readonly string[]
  /** Null for an attack that only summons. */
  readonly damage: number | null
  readonly block: string
  readonly parry: string
  readonly dodgeable: boolean
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
  verdicts: {
    block: 'Blocage',
    parry: 'Parade',
    dodge: 'Esquive',
    holds: 'tient',
    staggered: 'tu titubes',
    broken: 'ne passe pas',
    unblockable: 'imparable',
    cannotParry: 'ne pare pas',
    nothing: 'aucune attaque directe',
    dodgeable: 'esquivable',
    undodgeable: 'inesquivable',
    pill: (guard: string, word: string) => `${guard} : ${word}`,
  },
  advice: {
    unknown: 'Aucune attaque directe',
    blockAll: 'Tu bloques tout sans tituber',
    parryAll: 'Pare-le : en bloquant, tu titubes',
    dodgeAll: (rolls: boolean, canParry: boolean) =>
      `${rolls ? 'Esquive' : 'Évite'} tout : même ${canParry ? 'parées' : 'bloquées'}, ses attaques passent`,
    dodgeSome: (rolls: boolean, attacks: readonly string[], rest: 'block' | 'parry') =>
      `${rolls ? 'Esquive' : 'Évite'} ${attacks.length === 1 ? quoted(attacks[0]!) : `${n(attacks.length)} attaques`}, ${rest === 'block' ? 'bloque' : 'pare'} le reste`,
  },
  bestiary: {
    intro: 'Comment prendre chaque créature avec ton équipement.',
    search: 'Rechercher dans tous les biomes',
    searchPlaceholder: 'Monstre ou attaque, tous biomes',
    clearSearch: 'Effacer la recherche',
    biome: 'Biome',
    previousBiome: (name: string) => `Biome précédent : ${name}`,
    nextBiome: (name: string) => `Biome suivant : ${name}`,
    biomeCount: (index: number, total: number, count: number) =>
      `Biome ${n(index)} sur ${n(total)} · ${plural(count, 'créature', 'créatures')}`,
    howToTake: 'Comment le prendre',
    withYourGear: 'Avec ton équipement',
    creatures: 'Créatures du biome',
    health: (health: number) => `${n(health)} PV`,
    boss: 'Boss',
    foundCreatures: (count: number) => `Créatures · ${n(count)}`,
    foundAttacks: (count: number) => `Attaques · ${n(count)}`,
    nothingFound: (query: string) => `Rien pour ${quoted(query)}`,
    searchNote:
      "Résultats sur tous les biomes. Une attaque ouvre la fiche de sa créature, d'où tu peux la simuler.",
  },
  creature: {
    back: 'Retour',
    stars: 'Étoiles',
    star: (stars: number) => `${n(stars)}★`,
    health: 'Points de vie',
    healthShort: 'PV',
    toInflict: 'À infliger',
    neverStaggers: 'Ne titube jamais',
    yourParry: 'Ta parade',
    parryStaggers: 'Le fait tituber',
    parryDoesNot: 'Ne le fait pas tituber',
    cannotParry: 'Ton objet ne pare pas',
    modifiers: 'Faiblesses et résistances',
    modifier: (type: string, state: string, multiplier: number) =>
      `${type} · ${state} ×${n(multiplier)}`,
    everythingElse: 'Tout le reste ×1',
    noModifier: 'Tout ×1',
    attacks: 'Ses attaques',
    attack: 'Attaque',
    damage: 'Dégâts',
    damageShort: 'Dég.',
    range: 'Portée',
    simulate: 'Simuler',
    kinds: { melee: 'Mêlée', area: 'Zone', projectile: 'Projectile', summon: 'Invocation' },
    metres: (metres: number) => `${n(metres)} m`,
    phase: (index: number, health: number) => `Phase ${n(index)} · ${n(health)} PV`,
    noAttack: 'Aucune attaque',
    attackSummary: ({ name, types, damage, block, parry, dodgeable }: AttackWords) =>
      damage === null
        ? `${name}, invocation.`
        : `${name}, ${listOf(types)}, ${n(damage)} dégâts. Blocage : ${block}. Parade : ${parry}. ${dodgeable ? 'Esquivable' : 'Inesquivable'}.`,
    openSimulation: 'Ouvrir la simulation.',
    openSheet: (creature: string) => `Ouvrir la fiche ${creature}.`,
    simulateLabel: (name: string, damage: number) => `Simuler : ${name}, ${n(damage)} dégâts`,
    tapToSimulate: 'Touche une attaque pour la simuler.',
    desktopNote:
      "Simuler ouvre l'attaque dans la Simulation, avec la barre de stagger et l'endurance.",
  },
  simulation: {
    intro: 'Choisis une attaque : la page te dit comment la prendre avec ton équipement.',
    source: 'Source du coup',
    modes: { attack: "Attaque d'un monstre", value: 'Valeur libre' },
    hit: 'Le coup',
    change: 'Changer',
    changeLabel: (creature: string, attack: string, damage: number) =>
      `Changer d'attaque : ${creature}, ${attack}, ${n(damage)} dégâts`,
    noAttack: 'Aucune attaque choisie',
    pick: 'Choisir une attaque',
    stars: 'Étoiles du monstre',
    starsShort: 'Étoiles',
    value: 'Dégâts du coup',
    lower: 'Baisser de 5',
    raise: 'Monter de 5',
    valueNote: 'Dégâts de base du coup, avant difficulté et joueurs proches.',
    bar: 'Barre de stagger avant le coup',
    barOption: (percent: number) => `${n(percent)} %`,
    result: 'Résultat',
    blocking: 'En bloquant',
    parrying: 'En parant',
    taken: 'subis',
    stamina: (stamina: number) =>
      stamina > 0
        ? `−${n(stamina)} endurance`
        : stamina < 0
          ? `+${n(-stamina)} endurance`
          : '0 endurance',
    barTotal: (total: number, limit: number) => `barre : ${n(total)} / ${n(limit)}`,
    barOverflows: 'barre : déborde',
    barLabel: (total: number, limit: number, overflows: boolean) =>
      `Barre de stagger : ${n(total)} sur ${n(limit)}${overflows ? ', elle déborde' : ''}`,
    dodgeable: 'Esquivable en roulade',
    undodgeable: 'Pas esquivable en roulade',
    hits: (count: number) =>
      `Cette attaque porte ${n(count)} coups : chaque carte montre le plus dur.`,
    advice: {
      block: 'Bloque-le : tu tiens sans tituber',
      parry: (block: 'staggered' | 'broken') =>
        `Pare-le : ${block === 'broken' ? 'le blocage cède' : 'en bloquant, tu titubes'}`,
      /** `dodgeable` is null for a free value, which no roll is known to avoid. */
      dodge: (
        dodgeable: boolean | null,
        guard: 'block' | 'parry',
        setback: 'staggered' | 'broken' | 'unblockable',
      ) => {
        if (setback === 'unblockable') {
          if (dodgeable === null) return 'Imparable : esquive si tu peux'
          return dodgeable ? 'Imparable : esquive-le' : 'Imparable : éloigne-toi'
        }
        const why =
          guard === 'parry'
            ? setback === 'broken'
              ? 'même la parade cède'
              : 'même paré, tu titubes'
            : setback === 'broken'
              ? 'le blocage cède'
              : 'en bloquant, tu titubes'
        if (dodgeable === null) return `${capitalised(why)} : esquive si tu peux`
        return `${dodgeable ? 'Esquive' : 'Évite'}-le : ${why}`
      },
    },
  },
  picker: {
    title: 'Choisir une attaque',
    close: 'Fermer',
    search: 'Rechercher un ennemi ou une attaque',
    searchPlaceholder: 'Ennemi ou attaque, tous biomes',
    recent: 'Récentes',
    enemies: 'Ennemis',
    biomeCount: (index: number, total: number) => `Biome ${n(index)} sur ${n(total)}`,
    attackCount: (count: number) => plural(count, 'attaque', 'attaques'),
    enemiesNote: "Touche un ennemi pour voir ses attaques, puis l'attaque à simuler.",
    attacksNote:
      "Clique une attaque pour l'ouvrir dans la Simulation. Dégâts à l'étoile la plus basse : les étoiles se règlent là-bas.",
    foundAttacks: (count: number) => `Attaques · ${n(count)}`,
    foundEnemies: (count: number) => `Ennemis · ${n(count)}`,
    noAttack: (query: string) => `Aucune attaque ne correspond à ${quoted(query)}.`,
    noEnemy: (query: string) => `Aucun ennemi ne correspond à ${quoted(query)}.`,
    openNote: "Toucher une attaque l'ouvre directement dans la Simulation.",
    resultsNote: 'Résultats sur tous les biomes.',
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
