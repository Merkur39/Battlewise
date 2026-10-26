"""Where creatures are met and at which star levels: pinned on the 1.0.20 game data.

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest tests.test_spawns -v
"""
import unittest

from combat_extract import source

ASPECTS = (
    "Aspect_Eikthyr", "Aspect_Elder", "Aspect_Bonemass", "Aspect_Moder", "Aspect_Yagluth", "Aspect_SeekerQueen",
    "Aspect_Fader",
)


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class SoftRefTests(unittest.TestCase):
    def test_asset_id_is_v3_v2_v1_v0_in_hex(self):
        from combat_extract import softref

        ref = {"m_assetID": {"v3": 777585754, "v2": 2386722283, "v1": 3152436769, "v0": 2914332110}}

        self.assertEqual(softref.asset_id(ref), "2e59045a8e427debbbe65e21adb52dce")

    def test_stale_location_name_resolves_to_its_real_prefab(self):
        from combat_extract import softref

        # _LocationList_DeepNorth "bosslocation", whose m_prefabName still says MountainCave02
        ref = {"m_assetID": {"v3": 777585754, "v2": 2386722283, "v1": 3152436769, "v0": 2914332110}}

        self.assertEqual(softref.prefab(ref), ("e06fccc7", "DN_Bossroom"))

    def test_unknown_asset_resolves_to_none(self):
        from combat_extract import softref

        self.assertIsNone(softref.prefab({"m_assetID": {"v3": 0, "v2": 0, "v1": 0, "v0": 0}}))


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class SpawnTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import components, spawns

        cls.index = source.index()
        cls.result = spawns.resolve(cls.index, components.collect(spawns.CLASSES))

    def creature(self, prefab):
        self.assertIn(prefab, self.result, "%s should appear" % prefab)
        return self.result[prefab]

    def conditional(self, prefab):
        return {c["source"]: c["biomes"] for c in self.creature(prefab)["conditional"]}

    def all_biomes(self, prefab):
        found = self.creature(prefab)
        return set(found["native"]) | {b for c in found["conditional"] for b in c["biomes"]}

    # -------------------------------------------------------------- shape
    def test_every_entry_has_the_documented_shape(self):
        ids = {"meadows", "swamp", "mountain", "blackForest", "plains", "ashlands", "deepNorth", "ocean", "mistlands"}
        for prefab, found in self.result.items():
            with self.subTest(prefab=prefab):
                self.assertEqual(set(found), {"native", "conditional", "stars", "level", "sources"})
                self.assertLessEqual(set(found["native"]), ids)
                for cond in found["conditional"]:
                    self.assertEqual(set(cond), {"source", "biomes"})
                    self.assertLessEqual(set(cond["biomes"]), ids)
                self.assertTrue(found["sources"])
                if found["stars"] is not None:
                    self.assertLessEqual(0, found["stars"]["min"])
                    self.assertLessEqual(found["stars"]["min"], found["stars"]["max"])

    def test_biomes_are_listed_in_heightmap_bit_order(self):
        self.assertEqual(self.creature("Deer")["native"], ["meadows", "blackForest"])

    # -------------------------------------------------------------- native homes
    def test_draugr_lives_in_meadows_villages_and_in_the_swamp(self):
        self.assertLessEqual({"meadows", "swamp"}, set(self.creature("Draugr")["native"]))

    def test_the_meadows_skeleton_is_the_one_without_a_bow(self):
        self.assertIn("meadows", self.creature("Skeleton_Meadows_noarcher")["native"])

    def test_skeleton_meadows_only_comes_with_hildirs_first_raid(self):
        found = self.creature("Skeleton_Meadows")

        self.assertEqual(found["native"], [])
        self.assertEqual([c["source"] for c in found["conditional"]], ["raid:hildirboss1"])
        self.assertEqual(found["stars"], {"min": 1, "max": 2})  # event levels 2-3

    def test_alt_biomes_give_bat_swamp_and_the_wild_root(self):
        self.assertEqual(self.creature("Bat_Swamp")["native"], ["swamp"])
        self.assertEqual(self.creature("TentaRoot_wild")["native"], ["blackForest"])

    def test_skeleton_also_lives_in_meadows_ruins_and_mountain_towers(self):
        self.assertLessEqual({"meadows", "mountain", "blackForest"}, set(self.creature("Skeleton")["native"]))

    def test_skeleton_after_bonemass_is_conditional(self):
        self.assertIn("afterBoss:defeated_bonemass", self.conditional("Skeleton"))

    def test_fallen_warrior_comes_from_the_memorial_offering(self):
        self.assertEqual(self.creature("FallenWarrior")["native"], ["deepNorth"])

    def test_frozen_king_altar_is_found_through_its_asset_id(self):
        self.assertEqual(self.creature("FrozenKing")["native"], ["deepNorth"])

    def test_passive_seal_is_listed(self):
        self.assertEqual(self.creature("Seal")["native"], ["deepNorth"])

    def test_jotun_warrior_lives_in_the_deep_north_and_comes_with_the_invasion(self):
        self.assertIn("deepNorth", self.creature("JotunWarrior")["native"])
        self.assertIn("event:jotun_invasion", self.conditional("JotunWarrior"))

    def test_the_invasion_happens_in_its_own_biomes(self):
        invasion = self.conditional("JotunWarrior")["event:jotun_invasion"]

        self.assertEqual(invasion, ["meadows", "swamp", "mountain", "blackForest", "plains"])  # biomes 31

    def test_inactive_spawners_never_spawn(self):
        found = self.creature("Greydwarf")

        self.assertEqual(found["native"], ["blackForest"])  # the meadows WoodHouse6/11/13 spawners are inactive
        self.assertFalse([s for s in found["sources"] if "WoodHouse" in s])

    def test_hildir_cultists_only_spawn_in_hildirs_cave(self):
        sources = self.creature("Fenring_Cultist_Hildir")["sources"]

        self.assertTrue([s for s in sources if "Hildir_cave" in s])
        self.assertFalse([s for s in sources if "MountainCave02" in s])  # RandomSpawn requires theme 1024

    # -------------------------------------------------------------- conditional only
    def test_every_aspect_is_met_in_the_deep_north(self):
        for prefab in ASPECTS:
            with self.subTest(prefab=prefab):
                self.assertIn("deepNorth", self.all_biomes(prefab))

    def test_frozen_king_death_releases_the_first_aspect(self):
        self.assertEqual(self.conditional("Aspect_Eikthyr").get("summon:FrozenKing"), ["deepNorth"])

    def test_frost_blob_only_comes_from_the_players_bomb(self):
        found = self.creature("BlobFrost")

        self.assertEqual(found["native"], [])
        self.assertIn("bomb:BombBlob_Frost", self.conditional("BlobFrost"))

    def test_summons_take_the_summoners_biomes(self):
        self.assertEqual(self.conditional("Skeleton").get("summon:Bonemass"), ["swamp"])

    def test_zil_drops_from_thungr(self):
        self.assertIn("drop:GoblinBruteBros", self.conditional("GoblinShaman_Hildir"))

    def test_hens_and_calves_only_come_from_breeding(self):
        for prefab in ("Hen", "Moose_calf", "Asksvin_hatchling"):
            with self.subTest(prefab=prefab):
                found = self.creature(prefab)
                self.assertEqual(found["native"], [])
                self.assertIn("tamed", self.conditional(prefab))

    # -------------------------------------------------------------- never met
    def test_prefabs_without_a_reachable_source_are_absent(self):
        for prefab in ("Ghost_Void", "Ghost_old", "Leech_cave", "GoblinBrute_Hildir", "DvergerMageFire"):
            with self.subTest(prefab=prefab):
                self.assertNotIn(prefab, self.result)

    def test_disabled_events_and_dev_locations_bring_nothing(self):
        for prefab in ("Goblin_Gem", "Deer_White", "TrainingDummy"):
            with self.subTest(prefab=prefab):
                self.assertNotIn(prefab, self.result)

    # -------------------------------------------------------------- stars and fixed levels
    def test_troll_meets_up_to_two_stars(self):
        found = self.creature("Troll")

        self.assertIn("blackForest", found["native"])
        self.assertEqual(found["stars"]["max"], 2)

    def test_hildir_cave_override_gives_bats_up_to_two_stars(self):
        self.assertEqual(self.creature("Bat")["stars"], {"min": 0, "max": 2})

    def test_fixed_levels(self):
        for prefab, level in (("Charred_Melee_Dyrnwyn", 3), ("GoblinBruteBros", 1), ("TrollFrost", 1)):
            with self.subTest(prefab=prefab):
                self.assertEqual(self.creature(prefab)["level"], level)

    def test_excluded_spawn_groups_ignore_the_hildir_level_overrides(self):
        for prefab, level in (("Skeleton_Hildir", 1), ("Fenring_Cultist_Hildir", 1)):
            with self.subTest(prefab=prefab):
                self.assertEqual(self.creature(prefab)["level"], level)

    def test_lord_reto_is_always_two_stars(self):
        self.assertEqual(self.creature("Charred_Melee_Dyrnwyn")["stars"], {"min": 2, "max": 2})

    def test_no_fixed_level_when_stars_vary(self):
        self.assertIsNone(self.creature("Troll")["level"])

    def test_trigger_spawners_only_spawn_when_the_queen_calls(self):
        # TriggerSpawner_Seeker copies wait in the queen's room for TriggerSpawnAbility (SeekerQueen_Call).
        self.assertIn("summon:SeekerQueen", self.conditional("Seeker"))
        in_room = [s for s in self.creature("Seeker")["sources"] if s.startswith("dungeon Mistlands_DvergrBossEntrance1")]
        self.assertEqual(in_room, ["dungeon Mistlands_DvergrBossEntrance1 when SeekerQueen calls [mistlands], stars 0-0"])


if __name__ == "__main__":
    unittest.main()
