"""Hand-kept choices the game data does not carry (curation.json): the order of the biomes, which
creatures to list and in which order, which variants join them, which later phases a boss has, which
creatures are left out and why, item patterns left out of the Arsenal, and the names of the attacks
whose item has no localised name in the game (taken from the Valheim wiki where it gives them). Where a
creature lives, its levels and everything about its attacks come from the game data."""
import json

from . import source

PATH = source.HERE / "curation.json"


def load(path=PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)
