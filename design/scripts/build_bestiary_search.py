"""Build the Bestiaire search-results screens (mobile and desktop) from the Origine Bestiaire boards,
then turn both Bestiaire search fields into links to them, and the « Ton contexte » board: the phone
Bestiaire with its context sheet open. Safe to rerun on boards already linked."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from damage_types import hole_tag, js  # noqa: E402

P = Path(sys.argv[1])

EXTRA_CSS = (
    "input[type=search]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}\n"
    "mark{background:transparent;color:#8EBDE3;font-weight:500}\n"
)
SEARCH_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>'
CLOSE_ICON = '<svg viewBox="0 0 24 24" width="{s}" height="{s}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7D8B91" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>'
SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>'
PARRY = SHIELD + '<path d="M13 7.5l-3 4.5h4l-3 4.5"></path>'
DODGE = '<path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path>'
SR_ONLY = "position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)"


def icon(paths, size, label=None):
    aria = f'aria-label="{label}"' if label else 'aria-hidden="true"'
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" {aria}>{paths}</svg>'


def trio_header(cell):
    return "".join(
        f'<span style="width: {cell}px; display: flex; justify-content: center" title="{t}">{icon(p, 13, t)}</span>'
        for t, p in [("Blocage", SHIELD), ("Parade", PARRY), ("Esquive", DODGE)]
    )


def trio_cells(cell, size):
    box = f"width: {cell}px; height: {cell}px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center"
    return (
        f'<span style="{box}; border: 1px solid {{{{ a.bBorder }}}}; color: {{{{ a.bColor }}}}">{icon(SHIELD, size)}</span>'
        f'<span style="{box}; border: 1px solid {{{{ a.pBorder }}}}; color: {{{{ a.pColor }}}}">{icon(PARRY, size)}</span>'
        f'<span style="{box}; border: 1px solid #2E7A4B; color: #6CC08A">{icon(DODGE, size)}</span>'
    )


# Search over the creature list and the attack catalogue, shared by both screens.
SEARCH_JS = js("s") + """    const query = 'tro';
    const split = (text) => {
      const at = text.toLowerCase().indexOf(query);
      return { pre: text.slice(0, at), hit: text.slice(at, at + query.length), post: text.slice(at + query.length) };
    };
    const sArmor = (dmg, ac) => (ac <= 0 || dmg <= 0) ? Math.max(0, dmg) : (ac < dmg / 2 ? dmg - ac : Math.min(1, dmg / (ac * 4)) * dmg);
    const sBp = 72 * (1 + 25 / 200), sAc = 45, sT = 60;
    const sVerdict = (hit, power) => {
      const passes = sArmor(hit, power);
      if (passes >= sT) return 'bad';
      return passes + sArmor(passes, sAc) >= sT ? 'warn' : 'ok';
    };
    const sWords = { ok: 'tient', warn: 'tu titubes', bad: 'ne passe pas', none: 'pas encore calculé' };
    const catalog = [
      { enemy: 'Naingris', name: 'coup de griffe', dmg: 20, tags: 'MÊLÉE', types: ['slash'] },
      { enemy: 'Naingris', name: 'jet de pierre', dmg: 15, tags: 'PROJECTILE', types: ['blunt'] },
      { enemy: 'Chaman naingris', name: 'jet empoisonné', dmg: 30, tags: 'PROJECTILE · IMPARABLE', types: ['poison'], unblockable: true },
      { enemy: 'Brute naingris', name: 'coup de poing', dmg: 135, tags: 'MÊLÉE', types: ['blunt'] },
      { enemy: 'Troll', name: 'coup de poing', dmg: 70, tags: 'MÊLÉE', types: ['blunt'] },
      { enemy: 'Troll', name: 'coup de tronc', dmg: 130, tags: 'MÊLÉE', types: ['blunt'] },
      { enemy: 'Troll', name: 'frappe au sol', dmg: 160, tags: 'ZONE', types: ['blunt'] }
    ];
    const foundCreatures = list.filter((r) => r.name.toLowerCase().includes(query));
    const foundAttacks = catalog.filter((a) => a.name.toLowerCase().includes(query)).map((a) => {
      const b = a.unblockable ? 'bad' : sVerdict(a.dmg, sBp);
      const p = a.unblockable ? 'bad' : sVerdict(a.dmg, sBp * 1.5);
      return Object.assign(stypeVals(a.types), { enemy: a.enemy, tags: a.tags, dmg: String(a.dmg),
        bColor: colors[b], bBorder: borders[b], pColor: colors[p], pBorder: borders[p],
        aria: a.enemy + ', ' + a.name + ', ' + stypeWords(a.types) + ', ' + a.dmg + ' dégâts. Blocage : ' + sWords[b] + '. Parade : ' + sWords[p] + '. Esquivable. Ouvrir la fiche ' + a.enemy + '.'
      }, split(a.name));
    });
"""
SEARCH_RETURN = """      creCount: String(foundCreatures.length),
      attCount: String(foundAttacks.length),
      foundAtt: foundAttacks,
"""


def section(text, start, end):
    """Slice bounds from the first start marker present (a tuple lists alternatives) to end."""
    starts = start if isinstance(start, tuple) else (start,)
    i = min(text.index(s) for s in starts if s in text)
    j = text.index(end, i)
    return i, j


def insert_css(text):
    return text.replace("</style>", EXTRA_CSS + "</style>", 1)


def build_mobile():
    text = (P / "Bestiaire.dc.html").read_text(encoding="utf-8")
    text = insert_css(text)
    text = re.sub(r"<title>.*?</title>", "<title>Bestiaire — recherche</title>", text, count=1)
    i, j = section(text, ('    <label style="display: flex; align-items: center; gap: 8px; height: 44px;', '    <a href="Bestiaire-Recherche.dc.html"'),
                   '    <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid #2C383D">')
    row = text[text.index('          <li style="border-bottom: 1px solid #1F2A2E">'):text.index("          </li>") + len("          </li>")]
    row = row.replace('<span style="font-size: 15px">{{ r.name }}</span>',
                      '<span style="font-size: 15px">{{ r.pre }}<mark>{{ r.hit }}</mark>{{ r.post }}</span>')
    grid = "display: grid; grid-template-columns: minmax(0, 1fr) 40px 104px 16px; gap: 8px; align-items: center"
    block = f'''    <label style="display: flex; align-items: center; gap: 8px; height: 44px; border: 1px solid #8EBDE3; border-radius: 4px; padding: 0 2px 0 12px">
      {SEARCH_ICON}
      <span style="{SR_ONLY}">Rechercher dans tous les biomes</span>
      <input type="search" value="tro" aria-controls="b-results" style="flex: 1; min-width: 0; height: 42px; background: transparent; border: 0; font-size: 15px">
      <a href="Bestiaire.dc.html" aria-label="Effacer la recherche" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #97A5AA">{CLOSE_ICON.format(s=18)}</a>
    </label>

    <div id="b-results" aria-live="polite" style="flex: 1; min-height: 0; overflow-y: auto; margin: 0 -16px; padding: 0 16px; display: flex; flex-direction: column; gap: 18px">
      <section aria-labelledby="b-cre" style="flex: none; display: flex; flex-direction: column">
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid #2C383D">
          <h2 id="b-cre" style="margin: 0; font-size: 11px; font-weight: 400; letter-spacing: 0.08em; color: #97A5AA">CRÉATURES · {{{{ creCount }}}}</h2>
          <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #7D8B91">AVEC TON ÉQUIPEMENT</span>
        </div>
        <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column">
        <sc-for list="{{{{ rows }}}}" as="r" hint-placeholder-count="1">
{row}
        </sc-for>
        </ul>
      </section>

      <section aria-labelledby="b-att" style="flex: none; display: flex; flex-direction: column">
        <div style="{grid}; padding-bottom: 6px; border-bottom: 1px solid #2C383D; font-size: 11px; letter-spacing: 0.08em; color: #97A5AA">
          <h2 id="b-att" style="margin: 0; font-size: 11px; font-weight: 400">ATTAQUES · {{{{ attCount }}}}</h2>
          <span style="text-align: right">DÉG.</span>
          <span style="display: flex; gap: 6px">{trio_header(30)}</span>
          <span></span>
        </div>
        <sc-for list="{{{{ foundAtt }}}}" as="a" hint-placeholder-count="1">
          <a href="Monstre.dc.html" aria-label="{{{{ a.aria }}}}" style="{grid}; min-height: 56px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none">
            <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
              <span style="font-size: 14px">{{{{ a.enemy }}}} · {{{{ a.pre }}}}<mark>{{{{ a.hit }}}}</mark>{{{{ a.post }}}}</span>
              {hole_tag('a')}
            </span>
            <span style="text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 15px">{{{{ a.dmg }}}}</span>
            <span aria-hidden="true" style="display: flex; gap: 6px">{trio_cells(30, 17)}</span>
            {CHEVRON}
          </a>
        </sc-for>
      </section>
      <p style="flex: none; margin: 0 0 4px; font-size: 12px; color: #7D8B91; line-height: 1.45">Résultats sur tous les biomes. Une attaque ouvre la fiche de sa créature, d'où tu peux la simuler.</p>
    </div>
'''
    text = text[:i] + block + text[j:]
    text = text.replace("    return {\n      rows: list.map((r) => ({\n        name: r.name,\n        stats: r.stats,",
                        SEARCH_JS + "    return {\n" + SEARCH_RETURN + "      rows: foundCreatures.map((r) => Object.assign(split(r.name), {\n        name: r.name,\n        stats: 'FORÊT NOIRE · ' + r.stats,", 1)
    assert "foundCreatures.map" in text
    (P / "Bestiaire-Recherche.dc.html").write_text(text, encoding="utf-8", newline="\n")


def build_desktop():
    text = (P / "Desktop-Bestiaire.dc.html").read_text(encoding="utf-8")
    text = insert_css(text)
    text = re.sub(r"<title>.*?</title>", "<title>Bestiaire, recherche — desktop</title>", text, count=1)
    i, j = section(text, ('        <label style="display: flex; align-items: center; gap: 8px; height: 40px;', '        <a href="Desktop-Bestiaire-Recherche.dc.html"'),
                   '        <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #97A5AA; padding-top: 10px;')
    li_start = text.index('            <li style="border-bottom: 1px solid #1F2A2E">')
    row = text[li_start:text.index("            </li>", li_start) + len("            </li>")]
    row = row.replace('<span style="font-size: 15px">{{ r.name }}</span>',
                      '<span style="font-size: 15px">{{ r.pre }}<mark>{{ r.hit }}</mark>{{ r.post }}</span>')
    grid = "display: grid; grid-template-columns: minmax(0, 1fr) 40px 86px 16px; gap: 8px; align-items: center"
    block = f'''        <label style="display: flex; align-items: center; gap: 8px; height: 40px; border: 1px solid #8EBDE3; border-radius: 4px; padding: 0 2px 0 12px">
          {SEARCH_ICON}
          <span style="{SR_ONLY}">Rechercher dans tous les biomes</span>
          <input type="search" value="tro" aria-controls="b-results" style="flex: 1; min-width: 0; height: 38px; background: transparent; border: 0; font-size: 14px">
          <a href="Desktop-Bestiaire.dc.html" aria-label="Effacer la recherche" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #97A5AA">{CLOSE_ICON.format(s=16)}</a>
        </label>
        <div id="b-results" aria-live="polite" style="flex: 1; min-height: 0; overflow-y: auto; margin: 0 -16px; padding: 0 16px; display: flex; flex-direction: column; gap: 18px">
          <section aria-labelledby="b-cre" style="flex: none; display: flex; flex-direction: column">
            <div style="display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 6px; border-bottom: 1px solid #2C383D">
              <h3 id="b-cre" style="margin: 0; font-size: 11px; font-weight: 400; letter-spacing: 0.08em; color: #97A5AA">CRÉATURES · {{{{ creCount }}}}</h3>
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #7D8B91">AVEC TON ÉQUIPEMENT</span>
            </div>
            <ul style="list-style: none; margin: 0 -16px; padding: 0; display: flex; flex-direction: column">
              <sc-for list="{{{{ rows }}}}" as="r" hint-placeholder-count="1">
{row}
              </sc-for>
            </ul>
          </section>
          <section aria-labelledby="b-att" style="flex: none; display: flex; flex-direction: column">
            <div style="{grid}; padding-bottom: 6px; border-bottom: 1px solid #2C383D; font-size: 11px; letter-spacing: 0.08em; color: #97A5AA">
              <h3 id="b-att" style="margin: 0; font-size: 11px; font-weight: 400">ATTAQUES · {{{{ attCount }}}}</h3>
              <span style="text-align: right">DÉG.</span>
              <span style="display: flex; gap: 4px">{trio_header(26)}</span>
              <span></span>
            </div>
            <sc-for list="{{{{ foundAtt }}}}" as="a" hint-placeholder-count="1">
              <a href="Desktop-Bestiaire.dc.html" aria-label="{{{{ a.aria }}}}" style="{grid}; min-height: 52px; border-bottom: 1px solid #1F2A2E; color: #E2E8E8; text-decoration: none">
                <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
                  <span style="font-size: 14px">{{{{ a.enemy }}}} · {{{{ a.pre }}}}<mark>{{{{ a.hit }}}}</mark>{{{{ a.post }}}}</span>
                  {hole_tag('a')}
                </span>
                <span style="text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 15px">{{{{ a.dmg }}}}</span>
                <span aria-hidden="true" style="display: flex; gap: 4px">{trio_cells(26, 15)}</span>
                {CHEVRON}
              </a>
            </sc-for>
          </section>
          <p style="flex: none; margin: 0 0 12px; font-size: 12px; color: #7D8B91; line-height: 1.45">Résultats sur tous les biomes. Une attaque ouvre la fiche de sa créature.</p>
        </div>
'''
    text = text[:i] + block + text[j:]
    text = text.replace("    return {\n      starOpts:", SEARCH_JS + "    return {\n" + SEARCH_RETURN + "      starOpts:", 1)
    text = text.replace("      rows: list.map((r) => ({\n        name: r.name, stats: r.stats,",
                        "      rows: foundCreatures.map((r) => Object.assign(split(r.name), {\n        name: r.name, stats: 'FORÊT NOIRE · ' + r.stats,", 1)
    assert "foundCreatures.map" in text
    (P / "Desktop-Bestiaire-Recherche.dc.html").write_text(text, encoding="utf-8", newline="\n")


def link_field(name, start, end, html):
    path = P / name
    text = path.read_text(encoding="utf-8")
    if start not in text:  # already a link to the search screen
        return
    i, j = section(text, start, end)
    path.write_text(text[:i] + html + text[j + len(end):], encoding="utf-8", newline="\n")


def build_context():
    """The phone Bestiaire with its context sheet open, so that the canvas shows the sheet."""
    text = (P / "Bestiaire.dc.html").read_text(encoding="utf-8")
    text = re.sub(r"<title>.*?</title>", "<title>Ton contexte — feuille du bas</title>", text, count=1)
    opening = "class Component extends DCLogic {\n"
    assert text.count(opening) == 1
    constructor = "  constructor(props) {\n    super(props);\n    this.state = { menu: true };\n  }\n"
    text = text.replace(opening, opening + constructor, 1)
    (P / "Contexte.dc.html").write_text(text, encoding="utf-8", newline="\n")


def main():
    build_mobile()
    build_desktop()
    link_field("Bestiaire.dc.html", '    <label style="display: flex; align-items: center; gap: 8px; height: 44px;', "    </label>\n",
               f'''    <a href="Bestiaire-Recherche.dc.html" aria-label="Rechercher dans tous les biomes" style="display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: 15px; color: #7D8B91; text-decoration: none">
      {SEARCH_ICON}
      Monstre ou attaque, tous biomes
    </a>
''')
    link_field("Desktop-Bestiaire.dc.html", '        <label style="display: flex; align-items: center; gap: 8px; height: 40px;', "        </label>\n",
               f'''        <a href="Desktop-Bestiaire-Recherche.dc.html" aria-label="Rechercher dans tous les biomes" style="display: flex; align-items: center; gap: 8px; height: 40px; box-sizing: border-box; border: 1px solid #2C383D; border-radius: 4px; padding: 0 12px; font-size: 14px; color: #7D8B91; text-decoration: none">
          {SEARCH_ICON}
          Monstre ou attaque, tous biomes
        </a>
''')
    build_context()
    print("ok")


main()
