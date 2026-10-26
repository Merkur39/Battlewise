# Combat data extraction

Read-only tooling that writes `src/data/game.json` from the local Valheim install: creatures (health,
stagger, weaknesses and resistances, attacks with their typed damage), blockers for the Arsenal, the
player's block costs, and the game's own French and English names. It never writes to the game folder,
and the app ships numbers and names only, no game art.

It reuses the extraction modules of Relooking (`../../../Relooking/tools/extract/valheim_assets`, or
`RELOOKING_EXTRACT`); the install is found through `VALHEIM_INSTALL`, else the default Steam path.

## Setup

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

## Commands

Run from `tools/extract`. Caches (asset index, wiki pages) go to `out/`, which is git-ignored.

```bash
.venv/Scripts/python extract_combat.py   # ~30 s, writes src/data/game.json
.venv/Scripts/python -m unittest discover -s tests -v
.venv/Scripts/python wiki_names.py       # proposes attack names, see below
```

`extract_combat.py` stops without writing when `curation.json` has a gap (a new creature, a missing
name...): complete the curation, then run it again.

## curation.json

What the game data does not carry, kept by hand:

- `creatures`: the creatures listed, in order, with their biomes; `also` joins variants whose attacks
  differ (the dual-wield Krigen, Kall's phases) into one entry; `note` flags what still needs checking.
- `ignored`: every other hostile creature with attacks, and why (variant, summon, unnamed...).
- `attacks`: names of the attacks by item id. The game names none of them: English names come from
  the [Valheim wiki](https://valheim.fandom.com) when it has them (`from: wiki`), otherwise they are
  written by hand (`hand`); French names are translated by hand, except the few the French wiki gives
  (`+wiki-fr`).

`wiki_names.py` matches each attack to the line of the creature's wiki infobox with the same damage,
then by shared words, and writes `out/wiki_names.json`: a proposal to review, never read by the build.

## How damage is read

From `Attack.OnAttackTrigger`, `Projectile.Setup` and `Aoe.Setup` (decompiled game code):

- melee and area attacks hit with the item damage × `m_damageMultiplier`; their projectile field is
  never used;
- a projectile carries the same hit, unless it only deals damage through what it spawns; an area
  spawned on impact or on trigger adds a hit of its own;
- an area thrown as the projectile uses the attack's hit when it takes the attack settings, its own
  otherwise;
- spawns that are neither (the Fader's fissures, summons) and attacks that kill their user
  (explosions) are kept with `hits: null`: « damage not extracted ».
