import { describe, expect, it } from 'vitest'
import { licencesText, packageOf, readPackage, withDependencies, type Package } from './licences'

const mit = (name: string, version: string, holder: string): Package => ({
  name,
  version,
  licence: 'MIT',
  text: `MIT License\n\nCopyright (c) ${holder}\n\nPermission is hereby granted…`,
})

describe('the package a bundled module comes from', () => {
  it('is read from its path in node_modules, scoped or not', () => {
    expect(packageOf('/app/node_modules/react-dom/cjs/react-dom.production.js')).toBe('react-dom')
    expect(packageOf('C:\\app\\node_modules\\@fontsource\\ibm-plex-sans\\400.css')).toBe(
      '@fontsource/ibm-plex-sans',
    )
  })

  it('is the innermost one when a package carries its own node_modules', () => {
    expect(packageOf('/app/node_modules/react-dom/node_modules/scheduler/index.js?commonjs')).toBe(
      'scheduler',
    )
  })

  it("is none for the app's own files and for Vite's virtual modules", () => {
    expect(packageOf('/app/src/main.tsx')).toBeUndefined()
    expect(packageOf('\0vite/preload-helper.js')).toBeUndefined()
  })
})

describe('a package as installed', () => {
  it('gives its version, its licence and the text of its licence file', () => {
    const react = readPackage('react')

    expect(react.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(react.licence).toBe('MIT')
    expect(react.text).toMatch(/^MIT License\n\nCopyright \(c\) Meta Platforms/)
  })
})

describe('the packages the service worker is built from', () => {
  it('take in what they depend on, each once', () => {
    expect(withDependencies(['workbox-precaching', 'workbox-routing']).sort()).toEqual([
      'workbox-core',
      'workbox-precaching',
      'workbox-routing',
      'workbox-strategies',
    ])
  })
})

describe('licences.txt', () => {
  const text = licencesText('Foelore 1.10.0', [
    mit('workbox-core', '7.4.1', '2018 Google LLC'),
    mit('react-dom', '19.3.1', 'Meta Platforms, Inc. and affiliates.'),
    mit('react', '19.3.1', 'Meta Platforms, Inc. and affiliates.'),
    mit('workbox-routing', '7.4.1', '2018 Google LLC'),
  ])

  it('starts with a byte order mark: a browser reads it as UTF-8 whatever charset the host sends', () => {
    expect(text.charCodeAt(0)).toBe(0xfeff)
  })

  it('opens on the app and what the file holds, in both languages', () => {
    expect(text.slice(1)).toMatch(/^Foelore 1\.10\.0 · third-party licences · licences tierces\n/)
    expect(text).toContain('The code and fonts of other projects that ship with the app')
    expect(text).toContain("Le code et les polices d'autres projets livrés avec l'app")
  })

  it('puts the packages that share a licence text under one heading, in name order', () => {
    const headings = text.split('\n').filter((line) => line.endsWith(' · MIT'))

    expect(headings).toEqual([
      'react 19.3.1, react-dom 19.3.1 · MIT',
      'workbox-core 7.4.1, workbox-routing 7.4.1 · MIT',
    ])
  })

  it('gives each licence text in full, once', () => {
    expect(text.match(/Copyright \(c\) Meta Platforms/g)).toHaveLength(1)
    expect(text.match(/Copyright \(c\) 2018 Google LLC/g)).toHaveLength(1)
    expect(text.endsWith('Permission is hereby granted…\n')).toBe(true)
  })
})
