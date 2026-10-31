// Adds the « Équipement → Arsenal · pistes » page to canvas.json, after the Arsenal's: the three tracks' phones on a
// row, their desktops under.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const PAGE = 'choix'
const H = 1220
const D_TOP = H + 400
// Iteration 1 of track A under the tracks: its phones, then its desktops.
const I_TOP = D_TOP + 900 + 400
const I_D_TOP = I_TOP + H + 400

const entries = [
  ['Choix-A.dc.html', { x: 0, y: 0, w: 1314, h: H, title: 'Piste A · la liste de l’Arsenal, dans Ton équipement' }],
  ['Choix-B.dc.html', { x: 1394, y: 0, w: 1314, h: H, title: 'Piste B · aller dans l’Arsenal pour choisir' }],
  ['Choix-C.dc.html', { x: 2788, y: 0, w: 892, h: H, title: 'Piste C · des listes plus parlantes, sur place' }],
  ['Choix-A-Desktop.dc.html', { x: 0, y: D_TOP, w: 1440, h: 900, title: 'Piste A · desktop' }],
  ['Choix-B-Desktop.dc.html', { x: 1520, y: D_TOP, w: 1440, h: 900, title: 'Piste B · desktop' }],
  ['Choix-C-Desktop.dc.html', { x: 3040, y: D_TOP, w: 1440, h: 900, title: 'Piste C · desktop' }],
  ['Choix-A1.dc.html', { x: 0, y: I_TOP, w: 2158, h: H, title: 'Itération 1 · A, pour chaque ligne' }],
  ['Choix-A1-Desktop-1.dc.html', { x: 0, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · desktop · ce que tu tiens' }],
  ['Choix-A1-Desktop-2.dc.html', { x: 1520, y: I_D_TOP, w: 1440, h: 900, title: 'Itération 1 · desktop · ton bibelot' }],
].map(([file, entry]) => [file, { ...entry, page: PAGE }])
const notes = {
  'choix-row1': { kind: 'title1', text: 'De Ton équipement à l’Arsenal · téléphone', x: 0, y: -300, maxW: 3680, page: PAGE },
  'choix-row2': { kind: 'title1', text: 'Les mêmes pistes · desktop', x: 0, y: D_TOP - 300, maxW: 4480, page: PAGE },
  'choix-row3': { kind: 'title1', text: 'Itération 1 · A, pour chaque ligne · téléphone', x: 0, y: I_TOP - 300, maxW: 2158, page: PAGE },
  'choix-row4': { kind: 'title1', text: 'Itération 1 · A · desktop', x: 0, y: I_D_TOP - 300, maxW: 2960, page: PAGE },
}

if (!index.pages.some((p) => p.id === PAGE)) {
  const at = index.pages.findIndex((p) => p.id === 'arsenal') + 1
  index.pages.splice(at, 0, { id: PAGE, name: 'Équipement → Arsenal · pistes' })
}
const names = new Set(entries.map(([file]) => file))
const kept = Object.entries(index.boards).filter(([file]) => !names.has(file))
const at = kept.findIndex(([file]) => file === 'Arsenal-AC-Desktop-4.dc.html') + 1
index.boards = Object.fromEntries([...kept.slice(0, at), ...entries, ...kept.slice(at)])
index.order = Object.keys(index.boards)
const keptNotes = Object.entries(index.notes).filter(([key]) => !(key in notes))
const noteAt = keptNotes.findIndex(([key]) => key === 'arsenal-row4') + 1
index.notes = Object.fromEntries([...keptNotes.slice(0, noteAt), ...Object.entries(notes), ...keptNotes.slice(noteAt)])
// The editor keeps its own order of the notes: ours go after the Arsenal's, the others stay where they are.
if (Array.isArray(index.noteOrder)) {
  const order = index.noteOrder.filter((key) => !(key in notes))
  const after = order.indexOf('arsenal-row4') + 1
  index.noteOrder = after > 0 ? [...order.slice(0, after), ...Object.keys(notes), ...order.slice(after)] : [...order, ...Object.keys(notes)]
}
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('pages', index.pages.length, 'boards', Object.keys(index.boards).length, 'notes', Object.keys(index.notes).length)
