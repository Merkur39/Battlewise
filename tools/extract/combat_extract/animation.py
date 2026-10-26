"""Which creatures can be staggered and when each attack hits, read from the animator a creature plays,
as the game code uses it:

- Character.Awake takes GetComponentInChildren<Animator>(): the first Animator of a depth-first walk of
  the prefab, root first, inactive GameObjects skipped. An AnimatorOverrideController plays its base
  controller with the clips of its m_Clips swapped.
- Character.RPC_Stagger only sets the trigger 'stagger', and Character.IsStaggering compares the tag of
  the base layer's state with 'stagger': a creature is staggerable when a transition conditioned on that
  trigger leads to a state tagged 'stagger' in the base layer.
- Attack.Start sets the trigger m_attackAnimation, followed by the chain level when m_attackChainLevels
  > 1, else by a random index below m_attackRandomAnimations when it is 2 or more; an empty animation
  never starts.
- CharacterAnimEvent.Hit and OnAttackTrigger both run Attack.OnAttackTrigger: an attack hits once per
  such event in the clip of the state its trigger leads to, then in the states that state chains into on
  exit time while they are tagged 'attack' (Humanoid.InAttack; Attack.Update stops the attack when the
  animator leaves them).
- Hit times are seconds from the trigger. A clip plays at its state's speed times the animator speed,
  which its 'Speed' events set (CharacterAnimEvent.Speed) from 1 on and which holds through the attack
  (CustomFixedUpdate only resets it outside one). Each chained state starts at the exit time of the
  previous one and plays its clip from the transition offset; its events still fire during the transition.
- These are the times when no strike touches anything: a melee strike that does (Attack.DoMeleeAttack,
  FreezeFrame(0.15)) pauses the animator for about 0.15 s (UpdateFreezeFrame), which delays what follows.
- The attack ends when its last state has left for a state not tagged 'attack' (Humanoid.InAttack reads
  the current and the next state): at that exit time plus the transition. Attack.Update then stops it.

Where the data offers several paths (a trigger reaching several states, a blend tree of several clips),
the one with the most hits is kept.
"""
import zlib
from collections import defaultdict

from . import source

HIT_EVENTS = {"Hit", "OnAttackTrigger"}
SPEED_EVENT = "Speed"
TRIGGER = 9  # AnimatorControllerParameterType.Trigger
IF = 1  # AnimatorConditionMode.If
NO_CLIP = 0xFFFFFFFF
SELECTOR = 30000  # transition destinations from here on are sub-state machine entries (selector states)


def _hash(name):
    """Animator.StringToHash, as the controller stores it (unsigned)."""
    return zlib.crc32(name.encode())


STAGGER, ATTACK = _hash("stagger"), _hash("attack")


def _data(value):
    """Mecanim constants are wrapped in {"data": ...} (OffsetPtr)."""
    return value["data"] if isinstance(value, dict) and set(value) == {"data"} else value


def _key(obj):
    return id(obj.assets_file), obj.path_id


# ---------------------------------------------------------------------- the animator a creature plays
def _first_animator(aset, go, root=True):
    """GetComponentInChildren<Animator>(): the root is active since Awake runs on it."""
    data = aset.read(go)
    if not root and not data.get("m_IsActive", 1):
        return None
    transform = None
    for ref in data.get("m_Component", []):
        comp = aset.resolve(go, ref["component"])
        if comp is None:
            continue
        if comp.type.name == "Animator":
            return comp
        if comp.type.name in ("Transform", "RectTransform"):
            transform = comp
    for ref in aset.read(transform).get("m_Children", []) if transform else []:
        child = aset.resolve(transform, ref)
        child_go = aset.resolve(child, aset.read(child)["m_GameObject"]) if child else None
        found = child_go and _first_animator(aset, child_go, root=False)
        if found:
            return found
    return None


def _controller(aset, animator):
    """(controller object the Animator holds, base AnimatorController, {original clip key: override clip})."""
    held = aset.resolve(animator, aset.read(animator).get("m_Controller"))
    base, overrides = held, {}
    while base is not None and base.type.name == "AnimatorOverrideController":
        data = aset.read(base)
        for pair in data["m_Clips"]:
            original, override = aset.resolve(base, pair["m_OriginalClip"]), aset.resolve(base, pair["m_OverrideClip"])
            if original is not None and override is not None:
                overrides.setdefault(_key(original), override)  # the outermost override wins
        base = aset.resolve(base, data["m_Controller"])
    return held, base, overrides


# ---------------------------------------------------------------------- clips
class _Clips:
    """(length, hit event times, [(time, animator speed)] of its Speed events) of each clip, read once;
    full clip type trees are not kept."""

    def __init__(self):
        self._cache = {}

    def get(self, clip):
        if clip is None:
            return 0.0, [], []
        key = _key(clip)
        if key not in self._cache:
            try:
                data = clip.read_typetree()
            except Exception:
                data = {}
            muscle = data.get("m_MuscleClip", {})
            length = muscle.get("m_StopTime", 0.0) - muscle.get("m_StartTime", 0.0)
            events = data.get("m_Events", [])
            times = sorted(e["time"] for e in events if e["functionName"] in HIT_EVENTS)
            speeds = sorted((e["time"], e["floatParameter"]) for e in events if e["functionName"] == SPEED_EVENT)
            self._cache[key] = (length, times, speeds)
        return self._cache[key]


def _motion(state, clips):
    """(length, hit times, speed events) of the clip a state plays; in a blend tree, the clip with the
    most hits."""
    played = [
        clips[node["m_ClipID"]]
        for tree in state["m_BlendTreeConstantArray"]
        for node in map(_data, _data(tree)["m_NodeArray"])
        if node["m_ClipID"] != NO_CLIP and node["m_ClipID"] < len(clips)
    ]
    return max(played, key=lambda clip: len(clip[1]), default=(0.0, [], []))


# ---------------------------------------------------------------------- state machines
def _transitions(machine):
    for transition in machine["m_AnyStateTransitionConstantArray"]:
        yield _data(transition)
    for state in machine["m_StateConstantArray"]:
        for transition in _data(state)["m_TransitionConstantArray"]:
            yield _data(transition)


def _set_triggers(transition, triggers):
    """Trigger parameters a transition waits for."""
    return {
        c["m_EventID"] for c in map(_data, transition["m_ConditionConstantArray"])
        if c["m_ConditionMode"] == IF and c["m_EventID"] in triggers
    }


def _destinations(machine, index, seen=()):
    """States a transition destination leads to, through the entries of sub-state machines."""
    states, selectors = machine["m_StateConstantArray"], machine["m_SelectorStateConstantArray"]
    if index < len(states):
        return [index]
    if SELECTOR <= index < SELECTOR + len(selectors) and index not in seen:
        entry = _data(selectors[index - SELECTOR])
        return [
            state for t in entry["m_TransitionConstantArray"]
            for state in _destinations(machine, _data(t)["m_Destination"], seen + (index,))
        ]
    return []


def _tag(machine, index):
    return _data(machine["m_StateConstantArray"][index])["m_TagID"]


def _staggerable(machine, triggers):
    return any(
        _tag(machine, state) == STAGGER
        for t in _transitions(machine) if STAGGER in _set_triggers(t, triggers)
        for state in _destinations(machine, t["m_DestinationState"])
    )


def _exit_time_transition(state):
    return next((
        t for t in map(_data, state["m_TransitionConstantArray"])
        if t["m_HasExitTime"] and not t["m_ConditionConstantArray"]
    ), None)


def _blend(transition, length, speed):
    """Length of a transition in clip time of the state it leaves: a fixed one lasts its duration in
    seconds of animator time (Animator.speed scales it), the others a share of that state's clip."""
    if transition["m_HasFixedDuration"]:
        return transition["m_TransitionDuration"] * speed
    return transition["m_TransitionDuration"] * length


def _play(machine, index, offset, clips):
    """(hit times, end) of a state entered at a normalised offset, then of the attack states it chains into
    on exit time (see the module notes); end is None when the attack never leaves its states."""
    times, now, animator, seen = [], 0.0, 1.0, set()
    while index not in seen:
        seen.add(index)
        state = _data(machine["m_StateConstantArray"][index])
        speed = state["m_Speed"] or 1.0
        length, hits, speeds = _motion(state, clips)
        follow = _exit_time_transition(state)
        clip_time = offset * length
        leave = follow["m_ExitTime"] * length if follow else None
        exit_now = exit_animator = gone = None  # when it leaves, at which animator speed, and clip time
        for t, is_hit, value in sorted([(t, 1, None) for t in hits] + [(t, 0, v) for t, v in speeds]):
            if t < clip_time:
                continue
            if leave is not None and exit_now is None and t >= leave:
                exit_now, exit_animator = now + (leave - clip_time) / (speed * animator), animator
                gone = leave + _blend(follow, length, speed)
            if gone is not None and t > gone:
                break  # the transition out is over: the state no longer plays
            now += (t - clip_time) / (speed * animator)
            clip_time = t
            if is_hit:
                times.append(round(now, 3))
            elif value:
                animator = value
        if follow is None:
            return sorted(times), None
        if exit_now is None:
            exit_now, exit_animator = now + (leave - clip_time) / (speed * animator), animator
        after = _destinations(machine, follow["m_DestinationState"])
        if not after or _tag(machine, after[0]) != ATTACK:
            end = exit_now + _blend(follow, length, speed) / (speed * exit_animator)
            return sorted(times), round(end, 3)
        now = exit_now
        index, offset = after[0], follow["m_TransitionOffset"]
    return sorted(times), None


def _analyse(aset, base, overrides, clip_cache):
    """(staggerable, {trigger: {"hits", "end"}}) of an AnimatorController played with clip overrides."""
    data = aset.read(base)
    constant = data["m_Controller"]
    clips = []
    for ref in data["m_AnimationClips"]:
        clip = aset.resolve(base, ref)
        clips.append(clip_cache.get(overrides.get(_key(clip), clip) if clip is not None else None))
    names = {int(h) & 0xFFFFFFFF: name for h, name in data["m_TOS"]}
    triggers = {p["m_ID"] for p in _data(constant["m_Values"])["m_ValueArray"] if p["m_Type"] == TRIGGER}
    machines = [_data(m) for m in constant["m_StateMachineArray"]]
    layers = [_data(layer) for layer in constant["m_LayerArray"]]
    staggerable = bool(layers) and _staggerable(machines[layers[0]["m_StateMachineIndex"]], triggers)
    hits = {}
    for machine in machines:
        for t in _transitions(machine):
            for trigger in _set_triggers(t, triggers):
                for state in _destinations(machine, t["m_DestinationState"]):
                    name = names.get(trigger, str(trigger))
                    times, end = _play(machine, state, t["m_TransitionOffset"], clips)
                    if name not in hits or len(times) > len(hits[name]["hits"]):
                        hits[name] = {"hits": times, "end": end}
    return staggerable, hits


# ---------------------------------------------------------------------- public
def _creature(aset, go, analysed, clip_cache):
    animator = _first_animator(aset, go)
    held, base, overrides = _controller(aset, animator) if animator is not None else (None, None, {})
    if base is None:  # no animator or no controller: nothing ever plays
        return {"staggerable": False, "controller": aset.read(held)["m_Name"] if held else None, "triggers": {}}
    key = _key(held)
    if key not in analysed:
        analysed[key] = _analyse(aset, base, overrides, clip_cache)
    staggerable, hits = analysed[key]
    triggers = {name: dict(played, hits=list(played["hits"])) for name, played in hits.items()}
    return {"staggerable": staggerable, "controller": aset.read(held)["m_Name"], "triggers": triggers}


def creature_animations(index, rows):
    """{prefab: {"staggerable", "controller", "triggers": {trigger: {"hits": [hit times in s, sorted],
    "end": s or None}}}} for the
    prefab roots among Humanoid/Character component rows, bundle by bundle; the first row of a name wins.
    "controller" is the name of the controller the Animator holds (an override keeps its own name);
    a creature with no Animator or no controller gets controller None, not staggerable, no triggers."""
    by_bundle = defaultdict(list)
    for row in rows:
        if row["go_ref"] and row["go_ref"] == row["root_ref"]:
            by_bundle[row["bundle"]].append(row)
    result = {}
    for bundle, bundle_rows in by_bundle.items():
        aset = source.AssetSet(index, bundle, with_deps=True)
        analysed, clip_cache = {}, _Clips()
        for row in bundle_rows:
            if row["go"] in result:
                continue
            cab, pid = row["go_ref"].rsplit(":", 1)
            go = aset.obj(cab, int(pid))
            if go is not None:
                result[row["go"]] = _creature(aset, go, analysed, clip_cache)
    return result


def _variants(attack):
    """Triggers Attack.Start may set for an attack."""
    name = attack.get("m_attackAnimation") or ""
    if not name:
        return []
    if (attack.get("m_attackChainLevels") or 0) > 1:
        return [name + str(level) for level in range(attack["m_attackChainLevels"])]
    if (attack.get("m_attackRandomAnimations") or 0) >= 2:
        return [name + str(n) for n in range(attack["m_attackRandomAnimations"])]
    return [name]


def attack_play(animation, attack):
    """How an attack (an item's m_attack) plays on a creature's animation: None when no trigger it may set
    leads anywhere in the controller (nothing plays, it never hits), else {"hits", "end"} of the variant
    with the most hits (the first of them on a tie), "share": the share of its random variants that hit
    (Attack.Start draws one; 1 without variants), and "levels": [{"hits", "end"} or None] of its chain
    levels, in order (none without a chain)."""
    variants = _variants(attack)
    played = [animation["triggers"].get(v) for v in variants]
    found = [p for p in played if p is not None]
    if not found:
        return None
    best = max(found, key=lambda p: len(p["hits"]))
    chained = (attack.get("m_attackChainLevels") or 0) > 1
    share = sum(1 for p in found if p["hits"]) / len(variants) if len(variants) > 1 and not chained else 1
    return {"hits": best["hits"], "end": best["end"], "share": share, "levels": played if chained else []}


def attack_hits(animation, attack):
    """Hit times (s, sorted) of an attack played by a creature's animation: [] when it never deals damage
    (no Hit/OnAttackTrigger event, or no attack animation), None when no trigger it may set leads anywhere
    in the controller. With chain levels or random variants, the variant with the most hits (the first of
    them on a tie)."""
    if not _variants(attack):
        return []
    played = attack_play(animation, attack)
    return None if played is None else played["hits"]
