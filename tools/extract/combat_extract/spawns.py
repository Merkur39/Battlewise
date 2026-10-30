"""Where each creature is met in a normal world, under which condition, and at which levels (1.0.21):

- open world: SpawnSystem.UpdateSpawnList runs every enabled SpawnSystemList entry (chance above 0, day or
  night) where the ground biome is in its m_biome, never with an m_biomeArea of 0 (IsSpawnPointGood);
  m_requiredGlobalKey waits for a key, m_requiredPersistentEvent for that persistent event,
  m_requiredEnvironments for an environment EnvMan picks (IsEnvironment), so only the biomes whose setups
  (EnvMan's, the LocationLists') or alt biomes (added, forced) hold one count; the environments raids,
  events and EnvZones force where they run are left out. Enabled AltBiomeList alt biomes are taken as
  present (most worlds have them, but GenerateAltBiomes may place none of one: Lox, Goblin and Death Plains
  are rare) on sectors of their own m_biome only: UpdateSpawning runs their entries in the zones touching
  one (m_cornerAltBiomes), counted within that m_biome (what a zone astride the sector's edge spawns in the
  next biome is left out), and they add locations and vegetation in their sectors.
- locations: ZoneSystem places every enabled ZoneLocation (ZoneSystem, LocationLists, alt biomes) in its
  m_biome, its prefab found by asset ID (softref), never by m_prefabName. ZoneSystem.SpawnLocation keeps
  objects active up to the root; RandomSpawn.Randomize drops those whose chance is 0 or whose
  m_requireBiome lacks the location biome. A DungeonGenerator adds the enabled rooms of its themes
  (SetupAvailableRooms), where RandomSpawn tests m_dungeonRequireTheme instead (PlaceRoom), and its doors.
  Whatever is placed later (bosses, hatched spawners, doors, event objects) is never randomized.
- placed objects: CreatureSpawner, SpawnArea, EggHatch, OfferingBowl and placed creatures
  (Utils.GetPrefabName) spawn what they hold; a TriggerSpawner only when a creature's TriggerSpawnAbility
  wakes it (the Seeker Queen's call); a spawned prefab that is no creature spawns in turn. A placed
  object is rebuilt from its registered prefab when its zone reloads (ZNetScene.CreateObject): both
  settings count.
- raids: enabled random events of RandEventSystem and of the LocationLists, around a player standing in
  the event's m_biome. Persistent events: the objects they place, the entries that wait for them.
- creatures: what their attacks and death effects spawn (Projectile.SpawnOnHit, SpawnAbility.Spawn) and
  their CharacterDrop drops come where they are; Growup turns the young one into the grown one where it
  was; Procreation and EggGrow need a tamed parent. Player-craftable items (enabled Recipe) whose attack
  spawns a creature: bombs, or summons through a SpawnAbility.
- not followed, since every creature they hold is met elsewhere: what Destructible effect lists spawn
  (BlobMorkBig's BlobMork and BlobMorkMini) and DropOnDestroyed drop tables (Seeker eggs, Hildir's crypt
  chests).

Levels (stars = level - 1):
- SpawnSystem.Spawn: m_minLevel up to m_maxLevel, no level at all within m_levelUpMinCenterDistance.
- CreatureSpawner.Spawn: the Location's m_enemyMin/MaxLevelOverride replace the spawner's own unless its
  m_spawnGroupID is excluded, and m_blockSpawnGroups never spawn; levels only when the max is above 1, at
  a chance never 0 (SpawnSystem.GetLevelUpChance falls back to 10).
- SpawnArea.SpawnOne, TriggerSpawner.Spawn: levels when the max is above 1 and the chance above 0.
- hatched, offered, summoned, dropped and placed creatures: level 1; Procreation, EggGrow and Growup keep
  the parent's level (at least m_minOffspringLevel).
"""
import re
from collections import defaultdict

from . import softref

CLASSES = [
    "SpawnSystem", "SpawnSystemList", "EnvMan", "ZoneSystem", "LocationList", "AltBiomeList", "Location", "DungeonDB",
    "RoomList", "DungeonGenerator", "RandEventSystem", "PersistentEventSystem", "RandomSpawn",
    "CreatureSpawner", "SpawnArea", "TriggerSpawner", "TriggerSpawnAbility", "EggHatch", "OfferingBowl",
    "Humanoid", "Character", "CharacterDrop", "Procreation", "Growup", "EggGrow",
    "ItemDrop", "Recipe", "Projectile", "SpawnAbility",
]
# Heightmap.Biome bits, named as build.BIOMES.
BIOMES = {
    1: "meadows", 2: "swamp", 4: "mountain", 8: "blackForest", 16: "plains", 32: "ashlands", 64: "deepNorth",
    256: "ocean", 512: "mistlands",
}
EVERY_BIOME = sum(BIOMES)
EVERY_AREA = 3  # Heightmap.BiomeArea: Edge 1, Median 2
CREATURES = ("Humanoid", "Character")
PLACERS = ("CreatureSpawner", "SpawnArea", "TriggerSpawner", "EggHatch", "OfferingBowl", "DungeonGenerator")
LEVEL_ONE = (1, 1)
MAX_DEPTH = 8  # nested spawns (location -> egg -> spawner -> creature) never go that deep
MAX_ROUNDS = 16  # creature chains (FrozenKing -> Aspect_Eikthyr -> Aspect_Elder...) settle well before


def _ref(pptr):
    return (pptr or {}).get("_ref")


def _component_ref(row):
    return "%s:%s" % (row["cab"], row["pid"])


def _prefab_name(name):
    """Utils.GetPrefabName: the name up to the first '(' or space."""
    return re.split(r"[( ]", name or "", maxsplit=1)[0]


def _within(biomes, alt_biomes):
    """Biomes of what an alt biome places in its sectors: both masks when they meet."""
    return biomes & alt_biomes or biomes


# ---------------------------------------------------------------------- tables
class _Game:
    """The collected components, indexed the way the rules read them."""

    def __init__(self, found):
        self.found = found
        self.creatures = {}  # prefab root ref -> name
        self.creature_rows = {}  # name -> its Humanoid/Character row
        self.inside = defaultdict(list)  # root ref -> placing components under it
        self.on_root = defaultdict(lambda: defaultdict(list))  # root ref -> class -> rows
        self.on_go = defaultdict(lambda: defaultdict(list))  # GameObject ref -> class -> rows
        self.roots = {}  # (bundle, root name) -> root ref
        self.components = {}  # component ref -> row
        self.templates = defaultdict(list)  # (class, prefab name) -> rows on that prefab's root
        for cls in CLASSES:
            for row in found.rows(cls):
                self._add(cls, row)
        self.spawn_lists = _referenced(found, "SpawnSystem", "m_spawnLists", "SpawnSystemList")
        self.location_lists = _referenced(found, "ZoneSystem", "m_locationLists", "LocationList")
        self.alt_biomes = _alt_biomes(found)
        self.weathers = _weathers(found, self.location_lists, self.alt_biomes)
        self.rooms = _rooms(self, _referenced(found, "DungeonDB", "m_roomLists", "RoomList"))
        self.persistent_events = {}
        for row in found.rows("PersistentEventSystem"):
            for event in row["data"]["m_possibleEvents"]:
                self.persistent_events.setdefault(event["internalName"], event)

    def _add(self, cls, row):
        prefab = row["go_ref"] is not None and row["go_ref"] == row["root_ref"]
        if cls in CREATURES and prefab:
            self.creatures[row["root_ref"]] = row["go"]
            self.creature_rows.setdefault(row["go"], row)
        elif cls in CREATURES or cls in PLACERS:
            self.inside[row["root_ref"]].append(row)
        if prefab:
            self.templates[(cls, row["go"])].append(row)
        if row["root"] is not None:
            self.roots.setdefault((row["bundle"], row["root"]), row["root_ref"])
        self.on_root[row["root_ref"]][cls].append(row)
        self.on_go[row["go_ref"]][cls].append(row)
        self.components[_component_ref(row)] = row

    def rows_on(self, root, cls):
        return self.on_root[root][cls] if root in self.on_root else ()

    def rows_at(self, go, cls):
        return self.on_go[go][cls] if go in self.on_go else ()

    def location(self, root):
        rows = self.rows_at(root, "Location")
        return rows[0]["data"] if rows else None


def _referenced(found, owner, field, cls):
    """Rows of `cls` that some `owner` component lists in `field`, by GameObject or by component."""
    refs = {_ref(p) for row in found.rows(owner) for p in row["data"].get(field, [])}
    return [r for r in found.rows(cls) if r["go_ref"] in refs or _component_ref(r) in refs]


def weathers(found):
    """{biome bit: environment names EnvMan can pick there}, from the CLASSES components."""
    location_lists = _referenced(found, "ZoneSystem", "m_locationLists", "LocationList")
    return _weathers(found, location_lists, _alt_biomes(found))


def _alt_biomes(found):
    alt_lists = _referenced(found, "ZoneSystem", "m_altBiomeLists", "AltBiomeList")
    return [alt for row in alt_lists for alt in row["data"]["m_alts"] if alt["m_enabled"]]


def _weathers(found, location_lists, alt_biomes):
    """{biome bit: environment names EnvMan can pick there}: the setups of EnvMan and of the LocationLists
    (AppendBiomeSetup), and what alt biomes add or force (GetAvailableEnvironments, GetEnvironmentOverride)."""
    weathers = defaultdict(set)
    setups = [setup for row in found.rows("EnvMan") for setup in row["data"]["m_biomes"]]
    setups += [setup for row in location_lists for setup in row["data"].get("m_biomeEnvironments", [])]
    for setup in setups:
        weathers[setup["m_biome"]] |= {entry["m_environment"] for entry in setup["m_environments"]}
    for alt in alt_biomes:
        added = {entry["m_environment"] for entry in alt["m_addEnvironments"]} | ({alt["m_forceEnvironment"]} - {""})
        for bit in BIOMES:
            if alt["m_biome"] & bit:
                weathers[bit] |= added
    return weathers


def _rooms(game, room_lists):
    """(theme, enabled, room root ref) of every room of the dungeon database, found by asset ID."""
    rooms, seen = [], set()
    for row in room_lists:
        for room in row["data"]["m_rooms"]:
            asset = softref.asset_id(room["m_prefab"])
            root = game.roots.get(softref.prefab(room["m_prefab"]))
            if asset not in seen and root:
                seen.add(asset)
                rooms.append((room["m_theme"], bool(room["m_enabled"]), root))
    return rooms


# ---------------------------------------------------------------------- contexts and sources
def _context(label, biomes, tag=None, kind="world"):
    """Where and under which condition things are placed; `kind` says whether RandomSpawn runs there."""
    return {"native": tag is None, "tag": tag, "biomes": biomes & EVERY_BIOME, "kind": kind, "themes": 0,
            "location": None, "site": None, "label": label}


def _conditional(ctx, tag, note):
    """The context once a condition applies; a condition already there (a raid...) stays the one shown."""
    if ctx["native"]:
        return dict(ctx, native=False, tag=tag, label="%s %s" % (ctx["label"], note))
    return dict(ctx, label="%s %s" % (ctx["label"], note))


def _source(label, levels, biomes=0, tag=None):
    return {"native": tag is None, "tag": tag, "biomes": biomes, "levels": levels, "label": label}


def _emit(game, out, pptr, ctx, levels, depth):
    """A spawned prefab: a creature gets a source, anything else spawns what it holds."""
    ref = _ref(pptr)
    if ref in game.creatures:
        out[game.creatures[ref]].append(_source(ctx["label"], levels, ctx["biomes"], ctx["tag"]))
    elif ref is not None:
        _place(game, out, ref, dict(ctx, kind="prefab"), depth + 1)


def _place(game, out, root, ctx, depth=0):
    """Everything placed under a root (location, room or prefab) spawns in that context."""
    if depth > MAX_DEPTH or root not in game.inside:
        return
    location = game.location(root)
    if location is not None:
        ctx = dict(ctx, location=location)
    for row in game.inside[root]:
        biomes = _gate(game, row, ctx)
        if biomes:
            PLACING[row["class"]](game, out, row, dict(ctx, biomes=biomes), depth)


def _gate(game, row, ctx):
    """Biomes where a placed object really is: none when it is inactive or disabled, or when a RandomSpawn
    of its chain always drops it; RandomSpawn only runs when ZoneSystem or DungeonGenerator place it."""
    if not row["active"] or not row["data"].get("m_Enabled", 1):
        return 0
    biomes = ctx["biomes"]
    if ctx["kind"] not in ("location", "room"):
        return biomes
    for go in row["chain"]:
        for gate in game.rows_at(go, "RandomSpawn"):
            data = gate["data"]
            if not data["m_Enabled"]:
                continue
            if data["m_chanceToSpawn"] <= 0:
                return 0
            theme = data["m_dungeonRequireTheme"]
            if ctx["kind"] == "room" and theme and ctx["themes"] & theme != theme:
                return 0
            if ctx["kind"] == "location" and data["m_requireBiome"]:
                biomes &= data["m_requireBiome"]
    return biomes


def _settings(game, row):
    """A placed component's settings, and its registered prefab's when they differ."""
    own = row["data"]
    found = [own]
    if row["go_ref"] != row["root_ref"]:
        mine = {k: v for k, v in own.items() if k != "m_GameObject"}
        for template in game.templates.get((row["class"], _prefab_name(row["go"])), ()):
            if {k: v for k, v in template["data"].items() if k != "m_GameObject"} != mine:
                found.append(template["data"])
    return found


# ---------------------------------------------------------------------- levels
def _spawn_system_levels(entry):
    """SpawnSystem.Spawn."""
    low, high = max(entry["m_minLevel"], 1), max(entry["m_minLevel"], entry["m_maxLevel"], 1)
    if entry["m_levelUpMinCenterDistance"] > 0:
        low = 1  # near the world centre no level is set at all
    return low, high


def _spawner_levels(data, location):
    """CreatureSpawner.Spawn, with the level overrides of the location it stands in."""
    low, high = data["m_minLevel"], data["m_maxLevel"]
    if location and data["m_spawnGroupID"] not in location["m_excludeEnemyLevelOverrideGroups"]:
        if location["m_enemyMinLevelOverride"] >= 0:
            low = location["m_enemyMinLevelOverride"]
        if location["m_enemyMaxLevelOverride"] >= 0:
            high = location["m_enemyMaxLevelOverride"]
    if high <= 1:
        return LEVEL_ONE
    return max(low, 1), max(low, high)


def _rolled_levels(low, high, chance):
    """SpawnArea.SpawnOne and TriggerSpawner.Spawn."""
    if high <= 1:
        return LEVEL_ONE
    low = max(low, 1)
    return (low, max(low, high)) if chance > 0 else (low, low)


# ---------------------------------------------------------------------- placed components
def _creature_spawner(game, out, row, ctx, depth):
    location = ctx["location"]
    for data in _settings(game, row):
        if not (data["m_spawnAtDay"] or data["m_spawnAtNight"]):
            continue
        if location and data["m_spawnGroupID"] in location["m_blockSpawnGroups"]:
            continue
        key = data["m_requiredGlobalKey"]
        here = _conditional(ctx, "afterBoss:" + key, "after " + key) if key else ctx
        _emit(game, out, data["m_creaturePrefab"], here, _spawner_levels(data, location), depth)


def _spawn_area(game, out, row, ctx, depth):
    for data in _settings(game, row):
        for entry in data["m_prefabs"]:
            if entry["m_weight"] > 0:
                levels = _rolled_levels(entry["m_minLevel"], entry["m_maxLevel"], data["m_levelupChance"])
                _emit(game, out, entry["m_prefab"], ctx, levels, depth)


def _callers(game):
    """Creatures whose attacks fire a TriggerSpawnAbility (TriggerSpawner.TriggerAllInRange)."""
    callers = []
    for name, row in sorted(game.creature_rows.items()):
        data = row["data"]
        items = list(data.get("m_defaultItems", [])) + list(data.get("m_randomWeapon", []))
        items += [item for item_set in data.get("m_randomSets", []) for item in item_set["m_items"]]
        if any(game.rows_on(ref, "TriggerSpawnAbility") for item in items for ref in _attack_spawns(game, _ref(item))):
            callers.append(name)
    return callers


def _trigger_spawner(game, out, row, ctx, depth):
    for caller in _callers(game):
        _spawn_when_called(game, out, row, _conditional(ctx, "summon:" + caller, "when %s calls" % caller), depth)


def _spawn_when_called(game, out, row, ctx, depth):
    for data in _settings(game, row):
        if data["m_spawnChance"] > 0:
            levels = _rolled_levels(data["m_minLevel"], data["m_maxLevel"], data["m_levelupChance"])
            for pptr in data["m_creaturePrefabs"]:
                _emit(game, out, pptr, ctx, levels, depth)


def _egg(game, out, row, ctx, depth):
    for data in _settings(game, row):
        if data["m_chanceToHatch"] > 0:
            _emit(game, out, data["m_spawnPrefab"], ctx, LEVEL_ONE, depth)


def _altar(game, out, row, ctx, depth):
    for data in _settings(game, row):
        _emit(game, out, data["m_bossPrefab"], ctx, LEVEL_ONE, depth)


def _placed_creature(game, out, row, ctx, depth):
    name = _prefab_name(row["go"])
    if name in game.creature_rows:
        out[name].append(_source(ctx["label"], LEVEL_ONE, ctx["biomes"], ctx["tag"]))


def _dungeon(game, out, row, ctx, depth):
    """DungeonGenerator: the enabled rooms sharing one of its themes, and its doors."""
    data = row["data"]
    themes = data["m_themes"]
    label = "dungeon " + ctx["site"] if ctx["site"] else ctx["label"]
    for theme, enabled, root in game.rooms:
        if enabled and theme & themes:
            _place(game, out, root, dict(ctx, kind="room", themes=themes, label=label), depth + 1)
    for door in data["m_doorTypes"]:  # PlaceDoors: its own chance, else the generator's
        if door["m_chance"] > 0 or data["m_doorChance"] > 0:
            _emit(game, out, door["m_prefab"], dict(ctx, themes=themes, label=label), LEVEL_ONE, depth)


PLACING = {
    "CreatureSpawner": _creature_spawner, "SpawnArea": _spawn_area, "TriggerSpawner": _trigger_spawner,
    "EggHatch": _egg, "OfferingBowl": _altar, "DungeonGenerator": _dungeon,
    "Humanoid": _placed_creature, "Character": _placed_creature,
}


# ---------------------------------------------------------------------- world
def _weathered(game, entry):
    """Biomes where EnvMan can pick an environment the entry waits for (EnvMan.IsEnvironment)."""
    wanted = set(entry["m_requiredEnvironments"])
    if not wanted:
        return EVERY_BIOME
    return sum(bit for bit in BIOMES if game.weathers.get(bit, set()) & wanted)


def _spawn_entry(game, out, entry, ctx):
    """One SpawnSystem.SpawnData, of a spawn list, an alt biome or a raid."""
    if not (entry["m_enabled"] and entry["m_spawnChance"] > 0 and (entry["m_spawnAtDay"] or entry["m_spawnAtNight"])):
        return
    if not entry["m_biomeArea"] & EVERY_AREA:  # IsSpawnPointGood: no ground lies in its area
        return
    ctx = dict(ctx, biomes=ctx["biomes"] & entry["m_biome"] & _weathered(game, entry))
    event, key = entry["m_requiredPersistentEvent"], entry["m_requiredGlobalKey"]
    if event:
        ctx = _conditional(ctx, "event:" + event, "during " + event)
        if event in game.persistent_events:
            ctx["biomes"] &= game.persistent_events[event]["biomes"]
    if key:
        ctx = _conditional(ctx, "afterBoss:" + key, "after " + key)
    if ctx["biomes"]:
        _emit(game, out, entry["m_prefab"], ctx, _spawn_system_levels(entry), 0)


def _open_world(game, out):
    for row in game.spawn_lists:
        for entry in row["data"]["m_spawners"]:
            _spawn_entry(game, out, entry, _context('world "%s"' % entry["m_name"], EVERY_BIOME))
    for alt in game.alt_biomes:  # run on its sectors only, which lie in its m_biome (GenerateAltBiomes)
        for entry in alt["m_spawn"]:
            _spawn_entry(game, out, entry, _context('alt biome "%s"' % alt["m_name"], alt["m_biome"]))


def _zone_entries(game, field, alt_field):
    """(entry, biomes) of the ZoneLocations or ZoneVegetations of every list, alt biomes included."""
    seen = set()
    for owner in list(game.found.rows("ZoneSystem")) + game.location_lists:
        for entry in owner["data"].get(field, []):
            key = repr(entry)
            if key not in seen:  # the ZoneSystem is serialized more than once
                seen.add(key)
                yield entry, entry["m_biome"]
    for alt in game.alt_biomes:
        for entry in alt[alt_field]:
            yield entry, _within(entry["m_biome"], alt["m_biome"])


def _locations(game, out):
    """ZoneSystem: an enabled ZoneLocation places its prefab, found by asset ID."""
    for zone, biomes in _zone_entries(game, "m_locations", "m_addLocations"):
        if not (zone["m_enable"] and zone["m_quantity"] > 0):
            continue
        found = softref.prefab(zone["m_prefab"])
        if found in game.roots:
            ctx = dict(_context("location " + found[1], biomes, kind="location"), site=found[1])
            if ctx["biomes"]:
                _place(game, out, game.roots[found], ctx)


def _vegetation(game, out):
    for veg, biomes in _zone_entries(game, "m_vegetation", "m_addVegetation"):
        if veg["m_enable"] and veg["m_max"] > 0:
            ctx = _context("vegetation %s" % veg["m_prefab"].get("_name"), biomes)
            if ctx["biomes"]:
                _emit(game, out, veg["m_prefab"], ctx, LEVEL_ONE, 0)


def _raids(game, out):
    """RandEventSystem: an enabled random event spawns its entries around a player in its m_biome."""
    events = [e for r in game.found.rows("RandEventSystem") for e in r["data"]["m_events"]]
    events += [e for r in game.location_lists for e in r["data"].get("m_events", [])]
    seen = set()
    for event in events:
        name = event["m_name"]
        if name in seen or not (event["m_enabled"] and event["m_random"]):
            continue
        seen.add(name)
        ctx = _context("raid " + name, event["m_biome"], tag="raid:" + name)
        for entry in event["m_spawn"]:
            _spawn_entry(game, out, entry, ctx)


def _persistent_events(game, out):
    """PersistentEventSystem: what an event places in its biomes."""
    for name, event in game.persistent_events.items():
        ctx = _context("event " + name, event["biomes"], tag="event:" + name)
        for objects in event["objectsToSpawn"]:
            for pptr in objects["prefabs"]:
                _emit(game, out, pptr, ctx, LEVEL_ONE, 0)


# ---------------------------------------------------------------------- what creatures and items spawn
def _chain(game, ref, through_ability=False, seen=None):
    """(creature, through a SpawnAbility) a spawned prefab ends up spawning (Projectile.SpawnOnHit,
    SpawnAbility.Spawn)."""
    seen = set() if seen is None else seen
    if ref is None or ref in seen:
        return
    seen.add(ref)
    if ref in game.creatures:
        yield game.creatures[ref], through_ability
        return
    for row in game.rows_on(ref, "Projectile"):
        data = row["data"]
        hits = [data["m_spawnOnHit"]] if data["m_spawnOnHitChance"] > 0 else []
        for pptr in hits + data["m_randomSpawnOnHit"]:
            yield from _chain(game, _ref(pptr), through_ability, seen)
    for row in game.rows_on(ref, "SpawnAbility"):
        for pptr in row["data"]["m_spawnPrefab"]:
            yield from _chain(game, _ref(pptr), True, seen)


def _attack_spawns(game, item, attacks=("m_attack",)):
    """Prefabs an item's attacks spawn (Attack.OnAttackTrigger, Attack.SpawnOnHit); monsters never use
    their secondary attack."""
    for row in game.rows_on(item, "ItemDrop"):
        shared = row["data"]["m_itemData"]["m_shared"]
        yield _ref(shared["m_spawnOnHit"])
        for field in attacks:
            attack = shared[field]
            yield _ref(attack["m_attackProjectile"])
            yield _ref(attack["m_spawnOnTrigger"])
            if attack["m_spawnOnHitChance"] > 0:
                yield _ref(attack["m_spawnOnHit"])


def _summoned(game, data):
    """Creatures spawned by a creature's death effects and by the attacks of the items it carries."""
    refs = [_ref(e["m_prefab"]) for e in data.get("m_deathEffects", {}).get("m_effectPrefabs", []) if e["m_enabled"]]
    items = list(data.get("m_defaultItems", [])) + list(data.get("m_randomWeapon", []))
    items += [item for item_set in data.get("m_randomSets", []) for item in item_set["m_items"]]
    refs += [spawned for item in items for spawned in _attack_spawns(game, _ref(item))]
    return {target for ref in refs for target, _ in _chain(game, ref)}


def _dropped(game, root):
    drops = [e for row in game.rows_on(root, "CharacterDrop") for e in row["data"]["m_drops"] if e["m_chance"] > 0]
    return {game.creatures[_ref(e["m_prefab"])] for e in drops if _ref(e["m_prefab"]) in game.creatures}


def _grown(game, root):
    found = set()
    for row in game.rows_on(root, "Growup"):
        data = row["data"]
        grown = [data["m_grownPrefab"]] + [a["m_prefab"] for a in data["m_altGrownPrefabs"] if a["m_weight"] > 0]
        found |= {game.creatures[_ref(p)] for p in grown if _ref(p) in game.creatures}
    return found


def _bred(game, root):
    """(young creature, minimum level): the offspring itself, or what its egg grows into (EggGrow)."""
    found = set()
    for row in game.rows_on(root, "Procreation"):
        offspring = _ref(row["data"]["m_offspring"])
        hatched = [_ref(egg["data"]["m_grownPrefab"]) for egg in game.rows_on(offspring, "EggGrow")]
        found |= {(game.creatures[r], row["data"]["m_minOffspringLevel"]) for r in [offspring] + hatched
                  if r in game.creatures}
    return found


def _links(game, name):
    """(kind, creature, minimum level) a creature brings: summons, drops, grown and bred young."""
    row = game.creature_rows[name]
    links = {("summon", target, 1) for target in _summoned(game, row["data"])}
    links |= {("drop", target, 1) for target in _dropped(game, row["root_ref"])}
    links |= {("grow", target, 1) for target in _grown(game, row["root_ref"])}
    links |= {("breed", target, level) for target, level in _bred(game, row["root_ref"])}
    return sorted(links)


def _crafted(game):
    """(creature, source) of the creatures spawned by player-craftable items (an enabled Recipe)."""
    for recipe in game.found.rows("Recipe"):
        item = game.components.get(_ref(recipe["data"].get("m_item")))
        if not recipe["data"].get("m_enabled") or item is None:
            continue
        for ref in _attack_spawns(game, item["go_ref"], ("m_attack", "m_secondaryAttack")):
            for target, ability in _chain(game, ref):
                if ability:
                    yield target, _source("summoned by " + item["go"], LEVEL_ONE, tag="summon:" + item["go"])
                else:
                    yield target, _source("bomb " + item["go"], LEVEL_ONE, tag="bomb:" + item["go"])


def _span(sources):
    """(biomes, levels) over sources."""
    biomes = 0
    for s in sources:
        biomes |= s["biomes"]
    if not sources:
        return biomes, LEVEL_ONE
    return biomes, (min(s["levels"][0] for s in sources), max(s["levels"][1] for s in sources))


def _derived(name, kind, min_level, sources):
    """Sources a creature gives to what it brings, from its own sources."""
    biomes, (low, high) = _span(sources)
    if kind == "breed":  # a tamed parent, anywhere; the young at the parent's level
        return [_source("bred from " + name, (max(low, min_level), max(high, min_level)), tag="tamed")]
    if not sources:
        return []
    if kind == "grow":  # where the young one was, at its level
        groups = defaultdict(list)
        for s in sources:
            groups[s["tag"]].append(s)
        return [_source("grown from " + name, _span(g)[1], _span(g)[0], tag) for tag, g in groups.items()]
    if kind == "summon":
        return [_source("summoned by " + name, LEVEL_ONE, biomes, "summon:" + name)]
    return [_source("dropped by " + name, LEVEL_ONE, biomes, "drop:" + name)]


def _creature_chains(game, base):
    """Adds what creatures bring until nothing changes (each round only widens)."""
    links = {name: _links(game, name) for name in game.creature_rows}
    sources = base
    for _ in range(MAX_ROUNDS):
        grown = defaultdict(list, {name: list(found) for name, found in base.items()})
        for name, found in links.items():
            for kind, target, min_level in found:
                grown[target] += _derived(name, kind, min_level, sources.get(name, []))
        if _fingerprint(grown) == _fingerprint(sources):
            break
        sources = grown
    return sources


def _fingerprint(sources):
    return {name: sorted((s["tag"] or "", s["biomes"], s["levels"], s["label"]) for s in found)
            for name, found in sources.items() if found}


# ---------------------------------------------------------------------- result
def _biome_ids(mask):
    return [name for bit, name in sorted(BIOMES.items()) if mask & bit]


def _entry(sources):
    native = [s for s in sources if s["native"]]
    conditional = defaultdict(int)
    for s in sources:
        if not s["native"]:
            conditional[s["tag"]] |= s["biomes"]
    low, high = _span(native or sources)[1]
    fixed = {s["levels"] for s in sources}
    return {
        "native": _biome_ids(_span(native)[0]),
        "conditional": [{"source": tag, "biomes": _biome_ids(mask)} for tag, mask in sorted(conditional.items())],
        "stars": {"min": low - 1, "max": high - 1},
        "level": low if len(fixed) == 1 and low == high else None,
        "sources": _describe(sources),
    }


def _describe(sources):
    """One line per place, with its biomes and star range."""
    places = defaultdict(list)
    for s in sources:
        places[s["label"]].append(s)
    lines = []
    for label, found in places.items():
        biomes, (low, high) = _span(found)
        where = " [%s]" % ", ".join(_biome_ids(biomes)) if biomes else ""
        lines.append("%s%s, stars %d-%d" % (label, where, low - 1, high - 1))
    return lines


def resolve(index, found):
    """{prefab: {"native": [biome ids], "conditional": [{"source", "biomes"}], "stars": {"min", "max"},
    "level": fixed level or None, "sources": [str]}} for every creature (Humanoid or Character prefab)
    met somewhere; found = components.collect(CLASSES). Creatures never met are left out."""
    game = _Game(found)
    base = defaultdict(list)
    _open_world(game, base)
    _locations(game, base)
    _vegetation(game, base)
    _raids(game, base)
    _persistent_events(game, base)
    for target, source in _crafted(game):
        base[target].append(source)
    sources = _creature_chains(game, base)
    return {name: _entry(sources[name]) for name in sorted(sources) if sources[name]}
