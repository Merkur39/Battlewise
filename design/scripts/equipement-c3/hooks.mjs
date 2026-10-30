// Lets Node's type stripping load the app's modules: the '@/' alias, extensionless and folder imports,
// and JSON without an import attribute.
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith('@/') ? pathToFileURL(SRC + specifier.slice(2)).href : specifier
    const attempt = (candidate) => {
      try {
        return nextResolve(candidate, context)
      } catch {
        return null
      }
    }
    if (!target.startsWith('.') && !target.startsWith('file:')) return nextResolve(target, context)
    for (const candidate of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`]) {
      const resolved = attempt(candidate)
      if (resolved) return resolved
    }
    return nextResolve(target, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
