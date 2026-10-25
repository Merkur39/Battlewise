"""Theme palettes of the canvas: each Origine colour maps to a role, each theme gives every role a colour.

Used by sync_themes.py; every hex colour on an Origine board must be one of the 16 roles below."""
import re

# Original token -> role, in the order of the Tokens board.
ROLES = {
    "#0D1214": "bg", "#151C1F": "surface", "#1D3344": "selection", "#2C383D": "line",
    "#1F2A2E": "lineSoft", "#E2E8E8": "ink", "#97A5AA": "secondary", "#7D8B91": "faint",
    "#8EBDE3": "accent", "#B5D4F0": "accentHover",
    "#6CC08A": "ok", "#2E7A4B": "okFill", "#D9A043": "warn", "#B5760C": "warnFill",
    "#E36B5E": "bad", "#7A2A24": "badFill",
}

VARIANTS = {
    "braise": {
        "prefix": "Braise", "name": "Braise", "tokens": "Système Braise",
        "bg": "#15110E", "surface": "#1F1915", "selection": "#3A2D21", "line": "#3D332A",
        "lineSoft": "#2B241E", "ink": "#EFE6D8", "secondary": "#B8A994", "faint": "#9A8B78",
        "accent": "#EBD3A2", "accentHover": "#F5E4C3",
        "ok": "#86C68E", "okFill": "#3D7C47", "warn": "#F2963F", "warnFill": "#B5601A",
        "bad": "#EC6A5E", "badFill": "#8B2E26",
    },
    "brume": {
        "prefix": "Brume", "name": "Brume", "tokens": "Système Brume",
        "bg": "#110F18", "surface": "#1A1724", "selection": "#2E2747", "line": "#342D47",
        "lineSoft": "#241F33", "ink": "#E9E5F3", "secondary": "#A9A2BF", "faint": "#8D86A4",
        "accent": "#BBA6F7", "accentHover": "#D5C8FB",
        "ok": "#6FC594", "okFill": "#2F7A52", "warn": "#E3AA4C", "warnFill": "#A86F12",
        "bad": "#F0726A", "badFill": "#812C28",
    },
    "jour": {
        "prefix": "Jour", "name": "Plein jour", "tokens": "Système Plein jour",
        "bg": "#F4F1EA", "surface": "#FFFFFF", "selection": "#DBE7F3", "line": "#D3CDC1",
        "lineSoft": "#E6E1D7", "ink": "#1B1F23", "secondary": "#50575F", "faint": "#656C73",
        "accent": "#1F5F94", "accentHover": "#174A73",
        "ok": "#22703E", "okFill": "#79C291", "warn": "#8C5800", "warnFill": "#E6AE4A",
        "bad": "#B23A30", "badFill": "#E07A70",
    },
    "runes": {
        "prefix": "Runes", "name": "Runes", "tokens": "Système Runes",
        "bg": "#0F1113", "surface": "#191C1F", "selection": "#123A35", "line": "#30363A",
        "lineSoft": "#22272A", "ink": "#ECE8DF", "secondary": "#ABA79D", "faint": "#8E8A80",
        "accent": "#4FE0C8", "accentHover": "#8CEEDD",
        "ok": "#7EE07A", "okFill": "#2F8A3A", "warn": "#FFB43D", "warnFill": "#C27A0A",
        "bad": "#FF5A4E", "badFill": "#9A241C",
    },
    "graphite": {
        "prefix": "Graphite", "name": "Graphite", "tokens": "Système Graphite",
        "bg": "#111113", "surface": "#1A1A1D", "selection": "#1E2A44", "line": "#2E2E33",
        "lineSoft": "#222226", "ink": "#EDEDEF", "secondary": "#A1A1AA", "faint": "#8A8A93",
        "accent": "#6EA0FF", "accentHover": "#9CBEFF",
        "ok": "#5BBF7E", "okFill": "#276B43", "warn": "#E5A84B", "warnFill": "#9C6A12",
        "bad": "#EF6461", "badFill": "#8A2A28",
    },
    "parchemin": {
        "prefix": "Parchemin", "name": "Parchemin", "tokens": "Système Parchemin",
        "bg": "#EFE7D6", "surface": "#F9F4E8", "selection": "#E3D3B0", "line": "#CDBFA3",
        "lineSoft": "#E2D7C1", "ink": "#2B2219", "secondary": "#5E5141", "faint": "#685B4A",
        "accent": "#24467A", "accentHover": "#1A3560",
        "ok": "#2F6B33", "okFill": "#8CC48A", "warn": "#8A5300", "warnFill": "#E7B456",
        "bad": "#A3322A", "badFill": "#DB8072",
    },
}

HEX = re.compile(r"#[0-9A-Fa-f]{6}\b")
TITLE = re.compile(r"<title>(.*?)</title>")


def recolour(text, palette):
    def swap(m):
        role = ROLES.get(m.group(0).upper())
        if role is None:
            raise SystemExit(f"unmapped colour {m.group(0)}")
        return palette[role]
    return HEX.sub(swap, text)
