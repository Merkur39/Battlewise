"""Damage types and damage modifiers as the game stores them (HitData.DamageType, HitData.DamageModifier)."""

# The types a player's guard, armour and health deal with; chop and pickaxe only hit trees, rocks and
# creatures that do not ignore them, nonPlayer never hits the player.
DAMAGE_TYPES = ("blunt", "slash", "pierce", "fire", "frost", "lightning", "poison", "spirit")
TOOL_TYPES = ("chop", "pickaxe")
# HitData.DamageType flags, used by the (type, modifier) pairs of items and status effects.
DAMAGE_FLAGS = {
    1: "blunt", 2: "slash", 4: "pierce", 8: "chop", 16: "pickaxe", 32: "fire", 64: "frost", 128: "lightning",
    256: "poison", 512: "spirit",
}
# HitData.DamageModifier, in enum order.
MODIFIERS = [
    "normal", "resistant", "weak", "immune", "ignore", "veryResistant", "veryWeak", "slightlyResistant", "slightlyWeak",
]


def modifiers(raw, types=DAMAGE_TYPES, left_out=("normal",)):
    """{type: state} of a DamageModifiers type tree (a creature, a weak spot, the player), without the
    states in `left_out`."""
    states = {t: MODIFIERS[raw.get("m_" + t, 0)] for t in types}
    return {t: s for t, s in states.items() if s not in left_out}


def pair_modifiers(pairs, types=DAMAGE_TYPES):
    """{type: state} of a list of (m_type, m_modifier) pairs (items, status effects), merged as
    HitData.DamageModifiers.Apply does, without the normal states."""
    states = {}
    for pair in pairs:
        damage, state = DAMAGE_FLAGS.get(pair["m_type"]), MODIFIERS[pair["m_modifier"]]
        if damage in types and _overrides(states.get(damage, "normal"), state):
            states[damage] = state
    return {damage: state for damage, state in states.items() if state != "normal"}


def _overrides(old, new):
    """HitData.DamageModifiers.ShouldOverride."""
    if old == "ignore":
        return False
    if new == "immune":
        return True
    weaker = {"veryResistant": {"resistant", "slightlyResistant"}, "resistant": {"slightlyResistant"},
              "veryWeak": {"weak", "slightlyWeak"}, "weak": {"slightlyWeak"}}
    resists = {"resistant", "veryResistant", "slightlyResistant", "immune"}
    weak = {"weak", "veryWeak", "slightlyWeak"}
    return new not in weaker.get(old, ()) and not (old in resists and new in weak)
