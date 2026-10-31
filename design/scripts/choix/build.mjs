// The « Équipement → Arsenal · pistes » page (#67): three ways for Ton équipement's rows (En main, the armor pieces,
// what one carries) to lead to the Arsenal's lists instead of a bare list. Each track on phones and a desktop, from
// the Origine boards and the Arsenal's own cards; the figures before and after the cape picked come from out/choix.json.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs, then node add.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import * as arsenal from '../arsenal/build.mjs'

const { MONO, CAPTION, CHEVRON, CHECK, SEARCH_ICON, data, chips } = arsenal
const PROJECT = new URL('../../canvas/project/', import.meta.url)
const read = (file) => readFileSync(new URL(file, PROJECT), 'utf8')
const figures = JSON.parse(readFileSync(new URL('./out/choix.json', import.meta.url), 'utf8'))
const take = (src, re, what) => {
  const m = src.match(re)
  if (!m) throw new Error(`${what} not found`)
  return m[1] ?? m[0]
}
const swap = (html, from, to, what = from) => {
  if (!html.includes(from)) throw new Error(`${what} not found`)
  return html.replace(from, to)
}

const PROFIL = read('Profil.dc.html')
const DESK_EQ = read('Desktop-Equipement.dc.html')
const DIALOG = take(PROFIL, /<div role="dialog"[^]*?\n<\/div>\n(?=<\/x-dc>)/, 'phone dialog')
const BACK = take(read('Monstre.dc.html'), /aria-label="Retour"[^>]*>\s*(<svg[^]*?<\/svg>)/, 'back icon')
const RIGHT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#97A5AA" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M9 6l6 6-6 6"></path></svg>'
const n = (value) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const half = (value) => Math.round(value * 2) / 2

// ---- Ton équipement, as Origine draws it, its rows turned into ways to a list. ----

/** The gauges and the armor of « Ce que tu encaisses » and the pieces' total, after the cape picked. */
function withAfter(html) {
  const { before, after } = figures
  const bar = (g, b) => `<span style="width: ${half(g.ok)}%; background: #2E7A4B"></span><span style="width: ${half(g.warn)}%; background: #B5760C"></span><span style="width: ${n(100 - half(g.ok) - half(g.warn))}%; background: #7A2A24"></span>`
  let out = html
  out = swap(out, `<span style="color: #6CC08A; font-size: 14px">${before.block.unstaggered}</span>`, `<span style="color: #6CC08A; font-size: 14px">${after.block.unstaggered}</span>`)
  out = swap(out, `<span style="color: #6CC08A; font-size: 14px">${before.parry.unstaggered}</span>`, `<span style="color: #6CC08A; font-size: 14px">${after.parry.unstaggered}</span>`)
  out = swap(out, '<span style="width: 62%; background: #2E7A4B"></span><span style="width: 7.5%; background: #B5760C"></span><span style="width: 30.5%; background: #7A2A24"></span>', bar(after.block), 'block gauge')
  out = swap(out, '<span style="width: 75.5%; background: #2E7A4B"></span><span style="width: 9.5%; background: #B5760C"></span><span style="width: 15%; background: #7A2A24"></span>', bar(after.parry), 'parry gauge')
  out = swap(out, `· ARMURE ${before.armor}`, `· ARMURE ${after.armor}`)
  out = swap(out, `font-size: 17px; line-height: 22px">${before.armor}</span>`, `font-size: 17px; line-height: 22px">${after.armor}</span>`)
  out = swap(out, before.parts.join(' + '), after.parts.join(' + '))
  return out
}

const ROW = /<label for="([qe])-(\w+)" style="([^"]*)">([^<]+)<\/label>(\s*)<span style="display: flex; align-items: center; gap: 4px"><select id="\1-\2" style="[^"]*">([^]*?)<\/select>(<svg[^]*?<\/svg>)<\/span>/g
const valueOf = (options) => {
  const selected = options.match(/<option selected>([^<]*)<\/option>/)
  return selected ? selected[1] : take(options, /<option>([^<]*)<\/option>/, 'option')
}
/** Each row's list turned into a way to the Arsenal's: `cue` after the name, the name given in `values` if any. */
function rowsLead(html, cue, values = {}) {
  let count = 0
  const out = html.replace(ROW, (_, prefix, id, labelStyle, label, gap, options) => {
    count += 1
    const value = values[id] ?? valueOf(options)
    return `<span style="${labelStyle}">${label}</span>${gap}<span style="display: flex; align-items: center; gap: 6px"><span style="flex: 1; min-width: 0; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${value}</span>${cue}</span>`
  })
  if (count < 8) throw new Error(`only ${count} rows turned`)
  return out
}
const ARSENAL_CUE = `<span style="flex: none; ${MONO}; font-size: 10px; letter-spacing: 0.04em; color: #7D8B91">ARSENAL</span>${RIGHT}`

const phoneFrame = (caption, inner, overlay = '') => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; color: #97A5AA">${caption}</span>
<div style="position: relative; flex: none; width: 390px; height: 844px; border-radius: 8px; outline: 1px solid #2C383D; overflow: hidden; background: #0D1214">
${inner}${overlay}
</div>
</div>`

// ---- Track A: the Arsenal's list for that row, inside Ton équipement. ----

const searchBox = (placeholder, height = 44, size = 15) =>
  `<label style="flex: none; display: flex; align-items: center; gap: 8px; height: ${height}px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: ${size}px; color: #7D8B91; white-space: nowrap; overflow: hidden">${SEARCH_ICON}<span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">${placeholder}</span>${placeholder}</label>`
const chose = (html) => html.replaceAll('. Ouvrir dans Ton équipement."', '. La choisir."')
const capeCards = () => chose(data.pieces.cape.map(arsenal.pieceCard).join('\n        '))
const noneRow = (label, note) =>
  `<a href="#" aria-label="${label}, ${note}." style="display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 16px; margin: 0 -16px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none"><span style="flex: 1; font-size: 15px">${label}</span><span style="font-size: 12px; color: #7D8B91">${note}</span></a>`

function pickerPhone() {
  return `<div role="dialog" aria-modal="true" aria-labelledby="p-title" style="width: 390px; height: 844px; box-sizing: border-box; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column">
  <header style="display: flex; align-items: center; gap: 4px; padding: 6px 16px 6px 4px; border-bottom: 1px solid #2C383D">
    <a href="#" aria-label="Retour à Ton équipement, sans rien changer" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${BACK}</a>
    <span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 11px; letter-spacing: 0.08em; color: #7D8B91">TON ÉQUIPEMENT</span><h2 id="p-title" style="margin: 0; font-size: 18px; line-height: 22px; font-weight: 500">Ta cape</h2></span>
    <span style="${MONO}; font-size: 12px; color: #7D8B91">${data.counts.cape} capes</span>
  </header>
  <main style="flex: 1; min-height: 0; padding: 12px 16px 0; display: flex; flex-direction: column; gap: 10px">
    ${searchBox('Chercher une cape')}
    <span style="flex: none; font-size: 12px; line-height: 1.35; color: #97A5AA">Au niveau 1&nbsp;; celle que tu choisis garde le niveau de ta cape (N3), à régler ensuite.</span>
    <div aria-label="Capes" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid #2C383D">
        ${noneRow('Aucune cape', 'retire celle que tu portes')}
        ${capeCards()}
    </div>
  </main>
</div>`
}

// ---- Track B: the Arsenal itself, in a choosing mode. ----

const banner = (title, note, desktopSize = false) =>
  `<div role="status" style="flex: none; display: flex; align-items: center; gap: 10px; padding: ${desktopSize ? '10px 12px 10px 16px' : '8px 10px 8px 12px'}; border: 1px solid #8EBDE3; border-radius: 6px; background: #1D3344">
      <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px"><span style="font-size: ${desktopSize ? 15 : 14}px; color: #E2E8E8">${title}</span><span style="font-size: 12px; color: #97A5AA">${note}</span></span>
      <a href="#" style="flex: none; display: inline-flex; align-items: center; height: 36px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; background: #0D1214; font-size: 13px; color: #E2E8E8; text-decoration: none">Annuler</a>
    </div>`
/** The Arsenal's phone of a category, the banner at the top of its page and « Sans … » first in its list. */
function choosingPhone(caption, category, title, note, none) {
  const html = arsenal.phone({ caption, nav: arsenal.navAS(category), category, bare: true })
  const opened = '  <main style="flex: 1; padding: 4px 16px 0; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: hidden">\n'
  const list = new RegExp(`(<div aria-label="[^"]+" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid #2C383D">\\n)`)
  return chose(swap(html, opened, `${opened}    ${banner(title, note)}\n`).replace(list, `$1        ${none}\n`))
}

// ---- Track C: richer lists, in place. ----

const option = (label, lines, selected, extra = '') =>
  `<div role="option" aria-selected="${selected}" style="display: flex; gap: 10px; padding: 9px 14px; border-bottom: 1px solid #1F2A2E${selected ? '; background: #1D3344' : ''}">
          <span style="flex: none; width: 16px; padding-top: 2px; color: #8EBDE3">${selected ? CHECK : ''}</span>
          <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 15px">${label}</span>${lines ? `<span style="${MONO}; font-size: 11px; line-height: 14px; color: #97A5AA">${lines}</span>` : ''}${extra}</span>
        </div>`
const capeOptions = () =>
  [
    option('Aucune', null, false),
    ...data.pieces.cape.map((p) =>
      option(
        p.name,
        `ARMURE ${p.armorText} · ${p.perLevel === '—' ? 'NE MONTE PAS' : `${p.perLevel} PAR NIVEAU`}`,
        p.equipped,
        `${p.chips.length ? chips(p.chips) : ''}${p.dodge ? `<span style="font-size: 12px; color: #97A5AA">${p.dodge[0].toUpperCase()}${p.dodge.slice(1)}</span>` : ''}`,
      ),
    ),
  ].join('\n        ')
const sheetC = `
  <div style="position: absolute; inset: 0; background: rgba(4, 6, 7, 0.72)"></div>
  <div role="dialog" aria-modal="true" aria-label="Cape" style="position: absolute; left: 0; right: 0; bottom: 0; height: 74%; display: flex; flex-direction: column; border-top: 1px solid #2C383D; border-radius: 14px 14px 0 0; background: #151C1F">
      <span aria-hidden="true" style="flex: none; align-self: center; width: 36px; height: 4px; margin-top: 8px; border-radius: 2px; background: #2C383D"></span>
      <div style="flex: none; display: flex; align-items: baseline; justify-content: space-between; padding: 12px 14px 8px; border-bottom: 1px solid #2C383D">
        <span style="font-size: 17px; font-weight: 500">Cape</span>
        <span style="font-size: 12px; color: #7D8B91">${data.counts.cape} · au niveau 1, triées par armure</span>
      </div>
      <div role="listbox" aria-label="Cape" style="flex: 1; min-height: 0; overflow-y: auto">
        ${capeOptions()}
      </div>
      <a href="#" style="flex: none; display: flex; align-items: center; justify-content: space-between; min-height: 52px; padding: 0 14px; border-top: 1px solid #2C383D; font-size: 14px; color: #8EBDE3; text-decoration: none">Comparer dans l'Arsenal${CHEVRON}</a>
  </div>`

// ---- Desktops: Ton équipement's dialog over the page, or the Arsenal. ----

const DESK_DIALOG_BODY = /      <div style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: grid;[^]*?\n      <\/footer>\n/
const NONE_ROW_DESK = (label, note) =>
  `<div role="row" style="display: grid; gap: 16px; align-items: center; min-height: 52px; padding: 10px 20px; box-sizing: border-box; border-bottom: 1px solid #1F2A2E; font-size: 15px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 2.2fr) minmax(0, 1.8fr) 110px">
            <span role="cell">${label}</span><span role="cell"></span><span role="cell"></span><span role="cell" style="font-size: 13px; color: #7D8B91">${note}</span><span role="cell"></span>
            <span role="cell" style="display: flex; justify-content: flex-end"><a href="#" aria-label="${label}" style="display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; font-size: 13px; color: #E2E8E8; text-decoration: none">Retirer</a></span>
          </div>`
/** The capes' table of the Arsenal, « Choisir » on each row and « Aucune cape » first. */
function capeTable() {
  const table = arsenal.armorTable('cape')
    .replaceAll('aria-label="Équiper&nbsp;: ', 'aria-label="Choisir&nbsp;: ')
    .replaceAll('>Équiper</a>', '>Choisir</a>')
  return swap(table, '<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ', `<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ${NONE_ROW_DESK('Aucune cape', 'retire celle que tu portes')}\n          `, 'cape rows')
}

function deskA() {
  let html = take(DESK_EQ, /<\/helmet>\n([^]*?)\n<\/x-dc>/, 'desktop gear body')
  html = swap(html, 'width: min(600px, 100%)', 'width: min(1180px, 100%); height: 100%')
  html = html.replace(
    /<h2 id="d-title"[^>]*>Ton équipement<\/h2>/,
    `<a href="#" aria-label="Retour à Ton équipement, sans rien changer" style="flex: none; width: 40px; height: 40px; margin-left: -12px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${BACK}</a><span style="flex: 1; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 14px; color: #7D8B91">Ton équipement ›</span><h2 id="d-title" style="margin: 0; font-size: 18px; font-weight: 500">Ta cape</h2></span>`,
  )
  html = swap(html, take(html, DESK_DIALOG_BODY, 'desktop dialog body'), `      <div style="flex: 1; min-height: 0; padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px">
        <div style="flex: none; display: flex; align-items: center; gap: 16px">${searchBox('Chercher une cape', 40, 14).replace('flex: none;', 'flex: 0 0 280px;')}<span style="font-size: 14px; color: #97A5AA">Au niveau 1&nbsp;; celle que tu choisis garde le niveau de ta cape (N3), à régler ensuite.</span></div>
        ${capeTable()}
      </div>
`)
  return html
}

function deskB() {
  const page = arsenal.desktop({ nav: '', category: 'cape', aside: arsenal.asideC('cape'), lede: arsenal.ledeAC('cape') })
  const choosing = page
    .replaceAll('aria-label="Équiper&nbsp;: ', 'aria-label="Choisir&nbsp;: ')
    .replaceAll('>Équiper</a>', '>Choisir</a>')
  const withBanner = swap(choosing, '<header style="display: flex; flex-direction: column; gap: 4px">', `${banner('Choisis ta cape pour Ton équipement', "Elle garde le niveau de ta cape (N3). Annuler revient à Ton équipement sans rien changer&nbsp;; ce que tu y avais commencé t'y attend.", true)}\n    <header style="display: flex; flex-direction: column; gap: 4px">`)
  return swap(withBanner, '<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ', `<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ${NONE_ROW_DESK('Sans cape', 'retire celle que tu portes')}\n          `, 'cape rows')
}

function deskC() {
  let html = take(DESK_EQ, /<\/helmet>\n([^]*?)\n<\/x-dc>/, 'desktop gear body')
  // The cape row's list opened in place, under it.
  const capeRow = take(html, /(<div style="display: flex; align-items: center; min-height: 44px; padding-left: 10px">\s*<span[^>]*><label for="e-cape"[^]*?<\/span>\s*<\/div>)/, 'desktop cape row')
  const listbox = `
        <div role="listbox" aria-label="Cape" style="max-height: 360px; overflow-y: auto; border-top: 1px solid #8EBDE3; background: #0D1214">
        ${capeOptions()}
        <a href="#" style="display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 14px; font-size: 14px; color: #8EBDE3; text-decoration: none">Comparer dans l'Arsenal${CHEVRON}</a>
        </div>`
  html = swap(html, capeRow, `${capeRow.replace('<path d="M6 9l6 6 6-6"></path>', '<path d="M6 15l6-6 6 6"></path>')}${listbox}`)
  return html.replace(/<div style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: grid;/, (m) => m)
}

const phones = (n) => arsenal.phoneWidth(n)
const H = 1220

// ---- Iteration 1 of track A, after the owner's pick: every kind of row, and the first arrival. ----

const pill = (label, count, on) =>
  `<button type="button" aria-pressed="${on}" style="flex: 1; height: 36px; padding: 0 10px; border-radius: 18px; font-size: 13px; white-space: nowrap; border: 1px solid ${on ? '#8EBDE3' : '#2C383D'}; ${on ? 'color: #8EBDE3; background: #1D3344' : 'color: #97A5AA'}">${label} <span style="${MONO}; font-size: 11px">${count}</span></button>`
const handPills = (desktopSize = false) =>
  `<div role="group" aria-label="Catégorie" style="flex: none; display: flex; gap: 6px${desktopSize ? '; width: 420px' : ''}">${pill('Boucliers', data.counts.shields, true)}${pill('Armes', data.counts.weapons, false)}${pill('Autres', data.counts.others, false)}</div>`

/** A list of the Arsenal for one row: its title, a way back, a search, a note, maybe pills, then the rows. */
function pickerBody({ title, count, search, note, pills = '', rows }) {
  return `  <header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 6px 16px 6px 4px; border-bottom: 1px solid #2C383D">
    <a href="#" aria-label="Retour à Ton équipement, sans rien changer" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${BACK}</a>
    <span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 11px; letter-spacing: 0.08em; color: #7D8B91">TON ÉQUIPEMENT</span><h2 id="p-title" style="margin: 0; font-size: 18px; line-height: 22px; font-weight: 500">${title}</h2></span>
    <span style="${MONO}; font-size: 12px; color: #7D8B91">${count}</span>
  </header>
  <main style="flex: 1; min-height: 0; padding: 12px 16px 0; display: flex; flex-direction: column; gap: 10px">
    ${searchBox(search)}${pills ? `\n    ${pills}` : ''}
    <span style="flex: none; font-size: 12px; line-height: 1.35; color: #97A5AA">${note}</span>
    <div aria-label="${title}" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid #2C383D">
        ${rows}
    </div>
  </main>`
}
const picker = (options) => `<div role="dialog" aria-modal="true" aria-labelledby="p-title" style="width: 390px; height: 844px; box-sizing: border-box; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column">
${pickerBody(options)}
</div>`

// The first arrival's question 2 keeps its step and its way out above the list.
const ARRIVAL = read('Arrivee-Equipement.dc.html')
const ARRIVAL_TOP = take(ARRIVAL, /(  <header style="flex: none; display: flex; align-items: center; justify-content: space-between;[^]*?<\/header>\n  <div aria-hidden="true"[^]*?<\/div>\n)/, 'arrival header')
const arrivalPicker = (options) => `<div role="dialog" aria-modal="true" aria-labelledby="p-title" style="width: 390px; height: 844px; box-sizing: border-box; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column">
${ARRIVAL_TOP}${pickerBody(options).replace('>TON ÉQUIPEMENT<', '>QUESTION 2 · TON ÉQUIPEMENT<')}
</div>`

const shieldCards = () => chose(data.blockers.shields.map(arsenal.blockerCard).join('\n        '))
const effectCards = (list) => chose(list.map(arsenal.effectCard).join('\n        '))
const bronzeHelmets = () =>
  chose(
    data.pieces.helmet
      .map((p) => ({ ...p, equipped: p.id === 'HelmetBronze' }))
      .toSorted((a, b) => Number(b.equipped) - Number(a.equipped) || b.armor - a.armor || a.name.localeCompare(b.name, 'fr'))
      .map(arsenal.pieceCard)
      .join('\n        '),
  )
const drinks = data.effects.consumable
const frost = drinks.find((e) => e.carried)

/** A category's table of the Arsenal in the widened dialog: « Choisir » on each row, `none` first. */
function chooseTable(table, none, cols) {
  const choosing = table
    .replaceAll('aria-label="Équiper&nbsp;: ', 'aria-label="Choisir&nbsp;: ')
    .replaceAll('aria-label="Emporter&nbsp;: ', 'aria-label="Choisir&nbsp;: ')
    .replaceAll('>Équiper</a>', '>Choisir</a>')
    .replaceAll('>Emporter</a>', '>Choisir</a>')
  if (!none) return choosing
  const row = `<div role="row" style="display: grid; gap: 16px; align-items: center; min-height: 52px; padding: 10px 20px; box-sizing: border-box; border-bottom: 1px solid #1F2A2E; font-size: 15px; grid-template-columns: ${cols}">
            <span role="cell">${none[0]}</span><span role="cell" style="grid-column: 2 / -2; font-size: 13px; color: #7D8B91">${none[1]}</span>
            <span role="cell" style="display: flex; justify-content: flex-end"><a href="#" aria-label="${none[0]}" style="display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; font-size: 13px; color: #E2E8E8; text-decoration: none">Retirer</a></span>
          </div>`
  return swap(choosing, '<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ', `<div style="flex: 1; min-height: 0; overflow-y: auto">\n          ${row}\n          `, 'table rows')
}
/** Ton équipement's dialog on a desktop, widened to the list of one row. */
function deskPicker({ title, search, note, controls = '', table }) {
  let html = take(DESK_EQ, /<\/helmet>\n([^]*?)\n<\/x-dc>/, 'desktop gear body')
  html = swap(html, 'width: min(600px, 100%)', 'width: min(1180px, 100%); height: 100%')
  html = html.replace(
    /<h2 id="d-title"[^>]*>Ton équipement<\/h2>/,
    `<a href="#" aria-label="Retour à Ton équipement, sans rien changer" style="flex: none; width: 40px; height: 40px; margin-left: -12px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${BACK}</a><span style="flex: 1; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 14px; color: #7D8B91">Ton équipement ›</span><h2 id="d-title" style="margin: 0; font-size: 18px; font-weight: 500">${title}</h2></span>`,
  )
  return swap(html, take(html, DESK_DIALOG_BODY, 'desktop dialog body'), `      <div style="flex: 1; min-height: 0; padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px">
        <div style="flex: none; display: flex; align-items: center; gap: 16px">${searchBox(search, 40, 14).replace('flex: none;', 'flex: 0 0 280px;')}${controls}<span style="font-size: 14px; color: #97A5AA">${note}</span></div>
        ${table}
      </div>
`)
}

const iteration = () => ({
  'Choix-A1.dc.html': arsenal.board({
    title: 'Itération 1 · A, pour chaque ligne de Ton équipement',
    lede: [
      "Chaque ligne ouvre sa liste, titrée par ce qu'elle choisit, avec «&nbsp;Aucun…&nbsp;» en tête pour la vider. Ce que tu tiens se choisit parmi les boucliers, les armes et le reste (les pastilles de l'Arsenal), sans «&nbsp;Aucun&nbsp;»&nbsp;: les mains nues sont dans «&nbsp;Autres&nbsp;». «&nbsp;Ajouter une boisson&nbsp;» ne propose que celles que tu n'emportes pas encore&nbsp;; une boisson déjà emportée s'échange contre une autre ou se retire. Ce qui est choisi garde le niveau de ce qu'il remplace, dans sa limite.",
      "La première arrivée fait pareil, sous sa question 2&nbsp;: le choix remplace la question, la flèche y revient, et «&nbsp;Passer&nbsp;» reste là.",
    ],
    items: [
      phoneFrame('1 · EN MAIN', picker({ title: 'Ce que tu tiens', count: `${data.counts.shields + data.counts.weapons + data.counts.others}`, search: 'Chercher ce que tu tiens', pills: handPills(), note: 'Au niveau 1, avec ta compétence Blocage 25&nbsp;; ce que tu choisis garde ton N3, s’il y monte.', rows: shieldCards() })),
      phoneFrame('2 · BIBELOT', picker({ title: 'Ton bibelot', count: `${data.counts.trinket} bibelots`, search: 'Chercher un bibelot', note: 'Un seul à la fois&nbsp;: celui que tu choisis remplace ta Broche en fer.', rows: `${noneRow('Aucun bibelot', 'retire celui que tu emportes')}\n        ${effectCards(data.effects.trinket)}` })),
      phoneFrame('3 · «&nbsp;AJOUTER UNE BOISSON&nbsp;»', picker({ title: 'Une boisson de plus', count: `${drinks.length - 1} sur ${drinks.length}`, search: 'Chercher une boisson', note: `Ton ${frost.name} est déjà emporté&nbsp;: une boisson ne se prend qu'une fois.`, rows: effectCards(drinks.filter((e) => !e.carried)) })),
      phoneFrame('4 · UNE BOISSON EMPORTÉE', picker({ title: 'Ta boisson', count: `${drinks.length} boissons`, search: 'Chercher une boisson', note: `Choisis-en une autre pour remplacer ton ${frost.name}, ou retire-le.`, rows: `${noneRow('Retirer cette boisson', frost.name)}\n        ${effectCards(drinks)}` })),
      phoneFrame('5 · PREMIÈRE ARRIVÉE · CASQUE', arrivalPicker({ title: 'Ton casque', count: `${data.counts.helmet} casques`, search: 'Chercher un casque', note: 'Au niveau 1&nbsp;; celui que tu choisis garde ton N2, s’il y monte.', rows: `${noneRow('Aucun casque', 'retire celui que tu portes')}\n        ${bronzeHelmets()}` })),
    ],
    width: phones(5),
    height: H,
  }),
  'Choix-A1-Desktop-1.dc.html': arsenal.desktopBoard(
    'Choix A · itération 1 — ce que tu tiens',
    deskPicker({
      title: 'Ce que tu tiens',
      search: 'Chercher ce que tu tiens',
      controls: handPills(true),
      note: 'Au niveau 1, avec ta compétence Blocage 25&nbsp;; ce que tu choisis garde ton N3, s’il y monte.',
      table: chooseTable(arsenal.blockerTable('shields'), null),
    }),
  ),
  'Choix-A1-Desktop-2.dc.html': arsenal.desktopBoard(
    'Choix A · itération 1 — ton bibelot',
    deskPicker({
      title: 'Ton bibelot',
      search: 'Chercher un bibelot',
      note: 'Un seul à la fois&nbsp;: celui que tu choisis remplace ta Broche en fer.',
      table: chooseTable(arsenal.effectTable('trinket'), ['Aucun bibelot', 'retire celui que tu emportes'], 'minmax(0, 1.8fr) minmax(0, 0.7fr) minmax(0, 1.4fr) minmax(0, 3.2fr) 130px'),
    }),
  ),
})

// ---- The boards. ----

const SHARED =
  "La même scène dans les trois&nbsp;: Ton équipement des maquettes (fer et cape de loup N3, armure 45), où l'on change de cape pour la Cape des cendres (armure 58&nbsp;: 14 + 14 + 14 + 16, chiffres du moteur). Ce qui se tient, les autres pièces, le bibelot, le pouvoir et les boissons suivent le même chemin."

const tracks = () => ({
  'Choix-A.dc.html': arsenal.board({
    title: 'A · La liste de l’Arsenal, dans Ton équipement',
    lede: [
      "Toucher une ligne (En main, une pièce, le bibelot, le pouvoir, une boisson ou «&nbsp;Ajouter une boisson&nbsp;») remplace Ton équipement par la liste de l'Arsenal pour cette ligne, le temps du choix&nbsp;: les mêmes cartes, une recherche, ce que tu portes en tête, «&nbsp;Aucune cape&nbsp;» au début pour la retirer. En toucher une revient à Ton équipement avec elle, au niveau de celle qu'elle remplace&nbsp;; la flèche revient sans rien changer. Rien ne quitte la fenêtre&nbsp;: rien n'est enregistré avant «&nbsp;Valider&nbsp;», et la première arrivée fait pareil.",
      SHARED,
    ],
    items: [
      phoneFrame('1 · TON ÉQUIPEMENT · CHAQUE LIGNE OUVRE SA LISTE', rowsLead(DIALOG, RIGHT)),
      phoneFrame('2 · TA CAPE · LA LISTE DE L’ARSENAL', pickerPhone()),
      phoneFrame('3 · DE RETOUR, AVEC LA CAPE DES CENDRES', withAfter(rowsLead(DIALOG, RIGHT, { cape: 'Cape des cendres' }))),
    ],
    width: phones(3),
    height: H,
  }),
  'Choix-A-Desktop.dc.html': arsenal.desktopBoard('Choix A — ta cape, dans Ton équipement', deskA()),
  'Choix-B.dc.html': arsenal.board({
    title: 'B · Aller dans l’Arsenal pour choisir',
    lede: [
      "Toucher une ligne ferme Ton équipement et ouvre l'Arsenal sur sa catégorie, en mode choix&nbsp;: un bandeau dit pour quoi tu choisis, «&nbsp;Annuler&nbsp;» revient sans rien changer. Tout l'Arsenal reste à portée (recherche, familles, catégories)&nbsp;; ce que tu touches revient dans Ton équipement à sa place, et ce que tu y avais commencé t'y attend. «&nbsp;Sans cape&nbsp;» en tête de liste la retire. À la première arrivée, on ne quitte pas les questions&nbsp;: les listes d'aujourd'hui y restent.",
      SHARED,
    ],
    items: [
      phoneFrame('1 · TON ÉQUIPEMENT · CHAQUE LIGNE MÈNE À L’ARSENAL', rowsLead(DIALOG, ARSENAL_CUE)),
      choosingPhone('2 · L’ARSENAL, POUR TA CAPE', 'cape', 'Choisis ta cape', 'pour Ton équipement · elle garde ton N3', noneRow('Sans cape', 'retire celle que tu portes')),
      choosingPhone('3 · «&nbsp;AJOUTER UNE BOISSON&nbsp;»', 'consumable', 'Ajoute une boisson', 'pour Ton équipement', ''),
    ],
    width: phones(3),
    height: H,
  }),
  'Choix-B-Desktop.dc.html': arsenal.desktopBoard('Choix B — l’Arsenal, pour ta cape', deskB()),
  'Choix-C.dc.html': arsenal.board({
    title: 'C · Des listes plus parlantes, sur place',
    lede: [
      "Ton équipement garde ses lignes&nbsp;; en toucher une ouvre, au lieu de la liste du système, une liste qui dit ce que vaut chaque choix&nbsp;: son armure au niveau 1 et ce qu'il gagne par niveau, ses résistances et faiblesses, son ensemble, coché ce que tu portes, «&nbsp;Aucune&nbsp;» en tête pour retirer. En bas, «&nbsp;Comparer dans l'Arsenal&nbsp;» pour tout voir. Le plus léger&nbsp;: on ne quitte jamais Ton équipement, mais la liste ne se trie ni ne se cherche. Sur desktop, elle se déplie sous la ligne.",
      SHARED,
    ],
    items: [
      phoneFrame('1 · TON ÉQUIPEMENT · COMME AUJOURD’HUI', DIALOG),
      phoneFrame('2 · LA LISTE DE LA CAPE', DIALOG, sheetC),
    ],
    width: phones(2),
    height: H,
  }),
  'Choix-C-Desktop.dc.html': arsenal.desktopBoard('Choix C — la liste de la cape, dépliée', deskC()),
})

// Imported by origine.mjs, it writes nothing. Run directly, it writes the tracks and iteration 1, from Origine boards
// that still hold their lists: once origine.mjs has carried the approved iteration into Origine, they no longer do.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  for (const [file, html] of Object.entries({ ...tracks(), ...iteration() })) {
    if (html.includes('{{')) throw new Error(`${file}: a hole is left`)
    writeFileSync(new URL(file, PROJECT), html, 'utf8')
    console.log(file, html.length)
  }
}

export {
  PROJECT,
  read,
  take,
  swap,
  data,
  BACK,
  RIGHT,
  CHEVRON,
  noneRow,
  picker,
  arrivalPicker,
  deskPicker,
  chooseTable,
  handPills,
  shieldCards,
  capeCards,
  effectCards,
  bronzeHelmets,
  drinks,
  frost,
  searchBox,
}
