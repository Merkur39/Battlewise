"""Proposes English attack names from the Valheim wiki (valheim.fandom.com), whose creature infoboxes
list each attack with its damage; the game only names the attacks made with a player item.

Each extracted attack is matched to a wiki line with the same damage by type (chop and pickaxe left
out), ties broken by the words shared with the item id; pages without an infobox line fall back on
their « Attacks » sections. Pages are cached in out/wiki. The result, out/wiki_names.json, is a
proposal to review and copy into curation.json (with the French names), never read by the build.

    python wiki_names.py [--refresh]
"""
import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request

from combat_extract import build, curation, source

API = "https://valheim.fandom.com/api.php"
UA = {"User-Agent": "Foelore-extract/0.1 (personal project)"}
TYPES = {"blunt", "slash", "pierce", "fire", "frost", "lightning", "poison", "spirit"}
DAMAGE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\[\[[^\]|]*\|)?(\w+)|(\w+)\s+(\d+(?:\.\d+)?)")
LINK = re.compile(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]")


def wikitext(title, refresh=False):
    cache = source.OUT / "wiki" / (re.sub(r"[^\w.-]+", "_", title) + ".json")
    if cache.is_file() and not refresh:
        return json.loads(cache.read_text(encoding="utf-8"))
    query = urllib.parse.urlencode(
        {"action": "parse", "page": title, "prop": "wikitext", "format": "json", "formatversion": 2, "redirects": 1}
    )
    with urllib.request.urlopen(urllib.request.Request(API + "?" + query, headers=UA), timeout=30) as r:
        page = json.load(r).get("parse") or {}
    result = {"title": page.get("title"), "text": page.get("wikitext")}
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    time.sleep(0.3)
    return result


def totals(text):
    """{type: amount} of a wiki damage text, both « 60 Blunt » and « Fire 80 » orders."""
    found = {}
    for m in DAMAGE.finditer(LINK.sub(r"\1", text)):
        amount, kind = (m.group(1), m.group(2)) if m.group(1) else (m.group(4), m.group(3))
        if kind and kind.lower() in TYPES:
            found[kind.lower()] = found.get(kind.lower(), 0) + float(amount)
    return found


def candidates(text):
    """[(name, totals)] from the infobox damage lines, then from the attack sections."""
    lines = []
    for line in re.findall(r"^\*+\s*(.+)$", text, re.M):
        line = re.sub(r"</?nowiki>", "", line)
        name, _, rest = line.partition(":")
        if rest.strip() and totals(rest):
            lines.append((LINK.sub(r"\1", name).strip(), totals(rest)))
    for heading, body in re.findall(r"^===\s*([^=]+?)\s*===\s*\n(.*?)(?=^==|\Z)", text, re.M | re.S):
        lines.append((heading.strip(), totals(body.split("\n\n")[0])))
    return lines


def words(text):
    return {w.rstrip("s") for w in re.findall(r"[a-z]+", text.lower()) if len(w) > 1}


def attack_totals(attack):
    """Damage by type over all the hits of an attack, the way the wiki adds them up (« 130 Fire + 100 Fire »)."""
    found = {}
    for hit in attack["hits"] or []:
        for kind, amount in hit["damages"].items():
            found[kind] = found.get(kind, 0) + amount
    return found


def match(attack, attack_id, options):
    """(name, how): same damage and shared words first, then shared words, then same damage alone."""
    target = attack_totals(attack)
    shared = lambda o: len(words(o[0]) & words(attack_id))
    same = [o for o in options if target and o[1] == target]
    for pool, how in (([o for o in same if shared(o)], "damage+name"), ([o for o in options if shared(o)], "name"), (same, "damage")):
        if pool:
            return max(pool, key=shared)[0], how
    return None, "none"


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--refresh", action="store_true", help="fetch the wiki pages again")
    args = p.parse_args()
    cur = curation.load()
    data, _ = build.build(source.index(), cur)
    proposals = {}
    for creature in data["creatures"]:
        title = cur["creatures"][creature["id"]].get("wiki") or creature["name"]["en"]
        page = wikitext(title, args.refresh)
        options = candidates(page["text"] or "")
        for attack in creature["attacks"]:
            for attack_id in attack["ids"]:
                name, how = match(attack, attack_id, options)
                proposals.setdefault(attack_id, {"en": name, "how": how, "creature": creature["id"], "page": page["title"]})
    path = source.OUT / "wiki_names.json"
    path.write_text(json.dumps(proposals, ensure_ascii=False, indent=1), encoding="utf-8")
    counts = {}
    for p_ in proposals.values():
        counts[p_["how"]] = counts.get(p_["how"], 0) + 1
    print("%d attacks -> %s %s" % (len(proposals), path, counts))


if __name__ == "__main__":
    main()
