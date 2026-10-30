// Every switch state of track C's iteration 2 (#62/#63), from the app's engine, model and French strings:
// the rows of « Ce qui t'aiderait » for Moder and for its Bite (at each stagger bar), Moder's sheet, its
// Bestiary row, and the Simulation of the Bite.
// Run from this folder: node --import ./hooks.mjs states.mts, then node build_c3.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { attackAdvice } from '@/combat/advice'
import { hardestHit } from '@/combat/attack'
import { defenceOf, type Defence } from '@/combat/block'
import type { Guard, HitResult, Verdict } from '@/combat/hit'
import { game } from '@/data'
import { assess, qualifierOf } from '@/features/bestiary/model'
import { fr } from '@/i18n/fr'
import { formatNumber } from '@/i18n/format'
import { verdictTone } from '@/ui/tones'

const OUT = new URL('./out/states.json', import.meta.url)
const world = { difficulty: 'normal', players: 1 } as const
const NBSP = '\u00a0'
const BARS = [0, 25, 50, 75] as const
// The app's strings keep a plain space before « : »; the board's own use a non-breaking one.
const typeset = (text: string) => text.replace(/ ([:;?!])/g, `${NBSP}$1`)

// The owner's gear against Moder: Iron Buckler level 3, Blocking 16, 140 HP, and four pieces (armor 49).
const piece = (id: string, level: number) => ({ ...game.armorPieces.find((p) => p.id === id)!, level })
const PIECES = [piece('HelmetIron', 1), piece('ArmorRootChest', 4), piece('ArmorIronLegs', 4), piece('CapeWolf', 1)]
// A piece in a sentence, by the slot words of Ton équipement.
const OWNER: Record<string, string> = {
  HelmetIron: 'ton casque',
  ArmorRootChest: 'ton plastron',
  ArmorIronLegs: 'tes jambières',
  CapeWolf: 'ta cape',
}
const base = {
  player: game.player,
  blocker: game.blockers.find((b) => b.id === 'ShieldIronBuckler')!,
  level: 3,
  skill: 16,
  armor: 0,
  maxHealth: 140,
  pieces: PIECES,
}

const IDS = {
  broche: 'TrinketIronHealth',
  voile: 'TrinketBlackStamina',
  coeur: 'TrinketSilverResist',
  percecou: 'TrinketBloodGoldHealth',
  masse: 'GP_Bonemass',
  fader: 'GP_Fader',
  moder: 'GP_Moder',
  reine: 'GP_Queen',
  yagluth: 'GP_Yagluth',
  berserkir: 'Potion_bzerker',
  gel: 'Potion_frostresist',
  vin: 'Potion_barleywine',
  poison: 'Potion_poisonresist',
} as const
type Id = keyof typeof IDS
const ORDER = Object.keys(IDS) as Id[]
const effectOf = (id: Id) => game.ruleEffects.find((e) => e.id === IDS[id])!
const nameOf = (id: Id) => effectOf(id).name.fr
const TRINKETS = new Set<Id>(['broche', 'voile', 'coeur', 'percecou'])
const CARRIED: Id[] = ['broche', 'masse', 'gel', 'vin']
const CANDIDATES: Id[] = ['fader', 'moder', 'reine', 'yagluth', 'voile', 'coeur', 'percecou', 'berserkir', 'poison']
// An effect in a sentence: the player's own with its possessive, the others with their article.
const SUBJECT: Record<Id, string> = {
  broche: 'ta Broche en fer',
  masse: "ton pouvoir Masse-d'Os",
  gel: 'ton Hydromel de résistance au gel',
  vin: "ton Vin d'orge de résistance au feu",
  voile: "le Voile d'ombre",
  coeur: 'le Cœur de cristal',
  percecou: 'le Perce-cou',
  fader: 'le Pouvoir de Fader',
  moder: 'le pouvoir Moder',
  reine: 'le pouvoir La Reine',
  yagluth: 'le pouvoir Yagluth',
  berserkir: "l'Hydromel des berserkir",
  poison: "l'Hydromel de résistance au poison",
}
// Its tag in the list: kind, how long it lasts, and what sets a trinket off.
function tagOf(id: Id): string {
  const effect = effectOf(id) as { kind: string; ttl?: number; adrenaline?: number }
  const ttl = effect.ttl ?? 0
  const time = ttl >= 60 ? `${formatNumber(ttl / 60, 'fr')}${NBSP}MIN` : `${formatNumber(ttl, 'fr')}${NBSP}S`
  if (effect.kind === 'trinket') return `BIBELOT · ${time} DÈS ${formatNumber(effect.adrenaline ?? 0, 'fr')} D'ADRÉNALINE`
  return `${effect.kind === 'power' ? 'POUVOIR' : 'BOISSON'} · ${time}`
}

type Set_ = ReadonlySet<Id>
const keyOf = (set: Set_) => ORDER.filter((id) => set.has(id)).join('+')
const defences = new Map<string, Defence>()
function defence(set: Set_): Defence {
  const key = keyOf(set)
  let found = defences.get(key)
  if (!found) {
    found = defenceOf({ ...base, effects: ORDER.filter((id) => set.has(id)).map(effectOf) })
    defences.set(key, found)
  }
  return found
}
const plus = (set: Set_, ...ids: Id[]) => new Set([...set, ...ids])
const minus = (set: Set_, ...ids: Id[]) => new Set([...set].filter((x) => !ids.includes(x)))
const withoutTrinkets = (set: Set_) => new Set([...set].filter((x) => !TRINKETS.has(x)))
const wornIn = (set: Set_) => [...set].find((x) => TRINKETS.has(x)) ?? null

const oneDecimal = (value: number) => Math.round(value * 10) / 10
const fmt = (value: number) => formatNumber(oneDecimal(value), 'fr')
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const joinFr = (items: readonly string[], last = 'et') =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`

// The contexts: Moder's sheet (every attack), and the Simulation of its Bite.
const moder = game.creatures.find((c) => c.id === 'Dragon')!
const GENDER: Record<string, 'f' | 'm'> = {
  Morsure: 'f',
  Griffe: 'f',
  'Barrage de projectiles': 'm',
  'Souffle glacial': 'm',
}
interface CtxAttack {
  readonly name: string
  readonly gender: 'f' | 'm'
  readonly hits: (typeof moder.attacks)[number]['hits']
}
interface Ctx {
  readonly kind: 'creature' | 'attack'
  readonly attacks: readonly CtxAttack[]
  readonly types: ReadonlySet<string>
  readonly bar: number
}
const ctxOf = (kind: Ctx['kind'], attacks: typeof moder.attacks, bar = 0): Ctx => ({
  kind,
  bar,
  attacks: attacks.map((a) => ({ name: a.name.fr, gender: GENDER[a.name.fr]!, hits: a.hits })),
  types: new Set(attacks.flatMap((a) => a.hits.flatMap((h) => Object.entries(h.damages).filter(([, v]) => v > 0).map(([t]) => t)))),
})
const CREATURE = ctxOf('creature', moder.attacks)
const biteOnly = moder.attacks.filter((a) => a.ids.includes('dragon_bite'))
const BITE = BARS.map((bar) => ctxOf('attack', biteOnly, bar / 100))

const result = (set: Set_, attack: CtxAttack, guard: Guard, bar = 0): HitResult =>
  hardestHit(defence(set), attack.hits, world, { guard, stars: 0, barBefore: bar })!

const participle = (guard: Guard, gender: 'f' | 'm', plural: boolean) =>
  `${guard === 'block' ? 'bloqué' : 'paré'}${gender === 'f' ? 'e' : ''}${plural ? 's' : ''}`
const SEVERITY: readonly Verdict[] = ['holds', 'staggered', 'broken', 'unblockable']
const worse = (a: Verdict, b: Verdict) => SEVERITY.indexOf(a) > SEVERITY.indexOf(b)

// French names of damage types, with their article.
const TO_TYPE: Record<string, string> = {
  blunt: 'au contondant',
  slash: 'au coupant',
  pierce: 'au perforant',
  fire: 'au feu',
  frost: 'à la glace',
  lightning: 'à la foudre',
  poison: 'au poison',
  spirit: "à l'esprit",
}
const OF_TYPE: Record<string, string> = {
  blunt: 'de contondant',
  slash: 'de coupant',
  pierce: 'de perforant',
  fire: 'de feu',
  frost: 'de glace',
  lightning: 'de foudre',
  poison: 'de poison',
  spirit: "d'esprit",
}
const WEAK = new Set(['slightlyWeak', 'weak', 'veryWeak'])

/** Who gives this state its modifier on a damage type: a piece, else a power or a drink, else a trinket. */
function sourceOf(set: Set_, type: string): string | null {
  const value = defence(set).modifiers[type as keyof Defence['modifiers']]
  if (value === undefined) return null
  const owned = PIECES.find((p) => (p.modifiers as Record<string, string> | undefined)?.[type] === value)
  if (owned) return OWNER[owned.id]!
  const order = [...ORDER.filter((id) => !TRINKETS.has(id)), ...ORDER.filter((id) => TRINKETS.has(id))]
  const effect = order.find((id) => set.has(id) && (effectOf(id).modifiers as Record<string, string> | undefined)?.[type] === value)
  return effect ? SUBJECT[effect] : null
}

const resists = (who: string) => (who.startsWith('tes ') ? 'résistent' : 'résiste')
/** « ton pouvoir Masse-d'Os résiste déjà au coupant, ton plastron au perforant », for these types. */
function resisting(set: Set_, types: readonly string[]): string {
  const groups = new Map<string, string[]>()
  for (const type of types) {
    const who = sourceOf(set, type) ?? '?'
    groups.set(who, [...(groups.get(who) ?? []), TO_TYPE[type]!])
  }
  return [...groups.entries()]
    .map(([who, list], i) => (i === 0 ? `${who} ${resists(who)} déjà ${joinFr(list)}` : `${who} ${joinFr(list)}`))
    .join(', ')
}
/** The weakness a resistance cancels: « sa faiblesse au perforant ne joue pas : ton plastron y résiste déjà ». */
function cancelled(set: Set_, types: readonly string[]): string {
  if (types.length === 1) {
    const who = sourceOf(set, types[0]!) ?? '?'
    return `sa faiblesse ${TO_TYPE[types[0]!]} ne joue pas${NBSP}: ${who} y ${resists(who)} déjà`
  }
  return `ses faiblesses ne jouent pas${NBSP}: ${resisting(set, types)}`
}

interface Change {
  readonly text: string
  readonly better: boolean
  readonly cancels?: boolean
  /** For two changes of one attack (sheet) or with the same numbers (Bite): what can be said once. */
  readonly attack?: string
  readonly rest?: string
  readonly numbers?: string
  readonly guard?: Guard
  readonly verdict?: boolean
}
interface Sized extends Change {
  readonly size: number
  readonly order: number
}

/** What state `a` does against the context compared with state `b`, best first: verdicts, then the damage
 * of the guard one would use, the stamina, the other guard, and a weakness a resistance cancels. `subject`
 * is the effect that makes the difference. */
function changes(ctx: Ctx, a: Set_, b: Set_, subject: Id): Change[] {
  const verdictGroups = new Map<string, { guard: Guard; to: Verdict; from: Verdict; attacks: CtxAttack[]; taken: number; before: number }>()
  const used: Sized[] = []
  const other: Sized[] = []
  const stamina: Record<Guard, { a: number[]; b: number[] }> = { block: { a: [], b: [] }, parry: { a: [], b: [] } }
  ctx.attacks.forEach((attack, order) => {
    const ra = { block: result(a, attack, 'block', ctx.bar), parry: result(a, attack, 'parry', ctx.bar) }
    const rb = { block: result(b, attack, 'block', ctx.bar), parry: result(b, attack, 'parry', ctx.bar) }
    const action = attackAdvice({ block: ra.block.verdict, parry: ra.parry.verdict }).action
    for (const guard of ['block', 'parry'] as const) {
      const x = ra[guard]
      const y = rb[guard]
      stamina[guard].a.push(Math.round(x.stamina))
      stamina[guard].b.push(Math.round(y.stamina))
      if (x.verdict !== y.verdict) {
        const key = `${guard}|${x.verdict}|${y.verdict}`
        const group = verdictGroups.get(key) ?? { guard, to: x.verdict, from: y.verdict, attacks: [], taken: x.taken, before: y.taken }
        group.attacks.push(attack)
        verdictGroups.set(key, group)
      } else if (fmt(x.taken) !== fmt(y.taken)) {
        const how = guard === 'block' ? 'en bloquant' : 'en parant'
        const numbers = `${fmt(x.taken)} subis au lieu de ${fmt(y.taken)}`
        const rest = `${participle(guard, attack.gender, false)} ${fmt(x.taken)} au lieu de ${fmt(y.taken)}`
        const change =
          ctx.kind === 'creature'
            ? { text: `${attack.name} ${rest}`, attack: attack.name, rest }
            : { text: `${how}, ${numbers}`, numbers, guard }
        // Relative change in steps of 10 %, so that close ones keep the order of the attacks.
        const size = Math.round((Math.abs(x.taken - y.taken) / Math.max(y.taken, 1)) * 10) / 10
        ;(action === guard ? used : other).push({ ...change, size, order, better: x.taken < y.taken })
      }
    }
  })

  const verdicts = [...verdictGroups.values()].map(({ guard, to, from, attacks, taken, before }): Change => {
    const better = worse(from, to)
    const plural = attacks.length > 1
    if (ctx.kind === 'attack') {
      const how = guard === 'block' ? 'en bloquant' : 'en parant'
      const said =
        to === 'holds'
          ? from === 'staggered'
            ? 'tu ne titubes plus'
            : 'ça tient'
          : to === 'staggered'
            ? from === 'holds'
              ? 'tu titubes'
              : 'ça ne cède plus, tu titubes'
            : 'ça cède'
      return { text: `${how}, ${said} (${fmt(taken)} subis au lieu de ${fmt(before)})`, better }
    }
    const shield = guard === 'block' ? 'le blocage' : 'la parade'
    const names = joinFr(attacks.map((x) => x.name))
    const agreed = participle(guard, attacks.every((x) => x.gender === 'f') ? 'f' : 'm', plural)
    const said =
      to === 'holds'
        ? from === 'staggered'
          ? `${agreed}, tu ne titubes plus`
          : `${agreed} ${plural ? 'tiennent' : 'tient'} au lieu de céder`
        : to === 'staggered'
          ? from === 'holds'
            ? `${agreed}, tu titubes`
            : `${agreed}, ${shield} ne cède plus, tu titubes`
          : `${agreed}, ${shield} cède`
    return { text: `${names} ${said}`, better, verdict: true, ...(plural ? {} : { attack: attacks[0]!.name, rest: said }) }
  })

  // A stamina change worded once, when it is the same for every attack of the context.
  const uniform = (values: number[]) => values.every((v) => v === values[0])
  const staminaOf = (guard: Guard) => {
    const { a: as, b: bs } = stamina[guard]
    if (!uniform(as) || !uniform(bs) || as[0] === bs[0]) return null
    return { a: as[0]!, b: bs[0]! }
  }
  const instead = (y: number) => (y > 0 ? ` au lieu d'en coûter ${fmt(y)}` : y < 0 ? ` au lieu de ${fmt(-y)}` : '')
  const staminaPhrase = (guard: Guard, { a: x, b: y }: { a: number; b: number }): Change => {
    const verb = guard === 'block' ? 'bloquer' : 'parer'
    const better = x < y
    if (x < 0) return { text: `${verb} rend ${fmt(-x)} d'endurance${instead(y)}`, better }
    if (x === 0) return { text: `${verb} ${y > 0 ? 'ne coûte plus' : 'ne rend plus'} d'endurance`, better }
    return { text: `${verb} coûte ${fmt(x)} d'endurance${y > 0 ? ` au lieu de ${fmt(y)}` : y < 0 ? ` au lieu d'en rendre ${fmt(-y)}` : ''}`, better }
  }
  const sb = staminaOf('block')
  const sp = staminaOf('parry')
  // Both guards giving stamina back say it in one phrase.
  const staminas: Change[] =
    sb && sp && sb.a < 0 && sp.a < 0
      ? [{ text: `${staminaPhrase('block', sb).text}, parer en rend ${fmt(-sp.a)}${instead(sp.b)}`, better: sb.a < sb.b && sp.a < sp.b }]
      : [sb && staminaPhrase('block', sb), sp && staminaPhrase('parry', sp)].filter((x): x is Change => !!x)

  // The weakness of the subject that a resistance cancels, against the context's damage types.
  const modifiers = (effectOf(subject).modifiers ?? {}) as Record<string, string>
  const cancelledTypes = Object.entries(modifiers)
    .filter(([type, state]) => WEAK.has(state) && ctx.types.has(type))
    .filter(([type]) => defence(a).modifiers[type as keyof Defence['modifiers']] === defence(b).modifiers[type as keyof Defence['modifiers']])
    .map(([type]) => type)
  const cancels: Change[] = cancelledTypes.length === 0 ? [] : [{ text: cancelled(b, cancelledTypes), better: true, cancels: true }]

  const bySize = (x: Sized, y: Sized) => y.size - x.size || x.order - y.order
  return [...verdicts, ...used.sort(bySize), ...staminas, ...other.sort(bySize), ...cancels]
}

/** The two changes a row shows, joined: one gain and one loss when the list has both, the gain first (the
 * loss first for what can make things worse); a weakness a resistance cancels always closes the line. */
function shown(list: readonly Change[], lossFirst: boolean): string {
  const gains = list.filter((x) => x.better && !x.cancels)
  const losses = list.filter((x) => !x.better)
  const cancel = list.find((x) => x.cancels)
  let picked: Change[]
  if (lossFirst) {
    picked = losses.length ? [losses[0]!, cancel ?? gains[0] ?? losses[1]] : [gains[0], cancel ?? gains[1]]
  } else if (gains.length && losses.length) {
    picked = [gains[0]!, losses[0]!]
  } else {
    const plain = list.filter((x) => !x.cancels)
    picked = [plain[0], plain[1] ?? cancel]
  }
  const [first, second] = picked.filter((x): x is Change => !!x)
  if (!first) return ''
  if (!second) return first.text
  // Said once: the same attack twice on the sheet, the same numbers at both guards on the Bite.
  if (first.better === second.better && first.attack && first.attack === second.attack) {
    return `${first.text}${first.verdict ? `${NBSP}; ` : ', '}${second.rest}`
  }
  if (first.better === second.better && first.numbers && first.numbers === second.numbers) {
    return `${first.guard === 'block' ? 'en bloquant comme en parant' : 'en parant comme en bloquant'}, ${first.numbers}`
  }
  return `${first.text}${first.better !== second.better ? ', mais ' : `${NBSP}; `}${second.text}`
}

/** Why an effect adds nothing to state `b` against the context: its lead, its reason, and that reason in brief. */
function why(ctx: Ctx, id: Id, b: Set_): { lead: string; reason: string; brief: string } {
  const modifiers = (effectOf(id).modifiers ?? {}) as Record<string, string>
  const own = Object.keys(modifiers).filter((type) => ctx.types.has(type))
  const resisted = own.filter((type) => !WEAK.has(modifiers[type]!))
  const effect = effectOf(id) as Record<string, unknown>
  const acts = ['addArmor', 'armorMultiplier', 'staggerModifier', 'parryBonus', 'blockStaminaModifier', 'blockStaminaFlat'].some(
    (field) => effect[field] !== undefined,
  )
  if (own.length === 0) {
    const absent = Object.keys(modifiers).map((t) => OF_TYPE[t] ?? t)
    if (absent.length > 0 && !acts) {
      const brief = `pas ${joinFr(absent, 'ni')}`
      return ctx.kind === 'creature'
        ? { lead: 'Rien contre Moder', reason: `${brief} dans ses attaques`, brief }
        : { lead: `Rien contre la ${ctx.attacks[0]!.name}`, reason: brief, brief }
    }
    // No resistance at stake: what it does (armor, stagger, parry, stamina) changes nothing at this bar,
    // where each guard already holds or gives way anyway.
    const attack = ctx.attacks[0]!
    const [block, parry] = (['block', 'parry'] as const).map((guard) => result(b, attack, guard, ctx.bar).verdict)
    const state = (verdict: Verdict) => (verdict === 'holds' ? 'tient déjà' : verdict === 'staggered' ? 'te fait tituber quand même' : 'cède quand même')
    const reason =
      block === parry
        ? `le blocage et la parade ${block === 'holds' ? 'tiennent déjà' : block === 'staggered' ? 'te font tituber quand même' : 'cèdent quand même'}`
        : `le blocage ${state(block!)}, la parade ${state(parry!)}`
    return { lead: 'Rien de plus', reason, brief: reason }
  }
  if (resisted.length === 0) {
    return { lead: 'Rien de plus', reason: cancelled(b, own), brief: own.length === 1 ? 'sa faiblesse ne joue pas' : 'ses faiblesses ne jouent pas' }
  }
  // In brief, only who already resists: « ta cape résiste déjà ».
  const who = [...new Set(resisted.map((type) => sourceOf(b, type) ?? '?'))]
  const brief = `${joinFr(who)} ${who.length > 1 ? 'résistent' : resists(who[0]!)} déjà`
  return { lead: 'Rien de plus', reason: resisting(b, resisted), brief }
}
const nothing = (ctx: Ctx, id: Id, b: Set_) => {
  const { lead, reason } = why(ctx, id, b)
  return `${lead}${NBSP}: ${reason}`
}

const stable = (value: unknown): string =>
  value !== null && typeof value === 'object'
    ? `{${Object.keys(value)
        .sort()
        .map((key) => `${key}:${stable((value as Record<string, unknown>)[key])}`)
        .join(',')}}`
    : JSON.stringify(value)
const sameEffect = (x: Id, y: Id) => {
  const strip = (id: Id) => {
    const { id: _id, name: _name, items: _items, ...rest } = effectOf(id) as Record<string, unknown>
    return stable(rest)
  }
  return strip(x) === strip(y)
}

/** Whether an effect changes anything against the context, and whether it makes anything worse, alone over
 * the pieces. */
function alone(ctx: Ctx, id: Id) {
  let changed = false
  let worsens = false
  for (const attack of ctx.attacks) {
    for (const guard of ['block', 'parry'] as const) {
      const x = result(new Set([id]), attack, guard, ctx.bar)
      const y = result(new Set(), attack, guard, ctx.bar)
      if (x.verdict !== y.verdict || fmt(x.taken) !== fmt(y.taken) || Math.round(x.stamina) !== Math.round(y.stamina)) changed = true
      if (worse(x.verdict, y.verdict) || oneDecimal(x.taken) > oneDecimal(y.taken)) worsens = true
    }
  }
  return { changed, worsens }
}

// What the list holds: carried effects always; others when they change something against Moder, or do
// what a carried one does.
const identical = (id: Id) => CARRIED.find((c) => c !== id && sameEffect(id, c)) ?? null
const listed = CANDIDATES.filter((id) => alone(CREATURE, id).changed || identical(id))
const dropped = CANDIDATES.filter((id) => !listed.includes(id))
const SWITCHES: Id[] = [...CARRIED, ...listed].filter((id) => !identical(id) && alone(CREATURE, id).changed)
const CARRIED_TRINKET = CARRIED.find((id) => TRINKETS.has(id)) ?? null
// The sections are the creature's, in its sheet and in the Simulation of its attacks.
const MIXED = listed.filter((id) => SWITCHES.includes(id) && alone(CREATURE, id).worsens)
console.log('listed', listed, 'dropped (nothing against Moder)', dropped, 'switches', SWITCHES, 'double-edged', MIXED)

// Every state: one trinket at most, the other switches free.
const trinketChoices: (Id | null)[] = [null, ...SWITCHES.filter((id) => TRINKETS.has(id))]
const free = SWITCHES.filter((id) => !TRINKETS.has(id))
const states: Set_[] = []
for (const trinket of trinketChoices) {
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const set = new Set<Id>(free.filter((_, i) => mask & (1 << i)))
    if (trinket) set.add(trinket)
    states.push(set)
  }
}

/** A muted row's text, and its reason in brief (« pas de feu », « ta cape résiste déjà »). */
const mutedRow = (ctx: Ctx, id: Id, b: Set_) => ({ text: nothing(ctx, id, b), muted: true, brief: why(ctx, id, b).brief })

function rowOf(ctx: Ctx, id: Id, state: Set_): { text: string; muted: boolean; brief?: string } {
  const twin = identical(id)
  if (twin) return { text: `Même effet que ${SUBJECT[twin]}`, muted: true, brief: `même effet que ${SUBJECT[twin]}` }
  if (!SWITCHES.includes(id)) return mutedRow(ctx, id, state)
  const join = (items: readonly Change[]) => shown(items, MIXED.includes(id))
  if (TRINKETS.has(id)) {
    const rest = withoutTrinkets(state)
    const own = changes(ctx, plus(rest, id), rest, id)
    const worn = wornIn(state)
    // What it is set against: the trinket worn now, or the one carried when this one is worn in its place.
    const against = worn && worn !== id ? worn : worn === id && CARRIED_TRINKET && CARRIED_TRINKET !== id ? CARRIED_TRINKET : null
    const swap = against ? changes(ctx, plus(minus(state, against), id), plus(minus(state, id), against), id) : own
    if (own.length === 0) {
      // Nothing of its own: no better than going without; worse than the trinket it would replace.
      if (!against || swap.length === 0) return mutedRow(ctx, id, rest)
      return {
        text: `Moins bien que ${SUBJECT[against]}${NBSP}: rien de plus, ${why(ctx, id, rest).reason}`,
        muted: true,
        brief: `moins bien que ${SUBJECT[against]}`,
      }
    }
    if (!against) return { text: capital(join(own)), muted: false }
    if (swap.length === 0) return { text: `Même effet que ${SUBJECT[against]}`, muted: true, brief: `même effet que ${SUBJECT[against]}` }
    return { text: `En remplaçant ${SUBJECT[against]}${NBSP}: ${join(swap)}`, muted: false }
  }
  const on = state.has(id)
  const list = changes(ctx, on ? state : plus(state, id), on ? minus(state, id) : state, id)
  if (list.length === 0) return mutedRow(ctx, id, on ? minus(state, id) : state)
  return { text: capital(join(list)), muted: false }
}

const SECTIONS = [
  { id: 'yours', title: 'CE QUE TU EMPORTES', rows: CARRIED },
  { id: 'others', title: 'LES AUTRES', rows: listed.filter((id) => !MIXED.includes(id)) },
  ...(MIXED.length ? [{ id: 'mixed', title: 'À DOUBLE TRANCHANT', rows: MIXED }] : []),
]

const rowsOf = (ctx: Ctx) =>
  Object.fromEntries(
    states.map((state) => [keyOf(state), Object.fromEntries([...CARRIED, ...listed].map((id) => [id, rowOf(ctx, id, state)]))]),
  )

// Moder's sheet: each attack's verdicts and the advice, as the app words them.
const ADVICE_TONES = { unknown: 'none', blockAll: 'ok', parryAll: 'warn', dodgeAll: 'bad', dodgeSome: 'bad' } as const
const adviceOf = (assessment: ReturnType<typeof assess>) => {
  const { advice } = assessment
  const text =
    advice.kind === 'dodgeAll'
      ? fr.advice.dodgeAll(advice.rollsAvoid, assessment.canParry)
      : advice.kind === 'dodgeSome'
        ? fr.advice.dodgeSome(advice.rollsAvoid, advice.dodge.map((x) => x.attack.name.fr), advice.rest)
        : fr.advice[advice.kind]
  return { text: typeset(text), tone: ADVICE_TONES[advice.kind] }
}
const sheet = Object.fromEntries(
  states.map((state) => {
    const assessment = assess(moder, defence(state), world, 0)
    return [
      keyOf(state),
      {
        advice: adviceOf(assessment),
        attacks: assessment.attacks.map((x) => ({
          name: x.attack.name.fr,
          block: verdictTone(x.verdicts!.block),
          parry: verdictTone(x.verdicts!.parry),
          dodge: x.verdicts!.dodgeable ? 'ok' : 'bad',
          blockWord: fr.verdicts[x.verdicts!.block],
          parryWord: fr.verdicts[x.verdicts!.parry!],
        })),
      },
    ]
  }),
)

// Moder in the Bestiary, which only ever counts the pieces.
const listed0 = assess(moder, defence(new Set()), world, 0)
const bestiary = {
  name: moder.name.fr,
  stats: [game.biomes.find((b) => b.id === 'mountain')!.name.fr, moder.boss ? fr.bestiary.boss : null, fr.bestiary.health(moder.health)]
    .filter((x) => x !== null)
    .join(' · '),
  qualifier: qualifierOf(moder, 'fr'),
  advice: adviceOf(listed0),
  block: { tone: verdictTone(listed0.block), word: fr.verdicts[listed0.block!] },
  parry: { tone: verdictTone(listed0.parry), word: fr.verdicts[listed0.parry!] },
  dodge: { tone: listed0.dodgeable ? 'ok' : 'bad', word: listed0.dodgeable ? fr.verdicts.dodgeable : fr.verdicts.undodgeable },
}

// The Simulation of the Bite: both cards and the advice, for each bar before the hit.
const bite = BITE[0]!.attacks[0]!
const card = (r: HitResult) => {
  const { before, shield, armor, limit } = r.bar
  const total = Math.min(limit, before + shield + armor)
  let used = 0
  const widths = [before, shield, armor].map((part) => {
    const width = Math.min(100 - used, (Math.max(0, part) / limit) * 100)
    used += width
    return Number(width.toFixed(2))
  })
  return {
    tone: verdictTone(r.verdict),
    word: fr.verdicts[r.verdict].toUpperCase(),
    taken: fmt(r.taken),
    stamina: fr.simulation.stamina(Math.round(r.stamina)),
    widths,
    overflows: r.staggered,
    barText: typeset(r.staggered ? fr.simulation.barOverflows : fr.simulation.barTotal(oneDecimal(total), oneDecimal(limit))),
    barLabel: typeset(fr.simulation.barLabel(oneDecimal(total), oneDecimal(limit), r.staggered)),
  }
}
const sim = Object.fromEntries(
  states.map((state) => [
    keyOf(state),
    BARS.map((bar) => {
      const block = result(state, bite, 'block', bar / 100)
      const parry = result(state, bite, 'parry', bar / 100)
      const advice = attackAdvice({ block: block.verdict, parry: parry.verdict })
      const shown =
        advice.action === 'block'
          ? { tone: 'ok', text: fr.simulation.advice.block }
          : advice.action === 'parry'
            ? { tone: 'warn', text: fr.simulation.advice.parry(advice.block === 'broken' ? 'broken' : 'staggered') }
            : { tone: 'bad', text: fr.simulation.advice.dodge(true, advice.guard, advice.setback) }
      return { block: card(block), parry: card(parry), advice: { ...shown, text: typeset(shown.text) } }
    }),
  ]),
)

const PRESELECTED = CARRIED.filter((id) => SWITCHES.includes(id))
const data = {
  // The order the state keys follow.
  order: ORDER,
  switches: SWITCHES,
  trinkets: SWITCHES.filter((id) => TRINKETS.has(id)),
  preselected: PRESELECTED,
  names: Object.fromEntries([...CARRIED, ...listed].map((id) => [id, nameOf(id)])),
  subjects: Object.fromEntries([...CARRIED, ...listed].map((id) => [id, SUBJECT[id]])),
  tags: Object.fromEntries([...CARRIED, ...listed].map((id) => [id, tagOf(id)])),
  // What the verdicts leave out until something is applied.
  without: 'Verdicts sans tes effets temporaires',
  sections: SECTIONS,
  modal: { moder: rowsOf(CREATURE), morsure: BITE.map(rowsOf) },
  sheet,
  sim,
  bestiary,
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(OUT, JSON.stringify(data), 'utf8')
console.log('states', states.length, 'bytes', JSON.stringify(data).length)
