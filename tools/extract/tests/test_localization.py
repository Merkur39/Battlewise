"""The game's localisation, loaded as the game loads it (Localization.SetupLanguage, assembly_guiutils).

Run from tools/extract:  python -m unittest tests.test_localization -v
"""
import unittest

from combat_extract import source


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class LocalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import localization
        cls.loc = localization.load(source.index())

    def test_the_last_occurrence_of_a_key_wins(self):
        # location_thehole appears twice in the main table; the game keeps the second row.
        self.assertEqual(self.loc.get("location_thehole", "English"), "Winding tunnels")

    def test_reads_the_tables_listed_by_the_localization_settings(self):
        self.assertIsNotNone(self.loc.get("heightmap_issue_message", "English"))  # heightmap_message
        self.assertIsNone(self.loc.get("xbox_settings_joysens", "English"))  # localization_platformspecific

    def test_an_empty_french_cell_shows_the_english_text(self):
        self.assertEqual(self.loc.get("enemy_barka", "French"), "Barka")

    def test_block_armour_is_valeur_defensive(self):
        self.assertEqual(self.loc.get("item_blockarmor", "English"), "Block armour")
        self.assertEqual(self.loc.get("item_blockarmor", "French"), "Valeur défensive")


if __name__ == "__main__":
    unittest.main()
