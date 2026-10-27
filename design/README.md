# Battlewise — design canvas

The mockups live in a Claude Design artifact: [Battlewise — design](https://claude.ai/artifact/DDGhnVebZ9JkXRbWsa2dse)
(artifact type `https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd`). **The artifact is the source of truth**;
`canvas/project/` is a local working copy of **v83** (canvas.json + every `.dc.html` board).

## Layout of the canvas

- `canvas.json`: pages, boards (position, size, title), notes (row titles), board order, canvas title.
- Page **Origine** (default page, boards without a prefix): mobile boards (390×844) in four rows, desktop boards
  (1440×900) in three rows below. These are the only boards edited by hand.
- Six theme pages, **generated** from Origine: `Braise-`, `Brume-`, `Jour-`, `Runes-`, `Graphite-`, `Parchemin-`
  prefixes. Do not edit them.
- Page **Simulation · pistes** (`Sim-*`, `SimB-*`): archive of the three Simulation tracks, never regenerated.
- Page **Icône** (`Icone`): the app icon tracks; track A (the brand shield in trait) is the one shipped, as
  `public/icon.svg`. Like every page made by hand, `sync_themes.py` leaves it alone.
- Page **Version** (`Version`): how the app version sits next to the name in Réglages › À propos; track A
  (mono, secondary) is the one shipped, in the Réglages boards. Made by hand as well.
- Page **Menu · pistes** (`Menu-A` to `Menu-C`): the three tracks for Ton équipement and Ton monde on a
  phone. The phone boards carry track C's summary button (VD and enemy scale) opening track B's bottom
  sheet, animated; the « Ton contexte » board of Origine shows it open. Made by hand as well.
- Page **Compétence** (`Competence`): the Blocking skill field of Ton équipement on a 360 px phone, as it
  overflowed, and two ways to keep its label on one line; track A (the value at the end of the slider) is
  the one carried into the Ton équipement boards. Made by hand as well.
- Page **Encaisses** (`Encaisses`): the « Ce que tu encaisses » card on a 360 px phone, as it jumped, and two
  steady layouts; track B (the legend under the title, numbers alone on each guard's line) is the one
  carried into the phone Ton équipement board. Made by hand as well.
- Page **Fiche · pistes** (`Fiche`, `Fiche-Desktop`): what the creature sheet showed of the game data and
  now shows too (weak spots, tools, trample, death effects), as 360 px phone fragments in three tracks, then
  track A on the desktop panel for the cases the Troll cannot show; track A (everything in the existing
  sections) is the one chosen, its weak spot carried into the Monstre and Bestiaire desktop boards. Made by
  hand as well, numbers from `src/data/game.json` at the time.
- Page **Squelette · pistes** (`Squelette`): three ways to tell apart two creatures a biome lists under one
  game name (the skeletons): the home biome as a qualifier, the health brought forward, one merged row.
  Track A (« Squelette · Marécages ») is the one chosen: the Bestiaire boards list the meadows skeleton as
  « Squelette · Prairies ». Made by hand as well.
- Page **Étroit · pistes** (`Etroit-*-1024`, `Etroit-*-1280`): the desktop Bestiaire between 1024 and 1400 px,
  where the sheet lacked room for its attack table, as it was and in three tracks, each at 1024 and 1280 px.
  Track B (the sidebar folded to its icons, a 320 px list, the range in the tag line, Simuler as a chevron) is
  the one chosen. Made by hand as well, derived once from the board below and frozen.
- The desktop Bestiaire board is a fluid page that carries track B itself: classes and a `max-width: 1399px`
  media query in its helmet, which the search board inherits. Play it narrower than 1400 px to see it.
- Generated from the Bestiaire boards: `Bestiaire-Recherche`, `Desktop-Bestiaire-Recherche`, and `Contexte`
  (« Ton contexte », the phone Bestiaire with its context sheet open).
- Réglages boards carry the seven palettes themselves (live preview); their state line must stay
  `this.state = { theme: 'origine', lang: 'auto' };` for the theme copies.

## Workflow

1. Refresh the working copy when the live artifact is newer than v83: read the artifact's file list
   (`Artifact` action `list`, scope `files`) and fetch `project/canvas.json` and every `project/*.dc.html` into
   `canvas/project/`.
2. Edit Origine boards only. Every hex colour must be one of the 16 Origine tokens (see `scripts/palettes.py`),
   otherwise the theme generation stops on an unmapped colour.
3. Rebuild and check, from this folder:

   ```bash
   python scripts/build_bestiary_search.py canvas/project
   python scripts/sync_themes.py canvas/project
   python scripts/check_canvas.py canvas/project
   ```

   - `build_bestiary_search.py`: Bestiaire search screens (mobile + desktop) and the « Ton contexte » board
     from the Bestiaire boards; safe to rerun.
   - `sync_themes.py`: rewrites the six theme copies of every board and lays out `canvas.json` for all pages
     (board positions, row titles). New boards go into its `MOBILE` / `DESKTOP` tables.
   - `check_canvas.py`: missing boards, broken or cross-theme links, Origine colours left in theme boards, and
     every board script run under node (`run_logic.js`).
   - `node scripts/run_logic.js canvas/project/Main.dc.html '{"stars":1}'` prints a board's render values for a
     given state (useful to check verdicts and advice).
4. Before publishing, read the live `project/canvas.json` and compare it with the local one: someone may have
   moved boards or edited in the canvas meanwhile.
5. Publish with the `Artifact` tool: `url` = the artifact, `root` = `design/canvas`, `file_path` =
   `canvas/project/canvas.json`, `files` = the changed boards (`project/<name>.dc.html`, theme copies included).
6. Check the result in Chrome (claude-in-chrome): board « Play » → « Play full screen ».

## Shared definitions

- `scripts/damage_types.py`: the eight damage-type icons (single stroke path on a 24 grid), labels, the
  « STAGGER » flag (blunt, slash, pierce, lightning fill the stagger bar) and the damage-modifier states
  (very weak ×2, weak ×1.5, resistant ×0.5, very resistant ×0.25, immune ×0).
- Labels in the canvas (« coupant », « givre »…) are provisional: the app takes the game's own localisation.
