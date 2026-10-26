import { formatNumber } from './format'
import type { Catalog } from './fr'

const n = (value: number) => formatNumber(value, 'en')
const plurals = new Intl.PluralRules('en')
const plural = (count: number, one: string, other: string) =>
  `${n(count)} ${plurals.select(count) === 'one' ? one : other}`
const players = (count: number) => plural(count, 'player', 'players')
const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const listOf = (words: readonly string[]) =>
  new Intl.ListFormat('en', { type: 'conjunction' }).format(
    words.map((word) => word.toLocaleLowerCase('en')),
  )
const quoted = (name: string) => `“${name}”`

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
    title: 'Your gear',
    withstand: 'What you can take',
    emptyBar: 'Empty bar',
    block: 'Block',
    parry: 'Parry',
    power: (power) => `power ${n(power)}`,
    unstaggered: 'no stagger',
    unbroken: 'holds',
    cannotParry: "your item can't parry",
    staggersAt: (limit, share, health, armor) =>
      `Staggers at ${n(limit)} (${n(share)}% of ${n(health)} HP) · armor ${n(armor)}`,
    powerParts: (base, skill) => `power = ${n(base)} × ${n(skill)}`,
    item: 'Blocking item',
    groups: {
      round: 'Round shields',
      buckler: 'Bucklers',
      tower: 'Tower shields',
      weapon: 'Weapons',
      other: 'Others',
    },
    groupTags: {
      round: 'Round',
      buckler: 'Buckler',
      tower: 'Tower',
      weapon: 'Weapon',
      other: 'Other',
    },
    parryBonus: (bonus) => `×${n(bonus)}`,
    noParry: "can't parry",
    torch: 'With a torch in your left hand, the torch blocks.',
    level: 'Level',
    levelLong: 'Upgrade level',
    lowerLevel: 'Lower level',
    raiseLevel: 'Higher level',
    levelNote: (perLevel, maxQuality, forge) => {
      const gain =
        perLevel > 0 ? `+${n(perLevel)} power per level` : 'The level leaves its power alone'
      return forge
        ? `${gain}; past level ${n(maxQuality)}: ${forge}.`
        : `${gain}, up to the item's max level.`
    },
    notUpgradable: "This item can't be upgraded.",
    skill: 'Blocking skill',
    armor: 'Armor',
    lowerArmor: 'Less armor',
    raiseArmor: 'More armor',
    health: 'Max HP',
    lowerHealth: 'Less HP',
    raiseHealth: 'More HP',
  },
  world: {
    summary: (difficulty, count) =>
      `Your world: ${difficulty.toLocaleLowerCase('en')} combat, ${players(count)}`,
    playersAndScale: (count, enemyScale) => `${players(count)} · ×${n(enemyScale)}`,
    title: 'Your world',
    difficulty: 'Combat difficulty',
    multiplier: (value) => `×${n(value)}`,
    difficultyNote: `The ${quoted('Combat')} setting of the world modifiers.`,
    players: (range) => `Players within ${n(range)} m, you included`,
    orMore: (count) => `${n(count)}+`,
    orMoreLabel: (count) => `${n(count)} or more`,
    effects: 'What it does',
    enemyHits: 'Monster hits',
    yourDamage: 'Your damage and stagger',
    yourDamageShort: 'Your damage',
    starChance: 'Star chance',
    rulesNote: 'The rules (parry window, thresholds) stay the same.',
  },
  verdicts: {
    block: 'Block',
    parry: 'Parry',
    dodge: 'Dodge',
    holds: 'holds',
    staggered: 'you stagger',
    broken: 'breaks',
    unblockable: 'unblockable',
    cannotParry: "can't parry",
    nothing: 'no direct attack',
    dodgeable: 'dodgeable',
    undodgeable: 'undodgeable',
    pill: (guard, word) => `${guard}: ${word}`,
  },
  advice: {
    unknown: 'No direct attack',
    blockAll: 'You block everything without staggering',
    parryAll: 'Parry it: blocking staggers you',
    dodgeAll: (rolls, canParry) =>
      `${rolls ? 'Dodge' : 'Avoid'} everything: even ${canParry ? 'parried' : 'blocked'}, its attacks get through`,
    dodgeSome: (rolls, attacks, rest) =>
      `${rolls ? 'Dodge' : 'Avoid'} ${attacks.length === 1 ? quoted(attacks[0]!) : `${n(attacks.length)} attacks`}, ${rest} the rest`,
  },
  bestiary: {
    intro: 'How to take each creature with your gear.',
    search: 'Search every biome',
    searchPlaceholder: 'Creature or attack, every biome',
    clearSearch: 'Clear the search',
    biome: 'Biome',
    previousBiome: (name) => `Previous biome: ${name}`,
    nextBiome: (name) => `Next biome: ${name}`,
    biomeCount: (index, total, count) =>
      `Biome ${n(index)} of ${n(total)} · ${plural(count, 'creature', 'creatures')}`,
    howToTake: 'How to take it',
    withYourGear: 'With your gear',
    creatures: 'Creatures of the biome',
    health: (health) => `${n(health)} HP`,
    boss: 'Boss',
    foundCreatures: (count) => `Creatures · ${n(count)}`,
    foundAttacks: (count) => `Attacks · ${n(count)}`,
    nothingFound: (query) => `Nothing for ${quoted(query)}`,
    searchNote:
      "Results from every biome. An attack opens its creature's sheet, where you can simulate it.",
  },
  creature: {
    back: 'Back',
    stars: 'Stars',
    star: (stars) => `${n(stars)}★`,
    health: 'Health',
    healthShort: 'HP',
    toInflict: 'To stagger',
    neverStaggers: 'Never staggers',
    yourParry: 'Your parry',
    parryStaggers: 'Staggers it',
    parryDoesNot: "Doesn't stagger it",
    cannotParry: "Your item can't parry",
    modifiers: 'Weaknesses and resistances',
    modifier: (type, state, multiplier) => `${type} · ${state} ×${n(multiplier)}`,
    everythingElse: 'Everything else ×1',
    noModifier: 'Everything ×1',
    attacks: 'Its attacks',
    attack: 'Attack',
    damage: 'Damage',
    damageShort: 'Dmg',
    range: 'Range',
    simulate: 'Simulate',
    kinds: { melee: 'Melee', area: 'Area', projectile: 'Projectile', summon: 'Summon' },
    metres: (metres) => `${n(metres)} m`,
    phase: (index, health) => `Phase ${n(index)} · ${n(health)} HP`,
    noAttack: 'No attack',
    attackSummary: ({ name, types, damage, block, parry, dodgeable }) =>
      damage === null
        ? `${name}, summon.`
        : `${name}, ${listOf(types)}, ${n(damage)} damage. Block: ${block}. Parry: ${parry}. ${dodgeable ? 'Dodgeable' : 'Undodgeable'}.`,
    openSimulation: 'Open the simulation.',
    openSheet: (creature) => `Open the ${creature} sheet.`,
    simulateLabel: (name, damage) => `Simulate: ${name}, ${n(damage)} damage`,
    tapToSimulate: 'Tap an attack to simulate it.',
    desktopNote:
      'Simulate opens the attack in the Simulation, with the stagger bar and the stamina.',
  },
  simulation: {
    intro: 'Pick an attack: the page tells you how to take it with your gear.',
    source: 'Source of the hit',
    modes: { attack: 'Monster attack', value: 'Free value' },
    hit: 'The hit',
    change: 'Change',
    changeLabel: (creature, attack, damage) =>
      `Change the attack: ${creature}, ${attack}, ${n(damage)} damage`,
    noAttack: 'No attack picked',
    pick: 'Pick an attack',
    stars: "Monster's stars",
    starsShort: 'Stars',
    value: 'Damage of the hit',
    lower: 'Lower by 5',
    raise: 'Raise by 5',
    valueNote: 'Base damage of the hit, before difficulty and nearby players.',
    bar: 'Stagger bar before the hit',
    barOption: (percent) => `${n(percent)}%`,
    result: 'Result',
    blocking: 'Blocking',
    parrying: 'Parrying',
    taken: 'taken',
    stamina: (stamina) =>
      stamina > 0
        ? `−${n(stamina)} stamina`
        : stamina < 0
          ? `+${n(-stamina)} stamina`
          : '0 stamina',
    barTotal: (total, limit) => `bar: ${n(total)} / ${n(limit)}`,
    barOverflows: 'bar: overflows',
    barLabel: (total, limit, overflows) =>
      `Stagger bar: ${n(total)} of ${n(limit)}${overflows ? ', it overflows' : ''}`,
    dodgeable: 'Dodgeable by rolling',
    undodgeable: 'Not dodgeable by rolling',
    hits: (count) => `This attack lands ${n(count)} hits: each card shows the hardest.`,
    thresholds: 'Your thresholds are in Your gear',
    advice: {
      block: 'Block it: you hold without staggering',
      parry: (block) =>
        `Parry it: ${block === 'broken' ? 'the block gives way' : 'blocking staggers you'}`,
      dodge: (dodgeable, guard, setback) => {
        if (setback === 'unblockable') {
          if (dodgeable === null) return 'Unblockable: dodge if you can'
          return dodgeable ? 'Unblockable: dodge it' : 'Unblockable: keep away'
        }
        const why =
          guard === 'parry'
            ? setback === 'broken'
              ? 'even the parry gives way'
              : 'even parried, you stagger'
            : setback === 'broken'
              ? 'the block gives way'
              : 'blocking staggers you'
        if (dodgeable === null) return `${capitalised(why)}: dodge if you can`
        return `${dodgeable ? 'Dodge' : 'Avoid'} it: ${why}`
      },
    },
  },
  picker: {
    title: 'Pick an attack',
    close: 'Close',
    search: 'Search an enemy or an attack',
    searchPlaceholder: 'Enemy or attack, every biome',
    recent: 'Recent',
    enemies: 'Enemies',
    biomeCount: (index, total) => `Biome ${n(index)} of ${n(total)}`,
    attackCount: (count) => plural(count, 'attack', 'attacks'),
    enemiesNote: 'Tap an enemy to see its attacks, then the attack to simulate.',
    attacksNote:
      'Click an attack to open it in the Simulation. Damage at the lowest stars: the stars are set there.',
    foundAttacks: (count) => `Attacks · ${n(count)}`,
    foundEnemies: (count) => `Enemies · ${n(count)}`,
    noAttack: (query) => `No attack matches ${quoted(query)}.`,
    noEnemy: (query) => `No enemy matches ${quoted(query)}.`,
    openNote: 'Tapping an attack opens it straight in the Simulation.',
    resultsNote: 'Results from every biome.',
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
