"""Damage-type icons shared by the canvas scripts: one stroke path per type, neutral colour, always shown with the word."""

# key -> (label, single-path icon on a 24 grid, fills the stagger bar)
TYPES = {
    "blunt": ("CONTONDANT", "M13 3l8 8-4 4-8-8zM13 11l-9 9", True),
    "slash": ("COUPANT", "M4 14L14 4M7 19L19 7M13 20l7-7", True),
    "pierce": ("PERFORANT", "M20 4l-7 3 4 4zM15 9L4 20", True),
    "fire": ("FEU", "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z", False),
    "frost": ("GIVRE", "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9", False),
    "lightning": ("FOUDRE", "M13 3L5 14h6l-1 7 8-11h-6l1-7z", True),
    "poison": ("POISON", "M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z", False),
    "spirit": ("ESPRIT", "M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01", False),
}
ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
INLINE = "vertical-align: -2px; margin-right: 3px"
TAG_STYLE = "font-family: 'IBM Plex Mono', monospace; font-size: {size}px; color: #97A5AA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"


def svg(key, size=12, style=INLINE):
    return f'<svg {ICON_ATTRS} width="{size}" height="{size}" style="{style}"><path d="{TYPES[key][1]}"></path></svg>'


def static_tag(keys, rest, size=10):
    """A tag line written out in the markup: icon + word per type, then the other tags."""
    parts = "".join(
        (svg(k, 12, INLINE if i == 0 else "vertical-align: -2px; margin: 0 3px 0 6px") + TYPES[k][0]) for i, k in enumerate(keys)
    )
    tail = f" · {rest}" if rest else ""
    return f'<span style="{TAG_STYLE.format(size=size)}">{parts}{tail}</span>'


def hole_tag(var, with_tags=True, size=10):
    """The same tag line fed by typeVals() holes: up to two types per attack."""
    tail = f" · {{{{ {var}.tags }}}}" if with_tags else ""
    second = "vertical-align: -2px; margin: 0 3px 0 6px"
    return (
        f'<span style="{TAG_STYLE.format(size=size)}">'
        f'<svg {ICON_ATTRS} width="12" height="12" style="{INLINE}"><path d="{{{{ {var}.t1d }}}}"></path></svg>{{{{ {var}.t1 }}}}'
        f'<sc-if value="{{{{ {var}.hasT2 }}}}" hint-placeholder-val="{{{{ false }}}}">'
        f'<svg {ICON_ATTRS} width="12" height="12" style="{second}"><path d="{{{{ {var}.t2d }}}}"></path></svg>{{{{ {var}.t2 }}}}</sc-if>'
        f"{tail}</span>"
    )


def js(prefix=""):
    """typeVals / typeWords helpers; prefix keeps two copies apart in one script."""
    table = ", ".join(f"{k}: {{ label: '{label}', d: '{d}' }}" for k, (label, d, _) in TYPES.items())
    return (
        f"    const {prefix}DT = {{ {table} }};\n"
        f"    const {prefix}typeVals = (keys) => ({{ t1: {prefix}DT[keys[0]].label, t1d: {prefix}DT[keys[0]].d, hasT2: keys.length > 1,"
        f" t2: keys.length > 1 ? {prefix}DT[keys[1]].label : '', t2d: keys.length > 1 ? {prefix}DT[keys[1]].d : '' }});\n"
        f"    const {prefix}typeWords = (keys) => keys.map((k) => {prefix}DT[k].label.toLowerCase()).join(' et ');\n"
    )


# Damage modifier -> state word and chip look. Weaknesses stand out, resistances recede; never verdict colours.
STATES = {
    2: ("TRÈS FAIBLE", "border: 1px solid #97A5AA; color: #E2E8E8"),
    1.5: ("FAIBLE", "border: 1px solid #97A5AA; color: #E2E8E8"),
    0.5: ("RÉSISTANT", "border: 1px solid #2C383D; color: #97A5AA"),
    0.25: ("TRÈS RÉSISTANT", "border: 1px solid #2C383D; color: #97A5AA"),
    0: ("IMMUNISÉ", "border: 1px dashed #2C383D; color: #7D8B91"),
}


def multiplier(m):
    return "×" + (f"{m:g}".replace(".", ","))


def modifier_chip(key, m, padding="3px 8px"):
    word, look = STATES[m]
    return (
        f'<span style="padding: {padding}; border-radius: 3px; {look}">'
        f'{svg(key, 12, "vertical-align: -2px; margin-right: 5px")}{TYPES[key][0]} · <span style="font-weight: 500">{word} {multiplier(m)}</span></span>'
    )


NEUTRAL_NOTE = '<span style="font-size: {size}px; color: #7D8B91">Tout le reste ×1</span>'
