"""Writes src/data/game.json: creatures, attacks, blockers and names, read from the local Valheim install
(read-only) and curation.json.

    python extract_combat.py [--out PATH]

Fails without writing when the curation has a gap: a hostile creature neither listed nor ignored, a
listed creature the game lacks, an open-world spawn in a biome the curation does not give, or an
attack without a name.
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
        "open-world spawns outside the curated biomes": report.biome_conflicts,
        "attacks without a name": ["%s: %s" % pair for pair in report.unnamed],
    }
    if any(gaps.values()):
        for title, items in gaps.items():
            if items:
                print("%s:\n  %s" % (title, "\n  ".join(items)), file=sys.stderr)
        return 1

    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    attacks = sum(len(c["attacks"]) for c in data["creatures"])
    print("%d creatures, %d attacks, %d blockers (Valheim %s) -> %s"
          % (len(data["creatures"]), attacks, len(data["blockers"]), data["game"]["version"], args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
