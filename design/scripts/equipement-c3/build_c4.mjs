// Builds Equipement-C4.dc.html, track C's iteration 3 (#62/#63): no « Ce qui t'aiderait » screen any more. On
// Moder's sheet and in the Simulation, a card « Avec tes effets temporaires » unfolds in place and lists what
// the player carries (set in Ton équipement), one switch each, counted at once. Reads out/states.json.
// Run from this folder: node build_c4.mjs (after node --import ./hooks.mjs states.mts), then the canvas scripts.
import { readFileSync, writeFileSync } from 'node:fs'

const DIR = new URL('.', import.meta.url)
const PROJECT = new URL('../../canvas/project/', import.meta.url)
const data = JSON.parse(readFileSync(new URL('out/states.json', DIR), 'utf8'))
const c2 = readFileSync(new URL('Equipement-C2.dc.html', PROJECT), 'utf8').split('\n')

// The first phone, Ton équipement, as C2 drew it; only its label and closing note change.
const COLUMN = '    <div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px">'
const starts = c2.flatMap((line, i) => (line.startsWith(COLUMN) ? [i] : []))
const swaps = [
  ['>TON ÉQUIPEMENT · CE QUE TU EMPORTES<', '>1 · TON ÉQUIPEMENT · CE QUE TU EMPORTES<'],
  [
    "Ils ne comptent pas dans les verdicts&nbsp;: la fiche de chaque créature dit ce qu'ils y changeraient.",
    "Pas comptés d'office&nbsp;: allume-les sur la fiche d'une créature ou dans la Simulation, quand ils sont actifs.",
  ],
]
let firstPhone = c2.slice(starts[0], starts[1]).join('\n').trimEnd().replaceAll('c2-1-', 'c4-1-')
for (const [from, to] of swaps) {
  if (!firstPhone.includes(from)) throw new Error(`not found in C2: ${from}`)
  firstPhone = firstPhone.replace(from, to)
}

// The drinks join « Ce que tu emportes »: one row each, like the trinket and the power, and a way to add one.
const select = firstPhone.match(/<select id="c4-1-trinket" (style="[^"]*")>/)[1]
const chevron = firstPhone.match(/<\/select>(<svg[^]*?<\/svg>)<\/span>/)[1]
const DRINKS = ['Hydromel de résistance au gel', "Vin d'orge de résistance au feu", 'Hydromel de résistance au poison', 'Hydromel des berserkir']
const drinkRow = (n, name, detail) => `            <div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px; border-bottom: 1px solid #1F2A2E">
              <label for="c4-1-drink${n}" style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">BOISSON</label>
              <span style="display: flex; align-items: center; gap: 4px"><select id="c4-1-drink${n}" ${select}><option>Aucune</option>${DRINKS.map((d) => `<option${d === name ? ' selected' : ''}>${d}</option>`).join('')}</select>${chevron}</span>
              <span style="display: flex; flex-direction: column; font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 16px; color: #7D8B91"><span style="white-space: nowrap">${detail}</span></span>
            </div>`
const drinks = `
${drinkRow(1, DRINKS[0], '10 min · Glace ×0,5')}
${drinkRow(2, DRINKS[1], '10 min · Feu ×0,5')}
            <button type="button" style="display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 10px; font-size: 14px; line-height: 18px; color: #8EBDE3; text-align: left"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M12 5v14M5 12h14"></path></svg>Ajouter une boisson</button>
          </div>`
const powerRow = '<div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px">\n              <label for="c4-1-power"'
const grid = /\n {10}<\/div>\n {10}<div style="margin-top: 6px; display: flex; flex-direction: column; gap: 6px">\n {12}<span id="c4-1-drinks"[^]*?(?=\n {10}<p style="margin: 4px 0 0;)/
if (!firstPhone.includes(powerRow) || !grid.test(firstPhone)) throw new Error('drinks: C2 markup not found')
firstPhone = firstPhone
  .replace(powerRow, powerRow.replace('padding: 5px 10px 6px"', 'padding: 5px 10px 6px; border-bottom: 1px solid #1F2A2E"'))
  .replace(grid, () => drinks)
  // A set shows only once complete, by its game name, and only the four whose bonus changes a fight (Berserker,
  // Bénédiction de Fenris, Avant-garde, Colère de l'ours maudit): none here, so no line.
  .replace('\n            <span style="font-size: 13px; line-height: 17px; color: #97A5AA">Ensemble&nbsp;: aucun complet</span>', '')
  // Scrolled further down, so the note above « Valider » stays in view.
  .replace('style="flex: none; margin-top: -66px;', 'style="flex: none; margin-top: -85px;')
if (!firstPhone.includes('margin-top: -85px') || firstPhone.includes('aucun complet')) throw new Error('drinks: C2 markup not found')

// Phone 1 bis: the same screen with a complete set, Fenris (game.json): hood N1 (10), coat N4 (16, frost
// resistant), leggings N4 (16), the wolf cape N1 (1). Its bonus, « Bénédiction de Fenris », adds fire resistant;
// frost stays resistant (the coat and the cape do not stack). Seen from the top, so the set is in view.
const chip = (li) => li.replace('border: 1px solid #97A5AA; border-radius: 3px; color: #E2E8E8', 'border: 1px solid #2C383D; border-radius: 3px; color: #97A5AA')
const items = firstPhone.match(/<li [^]*?<\/li>/g)
if (items?.length !== 3) throw new Error('set: resistance chips not found')
const fireChip = chip(items[2]).replace('Faible ×1,5', 'Résistant ×0,5')
const setBlock = `
            <div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px; border: 1px solid #2C383D; border-radius: 4px; background: #151C1F">
              <span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">ENSEMBLE COMPLET</span>
              <span style="font-size: 14px; line-height: 18px">Bénédiction de Fenris</span>
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 16px; color: #7D8B91">Feu ×0,5</span>
            </div>`
const setSwaps = [
  ['>1 · TON ÉQUIPEMENT · CE QUE TU EMPORTES<', '>1 BIS · TON ÉQUIPEMENT · UN ENSEMBLE COMPLET<'],
  ['style="flex: none; margin-top: -85px;', 'style="flex: none; margin-top: 12px;'],
  ['<option>Casque en fer</option>', '<option>Capuche de Fenris</option>'],
  ['<option>Cuirasse de racines</option>', '<option>Manteau de Fenris</option>'],
  ['<option>Jambières en plaques de fer</option>', '<option>Braies de Fenris</option>'],
  ['font-size: 17px; line-height: 22px">49</span>', 'font-size: 17px; line-height: 22px">43</span>'],
  ['>14 + 14 + 20 + 1<', '>10 + 16 + 16 + 1<'],
  [firstPhone.slice(0, firstPhone.indexOf(items[0])).match(/\n *$/)[0] + items[0], ''],
  [items[2], fireChip],
  ['            </ul>', '            </ul>' + setBlock],
]
let setPhone = firstPhone.replaceAll('c4-1-', 'c4-1b-')
for (const [from, to] of setSwaps) {
  const anchor = from.replaceAll('c4-1-', 'c4-1b-')
  if (setPhone.split(anchor).length !== 2) throw new Error(`set: not found once: ${anchor.slice(0, 70)}`)
  setPhone = setPhone.replace(anchor, () => to.replaceAll('c4-1-', 'c4-1b-'))
}

const svg = (size, paths, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${size >= 20 ? '1.75' : '2'}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`
const P = {
  close: '<path d="M6 6l12 12M18 6L6 18"></path>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"></path>',
  chevron: '<path d="M9 6l6 6-6 6"></path>',
  down: '<path d="M6 9l6 6 6-6"></path>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"></path><path d="M4 4v5h5"></path>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>',
  parry: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path><path d="M13 7.5l-3 4.5h4l-3 4.5"></path>',
  roll: '<path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path>',
  check: '<path d="M5 12l5 5L20 7"></path>',
  warn: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>',
  pierce: '<path d="M20 4l-7 3 4 4zM15 9L4 20"></path>',
  slash: '<path d="M4 14L14 4M7 19L19 7M13 20l7-7"></path>',
  frost: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"></path>',
  fire: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z"></path>',
  spirit: '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01"></path>',
  creatures:
    '<circle cx="6.5" cy="10" r="2"></circle><circle cx="12" cy="6.5" r="2"></circle><circle cx="17.5" cy="10" r="2"></circle><path d="M8 18c0-3 1.8-5 4-5s4 2 4 5c0 1.7-1.8 2.5-4 2.5S8 19.7 8 18z"></path>',
  target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>',
  sword: '<path d="M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4z"></path><path d="M6 13l5 5"></path>',
  book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2V5z"></path><path d="M5 20a2 2 0 0 0 2 1h12v-3"></path>',
  globe: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"></path>',
  sliders:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"></path><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="17" cy="18" r="2"></circle>',
}
const bold = (size, paths) => svg(size, paths, ' style="flex: none"').replace(/stroke-width="[\d.]+"/, 'stroke-width="2.25"')
const typeIcon = (path, margin = 'margin-right: 3px') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12" style="vertical-align: -2px; ${margin}">${path}</svg>`
const TONES = {
  ok: { fg: '#6CC08A', fill: '#2E7A4B' },
  warn: { fg: '#D9A043', fill: '#B5760C' },
  bad: { fg: '#E36B5E', fill: '#7A2A24' },
}

// The app's header, with the context chip.
const appHeader = `      <header style="flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px">
        <span style="flex: 1; display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 500"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8EBDE3" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.shield}</svg>Foelore</span>
        <button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Ton contexte&nbsp;: VD 43,2 ×1" style="height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #E2E8E8">
          <span style="display: flex; align-items: center; gap: 4px"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8EBDE3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.shield}</svg>VD 43,2</span>
          <span style="display: flex; align-items: center; gap: 4px"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8EBDE3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.globe}</svg>×1</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#97A5AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.down}</svg>
        </button>
        <a href="#" aria-label="Réglages" style="width: 44px; height: 44px; margin-right: -10px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${svg(22, P.sliders)}</a>
      </header>`
const navLink = (current, label, paths) =>
  `<a href="#"${current ? ' aria-current="page"' : ''} style="display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 52px; justify-content: center; font-size: 11px; color: ${current ? '#8EBDE3' : '#7D8B91'}; text-decoration: none">${svg(22, paths)}${label}</a>`
const nav = (current) => `      <nav aria-label="Navigation" style="flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid #2C383D; padding: 6px 0 14px">
        ${navLink(current === 'bestiary', 'Bestiaire', P.creatures)}
        ${navLink(current === 'simulation', 'Simulation', P.target)}
        ${navLink(false, 'Arsenal', P.sword)}
        ${navLink(false, 'Mémo', P.book)}
      </nav>`
const staticFrame = (label, body) => `    <div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; color: #97A5AA">${label}</span><div style="position: relative; flex: none; width: 390px; height: 744px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 8px; overflow: hidden; background: #0D1214; display: flex; flex-direction: column">
${body}
    </div></div>`
const frame = (v, body) => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; color: #97A5AA">{{ ${v}.label }}</span><div style="position: relative; flex: none; width: 390px; height: 744px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 8px; overflow: hidden; background: #0D1214; display: flex; flex-direction: column">
${body}
    </div></div>`

// Moder in the Bestiary: its row only ever counts the pieces.
const B = data.bestiary
const pill = (paths, tone, label) =>
  `<span role="img" aria-label="${label}" style="width: 30px; height: 30px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${TONES[tone].fill}; color: ${TONES[tone].fg}">${svg(17, paths)}</span>`
const adviceIcon = (tone, size) => bold(size, tone === 'ok' ? P.check : tone === 'warn' ? P.warn : P.close)
const bestiaryPhone = staticFrame(
  '2 · LE BESTIAIRE · TES PIÈCES SEULES',
  `${appHeader}
      <main style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 12px">
        <label style="flex: none; display: flex; align-items: center; gap: 8px; height: 44px; border: 1px solid #8EBDE3; border-radius: 4px; padding: 0 2px 0 12px">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">${P.search}</svg>
          <span style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)">Rechercher dans tous les biomes</span>
          <input type="search" value="Moder" style="flex: 1; min-width: 0; height: 42px; background: transparent; border: 0; font-size: 15px">
          <button type="button" aria-label="Effacer la recherche" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${svg(18, P.close)}</button>
        </label>
        <section aria-labelledby="c4-2-creatures" style="flex: none; display: flex; flex-direction: column">
          <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid #2C383D">
            <h2 id="c4-2-creatures" style="margin: 0; font-size: 11px; font-weight: 400; letter-spacing: 0.08em; color: #97A5AA">CRÉATURES · 1</h2>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #7D8B91">SANS TES EFFETS TEMPORAIRES</span>
          </div>
          <a href="#" style="display: flex; flex-direction: column; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 0; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none">
            <span style="display: flex; align-items: center; gap: 12px">
              <span style="flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px">
                <span style="font-size: 15px">${B.name}</span>
                <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #97A5AA">${B.stats}</span>
              </span>
              <span style="display: flex; gap: 6px">${pill(P.shield, B.block.tone, `Blocage&nbsp;: ${B.block.word}`)}${pill(P.parry, B.parry.tone, `Parade&nbsp;: ${B.parry.word}`)}${pill(P.roll, B.dodge.tone, `Esquive&nbsp;: ${B.dodge.word}`)}</span>
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: ${TONES[B.advice.tone].fg}">${adviceIcon(B.advice.tone, 15)}<span>${B.advice.text}</span></span>
          </a>
        </section>
      </main>
${nav('bestiary')}`,
)

// The advice line, in the colour of its verdict, with its icon.
const adviceLine = (v, size, font) => `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: ${font}px; line-height: ${font + 4}px; color: {{ ${v}.adviceColor }}">
          <sc-if value="{{ ${v}.adviceOk }}" hint-placeholder-val="{{ false }}">${bold(size, P.check)}</sc-if>
          <sc-if value="{{ ${v}.adviceWarn }}" hint-placeholder-val="{{ true }}">${bold(size, P.warn)}</sc-if>
          <sc-if value="{{ ${v}.adviceBad }}" hint-placeholder-val="{{ false }}">${bold(size, P.close)}</sc-if>
          <span>{{ ${v}.adviceText }}</span>
        </div>`

// « Avec tes effets temporaires »: folded, it names what is on; unfolded, what the player carries, a switch
// each, counted at once.
const effects = (v, surface) => `<div style="flex: none; border: 1px solid #2C383D; border-radius: 6px; background: ${surface}">
          <button type="button" onClick="{{ ${v}.fold }}" aria-expanded="{{ ${v}.expanded }}" aria-controls="{{ ${v}.listId }}" style="display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; box-sizing: border-box; padding: 8px 12px; text-align: left">
            <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 15px; line-height: 20px; color: #E2E8E8">Avec tes effets temporaires</span>
              <span style="font-size: 12px; line-height: 16px; color: #97A5AA">{{ ${v}.summary }}</span>
            </span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#97A5AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; transition: transform 0.15s; transform: {{ ${v}.chevron }}">${P.down}</svg>
          </button>
          <sc-if value="{{ ${v}.open }}" hint-placeholder-val="{{ true }}">
          <div id="{{ ${v}.listId }}" role="group" aria-label="Tes effets temporaires" style="padding: 0 12px; border-top: 1px solid #1F2A2E">
            <sc-for list="{{ ${v}.rows }}" as="r" hint-placeholder-count="4">
              <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: {{ r.divider }}">
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
                  <span id="{{ r.id }}" style="font-size: 14px; line-height: 18px; color: {{ r.nameColor }}">{{ r.name }}</span>
                  <span id="{{ r.tagId }}" style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: #7D8B91">{{ r.tag }}</span>
                  <sc-if value="{{ r.hasNote }}" hint-placeholder-val="{{ false }}">
                    <span id="{{ r.noteId }}" style="font-size: 12px; line-height: 16px; color: #7D8B91">{{ r.note }}</span>
                  </sc-if>
                </div>
                <sc-if value="{{ r.switchable }}" hint-placeholder-val="{{ true }}">
                  <button type="button" role="switch" aria-checked="{{ r.checked }}" aria-labelledby="{{ r.id }}" aria-describedby="{{ r.describedBy }}" onClick="{{ r.toggle }}" style="flex: none; width: 44px; height: 44px; margin: -4px 0; display: flex; align-items: center; justify-content: center"><span aria-hidden="true" style="position: relative; width: 38px; height: 22px; border: 1px solid {{ r.trackBorder }}; border-radius: 12px; background: {{ r.track }}; transition: background 0.15s, border-color 0.15s"><span style="position: absolute; top: 2px; left: {{ r.knob }}; width: 18px; height: 18px; border-radius: 50%; background: {{ r.knobColor }}; transition: left 0.15s"></span></span></button>
                </sc-if>
              </div>
            </sc-for>
            <p style="margin: 0; padding: 8px 0 10px; border-top: 1px solid #1F2A2E; font-size: 12px; line-height: 16px; color: #7D8B91">Vaut jusqu'à ce que tu changes de créature.</p>
          </div>
          </sc-if>
        </div>`

// Moder's sheet: its attacks keep C2's rows, their verdicts follow what is on.
const ATTACKS = [
  { name: 'Morsure', types: `${typeIcon(P.pierce)}PERFORANT · MÊLÉE`, damage: 120 },
  { name: 'Griffe', types: `${typeIcon(P.slash)}COUPANT · MÊLÉE`, damage: 110 },
  {
    name: 'Barrage de projectiles',
    types: `${typeIcon(P.frost)}GLACE${typeIcon(P.pierce, 'margin: 0 3px 0 6px')}PERFORANT · PROJECTILE`,
    damage: 230,
  },
  { name: 'Souffle glacial', types: `${typeIcon(P.frost)}GLACE · MÊLÉE`, damage: 200 },
]
const SQUARE = 'width: 28px; height: 28px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center;'
const attackRow = (attack, i) => `          <a href="#" aria-label="{{ p.a${i}Label }}" style="display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center; min-height: 56px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none">
            <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
              <span style="font-size: 14px; line-height: 18px">${attack.name}</span>
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 13px; color: #97A5AA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${attack.types}</span>
            </span>
            <span style="text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 15px">${attack.damage}</span>
            <span aria-hidden="true" style="display: flex; gap: 4px"><span style="${SQUARE} {{ p.a${i}Block }}">${svg(15, P.shield)}</span><span style="${SQUARE} {{ p.a${i}Parry }}">${svg(15, P.parry)}</span><span style="${SQUARE} {{ p.a${i}Dodge }}">${svg(15, P.roll)}</span></span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.chevron}</svg>
          </a>`
const modifierChip = (border, color, icon, label, state) =>
  `<span style="padding: 3px 8px; border-radius: 3px; border: 1px ${border}; color: ${color}">${typeIcon(icon, 'margin-right: 5px')}${label} · <span style="font-weight: 500">${state}</span></span>`

const sheetPhone = frame(
  'p',
  `      <header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px">
        <button type="button" aria-label="Retour" style="flex: none; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${svg(22, P.back)}</button>
        <h2 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">Moder</h2>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #97A5AA">MONTAGNE</span>
      </header>
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 14px">
        <div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: #2C383D; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">PV</span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; line-height: 23px">7&#x202F;500</span></div>
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">À INFLIGER</span><span style="font-size: 13px; line-height: 17px; padding-top: 3px">Ne titube jamais</span></div>
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">TA PARADE</span><span style="font-size: 13px; line-height: 17px; padding-top: 3px; color: #97A5AA">Ne le fait pas tituber</span></div>
        </div>

        ${adviceLine('p', 16, 14)}

        ${effects('p', '#151C1F')}

        <div style="flex: none; display: flex; flex-direction: column; gap: 6px">
          <span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">FAIBLESSES ET RÉSISTANCES</span>
          <div style="display: flex; gap: 6px 8px; flex-wrap: wrap; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 16px">${modifierChip('solid #97A5AA', '#E2E8E8', P.fire, 'FEU', 'FAIBLE ×1,5')}${modifierChip('dashed #2C383D', '#7D8B91', P.frost, 'GLACE', 'IMMUNISÉ ×0')}${modifierChip('dashed #2C383D', '#7D8B91', P.spirit, 'ESPRIT', 'IMMUNISÉ ×0')}<span style="font-size: 11px; color: #7D8B91">Tout le reste ×1</span></div>
        </div>

        <section aria-labelledby="{{ p.attacksId }}" style="flex: none; display: flex; flex-direction: column">
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #2C383D; font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">
            <h3 id="{{ p.attacksId }}" style="margin: 0; font-size: 10px; font-weight: 400">SES ATTAQUES</h3>
            <span style="text-align: right">DÉG.</span>
            <span style="display: flex; gap: 4px">
              <span style="width: 28px; display: flex; justify-content: center"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Blocage">${P.shield}</svg></span>
              <span style="width: 28px; display: flex; justify-content: center"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Parade">${P.parry}</svg></span>
              <span style="width: 28px; display: flex; justify-content: center"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Esquive">${P.roll}</svg></span>
            </span>
            <span></span>
          </div>
${ATTACKS.map(attackRow).join('\n')}
          <span style="padding-top: 10px; font-size: 12px; line-height: 16px; color: #7D8B91">Touche une attaque pour la simuler.</span>
          <button type="button" style="display: flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 4px; font-size: 13px; color: #8EBDE3; text-align: left">${svg(16, P.flag, ' style="flex: none"')}Un chiffre ou un nom faux&nbsp;? Signale-le</button>
        </section>
      </main>`,
)

const simPhone = frame(
  'q',
  `${appHeader.replace('<button type="button" aria-haspopup', '<h2 style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0">Simulation</h2>\n        <button type="button" aria-haspopup')}
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 12px">
        <div role="group" aria-label="Source du coup" style="flex: none; display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden"><button type="button" aria-pressed="true" style="flex: 1; height: 44px; font-size: 13px; background: #8EBDE3; color: #0D1214; font-weight: 500">Attaque d'un monstre</button><button type="button" aria-pressed="false" style="flex: 1; height: 44px; font-size: 13px; color: #97A5AA">Valeur libre</button></div>

        <section aria-label="Le coup" style="flex: none; background: #151C1F; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px">
          <a href="#" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 6px; background: #0D1214; color: #E2E8E8; text-decoration: none">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8EBDE3" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none">${P.creatures}</svg>
            <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 15px; line-height: 20px">Moder · Morsure</span>
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 14px; color: #97A5AA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${typeIcon(P.pierce)}PERFORANT · MÊLÉE · CHANGER</span>
            </span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 22px">120</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none">${P.chevron}</svg>
          </a>
          ${effects('q', '#0D1214')}
          <div style="display: flex; flex-direction: column; gap: 6px">
            <span id="{{ q.barId }}" style="font-size: 11px; line-height: 14px; letter-spacing: 0.08em; color: #97A5AA">BARRE DE STAGGER AVANT LE COUP</span>
            <div role="group" aria-labelledby="{{ q.barId }}" style="display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">
              <sc-for list="{{ q.barOpts }}" as="o" hint-placeholder-count="4">
                <button type="button" onClick="{{ o.pick }}" aria-pressed="{{ o.pressed }}" style="flex: 1; height: 44px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; {{ o.style }}">{{ o.label }}</button>
              </sc-for>
            </div>
          </div>
        </section>

        ${adviceLine('q', 18, 15)}

        <div style="flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">
          <sc-for list="{{ q.cards }}" as="k" hint-placeholder-count="2">
          <div role="group" aria-label="{{ k.label }}" style="min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 6px; background: #151C1F; border: 1px solid {{ k.border }}">
            <span style="font-size: 11px; line-height: 14px; letter-spacing: 0.08em; color: #97A5AA">{{ k.caps }}</span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 14px; line-height: 18px; font-weight: 500; color: {{ k.wordColor }}">{{ k.word }}</span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 22px">{{ k.taken }} <span style="font-size: 11px; color: #7D8B91">subis</span></span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 16px; color: #97A5AA">{{ k.stamina }}</span>
            <div role="img" aria-label="{{ k.barLabel }}" style="height: 8px; display: flex; overflow: hidden; border-radius: 2px; background: #0D1214"><span style="width: {{ k.w0 }}; background: #2C383D"></span><span style="width: {{ k.w1 }}; background: {{ k.c1 }}"></span><span style="width: {{ k.w2 }}; background: {{ k.c2 }}"></span></div>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 14px; color: {{ k.barColor }}">{{ k.barText }}</span>
          </div>
          </sc-for>
        </div>

        <div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 17px; color: #97A5AA">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6CC08A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none">${P.roll}</svg>
          <span>Esquivable en roulade</span>
        </div>
        <button type="button" style="flex: none; align-self: flex-start; display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 13px; color: #8EBDE3; text-align: left">${svg(16, P.flag, ' style="flex: none"')}Ce verdict te paraît faux&nbsp;? Signale-le</button>
      </main>
${nav('simulation')}`,
)

// Only what the player carries can be switched on: the states over those, and whether each changes nothing.
const CARRIED = data.sections.find((s) => s.id === 'yours').rows
const keyOf = (list) => data.order.filter((id) => list.includes(id)).join('+')
const subsets = (ids) => ids.reduce((all, id) => [...all, ...all.map((set) => [...set, id])], [[]])
const KEYS = subsets(CARRIED.filter((id) => data.switches.includes(id))).map(keyOf)
const pick = (states) => Object.fromEntries(KEYS.map((key) => [key, Object.fromEntries(CARRIED.map((id) => [id, states[key][id].muted]))]))
// Why it changes nothing, its main reason in brief, as the generator words it: « pas de feu », « ta cape résiste déjà ».
const why = (states) =>
  Object.fromEntries(KEYS.map((key) => [key, Object.fromEntries(CARRIED.map((id) => [id, states[key][id].brief ?? '']))]))
const shown = {
  order: data.order,
  carried: CARRIED,
  switches: data.switches.filter((id) => CARRIED.includes(id)),
  names: data.names,
  tags: data.tags,
  muted: { moder: pick(data.modal.moder), morsure: data.modal.morsure.map(pick) },
  why: { moder: why(data.modal.moder), morsure: data.modal.morsure.map(why) },
  sheet: Object.fromEntries(KEYS.map((key) => [key, data.sheet[key]])),
  sim: Object.fromEntries(KEYS.map((key) => [key, data.sim[key]])),
}

const PHONES = 6
const WIDTH = 80 + PHONES * 390 + (PHONES - 1) * 32
const logic = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    // The states of the switches over what the player carries, from the app's engine and model (states.mts).
    this.data = ${JSON.stringify(shown)};
    this.state = this.start();
  }
  // Phone 3 has its own switches; phones 4 and 5 share theirs, as the sheet and the Simulation would.
  start() {
    return {
      on: ['broche', 'masse'],
      s1: { on: [], open: false },
      s2: { open: true },
      m1: { open: false, bar: 0 }
    };
  }
  renderVals() {
    const D = this.data;
    const TONES = {
      ok: { fg: '#6CC08A', fill: '#2E7A4B', border: '#2C383D' },
      warn: { fg: '#D9A043', fill: '#B5760C', border: '#B5760C' },
      bad: { fg: '#E36B5E', fill: '#7A2A24', border: '#7A2A24' },
      none: { fg: '#97A5AA', fill: '#2C383D', border: '#2C383D' }
    };
    const LABELS = {
      s1: "3 · LA FICHE DE MODER · RIEN D'ALLUMÉ",
      s2: '4 · LA FICHE · TES EFFETS DÉPLIÉS',
      m1: '5 · LA SIMULATION DE LA MORSURE'
    };
    const BARS = [0, 25, 50, 75];
    const keyOf = (list) => D.order.filter((id) => list.indexOf(id) !== -1).join('+');
    const sorted = (list) => D.order.filter((id) => list.indexOf(id) !== -1);
    const joinFr = (items) => (items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1]);
    const set = (id, change) => this.setState({ [id]: Object.assign({}, this.state[id], change) });
    const onOf = (id) => (id === 's1' ? this.state.s1.on : this.state.on);
    const setOn = (id, list) => (id === 's1' ? set('s1', { on: list }) : this.setState({ on: list }));
    const advice = (shown) => ({
      adviceText: shown.text,
      adviceColor: TONES[shown.tone].fg,
      adviceOk: shown.tone === 'ok',
      adviceWarn: shown.tone === 'warn',
      adviceBad: shown.tone === 'bad'
    });
    // What changes nothing says so, with its main reason: against the creature on the sheet, the attack in the Simulation.
    const card = (id, muted, why) => {
      const phone = this.state[id];
      const on = onOf(id);
      return {
        label: LABELS[id],
        open: phone.open,
        expanded: String(phone.open),
        fold: () => set(id, { open: !phone.open }),
        chevron: phone.open ? 'rotate(180deg)' : 'none',
        listId: id + '-effects',
        summary: on.length ? joinFr(sorted(on).map((e) => D.names[e])) : 'Aucun allumé',
        rows: D.carried.map((e, i) => {
          const lit = on.indexOf(e) !== -1;
          const nothing = muted[e];
          return {
            id: id + '-' + e,
            tagId: id + '-' + e + '-tag',
            name: D.names[e],
            nameColor: nothing ? '#97A5AA' : '#E2E8E8',
            tag: D.tags[e],
            hasNote: nothing,
            noteId: id + '-' + e + '-note',
            note: 'Ne change rien\\u00a0: ' + why[e],
            describedBy: id + '-' + e + '-tag' + (nothing ? ' ' + id + '-' + e + '-note' : ''),
            divider: i === 0 ? 'none' : '1px solid #1F2A2E',
            // What changes nothing against this creature has no switch, unless it is on.
            switchable: D.switches.indexOf(e) !== -1 && (lit || !nothing),
            checked: String(lit),
            track: lit ? '#8EBDE3' : '#2C383D',
            trackBorder: lit ? '#8EBDE3' : '#7D8B91',
            knob: lit ? '18px' : '2px',
            knobColor: lit ? '#0D1214' : '#97A5AA',
            toggle: () => setOn(id, sorted(lit ? on.filter((x) => x !== e) : on.concat([e])))
          };
        })
      };
    };
    const square = (tone) => 'border: 1px solid ' + TONES[tone].fill + '; color: ' + TONES[tone].fg;
    const sheets = ['s1', 's2'].map((id) => {
      const key = keyOf(onOf(id));
      const sheet = D.sheet[key];
      const vals = Object.assign(card(id, D.muted.moder[key], D.why.moder[key]), advice(sheet.advice), { attacksId: id + '-attacks' });
      const types = ['perforant', 'coupant', 'glace et perforant', 'glace'];
      const damages = [120, 110, 230, 200];
      sheet.attacks.forEach((a, i) => {
        vals['a' + i + 'Block'] = square(a.block);
        vals['a' + i + 'Parry'] = square(a.parry);
        vals['a' + i + 'Dodge'] = square(a.dodge);
        vals['a' + i + 'Label'] = a.name + ', ' + types[i] + ', ' + damages[i] + ' dégâts. Blocage\\u00a0: ' + a.blockWord +
          '. Parade\\u00a0: ' + a.parryWord + '. Esquivable. Ouvrir la simulation.';
      });
      return vals;
    });
    const sims = ['m1'].map((id) => {
      const phone = this.state[id];
      const key = keyOf(onOf(id));
      const result = D.sim[key][phone.bar];
      const face = (label, r) => ({
        label: label,
        caps: label.toUpperCase(),
        word: r.word,
        wordColor: TONES[r.tone].fg,
        border: TONES[r.tone].border,
        taken: r.taken,
        stamina: r.stamina,
        w0: r.widths[0] + '%',
        w1: r.widths[1] + '%',
        w2: r.widths[2] + '%',
        c1: TONES[r.tone].fill,
        c2: TONES[r.tone].fg,
        barText: r.barText,
        barColor: r.overflows ? TONES[r.tone].fg : '#7D8B91',
        barLabel: r.barLabel
      });
      return Object.assign(card(id, D.muted.morsure[phone.bar][key], D.why.morsure[phone.bar][key]), advice(result.advice), {
        barId: id + '-bar',
        barOpts: BARS.map((value, i) => ({
          label: value + '\\u00a0%',
          pressed: String(i === phone.bar),
          style: i === phone.bar ? 'background: #8EBDE3; color: #0D1214; font-weight: 500' : 'color: #97A5AA',
          pick: () => set(id, { bar: i })
        })),
        cards: [face('En bloquant', result.block), face('En parant', result.parry)]
      });
    });
    return { sheets: sheets, sims: sims, reset: () => this.setState(this.start()) };
  }
}`

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Équipement — piste C, itération 3</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500&amp;display=swap">
<style>
body{margin:0}
:root{color-scheme:dark}
*{scrollbar-width:thin;scrollbar-color:#2C383D transparent}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
input,select{font:inherit;color:inherit;margin:0}
input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
a{color:#8EBDE3}a:hover{color:#B5D4F0}
</style>
</helmet>
<div style="width: ${WIDTH}px; height: 1060px; box-sizing: border-box; padding: 40px; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 24px">
  <header style="flex: none; display: flex; flex-direction: column; gap: 6px">
    <div style="display: flex; align-items: center; gap: 16px">
      <h1 style="margin: 0; font-size: 26px; line-height: 1.2; font-weight: 500">C · itération 3 · tes effets temporaires, dépliés sur place</h1>
      <button type="button" onClick="{{ reset }}" style="display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border: 1px solid #2C383D; border-radius: 4px; font-size: 13px; color: #8EBDE3">${svg(16, P.reset)}Revenir au départ</button>
    </div>
    <p style="margin: 0; max-width: ${WIDTH - 88}px; font-size: 15px; line-height: 1.4; color: #97A5AA">Plus d'écran «&nbsp;Ce qui t'aiderait&nbsp;»&nbsp;: sur la fiche (3, 4) comme dans la Simulation (5), la carte «&nbsp;Avec tes effets temporaires&nbsp;» se déplie et liste ce que tu emportes, défini dans Ton équipement (1)&nbsp;: ton bibelot, ton pouvoir, tes boissons, chacun avec son interrupteur. Rien n'est allumé en arrivant&nbsp;: les verdicts sont ceux de tes pièces seules, comme dans le Bestiaire (2). Ce que tu allumes compte aussitôt, sur la fiche et dans la Simulation de ses attaques, jusqu'à ce que tu changes de créature. Contre Moder, ta Broche en fer et ton pouvoir Masse-d'Os ne changent aucun verdict&nbsp;: leurs chiffres se lisent dans la Simulation.</p>
    <p style="margin: 0; max-width: ${WIDTH - 88}px; font-size: 13px; line-height: 1.4; color: #7D8B91">À essayer en lecture (Play)&nbsp;: déplier, allumer, éteindre, la barre de stagger&nbsp;; «&nbsp;Revenir au départ&nbsp;» remet tout. Les téléphones 4 et 5 partagent ce qui est allumé, le 3 a le sien. Choix à valider&nbsp;: dans Ton équipement, une ligne par boisson, comme le bibelot et le pouvoir, et «&nbsp;Ajouter une boisson&nbsp;»&nbsp;; un ensemble ne s'affiche que complet, sous son nom du jeu, et seulement s'il change un combat (1 bis&nbsp;: «&nbsp;ENSEMBLE COMPLET&nbsp;» sous tes résistances, avec ce qu'il change, et sa résistance rejoint les autres)&nbsp;; seul ce que tu emportes est listé (plus de «&nbsp;Les autres&nbsp;» ni d'«&nbsp;À double tranchant&nbsp;»)&nbsp;; une boisson qui ne change rien contre la créature est grisée, sans interrupteur, et le dit en troisième ligne, avec sa raison principale, en bref («&nbsp;Ne change rien&nbsp;: ta cape résiste déjà&nbsp;», «&nbsp;…&nbsp;: pas de feu&nbsp;»)&nbsp;; repliée, la carte nomme ce qui est allumé, «&nbsp;Aucun allumé&nbsp;» sinon&nbsp;; une ligne au pied de la carte dépliée dit jusqu'à quand ça vaut. EN&nbsp;: «&nbsp;With your temporary effects&nbsp;», «&nbsp;None on&nbsp;», «&nbsp;Changes nothing: your cape already resists&nbsp;», «&nbsp;Holds until you switch creatures&nbsp;».</p>
  </header>
  <div style="flex: none; display: flex; gap: 32px; align-items: flex-start">
${firstPhone}

${setPhone}

${bestiaryPhone}

    <sc-for list="{{ sheets }}" as="p" hint-placeholder-count="2">
    ${sheetPhone}
    </sc-for>

    <sc-for list="{{ sims }}" as="q" hint-placeholder-count="1">
    ${simPhone}
    </sc-for>
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${WIDTH},"height":1060}}'>
${logic}
</script>
</body>
</html>
`
writeFileSync(new URL('Equipement-C4.dc.html', PROJECT), html, 'utf8')
console.log('width', WIDTH, 'bytes', html.length, 'keys', KEYS)
