"""The status effects and the equipment that change the rules the app explains: the stagger the player
takes, the stamina a block or a dodge costs, the parry bonus.

Game rules followed:
- SE_Stats.ModifyStagger, ModifyBlockStaminaUsage and ModifyDodgeStaminaUsage add the base value
  times their modifier, so each multiplies the base by 1 + modifier; ModifyBlockStaminaUsage then
  adds m_blockStaminaUseFlatValue; ModifyTimedBlockBonus multiplies the parry power by
  1 + m_timedBlockBonus (Humanoid.BlockAttack);
- equipment: Player.GetEquipmentBlockStaminaModifier and GetEquipmentDodgeStaminaModifier add up
  m_blockStaminaModifier and m_dodgeStaminaModifier of the items worn, on the same base;
- the player gets a status effect from a guardian power (ItemStand.m_guardianPower), a consumable
  (m_consumeStatusEffect), a trinket at full adrenaline (m_fullAdrenalineSE), a set
  (m_setStatusEffect) or an item worn (m_equipStatusEffect), of an item it can get (arsenal.obtainable).
"""
from . import arsenal

CLASSES = ("SE_Stats", "ItemStand")
KINDS = ("power", "consumable", "trinket", "set", "equipment")
ITEM_EFFECTS = (
    ("m_consumeStatusEffect", "consumable"),
    ("m_fullAdrenalineSE", "trinket"),
    ("m_setStatusEffect", "set"),
    ("m_equipStatusEffect", "equipment"),
)


def _number(value, digits=4):
    value = round(float(value), digits)
    return int(value) if value.is_integer() else value


def _status_changes(se):
    changes = {
        "stagger": 1 + se["m_staggerModifier"],
        "blockStamina": 1 + se["m_blockStaminaUseModifier"],
        "blockStaminaFlat": se["m_blockStaminaUseFlatValue"],
        "dodgeStamina": 1 + se["m_dodgeStaminaUseModifier"],
        "parryPower": 1 + se["m_timedBlockBonus"],
    }
    neutral = {"blockStaminaFlat": 0}
    return {k: _number(v) for k, v in changes.items() if _number(v) != neutral.get(k, 1)}


def _item_changes(shared):
    changes = {
        "blockStamina": 1 + (shared.get("m_blockStaminaModifier") or 0),
        "dodgeStamina": 1 + (shared.get("m_dodgeStaminaModifier") or 0),
    }
    return {k: _number(v) for k, v in changes.items() if _number(v) != 1}


def effects(found, names):
    """Rule effect dicts ({name, kind, and the multipliers that are not neutral}), by kind then
    English name. `found` holds CLASSES and arsenal.CLASSES."""
    stats = {"%s:%s" % (row["cab"], row["pid"]): row["data"] for row in found.rows("SE_Stats")}
    sources = [("power", row["data"]["m_guardianPower"].get("_ref")) for row in found.rows("ItemStand")]
    result, seen = [], set()
    for item_id, shared in sorted(arsenal.obtainable(found).items()):
        sources += [(kind, shared[field].get("_ref")) for field, kind in ITEM_EFFECTS]
        own = _item_changes(shared)
        if own:
            result.append({"name": names(shared["m_name"]), "kind": "equipment", **own})
    for kind, ref in sources:
        se = stats.get(ref)
        if se is None or se["m_name"] in seen:
            continue
        seen.add(se["m_name"])
        changes = _status_changes(se)
        if changes:
            result.append({"name": names(se["m_name"]), "kind": kind, **changes})
    return sorted(result, key=lambda e: (KINDS.index(e["kind"]), e["name"]["en"]))
