"""The SoftRef manifest (StreamingAssets/SoftRef/manifest and manifest_extended): which bundle and path hold
the asset behind a SoftReference. Locations and dungeon rooms are only reached that way: the game matches
them by asset ID (ZoneSystem.SetupLocations overwrites ZoneLocation.m_prefabName with the asset's name,
so the serialized name is stale and must never be used)."""
import os
import re

from . import unity

MANIFESTS = ("manifest", "manifest_extended")
ENTRY = re.compile(r"- asset ID: ([0-9a-f]{32})\s*\n\s*bundle: (\S+)\s*\n\s*path in bundle: ([^\r\n]+)")

_assets = {}


def manifest_dir():
    return unity.data_dir() / "StreamingAssets" / "SoftRef"


def assets():
    """{asset ID: (bundle, path in bundle)} of both manifests, read once."""
    if not _assets:
        for name in MANIFESTS:
            text = (manifest_dir() / name).read_text(encoding="utf-8-sig")
            for asset, bundle, path in ENTRY.findall(text):
                _assets[asset] = (bundle, path.strip())
    return _assets


def asset_id(soft_ref):
    """Asset ID of a SoftReference type tree: '%08x' of v3, v2, v1, v0."""
    ids = soft_ref.get("m_assetID", soft_ref)
    return "".join("%08x" % (ids[k] & 0xFFFFFFFF) for k in ("v3", "v2", "v1", "v0"))


def prefab(soft_ref):
    """(bundle, prefab name) a SoftReference points to, or None when the asset is unknown."""
    found = assets().get(asset_id(soft_ref))
    if found is None:
        return None
    bundle, path = found
    return bundle, os.path.splitext(os.path.basename(path))[0]
