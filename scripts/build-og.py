#!/usr/bin/env python3
"""Immagine di anteprima social (Open Graph) 1200×630 → public/img/og.jpg. Uso: python3 scripts/build-og.py
Solo i colori e i font del sito: avorio, sabbia, salvia, carbone; Cormorant Garamond e DM Sans."""
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
u = lambda p: (PUB / p).as_uri()
html = f"""<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:CG;font-weight:300 600;src:url({u('fonts/cormorant-garamond-var.woff')})}}
@font-face{{font-family:CG;font-style:italic;font-weight:300 600;src:url({u('fonts/cormorant-garamond-italic-var.woff')})}}
@font-face{{font-family:DM;font-weight:400 700;src:url({u('fonts/dm-sans-var.woff')})}}
*{{margin:0;box-sizing:border-box}}
body{{width:1200px;height:630px;position:relative;overflow:hidden;background:#f6f3ee;color:#333831}}
.name{{position:absolute;left:80px;top:64px;font:500 30px/1 CG;letter-spacing:.26em}}
.role{{position:absolute;left:80px;top:106px;font:500 14px/1 DM;letter-spacing:.3em;color:#5d6a58}}
h1{{position:absolute;left:78px;top:206px;width:610px;font:400 74px/1.03 CG;letter-spacing:-.015em}}
.sub{{position:absolute;left:80px;bottom:62px;font:italic 400 28px/1 CG;color:#5d6a58}}
.plate{{position:absolute;left:800px;top:100px;width:300px;height:470px;background:#ded5ca}}
.photo{{position:absolute;left:760px;top:60px;width:340px;height:470px;background:url({u('img/scrivania-1.webp')}) 62% 18%/cover}}
</style>
<div class=name>NAOMI ACCIARO</div><div class=role>BIOLOGA NUTRIZIONISTA</div>
<h1>Prendersi cura di sé, partendo dall'alimentazione.</h1>
<div class=sub>Il tuo benessere, il tuo equilibrio, il tuo percorso.</div>
<div class=plate></div><div class=photo></div>"""
tmp = Path(tempfile.mkdtemp()) / "og.html"; tmp.write_text(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto(tmp.as_uri(), wait_until="load"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
    png = tmp.parent / "og.png"; pg.screenshot(path=str(png)); b.close()
Image.open(png).convert("RGB").save(PUB / "img/og.jpg", "JPEG", quality=88, optimize=True, progressive=True)
print("og.jpg", (PUB / "img/og.jpg").stat().st_size // 1024, "KB")
