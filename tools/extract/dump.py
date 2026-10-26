"""Looks into the game data: counts the MonoBehaviours of each class, or dumps the full type trees of
chosen classes to out/dump/<Class>.jsonl, one component per line, as combat_extract.components reads
them (where it lives, its GameObject and hierarchy, every reference resolved). The build never reads
these files.

    python dump.py --classes              # class -> count, to out/dump/classes.json
    python dump.py Humanoid Aoe Projectile
"""
import argparse
import json
import sys

from combat_extract import components, source


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("classes", nargs="*")
    p.add_argument("--classes", dest="histogram", action="store_true", help="count the components of each class")
    args = p.parse_args()
    out = source.OUT / "dump"
    out.mkdir(parents=True, exist_ok=True)
    found = components.collect(args.classes)
    (out / "classes.json").write_text(
        json.dumps(dict(sorted(found.totals.items(), key=lambda kv: -kv[1])), indent=1), encoding="utf-8"
    )
    for cls, rows in found.by_class.items():
        with open(out / (cls + ".jsonl"), "w", encoding="utf-8", newline="\n") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
        print("%-28s %6d -> %s" % (cls, len(rows), out / (cls + ".jsonl")))
    if args.histogram:
        print("%d classes -> %s" % (len(found.totals), out / "classes.json"))
    if found.errors:
        print("errors:", found.errors, file=sys.stderr)


if __name__ == "__main__":
    main()
