"""One pass over every bundle (8 processes, ~10 s): the components a combat bestiary needs, recognised
by the top-level fields of their type tree instead of reading every object."""
from concurrent.futures import ProcessPoolExecutor

import UnityPy

from . import source

KINDS = {
    "character": {"m_health", "m_staggerDamageFactor", "m_faction"},
    "item": {"m_itemData"},
    "spawnlist": {"m_spawners"},
}
CHARACTER_FIELDS = (
    "m_name", "m_health", "m_staggerDamageFactor", "m_faction", "m_boss", "m_staggerWhenBlocked",
    "m_damageModifiers", "m_blockStaminaDrain", "m_perfectBlockStaminaDrain",
)
BLOCKER_FIELDS = (
    "m_name", "m_itemType", "m_maxQuality", "m_blockPower", "m_blockPowerPerLevel", "m_timedBlockBonus",
    "m_deflectionForce", "m_deflectionForcePerLevel", "m_movementModifier", "m_perfectBlockStaminaRegen",
)


def _kind(serialized_type):
    if serialized_type is None or serialized_type.node is None:
        return None
    fields = {child.m_Name for child in serialized_type.node.m_Children or []}
    return next((kind for kind, needed in KINDS.items() if needed <= fields), None)


def _local_name(sf, pptr):
    """Name of a GameObject in the same file; external references are not needed here."""
    if pptr.get("m_PathID") and not pptr.get("m_FileID"):
        obj = sf.objects.get(pptr["m_PathID"])
        return obj.peek_name() if obj else None
    return None


def _row(bundle, cab, sf, pid, kind, data):
    row = {"kind": kind, "bundle": bundle, "cab": cab, "pid": pid, "go": _local_name(sf, data.get("m_GameObject", {}))}
    if kind == "character":
        row.update({k[2:]: data.get(k) for k in CHARACTER_FIELDS if k in data})
        row["humanoid"] = "m_randomSets" in data
    elif kind == "item":
        shared = data["m_itemData"]["m_shared"]
        row.update({k[2:]: shared.get(k) for k in BLOCKER_FIELDS})
    else:
        row["spawners"] = [
            {
                "prefab": _local_name(sf, s.get("m_prefab", {})),
                "biome": s.get("m_biome"),
                "enabled": bool(s.get("m_enabled")),
                "globalKey": s.get("m_requiredGlobalKey") or None,
            }
            for s in data.get("m_spawners", [])
        ]
    return row


def _scan(bundle):
    try:
        env = UnityPy.load(source.source_path(bundle))
    except Exception as e:  # a damaged bundle must not stop the scan
        return bundle, [], str(e)[:200]
    rows = []
    for cab, sf in source.serialized_files(env):
        kinds = {}
        for pid, obj in sf.objects.items():
            if obj.type.name != "MonoBehaviour":
                continue
            st = obj.serialized_type
            kind = kinds.setdefault(id(st), _kind(st))
            if kind is None:
                continue
            try:
                data = obj.read_typetree()
            except Exception:
                continue
            if kind == "item" and not str(data["m_itemData"]["m_shared"].get("m_name", "")).startswith("$item_"):
                continue  # monster attacks are reached through their creature, only player items are kept
            rows.append(_row(bundle, cab, sf, pid, kind, data))
    return bundle, rows, None


class Scan:
    def __init__(self, rows, errors):
        self.characters = [r for r in rows if r["kind"] == "character"]
        self.items = [r for r in rows if r["kind"] == "item"]
        self.spawns = [s for r in rows if r["kind"] == "spawnlist" for s in r["spawners"]]
        self.errors = errors


def scan(workers=8):
    rows, errors = [], {}
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for bundle, found, err in ex.map(_scan, source.bundles(), chunksize=4):
            rows += found
            if err:
                errors[bundle] = err
    return Scan(rows, errors)
