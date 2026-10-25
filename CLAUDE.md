# Battlewise

« a combat companion for Valheim »: a mobile-first, offline-capable web app (PWA) that tells you, in two
seconds and next to the game, how to take each creature with your gear. French and English.

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run check`: typecheck + lint + format check + tests. Must be green before anything is called done.
- `npm run test:watch`, `npm run test:coverage`

## Layout

- `src/combat/`: pure combat engine (no DOM, no React), tested under node (`core` Vitest project).
- `src/app/`, `src/features/*`, `src/ui/`, `src/i18n/`: interface, tested under jsdom (`ui` project,
  setup in `test/setup.ts`).
- `src/styles/themes.css`: the seven palettes of the design canvas (16 tokens each), Origine by default,
  others via `data-theme` on `:root`.
- `design/`: the validated mockups (Claude Design canvas) and their tooling; see `design/README.md`. Not
  part of the app's toolchain (ignored by ESLint and Prettier).

## Rules

- The design canvas is the reference for tokens, components and copy.
- Colours: ok / warn / bad are for verdicts only; accent is for selection and actions. Damage types and
  weaknesses stay neutral.
- French UI says « VD », never « défense ».
- Game names (creatures, attacks, items, biomes, damage types) come from the game's own localisation, in
  both languages, never translated by hand. The app ships numbers and names only, no game art.
