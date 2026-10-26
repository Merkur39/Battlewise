"""Characterisation tests of combat_extract.animation: which creatures can play a stagger, and when each
attack hits, pinned on values read in the game's animator controllers and clips.

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest tests.test_animation -v
"""
import unittest

from combat_extract import source


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class AnimationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import animation, components
        cls.animation = animation
        found = components.collect(["Humanoid", "Character", "ItemDrop"])
        creatures = found.rows("Humanoid") + found.rows("Character")
        cls.animations = animation.creature_animations(source.index(), creatures)
        cls.attacks = {}
        for row in found.rows("ItemDrop"):
            if row["go_ref"] == row["root_ref"]:
                cls.attacks.setdefault(row["go"], row["data"]["m_itemData"]["m_shared"]["m_attack"])

    def hits(self, creature, item):
        return self.animation.attack_hits(self.animations[creature], self.attacks[item])

    def play(self, creature, item):
        return self.animation.attack_play(self.animations[creature], self.attacks[item])

    # ------------------------------------------------------------------ stagger
    def test_creatures_without_a_reachable_stagger_state_are_not_staggerable(self):
        for creature in (
            "Blob", "BlobLava", "Leech", "Serpent", "BonemawSerpent", "Hatchling", "Gjall", "Eikthyr",
            "Deathsquito", "Dragon", "Bonemass", "gd_king", "GoblinKing", "FrozenKing",
        ):
            with self.subTest(creature=creature):
                self.assertIs(self.animations[creature]["staggerable"], False)

    def test_creatures_with_a_stagger_transition_are_staggerable(self):
        for creature in ("Troll", "Greydwarf", "Draugr", "Seeker", "Fader", "Charred_Melee", "FallenWarrior"):
            with self.subTest(creature=creature):
                self.assertIs(self.animations[creature]["staggerable"], True)

    def test_the_animator_is_the_first_active_one_in_the_hierarchy(self):
        # FrozenKing_p2 holds an inactive 'Visual' with Fader_animator before its active one.
        self.assertEqual(self.animations["FrozenKing_p2"]["controller"], "FrozenKing_p2_animator")
        # Eikthyr plays 'Visual', whose Stagger state no transition reaches, not the inactive 'OLD'.
        self.assertEqual(self.animations["Eikthyr"]["controller"], "eikthyrnir_animator_new")

    def test_an_override_controller_keeps_its_own_name(self):
        self.assertEqual(self.animations["FrozenKing_p3"]["controller"], "FrozenKing_p3_OverrideController")

    def test_every_creature_root_gets_an_entry(self):
        self.assertGreater(len(self.animations), 150)
        self.assertTrue(all(set(a) == {"staggerable", "controller", "triggers"} for a in self.animations.values()))

    # ------------------------------------------------------------------ hits
    def test_an_attack_without_hit_event_never_deals_damage(self):
        self.assertEqual(self.hits("FallenValkyrie", "fallenvalkyrie_taunt"), [])

    def test_single_hit_attacks(self):
        self.assertEqual(len(self.hits("FallenValkyrie", "fallenvalkyrie_claws")), 1)
        self.assertEqual(len(self.hits("Troll", "troll_punch")), 1)

    def test_rage_attack_plays_faster_from_the_speed_event_of_its_clip(self):
        # Clip AttackRage: Speed(1.3) at 0.019, Hits at 2.499, 3.726 and 5.410 (CharacterAnimEvent.Speed).
        times = self.hits("GoblinBrute", "GoblinBrute_RageAttack")
        self.assertEqual(len(times), 3)
        for got, clip_time in zip(times, (2.499, 3.726, 5.410)):
            self.assertAlmostEqual(got, 0.019 + (clip_time - 0.019) / 1.3, places=2)

    def test_the_attack_ends_when_its_last_state_has_left_for_a_non_attack_one(self):
        # BlobTar 'Attack shoot' (state speed 2): Speed(2) at 0, Speed(0.5) at 0.950, Hit at 0.977,
        # Speed(1) at 1.231, exit at 0.75 of 2.542 s, then a fixed 0.25 s transition to Movement.
        tar = self.play("BlobTar", "blobtar_attack")
        self.assertAlmostEqual(tar["hits"][0], 0.950 / 4 + (0.977 - 0.950) / 1, places=2)
        exit_time = 0.950 / 4 + (1.231 - 0.950) / 1 + (0.75 * 2.542 - 1.231) / 2
        self.assertAlmostEqual(tar["end"], exit_time + 0.25, places=2)

    def test_multi_hit_attacks(self):
        for creature, item, count in (
            ("Morgen", "Morgen_roll_left", 3),
            ("FrozenKing_p3", "FrozenKing_ChainFlurry", 4),
            ("Fenring_Cultist", "Fenring_attack_fireclaw_double", 2),
            ("Gjall", "gjall_attack_shake", 3),
        ):
            with self.subTest(item=item):
                self.assertEqual(len(self.hits(creature, item)), count)

    def test_hit_times_are_sorted(self):
        times = self.hits("FrozenKing_p3", "FrozenKing_ChainFlurry")
        self.assertEqual(times, sorted(times))

    def test_hit_times_are_clip_times_divided_by_the_state_speed(self):
        # Clip 'Roll L' has its Hit events at 0.668, 1.010 and 1.225 s; its state plays at speed 0.8.
        for got, expected in zip(self.hits("Morgen", "Morgen_roll_left"), (0.835, 1.262, 1.531)):
            self.assertAlmostEqual(got, expected, places=2)

    def test_hits_of_the_states_that_follow_on_exit_time_count(self):
        # 'attack_bow' leads to an aiming state (no event), which plays the recoil (the shot) on exit time.
        self.assertEqual(len(self.hits("Draugr_Ranged", "draugr_bow")), 1)
        # A combo is two states chained on exit time, one swipe each: the second starts at 0.67 of the
        # first (2.333 s) and from 0.07 of its own clip, whose Hit is at 0.779 s.
        swipes = self.hits("Bjorn", "bjorn_swipe_combo")
        self.assertEqual(len(swipes), 2)
        self.assertAlmostEqual(swipes[0], 0.779, places=2)
        self.assertAlmostEqual(swipes[1], 0.67 * 2.333 + 0.779 - 0.07 * 2.333, places=2)

    def test_hits_of_a_state_left_for_a_non_attack_state_stop_there(self):
        # 'attack shake' returns to Movement_Flying, whose blend tree holds a clip with a Hit event.
        self.assertEqual(len(self.hits("Gjall", "gjall_attack_shake")), 3)

    def test_a_fixed_transition_lasts_its_duration_in_animator_time(self):
        # troll punch: Speed(0.5) is on when it leaves at 0.8828 of 1.6 s, then a fixed 0.25 s transition,
        # which the halved animator plays in 0.5 s.
        self.assertAlmostEqual(self.play("Troll", "troll_punch")["end"], 2.176, places=2)

    def test_random_variants_skip_the_triggers_the_controller_lacks(self):
        attack = self.attacks["SeekerQueen_Slap"]
        self.assertEqual(attack["m_attackRandomAnimations"], 4)
        self.assertNotIn("attack_slash0", self.animations["SeekerQueen"]["triggers"])
        self.assertEqual(len(self.hits("SeekerQueen", "SeekerQueen_Slap")), 1)

    def test_a_random_variant_that_plays_nothing_lowers_the_share_of_uses_that_hit(self):
        self.assertEqual(self.play("SeekerQueen", "SeekerQueen_Slap")["share"], 0.75)
        self.assertEqual(self.play("Troll", "troll_punch")["share"], 1)

    def test_chain_levels_are_played_one_by_one(self):
        levels = self.play("FallenWarrior", "FW_SwordBlackmetal")["levels"]
        self.assertEqual(len(levels), 3)
        self.assertTrue(all(level["end"] > level["hits"][-1] for level in levels))

    def test_chain_levels_give_the_level_with_most_hits(self):
        # The Berserkir axes chain 4 levels on Player_animator, which the Fallen Warrior plays too;
        # levels 2 and 3 hit twice.
        attack = self.attacks["AxeBerzerkr"]
        self.assertEqual(attack["m_attackChainLevels"], 4)
        triggers = self.animations["FallenWarrior"]["triggers"]
        self.assertEqual([len(triggers["dualaxes%d" % i]["hits"]) for i in range(4)], [1, 1, 2, 2])
        self.assertEqual(self.animation.attack_hits(self.animations["FallenWarrior"], attack),
                         triggers["dualaxes2"]["hits"])

    def test_chain_levels_of_a_creature_weapon(self):
        self.assertEqual(self.attacks["FW_SwordBlackmetal"]["m_attackChainLevels"], 3)
        self.assertEqual(len(self.hits("FallenWarrior", "FW_SwordBlackmetal")), 1)

    def test_an_attack_without_animation_never_starts(self):
        attack = dict(self.attacks["troll_punch"], m_attackAnimation="")
        self.assertEqual(self.animation.attack_hits(self.animations["Troll"], attack), [])

    def test_a_trigger_the_controller_does_not_know_is_unresolved(self):
        attack = dict(self.attacks["troll_punch"], m_attackAnimation="no_such_trigger")
        self.assertIsNone(self.animation.attack_hits(self.animations["Troll"], attack))
        self.assertIsNone(self.animation.attack_play(self.animations["Troll"], attack))

    def test_a_trigger_no_transition_uses_plays_nothing(self):
        # morgen_animator declares 'attack_slam' but no transition waits for it.
        self.assertIsNone(self.play("Morgen", "Morgen_bodyslam"))


if __name__ == "__main__":
    unittest.main()
