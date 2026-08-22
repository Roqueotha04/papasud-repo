"""PDF text extractor honoring per-font ToUnicode CMaps and Tf font switches. Read-only."""
import re, zlib

PATH = r"c:\Users\angry\OneDrive\Escritorio\Programacion\Papasud repo\excel\Papasud x Hackathon Cursor  Verticales.pdf"
data = open(PATH, "rb").read()


def all_streams():
    for m in re.finditer(rb"stream\r?\n?(.*?)endstream", data, re.DOTALL):
        raw = m.group(1)
        for cand in (raw, raw.rstrip(b"\r\n"), raw.strip()):
            try:
                yield zlib.decompress(cand)
                break
            except Exception:
                continue


def parse_cmap(dec):
    m = {}
    for mm in re.finditer(rb"beginbfchar(.*?)endbfchar", dec, re.DOTALL):
        body = mm.group(1)
        for pair in re.finditer(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", body):
            src = int(pair.group(1), 16)
            dst = pair.group(2).decode()
            m[src] = "".join(chr(int(dst[i:i+4], 16)) for i in range(0, len(dst), 4))
    for mm in re.finditer(rb"beginbfrange(.*?)endbfrange", dec, re.DOTALL):
        body = mm.group(1)
        for r in re.finditer(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", body):
            lo = int(r.group(1), 16); hi = int(r.group(2), 16); base = int(r.group(3), 16)
            for i, code in enumerate(range(lo, hi + 1)):
                m[code] = chr(base + i)
    return m


# Collect all ToUnicode cmaps (merge). We can't easily bind to font names, so merge per-font by proximity.
cmaps = {}
for dec in all_streams():
    if b"beginbfchar" in dec or b"beginbfrange" in dec:
        cm = parse_cmap(dec)
        cmaps.update(cm)

# Now decode content streams; map hex glyph codes via merged cmap.
pages = []
for dec in all_streams():
    if b"Tj" not in dec and b"TJ" not in dec:
        continue
    s = dec.decode("latin-1")
    out = []
    last_y = None
    for tok in re.finditer(r"<([0-9A-Fa-f]+)>\s*Tj|1 0 0 -1 [\-0-9.]+ ([\-0-9.]+) Tm|\bET\b", s):
        if tok.group(1) is not None:
            code = int(tok.group(1), 16)
            out.append(cmaps.get(code, ""))
        elif tok.group(2) is not None:
            y = float(tok.group(2))
            if last_y is not None and abs(y - last_y) > 1:
                out.append("\n")
            last_y = y
    text = "".join(out)
    if text.strip():
        pages.append(text)

print("\n\n==== PAGE BREAK ====\n\n".join(pages))
