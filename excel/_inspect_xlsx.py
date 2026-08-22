"""Read-only inspection of .xlsx workbooks using only the stdlib (zipfile + ElementTree)."""
import sys, zipfile, re
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def col_to_idx(ref):
    m = re.match(r"([A-Z]+)", ref)
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read(path, max_rows=40):
    z = zipfile.ZipFile(path)
    # shared strings
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    # sheet name -> file
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rmap = {r.get("Id"): r.get("Target") for r in rels}
    sheets = []
    for sh in wb.iter(f"{NS}sheet"):
        tgt = rmap.get(sh.get(f"{RNS}id"), "")
        if not tgt.startswith("/"):
            tgt = "xl/" + tgt.lstrip("./")
        sheets.append((sh.get("name"), tgt.lstrip("/")))

    print(f"FILE: {path}")
    print("SHEETS:", [s[0] for s in sheets])
    for name, target in sheets:
        if target not in z.namelist():
            print(f"\n!! missing {target}"); continue
        root = ET.fromstring(z.read(target))
        rows = list(root.iter(f"{NS}row"))
        print("\n" + "=" * 90)
        print(f"SHEET: {name!r}  rows={len(rows)}")
        print("=" * 90)
        for r in rows[:max_rows]:
            cells = {}
            for c in r.findall(f"{NS}c"):
                ref = c.get("r") or ""
                t = c.get("t")
                v = c.find(f"{NS}v")
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(f"{NS}t"))
                elif v is not None:
                    val = v.text
                    try:
                        f = float(val)
                        val = str(int(f)) if f == int(f) else str(round(f, 4))
                    except Exception:
                        pass
                else:
                    continue
                if val and val.strip():
                    cells[col_to_idx(ref)] = val.strip()
            if not cells:
                continue
            width = max(cells) + 1
            line = " | ".join(cells.get(i, "") for i in range(width)).rstrip(" |")
            print(f"[{r.get('r'):>4}] {line}")
        if len(rows) > max_rows:
            print(f"... (+{len(rows)-max_rows} more rows)")


for p in sys.argv[1:]:
    read(p)
    print("\n\n")
