"""Unit tests of combat_extract.rules that need no game install."""
import unittest

from combat_extract import rules

# An SE_Stats that changes nothing in a fight.
NEUTRAL = {
    "m_mods": [],
    "m_addArmor": 0.0,
    "m_armorMultiplier": 0.0,
    "m_staggerModifier": 0.0,
    "m_timedBlockBonus": 0.0,
    "m_blockStaminaUseModifier": 0.0,
    "m_blockStaminaUseFlatValue": 0.0,
    "m_dodgeStaminaUseModifier": 0.0,
}


class ChangesTests(unittest.TestCase):
    def test_an_effect_that_changes_nothing_in_a_fight_has_no_changes(self):
        self.assertEqual(rules.changes(NEUTRAL), {})

    def test_resistances_are_merged_as_the_game_applies_its_pairs(self):
        # Bonemass's power: blunt, slash and pierce slightly resistant (HitData.DamageModifier 7).
        bonemass = dict(NEUTRAL, m_mods=[
            {"m_type": 1, "m_modifier": 7}, {"m_type": 2, "m_modifier": 7}, {"m_type": 4, "m_modifier": 7},
        ])
        self.assertEqual(rules.changes(bonemass), {
            "modifiers": {"blunt": "slightlyResistant", "slash": "slightlyResistant", "pierce": "slightlyResistant"},
        })

    def test_each_change_is_kept_as_the_game_holds_it_a_share_added_to_the_base(self):
        se = dict(
            NEUTRAL,
            m_addArmor=20.0,
            m_armorMultiplier=0.1,
            m_staggerModifier=-0.5,
            m_timedBlockBonus=0.5,
            m_blockStaminaUseModifier=-1.0,
            m_blockStaminaUseFlatValue=-5.0,
            m_dodgeStaminaUseModifier=-0.800000011920929,
        )
        self.assertEqual(rules.changes(se), {
            "addArmor": 20,
            "armorMultiplier": 0.1,
            "staggerModifier": -0.5,
            "parryBonus": 0.5,
            "blockStaminaModifier": -1,
            "blockStaminaFlat": -5,
            "dodgeStaminaModifier": -0.8,
        })


if __name__ == "__main__":
    unittest.main()
