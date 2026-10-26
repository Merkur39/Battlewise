"""Where the game data comes from: the extraction modules shared with Relooking (UnityPy index, asset
sets, localisation) and the local install, never written to."""
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent  # tools/extract
OUT = HERE / "out"
RELOOKING = Path(os.environ.get("RELOOKING_EXTRACT", HERE.parents[2] / "Relooking" / "tools" / "extract"))

if not (RELOOKING / "valheim_assets").is_dir():
    raise ImportError("valheim_assets not found in %s (set RELOOKING_EXTRACT)" % RELOOKING)
sys.path.insert(0, str(RELOOKING))

from valheim_assets import install, localization  # noqa: E402
from valheim_assets.assets import AssetSet  # noqa: E402
from valheim_assets.index import RESOURCES, Index, _serialized_files, source_path  # noqa: E402

__all__ = ["AssetSet", "RESOURCES", "Index", "localization", "serialized_files", "source_path"]

serialized_files = _serialized_files


def is_installed():
    return install.is_installed()


def bundles():
    folder = install.bundles_dir()
    return [RESOURCES] + sorted(f for f in os.listdir(folder) if os.path.isfile(folder / f))


def index():
    ix = Index(str(OUT))
    ix.ensure()
    return ix


def game_version():
    """Version written by the game in its log at each launch, and Steam build of the install.

    The log is only as fresh as the last launch: a warning says so when the install is newer."""
    steamapps = install.install_dir().parents[1]
    manifest = (steamapps / "appmanifest_892970.acf").read_text(encoding="utf-8", errors="replace")
    build = int(re.search(r'"buildid"\s+"(\d+)"', manifest).group(1))
    updated = int(re.search(r'"LastUpdated"\s+"(\d+)"', manifest).group(1))
    log = Path(os.path.expanduser("~")) / "AppData" / "LocalLow" / "IronGate" / "Valheim" / "Player.log"
    version = None
    if log.is_file():
        found = re.search(r"Valheim version: (\d+\.\d+\.\d+)", log.read_text(encoding="utf-8", errors="replace"))
        version = found.group(1) if found else None
        if log.stat().st_mtime < updated:
            print("warning: the game was updated after its last launch, version %s may be stale" % version, file=sys.stderr)
    return {"version": version, "build": build}
