// The « Arsenal · pistes » page (#67): three ways of reaching the armor pieces, powers, trinkets and drinks
// beside what blocks, each on two phones (three for C) and a desktop. The lists come from out/arsenal.json.
// Run from this folder after data.mts: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const PROJECT = new URL('../../canvas/project/', import.meta.url)
const read = (file) => readFileSync(new URL(file, PROJECT), 'utf8')
const data = JSON.parse(readFileSync(new URL('./out/arsenal.json', import.meta.url), 'utf8'))

// The app's chrome, taken from the Origine boards.
const phoneSrc = read('Arsenal.dc.html')
const deskSrc = read('Desktop-Arsenal.dc.html')
const take = (src, re, what) => {
  const m = src.match(re)
  if (!m) throw new Error(`${what} not found`)
  return m[1] ?? m[0]
}
const HEAD = take(phoneSrc, /^[^]*?<\/helmet>/, 'head').replace(
  '</style>',
  'input{font:inherit;color:inherit}\ninput::placeholder{color:#7D8B91}\ninput[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}\nmark{background:transparent;color:#8EBDE3;font-weight:500}\n</style>',
)
const PHONE_HEADER = take(phoneSrc, /  <header style="display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px">[^]*?\n  <\/header>/, 'phone header')
  .replace(/ onClick="\{\{ \w+ \}\}"/g, '')
  .replace('{{ menuExpanded }}', 'false')
  .replace('{{ menuBorder }}', '#2C383D')
  .replace('{{ menuBackground }}', 'transparent')
const PHONE_NAV = take(phoneSrc, /  <nav aria-label="Navigation"[^]*?\n  <\/nav>/, 'phone nav')
const DESK_NAV = take(deskSrc, /  <nav aria-label="Navigation principale"[^]*?\n  <\/nav>/, 'desktop nav')
const CHEVRON = take(phoneSrc, /<span style="flex: 1"><\/span>\s*(<svg[^]*?<\/svg>)/, 'chevron')
// Written out: the Origine boards they came from no longer hold them once --origine has run.
const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>'
const MINUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"></path></svg>'
const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>'
const DOWN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#97A5AA" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M6 9l6 6 6-6"></path></svg>'
const ICONS = {
  blunt: 'M13 3l8 8-4 4-8-8zM13 11l-9 9',
  slash: 'M4 14L14 4M7 19L19 7M13 20l7-7',
  pierce: 'M20 4l-7 3 4 4zM15 9L4 20',
  fire: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z',
  frost: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  lightning: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  poison: 'M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z',
  spirit: 'M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01',
}

const MONO = "font-family: 'IBM Plex Mono', monospace"
const CAPTION = 'font-size: 11px; letter-spacing: 0.08em; color: #97A5AA'
// A line of its own starts with a capital (the owner's edit, 2026-10-31).
const upper = (text) => text.charAt(0).toUpperCase() + text.slice(1)
const tag = (text) => `<span style="flex: none; ${MONO}; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #8EBDE3; color: #8EBDE3">${text}</span>`

// The categories, by the three families of Ton équipement; what blocks is not only in the left hand (a weapon blocks
// too), so its family names what is held.
const FAMILIES = [
  { id: 'hand', short: 'En main', long: 'En main', caption: 'EN MAIN', items: [['shields', 'Boucliers'], ['weapons', 'Armes'], ['others', 'Autres']] },
  { id: 'armor', short: 'Armures', long: "Pièces d'armures", caption: "PIÈCES D'ARMURES", items: [['helmet', 'Casques'], ['chest', 'Plastrons'], ['legs', 'Jambières'], ['cape', 'Capes']] },
  { id: 'carry', short: 'À emporter', long: 'Ce que tu emportes', caption: 'CE QUE TU EMPORTES', items: [['power', 'Pouvoirs'], ['trinket', 'Bibelots'], ['consumable', 'Boissons']] },
]
const familyOf = (category) => FAMILIES.find((f) => f.items.some(([id]) => id === category))
const labelOf = (category) => familyOf(category).items.find(([id]) => id === category)[1]
const ITEM = { shields: 'BOUCLIER', weapons: 'ARME', others: 'OBJET', helmet: 'CASQUE', chest: 'PLASTRON', legs: 'JAMBIÈRES', cape: 'CAPE', power: 'POUVOIR', trinket: 'BIBELOT', consumable: 'BOISSON' }

// ---- Shared content: an armor piece and an effect, on a phone and on a desktop. ----

const chip = (c) =>
  `<li style="padding: 3px 7px; border: 1px solid ${c.weak ? '#97A5AA' : '#2C383D'}; border-radius: 3px; color: ${c.weak ? '#E2E8E8' : '#97A5AA'}; white-space: nowrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12" style="vertical-align: -2px; margin-right: 5px"><path d="${ICONS[c.type]}"></path></svg>${c.text}<span style="font-weight: 500">${c.strong}</span></li>`
const chips = (list) =>
  `<ul aria-label="Résistances et faiblesses" style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; ${MONO}; font-size: 11px; line-height: 14px; text-transform: uppercase">${list.map(chip).join('')}</ul>`
const setLine = (p) => `Ensemble ${p.set.name}, ${p.set.size} pièces&nbsp;: ${p.set.changes}`
const stat = (label, value, note = '', big = false) =>
  `<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; letter-spacing: 0.08em; color: #97A5AA">${label}</span><span style="${MONO}; font-size: ${big ? 18 : 15}px; ${big ? 'font-weight: 500' : 'padding-top: 2px'}">${value}${note ? ` <span style="font-size: 11px; font-weight: 400; color: #7D8B91">${note}</span>` : ''}</span></span>`

function pieceCard(p) {
  const extra = [p.set ? setLine(p) : null, p.dodge ? `${p.dodge[0].toUpperCase()}${p.dodge.slice(1)}` : null].filter(Boolean)
  return `<a href="#" aria-label="${p.plain ?? p.name}${p.equipped ? ', équipé' : ''}. Ouvrir dans Ton équipement." style="display: flex; flex-direction: column; gap: 7px; padding: 10px 16px; margin: 0 -16px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none${p.equipped ? '; background: #1D3344' : ''}">
          <span style="display: flex; align-items: center; gap: 8px; min-width: 0"><span style="min-width: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${p.name}</span>${p.equipped ? tag('ÉQUIPÉ') : ''}<span style="flex: 1"></span>${CHEVRON}</span>
          <span style="display: flex; gap: 22px">${stat('ARMURE', p.armorText, p.stopsAt ?? '', true)}${stat('PAR NIVEAU', p.perLevel)}</span>${p.chips.length ? `\n          ${chips(p.chips)}` : ''}${extra.map((line) => `\n          <span style="font-size: 12px; line-height: 1.4; color: #97A5AA">${line}</span>`).join('')}
        </a>`
}

function effectCard(e) {
  const when = [e.duration, e.trigger, e.cooldown].filter(Boolean).join(' · ').toUpperCase()
  return `<a href="#" aria-label="${e.plain ?? e.name}${e.carried ? ', emporté' : ''}. Ouvrir dans Ton équipement." style="display: flex; flex-direction: column; gap: 5px; padding: 11px 16px 12px; margin: 0 -16px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none${e.carried ? '; background: #1D3344' : ''}">
          <span style="display: flex; align-items: center; gap: 8px; min-width: 0"><span style="min-width: 0; font-size: 15px">${e.name}</span>${e.carried ? tag('EMPORTÉ') : ''}<span style="flex: 1"></span>${CHEVRON}</span>
          <span style="${MONO}; font-size: 11px; line-height: 14px; color: #97A5AA">${when}</span>
          <span style="display: flex; flex-direction: column; font-size: 13px; line-height: 1.45">${e.changes.map((change) => `<span>${upper(change)}</span>`).join('')}</span>
        </a>`
}

// What blocks, as the Origine Arsenal draws it.
function blockerCard(b) {
  const small = (label, value, note = '', faintValue = false) =>
    `<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; letter-spacing: 0.08em; color: #97A5AA">${label}</span><span style="${MONO}; font-size: 15px; padding-top: 2px${faintValue ? '; color: #7D8B91' : ''}">${value}</span>${note ? `<span style="${MONO}; font-size: 10px; color: #7D8B91">${note}</span>` : ''}</span>`
  return `<a href="#" aria-label="${b.plain ?? b.name}${b.equipped ? ', équipé' : ''}. Ouvrir dans Ton équipement." style="display: flex; flex-direction: column; gap: 8px; padding: 10px 16px; margin: 0 -16px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none${b.equipped ? '; background: #1D3344' : ''}">
          <span style="display: flex; align-items: center; gap: 8px; min-width: 0"><span style="font-size: 15px">${b.name}</span>${b.type ? `<span style="${MONO}; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #2C383D; color: #97A5AA">${b.type}</span>` : ''}${b.equipped ? tag('ÉQUIPÉ') : ''}<span style="flex: 1"></span>${CHEVRON}</span>
          <span style="display: flex; gap: 32px">
            <span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; letter-spacing: 0.08em; color: #97A5AA">VD</span><span style="${MONO}; font-size: 18px; font-weight: 500">${b.power}</span>${b.stopsAt ? `<span style="${MONO}; font-size: 10px; color: #7D8B91">${b.stopsAt}</span>` : ''}</span>
            ${small('EN PARADE', b.parry, b.parryNote, b.parry === '—')}
          </span>
        </a>`
}

const isBlocker = (category) => category in data.blockers
const isArmor = (category) => category in data.pieces
const rowsOf = (category) => (isBlocker(category) ? data.blockers[category] : isArmor(category) ? data.pieces[category] : data.effects[category])
const cardOf = (category) => (isBlocker(category) ? blockerCard : isArmor(category) ? pieceCard : effectCard)

function stepper(height) {
  return `<span style="${CAPTION}">NIVEAU</span>
      <div role="group" aria-label="Niveau d'amélioration" style="display: flex; align-items: center; border: 1px solid #2C383D; border-radius: 4px">
        <button type="button" aria-label="Niveau inférieur" style="width: ${height}px; height: ${height}px; display: flex; align-items: center; justify-content: center">${MINUS}</button>
        <span style="min-width: 36px; text-align: center; ${MONO}; font-size: 13px">N${data.level}</span>
        <button type="button" aria-label="Niveau supérieur" style="width: ${height}px; height: ${height}px; display: flex; align-items: center; justify-content: center">${PLUS}</button>
      </div>`
}

function phoneToolbar(category) {
  if (isBlocker(category))
    return `    <div style="display: flex; align-items: center; gap: 10px">
      <span style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 12px; line-height: 1.35; color: #97A5AA"><span>Chiffres calculés avec ta compétence Blocage <span style="${MONO}; color: #E2E8E8">${data.skill}</span></span><span style="color: #7D8B91">Triés par VD</span></span>
      ${stepper(44)}
    </div>`
  if (isArmor(category))
    return `    <div style="display: flex; align-items: center; gap: 10px">
      <span style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 12px; line-height: 1.35; color: #97A5AA"><span>Armure au niveau choisi</span><span style="color: #7D8B91">Triées par armure</span></span>
      ${stepper(44)}
    </div>`
  return `    <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; line-height: 1.35; color: #97A5AA"><span>Seulement ce qui change un combat, lu dans le jeu</span><span style="color: #7D8B91">Touche-en un pour l'emporter</span></div>`
}

/** A phone of the Arsenal: the track's way to the categories, then the list. */
function phone({ caption, nav, category, overlay = '', search = null, bare = false }) {
  const rows = search ? [] : rowsOf(category)
  return `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; color: #97A5AA">${caption}</span>
<div style="position: relative; flex: none; width: 390px; height: 844px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 8px; overflow: hidden; background: #0D1214; display: flex; flex-direction: column">
${PHONE_HEADER}
  <main style="flex: 1; padding: 4px 16px 0; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: hidden">
${nav}
${search ? searchToolbar(search) : bare ? '' : phoneToolbar(category)}
    ${search ? phoneResults(search) : `<div aria-label="${labelOf(category)}" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid #2C383D">
        ${rows.map(cardOf(category)).join('\n        ')}
    </div>`}
  </main>
${PHONE_NAV}${overlay}
</div>
</div>`
}

// ---- Desktop tables. ----

const HEAD_ROW = `display: grid; gap: 16px; align-items: center; padding: 12px 20px; background: #151C1F; border-bottom: 1px solid #2C383D; white-space: nowrap; ${CAPTION}`
const ROW = 'display: grid; gap: 16px; align-items: center; min-height: 52px; padding: 10px 20px; box-sizing: border-box; border-bottom: 1px solid #1F2A2E; font-size: 15px'
const action = (done, doneText, verb, name) =>
  done
    ? `<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #8EBDE3">${CHECK}${doneText}</span>`
    : `<a href="#" aria-label="${verb}&nbsp;: ${name}" style="display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; font-size: 13px; color: #E2E8E8; text-decoration: none">${verb}</a>`
const faint = (text) => `<span style="color: #7D8B91">${text}</span>`

function armorTable(category, list = data.pieces[category]) {
  const cols = 'grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 2.2fr) minmax(0, 1.8fr) 110px'
  const rows = list.map(
    (p) => `<div role="row" style="${ROW}; ${cols}${p.equipped ? '; background: #1D3344' : ''}">
            <span role="cell" style="display: flex; align-items: center; gap: 10px; min-width: 0"><span>${p.name}</span>${p.equipped ? tag('ÉQUIPÉ') : ''}</span>
            <span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 17px; font-weight: 500">${p.armorText}${p.stopsAt ? ` <span style="font-size: 11px; font-weight: 400; color: #7D8B91">${p.stopsAt}</span>` : ''}</span>
            <span role="cell" style="text-align: right; ${MONO}; font-size: 15px">${p.perLevel}</span>
            <span role="cell">${p.chips.length ? chips(p.chips) : faint('—')}${p.dodge ? `<span style="display: block; margin-top: 4px; font-size: 12px; color: #97A5AA">${p.dodge[0].toUpperCase()}${p.dodge.slice(1)}</span>` : ''}</span>
            <span role="cell" style="font-size: 13px; line-height: 1.4">${p.set ? `${p.set.name} <span style="color: #7D8B91">· ${p.set.size} pièces</span><span style="display: block; font-size: 12px; color: #97A5AA">${upper(p.set.changes)}</span>` : faint('—')}</span>
            <span role="cell" style="display: flex; justify-content: flex-end">${action(p.equipped, 'Équipé', 'Équiper', p.plain ?? p.name)}</span>
          </div>`,
  )
  return `<div role="table" aria-label="${labelOf(category)}" style="flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
        <div role="row" style="${HEAD_ROW}; ${cols}">
          <span role="columnheader">${ITEM[category]}</span><span role="columnheader" style="text-align: right">ARMURE ↓</span><span role="columnheader" style="text-align: right">PAR NIVEAU</span><span role="columnheader">RÉSISTANCES ET FAIBLESSES</span><span role="columnheader">ENSEMBLE</span><span role="columnheader"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Action</span></span>
        </div>
        <div style="flex: 1; min-height: 0; overflow-y: auto">
          ${rows.join('\n          ')}
        </div>
      </div>`
}

function effectTable(category, list = data.effects[category]) {
  const extra = category === 'power' ? ['RECHARGE', 'cooldown'] : category === 'trinket' ? ['SE DÉCLENCHE', 'trigger'] : null
  const cols = `grid-template-columns: minmax(0, 1.8fr) minmax(0, 0.7fr)${extra ? ' minmax(0, 1.4fr)' : ''} minmax(0, 3.2fr) 130px`
  const changes = category === 'consumable' ? "CE QU'ELLE CHANGE" : "CE QU'IL CHANGE"
  const rows = list.map(
    (e) => `<div role="row" style="${ROW}; ${cols}${e.carried ? '; background: #1D3344' : ''}">
            <span role="cell" style="display: flex; align-items: center; gap: 10px; min-width: 0"><span>${e.name}</span>${e.carried ? tag('EMPORTÉ') : ''}</span>
            <span role="cell" style="${MONO}; font-size: 14px">${e.duration}</span>${extra ? `\n            <span role="cell" style="${MONO}; font-size: 14px">${e[extra[1]].replace(/^recharge /, '')}</span>` : ''}
            <span role="cell" style="display: flex; flex-direction: column; font-size: 14px; line-height: 1.45">${e.changes.map((change) => `<span>${upper(change)}</span>`).join('')}</span>
            <span role="cell" style="display: flex; justify-content: flex-end">${action(e.carried, 'Emporté', 'Emporter', e.plain ?? e.name)}</span>
          </div>`,
  )
  return `<div role="table" aria-label="${labelOf(category)}" style="flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
        <div role="row" style="${HEAD_ROW}; ${cols}">
          <span role="columnheader">${ITEM[category]}</span><span role="columnheader">DURÉE</span>${extra ? `<span role="columnheader">${extra[0]}</span>` : ''}<span role="columnheader">${changes}</span><span role="columnheader"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Action</span></span>
        </div>
        <div style="flex: 1; min-height: 0; overflow-y: auto">
          ${rows.join('\n          ')}
        </div>
      </div>`
}

function blockerTable(category, list = data.blockers[category]) {
  const shields = category === 'shields'
  const cols = `grid-template-columns: minmax(0, 2.4fr)${shields ? ' minmax(0, 0.8fr)' : ''} minmax(0, 1fr) minmax(0, 1.4fr) 110px`
  const rows = list.map(
    (b) => `<div role="row" style="${ROW}; ${cols}${b.equipped ? '; background: #1D3344' : ''}">
            <span role="cell" style="display: flex; align-items: center; gap: 10px; min-width: 0"><span>${b.name}</span>${b.equipped ? tag('ÉQUIPÉ') : ''}</span>${shields ? `\n            <span role="cell" style="${MONO}; font-size: 12px; color: #97A5AA">${b.type ?? ''}</span>` : ''}
            <span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 17px; font-weight: 500">${b.power}${b.stopsAt ? ` <span style="font-size: 11px; font-weight: 400; color: #7D8B91">${b.stopsAt}</span>` : ''}</span>
            <span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 15px${b.parry === '—' ? '; color: #7D8B91' : ''}">${b.parry} <span style="font-size: 11px; color: #7D8B91">${b.parryNote}</span></span>
            <span role="cell" style="display: flex; justify-content: flex-end">${action(b.equipped, 'Équipé', 'Équiper', b.plain ?? b.name)}</span>
          </div>`,
  )
  return `<div role="table" aria-label="${labelOf(category)}" style="flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
        <div role="row" style="${HEAD_ROW}; ${cols}">
          <span role="columnheader">${ITEM[category]}</span>${shields ? '<span role="columnheader">TYPE</span>' : ''}<span role="columnheader" style="text-align: right">VD ↓</span><span role="columnheader" style="text-align: right">EN PARADE</span><span role="columnheader"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Action</span></span>
        </div>
        <div style="flex: 1; min-height: 0; overflow-y: auto">
          ${rows.join('\n          ')}
        </div>
      </div>`
}

const intro = (category) =>
  isBlocker(category)
    ? `Chiffres calculés avec ta compétence Blocage <span style="${MONO}; color: #E2E8E8">${data.skill}</span>, au niveau d'amélioration choisi.`
    : isArmor(category)
      ? `Armure au niveau d'amélioration choisi&nbsp;; chaque pièce s'arrête à son niveau max.`
      : `Seulement ce qui change un combat, lu dans le jeu. L'emporter l'ajoute à Ton équipement&nbsp;; tu l'allumes sur la fiche d'une créature ou dans la Simulation.`
const deskTools = (category) =>
  isBlocker(category)
    ? `<span style="flex: 1"></span>
      ${stepper(36)}
      <label for="a-sort" style="${CAPTION}">TRIER PAR</label>
      <select id="a-sort" style="height: 36px; padding: 0 10px; background: #151C1F; border: 1px solid #2C383D; border-radius: 4px; font-size: 14px"><option>VD</option><option>En parade</option></select>`
    : isArmor(category)
      ? `<span style="flex: 1"></span>
      ${stepper(36)}`
      : ''

/** A desktop of the Arsenal: the sidebar, then the page with the track's way to the categories. */
function desktop({ nav, category, aside = '', content = null, lede = null }) {
  const table = content ?? (isBlocker(category) ? blockerTable(category) : isArmor(category) ? armorTable(category) : effectTable(category))
  const page = `<header style="display: flex; flex-direction: column; gap: 4px">
      <h1 style="margin: 0; font-size: 26px; font-weight: 500">Arsenal</h1>
      <p style="margin: 0; font-size: 15px; color: #97A5AA">${lede ?? intro(category)}</p>
    </header>
    ${nav}
    ${table}`
  const main = aside
    ? `<main style="flex: 999 1 560px; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 32px; display: flex; gap: 28px">
    ${aside}
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px">
    ${page}
    </div>
  </main>`
    : `<main style="flex: 999 1 560px; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 32px; display: flex; flex-direction: column; gap: 20px">
    ${page}
  </main>`
  return `<div style="position: relative; width: 1440px; height: 900px; box-sizing: border-box; display: flex; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; overflow: hidden">
${DESK_NAV}

  ${main}
</div>`
}

// ---- Track A: the family, then its categories. ----

const segment = (label, on, first, size) =>
  `<button type="button" aria-pressed="${on}" style="${size}; font-size: 14px; ${on ? 'background: #8EBDE3; color: #0D1214; font-weight: 500' : 'color: #97A5AA'}${first ? '' : '; border-left: 1px solid #2C383D'}">${label}</button>`
const pill = (label, on, size) =>
  `<button type="button" aria-pressed="${on}" style="${size}; padding: 0 12px; border-radius: 18px; font-size: 13px; white-space: nowrap; border: 1px solid ${on ? '#8EBDE3' : '#2C383D'}; ${on ? 'color: #8EBDE3; background: #1D3344' : 'color: #97A5AA'}">${label}</button>`

function navA(category, desktopSize) {
  const family = familyOf(category)
  const families = FAMILIES.map((f, i) => segment(desktopSize ? f.long : f.short, f === family, i === 0, desktopSize ? 'padding: 0 16px; height: 36px' : 'flex: 1; height: 44px')).join('')
  const items = family.items.map(([id, label]) => pill(label, id === category, desktopSize ? 'height: 32px' : 'flex: 1; height: 36px')).join('')
  if (!desktopSize)
    return `    <div role="group" aria-label="Famille" style="display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">${families}</div>
    <div role="group" aria-label="Catégorie" style="display: flex; gap: 6px">${items}</div>`
  return `<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap">
      <div role="group" aria-label="Famille" style="display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">${families}</div>
      <div role="group" aria-label="Catégorie" style="display: flex; gap: 6px">${items}</div>
      ${deskTools(category)}
    </div>`
}

// ---- Track B: one row of every category, by family, that scrolls. ----

function navB(category, desktopSize, shift = 0) {
  const groups = FAMILIES.map((f) => {
    const items = desktopSize
      ? `<div style="display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">${f.items.map(([id, label], i) => segment(label, id === category, i === 0, 'padding: 0 14px; height: 36px')).join('')}</div>`
      : `<div style="display: flex; gap: 6px">${f.items.map(([id, label]) => pill(label, id === category, 'flex: none; height: 36px')).join('')}</div>`
    return `<div role="group" aria-label="${f.long}" style="flex: none; display: flex; flex-direction: column; gap: 5px"><span style="font-size: 10px; letter-spacing: 0.08em; color: #7D8B91">${f.caption}</span>${items}</div>`
  })
  if (!desktopSize)
    return `    <div style="margin: 0 -16px; overflow: hidden; -webkit-mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%); mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%)"><div aria-label="Catégorie" style="display: flex; gap: 16px; padding: 0 16px; transform: translateX(-${shift}px)">${groups.join('')}</div></div>`
  return `<div aria-label="Catégorie" style="display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap">${groups.join('')}${deskTools(category)}</div>`
}

// ---- Track C: one line says where you are; it opens every category. ----

function pickerC(category) {
  const family = familyOf(category)
  return `    <button type="button" aria-haspopup="dialog" style="display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 12px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; background: #151C1F; text-align: left">
      <span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; letter-spacing: 0.08em; color: #97A5AA">${family.caption}</span><span style="font-size: 15px">${labelOf(category)} <span style="${MONO}; font-size: 12px; color: #7D8B91">${data.counts[category]}</span></span></span>
      ${DOWN}
    </button>`
}

function listC(category, desktopSize, hits = null) {
  return FAMILIES.map(
    (f) => `<div role="group" aria-label="${f.long}" style="display: flex; flex-direction: column">
        <span style="padding: ${desktopSize ? '0 10px 4px' : '6px 14px 4px'}; font-size: 10px; letter-spacing: 0.08em; color: #7D8B91">${f.caption}</span>
        ${f.items
          .map(([id, label]) => {
            const on = id === category
            const count = hits ? (hits[id] ?? 0) : data.counts[id]
            const none = hits && !count
            return `<a href="#"${on ? ' aria-current="true"' : ''} style="display: flex; align-items: center; gap: 10px; height: ${desktopSize ? 36 : 44}px; padding: 0 ${desktopSize ? 10 : 14}px; border-radius: ${desktopSize ? 6 : 0}px; font-size: ${desktopSize ? 14 : 15}px; text-decoration: none; ${on ? 'background: #1D3344; color: #8EBDE3' : none ? 'color: #7D8B91' : 'color: #E2E8E8'}"><span style="flex: 1">${label}</span><span style="${MONO}; font-size: 12px; color: ${on || (hits && count) ? '#8EBDE3' : '#7D8B91'}">${count}</span>${on && !desktopSize ? CHECK : ''}</a>`
          })
          .join('\n        ')}
      </div>`,
  ).join('\n      ')
}

const sheetC = (category) => `
  <div style="position: absolute; inset: 0; background: rgba(4, 6, 7, 0.72)"></div>
  <div role="dialog" aria-modal="true" aria-label="Catégorie" style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px 4px 24px; border-top: 1px solid #2C383D; border-radius: 14px 14px 0 0; background: #151C1F">
      <span aria-hidden="true" style="align-self: center; width: 36px; height: 4px; border-radius: 2px; background: #2C383D"></span>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 4px">
        <span style="font-size: 17px; font-weight: 500">Catégorie</span>
        <span style="font-size: 12px; color: #7D8B91">Ce que l'Arsenal compare</span>
      </div>
      ${listC(category, false)}
  </div>`

// ---- The boards. ----

function board({ title, lede, items, width, height }) {
  return `${HEAD.replace(/<title>[^<]*<\/title>/, `<title>${title.replace(/<[^>]+>/g, '')}</title>`)}
<div style="width: ${width}px; height: ${height}px; box-sizing: border-box; padding: 40px; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 28px">
  <header style="display: flex; flex-direction: column; gap: 6px; max-width: 1240px">
    <h1 style="margin: 0; font-size: 26px; line-height: 1.2; font-weight: 500">${title}</h1>
    ${lede.map((p) => `<p style="margin: 0; font-size: 15px; line-height: 1.5; color: #97A5AA">${p}</p>`).join('\n    ')}
  </header>
  <div style="display: flex; gap: 32px; align-items: flex-start">
${items.join('\n')}
  </div>
</div>
${TAIL(width, height)}`
}
const TAIL = (width, height) => `</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${width},"height":${height}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`
function desktopBoard(title, body) {
  return `${HEAD.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)}
${body}
${TAIL(1440, 900)}`
}

const SHARED =
  "Le contenu est le même dans les trois pistes, seule la façon d'y aller change&nbsp;; les catégories montrées varient d'une piste à l'autre pour tout couvrir. Une pièce&nbsp;: son armure au niveau choisi (et où elle s'arrête), ce qu'elle gagne par niveau, ses résistances et faiblesses, l'ensemble dont le bonus change un combat. Un effet&nbsp;: sa durée, ce qui le déclenche ou sa recharge, ce qu'il change. Toucher l'un ou l'autre ouvre Ton équipement avec lui, comme un bouclier aujourd'hui."
const phoneWidth = (n) => 80 + n * 390 + (n - 1) * 32
const BOARD_H = 1220

const boards = {
  'Arsenal-A.dc.html': board({
    title: 'A · Deux étages&nbsp;: la famille, puis sa catégorie',
    lede: [
      "En haut, les trois familles de Ton équipement (Main gauche, Armures, À emporter)&nbsp;; juste dessous, leurs catégories. Deux gestes au plus pour changer de liste, et les familles restent toutes visibles. Sur desktop, la même chose en une ligne, les noms en entier.",
      SHARED,
    ],
    items: [
      phone({ caption: '1 · PIÈCES D’ARMURES · CASQUES', nav: navA('helmet'), category: 'helmet' }),
      phone({ caption: '2 · À EMPORTER · POUVOIRS', nav: navA('power'), category: 'power' }),
    ],
    width: phoneWidth(2),
    height: BOARD_H,
  }),
  'Arsenal-A-Desktop.dc.html': desktopBoard('Arsenal A — plastrons', desktop({ nav: navA('chest', true), category: 'chest' })),
  'Arsenal-B.dc.html': board({
    title: 'B · Une seule rangée qui défile',
    lede: [
      "Les dix catégories sur une rangée, rangées sous le nom de leur famille, qui défile au doigt. Un seul geste pour changer de liste, mais ce qui dépasse de l'écran se devine seulement (le fondu à droite). Le téléphone 2 la montre défilée jusqu'aux bibelots. Sur desktop, tout tient sur une ligne.",
      SHARED,
    ],
    items: [
      phone({ caption: '1 · PIÈCES D’ARMURES · CAPES', nav: navB('cape', false, 190), category: 'cape' }),
      phone({ caption: '2 · CE QUE TU EMPORTES · BIBELOTS', nav: navB('trinket', false, 560), category: 'trinket' }),
    ],
    width: phoneWidth(2),
    height: BOARD_H,
  }),
  'Arsenal-B-Desktop.dc.html': desktopBoard('Arsenal B — bibelots', desktop({ nav: navB('trinket', true), category: 'trinket' })),
  'Arsenal-C.dc.html': board({
    title: 'C · Un sélecteur de catégorie',
    lede: [
      "Une ligne en haut dit où tu es (famille, catégorie, combien il y en a)&nbsp;; la toucher ouvre les dix, par famille. Le plus compact, la liste garde toute la hauteur, mais il faut deux gestes à chaque fois. Sur desktop, les catégories restent ouvertes à gauche de la page.",
      SHARED,
    ],
    items: [
      phone({ caption: '1 · PIÈCES D’ARMURES · JAMBIÈRES', nav: pickerC('legs'), category: 'legs' }),
      phone({ caption: '2 · LE SÉLECTEUR OUVERT', nav: pickerC('legs'), category: 'legs', overlay: sheetC('legs') }),
      phone({ caption: '3 · CE QUE TU EMPORTES · BOISSONS', nav: pickerC('consumable'), category: 'consumable' }),
    ],
    width: phoneWidth(3),
    height: BOARD_H,
  }),
  'Arsenal-C-Desktop.dc.html': desktopBoard(
    'Arsenal C — pouvoirs',
    desktop({
      nav: '',
      category: 'power',
      aside: `<nav aria-label="Catégories de l'Arsenal" style="flex: 0 0 196px; display: flex; flex-direction: column; gap: 16px; padding-top: 74px">
      ${listC('power', true)}
    </nav>`,
    }),
  ),
}

// Iteration 1, after the owner's pick: A on a phone, C on a desktop; the family of what blocks reads « En main » (a
// weapon blocks too, so « Main gauche » was wrong there), and its lists drop the speed and the push-back. The tracks above stay as shown:
// --tracks rewrites them. A search field, as the Bestiaire's, looks through every category at once.

const SEARCH_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" style="flex: none"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>'
const CLOSE = (size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>`
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** The name with what matches the query marked, accents and case aside. */
function marked(name, query) {
  for (let i = 0; i + query.length <= name.length; i++)
    if (fold(name.slice(i, i + query.length)) === fold(query))
      return `${name.slice(0, i)}<mark>${name.slice(i, i + query.length)}</mark>${name.slice(i + query.length)}`
  return name
}
/** The categories that hold a match, in the order of the families, each with its rows. */
const hitsOf = (query) =>
  FAMILIES.flatMap((family) =>
    family.items.map(([id, label]) => ({
      family,
      id,
      label,
      rows: rowsOf(id)
        .filter((row) => fold(row.name).includes(fold(query)))
        .map((row) => ({ ...row, plain: row.name, name: marked(row.name, query) })),
    })),
  ).filter((group) => group.rows.length)
const countOf = (groups) => groups.reduce((sum, group) => sum + group.rows.length, 0)

function searchField(desktopSize, query = null) {
  const height = desktopSize ? 40 : 44
  const size = desktopSize ? 14 : 15
  if (query === null)
    return `<a href="#" aria-label="Rechercher dans tout l'Arsenal" style="flex: none; display: flex; align-items: center; gap: 8px; height: ${height}px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: ${size}px; color: #7D8B91; text-decoration: none; white-space: nowrap; overflow: hidden">${SEARCH_ICON}${desktopSize ? 'Rechercher partout' : 'Objet, pièce ou effet, partout'}</a>`
  return `<label style="flex: none; display: flex; align-items: center; gap: 8px; height: ${height}px; box-sizing: border-box; border: 1px solid #8EBDE3; border-radius: 4px; padding: 0 2px 0 12px">${SEARCH_ICON}<span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Rechercher dans tout l'Arsenal</span><input type="search" value="${query}" aria-controls="a-results" style="flex: 1; min-width: 0; height: ${height - 2}px; background: transparent; border: 0; font-size: ${size}px"><a href="#" aria-label="Effacer la recherche" style="width: ${height - 4}px; height: ${height - 4}px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${CLOSE(desktopSize ? 16 : 18)}</a></label>`
}

const groupHead = (group, underline) =>
  `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: ${underline ? 6 : 8}px${underline ? '; border-bottom: 1px solid #2C383D' : ''}"><h2 id="a-${group.id}" style="margin: 0; font-size: 11px; font-weight: 400; letter-spacing: 0.08em; color: #97A5AA">${group.label.toUpperCase()} · ${group.rows.length}</h2><span style="${MONO}; font-size: 11px; color: #7D8B91">${group.family.caption}</span></div>`

function searchToolbar(query) {
  const groups = hitsOf(query)
  return `    <span style="font-size: 12px; line-height: 1.35; color: #97A5AA">${countOf(groups)} résultats dans ${groups.length} catégories</span>`
}

/** A phone's results: each category under its name, three rows at most, then the way to all of them. */
function phoneResults(query) {
  const sections = hitsOf(query).map((group) => {
    const shown = group.rows.slice(0, 3)
    const more = group.rows.length > shown.length
    return `<section aria-labelledby="a-${group.id}" style="flex: none; display: flex; flex-direction: column">
        ${groupHead(group, true)}
        ${shown.map(cardOf(group.id)).join('\n        ')}${more ? `\n        <a href="#" style="display: flex; align-items: center; min-height: 44px; font-size: 14px; color: #8EBDE3; text-decoration: none">Voir les ${group.rows.length} ${group.label.toLowerCase()}</a>` : ''}
      </section>`
  })
  return `<div id="a-results" aria-live="polite" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; margin: 0 -16px; padding: 0 16px 12px">
      ${sections.join('\n      ')}
    </div>`
}

/** A desktop's results: each category's own table, one under the other. */
function deskResults(query) {
  const stacked = (html) =>
    html
      .replace('flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid #2C383D', 'flex: none; display: flex; flex-direction: column; border: 1px solid #2C383D')
      .replace('<div style="flex: 1; min-height: 0; overflow-y: auto">', '<div>')
  const sections = hitsOf(query).map((group) => {
    const table = isBlocker(group.id) ? blockerTable(group.id, group.rows) : isArmor(group.id) ? armorTable(group.id, group.rows) : effectTable(group.id, group.rows)
    return `<section aria-labelledby="a-${group.id}" style="flex: none; display: flex; flex-direction: column">
        ${groupHead(group, false)}
        ${stacked(table)}
      </section>`
  })
  return `<div id="a-results" aria-live="polite" style="position: relative; flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; margin-right: -8px; padding-right: 8px">
      ${sections.join('\n      ')}
    </div>`
}

const asideC = (category, query = null) => {
  const hits = query === null ? null : Object.fromEntries(hitsOf(query).map((group) => [group.id, group.rows.length]))
  return `<nav aria-label="Catégories de l'Arsenal" style="flex: 0 0 196px; display: flex; flex-direction: column; gap: 16px; padding-top: 2px">
      ${searchField(true, query)}
      ${listC(category, true, hits)}
    </nav>`
}
// No level picker any more: every item at level 1, its level picked in Ton équipement; what blocks keeps its sort.
const sortOnly = (category) =>
  isBlocker(category)
    ? `<div style="display: flex; align-items: center; gap: 16px"><span style="flex: 1"></span><label for="a-sort" style="${CAPTION}">TRIER PAR</label><select id="a-sort" style="height: 36px; padding: 0 10px; background: #151C1F; border: 1px solid #2C383D; border-radius: 4px; font-size: 14px"><option>VD</option><option>En parade</option></select></div>`
    : ''
const SKILL = `ta compétence Blocage <span style="${MONO}; color: #E2E8E8">${data.skill}</span>`
const ledeAC = (category) =>
  isBlocker(category)
    ? `Au niveau 1, avec ${SKILL}&nbsp;; touche-en un pour choisir son niveau dans Ton équipement.`
    : isArmor(category)
      ? 'Au niveau 1&nbsp;; touche-en une pour choisir son niveau dans Ton équipement.'
      : intro(category)
const deskC = (category) =>
  desktop({
    nav: sortOnly(category),
    category,
    aside: asideC(category),
    lede: ledeAC(category),
  })
const deskSearch = (query) => {
  const groups = hitsOf(query)
  return desktop({
    nav: '',
    category: null,
    aside: asideC(null, query),
    content: deskResults(query),
    lede: `${countOf(groups)} résultats pour «&nbsp;${query}&nbsp;», dans ${groups.length} catégories. Au niveau 1, avec ${SKILL}.`,
  })
}
const navAS = (category) => `    ${searchField(false)}\n${navA(category)}`
const QUERY = 'fer'

const iteration = {
  'Arsenal-AC.dc.html': board({
    title: 'Itération 1 · A sur téléphone, C sur desktop',
    lede: [
      "La famille de ce qui bloque s'appelle «&nbsp;En main&nbsp;»&nbsp;: ce que tu tiens, boucliers, armes, torche ou mains nues, et pas seulement en main gauche. Sur téléphone, les trois familles puis leurs catégories (piste A)&nbsp;; sur desktop, les dix catégories dans une colonne à gauche de la page (piste C). Ce qui se tient garde sa liste d'aujourd'hui, sans la vitesse ni la repousse. Plus de sélecteur de niveau ni de rappel de la compétence au-dessus des listes&nbsp;: tout se lit au niveau 1, et toucher une ligne ouvre Ton équipement, où l'on choisit son niveau.",
      `Un champ de recherche, comme celui du Bestiaire, cherche dans les dix catégories à la fois&nbsp;: les résultats se rangent par catégorie, chacune sous son nom et sa famille, au format de sa liste. Sur téléphone, trois par catégorie, puis «&nbsp;Voir les 6 armes&nbsp;»&nbsp;; sur desktop, le tableau de chacune, et la colonne compte ce que chaque catégorie trouve. Ici, «&nbsp;${QUERY}&nbsp;».`,
    ],
    items: [
      phone({ caption: '1 · EN MAIN · BOUCLIERS', nav: navAS('shields'), category: 'shields', bare: true }),
      phone({ caption: '2 · PIÈCES D’ARMURES · CASQUES', nav: navAS('helmet'), category: 'helmet', bare: true }),
      phone({ caption: '3 · À EMPORTER · BIBELOTS', nav: navAS('trinket'), category: 'trinket', bare: true }),
      phone({ caption: `4 · RECHERCHE «&nbsp;${QUERY.toUpperCase()}&nbsp;»`, nav: `    ${searchField(false, QUERY)}`, category: null, search: QUERY }),
    ],
    width: phoneWidth(4),
    height: 1160,
  }),
  'Arsenal-AC-Desktop-1.dc.html': desktopBoard('Arsenal — boucliers', deskC('shields')),
  'Arsenal-AC-Desktop-2.dc.html': desktopBoard('Arsenal — plastrons', deskC('chest')),
  'Arsenal-AC-Desktop-3.dc.html': desktopBoard('Arsenal — boissons', deskC('consumable')),
  'Arsenal-AC-Desktop-4.dc.html': desktopBoard(`Arsenal — recherche ${QUERY}`, deskSearch(QUERY)),
}

// Imported by other generators (../choix), it writes nothing: only run directly does it.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const written = process.argv.includes('--tracks') ? { ...boards, ...iteration } : iteration
  for (const [file, html] of Object.entries(written)) {
    if (html.includes('{{')) throw new Error(`${file}: a hole is left`)
    writeFileSync(new URL(file, PROJECT), html, 'utf8')
    console.log(file, html.length)
  }
}

// ---- Origine (--origine): the approved iteration carried into the Arsenal boards. ----
// Arsenal and Desktop-Arsenal stay interactive: a family or a category picked in Play shows its list, read from the
// data embedded in the board; their state keeps `broken`, which Arsenal-Ligne-Plantee and its desktop set
// (build_bestiary_search.py). Their search fields open Arsenal-Recherche and Desktop-Arsenal-Recherche, drawn with « fer »
// as the Bestiaire's search boards are with « tro ».

const cap = (text) => `${text[0].toUpperCase()}${text.slice(1)}`
/** Every category's rows, as the boards' logic reads them. */
function origineData() {
  const out = {}
  for (const family of FAMILIES)
    for (const [id] of family.items)
      out[id] = rowsOf(id).map((r) =>
        isBlocker(id)
          ? { k: 'b', name: r.name, type: r.type ?? '', power: r.power, parry: r.parry, parryNote: r.parryNote, equipped: r.equipped }
          : isArmor(id)
            ? {
                k: 'p',
                name: r.name,
                armor: r.armorText,
                perLevel: r.perLevel,
                chips: r.chips.map((c) => ({ t: c.type, text: c.text, strong: c.strong, weak: c.weak })),
                setName: r.set?.name ?? '',
                setSize: r.set?.size ?? 0,
                setChanges: r.set?.changes ?? '',
                dodge: r.dodge ? cap(r.dodge) : '',
                equipped: r.equipped,
              }
            : {
                k: 'e',
                name: r.name,
                when: [r.duration, r.trigger, r.cooldown].filter(Boolean).join(' · ').toUpperCase(),
                duration: r.duration,
                extra: (r.cooldown ?? r.trigger ?? '').replace(/^recharge /, ''),
                changes: r.changes,
                carried: r.carried,
              },
      )
  return out
}

// The script's shared head: the data, the families and what turns a row of data into what the template binds.
const logicHead = () => `    const DATA = ${JSON.stringify(origineData())};
    const FAMILIES = ${JSON.stringify(FAMILIES.map((f) => ({ short: f.short, long: f.long, caption: f.caption, items: f.items })))};
    const ICONS = ${JSON.stringify(ICONS)};
    const ITEM = ${JSON.stringify(ITEM)};
    const cat = this.state.category;
    const family = FAMILIES.find((f) => f.items.some((i) => i[0] === cat));
    const label = family.items.find((i) => i[0] === cat)[1];
    const kind = DATA[cat][0].k;
    const row = (r) => {
      const broken = r.name === this.state.broken;
      const on = !!(r.equipped || r.carried);
      return Object.assign({}, r, {
        broken: broken,
        isBlocker: !broken && r.k === 'b',
        isShieldRow: !broken && r.k === 'b' && cat === 'shields',
        isOtherRow: !broken && r.k === 'b' && cat !== 'shields',
        isPiece: !broken && r.k === 'p',
        isEffect: !broken && r.k === 'e',
        isEffect3: !broken && r.k === 'e' && cat !== 'consumable',
        isEffect2: !broken && r.k === 'e' && cat === 'consumable',
        on: on,
        off: !on,
        rowStyle: on ? 'background: #1D3344' : '',
        label: r.name + (r.equipped ? ', équipé' : r.carried ? ', emporté' : '') + '. Ouvrir dans Ton équipement.',
        hasType: !!r.type,
        parryStyle: r.parry === '—' ? 'color: #7D8B91' : '',
        hasChips: !!(r.chips && r.chips.length),
        noChips: !(r.chips && r.chips.length),
        chips: (r.chips || []).map((c) => ({ icon: ICONS[c.t], text: c.text, strong: c.strong, border: c.weak ? '#97A5AA' : '#2C383D', color: c.weak ? '#E2E8E8' : '#97A5AA' })),
        hasSet: !!r.setName,
        noSet: !r.setName,
        setLine: r.setName ? 'Ensemble ' + r.setName + ', ' + r.setSize + ' pièces\\u00a0: ' + r.setChanges : '',
        hasDodge: !!r.dodge,
        changes: (r.changes || []).map((t) => ({ t: t.charAt(0).toUpperCase() + t.slice(1) })),
        setChangesLine: r.setChanges ? r.setChanges.charAt(0).toUpperCase() + r.setChanges.slice(1) : '',
        doneText: r.k === 'e' ? 'Emporté' : 'Équipé',
        verb: r.k === 'e' ? 'Emporter' : 'Équiper',
        verbLabel: (r.k === 'e' ? 'Emporter' : 'Équiper') + '\\u00a0: ' + r.name
      });
    };
    const rows = DATA[cat].map(row);`

const LABEL10 = 'font-size: 10px; letter-spacing: 0.08em; color: #97A5AA'
const chipTemplate = `<ul aria-label="Résistances et faiblesses" style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; ${MONO}; font-size: 11px; line-height: 14px; text-transform: uppercase"><sc-for list="{{ r.chips }}" as="c" hint-placeholder-count="1"><li style="padding: 3px 7px; border: 1px solid {{ c.border }}; border-radius: 3px; color: {{ c.color }}; white-space: nowrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12" style="vertical-align: -2px; margin-right: 5px"><path d="{{ c.icon }}"></path></svg>{{ c.text }}<span style="font-weight: 500">{{ c.strong }}</span></li></sc-for></ul>`
const changesTemplate = (size) => `<span style="display: flex; flex-direction: column; font-size: ${size}px; line-height: 1.45"><sc-for list="{{ r.changes }}" as="x" hint-placeholder-count="1"><span>{{ x.t }}</span></sc-for></span>`

function originePhone(source) {
  const broken = take(source, /        <sc-if value="\{\{ r\.broken \}\}" hint-placeholder-val="\{\{ false \}\}">[^]*?<\/sc-if>/, 'phone crashed row')
  const card = (flag, gap, inner) => `        <sc-if value="{{ r.${flag} }}" hint-placeholder-val="{{ ${flag === 'isBlocker'} }}">
          <a href="Profil.dc.html" aria-label="{{ r.label }}" style="display: flex; flex-direction: column; gap: ${gap}px; padding: 10px 16px; margin: 0 -16px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none; {{ r.rowStyle }}">
${inner}
          </a>
        </sc-if>`
  const head = (tagged) => `            <span style="display: flex; align-items: center; gap: 8px; min-width: 0"><span style="min-width: 0; font-size: 15px">{{ r.name }}</span>${tagged}<span style="flex: 1"></span>${CHEVRON}</span>`
  const main = `  <main style="flex: 1; padding: 4px 16px 0; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: hidden">
    <a href="Arsenal-Recherche.dc.html" aria-label="Rechercher dans tout l'Arsenal" style="flex: none; display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: 15px; color: #7D8B91; text-decoration: none; white-space: nowrap; overflow: hidden">${SEARCH_ICON}Objet, pièce ou effet, partout</a>
    <div role="group" aria-label="Famille" style="flex: none; display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">
      <sc-for list="{{ families }}" as="f" hint-placeholder-count="3"><button type="button" onClick="{{ f.pick }}" aria-pressed="{{ f.pressed }}" style="flex: 1; height: 44px; font-size: 14px; {{ f.style }}">{{ f.label }}</button></sc-for>
    </div>
    <div role="group" aria-label="Catégorie" style="flex: none; display: flex; gap: 6px">
      <sc-for list="{{ items }}" as="c" hint-placeholder-count="3"><button type="button" onClick="{{ c.pick }}" aria-pressed="{{ c.pressed }}" style="flex: 1; height: 36px; padding: 0 12px; border-radius: 18px; font-size: 13px; white-space: nowrap; {{ c.style }}">{{ c.label }}</button></sc-for>
    </div>
    <div aria-label="{{ listLabel }}" style="flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid #2C383D">
      <sc-for list="{{ rows }}" as="r" hint-placeholder-count="8">
${broken}
${card('isBlocker', 8, `${head(`<sc-if value="{{ r.hasType }}" hint-placeholder-val="{{ true }}"><span style="flex: none; ${MONO}; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #2C383D; color: #97A5AA">{{ r.type }}</span></sc-if><sc-if value="{{ r.equipped }}" hint-placeholder-val="{{ false }}">${tag('ÉQUIPÉ')}</sc-if>`)}
            <span style="display: flex; gap: 32px">
              <span style="display: flex; flex-direction: column; gap: 1px"><span style="${LABEL10}">VD</span><span style="${MONO}; font-size: 18px; font-weight: 500">{{ r.power }}</span></span>
              <span style="display: flex; flex-direction: column; gap: 1px"><span style="${LABEL10}">EN PARADE</span><span style="${MONO}; font-size: 15px; padding-top: 2px; {{ r.parryStyle }}">{{ r.parry }}</span><span style="${MONO}; font-size: 10px; color: #7D8B91">{{ r.parryNote }}</span></span>
            </span>`)}
${card('isPiece', 7, `${head(`<sc-if value="{{ r.equipped }}" hint-placeholder-val="{{ false }}">${tag('ÉQUIPÉ')}</sc-if>`)}
            <span style="display: flex; gap: 22px">
              <span style="display: flex; flex-direction: column; gap: 1px"><span style="${LABEL10}">ARMURE</span><span style="${MONO}; font-size: 18px; font-weight: 500">{{ r.armor }}</span></span>
              <span style="display: flex; flex-direction: column; gap: 1px"><span style="${LABEL10}">PAR NIVEAU</span><span style="${MONO}; font-size: 15px; padding-top: 2px">{{ r.perLevel }}</span></span>
            </span>
            <sc-if value="{{ r.hasChips }}" hint-placeholder-val="{{ false }}">${chipTemplate}</sc-if>
            <sc-if value="{{ r.hasSet }}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 1.4; color: #97A5AA">{{ r.setLine }}</span></sc-if>
            <sc-if value="{{ r.hasDodge }}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 1.4; color: #97A5AA">{{ r.dodge }}</span></sc-if>`)}
${card('isEffect', 5, `${head(`<sc-if value="{{ r.carried }}" hint-placeholder-val="{{ false }}">${tag('EMPORTÉ')}</sc-if>`)}
            <span style="${MONO}; font-size: 11px; line-height: 14px; color: #97A5AA">{{ r.when }}</span>
            ${changesTemplate(13)}`)}
      </sc-for>
    </div>
  </main>`
  const logic = `  screenVals() {
${logicHead()}
    const families = FAMILIES.map((f, i) => ({
      label: f.short,
      pressed: String(f === family),
      pick: () => this.setState({ category: f.items[0][0] }),
      style: (f === family ? 'background: #8EBDE3; color: #0D1214; font-weight: 500' : 'color: #97A5AA') + (i ? '; border-left: 1px solid #2C383D' : '')
    }));
    const items = family.items.map((i) => ({
      label: i[1],
      pressed: String(i[0] === cat),
      pick: () => this.setState({ category: i[0] }),
      style: i[0] === cat ? 'border: 1px solid #8EBDE3; color: #8EBDE3; background: #1D3344' : 'border: 1px solid #2C383D; color: #97A5AA'
    }));
    return { families: families, items: items, rows: rows, listLabel: label };
  }
}
</script>`
  let text = source.replace(/  <main style="flex: 1; padding: 4px 16px 0;[^]*?\n  <\/main>/, () => main)
  text = text.replace('this.state = { level: 3, broken: null };', "this.state = { category: 'shields', broken: null };")
  text = text.replace(/  screenVals\(\) \{[^]*\n\}\n<\/script>/, () => logic)
  if (!text.includes("category: 'shields', broken: null") || !text.includes('Arsenal-Recherche.dc.html') || text.includes('lvlTxt'))
    throw new Error('phone Arsenal not rewritten')
  return text.replace(/<title>[^<]*<\/title>/, '<title>Arsenal</title>')
}

function origineDesktop(source) {
  const broken = take(source, /          <sc-if value="\{\{ r\.broken \}\}" hint-placeholder-val="\{\{ false \}\}">[^]*?<\/sc-if>/, 'desktop crashed row')
  const head = (cells) => `<div role="row" style="${HEAD_ROW}; grid-template-columns: {{ cols }}"><span role="columnheader">{{ itemHead }}</span>${cells}<span role="columnheader"><span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Action</span></span></div>`
  const headIf = (flag, cells) => `        <sc-if value="{{ ${flag} }}" hint-placeholder-val="{{ ${flag === 'isShields'} }}">${head(cells)}</sc-if>`
  const right = (text) => `<span role="columnheader" style="text-align: right">${text}</span>`
  const plain = (text) => `<span role="columnheader">${text}</span>`
  const actionCell = `<span role="cell" style="display: flex; justify-content: flex-end"><sc-if value="{{ r.on }}" hint-placeholder-val="{{ false }}"><span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #8EBDE3">${CHECK}{{ r.doneText }}</span></sc-if><sc-if value="{{ r.off }}" hint-placeholder-val="{{ true }}"><a href="Desktop-Equipement.dc.html" aria-label="{{ r.verbLabel }}" style="display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; font-size: 13px; color: #E2E8E8; text-decoration: none">{{ r.verb }}</a></sc-if></span>`
  const nameCell = (tagFlag, tagText) => `<span role="cell" style="display: flex; align-items: center; gap: 10px; min-width: 0"><span>{{ r.name }}</span><sc-if value="{{ r.${tagFlag} }}" hint-placeholder-val="{{ false }}">${tag(tagText)}</sc-if></span>`
  const rowIf = (flag, cells) => `            <sc-if value="{{ r.${flag} }}" hint-placeholder-val="{{ ${flag === 'isShieldRow'} }}">
              <div role="row" style="${ROW}; grid-template-columns: {{ cols }}; {{ r.rowStyle }}">${cells}${actionCell}</div>
            </sc-if>`
  const blockerCells = (typed) =>
    `${nameCell('equipped', 'ÉQUIPÉ')}${typed ? `<span role="cell" style="${MONO}; font-size: 12px; color: #97A5AA">{{ r.type }}</span>` : ''}<span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 17px; font-weight: 500">{{ r.power }}</span><span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 15px; {{ r.parryStyle }}">{{ r.parry }} <span style="font-size: 11px; color: #7D8B91">{{ r.parryNote }}</span></span>`
  const effectCells = (extra) =>
    `${nameCell('carried', 'EMPORTÉ')}<span role="cell" style="${MONO}; font-size: 14px">{{ r.duration }}</span>${extra ? `<span role="cell" style="${MONO}; font-size: 14px">{{ r.extra }}</span>` : ''}<span role="cell">${changesTemplate(14)}</span>`
  const main = `  <main style="flex: 999 1 560px; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 32px; display: flex; gap: 28px">
    <nav aria-label="Catégories de l'Arsenal" style="flex: 0 0 196px; display: flex; flex-direction: column; gap: 16px; padding-top: 2px">
      <a href="Desktop-Arsenal-Recherche.dc.html" aria-label="Rechercher dans tout l'Arsenal" style="flex: none; display: flex; align-items: center; gap: 8px; height: 40px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: 14px; color: #7D8B91; text-decoration: none; white-space: nowrap; overflow: hidden">${SEARCH_ICON}Rechercher partout</a>
      <sc-for list="{{ groups }}" as="g" hint-placeholder-count="3">
        <div role="group" aria-label="{{ g.long }}" style="display: flex; flex-direction: column">
          <span style="padding: 0 10px 4px; font-size: 10px; letter-spacing: 0.08em; color: #7D8B91">{{ g.caption }}</span>
          <sc-for list="{{ g.items }}" as="c" hint-placeholder-count="3"><button type="button" onClick="{{ c.pick }}" aria-current="{{ c.current }}" style="display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px; border-radius: 6px; font-size: 14px; text-align: left; {{ c.style }}"><span style="flex: 1">{{ c.label }}</span><span style="${MONO}; font-size: 12px; color: {{ c.countColor }}">{{ c.count }}</span></button></sc-for>
        </div>
      </sc-for>
    </nav>
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px">
      <header style="display: flex; flex-direction: column; gap: 4px">
        <h1 style="margin: 0; font-size: 26px; font-weight: 500">Arsenal</h1>
        <p style="margin: 0; font-size: 15px; color: #97A5AA">{{ lede }}</p>
      </header>
      <sc-if value="{{ isBlockers }}" hint-placeholder-val="{{ true }}"><div style="display: flex; align-items: center; gap: 16px"><span style="flex: 1"></span><label for="a-sort" style="${CAPTION}">TRIER PAR</label><select id="a-sort" style="height: 36px; padding: 0 10px; background: #151C1F; border: 1px solid #2C383D; border-radius: 4px; font-size: 14px"><option>VD</option><option>En parade</option></select></div></sc-if>
      <div role="table" aria-label="{{ listLabel }}" style="flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
${headIf('isShields', `${plain('TYPE')}${right('VD ↓')}${right('EN PARADE')}`)}
${headIf('isOtherBlockers', `${right('VD ↓')}${right('EN PARADE')}`)}
${headIf('isPieces', `${right('ARMURE ↓')}${right('PAR NIVEAU')}${plain('RÉSISTANCES ET FAIBLESSES')}${plain('ENSEMBLE')}`)}
${headIf('isEffects3', `${plain('DURÉE')}${plain('{{ extraHead }}')}${plain('{{ changesHead }}')}`)}
${headIf('isEffects2', `${plain('DURÉE')}${plain('{{ changesHead }}')}`)}
        <div style="flex: 1; min-height: 0; overflow-y: auto">
          <sc-for list="{{ rows }}" as="r" hint-placeholder-count="12">
${broken}
${rowIf('isShieldRow', blockerCells(true))}
${rowIf('isOtherRow', blockerCells(false))}
${rowIf('isPiece', `${nameCell('equipped', 'ÉQUIPÉ')}<span role="cell" style="text-align: right; white-space: nowrap; ${MONO}; font-size: 17px; font-weight: 500">{{ r.armor }}</span><span role="cell" style="text-align: right; ${MONO}; font-size: 15px">{{ r.perLevel }}</span><span role="cell"><sc-if value="{{ r.hasChips }}" hint-placeholder-val="{{ false }}">${chipTemplate}</sc-if><sc-if value="{{ r.noChips }}" hint-placeholder-val="{{ true }}"><span style="color: #7D8B91">—</span></sc-if><sc-if value="{{ r.hasDodge }}" hint-placeholder-val="{{ false }}"><span style="display: block; margin-top: 4px; font-size: 12px; color: #97A5AA">{{ r.dodge }}</span></sc-if></span><span role="cell" style="font-size: 13px; line-height: 1.4"><sc-if value="{{ r.hasSet }}" hint-placeholder-val="{{ false }}">{{ r.setName }} <span style="color: #7D8B91">· {{ r.setSize }} pièces</span><span style="display: block; font-size: 12px; color: #97A5AA">{{ r.setChangesLine }}</span></sc-if><sc-if value="{{ r.noSet }}" hint-placeholder-val="{{ true }}"><span style="color: #7D8B91">—</span></sc-if></span>`)}
${rowIf('isEffect3', effectCells(true))}
${rowIf('isEffect2', effectCells(false))}
          </sc-for>
        </div>
      </div>
    </div>
  </main>`
  const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { category: 'shields', broken: null };
  }
  renderVals() {
${logicHead()}
    const COUNTS = ${JSON.stringify(data.counts)};
    const groups = FAMILIES.map((f) => ({
      long: f.long,
      caption: f.caption,
      items: f.items.map((i) => ({
        label: i[1],
        count: COUNTS[i[0]],
        current: String(i[0] === cat),
        pick: () => this.setState({ category: i[0] }),
        style: i[0] === cat ? 'background: #1D3344; color: #8EBDE3' : 'color: #E2E8E8',
        countColor: i[0] === cat ? '#8EBDE3' : '#7D8B91'
      }))
    }));
    const cols = {
      shields: 'minmax(0, 2.4fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.4fr) 110px',
      b: 'minmax(0, 2.4fr) minmax(0, 1fr) minmax(0, 1.4fr) 110px',
      p: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 2.2fr) minmax(0, 1.8fr) 110px',
      e3: 'minmax(0, 1.8fr) minmax(0, 0.7fr) minmax(0, 1.4fr) minmax(0, 3.2fr) 130px',
      e2: 'minmax(0, 1.8fr) minmax(0, 0.7fr) minmax(0, 3.2fr) 130px'
    };
    const shape = cat === 'shields' ? 'shields' : kind === 'e' ? (cat === 'consumable' ? 'e2' : 'e3') : kind;
    return {
      groups: groups,
      rows: rows,
      listLabel: label,
      itemHead: ITEM[cat],
      cols: cols[shape],
      isBlockers: kind === 'b',
      isShields: shape === 'shields',
      isOtherBlockers: shape === 'b',
      isPieces: kind === 'p',
      isEffects3: shape === 'e3',
      isEffects2: shape === 'e2',
      extraHead: cat === 'power' ? 'RECHARGE' : 'SE DÉCLENCHE',
      changesHead: cat === 'consumable' ? "CE QU'ELLE CHANGE" : "CE QU'IL CHANGE",
      lede: kind === 'b'
        ? 'Au niveau 1, avec ta compétence Blocage ${data.skill}\\u00a0; touche-en un pour choisir son niveau dans Ton équipement.'
        : kind === 'p'
          ? 'Au niveau 1\\u00a0; touche-en une pour choisir son niveau dans Ton équipement.'
          : "Lu dans le jeu\\u00a0: les pouvoirs, et les bibelots et boissons qui changent un combat. L'emporter l'ajoute à Ton équipement\\u00a0; tu l'allumes sur la fiche d'une créature ou dans la Simulation."
    };
  }
}
</script>`
  let text = source.replace(/  <main style="flex: 999 1 560px;[^]*?\n  <\/main>/, () => main)
  text = text.replace(/class Component extends DCLogic \{[^]*\n\}\n<\/script>/, () => logic)
  if (!text.includes("category: 'shields', broken: null") || text.includes('lvlTxt')) throw new Error('desktop Arsenal not rewritten')
  return text
}

// The search boards: the same screens with « fer » typed, drawn once.
const SEARCH_STYLE = 'input{font:inherit;color:inherit}\ninput::placeholder{color:#7D8B91}\ninput[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}\nmark{background:transparent;color:#8EBDE3;font-weight:500}\n</style>'
function origineSearchPhone(arsenal) {
  const results = `  <main style="flex: 1; padding: 4px 16px 0; display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: hidden">
    ${searchField(false, QUERY)}
${searchToolbar(QUERY)}
    ${phoneResults(QUERY)}
  </main>`
    .replace('<a href="#" aria-label="Effacer la recherche"', '<a href="Arsenal.dc.html" aria-label="Effacer la recherche"')
    .replaceAll('<a href="#" style="display: flex; align-items: center; min-height: 44px; font-size: 14px; color: #8EBDE3', '<a href="Arsenal.dc.html" style="display: flex; align-items: center; min-height: 44px; font-size: 14px; color: #8EBDE3')
    .replaceAll('href="#"', 'href="Profil.dc.html"')
  let text = arsenal.replace(/  <main style="flex: 1; padding: 4px 16px 0;[^]*?\n  <\/main>/, () => results)
  text = text.replace(/  screenVals\(\) \{[^]*\n\}\n<\/script>/, () => '  screenVals() {\n    return {};\n  }\n}\n</script>')
  text = text.replace('</style>', SEARCH_STYLE).replace(/<title>[^<]*<\/title>/, '<title>Arsenal — recherche</title>')
  return text
}
function origineSearchDesktop(desktopArsenal) {
  const groups = hitsOf(QUERY)
  const main = `  <main style="flex: 999 1 560px; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 32px; display: flex; gap: 28px">
    ${asideC(null, QUERY)}
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px">
      <header style="display: flex; flex-direction: column; gap: 4px">
        <h1 style="margin: 0; font-size: 26px; font-weight: 500">Arsenal</h1>
        <p style="margin: 0; font-size: 15px; color: #97A5AA">${countOf(groups)} résultats pour «&nbsp;${QUERY}&nbsp;», dans ${groups.length} catégories. Au niveau 1, avec ${SKILL}.</p>
      </header>
      ${deskResults(QUERY)}
    </div>
  </main>`
    .replace('<a href="#" aria-label="Effacer la recherche"', '<a href="Desktop-Arsenal.dc.html" aria-label="Effacer la recherche"')
    .replaceAll('<a href="#" style="display: flex; align-items: center; gap: 10px; height: 36px', '<a href="Desktop-Arsenal.dc.html" style="display: flex; align-items: center; gap: 10px; height: 36px')
    .replaceAll('href="#"', 'href="Desktop-Equipement.dc.html"')
  let text = desktopArsenal.replace(/  <main style="flex: 999 1 560px;[^]*?\n  <\/main>/, () => main)
  text = text.replace(/class Component extends DCLogic \{[^]*\n\}\n<\/script>/, () => 'class Component extends DCLogic {\n  renderVals() {\n    return {};\n  }\n}\n</script>')
  text = text.replace('</style>', SEARCH_STYLE).replace(/<title>[^<]*<\/title>/, '<title>Arsenal — recherche desktop</title>')
  return text
}

if (isMain && process.argv.includes('--origine')) {
  const phoneBoard = originePhone(read('Arsenal.dc.html'))
  const desktopBoard = origineDesktop(read('Desktop-Arsenal.dc.html'))
  const origine = {
    'Arsenal.dc.html': phoneBoard,
    'Desktop-Arsenal.dc.html': desktopBoard,
    'Arsenal-Recherche.dc.html': origineSearchPhone(phoneBoard),
    'Desktop-Arsenal-Recherche.dc.html': origineSearchDesktop(desktopBoard),
  }
  for (const [file, html] of Object.entries(origine)) {
    if (/href="#"/.test(html)) throw new Error(`${file}: a link goes nowhere`)
    writeFileSync(new URL(file, PROJECT), html, 'utf8')
    console.log(file, html.length)
  }
}

export {
  HEAD,
  TAIL,
  PHONE_HEADER,
  PHONE_NAV,
  DESK_NAV,
  CHEVRON,
  CHECK,
  ICONS,
  MONO,
  CAPTION,
  SEARCH_ICON,
  data,
  upper,
  tag,
  chips,
  pieceCard,
  effectCard,
  blockerCard,
  armorTable,
  effectTable,
  blockerTable,
  desktop,
  asideC,
  ledeAC,
  navAS,
  phone,
  board,
  desktopBoard,
  phoneWidth,
}
