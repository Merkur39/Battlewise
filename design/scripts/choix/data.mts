// What Ton équipement shows before and after the cape picked in the « Équipement → Arsenal » tracks, worked out
// by the app's own engine: the wolf cape at level 3, then the Ashen Cape at the same level.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { withstand } from '@/features/gear/model'
import { summarize } from '@/features/gear/pieces'

const world = { difficulty: 'normal', players: 1 } as const
const base: Gear = {
  blocker: 'ShieldSilver',
  level: 3,
  skill: 25,
  armor: 0,
  maxHealth: 150,
  pieces: {
    helmet: { id: 'HelmetIron', level: 1 },
    chest: { id: 'ArmorIronChest', level: 1 },
    legs: { id: 'ArmorIronLegs', level: 1 },
    cape: { id: 'CapeWolf', level: 3 },
  },
}
const figures = (gear: Gear) => {
  const defence = gearDefence(gear)
  const taken = withstand(defence, world)
  const gauge = (g: typeof taken.block) =>
    g && { power: g.power, unstaggered: Math.floor(g.unstaggered), unbroken: Math.floor(g.unbroken), ok: (Math.min(g.unstaggered, taken.scale) / taken.scale) * 100, warn: (Math.min(g.unbroken - g.unstaggered, taken.scale) / taken.scale) * 100 }
  const summary = summarize(gear.pieces ?? {})
  return { armor: defence.armor, parts: summary.parts, block: gauge(taken.block), parry: gauge(taken.parry), staggerAt: taken.staggerAt }
}
const after: Gear = { ...base, pieces: { ...base.pieces, cape: { id: 'CapeAsh', level: 3 } } }
const out = { before: figures(base), after: figures(after) }
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/choix.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out))
