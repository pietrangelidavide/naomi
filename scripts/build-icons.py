#!/usr/bin/env python3
"""Icone del sito dal logo testuale (solo nome e cognome): favicon, apple-touch-icon, icon-512.
Le icone piccole usano le iniziali «NA» (un nome intero non ci starebbe); icon-512 usa il nome per esteso.
Uso: python3 scripts/build-icons.py   (serve Playwright + Pillow; font da public/fonts)"""
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
FONT = (PUB / "fonts/cormorant-garamond-var.woff").as_uri()
IVORY, CHARCOAL, SAND = "#f6f3ee", "#333831", "#ded5ca"
face = f"@font-face{{font-family:CG;font-weight:300 600;src:url({FONT})}}*{{margin:0;box-sizing:border-box}}"

mono = f"""<!doctype html><meta charset=utf-8><style>{face}
body{{width:512px;height:512px;background:{CHARCOAL};display:grid;place-items:center}}
span{{font:500 250px/1 CG;color:{IVORY};letter-spacing:.02em;margin-top:-14px}}</style><span>NA</span>"""
wordmark = f"""<!doctype html><meta charset=utf-8><style>{face}
body{{width:512px;height:512px;background:{IVORY};display:grid;place-content:center;justify-items:center;gap:22px;text-align:center}}
b{{font:500 68px/1 CG;letter-spacing:.17em;margin-right:-.17em;color:{CHARCOAL}}}
i{{display:block;width:64px;height:2px;background:{SAND}}}
em{{font:500 20px/1 CG;font-style:normal;letter-spacing:.3em;margin-right:-.3em;color:#5d6a58}}</style><b>NAOMI</b><b>ACCIARO</b><i></i><em>BIOLOGA NUTRIZIONISTA</em>"""

tmp = Path(tempfile.mkdtemp())
def shot(html, name):
    f = tmp / f"{name}.html"; f.write_text(html)
    pg.goto(f.as_uri(), wait_until="load"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
    out = tmp / f"{name}.png"; pg.screenshot(path=str(out)); return Image.open(out).convert("RGB")

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 512, "height": 512})
    m = shot(mono, "mono"); w = shot(wordmark, "word"); b.close()

w.save(PUB / "img/icon-512.png", optimize=True)
m.resize((180, 180), Image.LANCZOS).save(PUB / "img/apple-touch-icon.png", optimize=True)
for s in (32, 48):
    m.resize((s, s), Image.LANCZOS).save(PUB / f"img/favicon-{s}.png", optimize=True)
m.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("icone aggiornate")
