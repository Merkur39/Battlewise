# Battlewise — design canvas

The mockups live in a Claude Design artifact: [Battlewise — design](https://claude.ai/artifact/DDGhnVebZ9JkXRbWsa2dse)
(artifact type `https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd`). **The artifact is the source of truth**;
`canvas/project/` is a local working copy of **v56** (canvas.json + every `.dc.html` board).

## Layout of the canvas

- `canvas.json`: pages, boards (position, size, title), notes (row titles), board order, canvas title.
- Page **Origine** (default page, boards without a prefix): mobile boards (390×844) in four rows, desktop boards
  (1440×900) in three rows below. These are the only boards edited by hand.
- Six theme pages, **generated** from Origine: `Braise-`, `Brume-`, `Jour-`, `Runes-`, `Graphite-`, `Parchemin-`
  prefixes. Do not edit them.
- Page **Simulation · pistes** (`Sim-*`, `SimB-*`): archive of the three Simulation tracks, never regenerated.
- Generated from the Bestiaire boards: `Bestiaire-Recherche` and `Desktop-Bestiaire-Recherche`.
- Réglages boards carry the seven palettes themselves (live preview); their state line must stay
  `this.state = { theme: 'origine', lang: 'auto' };` for the theme copies.

## Workflow

1. Refresh the working copy when the live artifact is newer than v56: read the artifact's file list
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

   - `build_bestiary_search.py`: Bestiaire search screens (mobile + desktop) from the Bestiaire boards; safe to rerun.
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
