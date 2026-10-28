import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** A package of node_modules, as the licence notices name it. */
export interface Package {
  readonly name: string
  readonly version: string
  /** Its SPDX identifier, from its package.json. */
  readonly licence: string
  /** Its licence file, word for word. */
  readonly text: string
}

/** The package a module of the build belongs to, from its path; none for the app's own files. */
export function packageOf(id: string): string | undefined {
  return /.*[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/?]+)/.exec(id)?.[1]?.replace('\\', '/')
}

const manifestOf = (name: string, root: string) =>
  JSON.parse(readFileSync(join(root, name, 'package.json'), 'utf8')) as {
    readonly version: string
    readonly license: string
    readonly dependencies?: Readonly<Record<string, string>>
  }

/** A package as installed under `root`: its version, its licence and its licence file. */
export function readPackage(name: string, root = 'node_modules'): Package {
  const { version, license } = manifestOf(name, root)
  const file = readdirSync(join(root, name)).find((entry) => /^licen[cs]e/i.test(entry))
  if (file === undefined) throw new Error(`${name} carries no licence file`)
  const text = readFileSync(join(root, name, file), 'utf8')
    .replaceAll('\r\n', '\n')
    .trim()
  return { name, version, licence: license, text }
}

/** These packages and every package they depend on, each once. Type packages ship no code. */
export function withDependencies(names: readonly string[], root = 'node_modules'): string[] {
  const found = new Set<string>()
  const visit = (name: string) => {
    if (found.has(name) || name.startsWith('@types/')) return
    found.add(name)
    Object.keys(manifestOf(name, root).dependencies ?? {}).forEach(visit)
  }
  names.forEach(visit)
  return [...found]
}

const RULE = '-'.repeat(72)
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

/** licences.txt: the code and fonts of other projects that ship with the app, each licence text in
 * full once, under the packages that share it. It opens on a byte order mark: a host may serve it
 * as text/plain without a charset, which a browser would read as Latin-1. */
export function licencesText(title: string, packages: readonly Package[]): string {
  const groups = new Map<string, Package[]>()
  for (const pkg of [...packages].sort((a, b) => a.name.localeCompare(b.name))) {
    groups.set(pkg.text, [...(groups.get(pkg.text) ?? []), pkg])
  }
  const sections = [...groups].map(([text, members]) => {
    const names = members.map(({ name, version }) => `${name} ${version}`).join(', ')
    const licences = [...new Set(members.map(({ licence }) => licence))].join(', ')
    return `${RULE}\n${names} · ${licences}\n${RULE}\n\n${text}\n`
  })
  return [
    `${BYTE_ORDER_MARK}${title} · third-party licences · licences tierces\n`,
    'The code and fonts of other projects that ship with the app, and their licences.',
    "Le code et les polices d'autres projets livrés avec l'app, et leurs licences.\n",
    ...sections,
  ].join('\n')
}

/** Writes licences.txt beside the build: the packages its chunks hold, and those the service worker
 * is built from, which Vite does not see (the PWA plugin builds it on its own, after the bundle). */
export function licences({
  title,
  serviceWorker,
}: {
  readonly title: string
  readonly serviceWorker: readonly string[]
}): Plugin {
  return {
    name: 'foelore:licences',
    apply: 'build',
    generateBundle(_, bundle) {
      const bundled = Object.values(bundle).flatMap((output) =>
        output.type === 'chunk' ? Object.keys(output.modules).map(packageOf) : [],
      )
      const names = new Set([
        ...bundled.filter((name) => name !== undefined),
        ...withDependencies(serviceWorker),
      ])
      this.emitFile({
        type: 'asset',
        fileName: 'licences.txt',
        source: licencesText(
          title,
          [...names].map((name) => readPackage(name)),
        ),
      })
    },
  }
}
