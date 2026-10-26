"""Unit tests of combat_extract.build rules that need no game install."""
import unittest

from combat_extract import build

LEVEL = {"hits": [0.3], "end": 0.6}


class ChainReachTests(unittest.TestCase):
    def test_the_ai_keeps_up_when_its_cooldown_ends_within_the_chain_window(self):
        self.assertEqual(build._chain_reach([LEVEL, LEVEL, LEVEL], cooldown=0.5, min_interval=0), 3)

    def test_a_cooldown_longer_than_a_swing_breaks_the_chain(self):
        self.assertEqual(build._chain_reach([LEVEL, LEVEL, LEVEL], cooldown=2, min_interval=0), 1)

    def test_a_minimum_attack_interval_above_the_window_breaks_the_chain(self):
        self.assertEqual(build._chain_reach([LEVEL, LEVEL], cooldown=0.5, min_interval=0.5), 1)

    def test_a_level_that_plays_nothing_ends_the_chain_wherever_it_is(self):
        self.assertEqual(build._chain_reach([LEVEL, LEVEL, None], cooldown=0.5, min_interval=0), 2)
        self.assertEqual(build._chain_reach([None, LEVEL], cooldown=0.5, min_interval=0), 0)


class NamesTests(unittest.TestCase):
    def setUp(self):
        class Loc:
            def get(self, key, lang="English"):
                return {"enemy_troll": {"English": "Troll", "French": "Troll"}}.get(key, {}).get(lang)

        self.names = build.Names(Loc())

    def test_a_key_is_looked_up(self):
        self.assertEqual(self.names.text("$enemy_troll"), {"fr": "Troll", "en": "Troll"})

    def test_a_text_without_key_is_shown_as_it_is(self):
        # Localization.Localize only replaces $words: the Tendril's m_name reads « Tendril » everywhere.
        self.assertEqual(self.names.text("Tendril"), {"fr": "Tendril", "en": "Tendril"})


if __name__ == "__main__":
    unittest.main()
