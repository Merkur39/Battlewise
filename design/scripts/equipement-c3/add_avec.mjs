// Adds the « Avec » variants under iteration 2 of track C, on the « Équipement · pistes » page of canvas.json.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const name = 'Equipement-C3-Avec.dc.html'
const entry = {
  x: 0,
  y: 6800,
  w: 1330,
  h: 1000,
  title: '« Avec » : trois façons de montrer ce qui est appliqué · C retenue',
  page: 'equipement',
}
const entries = Object.entries(index.boards).filter(([key]) => key !== name)
const at = entries.findIndex(([key]) => key === 'Equipement-C3.dc.html') + 1
index.boards = Object.fromEntries([...entries.slice(0, at), [name, entry], ...entries.slice(at)])
index.order = Object.keys(index.boards)
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('boards', Object.keys(index.boards).length)
