// Adds iteration 3 of track C under the « Avec » variants, on the « Équipement · pistes » page of canvas.json.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const name = 'Equipement-C4.dc.html'
const entry = {
  x: 0,
  y: 7920,
  w: 2580,
  h: 1060,
  title: 'Piste C · itération 3 · tes effets temporaires, dépliés sur place',
  is_interactive: true,
  page: 'equipement',
}
const entries = Object.entries(index.boards).filter(([key]) => key !== name)
const at = entries.findIndex(([key]) => key === 'Equipement-C3-Avec.dc.html') + 1
index.boards = Object.fromEntries([...entries.slice(0, at), [name, entry], ...entries.slice(at)])
index.order = Object.keys(index.boards)
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('boards', Object.keys(index.boards).length)
