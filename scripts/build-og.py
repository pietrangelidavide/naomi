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
@font-face{{font-family:Nunito;font-weight:400 900;src:url({u('fonts/nunito-var.woff')})}}
*{{margin:0;box-sizing:border-box;border-radius:0}}
body{{width:1200px;height:630px;position:relative;overflow:hidden;background:#f2ece3;font-family:Nunito}}
.light{{position:absolute;inset:-10% -10% 0;background:repeating-linear-gradient(112deg,rgba(255,252,247,0) 0 90px,rgba(255,252,247,.85) 90px 200px,rgba(255,252,247,0) 200px 360px);filter:blur(22px);opacity:.9}}
.name{{position:absolute;left:72px;top:62px;font-weight:800;font-size:30px;color:#242321}}
.role{{position:absolute;left:72px;top:102px;font-weight:600;font-size:21px;color:#5a564f}}
h1{{position:absolute;left:70px;top:184px;width:640px;font:800 82px/1.04 Nunito;letter-spacing:-.015em;color:#242321}}
.sub{{position:absolute;left:72px;bottom:60px;font-weight:700;font-size:25px;color:#70513f}}
.slab{{position:absolute;left:770px;top:60px;width:340px;height:510px;background:linear-gradient(160deg,#7e6252,#70513f 55%,#4e3c32);transform:translate(38px,32px);box-shadow:0 40px 60px -30px rgba(78,60,50,.6)}}
.mat{{position:absolute;left:770px;top:60px;width:340px;height:510px;padding:14px;background:#f9f7f3;box-shadow:0 0 0 1px rgba(36,35,33,.12),0 30px 50px -22px rgba(36,35,33,.5)}}
.mat div{{width:100%;height:100%;background:url({u('img/naomi-camicia.webp')}) 74% 38%/auto 150%}}
</style><div class=light></div>
<div class=name>Dott.ssa Naomi Acciaro</div><div class=role>Biologa nutrizionista</div>
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
