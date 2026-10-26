import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // design/ holds the mockup canvas and its Python/node tooling, outside the app's toolchain, and the
  // extraction's Python environment and output hold third-party and generated files.
  globalIgnores(['dist', 'coverage', 'design', 'tools/extract/.venv', 'tools/extract/out']),

  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },

  {
    // "noUncheckedIndexedAccess" makes every array read "T | undefined", and strictTypeChecked
    // then pulls in two rules that contradict each other on how to narrow it back:
    // non-nullable-type-assertion-style demands "!" while no-non-null-assertion forbids it.
    // Inside a loop bounded by the array's own length the index is provably valid, and adding a
    // runtime guard would be dead code that no test can cover. We keep the compiler check and
    // drop the lint rule, rather than the other way round.
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },

  // Config and test-harness files run in Node, not in the browser.
  {
    files: ['vite.config.ts', 'eslint.config.js', 'test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
])
