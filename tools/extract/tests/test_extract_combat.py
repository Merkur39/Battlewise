"""Characterisation tests: they pin combat values already read in the game data and in the
« Le combat dans Valheim » page.

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest discover -s tests -v
"""
import unittest

from combat_extract import source


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class ExtractCombatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import build, curation
        cls.index = source.index()
        cls.curation = curation.load()
        cls.data, cls.report = build.build(cls.index, cls.curation)
        cls.creatures = {c["id"]: c for c in cls.data["creatures"]}
        cls.blockers = {b["id"]: b for b in cls.data["blockers"]}

    def attack(self, creature, attack_id):
        return next(a for a in self.creatures[creature]["attacks"] if attack_id in a["ids"])

    # ------------------------------------------------------------------ creatures
    def test_troll_staggers_at_180(self):
        troll = self.creatures["Troll"]
        self.assertEqual(troll["health"], 600)
        self.assertAlmostEqual(troll["health"] * troll["staggerFactor"], 180, places=3)

    def test_lox_staggers_at_300(self):
        lox = self.creatures["Lox"]
        self.assertAlmostEqual(lox["health"] * lox["staggerFactor"], 300, places=3)

    def test_modifiers_keep_only_what_differs_from_normal(self):
        self.assertEqual(
            self.creatures["Troll"]["modifiers"],
            {"blunt": "resistant", "pierce": "weak", "spirit": "immune"},
        )

    def test_a_parry_staggers_the_troll_but_not_a_boss(self):
        self.assertTrue(self.creatures["Troll"]["staggeredByParry"])
        self.assertTrue(self.creatures["Eikthyr"]["boss"])

    # ------------------------------------------------------------------ attacks
    def test_melee_attack_deals_the_damage_of_its_item(self):
        slam = self.attack("Troll", "troll_groundslam")
        self.assertEqual(slam["kind"], "melee")
        self.assertEqual(
            slam["hits"],
            [{"damages": {"blunt": 70}, "staggerMultiplier": 1, "blockable": True, "dodgeable": True}],
        )

    def test_projectile_takes_the_attack_damage_not_its_own(self):
        bow = self.attack("Charred_Archer", "charred_bow")
        self.assertEqual(bow["kind"], "projectile")
        self.assertEqual(bow["hits"][0]["damages"], {"pierce": 90})

    def test_area_spawned_as_projectile_keeps_the_attack_settings(self):
        flames = self.attack("Fenring_Cultist", "Fenring_attack_flames")
        self.assertEqual(flames["kind"], "area")
        self.assertEqual(
            flames["hits"],
            [{"damages": {"fire": 50}, "staggerMultiplier": 1, "blockable": False, "dodgeable": True}],
        )

    def test_melee_attack_ignores_its_projectile_field(self):
        # Attack.m_attackProjectile is only read by FireProjectileBurst.
        spray = self.attack("Greydwarf_Shaman", "Greydwarf_shaman_attack")
        self.assertEqual(spray["kind"], "melee")
        self.assertEqual(spray["hits"][0]["damages"], {"poison": 30})
        self.assertFalse(spray["hits"][0]["blockable"])

    def test_self_destructing_attack_is_marked_as_not_extracted(self):
        blow_up = self.attack("BlobLava", "blobLava_attack_aoe")
        self.assertIsNone(blow_up["hits"])

    def test_area_with_its_own_settings_uses_them(self):
        nova = self.attack("DvergerMage", "DvergerStaffNova")
        self.assertEqual(nova["hits"][0]["damages"], {"frost": 150})
        self.assertFalse(nova["hits"][0]["blockable"])

    def test_projectile_impact_adds_a_second_hit(self):
        fireball = self.attack("DvergerMage", "DvergerStaffFire_fireball")
        self.assertEqual([h["damages"] for h in fireball["hits"]], [{"fire": 130}, {"fire": 100}])
        self.assertEqual([h["blockable"] for h in fireball["hits"]], [True, False])

    def test_attack_stagger_multiplier_is_kept(self):
        self.assertAlmostEqual(self.attack("Fader", "Fader_Bite")["hits"][0]["staggerMultiplier"], 0.8, places=6)

    def test_spawned_abilities_are_marked_as_not_extracted(self):
        self.assertIsNone(self.attack("Fader", "Fader_Fissure")["hits"])

    def test_heals_taunts_and_armour_are_not_attacks(self):
        ids = lambda c: {i for a in self.creatures[c]["attacks"] for i in a["ids"]}
        self.assertNotIn("Greydwarf_shaman_heal", ids("Greydwarf_Shaman"))
        self.assertNotIn("Fenring_taunt", ids("Fenring"))
        self.assertNotIn("GoblinBrute_ArmGuard", ids("GoblinBrute"))

    def test_identical_attacks_are_merged(self):
        bites = [a for a in self.creatures["Wolf"]["attacks"] if a["hits"] and a["hits"][0]["damages"] == {"slash": 70}]
        self.assertEqual(len(bites), 1)
        self.assertEqual(len(bites[0]["ids"]), 3)

    # ------------------------------------------------------------------ arsenal and player
    def test_round_shield_values(self):
        silver = self.blockers["ShieldSilver"]
        self.assertEqual((silver["blockPower"], silver["blockPowerPerLevel"], silver["timedBlockBonus"]), (60, 6, 1.5))
        self.assertEqual(silver["group"], "round")

    def test_buckler_parries_at_2_5(self):
        buckler = self.blockers["ShieldBronzeBuckler"]
        self.assertEqual((buckler["blockPower"], buckler["timedBlockBonus"], buckler["group"]), (16, 2.5, "buckler"))

    def test_tower_shield_cannot_parry(self):
        tower = self.blockers["ShieldIronTower"]
        self.assertEqual(tower["blockPower"], 52)
        self.assertLessEqual(tower["timedBlockBonus"], 1)
        self.assertEqual(tower["group"], "tower")

    def test_arsenal_leaves_out_the_copies_creatures_carry(self):
        copies = [b for b in self.blockers if b.startswith(("FW_", "SP_", "DvergerArbalest_"))]
        self.assertEqual(copies, [])

    def test_arsenal_keeps_only_what_can_block(self):
        self.assertEqual([b["id"] for b in self.blockers.values() if b["blockPower"] <= 0], [])

    def test_arsenal_leaves_out_unused_and_unnamed_items(self):
        for item in ("ShieldKnight", "ShieldIronSquare", "TorchMist"):
            self.assertNotIn(item, self.blockers)

    def test_arsenal_names_are_unique(self):
        names = [b["name"]["en"] for b in self.blockers.values()]
        self.assertEqual(sorted({n for n in names if names.count(n) > 1}), [])

    def test_player_block_costs_match_the_engine(self):
        self.assertEqual(
            self.data["player"],
            {"blockStaminaDrain": 10, "perfectBlockStaminaDrain": 0, "staggerFactor": 0.4},
        )

    # ------------------------------------------------------------------ names
    def test_names_come_from_the_game_localisation(self):
        brute = self.creatures["Greydwarf_Elite"]["name"]
        self.assertEqual(brute, {"fr": "Brute naingris", "en": "Greydwarf Brute"})
        self.assertEqual(self.data["damageTypes"]["frost"], {"fr": "Glace", "en": "Frost"})
        self.assertEqual(self.data["biomes"][0], {"id": "meadows", "name": {"fr": "Prairies", "en": "Meadows"}})
        self.assertEqual(self.data["modifiers"]["slightlyWeak"], {"fr": "Légèrement faible", "en": "Slightly weak"})

    def test_names_lose_their_colour_tags(self):
        self.assertEqual(self.creatures["Skeleton_Hildir"]["name"]["en"], "Brenna")

    def test_every_attack_has_a_name_in_both_languages(self):
        unnamed = [
            (c["id"], a["ids"][0])
            for c in self.data["creatures"]
            for a in c["attacks"]
            if not (a["name"].get("fr") and a["name"].get("en"))
        ]
        self.assertEqual(unnamed, [])

    # ------------------------------------------------------------------ curation
    def test_every_included_creature_has_a_biome_and_an_attack(self):
        self.assertEqual([c["id"] for c in self.data["creatures"] if not c["biomes"] or not c["attacks"]], [])

    def test_every_hostile_creature_with_attacks_is_curated(self):
        self.assertEqual(self.report.uncurated, [])

    def test_open_world_spawns_agree_with_the_curated_biomes(self):
        self.assertEqual(self.report.biome_conflicts, [])

    def test_game_version_is_recorded(self):
        self.assertRegex(self.data["game"]["version"], r"^\d+\.\d+\.\d+$")


if __name__ == "__main__":
    unittest.main()
