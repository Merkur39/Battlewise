import type { GameRuleEffect, Localized, RuleEffectKind } from '@/data/types'
import { formatNumber } from '@/i18n/format'
import { figures, type GuideSheet } from '../sheets'

const n = (value: number) => formatNumber(value, 'fr')
const name = (localized: Localized) => localized.fr
const lower = (localized: Localized) => localized.fr.toLocaleLowerCase('fr')
const capitalised = (text: string) => `${text.charAt(0).toLocaleUpperCase('fr')}${text.slice(1)}`
const list = (words: readonly string[]) =>
  new Intl.ListFormat('fr', { type: 'conjunction' }).format(words)
const percentLess = (multiplier: number) => `−${n(Math.round((1 - multiplier) * 100))} %`

const kinds: Record<RuleEffectKind, string> = {
  power: 'pouvoir du gardien',
  consumable: 'consommable',
  trinket: 'bibelot',
  set: "bonus d'ensemble",
  equipment: 'équipement',
}

function effect({ name: effectName, kind, ...change }: GameRuleEffect) {
  const parts: string[] = []
  if (change.stagger !== undefined) parts.push(`stagger reçu ×${n(change.stagger)}`)
  if (change.parryPower !== undefined) parts.push(`VD en parade ×${n(change.parryPower)}`)
  if (change.blockStamina === 0 && (change.blockStaminaFlat ?? 0) < 0) {
    parts.push(`bloquer ne coûte plus d'endurance et en rend ${n(-change.blockStaminaFlat!)}`)
  } else if (change.blockStamina !== undefined) {
    parts.push(`endurance de blocage ${percentLess(change.blockStamina)}`)
  }
  if (change.dodgeStamina !== undefined) {
    parts.push(`endurance de roulade ${percentLess(change.dodgeStamina)}`)
  }
  return `${name(effectName)} (${kinds[kind]}) : ${parts.join(', ')}.`
}

const refunds = figures.parryRefunds
  .map(({ stamina, items }) => `${list(items.map(name))} en rendent ${n(stamina)}`)
  .join(', ')

/** The Guide in French, ported from the « Le combat dans Valheim » artifact, its figures read in the
 * game data where it has them. */
export const guideFr: readonly GuideSheet[] = [
  {
    id: 'parry',
    title: 'Parade',
    fact: `0,25 s · ${n(figures.parryCost)} end.`,
    items: [
      "Fenêtre de 0,25 s après avoir levé le bouclier. La compétence ne l'élargit pas.",
      `Coûte ${n(figures.parryCost)} endurance.${refunds === '' ? '' : ` ${refunds}.`}`,
      `L'attaquant titube, même un archer. Sauf les boss (hors ${name(figures.eikthyr)}), le ${name(figures.gammeltroll)} et les créatures qui ne titubent jamais.`,
      'Le chrono repart après une attaque ou une roulade, sans lâcher le bouton.',
      'Les écus ne parent pas.',
    ],
  },
  {
    id: 'block',
    title: 'Blocage',
    fact: `≤ ${n(figures.blockCost)} end.`,
    items: [
      "La VD, c'est la valeur défensive de l'info-bulle, compétence Blocage comprise.",
      "C'est l'objet en main gauche qui bloque : avec une torche, c'est elle.",
      'Coup ≥ 2 × VD : tu prends coup − VD. En dessous : (coup ÷ VD) ÷ 4 du coup.',
      `Coût : ${n(figures.blockCost)} × la part de ta VD utilisée, donc ${n(figures.blockCost)} au maximum.`,
      'Brisé si ce qui passe fait déborder ta barre, ou si ton endurance tombe à 0.',
      "Un coup par l'arrière n'est jamais bloqué.",
    ],
  },
  {
    id: 'bar',
    title: 'Ta barre de stagger',
    fact: `${n(figures.staggerShare)} % PV · 5 s`,
    items: [
      `Elle déborde à ${n(figures.staggerShare)} % de tes PV max.`,
      `Remplie par les dégâts ${list(figures.staggerTypes.map(lower))}, après armure. ${capitalised(list(figures.otherTypes.map(lower)))} ne comptent pas.`,
      'En bloquant, ce qui passe le bouclier compte deux fois : avant et après armure.',
      'Elle se vide de 20 % par seconde, sans délai.',
    ],
  },
  {
    id: 'stagger',
    title: 'Faire tituber un monstre',
    fact: '×2 dégâts',
    items: [
      `Seuil : PV max × facteur du monstre (${n(figures.monsterFactors.min)} à ${n(figures.monsterFactors.max)}). Les étoiles le multiplient.`,
      "Tant qu'il titube, il prend ×2 dégâts de chaque coup.",
      'Atgeir secondaire et coup de pied : stagger ×6. Hache de combat secondaire : ×4.',
      `Les boss, sauf ${name(figures.eikthyr)}, ne titubent jamais.`,
    ],
  },
  {
    id: 'unblockable',
    title: 'Imparables',
    fact: `${n(figures.unblockable.total)} attaques`,
    items: [
      'Souffles, novas et zones de boss ne se bloquent pas.',
      `${n(figures.unblockable.dodgeable)} sur ${n(figures.unblockable.total)} s'esquivent en roulade : la fiche de chaque créature dit lesquelles.`,
    ],
  },
  {
    id: 'combos',
    title: 'Combos et sournoise',
    fact: 'dernier coup ×2',
    items: [
      "Le dernier coup d'un combo de mêlée fait ×2.",
      "Le combo repart à zéro après 0,2 s d'attente.",
      'Sournoise : ×3 avec la plupart des armes, ×6 aux couteaux et armes de poing. Une fois toutes les 5 min par monstre.',
    ],
  },
  {
    id: 'roll',
    title: 'Roulade',
    fact: `${n(figures.dodgeCost)} end.`,
    items: [
      `Coûte ${n(figures.dodgeCost)} d'endurance, jusqu'à 50 % de moins avec la compétence Esquive.`,
      "Invincible pendant une partie de l'animation.",
      `Esquive parfaite : ${n(figures.dodgeRefund)} % de l'endurance rendue et 5 d'adrénaline, une fois par roulade.`,
    ],
  },
  {
    id: 'adrenaline',
    title: 'Adrénaline',
    fact: 'parade +5',
    items: [
      'Elle ne se remplit que si tu portes un bibelot, et redescend avec le temps.',
      'Blocage : +2 avec une arme, une torche, une lanterne ou un écu ; +1 avec un bouclier rond, une targe ou la plupart des arcs. Même si le blocage échoue.',
      'Parade réussie : +5. Esquive parfaite : +5. Faire tituber un monstre : +3. Chaque coup qui touche : +1 en général.',
      'Valeurs de base : le gain varie avec le remplissage de la jauge, le réglage du monde et certains effets.',
    ],
  },
  {
    id: 'effects',
    title: 'Effets qui changent les règles',
    fact: `${n(figures.ruleEffects.length)} effets`,
    items: figures.ruleEffects.map(effect),
  },
]
