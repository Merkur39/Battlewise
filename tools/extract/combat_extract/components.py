"""Every MonoBehaviour of chosen classes, across all bundles (8 processes, ~15 s), with its full type
tree and where it lives:

- `bundle`, `cab`, `pid`: the component itself;
- `go`, `go_ref` (« cab:pid »): its GameObject; components of one prefab share a `go_ref`;
- `chain`: the GameObject and its ancestors up to the root, as refs; `root`, `root_ref`: the top one,
  i.e. the prefab, location or dungeon room it belongs to;
- `active`: whether the GameObject and every ancestor are active (an inactive one is never spawned);
- `data`: the type tree, where every reference (PPtr) gets `_ref` (« cab:pid » of its target, whatever
  file holds it) and, when the index knows the target, `_kind` and `_name`. A reference to a prefab
  gives its GameObject's ref, i.e. the `go_ref` of that prefab's components.

The class of a component comes from its MonoScript (unity.class_of), never from its fields.
"""
from concurrent.futures import ProcessPoolExecutor

import UnityPy

from . import source, unity

_scripts = {}
_wanted = set()


def _init(scripts, wanted):
    _scripts.update(scripts)
    _wanted.update(wanted)


def _owner_name(sf, data):
    go = data.get("m_GameObject") or {}
    if go.get("m_PathID") and not go.get("m_FileID"):
        obj = sf.objects.get(go["m_PathID"])
        return obj.peek_name() if obj else None
    return data.get("m_Name") or None


def _absolute(cab, sf, data):
    """Every PPtr of a type tree gets `_ref`: « cab:pid » of its target, the file resolved."""
    if isinstance(data, dict):
        if set(data) == {"m_FileID", "m_PathID"}:
            if data["m_PathID"]:
                target = unity.external_cab(sf, data["m_FileID"]) if data["m_FileID"] else cab
                data["_ref"] = "%s:%s" % (target, data["m_PathID"])
            return
        for value in data.values():
            _absolute(cab, sf, value)
    elif isinstance(data, list):
        for value in data:
            _absolute(cab, sf, value)


def _named(data, names):
    """Adds `_kind` and `_name` to every resolved PPtr the index knows."""
    if isinstance(data, dict):
        if "_ref" in data:
            found = names.get(data["_ref"])
            if found:
                data["_kind"], data["_name"] = found
            return
        for value in data.values():
            _named(value, names)
    elif isinstance(data, list):
        for value in data:
            _named(value, names)


class _Hierarchy:
    """Parents and active flags of the GameObjects of one serialized file, read on first use."""

    def __init__(self, sf):
        self.sf = sf
        self._parents = None
        self._active = {}

    def parents(self):
        if self._parents is None:
            transform_go, father = {}, {}
            for pid, obj in self.sf.objects.items():
                if obj.type.name not in ("Transform", "RectTransform"):
                    continue
                try:
                    data = obj.read_typetree()
                except Exception:
                    continue
                transform_go[pid] = data["m_GameObject"]["m_PathID"]
                if data["m_Father"]["m_PathID"] and not data["m_Father"]["m_FileID"]:
                    father[pid] = data["m_Father"]["m_PathID"]
            self._parents = {go: transform_go.get(father[t]) for t, go in transform_go.items() if t in father}
        return self._parents

    def chain(self, go):
        """The GameObject and its ancestors, root last."""
        parents, chain = self.parents(), [go]
        while chain[-1] in parents and parents[chain[-1]] and parents[chain[-1]] not in chain:
            chain.append(parents[chain[-1]])
        return chain

    def active(self, go):
        if go not in self._active:
            obj = self.sf.objects.get(go)
            try:
                self._active[go] = bool(obj.read_typetree().get("m_IsActive", 1)) if obj else True
            except Exception:
                self._active[go] = True
        return self._active[go]


def _walk(bundle):
    try:
        env = UnityPy.load(unity.source_path(bundle))
    except Exception as e:
        return bundle, {}, [], str(e)[:200]
    counts, rows = {}, []
    for cab, sf in unity.serialized_files(env):
        hierarchy = _Hierarchy(sf)
        classes = {}
        for pid, obj in sf.objects.items():
            if obj.type.name != "MonoBehaviour":
                continue
            st = obj.serialized_type
            cls = classes.setdefault(id(st), unity.class_of(_scripts, cab, sf, st) or "?")
            counts[cls] = counts.get(cls, 0) + 1
            if cls not in _wanted:
                continue
            try:
                data = obj.read_typetree()
            except Exception as e:
                data = {"__error__": str(e)[:200]}
            row = {"class": cls, "bundle": bundle, "cab": cab, "pid": pid, "go": _owner_name(sf, data),
                   "go_ref": None, "chain": [], "root": None, "root_ref": None, "active": True}
            go = data.get("m_GameObject") or {}
            if go.get("m_PathID") and not go.get("m_FileID"):
                chain = hierarchy.chain(go["m_PathID"])
                root = sf.objects.get(chain[-1])
                row.update({
                    "go_ref": "%s:%s" % (cab, chain[0]),
                    "chain": ["%s:%s" % (cab, g) for g in chain],
                    "root": root.peek_name() if root else None,
                    "root_ref": "%s:%s" % (cab, chain[-1]),
                    "active": all(hierarchy.active(g) for g in chain),
                })
            _absolute(cab, sf, data)
            row["data"] = data
            rows.append(row)
    return bundle, counts, rows, None


class Components:
    def __init__(self, totals, by_class, errors):
        self.totals = totals  # class -> number of components in the game
        self.by_class = by_class  # class -> rows
        self.errors = errors

    def rows(self, cls):
        return self.by_class.get(cls, [])


def collect(classes, workers=8):
    """Components of the given classes; `totals` counts every class anyway."""
    ix = source.index()
    totals, by_class, errors = {}, {}, {}
    with ProcessPoolExecutor(max_workers=workers, initializer=_init, initargs=(ix.scripts, set(classes))) as ex:
        for bundle, counts, rows, err in ex.map(_walk, unity.bundles(), chunksize=4):
            if err:
                errors[bundle] = err
            for cls, n in counts.items():
                totals[cls] = totals.get(cls, 0) + n
            for row in rows:
                by_class.setdefault(row["class"], []).append(row)
    if by_class:
        names = {"%s:%s" % (cab, pid): (kind, name) for _, cab, kind, name, pid in ix.rows()}
        for rows in by_class.values():
            for row in rows:
                _named(row["data"], names)
    return Components(totals, by_class, errors)
