"""The status effects that change a fight for the player: what a hit takes from them (resistances, armor),
the stagger they take, the power and the stamina of a guard, the stamina of a dodge; and where the player
gets each one.

Game rules followed:
- resistances: SE_Stats.m_mods, merged as HitData.DamageModifiers.Apply does (SEMan.ApplyDamageMods);
- armor: SE_Stats.ModifyArmorMods adds m_addArmor, then multiplies by 1 + m_armorMultiplier;
- SE_Stats.ModifyStagger, ModifyBlockStaminaUsage and ModifyDodgeStaminaUsage add the base value times
  their modifier, and ModifyBlockStaminaUsage then adds m_blockStaminaUseFlatValue; ModifyTimedBlockBonus
  multiplies the parry power by 1 + m_timedBlockBonus (Humanoid.BlockAttack). Each value is kept as the
  game holds it, a share added to the base, and only when it changes something;
- where an effect comes from: a guardian power (ItemStand.m_guardianPower, which
  Player.ActivateGuardianPower gives for m_ttl and holds back for m_cooldown); a drink, the
  m_consumeStatusEffect of a Consumable item (Humanoid.CanConsumeItem refuses any other type, such as the
  mead bases); a trinket, its m_fullAdrenalineSE once the adrenaline reaches Player.m_maxAdrenaline plus the
  items' m_maxAdrenaline (Player.GetMaxAdrenaline, AddAdrenaline); a set, its m_setStatusEffect once m_setSize
  items worn share m_setName (Humanoid.HaveSetEffect); an item worn, its m_equipStatusEffect. Only items the
  player can get count (arsenal.obtainable). An effect is known by its asset name, as SEMan keys it.
"""
from . import arsenal
from .damage import pair_modifiers

CLASSES = ("SE_Stats", "ItemStand", "Player")
KINDS = ("power", "consumable", "trinket", "set", "equipment")
CONSUMABLE = 2  # ItemDrop.ItemData.ItemType


def _number(value, digits=4):
    value = round(float(value), digits)
    return int(value) if value.is_integer() else value


def changes(se):
    """What an SE_Stats changes in a fight, named as the engine's Effect names it, without what changes
    nothing."""
    values = {
        "modifiers": pair_modifiers(se["m_mods"]),
        "addArmor": _number(se["m_addArmor"]),
        "armorMultiplier": _number(se["m_armorMultiplier"]),
        "staggerModifier": _number(se["m_staggerModifier"]),
        "parryBonus": _number(se["m_timedBlockBonus"]),
        "blockStaminaModifier": _number(se["m_blockStaminaUseModifier"]),
        "blockStaminaFlat": _number(se["m_blockStaminaUseFlatValue"]),
        "dodgeStaminaModifier": _number(se["m_dodgeStaminaUseModifier"]),
    }
    return {key: value for key, value in values.items() if value}


def _sources(found):
    """(kind, status effect ref, where it comes from) of every way the player gets an effect."""
    player = next(row for row in found.rows("Player") if row["go_ref"] == row["root_ref"])["data"]
    for row in found.rows("ItemStand"):
        yield "power", row["data"]["m_guardianPower"].get("_ref"), {}
    for item_id, shared in sorted(arsenal.obtainable(found).items()):
        if shared["m_itemType"] == CONSUMABLE:
            yield "consumable", shared["m_consumeStatusEffect"].get("_ref"), {"items": [item_id]}
        adrenaline = _number(player["m_maxAdrenaline"] + shared["m_maxAdrenaline"])
        yield "trinket", shared["m_fullAdrenalineSE"].get("_ref"), {"items": [item_id], "adrenaline": adrenaline}
        if shared["m_setName"] and shared["m_setSize"] > 1:
            yield "set", shared["m_setStatusEffect"].get("_ref"), {"set": {"id": shared["m_setName"], "size": shared["m_setSize"]}}
        yield "equipment", shared["m_equipStatusEffect"].get("_ref"), {"items": [item_id]}


def effects(found, names):
    """Rule effect dicts ({id, name, kind, where it comes from, ttl, cooldown, and its changes}), by kind
    then English name. `found` holds CLASSES and arsenal.CLASSES."""
    stats = {"%s:%s" % (row["cab"], row["pid"]): row["data"] for row in found.rows("SE_Stats")}
    result = {}
    for kind, ref, source in _sources(found):
        se = stats.get(ref)
        if se is None or not changes(se):
            continue
        effect = result.get(se["m_Name"])
        if effect is None:
            effect = result[se["m_Name"]] = {"id": se["m_Name"], "name": names(se["m_name"]), "kind": kind, **source}
            if se["m_ttl"] > 0:
                effect["ttl"] = _number(se["m_ttl"])
            if kind == "power":
                effect["cooldown"] = _number(se["m_cooldown"])
            effect.update(changes(se))
        elif "items" in source:
            effect["items"] = sorted(set(effect.get("items", [])) | set(source["items"]))
    return sorted(result.values(), key=lambda e: (KINDS.index(e["kind"]), e["name"]["en"]))
