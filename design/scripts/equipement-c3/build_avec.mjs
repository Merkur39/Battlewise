// Builds Equipement-C3-Avec.dc.html: three ways to show what is applied (« Avec : … ») on Moder's sheet and in
// the Simulation, as phone fragments side by side. Static: the chosen one goes back into Equipement-C3.
// Run from this folder: node build_avec.mjs
import { writeFileSync } from 'node:fs'

const PROJECT = new URL('../../canvas/project/', import.meta.url)

const svg = (size, paths, color = 'currentColor', extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${size >= 20 ? '1.75' : '2'}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`
const P = {
  back: '<path d="M19 12H5M11 6l-6 6 6 6"></path>',
  close: '<path d="M6 6l12 12M18 6L6 18"></path>',
  chevron: '<path d="M9 6l6 6-6 6"></path>',
  check: '<path d="M5 12l5 5L20 7"></path>',
  bulb: '<path d="M9 18h6M10 21h4"></path><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"></path>',
  creatures:
    '<circle cx="6.5" cy="10" r="2"></circle><circle cx="12" cy="6.5" r="2"></circle><circle cx="17.5" cy="10" r="2"></circle><path d="M8 18c0-3 1.8-5 4-5s4 2 4 5c0 1.7-1.8 2.5-4 2.5S8 19.7 8 18z"></path>',
  pierce: '<path d="M20 4l-7 3 4 4zM15 9L4 20"></path>',
  fire: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z"></path>',
}
const typeIcon = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12" style="vertical-align: -2px; margin-right: 3px">${path}</svg>`
const APPLIED = [
  { name: 'Broche en fer', tag: 'BIBELOT · 30 S', remove: 'Retirer ta Broche en fer' },
  { name: "Masse-d'Os", tag: 'POUVOIR · 5 MIN', remove: "Retirer ton pouvoir Masse-d'Os" },
  { name: 'Pouvoir de Fader', tag: 'POUVOIR · 5 MIN', remove: 'Retirer le Pouvoir de Fader' },
]
const listed = "Broche en fer, Masse-d'Os et Pouvoir de Fader"

// A: one card, the same as when nothing is applied; what is applied is changed in « Ce qui t'aiderait ».
const cardA = (surface) => `<button type="button" aria-haspopup="dialog" style="flex: none; display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; box-sizing: border-box; padding: 8px 12px; border: 1px solid #2C383D; border-radius: 6px; background: ${surface}; text-align: left">
            ${svg(20, P.bulb, '#8EBDE3', ' style="flex: none"')}
            <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 15px; line-height: 20px; color: #E2E8E8">Ce qui t'aiderait</span>
              <span style="font-size: 12px; line-height: 16px; color: #97A5AA">Avec ${listed}</span>
            </span>
            ${svg(16, P.chevron, '#7D8B91', ' style="flex: none"')}
          </button>`

// B: a header line with the way in, then the chips on one line that scrolls sideways.
const chipB = ({ name, remove }) =>
  `<span style="flex: none; display: inline-flex; align-items: center; gap: 2px; height: 28px; padding: 0 2px 0 10px; box-sizing: border-box; border: 1px solid #8EBDE3; border-radius: 14px; background: #1D3344; font-size: 12px; color: #E2E8E8; white-space: nowrap">${name}<button type="button" aria-label="${remove}" style="width: 44px; height: 44px; margin: -8px -12px -8px -10px; display: flex; align-items: center; justify-content: center; color: #8EBDE3">${svg(12, P.close)}</button></span>`
const blockB = (surface) => `<div style="flex: none; display: flex; flex-direction: column; gap: 4px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: -8px 0 -6px">
              <span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">AVEC 3 EFFETS</span>
              <button type="button" aria-haspopup="dialog" style="display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 13px; color: #8EBDE3">${svg(16, P.bulb)}Ce qui t'aiderait</button>
            </div>
            <div style="position: relative">
              <div role="list" aria-label="Effets appliqués" style="display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none">${APPLIED.map((x) => `<span role="listitem" style="display: contents">${chipB(x)}</span>`).join('')}</div>
              <div aria-hidden="true" style="position: absolute; top: 0; right: 0; bottom: 0; width: 24px; background: linear-gradient(to right, transparent, ${surface})"></div>
            </div>
          </div>`

// C: a card that lists what is applied, one row each, with the way in at its head.
const rowC = ({ name, tag, remove }, last) =>
  `<div role="listitem" style="display: flex; align-items: center; gap: 8px; min-height: 40px; padding-left: 12px${last ? '' : '; border-bottom: 1px solid #1F2A2E'}"><span style="flex: 1; min-width: 0; font-size: 14px; line-height: 18px; color: #E2E8E8">${name}</span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: #7D8B91">${tag}</span><button type="button" aria-label="${remove}" style="flex: none; width: 44px; height: 40px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${svg(14, P.close)}</button></div>`
const blockC = (surface) => `<div style="flex: none; border: 1px solid #2C383D; border-radius: 6px; background: ${surface}">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px; padding: 0 4px 0 12px; border-bottom: 1px solid #1F2A2E">
              <span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">AVEC</span>
              <button type="button" aria-haspopup="dialog" style="display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 8px; font-size: 13px; color: #8EBDE3">${svg(16, P.bulb)}Ce qui t'aiderait</button>
            </div>
            <div role="list" aria-label="Effets appliqués">${APPLIED.map((x, i) => rowC(x, i === APPLIED.length - 1)).join('')}</div>
          </div>`

const fragment = (label, body) => `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; color: #7D8B91">${label}</span><div style="position: relative; width: 390px; height: 340px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 8px; overflow: hidden; background: #0D1214; display: flex; flex-direction: column">
${body}
          <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: linear-gradient(transparent, #0D1214)"></div>
        </div></div>`

// Moder's sheet down to its weaknesses, with what is applied.
const sheet = (block) =>
  fragment(
    'LA FICHE',
    `      <header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px">
        <button type="button" aria-label="Retour" style="flex: none; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #97A5AA">${svg(22, P.back)}</button>
        <h2 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">Moder</h2>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #97A5AA">MONTAGNE</span>
      </header>
      <div style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 14px">
        <div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: #2C383D; border: 1px solid #2C383D; border-radius: 6px; overflow: hidden">
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">PV</span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; line-height: 23px">7&#x202F;500</span></div>
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">À INFLIGER</span><span style="font-size: 13px; line-height: 17px; padding-top: 3px">Ne titube jamais</span></div>
          <div style="background: #151C1F; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">TA PARADE</span><span style="font-size: 13px; line-height: 17px; padding-top: 3px; color: #97A5AA">Ne le fait pas tituber</span></div>
        </div>
        <div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; line-height: 18px; color: #6CC08A">${svg(16, P.check, 'currentColor', ' style="flex: none"').replace('stroke-width="2"', 'stroke-width="2.25"')}<span>Tu bloques tout sans tituber</span></div>
        ${block('#151C1F')}
        <div style="flex: none; display: flex; flex-direction: column; gap: 6px">
          <span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">FAIBLESSES ET RÉSISTANCES</span>
          <div style="display: flex; gap: 6px 8px; flex-wrap: wrap; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 12px; line-height: 16px"><span style="padding: 3px 8px; border-radius: 3px; border: 1px solid #97A5AA; color: #E2E8E8">${typeIcon(P.fire)}FEU · <span style="font-weight: 500">FAIBLE ×1,5</span></span></div>
        </div>
      </div>`,
  )

// The Simulation's « Le coup », with what is applied under the attack.
const simulation = (block) =>
  fragment(
    'LA SIMULATION',
    `      <div style="flex: 1; min-height: 0; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px">
        <section aria-label="Le coup" style="flex: none; background: #151C1F; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px">
          <a href="#" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 6px; background: #0D1214; color: #E2E8E8; text-decoration: none">
            ${svg(22, P.creatures, '#8EBDE3', ' style="flex: none"')}
            <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 15px; line-height: 20px">Moder · Morsure</span>
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 14px; color: #97A5AA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${typeIcon(P.pierce)}PERFORANT · MÊLÉE · CHANGER</span>
            </span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 22px">120</span>
          </a>
          ${block('#0D1214')}
          <div style="display: flex; flex-direction: column; gap: 6px">
            <span style="font-size: 11px; line-height: 14px; letter-spacing: 0.08em; color: #97A5AA">BARRE DE STAGGER AVANT LE COUP</span>
            <div style="display: flex; border: 1px solid #2C383D; border-radius: 4px; overflow: hidden">${['0', '25', '50', '75']
              .map(
                (v, i) =>
                  `<button type="button" aria-pressed="${i === 0}" style="flex: 1; height: 44px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; ${i === 0 ? 'background: #8EBDE3; color: #0D1214; font-weight: 500' : 'color: #97A5AA'}">${v}&nbsp;%</button>`,
              )
              .join('')}</div>
          </div>
        </section>
      </div>`,
  )

const VARIANTS = [
  {
    id: 'A',
    title: 'A · UNE SEULE CARTE',
    note: "La même carte que quand rien n'est appliqué («&nbsp;Verdicts sans ta Broche en fer ni ton pouvoir Masse-d'Os&nbsp;»), qui nomme ce qui l'est. On retire un effet dans «&nbsp;Ce qui t'aiderait&nbsp;».",
    block: cardA,
  },
  {
    id: 'B',
    title: 'B · UNE LIGNE DE PUCES',
    note: "Un titre avec le nombre et l'accès à «&nbsp;Ce qui t'aiderait&nbsp;», puis les puces sur une seule ligne qui défile de côté. On retire un effet d'un geste.",
    block: blockB,
  },
  {
    id: 'C',
    title: 'C · UNE LISTE',
    note: "Une carte qui liste ce qui est appliqué, avec sa nature et sa durée, et l'accès à «&nbsp;Ce qui t'aiderait&nbsp;» en tête. Plus haute, mais tout est aligné.",
    block: blockC,
  },
]

const COLUMNS = VARIANTS.length
const WIDTH = 80 + COLUMNS * 390 + (COLUMNS - 1) * 40
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Équipement — « Avec », trois façons</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500&amp;display=swap">
<style>
body{margin:0}
:root{color-scheme:dark}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
a{color:#8EBDE3}a:hover{color:#B5D4F0}
</style>
</helmet>
<div style="width: ${WIDTH}px; height: 1000px; box-sizing: border-box; padding: 40px; background: #0D1214; color: #E2E8E8; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 24px">
  <header style="flex: none; display: flex; flex-direction: column; gap: 6px">
    <h1 style="margin: 0; font-size: 26px; line-height: 1.2; font-weight: 500">«&nbsp;Avec&nbsp;»&nbsp;: trois façons de montrer ce qui est appliqué</h1>
    <p style="margin: 0; max-width: ${WIDTH - 80}px; font-size: 15px; line-height: 1.4; color: #97A5AA">Sur la fiche de Moder et dans la Simulation, avec ta Broche en fer, ton pouvoir Masse-d'Os et le Pouvoir de Fader appliqués. Dans les trois, la phrase «&nbsp;Vaut pour la fiche de Moder et la Simulation de ses attaques…&nbsp;» ne reste qu'au pied de «&nbsp;Ce qui t'aiderait&nbsp;», là où l'on applique.</p>
  </header>
  <div style="flex: none; display: flex; gap: 40px; align-items: flex-start">
${VARIANTS.map(
  (v) => `    <div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 16px">
      <div style="display: flex; flex-direction: column; gap: 6px">
        <span style="font-size: 13px; line-height: 1.2; letter-spacing: 0.08em; color: #E2E8E8">${v.title}</span>
        <p style="margin: 0; font-size: 13px; line-height: 1.4; color: #97A5AA">${v.note}</p>
      </div>
      ${sheet(v.block)}
      ${simulation(v.block)}
    </div>`,
).join('\n')}
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${WIDTH},"height":1000}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`
writeFileSync(new URL('Equipement-C3-Avec.dc.html', PROJECT), html, 'utf8')
console.log('width', WIDTH, 'bytes', html.length)
