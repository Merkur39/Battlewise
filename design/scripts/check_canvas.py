"""Sanity checks on the canvas source before publishing.

- every board in canvas.json exists, and every link points to an existing board of the same theme page;
- no Origine colour is left in a theme board (Réglages boards carry every palette on purpose);
- every board's DCLogic script runs under node (needs run_logic.js next to this file).
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT = Path(sys.argv[1])
RUN_LOGIC = Path(__file__).with_name("run_logic.js")
PREFIXES = ["Braise", "Brume", "Jour", "Runes", "Graphite", "Parchemin"]
ORIGINE = ["#0D1214", "#151C1F", "#1D3344", "#2C383D", "#1F2A2E", "#E2E8E8", "#97A5AA", "#7D8B91",
           "#8EBDE3", "#B5D4F0", "#6CC08A", "#2E7A4B", "#D9A043", "#B5760C", "#E36B5E", "#7A2A24"]
LINK = re.compile(r'href="([^"]+\.dc\.html)"')


def prefix_of(name):
    return next((p for p in PREFIXES if name.startswith(p + "-")), None)


def main():
    index = json.loads((PROJECT / "canvas.json").read_text(encoding="utf-8"))
    problems = []
    node = shutil.which("node")
    for name, board in index["boards"].items():
        path = PROJECT / name
        if not path.exists():
            problems.append(f"{name}: listed in canvas.json but missing")
            continue
        text = path.read_text(encoding="utf-8")
        archived = board.get("page") == "sim"
        for target in LINK.findall(text):
            if not (PROJECT / target).exists():
                problems.append(f"{name}: broken link {target}")
            elif not archived and prefix_of(target) != prefix_of(name):
                problems.append(f"{name}: link leaves its theme page: {target}")
        if prefix_of(name) and not name.endswith("Reglages.dc.html"):
            leaked = [c for c in ORIGINE if c in text.upper()]
            if leaked:
                problems.append(f"{name}: Origine colours left {leaked}")
        if node and 'data-dc-script' in text:
            run = subprocess.run([node, str(RUN_LOGIC), str(path)], capture_output=True, text=True)
            if run.returncode != 0:
                problems.append(f"{name}: script fails: {run.stderr.strip().splitlines()[-1] if run.stderr else run.returncode}")
    if not node:
        print("node not found: scripts not executed")
    for p in problems:
        print(p)
    print(f"{len(index['boards'])} boards checked, {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


main()
