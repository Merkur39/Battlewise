"""Characterisation tests of combat_extract.arsenal: the blockers and the armor pieces as the game data
defines them (items, recipes, traders, world sources), pinned on values read in the installed game (1.0.21).

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest tests.test_arsenal -v
"""
import re
import unittest

from combat_extract import source

TAG = re.compile(r"<[^>]+>")


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class ArsenalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import arsenal, components

        loc = source.localization.load(source.index())

        def names(key):  # what build.Names does
            key = (key or "").lstrip("$")
            en = TAG.sub("", loc.get(key, "English") or "").strip()
            fr = TAG.sub("", loc.get(key, "French") or "").strip()
            return {"fr": fr or en, "en": en}

        cls.arsenal = arsenal
        cls.names = staticmethod(names)
        cls.found = components.collect(arsenal.CLASSES)
        cls.list = arsenal.blockers(cls.found, names, {})
        cls.blockers = {b["id"]: b for b in cls.list}
        cls.piece_list = arsenal.pieces(cls.found, names)
        cls.pieces = {p["id"]: p for p in cls.piece_list}

    # ------------------------------------------------------------------ stats
    def test_a_round_shield_carries_its_block_stats_and_where_it_comes_from(self):
        self.assertEqual(self.blockers["ShieldSilver"], {
            "id": "ShieldSilver",
            "name": {"fr": "Bouclier en argent", "en": "Silver Shield"},
            "group": "round",
            "maxQuality": 3,
            "blockPower": 60,
            "blockPowerPerLevel": 6,
            "timedBlockBonus": 1.5,
            "deflectionForce": 40,
            "deflectionForcePerLevel": 5,
            "movementModifier": -0.05,
            "perfectBlockStaminaRegen": 0,
            "modifiers": {},
            "upgradable": True,
            "forge": {"idol": "Upgrader3Armor"},
            "obtain": "craft",
            "consumable": False,
        })

    def test_the_serpentscale_shield_resists_pierce_while_blocking(self):
        self.assertEqual(self.blockers["ShieldSerpentscale"]["modifiers"], {"pierce": "resistant"})

    def test_no_other_blocker_has_damage_modifiers(self):
        self.assertEqual([b["id"] for b in self.list if b["modifiers"]], ["ShieldSerpentscale"])

    def test_a_buckler_parries_at_2_5(self):
        buckler = self.blockers["ShieldBronzeBuckler"]
        self.assertEqual((buckler["group"], buckler["timedBlockBonus"]), ("buckler", 2.5))

    def test_a_tower_shield_cannot_parry(self):
        tower = self.blockers["ShieldIronTower"]
        self.assertEqual(tower["group"], "tower")
        self.assertLessEqual(tower["timedBlockBonus"], 1)  # Humanoid.BlockAttack parries only above 1

    def test_the_torch_gives_stamina_back_on_a_parry(self):
        self.assertEqual(self.blockers["Torch"]["perfectBlockStaminaRegen"], 10)
        self.assertEqual(self.blockers["Torch"]["group"], "other")

    # ------------------------------------------------------------------ unarmed
    def test_empty_hands_block_with_the_unarmed_weapon(self):
        unarmed = self.blockers["PlayerUnarmed"]
        self.assertEqual(unarmed["group"], "unarmed")
        self.assertEqual(unarmed["name"], {"fr": "Sans armes", "en": "Fists"})
        self.assertEqual((unarmed["blockPower"], unarmed["timedBlockBonus"]), (2, 1.5))
        self.assertEqual((unarmed["maxQuality"], unarmed["upgradable"], unarmed["forge"]), (1, False, None))

    def test_empty_hands_never_slow_the_player_down(self):
        # PlayerUnarmed says -0.05, but Player.UpdateModifiers only sums the items it has equipped.
        self.assertEqual(self.blockers["PlayerUnarmed"]["movementModifier"], 0)

    # ------------------------------------------------------------------ sources
    def test_items_without_any_source_are_left_out(self):
        for item in ("KnifeVoid", "PickaxeStone"):
            self.assertNotIn(item, self.blockers)

    def test_items_only_found_in_disabled_locations_are_left_out(self):
        self.assertNotIn("ShieldIronSquare", self.blockers)  # recipe disabled, only in a DevCombatRing chest

    def test_a_dlc_item_is_marked_dlc(self):
        self.assertEqual(self.blockers["TankardOdin"]["obtain"], "dlc")

    def test_items_sold_by_a_trader(self):
        self.assertEqual(self.blockers["Sparkler"]["obtain"], "trader")
        self.assertEqual(self.blockers["FishingRod"]["obtain"], "trader")

    def test_cast_gold_items_only_have_an_upgrade_recipe(self):
        gold = self.blockers["ShieldGold"]
        self.assertEqual(gold["obtain"], "upgradeOnly")
        self.assertTrue(gold["upgradable"])
        self.assertEqual(gold["forge"], {"idol": "Upgrader7Armor"})

    def test_chest_only_wooden_weapons_cannot_be_upgraded(self):
        axe = self.blockers["AxeWood"]
        self.assertEqual(axe["obtain"], "world")
        self.assertEqual((axe["upgradable"], axe["forge"]), (False, None))

    def test_world_finds_without_a_recipe(self):
        self.assertEqual(self.blockers["Lantern_DN"]["obtain"], "world")
        self.assertEqual(self.blockers["Tankard_dvergr"]["obtain"], "world")

    # ------------------------------------------------------------------ consumables
    def test_thrown_items_that_are_used_up_are_consumable(self):
        for item in ("BombBlob_Frost", "Snowball"):
            self.assertTrue(self.blockers[item]["consumable"], item)

    def test_a_thrown_spear_drops_back_so_it_is_not_consumable(self):
        self.assertFalse(self.blockers["SpearFlint"]["consumable"])  # secondary attack consumes, projectile respawns it

    # ------------------------------------------------------------------ list
    def test_ids_and_names_are_unique(self):
        for key in ("en", "fr"):
            values = [b["name"][key] for b in self.list]
            self.assertEqual(len(values), len(set(values)), key)
        self.assertEqual(len(self.list), len(self.blockers))

    def test_every_blocker_says_where_it_comes_from(self):
        for b in self.list:
            if b["group"] != "unarmed":
                self.assertIn(b["obtain"], {"craft", "upgradeOnly", "trader", "world", "dlc"}, b["id"])

    def test_ignored_patterns_are_left_out(self):
        kept = {b["id"] for b in self.arsenal.blockers(self.found, self.names, {"ShieldWood*": "test"})}
        self.assertNotIn("ShieldWood", kept)
        self.assertNotIn("ShieldWoodTower", kept)
        self.assertIn("ShieldSilver", kept)

    # ------------------------------------------------------------------ armor pieces
    def test_a_piece_carries_its_armor_its_resistances_its_set_and_where_it_comes_from(self):
        self.assertEqual(self.pieces["ArmorRootChest"], {
            "id": "ArmorRootChest",
            "name": {"fr": "Cuirasse de racines", "en": "Root Harnesk"},
            "slot": "chest",
            "maxQuality": 4,
            "armor": 8,
            "armorPerLevel": 2,
            "modifiers": {"pierce": "resistant", "fire": "weak"},
            "set": "root_armor",
            "upgradable": True,
            "forge": {"idol": "Upgrader2Armor"},
            "obtain": "craft",
        })

    def test_a_piece_carries_what_it_changes_in_a_guard_or_a_dodge(self):
        self.assertEqual(self.pieces["CapeAsh"]["blockStaminaModifier"], -0.2)
        self.assertEqual(self.pieces["CapeAsksvin"]["dodgeStaminaModifier"], -0.15)
        self.assertNotIn("blockStaminaModifier", self.pieces["ArmorRootChest"])

    def test_pieces_are_the_helmets_chests_legs_and_capes_the_player_can_get(self):
        slots = {}
        for piece in self.piece_list:
            slots[piece["slot"]] = slots.get(piece["slot"], 0) + 1
        self.assertEqual(slots, {"helmet": 40, "chest": 42, "legs": 20, "cape": 11})
        self.assertNotIn("BeltStrength", self.pieces)  # a belt's armor never counts (Player.GetBodyArmor)
        self.assertNotIn("TrinketIronHealth", self.pieces)

    def test_fifteen_pieces_resist_or_suffer_a_damage_type(self):
        self.assertEqual(sorted(p["id"] for p in self.piece_list if p["modifiers"]), [
            "ArmorDeepNorthHeavyChest", "ArmorDeepNorthMageChest", "ArmorDeepNorthMediumChest",
            "ArmorFenringChest", "ArmorRootChest", "ArmorRootLegs", "ArmorWolfChest",
            "CapeAsh", "CapeAsksvin", "CapeDeepNorth", "CapeDeepNorthMage", "CapeFeather", "CapeLox", "CapeWolf",
            "HelmetRoot",
        ])

    def test_a_piece_names_its_set_only_when_wearing_it_whole_brings_an_effect(self):
        self.assertEqual({self.pieces[p].get("set") for p in ("HelmetFenring", "ArmorFenringChest", "ArmorFenringLegs")},
                         {"fenring_armor"})
        self.assertNotIn("set", self.pieces["ArmorWolfChest"])  # its set effect is attached to no piece

    def test_pieces_are_sorted_by_slot_then_armor(self):
        slots = [p["slot"] for p in self.piece_list]
        self.assertEqual(slots, sorted(slots, key=["helmet", "chest", "legs", "cape"].index))
        capes = [p["armor"] for p in self.piece_list if p["slot"] == "cape"]
        self.assertEqual(capes, sorted(capes))


if __name__ == "__main__":
    unittest.main()
