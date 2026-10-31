// What the Arsenal tracks of #67 list, read from the game data with the app's own rules: every armor piece
// by slot at the level picked, every power, trinket and drink that changes a fight, and the size of each
// category. Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { game } from '@/data'
import type { DamageModifier, GameArmorPiece, GameRuleEffect } from '@/data/types'
import { blockerRows, categoryOf, type BlockerCategory } from '@/features/arsenal/model'
import { FORGE_MAX_LEVEL } from '@/features/gear/model'
import { formatNumber } from '@/i18n/format'
import { fr } from '@/i18n/fr'

const OUT = new URL('./out/arsenal.json', import.meta.url)
const NBSP = ' '
const n = (value: number) => formatNumber(Math.round(value * 100) / 100, 'fr')

// The owner's gear in Origine: what Ton équipement shows equipped and carried. The Arsenal reads every item at level 1:
// its level is picked in Ton équipement, which a row opens (owner, 2026-10-31).
const LEVEL = 1
const WORN = new Set(['HelmetIron', 'ArmorIronChest', 'ArmorIronLegs', 'CapeWolf'])
const CARRIED = new Set(['TrinketIronHealth', 'GP_Bonemass', 'Potion_frostresist'])

const FACTOR: Record<Exclude<DamageModifier, 'normal' | 'ignore'>, number> = {
  veryResistant: 0.25,
  resistant: 0.5,
  slightlyResistant: 0.75,
  slightlyWeak: 1.25,
  weak: 1.5,
  veryWeak: 2,
  immune: 0,
}
const TYPES = ['blunt', 'slash', 'pierce', 'fire', 'frost', 'lightning', 'poison', 'spirit'] as const
type Modifiers = GameArmorPiece['modifiers']
const joinFr = (items: readonly string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`

/** One chip per damage type, the game's names: « Glace · Résistant ×0,5 », a weakness marked. */
const chipsOf = (modifiers: Modifiers) =>
  TYPES.filter((type) => modifiers[type] && modifiers[type] !== 'normal' && modifiers[type] !== 'ignore').map((type) => {
    const modifier = modifiers[type] as keyof typeof FACTOR
    return {
      type,
      text: `${game.damageTypes[type].fr} · `,
      strong: `${game.modifiers[modifier].fr} ×${n(FACTOR[modifier])}`,
      weak: FACTOR[modifier] > 1,
    }
  })

/** The types that share a factor, in one phrase: « Contondant, Coupant et Perforant ×0,75 ». */
const phrasesOf = (modifiers: Modifiers) => {
  const byFactor = new Map<number, string[]>()
  for (const type of TYPES) {
    const modifier = modifiers[type]
    if (!modifier || modifier === 'normal' || modifier === 'ignore') continue
    const factor = FACTOR[modifier]
    byFactor.set(factor, [...(byFactor.get(factor) ?? []), game.damageTypes[type].fr])
  }
  return [...byFactor].map(([factor, names]) => `${joinFr(names)} ×${n(factor)}`)
}

const share = (value: number) => `${n(Math.abs(value) * 100)}${NBSP}%`
const time = (seconds: number) => (seconds >= 60 ? `${n(seconds / 60)}${NBSP}min` : `${n(seconds)}${NBSP}s`)

/** What an effect changes in a fight, in the words of Ton équipement's rows. */
function changesOf(effect: GameRuleEffect): string[] {
  const out = phrasesOf(effect.modifiers ?? {})
  if (effect.addArmor) out.push(`armure +${n(effect.addArmor)}`)
  if (effect.parryBonus) out.push(`VD en parade ×${n(1 + effect.parryBonus)}`)
  const block = effect.blockStaminaModifier ?? 0
  const flat = effect.blockStaminaFlat ?? 0
  if (block <= -1 && flat < 0) out.push(`bloquer rend ${n(-flat)} d'endurance`)
  else if (block < 0) out.push(`bloquer coûte ${share(block)} d'endurance en moins`)
  if (effect.dodgeStaminaModifier) out.push(`esquiver coûte ${share(effect.dodgeStaminaModifier)} d'endurance en moins`)
  if (effect.staggerModifier) out.push(`tu titubes ${n(1 / (1 + effect.staggerModifier))}× moins vite`)
  return out
}

const sets = new Map(game.ruleEffects.filter((e) => e.kind === 'set').map((e) => [e.set!.id, e]))
const maxLevel = (piece: GameArmorPiece) => (piece.forge ? Math.max(piece.maxQuality, FORGE_MAX_LEVEL) : piece.maxQuality)

function pieceRow(piece: GameArmorPiece) {
  const shown = Math.min(LEVEL, maxLevel(piece))
  const set = piece.set ? sets.get(piece.set) : undefined
  return {
    id: piece.id,
    name: piece.name.fr,
    armor: piece.armor + piece.armorPerLevel * (shown - 1),
    armorText: n(piece.armor + piece.armorPerLevel * (shown - 1)),
    perLevel: piece.armorPerLevel > 0 ? `+${n(piece.armorPerLevel)}` : '—',
    stopsAt: shown < LEVEL ? `N${shown}${NBSP}max` : null,
    chips: chipsOf(piece.modifiers),
    dodge: piece.dodgeStaminaModifier ? `esquiver coûte ${share(piece.dodgeStaminaModifier)} d'endurance en moins` : null,
    set: set
      ? { name: set.name.fr, size: set.set!.size, changes: changesOf(set).join(' · ') }
      : null,
    equipped: WORN.has(piece.id),
  }
}

const SLOTS = ['helmet', 'chest', 'legs', 'cape'] as const
const pieces = Object.fromEntries(
  SLOTS.map((slot) => [
    slot,
    game.armorPieces
      .filter((piece) => piece.slot === slot)
      .map(pieceRow)
      .toSorted((a, b) => Number(b.equipped) - Number(a.equipped) || b.armor - a.armor || a.name.localeCompare(b.name, 'fr')),
  ]),
)

// Powers in the order the bosses fall, trinkets and drinks as Ton équipement lists them.
const ORDER = [
  'GP_Bonemass', 'GP_Moder', 'GP_Yagluth', 'GP_Queen', 'GP_Fader',
  'TrinketIronHealth', 'TrinketBloodGoldHealth', 'TrinketSilverResist', 'TrinketBlackStamina',
  'Potion_frostresist', 'Potion_barleywine', 'Potion_poisonresist', 'Potion_bzerker',
]
function effectRow(effect: GameRuleEffect) {
  const kind = effect.kind === 'power' ? 'POUVOIR' : effect.kind === 'trinket' ? 'BIBELOT' : 'BOISSON'
  const duration = time(effect.ttl ?? 0)
  const trigger = effect.adrenaline ? `dès ${n(effect.adrenaline)} d'adrénaline` : null
  const cooldown = effect.cooldown ? `recharge ${time(effect.cooldown)}` : null
  return {
    id: effect.id,
    name: effect.name.fr,
    tag: [kind, duration, trigger, cooldown].filter(Boolean).join(' · ').toUpperCase(),
    duration,
    trigger,
    cooldown,
    changes: changesOf(effect),
    carried: CARRIED.has(effect.id),
  }
}
const effectsOf = (kind: GameRuleEffect['kind']) =>
  game.ruleEffects
    .filter((effect) => effect.kind === kind)
    .toSorted((a, b) => Number(CARRIED.has(b.id)) - Number(CARRIED.has(a.id)) || ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
    .map(effectRow)

const blockers = { shields: 0, weapons: 0, others: 0 }
for (const blocker of game.blockers) {
  const category = categoryOf(blocker)
  if (category) blockers[category] += 1
}

// What blocks, as the Arsenal lists it today: at Blocking 25 and the level picked, the shield held first.
const SKILL = 25
// Every item at level 1, as the app's Arsenal lists it since #67.
const rowsOfBlockers = (category: BlockerCategory) =>
  blockerRows(category, { skill: SKILL, equipped: 'ShieldSilver', sort: 'power' }).map((row) => {
    const group = row.blocker.group
    return {
      name: row.blocker.name.fr,
      type: group === 'weapon' || group === 'other' || group === 'unarmed' ? null : fr.gear.groupTags[group].toUpperCase(),
      power: n(row.power),
      stopsAt: null,
      parry: row.parry === null ? '—' : n(row.parry),
      parryNote: row.parry === null ? fr.gear.noParry : fr.gear.parryBonus(row.blocker.timedBlockBonus),
      force: n(row.blocker.deflectionForce),
      speed: `${row.blocker.movementModifier < 0 ? '−' : ''}${n(Math.abs(row.blocker.movementModifier) * 100)}${NBSP}%`,
      equipped: row.equipped,
    }
  })

const data = {
  level: LEVEL,
  counts: {
    ...blockers,
    helmet: pieces.helmet!.length,
    chest: pieces.chest!.length,
    legs: pieces.legs!.length,
    cape: pieces.cape!.length,
    power: game.ruleEffects.filter((e) => e.kind === 'power').length,
    trinket: game.ruleEffects.filter((e) => e.kind === 'trinket').length,
    consumable: game.ruleEffects.filter((e) => e.kind === 'consumable').length,
  },
  skill: SKILL,
  blockers: { shields: rowsOfBlockers('shields'), weapons: rowsOfBlockers('weapons'), others: rowsOfBlockers('others') },
  pieces,
  effects: { power: effectsOf('power'), trinket: effectsOf('trinket'), consumable: effectsOf('consumable') },
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(OUT, JSON.stringify(data, null, 1))
console.log('counts', data.counts)
for (const e of [...data.effects.power, ...data.effects.trinket, ...data.effects.consumable]) console.log(e.name, '|', e.tag, '|', e.changes.join(' · '))
for (const p of data.pieces.helmet!.slice(0, 6)) console.log(p.name, p.armorText, p.stopsAt ?? '', p.chips.map((c) => c.text + c.strong).join(', '), p.set?.name ?? '')
