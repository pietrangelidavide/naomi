#!/usr/bin/env python3
"""Genera i 3 video brevi del sito (animazioni dalle foto reali di Naomi, senza audio).

Ogni video è una scena HTML/CSS 720×900 con animazioni CSS; Playwright le "scatta" fotogramma per fotogramma
(mettendo in pausa le animazioni e spostando il tempo), poi ffmpeg le assembla in MP4 H.264.
Uscite: public/video/*.mp4 e public/img/video/*.webp (copertine).

Uso:  python3 scripts/build-video.py            (tutti)
      python3 scripts/build-video.py a          (solo uno: a, b o c)
Richiede: playwright (con Chromium), ffmpeg, Pillow.
"""
import os, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
W, H, FPS = 720, 900, 24
PLUM, PLUM2, PLUM3, IVORY, WALL, PAPER, HONEY, INK, INK2 = "#5b2a52", "#43203d", "#6d3b63", "#f6f4f1", "#e9e5de", "#f1eee8", "#c2a373", "#3a3033", "#4a3f43"

# icone del sito (stessa griglia 24, tratto 1,5): le prendo dalla sprite e le incorporo
SPRITE = (PUB / "img/icons.svg").read_text()
def icon(name, size, color, stroke=1.5):
    body = re.search(rf'<symbol id="{name}"[^>]*>(.*?)</symbol>', SPRITE, re.S).group(1)
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" stroke-width="{stroke}" '
            f'stroke-linejoin="miter" stroke-linecap="square">{body}</svg>')

def fu(p): return (PUB / p).as_uri()

class Film:
    """Raccoglie scene e animazioni; ogni elemento ha un ritardo assoluto (secondi dall'inizio del video)."""
    def __init__(self, dur): self.dur, self.css, self.scenes, self.n = dur, [], [], 0
    def scene(self, start, end, bg, body_fn, fade=0.35):
        """Ogni scena entra in dissolvenza sopra la precedente (che resta sotto, coperta): niente buchi scuri a metà passaggio."""
        i = len(self.scenes)
        self.css.append(f"@keyframes sc{i}{{from{{opacity:0}}to{{opacity:1}}}}")
        self.scenes.append(f'<section class="sc" style="background:{bg};animation:sc{i} {fade:.2f}s linear {start:.2f}s both">{body_fn(start)}</section>')
    def html(self):
        return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:'IS';src:url('{fu("fonts/instrumentserif-regular.woff")}')}}
@font-face{{font-family:'ISa';src:url('{fu("fonts/instrumentsans-regular.woff")}')}}
@font-face{{font-family:'ISa';font-weight:700;src:url('{fu("fonts/instrumentsans-bold.woff")}')}}
*{{margin:0;padding:0;box-sizing:border-box;border-radius:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:{PLUM2}}}
body{{font-family:'ISa',sans-serif;color:{INK};-webkit-font-smoothing:antialiased}}
.sc{{position:absolute;inset:0;overflow:hidden;opacity:0}}
.abs{{position:absolute}}
.serif{{font-family:'IS',serif;font-weight:400}}
@keyframes up{{from{{opacity:0;transform:translateY(34px)}}to{{opacity:1;transform:none}}}}
@keyframes fade{{from{{opacity:0}}to{{opacity:1}}}}
@keyframes left{{from{{opacity:0;transform:translateX(60px)}}to{{opacity:1;transform:none}}}}
@keyframes grow{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
@keyframes growy{{from{{transform:scaleY(0)}}to{{transform:scaleY(1)}}}}
@keyframes zoom{{from{{transform:scale(1)}}to{{transform:scale(1.1)}}}}
@keyframes slab{{from{{opacity:0;transform:translate(-50px,-50px)}}to{{opacity:1;transform:none}}}}
@keyframes pan{{from{{background-position-x:0}}to{{background-position-x:-240px}}}}
{chr(10).join(self.css)}
</style></head><body><div style="position:relative;width:{W}px;height:{H}px">{''.join(self.scenes)}</div></body></html>"""

def A(name, dur, delay, extra="", ease="cubic-bezier(.2,.7,.2,1)"):  # stringa style per un'animazione
    return f"animation:{name} {dur}s {ease} {delay:.2f}s both;{extra}"

def mark(size, bg=PLUM, coat=IVORY, line=HONEY):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 64 64"><rect width="64" height="64" fill="{bg}"/>'
            f'<polygon points="0,0 16,0 32,32 48,0 64,0 32,64" fill="{coat}"/>'
            f'<path d="M23 0 L32 17 L41 0" fill="none" stroke="{line}" stroke-width="2.4" stroke-miterlimit="10"/></svg>')

def print_frame(x, y, w, h, img, t0, zoom_dur, pos="50% 30%", mat=14, slab_dx=38, slab_dy=38, slab=PLUM):
    """Foto in cornice con passepartout, lastra prugna dietro e lieve zoom."""
    return (f'<div class="abs" style="left:{x+slab_dx}px;top:{y+slab_dy}px;width:{w}px;height:{h}px;background:{slab};'
            f'box-shadow:0 40px 60px -30px rgba(67,32,61,.55);{A("slab",.9,t0)}"></div>'
            f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;padding:{mat}px;background:#f8f6f2;'
            f'box-shadow:0 0 0 1px rgba(58,48,51,.14),0 30px 50px -22px rgba(58,48,51,.45);{A("up",.9,t0)}">'
            f'<div style="width:100%;height:100%;overflow:hidden"><div style="width:100%;height:100%;background:url({fu(img)}) {pos}/cover;'
            f'{A("zoom",zoom_dur,t0,ease="linear")};transform-origin:60% 40%"></div></div></div>')

def tile(x, y, s, name, t0, dark=False):
    c = HONEY if dark else PLUM
    bg = "rgba(246,244,241,.1)" if dark else "linear-gradient(145deg,#fcfbf9,#e6e1d8)"
    sh = "inset 0 0 0 1.5px rgba(246,244,241,.25)" if dark else "0 0 0 1px rgba(58,48,51,.14),6px 10px 18px -8px rgba(58,48,51,.4)"
    return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{s}px;height:{s}px;padding:{s*.22:.0f}px;background:{bg};box-shadow:{sh};{A("up",.7,t0)}">'
            f'{icon(name, s*.56, c, 1.5)}</div>')

def brandline(t0, color=PLUM, text=INK, left=48, top=44):
    return (f'<div class="abs" style="left:{left}px;top:{top}px;display:flex;align-items:center;gap:14px;{A("fade",.8,t0)}">{mark(40)}'
            f'<span class="serif" style="font-size:34px;color:{text}">Naomi Acciaro</span></div>')

# ------------------------------------------------------------------ A: Con scienza e coscienza (10 s)
def film_a():
    f = Film(10.0)
    def s1(t):
        return (brandline(t + .2) +
                print_frame(96, 138, 520, 520, "img/naomi-camice.webp", t + .1, 4.0, "50% 28%") +
                f'<div class="abs serif" style="left:56px;top:690px;font-size:104px;line-height:.95;color:{INK};letter-spacing:-.01em">'
                f'<div style="{A("up",.8,t+.7)}">Con scienza</div><div style="{A("up",.8,t+1.3)};color:{PLUM}">e coscienza.</div></div>')
    f.scene(0, 3.6, WALL, s1)
    def s2(t):
        rows = [("ruler", "Misuro.", "peso, pliche, circonferenze"), ("chat", "Ascolto.", "abitudini, orari, esami"), ("plan", "Costruisco.", "un piano scritto per te")]
        out = f'<div class="abs" style="left:48px;top:44px;display:flex;gap:14px;align-items:center;{A("fade",.6,t)}">{mark(40, IVORY, PLUM, HONEY)}<span class="serif" style="font-size:34px;color:{IVORY}">Naomi Acciaro</span></div>'
        out += f'<div class="abs" style="left:48px;top:200px;width:3px;height:560px;background:{HONEY};transform-origin:top;{A("growy",2.6,t+.2,ease="ease-in-out")}"></div>'
        for i, (ic, w, sub) in enumerate(rows):
            y = 190 + i * 210; d = t + .5 + i * .85
            out += tile(96, y + 20, 108, ic, d, dark=True)
            out += (f'<div class="abs" style="left:236px;top:{y}px;{A("left",.8,d+.1)}"><div class="serif" style="font-size:92px;line-height:1;color:{IVORY};letter-spacing:-.01em">{w}</div>'
                    f'<div style="margin-top:6px;font-size:30px;color:#e8dde4">{sub}</div></div>')
        return out
    f.scene(3.4, 7.1, PLUM, s2)
    def s3(t):
        return (brandline(t + .1) +
                print_frame(130, 130, 460, 575, "img/naomi-studio.webp", t + .1, 3.4, "60% 30%", 12, 30, 30) +
                f'<div class="abs serif" style="left:0;right:0;top:736px;text-align:center;font-size:84px;line-height:.98;color:{INK};{A("up",.8,t+.6)}">Un piano su misura.</div>'
                f'<div class="abs" style="left:0;right:0;top:834px;text-align:center;font-size:27px;font-weight:700;color:{PLUM};{A("fade",.8,t+1.3)}">Biologa nutrizionista · Roma | Online</div>')
    f.scene(6.9, 10.0, WALL, s3)
    return f

# ------------------------------------------------------------------ B: La prima visita in 4 passi (12 s)
def film_b():
    f = Film(12.0)
    steps = [
        ("calendar", "Prenoti", "Scegli giorno e orario su MioDottore, a Roma o online."),
        ("chat", "Ci conosciamo", "Parliamo di abitudini, obiettivi ed esami. Se serve, misuro con il protocollo ISAK."),
        ("plan", "Ricevi il piano", "Un piano alimentare scritto per te, con indicazioni chiare."),
        ("ecg", "Ci rivediamo", "Controlli periodici per vedere come stai e aggiustare il percorso."),
    ]
    for i, (ic, title, text) in enumerate(steps):
        def body(t, i=i, ic=ic, title=title, text=text):
            bg_light = i % 2 == 0
            out = brandline(t + .1, text=INK)
            # barra di avanzamento: passi fatti pieni, passo corrente che si riempie, prossimi vuoti
            for k in range(4):
                if k < i: fill = f'<div style="width:100%;height:100%;background:{PLUM}"></div>'
                elif k == i: fill = f'<div style="width:100%;height:100%;background:{PLUM};transform-origin:left;{A("grow",3.0,t,ease="linear")}"></div>'
                else: fill = ""
                out += f'<div class="abs" style="left:{48+k*158}px;top:130px;width:146px;height:6px;background:rgba(58,48,51,.16)">{fill}</div>'
            out += f'<div class="abs serif" style="right:38px;top:150px;font-size:300px;line-height:1;color:transparent;-webkit-text-stroke:2px {HONEY};{A("fade",.9,t+.1)}">{i+1}</div>'
            out += tile(56, 330, 150, ic, t + .3)
            out += f'<div class="abs serif" style="left:56px;top:520px;font-size:112px;line-height:.95;color:{INK};letter-spacing:-.012em;{A("up",.8,t+.5)}">{title}</div>'
            out += f'<div class="abs" style="left:56px;top:660px;width:600px;font-size:36px;line-height:1.35;color:{INK2};{A("up",.8,t+.8)}">{text}</div>'
            if i == 3:
                out += (f'<div class="abs" style="left:56px;top:800px;padding:26px 40px;background:linear-gradient(180deg,{PLUM3},{PLUM});color:{IVORY};font-weight:700;font-size:30px;'
                        f'box-shadow:0 18px 30px -14px rgba(67,32,61,.6);{A("up",.7,t+1.5)}">Prenota su MioDottore</div>')
            return out
        f.scene(i * 3.0, (i + 1) * 3.0, WALL if i % 2 == 0 else PAPER, body, fade=0.3)
    return f

# ------------------------------------------------------------------ C: A tavola (10 s)
def film_c():
    f = Film(10.0)
    def intro(t):
        return (f'<div class="abs" style="left:0;top:0;width:{W}px;height:{H}px;background:radial-gradient(120% 90% at 80% 0%,{PLUM3},{PLUM2})"></div>'
                f'<div class="abs" style="left:48px;top:44px;display:flex;gap:14px;align-items:center;{A("fade",.6,t)}">{mark(40, IVORY, PLUM, HONEY)}<span class="serif" style="font-size:34px;color:{IVORY}">Naomi Acciaro</span></div>'
                f'<div class="abs serif" style="left:56px;top:330px;font-size:190px;line-height:.9;color:{IVORY};letter-spacing:-.02em;{A("up",.9,t+.2)}">A tavola</div>'
                f'<div class="abs serif" style="left:60px;top:540px;font-size:60px;color:{HONEY};{A("up",.9,t+.7)}">piatti d\'esempio</div>')
    f.scene(0, 1.5, PLUM2, intro, fade=0.3)
    dishes = [("colazione", "Toast al prosciutto e caffellatte", "50% 45%"), ("spaghetti", "Spaghetti con gamberi e pomodoro", "50% 40%"),
              ("salmone", "Toast con trota salmonata e avocado", "50% 50%"), ("mezze", "Mezze maniche con crema di zucca", "50% 40%"),
              ("gnocchetti", "Gnocchetti con zucchine e gamberetti", "50% 50%"), ("insalata", "Insalata con prosciutto e formaggio fresco", "50% 50%")]
    for i, (fn, cap, pos) in enumerate(dishes):
        s = 1.3 + i * 1.25
        def body(t, fn=fn, cap=cap, pos=pos):
            return (f'<div class="abs" style="inset:0;overflow:hidden"><div style="width:100%;height:100%;background:url({fu(f"img/piatti/{fn}.webp")}) {pos}/cover;{A("zoom",1.8,t,ease="linear")}"></div></div>'
                    f'<div class="abs" style="left:0;right:0;bottom:0;height:300px;background:linear-gradient(to top,rgba(67,32,61,.92),rgba(67,32,61,0))"></div>'
                    f'<div class="abs" style="left:48px;top:44px;display:flex;gap:14px;align-items:center">{mark(40, IVORY, PLUM, HONEY)}<span class="serif" style="font-size:34px;color:{IVORY};text-shadow:0 2px 12px rgba(0,0,0,.45)">Naomi Acciaro</span></div>'
                    f'<div class="abs serif" style="left:48px;right:48px;bottom:56px;font-size:64px;line-height:1.02;color:{IVORY};{A("up",.6,t+.15)}">{cap}</div>'
                    f'<div class="abs" style="left:48px;bottom:36px;width:96px;height:3px;background:{HONEY};transform-origin:left;{A("grow",.6,t+.3)}"></div>')
        f.scene(s, s + 1.25, PLUM2, body, fade=0.3)
    def outro(t):
        return (f'<div class="abs" style="inset:0;background:radial-gradient(120% 90% at 20% 100%,{PLUM3},{PLUM2})"></div>'
                f'<div class="abs serif" style="left:56px;top:250px;width:610px;font-size:112px;line-height:.98;color:{IVORY};letter-spacing:-.012em;{A("up",.8,t+.1)}">Esempi,<br>non un piano alimentare.</div>'
                f'<div class="abs serif" style="left:60px;top:600px;font-size:64px;color:{HONEY};{A("up",.8,t+.6)}">Il tuo lo costruiamo su di te.</div>'
                f'<div class="abs" style="left:56px;top:790px;padding:24px 38px;background:{IVORY};color:{PLUM2};font-weight:700;font-size:30px;box-shadow:0 18px 30px -14px rgba(0,0,0,.5);{A("up",.7,t+1.0)}">Prenota la prima visita</div>')
    f.scene(8.7, 10.0, PLUM2, outro, fade=0.35)
    return f

FILMS = {
    "a": (film_a, "con-scienza-e-coscienza", 1.9),
    "b": (film_b, "la-prima-visita", 5.3),
    "c": (film_c, "a-tavola", 3.2),
}

def render(key):
    make, name, poster_t = FILMS[key]
    film = make()
    tmp = Path(tempfile.mkdtemp(prefix=f"video-{key}-"))
    page_file = tmp / "scene.html"; page_file.write_text(film.html())
    frames = tmp / "f"; frames.mkdir()
    n = int(film.dur * FPS)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.goto(page_file.as_uri(), wait_until="load")
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(600)
        pg.evaluate("document.getAnimations().forEach(a => a.pause())")
        poster_frame = round(poster_t * FPS)
        for i in range(n):
            t = i / FPS * 1000
            pg.evaluate("t => document.getAnimations().forEach(a => { a.currentTime = t; })", t)
            pg.screenshot(path=str(frames / f"{i:04d}.jpg"), type="jpeg", quality=92)
        b.close()
    out = PUB / "video" / f"{name}.mp4"; out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "%04d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "26", "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart", "-an", str(out)], check=True)
    poster = PUB / "img" / "video" / f"{name}.webp"; poster.parent.mkdir(parents=True, exist_ok=True)
    Image.open(frames / f"{poster_frame:04d}.jpg").convert("RGB").save(poster, "WEBP", quality=82, method=6)
    print(f"{name}: {out.stat().st_size/1024:.0f} KB mp4, poster {poster.stat().st_size/1024:.0f} KB, {n} fotogrammi")
    shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    keys = sys.argv[1:] or list(FILMS)
    for k in keys: render(k)
