"""Hand-kept choices the game data does not carry (curation.json): which creatures to list and in
which biomes, which variants join them or are left out and why, and the names of the attacks, which
the game does not have (taken from the Valheim wiki where it gives them)."""
import json

from . import source

PATH = source.HERE / "curation.json"


def load(path=PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)
