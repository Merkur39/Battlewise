# Foelore — design canvas

The mockups live in a Claude Design artifact: [Foelore — design](https://claude.ai/artifact/DDGhnVebZ9JkXRbWsa2dse)
(artifact type `https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd`). **The artifact is the source of truth**;
`canvas/project/` is a local working copy of **v132** (canvas.json + every `.dc.html` board).

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
- Page **Licence · pistes** (`Licence`): the GPL notice in Réglages › À propos (copyright, free software, no
  warranty, a link to the source), in three tracks: data lines, a sentence, a row. Track C (a 44 px row « Code
  source et licence · GitHub », the short notice under it; a small secondary button on desktop) is the one
  carried into the Réglages boards. Made by hand as well.
- Page **Signaler · pistes** (`Signaler-A` to `Signaler-C`, `Signaler-Desktop`): reporting from the app (#32), in
  three tracks, each with its entry points (creature sheet, Simulation, Réglages › À propos), its report sheet and
  its receipt, online and offline: a link under what one reads, a flag that lets the player tap the wrong line, one
  header button on every screen. Track A (the link) is the one chosen, with the wrong line picked in the sheet as
  optional chips, and drawn on desktop as a 600 px dialog. It is carried into Monstre, Main, Réglages and their
  desktop boards; the sheet itself lives in Monstre and Desktop-Bestiaire. Made by hand as well.
- Page **Retours · pistes** (`Retours-A` to `Retours-C`, `Retours-Desktop`): closing the loop on reports (#33), My
  reports, the « fixed » notice and What's new, in three tracks: all in Settings with a banner, pages of their own
  with a thank-you sheet, a dot without interrupting. Track B is the one chosen: Réglages gains a « Tes retours »
  section whose two rows open `Signalements` and `Nouveautes` (and their desktop boards), and the Bestiaire opens a
  « Corrigé grâce à toi » sheet once after an update that fixed one of the player's reports. Made by hand as well.
- Page **Plantage · pistes** (`Plantage-A` to `Plantage-C`, `Plantage-Desktop`): the crash report (#33), when the
  app fails while drawing, in three tracks on a phone: one page that takes the whole app, the report written on it;
  only the screen that failed, the rest of the app usable and the report in the usual sheet, Bug picked; the app
  restarting by itself, then a banner offering the report. Nothing is sent without the player. Track B is the one
  chosen, drawn on desktop beside it (the card in place of the sheet panel, the 600 px report dialog, the page of
  last resort when the frame of the app fails). Made by hand as well. Carried into Origine: Monstre and
  Desktop-Bestiaire gain a `crashed` state (the card in place of the sheet, Réessayer, « Envoyer le rapport »
  opening their report sheet with Bug picked, an optional « Ce que tu faisais » and the error attached), and
  `Secours` / `Desktop-Secours` are the page of last resort, made by hand, its report in the same sheet.
- Page **Filets · pistes** (`Filets-A` to `Filets-C`): crash nets around the other screens (Simulation, Arsenal,
  Mémo, the Bestiary's list), in three tracks on a phone: a card per screen that names it; nets on each row of a
  list first, a row that fails becoming a short row with « Signaler », then the card of the screen; one card for
  every screen. Track B is the one chosen, drawn on desktop beside it (`Filets-Desktop`: a row of the Bestiary's
  list and of the Arsenal's table, the card of the Simulation). Made by hand as well. Carried into Origine: the
  Bestiaire and Arsenal boards gain a `broken` state (the row of that name fails: the short row with « Signaler »,
  which on the desktop Bestiaire opens its report dialog), Main and Desktop-Combat a `crashed` state (the card of
  the screen).
- Page **Première arrivée · pistes** (`Arrivee-Auj`, `Arrivee-A` to `Arrivee-C`): onboarding, what a first launch
  shows today (a new character's gear, verdicts right in the Meadows and nearly all « dodge » in the Black Forest,
  nothing pointing at « VD 6 ×1 ») and three tracks on a phone: one bottom sheet at the first launch leading to Ton
  équipement and Ton monde; three full-screen questions (the biome, the gear, the world) before the Bestiaire; no
  interruption, a card above the list and a dot on the context button until the gear is set. Track B is the one
  chosen. Made by hand as well, verdicts from the app's model on `src/data/game.json` at the time. Carried into
  Origine in the row « Première arrivée », after the offer to install (whose ways out now lead to it): `Arrivee-Biome`,
  `Arrivee-Equipement`, `Arrivee-Monde` on a phone, `Desktop-Arrivee-*` as a 600 px dialog over the app. The forms of
  questions 2 and 3 are those of the Ton équipement and Ton monde dialogs, shared. « Suivant » keeps the answer, and
  the answers kept are written as the questions end, so the app behind the desktop dialog does not move meanwhile;
  « Passer » (and Escape on a desktop) leaves the questions left, and the one on screen, at what they hold; the last
  button names the biome picked and opens the Bestiaire on it.
- Page **Installer · pistes** (`Installer-A` to `Installer-C`, `Installer-Reglages`): offering to install the app
  (#49), apart from the onboarding and once, in three tracks on a phone (a full screen at the first launch, before the
  onboarding; a bottom sheet as the onboarding ends; a card above the Bestiary's list at the second launch), each on
  Android (a button, where `beforeinstallprompt` fired) and in Safari on an iPhone (the steps; a Home Screen app there
  does not share Safari's storage), then the row of Réglages › À propos that keeps the offer within reach. Made by
  hand as well. Track A is the one chosen, carried into Origine as a row « Première arrivée »: `Installer` (« Installer »
  opens the browser's prompt, drawn), `Installer-Safari` (the steps) and `Desktop-Installer`; `Reglages` gains the row
  under the version, opening the steps' sheet, and `Desktop-Reglages` a small « Installer Foelore » button.
- Page **Mentions · pistes** (`Mentions-A` to `Mentions-C`, `Mentions-Texte`): the notices and credits of Réglages ›
  À propos (fan project, credits for the wiki's attack names, fonts and libraries, the player's data, publisher and
  host), in three tracks on a phone: a page of its own behind one row; everything in À propos, folded; each notice
  where it serves (the data notice in the report sheet, two short notes and a row to a short page). `Mentions-Texte`
  holds the shared copy, French and English. Made by hand as well. Track A is the one chosen, carried into Origine:
  `Mentions` and `Desktop-Mentions` (the page, from Réglages), a « Mentions et crédits » row in `Reglages` between
  Signaler and Code source, and a small button in `Desktop-Reglages`.
- The desktop Bestiaire board is a fluid page that carries track B itself: classes and a `max-width: 1399px`
  media query in its helmet, which the search board inherits. Play it narrower than 1400 px to see it.
- Generated from the Bestiaire boards: `Bestiaire-Recherche`, `Desktop-Bestiaire-Recherche`, and `Contexte`
  (« Ton contexte », the phone Bestiaire with its context sheet open). Generated the same way, `Signaler` (Monstre
  with its report sheet open) and `Desktop-Signaler` (the desktop Bestiaire with its report dialog open), a line
  picked; `Merci` and `Desktop-Merci`, the Bestiaire with its thank-you sheet or dialog open; `Plantee` and
  `Desktop-Plantee`, the creature sheet and the desktop Bestiaire with the sheet crashed; `Ligne-Plantee` and
  `Desktop-Ligne-Plantee`, the Troll's row failed (on desktop, its sheet beside it too); `Arsenal-Ligne-Plantee`
  and `Desktop-Arsenal-Ligne-Plantee`, a shield's row failed; `Simulation-Plantee` and
  `Desktop-Simulation-Plantee`, the Simulation crashed. With `Secours`, they make the « Plantages » rows of
  Origine, phone and desktop.
- Réglages boards carry the seven palettes themselves (live preview); their state line must stay
  `this.state = { theme: 'origine', lang: 'auto' };` for the theme copies.

## Workflow

1. Refresh the working copy when the live artifact is newer than v107: read the artifact's file list
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
