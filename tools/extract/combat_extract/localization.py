"""The game's localisation, loaded the way Localization.SetupLanguage and LoadCSV do it (assembly_guiutils):

- the CSV tables are those LocalizationSettings lists, in its order, and the last occurrence of a key wins,
  across tables and inside one;
- a cell is trimmed, and an empty one falls back to the English column;
- English is loaded first, then the language, so a key missing from it keeps its English text.

LocalizationSettings has no type tree in resources.assets: its table list is read from the raw object.
Grown from Relooking's valheim_assets, now abandoned."""
import re
import struct

from .unity import RESOURCES, AssetSet

LANGUAGES = ("English", "French")


class Localization:
    def __init__(self, tables):
        self.tables = tables  # language -> {key: text}

    def get(self, key, lang="English"):
        return self.tables.get(lang, {}).get(key)

    def search(self, pattern, lang="English"):
        rx = re.compile(pattern)
        return [(k, v) for k, v in sorted(self.tables.get(lang, {}).items()) if rx.search(k)]


def _settings_tables(sf, pid):
    """Path ids of LocalizationSettings.m_localizations, read from the raw MonoBehaviour."""
    raw = sf.objects[pid].get_raw_data()
    offset = 12 + 4 + 12  # m_GameObject, m_Enabled (aligned), m_Script
    offset += 4 + struct.unpack_from("<i", raw, offset)[0]  # m_Name
    offset = (offset + 3) & ~3
    count = struct.unpack_from("<i", raw, offset)[0]
    return [struct.unpack_from("<iq", raw, offset + 4 + 12 * i)[1] for i in range(count)]


def _text(sf, pid):
    data = sf.objects[pid].read().m_Script
    if isinstance(data, str):
        data = data.encode("utf-8", "surrogateescape")
    return data.decode("utf-8-sig", errors="replace")


def _rows(text):
    """Localization.DoQuoteLineSplit: commas split cells, quotes protect them, "" is a quote."""
    rows, row, cell, quoted, i = [], [], [], False, 0
    while i < len(text):
        c = text[i]
        i += 1
        if c == '"':
            if quoted and i < len(text) and text[i] == '"':
                cell.append('"')
                i += 1
            else:
                quoted = not quoted
        elif c == "," and not quoted:
            row.append("".join(cell))
            cell = []
        elif c == "\n" and not quoted:
            row.append("".join(cell))
            rows.append(row)
            row, cell = [], []
        else:
            cell.append(c)
    row.append("".join(cell))
    rows.append(row)
    return rows


def _load(table, text, lang):
    header, _, rest = text.partition("\n")
    columns = [h.strip('"') for h in header.rstrip("\r").split(",")]
    if lang not in columns:
        return
    column = columns.index(lang)
    for row in _rows(rest):
        key = row[0] if row else ""
        if key and not key.startswith("//") and len(row) > column:
            value = row[column].strip()
            table.pop(key, None)
            table[key] = value if value and value[0] != "\r" else row[1]


def load(index, languages=LANGUAGES):
    aset = AssetSet(index, RESOURCES)
    settings = index.find("MonoBehaviour", ["LocalizationSettings"])["LocalizationSettings"]
    _, cab, pid = next(hit for hit in settings if hit[0] == RESOURCES)
    sf = aset.files[cab]
    texts = [_text(sf, table) for table in _settings_tables(sf, pid)]
    tables = {}
    for lang in languages:
        table = {}
        for step in dict.fromkeys(("English", lang)):
            for text in texts:
                _load(table, text, step)
        tables[lang] = table
    return Localization(tables)
