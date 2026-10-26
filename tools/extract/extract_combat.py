"""Writes src/data/game.json: creatures, attacks, blockers and names, read from the local Valheim install
(read-only) and curation.json.

    python extract_combat.py [--out PATH]

Fails without writing when the curation has a gap: a hostile creature met somewhere with attacks,
neither listed nor ignored; a listed creature the game lacks or never places; a variant whose stats
differ from its creature; an ignored name the game lacks; an attack without a name. Curated names the
game makes useless are only reported.
"""
import argparse
import json
import sys

from combat_extract import build, curation, source

DEFAULT_OUT = source.HERE.parents[1] / "src" / "data" / "game.json"


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default=str(DEFAULT_OUT))
    args = p.parse_args(argv)
    if not source.is_installed():
        p.error("Valheim install not found (set VALHEIM_INSTALL)")

    data, report = build.build(source.index(), curation.load())
    gaps = {
        "hostile creatures neither listed nor ignored": report.uncurated,
        "listed creatures missing from the game": report.missing,
        "listed creatures met nowhere": report.unplaced,
        "variants whose stats differ from their creature (make them phases or creatures)": report.divergent,
        "ignored names that are no creature prefab": report.stale_ignored,
        "attacks without a name": ["%s: %s" % pair for pair in report.unnamed],
    }
    if report.unused_names:
        print("curated attack names no longer needed:\n  %s" % "\n  ".join(report.unused_names), file=sys.stderr)
    if any(gaps.values()):
        for title, items in gaps.items():
            if items:
                print("%s:\n  %s" % (title, "\n  ".join(items)), file=sys.stderr)
        return 1

    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    attacks = sum(len(f["attacks"]) for c in data["creatures"] for f in [c] + c.get("phases", []))
    print("%d creatures, %d attacks, %d blockers (Valheim %s) -> %s"
          % (len(data["creatures"]), attacks, len(data["blockers"]), data["game"]["version"], args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
