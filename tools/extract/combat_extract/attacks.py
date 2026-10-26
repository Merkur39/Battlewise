"""A creature's attacks, read from the weapon items it carries and followed into the projectiles and
areas they spawn, as Attack.OnAttackTrigger, Projectile.Setup and Aoe.Setup use them:

- a melee or area attack hits with the item damage × m_damageMultiplier;
- a projectile carries the same hit (its own damage is overwritten), unless it only deals damage
  through what it spawns; an area spawned on impact adds a hit of its own;
- an area spawned as the « projectile » uses the attack hit when it takes the attack settings,
  its own otherwise; an area spawned on trigger always uses its own;
- a spawn that is neither (fissures, summons) cannot be read: the attack keeps its place with
  hits = None when it carries damage, and is left out otherwise; so does an attack that kills its
  user (an explosion);
- the projectile field of a melee attack is never used.
"""
from collections import defaultdict

from . import source

DAMAGE_TYPES = ("blunt", "slash", "pierce", "fire", "frost", "lightning", "poison", "spirit")
WEAPON_TYPES = {3, 4, 14, 22}  # one-handed, bow, two-handed, two-handed left
HORIZONTAL, VERTICAL, PROJECTILE, AREA = 0, 1, 2, 4


def _number(value):
    value = round(float(value), 2)
    return int(value) if value.is_integer() else value


def damages(raw, factor=1.0):
    return {t: _number(raw["m_" + t] * factor) for t in DAMAGE_TYPES if raw.get("m_" + t)}


def _hit(dmg, stagger, blockable, dodgeable, count=1):
    hit = {"damages": dmg, "staggerMultiplier": _number(stagger), "blockable": bool(blockable), "dodgeable": bool(dodgeable)}
    if count > 1:
        hit["count"] = count
    return hit


def _behaviours(aset, go):
    for ref in aset.read(go).get("m_Component", []):
        comp = aset.resolve(go, ref["component"])
        if comp is not None and comp.type.name == "MonoBehaviour":
            yield aset.read(comp)


def _spawned(aset, owner, pptr):
    """('aoe' | 'projectile' | None, component data) of the prefab a PPtr spawns."""
    go = aset.resolve(owner, pptr) if pptr and pptr.get("m_PathID") else None
    if go is None:
        return None, None, None
    for data in _behaviours(aset, go):
        if "m_useAttackSettings" in data and "m_radius" in data:
            return "aoe", data, go
        if "m_onlySpawnedProjectilesDealDamage" in data:
            return "projectile", data, go
    return "other", None, go


def _aoe_hit(aoe, attack_hit):
    if aoe["m_useAttackSettings"] and attack_hit is not None:
        return dict(attack_hit)
    return _hit(damages(aoe["m_damage"]), 1, aoe["m_blockable"], aoe["m_dodgeable"])


def _attack(aset, item_go, shared):
    """(kind, hits) of one attack item, or None when it deals no damage."""
    attack = shared["m_attack"]
    kind_id = attack["m_attackType"]
    base = _hit(
        damages(shared["m_damages"], attack["m_damageMultiplier"]),
        attack["m_staggerMultiplier"], shared["m_blockable"], shared["m_dodgeable"],
    )
    if kind_id in (HORIZONTAL, VERTICAL, AREA):
        kind, hits = ("area" if kind_id == AREA else "melee"), [base]
        what, aoe, _ = _spawned(aset, item_go, attack.get("m_spawnOnTrigger"))
        if what == "aoe":
            hits.append(_aoe_hit(aoe, None))
    elif kind_id == PROJECTILE:
        what, data, go = _spawned(aset, item_go, attack.get("m_attackProjectile"))
        count = attack.get("m_projectiles", 1) or 1
        if what == "aoe":
            kind, hits = "area", [_aoe_hit(data, base)]
        elif what == "projectile":
            kind = "projectile"
            hits = [] if data["m_onlySpawnedProjectilesDealDamage"] and data["m_spawnOnHit"].get("m_PathID") else [dict(base)]
            if count > 1:
                for h in hits:
                    h["count"] = count
            sub, aoe, _ = _spawned(aset, go, data.get("m_spawnOnHit"))
            if sub == "aoe":
                hits.append(_aoe_hit(aoe, base))
        else:
            return ("projectile", None) if base["damages"] else None
    else:
        return None  # None and TriggerProjectile attacks deal no damage themselves
    hits = [h for h in hits if h["damages"]]
    if not hits and attack.get("m_attackKillsSelf"):
        return kind, None  # it explodes: the damage comes from its death, not from the attack
    return (kind, hits) if hits else None


def _item_refs(character):
    refs = list(character.get("m_defaultItems", [])) + list(character.get("m_randomWeapon", []))
    for item_set in character.get("m_randomSets", []):
        refs += item_set["m_items"]
    return refs


def creature_attacks(index, characters):
    """{prefab: [{"id", "kind", "hits"}]} for humanoid characters, bundle by bundle."""
    by_bundle = defaultdict(list)
    for row in characters:
        if row["humanoid"]:
            by_bundle[row["bundle"]].append(row)
    result = {}
    for bundle, rows in by_bundle.items():
        aset = source.AssetSet(index, bundle, with_deps=True)
        for row in rows:
            mono = aset.obj(row["cab"], row["pid"])
            attacks, seen = [], set()
            for ref in _item_refs(aset.read(mono)):
                go = aset.resolve(mono, ref)
                if go is None or go.path_id in seen:
                    continue
                seen.add(go.path_id)
                item = next((d for d in _behaviours(aset, go) if "m_itemData" in d), None)
                if item is None or item["m_itemData"]["m_shared"]["m_itemType"] not in WEAPON_TYPES:
                    continue
                found = _attack(aset, go, item["m_itemData"]["m_shared"])
                if found:
                    attacks.append({"id": aset.read(go)["m_Name"], "kind": found[0], "hits": found[1]})
            result.setdefault(row["go"], attacks)
    return result
