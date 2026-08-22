"""Per-font PDF text extractor (binds ToUnicode CMaps to /Tf font switches). Read-only."""
import re, zlib

PATH = "Papasud x Hackathon Cursor  Verticales.pdf"
data = open(PATH, "rb").read()

# --- index indirect objects ---
objs = {}
for m in re.finditer(rb"(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj", data, re.DOTALL):
    objs[int(m.group(1))] = m.group(3)

def stream_of(body):
    m = re.search(rb"stream\r?\n(.*?)endstream", body, re.DOTALL)
    if not m: return None
    raw = m.group(1)
    for cand in (raw, raw.rstrip(b"\r\n"), raw.strip()):
        try: return zlib.decompress(cand)
        except Exception: pass
    return raw

def parse_cmap(dec):
    m = {}
    for mm in re.finditer(rb"beginbfchar(.*?)endbfchar", dec, re.DOTALL):
        for pair in re.finditer(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", mm.group(1)):
            src = int(pair.group(1), 16); dst = pair.group(2).decode()
            m[src] = "".join(chr(int(dst[i:i+4],16)) for i in range(0,len(dst),4))
    for mm in re.finditer(rb"beginbfrange(.*?)endbfrange", dec, re.DOTALL):
        for r in re.finditer(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", mm.group(1)):
            lo,hi,base = int(r.group(1),16), int(r.group(2),16), int(r.group(3),16)
            for i,c in enumerate(range(lo,hi+1)): m[c] = chr(base+i)
    return m

# font obj -> cmap
font_cmap = {}
for num, body in objs.items():
    tu = re.search(rb"/ToUnicode\s+(\d+)\s+\d+\s+R", body)
    if tu:
        d = stream_of(objs.get(int(tu.group(1)), b""))
        if d: font_cmap[num] = parse_cmap(d)

# pages
pages = []
for num, body in objs.items():
    if b"/Type" not in body or b"/Page" not in body: continue
    if re.search(rb"/Type\s*/Pages", body): continue
    if not re.search(rb"/Type\s*/Page\b", body): continue
    # resources: inline or ref
    res = body
    rr = re.search(rb"/Resources\s+(\d+)\s+\d+\s+R", body)
    if rr: res = objs.get(int(rr.group(1)), b"")
    names = {}
    fm = re.search(rb"/Font\s*<<(.*?)>>", res, re.DOTALL)
    if not fm:
        fr = re.search(rb"/Font\s+(\d+)\s+\d+\s+R", res)
        if fr:
            fb = objs.get(int(fr.group(1)), b"")
            fm = re.search(rb"<<(.*?)>>", fb, re.DOTALL)
    if fm:
        for f in re.finditer(rb"/([A-Za-z0-9#\.\-\+]+)\s+(\d+)\s+\d+\s+R", fm.group(1)):
            names[f.group(1).decode()] = int(f.group(2))
    # contents
    cs = b""
    for cm in re.finditer(rb"/Contents\s+(?:(\d+)\s+\d+\s+R|\[(.*?)\])", body, re.DOTALL):
        if cm.group(1):
            cs += (stream_of(objs.get(int(cm.group(1)), b"")) or b"") + b"\n"
        else:
            for r in re.finditer(rb"(\d+)\s+\d+\s+R", cm.group(2)):
                cs += (stream_of(objs.get(int(r.group(1)), b"")) or b"") + b"\n"
    if not cs.strip(): continue
    s = cs.decode("latin-1")
    out=[]; cur={}; last_y=None
    tok_re = re.compile(r"/([A-Za-z0-9#\.\-\+]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj|\(((?:\.|[^\)])*)\)\s*Tj|[\d.\-]+\s+[\d.\-]+\s+[\d.\-]+\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+Tm")
    for t in tok_re.finditer(s):
        if t.group(1):
            cur = font_cmap.get(names.get(t.group(1), -1), {})
        elif t.group(2) is not None:
            h = t.group(2)
            for i in range(0, len(h), 4 if len(h)%4==0 and len(h)>2 else 2):
                pass
            # assume 2-byte codes
            step = 4 if len(h) % 4 == 0 else 2
            for i in range(0, len(h), step):
                out.append(cur.get(int(h[i:i+step],16), "?"))
        elif t.group(3) is not None:
            out.append(t.group(3))
        elif t.group(6) is not None:
            y = float(t.group(6))
            if last_y is not None and abs(y-last_y) > 1: out.append("\n")
            last_y = y
    txt = "".join(out)
    if txt.strip(): pages.append((num, txt))

for num, txt in pages:
    print(f"\n\n===== PAGE obj {num} =====\n{txt}")
