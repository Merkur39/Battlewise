"""The blockers: what the player can block with, read from the game components (components.collect over
CLASSES), with where each one comes from and how far it can be upgraded.

Game rules followed:
- Humanoid.GetCurrentBlocker blocks with the left-hand item, else the current weapon, else
  Player.m_unarmedWeapon; the candidates are the items ObjectDB registers with a weapon type
  (ItemData.IsWeapon: 3, 4, 14, 15, 22) or a shield (5), a block power and a localised name, plus the
  unarmed weapon (group « unarmed », named from skill_unarmed, obtain None: nothing to obtain), whose
  movement modifier is 0: Player.UpdateModifiers only sums the items it has equipped;
- a shield's group follows its parry bonus: above 2 a buckler, 1 or less a tower (Humanoid.BlockAttack
  only parries above 1), a round shield otherwise;
- modifiers: m_shared.m_damageModifiers, merged as HitData.DamageModifiers.Apply does, which
  Humanoid.BlockAttack applies to the hit before the block;
- a recipe is available when enabled or listed by a SeasonalItemGroup (Player.GetAvailableRecipes);
- upgradable: an available recipe for an item of the same m_name, both above quality 1
  (InventoryGui.UpdateRecipeList matches the inventory by name); maxQuality stays the game's value;
- forge: at a station with m_upgrader (the Forge of Potential), the same recipe goes past maxQuality
  when it has an m_upgraderResource, the idol paid at each level (InventoryGui.DoCrafting);
- consumable: an attack uses the item up (Attack.m_consumeItem, Attack.ConsumeItem) and its projectile
  does not drop it back (Projectile.m_respawnItemOnHit, set on thrown spears): bombs, snowballs.

Where an item comes from (`obtain`), the first that applies:
- dlc: m_shared.m_dlc is set (Humanoid.EquipItem and Player.GetAvailableRecipes ask for the DLC);
- craft: an available recipe that is not m_noCraftOnlyUpgrade, or a station conversion (CONVERTERS
  m_conversion) of an item that has a source;
- upgradeOnly: it comes from a conversion and its recipe only upgrades it (the cast Nord gold items);
- trader: a Trader sells it;
- world: a container, pickable, drop table or creature drop holds it (WORLD, CharacterDrop).
An item with none of these is left out (KnifeVoid, PickaxeStone in 1.0.21).

Limits of these sources:
- a component counts wherever it sits, except in a location every location list leaves disabled
  (ZoneSystem, LocationList, AltBiomeList entries, resolved by asset id through softref, since
  ZoneLocation.m_prefabName is stale): the Dev* test scenes, TheDarkestHole...
  Prefabs, dungeon rooms and vegetation are taken as placed without following who places them;
- a creature drop counts when the creature sits in a location or a SPAWNERS field references it,
  whether that spawner entry is enabled or not;
- recipe ingredients, crafting and conversion stations are not checked for a source; loose items lying
  in locations are not read (none is a blocker in 1.0.21).
"""
import fnmatch

from . import softref
from .damage import pair_modifiers

# ItemDrop.ItemData.ItemType of the items that can block, and their group.
BLOCKER_TYPES = {3: "weapon", 4: "weapon", 5: "shield", 14: "weapon", 15: "other", 22: "weapon"}
# Components that hold items in the world, and their fields that do.
WORLD = {
    "Container": ("m_defaultItems",),
    "DropOnDestroyed": ("m_dropWhenDestroyed",),
    "Pickable": ("m_itemPrefab", "m_extraDrops"),
    "PickableItem": ("m_itemPrefab", "m_randomItemPrefabs"),
    "LootSpawner": ("m_items",),
    "MineRock": ("m_dropItems",),
    "MineRock5": ("m_dropItems",),
    "TreeBase": ("m_dropWhenDestroyed",),
    "TreeLog": ("m_dropWhenDestroyed",),
    "Destructible": ("m_spawnWhenDestroyed",),
    "Fish": ("m_extraDrops",),
    "Beehive": ("m_honeyItem",),
    "SapCollector": ("m_spawnItem",),
}
TRADERS = {"Trader": ("m_items",)}
CONVERTERS = ("CookingStation", "Smelter", "Fermenter")
# Components that bring a creature into the world, for its CharacterDrop to count.
SPAWNERS = {
    "SpawnSystemList": ("m_spawners",),
    "AltBiomeList": ("m_alts",),
    "LocationList": ("m_events",),
    "RandEventSystem": ("m_events",),
    "CreatureSpawner": ("m_creaturePrefab",),
    "SpawnArea": ("m_prefabs",),
    "TriggerSpawner": ("m_creaturePrefabs",),
    "OfferingBowl": ("m_bossPrefab",),
    "SpawnAbility": ("m_spawnPrefab",),
    "EggHatch": ("m_spawnPrefab",),
    "Growup": ("m_grownPrefab", "m_altGrownPrefabs"),
}
LOCATION_LISTS = ("ZoneSystem", "LocationList", "AltBiomeList")
CLASSES = tuple(sorted(
    {"ItemDrop", "ObjectDB", "Recipe", "SeasonalItemGroup", "Player", "CraftingStation", "CharacterDrop", "Projectile"}
    | set(WORLD) | set(TRADERS) | set(CONVERTERS) | set(SPAWNERS) | set(LOCATION_LISTS)
))


def blockers(found, names, ignored):
    """Blocker dicts sorted by group, block power and id. `found` holds the CLASSES components (a
    components.Components), `names` maps a localisation key to {"fr", "en"}, `ignored` holds fnmatch
    patterns of item ids (curation "ignoredItems")."""
    items = _items(found)
    placed = _placed(found)
    recipes = _recipes(found, items)
    sources = _sources(found, items, recipes, placed)
    upgrade_only = {_made_by(r, items)[0] for r in recipes if r["m_noCraftOnlyUpgrade"]}
    has_forge = any(row["data"]["m_upgrader"] for row in found.rows("CraftingStation") if placed(row))
    given_back = {row["go_ref"] for row in found.rows("Projectile") if row["data"]["m_respawnItemOnHit"]}

    def blocker(item_id, shared, name, group, obtain):
        upgradable, idol = _upgrades(shared, recipes, items)
        return dict(
            _stats(item_id, shared, name, group),
            upgradable=upgradable,
            forge={"idol": idol} if has_forge and idol in sources else None,
            obtain=obtain,
            consumable=_used_up(shared, given_back),
        )

    result = []
    for item_id, shared in _candidates(items):
        name = names(shared["m_name"])
        if item_id in sources and name["en"] and not _ignored(item_id, ignored):
            obtain = _obtain(shared, sources[item_id], item_id in upgrade_only)
            result.append(blocker(item_id, shared, name, _group(shared), obtain))
    unarmed = _unarmed(found, items)
    if unarmed and not _ignored(unarmed[0], ignored):
        result.append(dict(blocker(*unarmed, names("skill_unarmed"), "unarmed", None), movementModifier=0))
    return sorted(result, key=lambda b: (b["group"], b["blockPower"], b["id"]))


def obtainable(found):
    """{item id: m_shared} of the items the player can get, as blockers() finds their sources."""
    items = _items(found)
    sources = _sources(found, items, _recipes(found, items), _placed(found))
    return {item_id: shared for item_id, shared in items.values() if item_id in sources}


def forge(found, names):
    """{"name"} of the station that upgrades past maxQuality (the Forge of Potential), None when no world
    has one."""
    placed = _placed(found)
    station = next((row["data"] for row in found.rows("CraftingStation")
                    if row["data"]["m_upgrader"] and placed(row)), None)
    return {"name": names(station["m_name"])} if station else None


# ---------------------------------------------------------------------- items
def _items(found):
    """{ref: (id, m_shared)} of the ItemDrop prefabs ObjectDB registers, under the ref of their
    GameObject and of their ItemDrop (recipes and traders point to the latter)."""
    registered = {ref for row in found.rows("ObjectDB") for ref in _refs(row["data"]["m_items"])}
    items = {}
    for row in found.rows("ItemDrop"):
        if row["go_ref"] in registered:
            item = (row["go"], row["data"]["m_itemData"]["m_shared"])
            items[row["go_ref"]] = items["%s:%s" % (row["cab"], row["pid"])] = item
    return items


def _candidates(items):
    seen = set()
    for item_id, shared in items.values():
        if item_id not in seen and shared["m_itemType"] in BLOCKER_TYPES and shared["m_blockPower"] > 0:
            seen.add(item_id)
            yield item_id, shared


def _unarmed(found, items):
    """(id, m_shared) of Player.m_unarmedWeapon, what blocks with empty hands, or None."""
    refs = {row["data"]["m_unarmedWeapon"].get("_ref") for row in found.rows("Player")}
    return next((items[ref] for ref in refs if ref in items), None)


def _ignored(item_id, patterns):
    return any(fnmatch.fnmatchcase(item_id, pattern) for pattern in patterns)


def _number(value, digits=4):
    value = round(float(value), digits)
    return int(value) if value.is_integer() else value


def _group(shared):
    group = BLOCKER_TYPES[shared["m_itemType"]]
    if group == "shield":
        bonus = shared["m_timedBlockBonus"]
        group = "buckler" if bonus > 2 else "tower" if bonus <= 1 else "round"
    return group


def _stats(item_id, shared, name, group):
    return {
        "id": item_id,
        "name": name,
        "group": group,
        "maxQuality": shared["m_maxQuality"],
        "blockPower": _number(shared["m_blockPower"]),
        "blockPowerPerLevel": _number(shared["m_blockPowerPerLevel"]),
        "timedBlockBonus": _number(shared["m_timedBlockBonus"]),
        "deflectionForce": _number(shared["m_deflectionForce"]),
        "deflectionForcePerLevel": _number(shared["m_deflectionForcePerLevel"]),
        "movementModifier": _number(shared["m_movementModifier"]),
        "perfectBlockStaminaRegen": _number(shared["m_perfectBlockStaminaRegen"]),
        "modifiers": pair_modifiers(shared["m_damageModifiers"]),
    }


def _used_up(shared, given_back):
    """An attack consumes the item (Attack.ConsumeItem) and its projectile does not drop it back
    (Projectile.m_respawnItemOnHit, which thrown spears have)."""
    return any(attack["m_consumeItem"] and attack["m_attackProjectile"].get("_ref") not in given_back
               for attack in (shared["m_attack"], shared["m_secondaryAttack"]))


# ---------------------------------------------------------------------- recipes
def _recipes(found, items):
    """The recipes Player.GetAvailableRecipes can offer: ObjectDB's, enabled or in a season, with an item."""
    seasonal = {ref for row in found.rows("SeasonalItemGroup") for ref in _refs(row["data"]["Recipes"])}
    rows = {"%s:%s" % (row["cab"], row["pid"]): row["data"] for row in found.rows("Recipe")}
    recipes = {}
    for row in found.rows("ObjectDB"):
        for ref in _refs(row["data"]["m_recipes"]):
            recipe = rows.get(ref)
            if recipe and (recipe["m_enabled"] or ref in seasonal) and recipe["m_item"].get("_ref") in items:
                recipes.setdefault(ref, recipe)
    return list(recipes.values())


def _made_by(recipe, items):
    return items[recipe["m_item"]["_ref"]]


def _upgrades(shared, recipes, items):
    """(upgradable at a station, id of the idol the Forge of Potential asks for, or None)."""
    if shared["m_maxQuality"] <= 1:
        return False, None
    same = [r for r in recipes if _same_item(_made_by(r, items)[1], shared)]
    for recipe in same:
        for requirement in recipe["m_resources"]:
            idol = items.get(requirement["m_resItem"].get("_ref"))
            if requirement["m_upgraderResource"] and idol:
                return True, idol[0]
    return bool(same), None


def _same_item(made, shared):
    return made["m_name"] == shared["m_name"] and made["m_maxQuality"] > 1


# ---------------------------------------------------------------------- sources
def _sources(found, items, recipes, placed):
    """{item id: kinds of source}, kinds among craft, convert, trader, world."""
    sources = {}

    def add(refs, kind):
        for ref in refs:
            if ref in items:
                sources.setdefault(items[ref][0], set()).add(kind)

    add((r["m_item"]["_ref"] for r in recipes if not r["m_noCraftOnlyUpgrade"]), "craft")
    add(_held(found, TRADERS, placed), "trader")
    add(_held(found, WORLD, placed), "world")
    add(_creature_drops(found, placed), "world")
    _add_conversions(found, items, placed, sources)
    return sources


def _held(found, table, placed):
    """Refs under the listed fields of each class's components that can reach a world."""
    for cls, fields in table.items():
        for row in found.rows(cls):
            if placed(row):
                for field in fields:
                    yield from _refs(row["data"].get(field))


def _creature_drops(found, placed):
    spawned = set(_held(found, SPAWNERS, placed))
    for row in found.rows("CharacterDrop"):
        in_location = row["root_ref"] != row["go_ref"]
        if placed(row) and (in_location or row["go_ref"] in spawned):
            yield from _refs(row["data"]["m_drops"])


def _add_conversions(found, items, placed, sources):
    """A station conversion gives its output once its input has a source (smelted, fermented, cast)."""
    pairs = [(items.get(c["m_from"].get("_ref")), items.get(c["m_to"].get("_ref")))
             for cls in CONVERTERS for row in found.rows(cls) if placed(row) for c in row["data"]["m_conversion"]]
    pairs = [(source[0], product[0]) for source, product in pairs if source and product]
    changed = True
    while changed:
        changed = False
        for source, product in pairs:
            if source in sources and "convert" not in sources.get(product, ()):
                sources.setdefault(product, set()).add("convert")
                changed = True


def _obtain(shared, kinds, upgrade_only):
    if shared["m_dlc"]:
        return "dlc"
    if "craft" in kinds:
        return "craft"
    if "convert" in kinds:
        return "upgradeOnly" if upgrade_only else "craft"
    return "trader" if "trader" in kinds else "world"


# ---------------------------------------------------------------------- placement
def _placed(found):
    """Whether a component can reach a world: it is not inside a location every list leaves disabled."""
    unused = _unused_locations(found)
    return lambda row: (row["bundle"], row["root"]) not in unused


def _unused_locations(found):
    """(bundle, name) of the location prefabs the location lists name but never enable."""
    enabled = {}
    for entry, on in _zone_locations(found):
        key = softref.prefab(entry["m_prefab"])
        if key:
            enabled[key] = enabled.get(key, False) or on
    return {key for key, on in enabled.items() if not on}


def _zone_locations(found):
    """(ZoneLocation, enabled) of every location list (ZoneSystem.SetupLocations goes by m_prefab)."""
    for cls in ("ZoneSystem", "LocationList"):
        for row in found.rows(cls):
            for entry in row["data"]["m_locations"]:
                yield entry, bool(entry["m_enable"])
    for row in found.rows("AltBiomeList"):
        for alt in row["data"]["m_alts"]:
            for entry in alt["m_addLocations"]:
                yield entry, bool(alt["m_enabled"] and entry["m_enable"])


def _refs(data):
    """Every resolved reference (« cab:pid ») in a piece of type tree."""
    if isinstance(data, dict):
        if "_ref" in data:
            yield data["_ref"]
            return
        for value in data.values():
            yield from _refs(value)
    elif isinstance(data, list):
        for value in data:
            yield from _refs(value)
