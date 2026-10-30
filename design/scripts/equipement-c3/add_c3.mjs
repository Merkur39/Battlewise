// Adds iteration 2 of track C under iteration 1, on the « Équipement · pistes » page of design/canvas/project/canvas.json.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const name = 'Equipement-C3.dc.html'
const entry = {
  x: 0,
  y: 5600,
  w: 3002,
  h: 1080,
  title: "Piste C · itération 2 · « Ce qui t'aiderait » en plein écran, à essayer",
  page: 'equipement',
  is_interactive: true,
}
const entries = Object.entries(index.boards).filter(([key]) => key !== name)
const at = entries.findIndex(([key]) => key === 'Equipement-C2.dc.html') + 1
index.boards = Object.fromEntries([...entries.slice(0, at), [name, entry], ...entries.slice(at)])
index.order = Object.keys(index.boards)
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('boards', Object.keys(index.boards).length)
