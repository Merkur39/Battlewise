// Carries track A's approved iteration (#67, v195) into Origine: Ton équipement's and the first arrival's rows open
// their list instead of a select, and the lists get boards of their own, linked for Play (a row → its list → back).
// One-shot, like the Arsenal's --origine: it reads Origine boards that still hold their selects. Run from this folder,
// after data.mts: node origine.mjs, then sync_themes.py and check_canvas.py from design/.
import { writeFileSync } from 'node:fs'
import * as arsenal from '../arsenal/build.mjs'
import * as choix from './build.mjs'

const { PROJECT, read, take, swap, data, BACK, RIGHT, noneRow, picker, arrivalPicker, deskPicker, chooseTable, handPills } = choix

// ---- The rows: each one's name over what it holds, a chevron, and a link to its list when it has a board. ----

const ROW =
  /<label for="([qe])-(\w+)" style="([^"]*)">([^<]+)<\/label>(\s*)<span style="display: flex; align-items: center; gap: 4px"><select id="\1-\2" style="[^"]*">([^]*?)<\/select><svg[^]*?<\/svg><\/span>/g
const valueOf = (options) => {
  const selected = options.match(/<option selected>([^<]*)<\/option>/)
  return selected ? selected[1] : take(options, /<option>([^<]*)<\/option>/, 'option')
}
const sentence = (label) => `${label.charAt(0)}${label.slice(1).toLowerCase()}`
function rowsOpen(html, links, expected) {
  let count = 0
  const out = html.replace(ROW, (_, prefix, id, labelStyle, label, gap, options) => {
    count += 1
    const value = valueOf(options)
    const inner = `<span style="${labelStyle}">${label}</span>${gap}<span style="display: flex; align-items: center; gap: 6px"><span style="flex: 1; min-width: 0; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${value}</span>${RIGHT}</span>`
    const box = 'display: flex; flex-direction: column; gap: 1px'
    return links[id]
      ? `<a href="${links[id]}.dc.html" aria-label="${sentence(label)}&nbsp;: ${value}" style="${box}; color: inherit; text-decoration: none">${inner}</a>`
      : `<span style="${box}">${inner}</span>`
  })
  if (count !== expected) throw new Error(`${count} rows turned, ${expected} expected`)
  return out
}
const ADD_DRINK = /<button type="button" (style="display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px;[^"]*")>([^]*?Ajouter une boisson)<\/button>/
const addDrink = (html, target) =>
  html.replace(ADD_DRINK, (_, style, inner) => `<a href="${target}.dc.html" ${style.replace('text-align: left', 'text-align: left; text-decoration: none')}>${inner}</a>`)

// ---- The lists, on boards of their own. ----

const titled = (html, title) => html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
const PROFIL = read('Profil.dc.html')
const PHONE_HEAD = take(PROFIL, /^([^]*?)<div role="dialog"/, 'phone head')
const PHONE_TAIL = take(PROFIL, /\n(<\/x-dc>[^]*)$/, 'phone tail')
const phoneBoard = (title, dialog, back) => `${titled(PHONE_HEAD, title)}${dialog.replaceAll('href="#"', `href="${back}.dc.html"`)}\n${PHONE_TAIL}`

const DESK_EQ = read('Desktop-Equipement.dc.html')
const DESK_HEAD = take(DESK_EQ, /^([^]*?<\/helmet>\n)/, 'desktop head')
const DESK_TAIL = take(DESK_EQ, /\n(<\/x-dc>[^]*)$/, 'desktop tail')
const deskBoard = (title, body, back) => `${titled(DESK_HEAD, title)}${body.replaceAll('href="#"', `href="${back}.dc.html"`)}\n${DESK_TAIL}`

const LEVEL1 = 'Au niveau 1, avec ta compétence Blocage 25&nbsp;; ce que tu choisis garde ton N3, s’il y monte.'
const CAPE = 'Au niveau 1&nbsp;; celle que tu choisis garde le niveau de ta cape (N3), à régler ensuite.'
const TRINKET = 'Un seul à la fois&nbsp;: celui que tu choisis remplace ta Broche en fer.'
const DRINK = `Ton ${choix.frost.name} est déjà emporté&nbsp;: une boisson ne se prend qu'une fois.`
const HELMET = 'Au niveau 1&nbsp;; celui que tu choisis garde ton N2, s’il y monte.'
const EFFECT_COLS = (three) => `minmax(0, 1.8fr) minmax(0, 0.7fr)${three ? ' minmax(0, 1.4fr)' : ''} minmax(0, 3.2fr) 130px`
const ARMOR_COLS = 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 2.2fr) minmax(0, 1.8fr) 110px'
const notCarried = choix.drinks.filter((e) => !e.carried)
const bronze = data.pieces.helmet
  .map((p) => ({ ...p, equipped: p.id === 'HelmetBronze' }))
  .toSorted((a, b) => Number(b.equipped) - Number(a.equipped) || b.armor - a.armor || a.name.localeCompare(b.name, 'fr'))

const boards = {
  'Equipement-Tenu.dc.html': phoneBoard('Ton équipement — ce que tu tiens', picker({ title: 'Ce que tu tiens', count: `${data.counts.shields + data.counts.weapons + data.counts.others}`, search: 'Chercher ce que tu tiens', pills: handPills(), note: LEVEL1, rows: choix.shieldCards() }), 'Profil'),
  'Equipement-Cape.dc.html': phoneBoard('Ton équipement — ta cape', picker({ title: 'Ta cape', count: `${data.counts.cape} capes`, search: 'Chercher une cape', note: CAPE, rows: `${noneRow('Aucune cape', 'retire celle que tu portes')}\n        ${choix.capeCards()}` }), 'Profil'),
  'Equipement-Bibelot.dc.html': phoneBoard('Ton équipement — ton bibelot', picker({ title: 'Ton bibelot', count: `${data.counts.trinket} bibelots`, search: 'Chercher un bibelot', note: TRINKET, rows: `${noneRow('Aucun bibelot', 'retire celui que tu emportes')}\n        ${choix.effectCards(data.effects.trinket)}` }), 'Profil'),
  'Equipement-Boisson.dc.html': phoneBoard('Ton équipement — une boisson de plus', picker({ title: 'Une boisson de plus', count: `${notCarried.length} sur ${choix.drinks.length}`, search: 'Chercher une boisson', note: DRINK, rows: choix.effectCards(notCarried) }), 'Profil'),
  'Arrivee-Casque.dc.html': titled(read('Arrivee-Equipement.dc.html'), 'Première arrivée — ton casque').replace(
    /<div role="dialog"[^]*?\n<\/div>\n(?=<\/x-dc>)/,
    () => `${arrivalPicker({ title: 'Ton casque', count: `${data.counts.helmet} casques`, search: 'Chercher un casque', note: HELMET, rows: `${noneRow('Aucun casque', 'retire celui que tu portes')}\n        ${choix.bronzeHelmets()}` }).replaceAll('href="#"', 'href="Arrivee-Equipement.dc.html"')}\n`,
  ),
  'Desktop-Equipement-Tenu.dc.html': deskBoard('Ton équipement — ce que tu tiens, desktop', deskPicker({ title: 'Ce que tu tiens', search: 'Chercher ce que tu tiens', controls: handPills(true), note: LEVEL1, table: chooseTable(arsenal.blockerTable('shields'), null) }), 'Desktop-Equipement'),
  'Desktop-Equipement-Cape.dc.html': deskBoard('Ton équipement — ta cape, desktop', deskPicker({ title: 'Ta cape', search: 'Chercher une cape', note: CAPE, table: chooseTable(arsenal.armorTable('cape'), ['Aucune cape', 'retire celle que tu portes'], ARMOR_COLS) }), 'Desktop-Equipement'),
  'Desktop-Equipement-Bibelot.dc.html': deskBoard('Ton équipement — ton bibelot, desktop', deskPicker({ title: 'Ton bibelot', search: 'Chercher un bibelot', note: TRINKET, table: chooseTable(arsenal.effectTable('trinket'), ['Aucun bibelot', 'retire celui que tu emportes'], EFFECT_COLS(true)) }), 'Desktop-Equipement'),
  'Desktop-Equipement-Boisson.dc.html': deskBoard('Ton équipement — une boisson de plus, desktop', deskPicker({ title: 'Une boisson de plus', search: 'Chercher une boisson', note: DRINK, table: chooseTable(arsenal.effectTable('consumable', notCarried), null) }), 'Desktop-Equipement'),
}

// The first arrival on a desktop: its step stays at the head of the widened dialog, the list under it.
function deskArrival() {
  const source = read('Desktop-Arrivee-Equipement.dc.html')
  let html = swap(source, 'width: min(600px, 100%)', 'width: min(1180px, 100%); height: 100%')
  const after = take(html, /<\/header>\n([^]*?\n      <\/footer>\n)/, 'desktop arrival body')
  html = swap(html, after, `      <div style="flex: none; display: flex; align-items: center; gap: 8px; padding: 10px 24px 10px 12px; border-bottom: 1px solid #2C383D">
        <a href="Desktop-Arrivee-Equipement.dc.html" aria-label="Retour à la question, sans rien changer" style="flex: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${BACK}</a>
        <span style="flex: 1; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 14px; color: #7D8B91">Ton équipement ›</span><h2 style="margin: 0; font-size: 18px; font-weight: 500">Ton casque</h2></span>
      </div>
      <div style="flex: 1; min-height: 0; padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px">
        <div style="flex: none; display: flex; align-items: center; gap: 16px">${choix.searchBox('Chercher un casque', 40, 14).replace('flex: none;', 'flex: 0 0 280px;')}<span style="font-size: 14px; color: #97A5AA">${HELMET}</span></div>
        ${chooseTable(arsenal.armorTable('helmet', bronze), ['Aucun casque', 'retire celui que tu portes'], ARMOR_COLS)}
      </div>
`)
  return titled(html, 'Première arrivée — ton casque, desktop').replaceAll('href="#"', 'href="Desktop-Arrivee-Equipement.dc.html"')
}
boards['Desktop-Arrivee-Casque.dc.html'] = deskArrival()

// ---- Ton équipement and the first arrival, their rows leading to the lists. ----

boards['Profil.dc.html'] = addDrink(rowsOpen(PROFIL, { item: 'Equipement-Tenu', cape: 'Equipement-Cape', trinket: 'Equipement-Bibelot' }, 8), 'Equipement-Boisson')
boards['Desktop-Equipement.dc.html'] = addDrink(rowsOpen(DESK_EQ, { item: 'Desktop-Equipement-Tenu', cape: 'Desktop-Equipement-Cape', trinket: 'Desktop-Equipement-Bibelot' }, 8), 'Desktop-Equipement-Boisson')
boards['Arrivee-Equipement.dc.html'] = rowsOpen(read('Arrivee-Equipement.dc.html'), { helmet: 'Arrivee-Casque' }, 7)
boards['Desktop-Arrivee-Equipement.dc.html'] = rowsOpen(read('Desktop-Arrivee-Equipement.dc.html'), { helmet: 'Desktop-Arrivee-Casque' }, 7)

for (const [file, html] of Object.entries(boards)) {
  if (/href="#"/.test(html)) throw new Error(`${file}: a link goes nowhere`)
  if (html.includes('{{')) throw new Error(`${file}: a hole is left`)
  writeFileSync(new URL(file, PROJECT), html, 'utf8')
  console.log(file, html.length)
}
