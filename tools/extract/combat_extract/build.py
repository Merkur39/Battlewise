"""Assembles game.json from the scan, the attacks, the localisation and the curation, and reports what
the curation misses."""
import fnmatch
import json
import re

from . import attacks as attack_data
from . import scan as scanning
from . import source

# Heightmap.Biome bits and their localisation keys.
BIOMES = {
    "meadows": (1, "biome_meadows"),
    "swamp": (2, "biome_swamp"),
    "mountain": (4, "biome_mountain"),
    "blackForest": (8, "biome_blackforest"),
    "plains": (16, "biome_plains"),
    "ashlands": (32, "biome_ashlands"),
    "deepNorth": (64, "biome_deepnorth"),
    "ocean": (256, "biome_ocean"),
    "mistlands": (512, "biome_mistlands"),
}
# HitData.DamageModifier, in enum order.
MODIFIERS = [
    "normal", "resistant", "weak", "immune", "ignore", "veryResistant", "veryWeak", "slightlyResistant", "slightlyWeak",
]
NOT_HOSTILE = {0, 11, 12}  # Players, PlayerSpawned, TrainingDummy
BLOCKER_TYPES = {3: "weapon", 4: "weapon", 5: "shield", 14: "weapon", 15: "other", 22: "weapon"}
TAG = re.compile(r"<[^>]+>")


class Report:
    def __init__(self):
        self.uncurated = []  # hostile creatures with attacks, neither listed nor ignored
        self.missing = []  # listed creatures the game does not have
        self.biome_conflicts = []  # open-world spawns in a biome the curation does not give
        self.unnamed = []  # attacks without a name in curation.json


class Names:
    def __init__(self, loc):
        self.loc = loc

    def __call__(self, key):
        key = (key or "").lstrip("$")
        en = TAG.sub("", self.loc.get(key, "English") or "").strip()
        fr = TAG.sub("", self.loc.get(key, "French") or "").strip()
        return {"fr": fr or en, "en": en}  # the game falls back to English as well


def _round(value, digits=4):
    value = round(float(value), digits)
    return int(value) if value.is_integer() else value


def _modifiers(raw):
    states = {t: MODIFIERS[raw.get("m_" + t, 0)] for t in attack_data.DAMAGE_TYPES}
    return {t: s for t, s in states.items() if s != "normal"}


def _attacks(rows, curated_names, report, creature):
    """Named attacks, identical ones (same name, kind and hits) merged."""
    merged = {}
    for row in rows:
        name = curated_names.get(row["id"])
        if name is None:
            report.unnamed.append((creature, row["id"]))
            name = {}
        name = {k: name[k] for k in ("fr", "en") if k in name}
        key = (name.get("en"), name.get("fr"), row["kind"], json.dumps(row["hits"], sort_keys=True))
        if key in merged:
            merged[key]["ids"].append(row["id"])
        else:
            merged[key] = {"ids": [row["id"]], "name": name, "kind": row["kind"], "hits": row["hits"]}
    return list(merged.values())


def _blocker(row, names):
    group = BLOCKER_TYPES[row["itemType"]]
    bonus = _round(row["timedBlockBonus"])
    if group == "shield":
        group = "buckler" if bonus > 2 else "tower" if bonus <= 1 else "round"
    return {
        "id": row["go"],
        "name": names(row["name"]),
        "group": group,
        "maxQuality": row["maxQuality"],
        "blockPower": _round(row["blockPower"]),
        "blockPowerPerLevel": _round(row["blockPowerPerLevel"]),
        "timedBlockBonus": bonus,
        "deflectionForce": _round(row["deflectionForce"]),
        "deflectionForcePerLevel": _round(row["deflectionForcePerLevel"]),
        "movementModifier": _round(row["movementModifier"]),
        "perfectBlockStaminaRegen": _round(row["perfectBlockStaminaRegen"] or 0),
    }


def build(index, curation, workers=8):
    """(game.json data, Report)."""
    report = Report()
    found = scanning.scan(workers)
    characters = {}
    for row in found.characters:
        characters.setdefault(row["go"], row)
    attacks = attack_data.creature_attacks(index, characters.values())
    names = Names(source.localization.load(index))

    creatures = []
    for prefab, entry in curation["creatures"].items():
        row = characters.get(prefab)
        if row is None:
            report.missing.append(prefab)
            continue
        rows = [a for p in [prefab] + entry.get("also", []) for a in attacks.get(p, [])]
        creatures.append({
            "id": prefab,
            "name": names(row["name"]),
            "biomes": entry["biomes"],
            "boss": bool(row["boss"]),
            "health": _round(row["health"]),
            "staggerFactor": _round(row["staggerDamageFactor"]),
            "staggeredByParry": bool(row["staggerWhenBlocked"]),
            "modifiers": _modifiers(row["damageModifiers"]),
            "attacks": _attacks(rows, curation["attacks"], report, prefab),
        })

    listed = set(curation["creatures"]) | {p for e in curation["creatures"].values() for p in e.get("also", [])}
    report.uncurated = sorted(
        p for p, row in characters.items()
        if attacks.get(p) and row["faction"] not in NOT_HOSTILE and p not in listed and p not in curation["ignored"]
    )
    bits = {bit: biome for biome, (bit, _) in BIOMES.items()}
    report.biome_conflicts = sorted({
        "%s spawns in %s" % (s["prefab"], bits[s["biome"]])
        for s in found.spawns
        if s["enabled"] and not s["globalKey"] and s["biome"] in bits and s["prefab"] in curation["creatures"]
        and bits[s["biome"]] not in curation["creatures"][s["prefab"]]["biomes"]
    })

    player = next(r for r in found.characters if r["go"] == "Player" and r["staggerDamageFactor"] > 0)
    blockers = {}
    for row in found.items:
        if row["itemType"] not in BLOCKER_TYPES or row["go"] in blockers or (row["blockPower"] or 0) <= 0:
            continue
        if any(fnmatch.fnmatchcase(row["go"], pattern) for pattern in curation["ignoredItems"]):
            continue
        blocker = _blocker(row, names)
        if blocker["name"]["en"]:
            blockers[row["go"]] = blocker

    data = {
        "game": source.game_version(),
        "player": {
            "blockStaminaDrain": _round(player["blockStaminaDrain"]),
            "perfectBlockStaminaDrain": _round(player["perfectBlockStaminaDrain"]),
            "staggerFactor": _round(player["staggerDamageFactor"]),
        },
        "biomes": [{"id": b, "name": names(BIOMES[b][1])} for b in curation["biomes"]],
        "damageTypes": {t: names("inventory_" + t) for t in attack_data.DAMAGE_TYPES},
        "modifiers": {m: names("inventory_" + m.lower()) for m in MODIFIERS if m not in ("normal", "ignore")},
        "creatures": creatures,
        "blockers": sorted(blockers.values(), key=lambda b: (b["group"], b["blockPower"], b["id"])),
    }
    return data, report
