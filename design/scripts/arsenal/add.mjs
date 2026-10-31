// Adds the « Arsenal · pistes » page to canvas.json: the three tracks' phones on a row, their desktops under.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const PAGE = 'arsenal'
const H = 1220
const D_TOP = H + 400
// Iteration 1 under the tracks: A's phones, then C's desktops.
const I_TOP = D_TOP + 900 + 400
const I_D_TOP = I_TOP + 1160 + 400

const entries = [
  ['Arsenal-A.dc.html', { x: 0, y: 0, w: 892, h: H, title: 'Piste A · deux étages : la famille, puis sa catégorie' }],
  ['Arsenal-B.dc.html', { x: 972, y: 0, w: 892, h: H, title: 'Piste B · une seule rangée qui défile' }],
  ['Arsenal-C.dc.html', { x: 1944, y: 0, w: 1314, h: H, title: 'Piste C · un sélecteur de catégorie' }],
  ['Arsenal-A-Desktop.dc.html', { x: 0, y: D_TOP, w: 1440, h: 900, title: 'Piste A · desktop' }],
  ['Arsenal-B-Desktop.dc.html', { x: 1520, y: D_TOP, w: 1440, h: 900, title: 'Piste B · desktop' }],
  ['Arsenal-C-Desktop.dc.html', { x: 3040, y: D_TOP, w: 1440, h: 900, title: 'Piste C · desktop' }],
  ['Arsenal-AC.dc.html', { x: 0, y: I_TOP, w: 1736, h: 1160, title: 'Itération 1 · A sur téléphone, « En main »' }],
  ['Arsenal-AC-Desktop-1.dc.html', { x: 0, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · C sur desktop · boucliers' }],
  ['Arsenal-AC-Desktop-2.dc.html', { x: 1520, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · C sur desktop · plastrons' }],
  ['Arsenal-AC-Desktop-3.dc.html', { x: 3040, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · C sur desktop · boissons' }],
  ['Arsenal-AC-Desktop-4.dc.html', { x: 4560, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · C sur desktop · recherche « fer »' }],
].map(([file, entry]) => [file, { ...entry, page: PAGE }])
const notes = {
  'arsenal-row1': { kind: 'title1', text: "L'Arsenal avec les pièces d'armures et ce que tu emportes · téléphone", x: 0, y: -300, maxW: 3258, page: PAGE },
  'arsenal-row2': { kind: 'title1', text: 'Les mêmes pistes · desktop', x: 0, y: D_TOP - 300, maxW: 4480, page: PAGE },
  'arsenal-row3': { kind: 'title1', text: 'Itération 1 · A sur téléphone', x: 0, y: I_TOP - 300, maxW: 1736, page: PAGE },
  'arsenal-row4': { kind: 'title1', text: 'Itération 1 · C sur desktop', x: 0, y: I_D_TOP - 300, maxW: 6000, page: PAGE },
}

if (!index.pages.some((p) => p.id === PAGE)) {
  const at = index.pages.findIndex((p) => p.id === 'equipement') + 1
  index.pages.splice(at, 0, { id: PAGE, name: 'Arsenal · pistes' })
}
const names = new Set(entries.map(([file]) => file))
const kept = Object.entries(index.boards).filter(([file]) => !names.has(file))
const at = kept.findIndex(([file]) => file === 'Equipement-C4.dc.html') + 1
index.boards = Object.fromEntries([...kept.slice(0, at), ...entries, ...kept.slice(at)])
index.order = Object.keys(index.boards)
const keptNotes = Object.entries(index.notes).filter(([key]) => !(key in notes))
const noteAt = keptNotes.findIndex(([key]) => key === 'equipement-row1') + 1
index.notes = Object.fromEntries([...keptNotes.slice(0, noteAt), ...Object.entries(notes), ...keptNotes.slice(noteAt)])
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('pages', index.pages.length, 'boards', Object.keys(index.boards).length, 'notes', Object.keys(index.notes).length)
