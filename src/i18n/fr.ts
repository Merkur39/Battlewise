import { APP_NAME, PUBLISHER } from '@/app/brand'
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
    contextSummary: (blockPower: number, enemyScale: number) =>
      `Ton contexte : VD ${n(blockPower)} ×${n(enemyScale)}`,
    contextPower: (blockPower: number) => `VD ${n(blockPower)}`,
    contextScale: (enemyScale: number) => `×${n(enemyScale)}`,
    contextNote: 'Chaque verdict en dépend',
  },
  gear: {
    summary: (item: string, level: number, blockPower: number, skill: number) =>
      `Ton équipement : ${item} niveau ${n(level)}, VD ${n(blockPower)}, compétence Blocage ${n(skill)}`,
    levelAndPower: (level: number, blockPower: number) => `N${n(level)} · VD ${n(blockPower)}`,
    title: 'Ton équipement',
    withstand: 'Ce que tu encaisses',
    emptyBar: 'Barre vide',
    block: 'Bloquer',
    parry: 'Parer',
    power: (power: number) => `VD ${n(power)}`,
    unstaggered: 'sans tituber',
    unbroken: 'tient',
    cannotParry: 'ton objet ne pare pas',
    staggersAt: (limit: number, share: number, health: number, armor: number) =>
      `Titube à ${n(limit)} (${n(share)} % de ${n(health)} PV) · armure ${n(armor)}`,
    powerParts: (base: number, skill: number) => `VD = ${n(base)} × ${n(skill)}`,
    item: 'Objet qui bloque',
    groups: {
      round: 'Boucliers ronds',
      buckler: 'Targes',
      tower: 'Écus',
      weapon: 'Armes',
      other: 'Autres',
    },
    groupTags: { round: 'Rond', buckler: 'Targe', tower: 'Écu', weapon: 'Arme', other: 'Autre' },
    parryBonus: (bonus: number) => `×${n(bonus)}`,
    noParry: 'ne pare pas',
    torch: "Avec une torche en main gauche, c'est elle qui bloque.",
    level: 'Niveau',
    levelLong: "Niveau d'amélioration",
    lowerLevel: 'Niveau inférieur',
    raiseLevel: 'Niveau supérieur',
    /** `forge` names the station that takes the item past `maxQuality`, if any. */
    levelNote: (perLevel: number, maxQuality: number, forge: string | null) => {
      const gain =
        perLevel > 0 ? `+${n(perLevel)} de VD par niveau` : 'Le niveau ne change pas sa VD'
      return forge
        ? `${gain} ; au-delà du niveau ${n(maxQuality)} : ${forge}.`
        : `${gain}, jusqu'au niveau max de l'objet.`
    },
    notUpgradable: "Cet objet ne s'améliore pas.",
    skill: 'Compétence Blocage',
    armor: 'Armure',
    lowerArmor: "Moins d'armure",
    raiseArmor: "Plus d'armure",
    health: 'PV max',
    lowerHealth: 'Moins de PV',
    raiseHealth: 'Plus de PV',
  },
  world: {
    summary: (difficulty: string, count: number) =>
      `Ton monde : combat ${difficulty.toLocaleLowerCase('fr')}, ${players(count)}`,
    playersAndScale: (count: number, enemyScale: number) => `${players(count)} · ×${n(enemyScale)}`,
    title: 'Ton monde',
    difficulty: 'Difficulté du combat',
    multiplier: (value: number) => `×${n(value)}`,
    difficultyNote: `Le réglage ${quoted('Combat')} des modificateurs du monde.`,
    players: (range: number) => `Joueurs à moins de ${n(range)} m, toi compris`,
    orMore: (count: number) => `${n(count)}+`,
    orMoreLabel: (count: number) => `${n(count)} ou plus`,
    effects: 'Ce que ça donne',
    enemyHits: 'Coups des monstres',
    yourDamage: 'Tes dégâts et ton stagger',
    yourDamageShort: 'Tes dégâts',
    starChance: "Chance d'étoiles",
    rulesNote: 'Les règles (fenêtre de parade, seuils) ne changent pas.',
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
    modifiersOn: (part: string) => `Faiblesses et résistances · ${part}`,
    body: 'Corps',
    /** `state` is null for a tool taken normally: the game has no word for it. */
    modifier: (type: string, state: string | null, multiplier: number) =>
      state === null ? `${type} ×${n(multiplier)}` : `${type} · ${state} ×${n(multiplier)}`,
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
    trample: 'Écrasement',
    whenRunning: 'En course',
    deathBlast: 'Explosion',
    onDeath: (phase: boolean): string => (phase ? 'Fin de la phase' : 'À sa mort'),
    count: (min: number, max: number) => (min === max ? `×${n(min)}` : `×${n(min)}–${n(max)}`),
    seeSheet: 'Voir sa fiche',
    sheet: 'Sa fiche',
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
    thresholds: 'Tes seuils sont dans Ton équipement',
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
  arsenal: {
    intro: 'Chiffres calculés avec ta compétence Blocage',
    atLevel: ", au niveau d'amélioration choisi.",
    sortedByPower: 'Triés par VD',
    category: 'Catégorie',
    categories: { shields: 'Boucliers', weapons: 'Armes', others: 'Autres' },
    item: { shields: 'Bouclier', weapons: 'Arme', others: 'Objet' },
    level: 'Niveau',
    levelGroup: "Niveau d'amélioration",
    levelValue: (level: number) => `N${n(level)}`,
    sort: 'Trier par',
    columns: {
      type: 'Type',
      power: 'VD',
      parry: 'En parade',
      force: 'Repousse',
      speed: 'Vitesse',
      action: 'Action',
    },
    speed: (share: number) =>
      share === 0 ? '0 %' : `${share < 0 ? '−' : '+'}${n(Math.abs(share) * 100)} %`,
    stopsAt: (level: number) => `N${n(level)} max`,
    equipped: 'Équipé',
    equip: 'Équiper',
    equipLabel: (item: string) => `Équiper : ${item}`,
    rowLabel: (item: string, equipped: boolean) =>
      `${item}${equipped ? ', équipé' : ''}. Ouvrir dans Ton équipement.`,
  },
  guide: {
    intro: (version: string) => `Les règles du combat, lues dans Valheim ${version}.`,
    search: 'Rechercher dans le mémo',
    searchPlaceholder: 'Rechercher une règle',
    clearSearch: 'Effacer la recherche',
    rules: 'Règles',
    contents: 'Sommaire du mémo',
    noMatch: (query: string) => `Aucune règle ne correspond à ${quoted(query)}.`,
  },
  modal: { close: 'Fermer sans enregistrer', cancel: 'Annuler', save: 'Valider' },
  report: {
    fromCreature: 'Un chiffre ou un nom faux ? Signale-le',
    fromVerdict: 'Ce verdict te paraît faux ? Signale-le',
    fromSettings: 'Signaler un problème ou une idée',
    title: 'Signaler',
    close: 'Fermer',
    kinds: 'Ce que tu signales',
    kind: { data: 'Donnée fausse', bug: 'Bug', idea: 'Idée' },
    whichLine: 'Quelle ligne ?',
    optional: 'facultatif',
    weaknesses: 'Faiblesses',
    message: 'Ton message',
    text: {
      data: "Qu'est-ce qui est faux ?",
      bug: "Qu'est-ce qui s'est passé ?",
      idea: 'Ton idée',
    },
    textHint: {
      data: 'Dans le jeu, elle fait 60, pas 70.',
      bug: "La fiche reste vide quand je change d'étoiles.",
      idea: 'Voir les attaques des boss phase par phase.',
    },
    game: 'Ce que montre le jeu',
    gameHint: '60, ou un autre nom',
    nickname: 'Ton pseudo, pour te remercier',
    nicknameHint: 'Ton pseudo',
    attached: 'Joint au signalement',
    attachedSummary: "Version, données, ce que l'écran affiche, ton contexte",
    device: (version: string, gameVersion: string) =>
      `${APP_NAME} ${version} · lues dans Valheim ${gameVersion}`,
    screen: (
      language: Language,
      screen: 'creature' | 'simulation' | 'settings' | 'app' | 'bestiary' | 'arsenal' | 'guide',
      width: number,
    ) =>
      [
        { fr: 'Français', en: 'Anglais' }[language],
        ...(screen === 'app'
          ? []
          : [
              {
                creature: 'fiche monstre',
                simulation: 'Simulation',
                settings: 'Réglages',
                bestiary: 'Bestiaire',
                arsenal: 'Arsenal',
                guide: 'Mémo',
              }[screen],
            ]),
        `écran de ${n(width)} px`,
      ].join(' · '),
    crashText: 'Ce que tu faisais',
    crashHint: {
      creature: "J'ai passé le Troll à 2★.",
      bestiary: "J'ai changé de biome.",
      simulation: "J'ai choisi une attaque.",
      arsenal: "J'ai changé de niveau.",
      guide: "J'ai ouvert une règle.",
      app: `J'ai ouvert ${APP_NAME}.`,
    },
    crashSummary: "Version, écran, l'erreur et sa pile",
    moreLines: (count: number) => `… ${plural(count, 'ligne', 'lignes')} de plus`,
    nothingElse: "Rien d'autre : ni adresse IP, ni identifiant.",
    public: 'Ton signalement devient public sur GitHub, avec ton pseudo si tu en donnes un.',
    send: 'Envoyer',
    sending: 'Envoi…',
    cancel: 'Annuler',
    received: "Reçu, c'est le",
    receivedNote: 'Il est public sur GitHub. Merci : chaque correction sert à tous les joueurs.',
    view: 'Voir sur GitHub',
    queued: 'Gardé sur ton appareil',
    queuedNote: `Il n'a pas pu partir pour l'instant. Il partira tout seul dès que le réseau revient, ou à la prochaine ouverture de ${APP_NAME}.`,
    refused: 'Refusé par le serveur',
    refusedNote:
      'Il ne partira pas tel quel. Écris-le plutôt sur GitHub, où chaque formulaire te guide.',
    onGitHub: 'Ouvrir un ticket sur GitHub',
    done: 'Fermer',
  },
  crash: {
    sheetTitle: 'Cette fiche a planté',
    sheetNote: `Le reste de ${APP_NAME} marche : change de monstre, ou passe à la Simulation.`,
    retry: 'Réessayer',
    appTitle: `${APP_NAME} a planté`,
    appNote:
      'Tes réglages, ton équipement et ton monde restent sur cet appareil : recharge pour reprendre.',
    reload: 'Recharger',
    send: 'Envoyer le rapport',
    trust: "Rien ne part sans toi : le rapport n'est envoyé que si tu le demandes.",
    screens: {
      bestiary: {
        title: 'Le Bestiaire a planté',
        note: `Le reste de ${APP_NAME} marche : passe à la Simulation, à l'Arsenal ou au Mémo.`,
      },
      simulation: {
        title: 'La Simulation a planté',
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à l'Arsenal ou au Mémo.`,
      },
      arsenal: {
        title: "L'Arsenal a planté",
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à la Simulation ou au Mémo.`,
      },
      guide: {
        title: 'Le Mémo a planté',
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à la Simulation ou à l'Arsenal.`,
      },
    },
    row: 'Cette ligne a planté',
    report: 'Signaler',
  },
  loop: {
    feedback: 'Tes retours',
    reports: 'Mes signalements',
    reportsSummary: (sent: number, fixed: number) =>
      `${plural(sent, 'envoyé', 'envoyés')} · ${plural(fixed, 'corrigé', 'corrigés')}`,
    noReports: 'Aucun signalement envoyé depuis cet appareil.',
    reportsNote:
      'Envoyés depuis cet appareil. Leur état vient de GitHub quand tu es en ligne ; ouvre-en un pour le voir.',
    columns: { subject: 'Sujet', number: 'N°', date: 'Date', state: 'État' },
    states: {
      waiting: "En attente d'envoi",
      sent: 'Envoyé',
      open: 'Ouvert',
      fixedIn: (version: string) => `Corrigé dans ${version}`,
      fixedNext: 'Corrigé, dans la prochaine version',
      duplicate: 'Fermé · déjà signalé',
      declined: 'Fermé · non retenu',
    },
    news: 'Nouveautés',
    newsSummary: (version: string, date: string) => `${version} · ${date}`,
    thanks: (names: readonly string[]) =>
      `Merci ${new Intl.ListFormat('fr', { type: 'conjunction' }).format(names)}`,
    yours: (numbers: readonly number[]) =>
      `${numbers.length > 1 ? 'tes signalements' : 'ton signalement'} ${numbers.map((number) => `#${String(number)}`).join(', ')}`,
    back: 'Retour aux réglages',
    close: 'Fermer',
    thanksTitle: 'Corrigé grâce à toi',
    thanksBody: (count: number, version: string, nickname: string | undefined) =>
      `${count > 1 ? 'Tes signalements sont corrigés' : 'Ton signalement est corrigé'} dans ${version}. Merci${nickname ? `, ${nickname}` : ''} : chaque correction sert à tous les joueurs.`,
    seeNews: 'Voir les nouveautés',
  },
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
    source: 'Code source et licence',
    licence: (copyright: string) => `${copyright} · logiciel libre sous GPLv3, sans garantie.`,
    themes,
  },
  // {wiki}, {licence} and {email} stand for links.
  notices: {
    title: 'Mentions et crédits',
    rowMeta: 'Projet de fan, crédits, tes données',
    fan: 'Projet de fan',
    fanText: `${APP_NAME} est un projet de fan, non officiel : ni Iron Gate ni Coffee Stain ne l'ont fait ni approuvé. Valheim, et les noms et données tirés du jeu, appartiennent à Iron Gate.`,
    credits: 'Crédits',
    wikiText:
      "Noms d'attaques : en partie tirés du {wiki}, écrits par ses contributeurs, sous licence {licence}. Les noms français en sont pour la plupart des traductions.",
    wiki: 'wiki Valheim',
    fonts: 'Polices : IBM Plex Sans et IBM Plex Mono, © IBM Corp., sous SIL Open Font License 1.1.',
    libraries: 'Bibliothèques : React, © Meta Platforms, et Workbox, © Google, sous licence MIT.',
    licenceTexts: 'Textes complets des licences',
    data: 'Tes données',
    device:
      "Tes réglages, ton équipement et la liste de tes signalements restent sur cet appareil. Pas de compte, pas de cookie, pas de mesure d'audience.",
    reports:
      "Un signalement devient une issue publique sur GitHub, envoyée par Vercel : ton texte, ton pseudo si tu en donnes un, et ce que l'app joint. Ton pseudo peut aussi paraître dans les Nouveautés, pour te remercier.",
    network:
      "Pour suivre tes signalements, l'app demande leur état à GitHub. Comme pour tout site, Vercel, qui sert l'app, et GitHub voient l'adresse IP de ta connexion ; elle n'est jamais jointe à un signalement.",
    removal: 'Pour faire retirer un signalement ou ton pseudo, écris à {email}.',
    legal: 'Mentions légales',
    publisher: `Éditeur : ${PUBLISHER}, à titre non professionnel.`,
    host: 'Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
  },
  install: {
    title: `Installe ${APP_NAME}`,
    lead: "Pour l'avoir sous la main, à côté du jeu.",
    perks: {
      phone: [
        "Une icône sur ton écran d'accueil",
        "En plein écran, sans barre d'adresse",
        'Marche sans connexion',
      ],
      desktop: [
        'Une icône à côté de tes autres apps',
        "Sa propre fenêtre, sans barre d'adresse",
        'Marche sans connexion',
      ],
    },
    inSafari: 'Dans Safari',
    // {more} and {share} stand for Safari's buttons, drawn.
    steps: {
      'ios-menu': [
        `Touche {more} à côté de l'adresse, puis ${quoted('Partager')}.`,
        `Choisis ${quoted("Sur l'écran d'accueil")}, puis ${quoted('Ajouter')}.`,
        `Ouvre ${APP_NAME} depuis ton écran d'accueil.`,
      ],
      'ios-bar': [
        `Touche {share} ${quoted('Partager')} dans la barre de Safari.`,
        `Choisis ${quoted("Sur l'écran d'accueil")}, puis ${quoted('Ajouter')}.`,
        `Ouvre ${APP_NAME} depuis ton écran d'accueil.`,
      ],
      mac: [
        `Dans la barre des menus, choisis Fichier › ${quoted('Ajouter au Dock')}.`,
        `Ouvre ${APP_NAME} depuis le Dock.`,
      ],
    },
    first:
      "Fais-le avant de régler quoi que ce soit : l'app installée ne reprend pas ce que tu règles dans Safari.",
    later:
      "L'app installée repart de zéro : Safari ne lui passe pas tes réglages, tu les y refais une fois.",
    install: 'Installer',
    continueInBrowser: 'Continuer dans le navigateur',
    continueInSafari: 'Continuer dans Safari',
    inSettings: 'Tu la retrouves dans Réglages › À propos.',
    row: `Installer ${APP_NAME}`,
    rowMeta: "Sur l'écran d'accueil, sans connexion",
    close: 'Fermer',
  },
}

export type Catalog = typeof fr
