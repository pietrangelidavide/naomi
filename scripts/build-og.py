#!/usr/bin/env python3
"""Immagine di anteprima social (Open Graph) 1200×630 → public/img/og.jpg. Uso: python3 scripts/build-og.py"""
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
u = lambda p: (PUB / p).as_uri()
html = f"""<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:IS;src:url({u('fonts/instrumentserif-regular.woff')})}}
@font-face{{font-family:ISa;font-weight:700;src:url({u('fonts/instrumentsans-bold.woff')})}}
@font-face{{font-family:ISa;src:url({u('fonts/instrumentsans-regular.woff')})}}
*{{margin:0;box-sizing:border-box;border-radius:0}}
body{{width:1200px;height:630px;position:relative;overflow:hidden;background:#e9e5de;font-family:ISa}}
.light{{position:absolute;inset:-10% -10% 0;background:repeating-linear-gradient(112deg,rgba(255,253,249,0) 0 90px,rgba(255,253,249,.85) 90px 200px,rgba(255,253,249,0) 200px 360px);filter:blur(22px);opacity:.9}}
.logo{{position:absolute;left:70px;top:58px;height:64px}}
h1{{position:absolute;left:70px;top:176px;width:610px;font:400 100px/.95 IS;letter-spacing:-.012em;color:#3a3033}}
.sub{{position:absolute;left:72px;bottom:62px;font-weight:700;font-size:26px;color:#5b2a52}}
.slab{{position:absolute;left:760px;top:70px;width:340px;height:490px;background:linear-gradient(160deg,#6d3b63,#5b2a52 55%,#43203d);transform:translate(40px,34px);box-shadow:0 40px 60px -30px rgba(67,32,61,.6)}}
.mat{{position:absolute;left:760px;top:70px;width:340px;height:490px;padding:14px;background:#f8f6f2;box-shadow:0 0 0 1px rgba(58,48,51,.14),0 30px 50px -22px rgba(58,48,51,.5)}}
.mat div{{width:100%;height:100%;background:url({u('img/naomi-studio.webp')}) 62% 28%/cover}}
</style><div class=light></div>
<img class=logo src="{u('img/logo.svg')}">
<h1>Un piano su misura. Letteralmente.</h1>
<div class=sub>Roma | Online · prima visita su MioDottore</div>
<div class=slab></div><div class=mat><div></div></div>"""
tmp = Path(tempfile.mkdtemp()) / "og.html"; tmp.write_text(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto(tmp.as_uri(), wait_until="load"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(500)
    png = tmp.parent / "og.png"; pg.screenshot(path=str(png)); b.close()
Image.open(png).convert("RGB").save(PUB / "img/og.jpg", "JPEG", quality=88, optimize=True, progressive=True)
print("og.jpg", (PUB / "img/og.jpg").stat().st_size // 1024, "KB")
