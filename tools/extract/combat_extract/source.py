"""Where the game data comes from: the local install, never written to, read through UnityPy
(unity.py) and through the game code decompiled by decompile.cs."""
import functools
import re
import subprocess
from pathlib import Path

import UnityPy

from . import localization, unity
from .unity import RESOURCES, AssetSet, serialized_files, source_path

__all__ = ["AssetSet", "RESOURCES", "localization", "serialized_files", "source_path"]

HERE = Path(__file__).resolve().parent.parent  # tools/extract
OUT = HERE / "out"
DECOMPILED = OUT / "decompile" / "assembly_valheim.cs"


def is_installed():
    return unity.is_installed()


def bundles():
    return unity.bundles()


def index():
    ix = unity.Index(str(OUT))
    ix.ensure()
    return ix


def game_code():
    """The decompiled assembly_valheim, decompiled again (needs the .NET SDK) when the game changed."""
    dll = unity.data_dir() / "Managed" / "assembly_valheim.dll"
    if not DECOMPILED.is_file() or DECOMPILED.stat().st_mtime < dll.stat().st_mtime:
        subprocess.run(
            ["dotnet", "run", str(HERE / "decompile.cs"), "--", "assembly_valheim"],
            cwd=HERE, check=True, capture_output=True,
        )
    return DECOMPILED


@functools.cache
def fixed_timestep():
    """Time.fixedDeltaTime: the TimeManager's Fixed Timestep (globalgamemanagers), a rational number."""
    env = UnityPy.load(str(unity.data_dir() / "globalgamemanagers"))
    manager = next(obj for obj in env.objects if obj.type.name == "TimeManager").read_typetree()
    step = manager["Fixed Timestep"]
    return step["m_Count"] * step["m_Rate"]["m_Denominator"] / step["m_Rate"]["m_Numerator"]


def game_version():
    """Version compiled into the game (Version.CurrentVersion) and Steam build of the install."""
    code = game_code().read_text(encoding="utf-8", errors="replace")
    found = re.search(r"CurrentVersion \{ get; \} = new GameVersion\((\d+), (\d+), (\d+)\)", code)
    manifest = (unity.install_dir().parents[1] / "appmanifest_892970.acf").read_text(encoding="utf-8", errors="replace")
    build = int(re.search(r'"buildid"\s+"(\d+)"', manifest).group(1))
    return {"version": ".".join(found.groups()), "build": build}
