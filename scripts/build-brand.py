#!/usr/bin/env python3
"""Genera i file del marchio (SVG con testo convertito in tracciati + PNG) in brand/logo e public/img.
Uso: python3 scripts/build-brand.py   (serve fontTools e Playwright; i font sono in public/fonts come TTF originali)
I TTF originali Instrument Serif / Instrument Sans (OFL) si trovano in /mnt/skills/.../canvas-fonts oppure su Google Fonts."""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.environ.get("BRAND_FONTS", "/mnt/skills/examples/canvas-design/canvas-fonts")
SERIF = f"{FONTS}/InstrumentSerif-Regular.ttf"
SANS = f"{FONTS}/InstrumentSans-Regular.ttf"
OUT = os.path.join(ROOT, "brand", "logo")
os.makedirs(OUT, exist_ok=True)

PLUM, PLUM_D, IVORY, HONEY, INK, MUTED = "#5b2a52", "#43203d", "#f6f4f1", "#c2a373", "#3a3033", "#61575a"

_shaped = {}
def positions(font_path, text, size, tracking_em=0.0):
    """x di ogni carattere come li dispone Chromium (con crenatura), in px a `size`."""
    key = (font_path, text, size, tracking_em)
    if key in _shaped: return _shaped[key]
    import tempfile
    html = f"""<!doctype html><meta charset=utf-8><style>@font-face{{font-family:F;src:url('file://{font_path}')}}
    body{{margin:0}}span{{font:{size}px F;letter-spacing:{tracking_em}em;white-space:pre;position:absolute;left:0;top:0}}</style><span id=s>{text}</span>"""
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False); tmp.write(html); tmp.close()
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto("file://" + tmp.name); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
        xs = pg.evaluate("""() => { const n=document.getElementById('s').firstChild; const r=document.createRange(); const out=[];
          for(let i=0;i<n.length;i++){ r.setStart(n,i); r.setEnd(n,i+1); out.push(r.getBoundingClientRect().left);} 
          return {xs:out, w:document.getElementById('s').getBoundingClientRect().width}; }""")
        b.close()
    _shaped[key] = xs; return xs

def text_path(font_path, text, size, x, baseline, tracking_em=0.0):
    f = TTFont(font_path); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
    sc = size / upm; sh = positions(font_path, text, size, tracking_em); d = []
    for ch, cx in zip(text, sh["xs"]):
        if ch == " ": continue
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        tp = TransformPen(pen, (sc, 0, 0, -sc, x + cx, baseline))
        gs[cmap[ord(ch)]].draw(tp); d.append(pen.getCommands())
    return " ".join(d), sh["w"]

def mark(x=0, y=0, s=64, bg=PLUM, coat=IVORY, line=HONEY, with_line=True):
    k = s / 64
    g = f'<g transform="translate({x} {y}) scale({k})">'
    g += f'<rect width="64" height="64" fill="{bg}"/>'
    g += f'<polygon points="0,0 16,0 32,32 48,0 64,0 32,64" fill="{coat}"/>'
    if with_line: g += f'<path d="M23 0 L32 17 L41 0" fill="none" stroke="{line}" stroke-width="2.4" stroke-miterlimit="10"/>'
    return g + "</g>"

def svg(w, h, inner, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>\n'

def lockup_h(name_c=INK, role_c=MUTED, rule_c=HONEY, **mk):
    S = 72; nsize = 48; rsize = 15.5
    nd, nw = text_path(SERIF, "Naomi Acciaro", nsize, S + 22, 38)
    rd, rw = text_path(SANS, "Biologa nutrizionista", rsize, S + 22, 64, 0.03)
    w = int(S + 22 + max(nw, rw) + 4)
    inner = mark(0, 0, S, **mk) + f'<path d="{nd}" fill="{name_c}"/><rect x="{S+22}" y="46" width="22" height="2" fill="{rule_c}"/><path d="{rd}" fill="{role_c}"/>'
    return svg(w, S, inner, "Naomi Acciaro, biologa nutrizionista")

def lockup_v(name_c=INK, role_c=MUTED, rule_c=HONEY, **mk):
    S = 96; nsize = 52; rsize = 17
    nd, nw = text_path(SERIF, "Naomi Acciaro", nsize, 0, 0)
    rd, rw = text_path(SANS, "Biologa nutrizionista", rsize, 0, 0, 0.03)
    W = int(max(nw, rw)) + 16; ox = (W - nw) / 2; rx = (W - rw) / 2
    nd, _ = text_path(SERIF, "Naomi Acciaro", nsize, ox, S + 22 + 40)
    rd, _ = text_path(SANS, "Biologa nutrizionista", rsize, rx, S + 22 + 40 + 40, 0.03)
    H = S + 22 + 40 + 40 + 10
    inner = mark((W - S) / 2, 0, S, **mk) + f'<path d="{nd}" fill="{name_c}"/><rect x="{W/2-11}" y="{S+22+40+12}" width="22" height="2" fill="{rule_c}"/><path d="{rd}" fill="{role_c}"/>'
    return svg(W, H, inner, "Naomi Acciaro, biologa nutrizionista")

files = {
  "naomi-acciaro-logo.svg": lockup_h(),
  "naomi-acciaro-logo-verticale.svg": lockup_v(),
  "naomi-acciaro-logo-su-scuro.svg": lockup_h(name_c=IVORY, role_c="#e3d9df", bg=IVORY, coat=PLUM, line=HONEY),
  "naomi-acciaro-logo-monocromo.svg": lockup_h(name_c=PLUM, role_c=PLUM, rule_c=PLUM, bg=PLUM, coat=IVORY, with_line=False),
  "naomi-acciaro-marchio.svg": svg(64, 64, mark(), "Marchio Naomi Acciaro"),
  "naomi-acciaro-marchio-negativo.svg": svg(64, 64, mark(bg=IVORY, coat=PLUM), "Marchio Naomi Acciaro, negativo"),
}
for n, s in files.items():
    open(os.path.join(OUT, n), "w", encoding="utf-8").write(s)
# versione compatta per favicon (senza filetto miele, che a 16 px si impasta)
open(os.path.join(ROOT, "public/img/favicon.svg"), "w").write(svg(64, 64, mark(with_line=False), "Naomi Acciaro"))
open(os.path.join(ROOT, "public/img/logo.svg"), "w").write(files["naomi-acciaro-logo.svg"])
open(os.path.join(ROOT, "public/img/logo-su-scuro.svg"), "w").write(files["naomi-acciaro-logo-su-scuro.svg"])
open(os.path.join(ROOT, "public/img/marchio.svg"), "w").write(files["naomi-acciaro-marchio.svg"])

# PNG
def png(path, size, svg_text, bg=None, pad=0):
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": size[0], "height": size[1]})
        pg.set_content(f'<!doctype html><style>html,body{{margin:0;background:{bg or "transparent"}}}svg{{display:block;width:{size[0]-2*pad}px;height:auto;margin:{pad}px}}</style>{svg_text}')
        pg.wait_for_timeout(100); pg.screenshot(path=path, omit_background=bg is None); b.close()
mk_full = svg(64, 64, mark(), "Naomi Acciaro")
png(os.path.join(ROOT, "public/img/apple-touch-icon.png"), (180, 180), mk_full)
png(os.path.join(ROOT, "public/img/icon-512.png"), (512, 512), mk_full)
png(os.path.join(OUT, "naomi-acciaro-avatar-1080.png"), (1080, 1080), mk_full)
png(os.path.join(OUT, "naomi-acciaro-logo.png"), (1600, 400), files["naomi-acciaro-logo.svg"].replace('width="', 'data-w="').replace('height="', 'data-h="'), bg="#f6f4f1", pad=60)
print("ok", list(files))
