"""Read-only access to the game's Unity files with UnityPy: install paths, a name index of the objects
and of the serialized files (CABs) each bundle holds, asset sets loaded with their dependencies, and
the class of every MonoBehaviour. Grown from Relooking's valheim_assets, now abandoned.

The index reads ~770 bundles (about 10 s on 8 processes); it is cached under out/index and rebuilt
when the game files change.
"""
import json
import os
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import UnityPy

DEFAULT_INSTALL = Path(r"C:\Program Files (x86)\Steam\steamapps\common\Valheim")
RESOURCES = "@resources"  # pseudo bundle name for resources.assets
INDEXED_TYPES = {"GameObject", "MonoBehaviour", "MonoScript", "TextAsset"}
INDEX_VERSION = 2  # bump when the rows change, to rebuild old caches


# ---------------------------------------------------------------------- install
def install_dir():
    env = os.environ.get("VALHEIM_INSTALL")
    return Path(env) if env else DEFAULT_INSTALL


def data_dir():
    return install_dir() / "valheim_Data"


def bundles_dir():
    return data_dir() / "StreamingAssets" / "SoftRef" / "Bundles"


def resources_assets():
    return data_dir() / "resources.assets"


def is_installed():
    return resources_assets().is_file() and bundles_dir().is_dir()


def bundles():
    folder = bundles_dir()
    return [RESOURCES] + sorted(f for f in os.listdir(folder) if os.path.isfile(folder / f))


def source_path(bundle):
    return str(resources_assets() if bundle == RESOURCES else bundles_dir() / bundle)


def serialized_files(env):
    """(cab name, SerializedFile) for every serialized file of a loaded bundle or .assets file."""
    for name, f in env.files.items():
        if hasattr(f, "objects"):  # a plain .assets file
            yield os.path.basename(str(name)).lower(), f
            continue
        for cab, sf in getattr(f, "files", {}).items():  # a bundle and the files it contains
            if hasattr(sf, "objects"):
                yield str(cab).lower(), sf


def external_cab(sf, file_index):
    """CAB name a file index of a serialized file points to (0 is the file itself)."""
    return None if file_index == 0 else os.path.basename(sf.externals[file_index - 1].path).lower()


# ---------------------------------------------------------------------- index
def _index_bundle(bundle):
    rows, cabs = [], []
    try:
        env = UnityPy.load(source_path(bundle))
    except Exception as e:  # a damaged bundle must not stop the index
        return bundle, [], [], str(e)[:200]
    for cab, sf in serialized_files(env):
        cabs.append(cab)
        for pid, obj in sf.objects.items():
            kind = obj.type.name
            if kind not in INDEXED_TYPES:
                continue
            try:
                name = obj.peek_name()
            except Exception:
                continue
            if kind == "MonoBehaviour" and not name:
                continue  # only named ScriptableObjects (recipes, status effects...) are worth indexing
            rows.append((bundle, cab, kind, name, pid))
    return bundle, rows, cabs, None


def _fingerprint():
    res = resources_assets().stat()
    return {
        "version": INDEX_VERSION,
        "install": str(install_dir()),
        "resources": [res.st_size, int(res.st_mtime)],
        "bundles": len(os.listdir(bundles_dir())),
    }


class Index:
    def __init__(self, out_dir):
        self.dir = os.path.join(out_dir, "index")
        self.objects_path = os.path.join(self.dir, "objects.tsv")
        self.meta_path = os.path.join(self.dir, "meta.json")
        self._cabs = None
        self._scripts = None

    def ensure(self, rebuild=False, workers=8):
        if not rebuild and self._fresh():
            return False
        os.makedirs(self.dir, exist_ok=True)
        cab_map, errors = {}, {}
        with open(self.objects_path, "w", encoding="utf-8", newline="\n") as out, ProcessPoolExecutor(max_workers=workers) as ex:
            for bundle, rows, cabs, err in ex.map(_index_bundle, bundles(), chunksize=4):
                if err:
                    errors[bundle] = err
                for cab in cabs:
                    cab_map[cab] = bundle
                for row in rows:
                    out.write("\t".join(str(v).replace("\t", " ").replace("\n", " ") for v in row) + "\n")
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(dict(_fingerprint(), cabs=cab_map, errors=errors), f, indent=1)
        self._cabs, self._scripts = cab_map, None
        return True

    def _fresh(self):
        if not (os.path.isfile(self.objects_path) and os.path.isfile(self.meta_path)):
            return False
        with open(self.meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        return all(meta.get(k) == v for k, v in _fingerprint().items())

    def rows(self):
        with open(self.objects_path, encoding="utf-8") as f:
            for line in f:
                bundle, cab, kind, name, pid = line.rstrip("\n").split("\t")
                yield bundle, cab, kind, name, int(pid)

    @property
    def cabs(self):
        if self._cabs is None:
            with open(self.meta_path, encoding="utf-8") as f:
                self._cabs = json.load(f)["cabs"]
        return self._cabs

    @property
    def scripts(self):
        """{(cab, path_id): class name} of every MonoScript."""
        if self._scripts is None:
            self._scripts = {(cab, pid): name for _, cab, kind, name, pid in self.rows() if kind == "MonoScript"}
        return self._scripts

    def find(self, kind, names):
        """{name: [(bundle, cab, path_id), ...]} for objects of that type, in index order."""
        wanted = set(names)
        found = {n: [] for n in names}
        for bundle, cab, k, name, pid in self.rows():
            if k == kind and name in wanted:
                found[name].append((bundle, cab, pid))
        return found


def class_of(scripts, cab, sf, serialized_type):
    """Class name of the MonoBehaviours of a serialized type, or None."""
    index = getattr(serialized_type, "script_type_index", -1)
    if serialized_type is None or index is None or index < 0 or index >= len(sf.script_types):
        return None
    ref = sf.script_types[index]
    owner = external_cab(sf, ref.local_serialized_file_index) or cab
    return scripts.get((owner, ref.local_identifier_in_file))


# ---------------------------------------------------------------------- asset sets
class AssetSet:
    """A bundle loaded together with its dependencies, so that cross-file references resolve."""

    def __init__(self, index, bundle, with_deps=True):
        paths = [source_path(bundle)]
        if with_deps and bundle != RESOURCES:
            first = UnityPy.load(paths[0])
            for _, sf in serialized_files(first):
                for ext in getattr(sf, "externals", []):
                    dep = index.cabs.get(os.path.basename(ext.path).lower())
                    if dep and dep != bundle and source_path(dep) not in paths:
                        paths.append(source_path(dep))
        self.env = UnityPy.load(*paths)
        self.files = dict(serialized_files(self.env))
        self._cache = {}

    def obj(self, cab, path_id):
        sf = self.files.get(cab)
        return sf.objects.get(path_id) if sf else None

    def read(self, obj):
        key = (id(obj.assets_file), obj.path_id)
        if key not in self._cache:
            try:
                self._cache[key] = obj.read_typetree()
            except Exception as e:
                self._cache[key] = {"__error__": str(e)[:120]}
        return self._cache[key]

    def resolve(self, owner, pptr):
        """Object a PPtr points to, seen from the file that owns the reference."""
        if not pptr or not pptr.get("m_PathID"):
            return None
        sf = owner.assets_file
        if pptr.get("m_FileID", 0):
            sf = self.files.get(external_cab(sf, pptr["m_FileID"]))
        return sf.objects.get(pptr["m_PathID"]) if sf else None

    def name_of(self, owner, pptr):
        obj = self.resolve(owner, pptr)
        if obj is None:
            return None
        data = self.read(obj)
        if data.get("m_Name"):
            return data["m_Name"]
        go = self.resolve(obj, data.get("m_GameObject"))
        return self.read(go).get("m_Name") if go else None
