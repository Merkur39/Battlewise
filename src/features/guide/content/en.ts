import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier, type DamageModifiers } from '@/combat/modifiers'
import { game } from '@/data'
import type { GameArmorPiece, GameRuleEffect, Localized, RuleEffectKind } from '@/data/types'
import { formatNumber } from '@/i18n/format'
import { figures, type GuideSheet, type RuleChange } from '../sheets'

const n = (value: number) => formatNumber(value, 'en')
const name = (localized: Localized) => localized.en
const lower = (localized: Localized) => localized.en.toLocaleLowerCase('en')
const capitalised = (text: string) => `${text.charAt(0).toLocaleUpperCase('en')}${text.slice(1)}`
const list = (words: readonly string[]) =>
  new Intl.ListFormat('en', { type: 'conjunction' }).format(words)
const percent = (share: number) =>
  `${share < 0 ? '−' : '+'}${n(Math.round(Math.abs(share) * 100))}%`

const kinds: Record<RuleEffectKind, string> = {
  power: 'guardian power',
  consumable: 'consumable',
  trinket: 'trinket',
  set: 'set bonus',
  equipment: 'gear',
}

// "Blunt, Slash and Pierce · Slightly resistant ×0.75", in the words of the creature sheet.
function resistances(modifiers: DamageModifiers = {}) {
  const byState = new Map<keyof typeof game.modifiers, string[]>()
  for (const type of DAMAGE_TYPES) {
    const state = modifiers[type]
    if (state === undefined || state === 'normal' || state === 'ignore') continue
    byState.set(state, [...(byState.get(state) ?? []), name(game.damageTypes[type])])
  }
  return [...byState].map(
    ([state, types]) =>
      `${list(types)} · ${name(game.modifiers[state])} ×${n(damageMultiplier(state))}`,
  )
}

function changes(change: RuleChange) {
  const parts = resistances(change.modifiers)
  if (change.addArmor) parts.push(`armor +${n(change.addArmor)}`)
  if (change.armorMultiplier) parts.push(`armor ×${n(1 + change.armorMultiplier)}`)
  if (change.staggerModifier) parts.push(`stagger taken ×${n(1 + change.staggerModifier)}`)
  if (change.parryBonus) parts.push(`parry power ×${n(1 + change.parryBonus)}`)
  const flat = change.blockStaminaFlat ?? 0
  if (change.blockStaminaModifier === -1 && flat < 0) {
    // A parry that holds pays the flat amount twice (Humanoid.BlockAttack).
    parts.push(
      `blocking costs no stamina and gives ${n(-flat)} back (${n(-2 * flat)} on a parry that holds)`,
    )
  } else if (change.blockStaminaModifier) {
    parts.push(`block stamina ${percent(change.blockStaminaModifier)}`)
  }
  if (change.dodgeStaminaModifier) {
    parts.push(`dodge stamina ${percent(change.dodgeStaminaModifier)}`)
  }
  return parts.join('; ')
}

// "guardian power, 300 s", "trinket, 30 s from 65 adrenaline", "set bonus, 3 pieces".
function origin({ kind, ttl, adrenaline, set }: GameRuleEffect) {
  if (set) return `${kinds[kind]}, ${n(set.size)} pieces`
  const lasting = ttl === undefined ? kinds[kind] : `${kinds[kind]}, ${n(ttl)} s`
  return adrenaline === undefined ? lasting : `${lasting} from ${n(adrenaline)} adrenaline`
}

const effect = (e: GameRuleEffect) => `${name(e.name)} (${origin(e)}): ${changes(e)}.`
const gear = (piece: GameArmorPiece) =>
  `${name(piece.name)} (${kinds.equipment}): ${changes(piece)}.`
const rules = [...figures.ruleEffects.map(effect), ...figures.gearRules.map(gear)]

const { freezing } = figures
const frost = lower(figures.frost)
const freezes = `${list(freezing.biomes.map(name))}: away from fire and shelter, “${name(freezing.name)}” takes ${n(freezing.damagePerSecond)} health a second${freezing.healthRegen === 0 ? ' and stops health regeneration' : ''}. Any ${frost} resistance spares you that, and the slow of ${frost} hits too, such as ${name(figures.moder)}'s ${name(figures.coldBreath)}.`

const refunds = figures.parryRefunds
  .map(({ stamina, items }) => `${list(items.map(name))} give ${n(stamina)} back`)
  .join(', ')

/** The Guide in English, translated from the French one, its figures read in the game data where it
 * has them. */
export const guideEn: readonly GuideSheet[] = [
  {
    id: 'parry',
    title: 'Parry',
    fact: `0.25 s · ${n(figures.parryCost)} stamina`,
    items: [
      'A 0.25 s window after raising the shield. The skill does not widen it.',
      `Costs ${n(figures.parryCost)} stamina.${refunds === '' ? '' : ` ${refunds}.`}`,
      `The attacker staggers, even an archer. Except the bosses (but ${name(figures.eikthyr)}), the ${name(figures.gammeltroll)} and the creatures that never stagger.`,
      'The timer starts again after an attack or a roll, without letting go of the button.',
      'Tower shields do not parry.',
    ],
  },
  {
    id: 'block',
    title: 'Block',
    fact: `≤ ${n(figures.blockCost)} stamina`,
    items: [
      "Block power is the tooltip's block armour, Blocking skill included.",
      'The item in the left hand blocks: with a torch, the torch does.',
      'Hit ≥ 2 × block power: you take hit − block power. Below: (hit ÷ block power) ÷ 4 of the hit.',
      `Cost: ${n(figures.blockCost)} × the share of your block power used, so ${n(figures.blockCost)} at most.`,
      'Broken when what gets through overflows your bar, or when your stamina drops to 0.',
      'A hit from behind is never blocked.',
    ],
  },
  {
    id: 'bar',
    title: 'Your stagger bar',
    fact: `${n(figures.staggerShare)}% HP · 5 s`,
    items: [
      `It overflows at ${n(figures.staggerShare)}% of your max HP.`,
      `Filled by ${list(figures.staggerTypes.map(lower))} damage, after armor. ${capitalised(list(figures.otherTypes.map(lower)))} do not count.`,
      'When blocking, what gets past the shield counts twice: before and after armor.',
      'It drains by 20% a second, without delay.',
    ],
  },
  {
    id: 'stagger',
    title: 'Staggering a monster',
    fact: '×2 damage',
    items: [
      `Threshold: max HP × the monster's factor (${n(figures.monsterFactors.min)} to ${n(figures.monsterFactors.max)}). Stars multiply it.`,
      'While it staggers, it takes ×2 damage from every hit.',
      'Atgeir secondary and kick: stagger ×6. Battleaxe secondary: ×4.',
      `Bosses, but ${name(figures.eikthyr)}, never stagger.`,
    ],
  },
  {
    id: 'unblockable',
    title: 'Unblockable',
    fact: `${n(figures.unblockable.total)} attacks`,
    items: [
      'Breaths, novas and boss areas cannot be blocked.',
      `${n(figures.unblockable.dodgeable)} of ${n(figures.unblockable.total)} can be dodged with a roll: each creature's sheet says which.`,
    ],
  },
  {
    id: 'combos',
    title: 'Combos and sneak attacks',
    fact: 'last hit ×2',
    items: [
      'The last hit of a melee combo deals ×2.',
      'The combo resets after a 0.2 s wait.',
      'Sneak attack: ×3 with most weapons, ×6 with knives and fist weapons. Once every 5 min per monster.',
    ],
  },
  {
    id: 'roll',
    title: 'Dodge roll',
    fact: `${n(figures.dodgeCost)} stamina`,
    items: [
      `Costs ${n(figures.dodgeCost)} stamina, up to 50% less with the Dodge skill.`,
      'Invincible for part of the animation.',
      `Perfect dodge: ${n(figures.dodgeRefund)}% of the stamina back and 5 adrenaline, once per roll.`,
    ],
  },
  {
    id: 'adrenaline',
    title: 'Adrenaline',
    fact: 'parry +5',
    items: [
      'It only fills while you wear a trinket, and goes down over time.',
      'Block: +2 with a weapon, a torch, a lantern or a tower shield; +1 with a round shield, a buckler or most bows. Even when the block fails.',
      'Successful parry: +5. Perfect dodge: +5. Staggering a monster: +3. Each hit that lands: +1 as a rule.',
      'Base values: the gain varies with how full the gauge is, the world setting and some effects.',
    ],
  },
  {
    id: 'effects',
    title: 'Effects that change the rules',
    fact: `${n(rules.length)} effects`,
    items: [
      'For one damage type, nothing multiplies: the best resistance wins, and a resistance always wins over a weakness.',
      freezes,
      ...rules,
    ],
  },
]
