#!/usr/bin/env python3
"""Genera brand/linee-guida.html: scheda di identità (logo, colori, caratteri, icone, grafica, voce). Uso: python3 scripts/build-brand-guide.py"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sprite = (ROOT / "public/img/icons.svg").read_text()
ids = re.findall(r'<symbol id="([a-z-]+)"', sprite)
labels = dict(ruler="righello", plate="piatto", bowl="ciotola", dumbbell="manubrio", plan="piano", calendar="calendario", video="video", pin="luogo", ecg="controllo",
              chat="ascolto", flask="evidenze", doc="esami", check="spunta", play="riproduci", person="persona", team="squadra", shield="garanzia", bolt="energia",
              clock="tempo", target="obiettivo", phone="telefono", arrow="freccia", star="valutazione")
icon_cells = "".join(f'<li><svg class="ico"><use href="#{i}"/></svg><span>{labels.get(i, i)}</span></li>' for i in ids)

def lum(h):
    h = h.lstrip("#"); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + .05) / (lb + .05)

colors = [  # nome, hex, ruolo, testo su (colore del testo da usare sopra)
    ("Prugna", "#5b2a52", "Colore del marchio: bottoni, titoli di accento, riquadri di chiusura. Dalla camicetta della foto.", "#f6f4f1"),
    ("Prugna scuro", "#43203d", "Piede del sito, fondo dei video, ombre colorate.", "#f6f4f1"),
    ("Camice", "#f6f4f1", "Bianco caldo: testo su prugna, card, V del marchio. Mai bianco puro.", "#3a3033"),
    ("Parete", "#e9e5de", "Fondo principale del sito.", "#3a3033"),
    ("Sabbia", "#ddd7cc", "Fondo delle sezioni con foto (A tavola).", "#3a3033"),
    ("Miele", "#c2a373", "Filo sulla scollatura, numeri in contorno, dettagli. Dai capelli. Non per testo piccolo su chiaro.", "#3a3033"),
    ("Inchiostro", "#3a3033", "Testo. Un bruno-prugna, mai nero pieno.", "#f6f4f1"),
]
sw = "".join(f'<li style="--c:{h};--t:{t}"><b>{n}</b><code>{h}</code><span>{d}</span></li>' for n, h, d, t in colors)
pairs = [("Inchiostro su Parete", "#3a3033", "#e9e5de"), ("Testo secondario #61575a su Parete", "#61575a", "#e9e5de"), ("Testo secondario su Sabbia", "#61575a", "#ddd7cc"),
         ("Prugna su Parete", "#5b2a52", "#e9e5de"), ("Camice su Prugna", "#f6f4f1", "#5b2a52"), ("Camice su Prugna scuro", "#f6f4f1", "#43203d"),
         ("Miele su Prugna scuro", "#c2a373", "#43203d"), ("Miele scuro #86693f su Camice (solo tratti e testo grande)", "#86693f", "#f8f6f2")]
rows = "".join(f'<tr><th scope="row">{n}</th><td>{cr(a, b):.1f}:1</td><td>{"AAA" if cr(a, b) >= 7 else "AA" if cr(a, b) >= 4.5 else "solo testo grande e grafica"}</td></tr>' for n, a, b in pairs)

html = f"""<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Linee guida del marchio · Dott.ssa Naomi Acciaro</title><meta name="robots" content="noindex">
<style>
@font-face{{font-family:'Instrument Serif';src:url('../public/fonts/instrumentserif-regular.woff') format('woff')}}
@font-face{{font-family:'Instrument Sans';src:url('../public/fonts/instrumentsans-regular.woff') format('woff')}}
@font-face{{font-family:'Instrument Sans';font-weight:700;src:url('../public/fonts/instrumentsans-bold.woff') format('woff')}}
:root{{--plum:#5b2a52;--plum2:#43203d;--ivory:#f6f4f1;--wall:#e9e5de;--paper:#f1eee8;--card:#f8f6f2;--sand:#ddd7cc;--honey:#c2a373;--ink:#3a3033;--muted:#61575a;--line:rgb(58 48 51/16%);
--sh:0 1px 2px rgb(58 48 51/8%),0 14px 26px -12px rgb(58 48 51/24%),0 34px 60px -30px rgb(58 48 51/28%)}}
*{{box-sizing:border-box;border-radius:0}}body{{margin:0;background:var(--wall);color:var(--ink);font:400 17px/1.65 'Instrument Sans',system-ui,sans-serif}}
.wrap{{width:min(100% - 2.5rem,1100px);margin-inline:auto}}h1,h2,h3{{font:400 1em/1.05 'Instrument Serif',serif;margin:0}}p{{margin:0}}ul{{list-style:none;margin:0;padding:0}}
section{{padding-block:clamp(3rem,7vw,5.5rem)}}section:nth-of-type(even){{background:var(--paper)}}
h2{{font-size:clamp(2.2rem,4.6vw,3.6rem);margin-bottom:.8rem}}h3{{font-size:1.7rem;margin:1.8rem 0 .6rem}}.lead{{max-width:40rem;color:var(--muted);font-size:1.1rem;margin-bottom:2rem}}
.cover{{background:var(--plum);color:var(--ivory);padding-block:clamp(3rem,8vw,6rem)}}.cover img{{height:64px;margin-bottom:3rem}}.cover h1{{font-size:clamp(3rem,8vw,6.4rem);letter-spacing:-.01em}}.cover p{{margin-top:1rem;color:#e8dde4;max-width:36rem}}
.grid{{display:grid;gap:1.4rem}}.g2{{grid-template-columns:repeat(2,minmax(0,1fr))}}.g3{{grid-template-columns:repeat(3,minmax(0,1fr))}}.g4{{grid-template-columns:repeat(4,minmax(0,1fr))}}
.box{{background:var(--card);box-shadow:inset 0 1px 0 #fff,0 0 0 1px var(--line),var(--sh);padding:2rem;display:grid;place-items:center;min-height:170px;gap:.8rem;text-align:center}}
.box.dark{{background:var(--plum2)}}.box.mono{{background:#fff}}.box img{{max-width:100%}}.box small,.cap{{font-size:.88rem;color:var(--muted)}}.box.dark small{{color:#e8dde4}}
.sw{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.2rem}}.sw li{{background:var(--c);color:var(--t);padding:1.4rem;min-height:210px;display:grid;align-content:end;gap:.3rem;box-shadow:0 0 0 1px var(--line),var(--sh)}}.sw b{{font:400 1.9rem/1 'Instrument Serif'}}.sw code{{font-size:.95rem}}.sw span{{font-size:.9rem;line-height:1.45}}
table{{width:100%;border-collapse:collapse;background:var(--card);box-shadow:var(--sh)}}th,td{{padding:.8rem 1rem;text-align:left;border-top:1px solid var(--line);font-size:.95rem}}thead th{{background:var(--plum);color:var(--ivory);border:0}}
.type{{display:grid;gap:1.2rem}}.type .big{{font:400 clamp(3rem,7vw,5.6rem)/.95 'Instrument Serif';letter-spacing:-.012em}}.type .body{{max-width:36rem}}
.icons{{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:1rem}}.icons li{{display:grid;justify-items:center;gap:.5rem;padding:1rem .5rem;background:var(--card);box-shadow:0 0 0 1px var(--line);font-size:.85rem;color:var(--muted)}}
.ico{{width:2rem;height:2rem;fill:none;stroke:var(--plum);stroke-width:1.5;stroke-linejoin:miter;stroke-linecap:square}}
.demo{{height:200px;position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--line)}}.v{{background:var(--plum)}}.v::before{{content:"";position:absolute;inset:12%;background:var(--ivory);clip-path:polygon(0 0,25% 0,50% 50%,75% 0,100% 0,50% 100%)}}
.stripes{{background:var(--wall)}}.stripes::before{{content:"";position:absolute;inset:-10%;background:repeating-linear-gradient(112deg,rgb(255 253 249/0%) 0 40px,rgb(255 253 249/85%) 40px 90px,rgb(255 253 249/0%) 90px 160px),repeating-linear-gradient(112deg,rgb(58 48 51/9%) 0 20px,transparent 20px 160px);filter:blur(10px)}}
.mat{{background:var(--sand)}}.mat i{{position:absolute;left:22%;top:14%;width:44%;height:70%;background:var(--plum);transform:translate(22px,18px);box-shadow:0 24px 36px -16px rgb(67 32 61/60%)}}.mat b{{position:absolute;left:22%;top:14%;width:44%;height:70%;background:var(--card);box-shadow:0 0 0 1px var(--line);padding:9px}}.mat b::after{{content:"";display:block;width:100%;height:100%;background:linear-gradient(160deg,#d8cfc2,#a59787)}}
.sq{{background:var(--card);display:grid;place-items:center}}.sq i{{display:block;width:56%;height:56%;background:var(--plum);box-shadow:inset 0 1px 0 rgb(255 255 255/22%),0 20px 30px -14px rgb(67 32 61/60%)}}
.dd{{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}}.dd div{{padding:1.4rem;background:var(--card);box-shadow:0 0 0 1px var(--line)}}.dd h3{{margin:0 0 .6rem}}.dd .ok{{border-top:3px solid var(--plum)}}.dd .no{{border-top:3px solid var(--honey)}}.dd li{{padding-block:.3rem}}
@media(max-width:800px){{.g2,.g3,.g4,.dd{{grid-template-columns:minmax(0,1fr)}}}}
</style></head><body>
{sprite}
<header class="cover"><div class="wrap"><img src="logo/naomi-acciaro-logo-su-scuro.svg" alt="Naomi Acciaro, biologa nutrizionista"><h1>Linee guida del marchio</h1><p>Come usare logo, colori, caratteri, icone e grafica del sito di Naomi Acciaro, perché tutto resti coerente: sul sito, sui social, sulla carta. Slogan: <b>Con scienza e coscienza.</b></p></div></header>

<section><div class="wrap"><h2>L'idea: il colletto a V.</h2><p class="lead">Il marchio nasce dall'immagine di Naomi in camice: la scollatura a V del camice bianco sopra la camicetta prugna. Un quadrato prugna, una V avorio, un filo miele sulla scollatura. Spigoli vivi, forma esatta: come una misura.</p>
<div class="grid g4"><div class="box"><img src="logo/naomi-acciaro-marchio.svg" alt="Marchio" width="120"><small>Marchio</small></div><div class="box dark"><img src="logo/naomi-acciaro-marchio-negativo.svg" alt="Marchio in negativo" width="120"><small>Negativo</small></div><div class="box"><img src="logo/naomi-acciaro-avatar-1080.png" alt="Avatar" width="120"><small>Avatar social</small></div><div class="box"><img src="../public/img/favicon.svg" alt="Favicon" width="64"><small>Favicon (senza filo, per leggibilità)</small></div></div></div></section>

<section><div class="wrap"><h2>Logo.</h2><p class="lead">Marchio e scritta (Instrument Serif, con le spaziature corrette, convertita in tracciati). Usare sempre i file in <code>brand/logo/</code>, mai riscrivere il nome a mano.</p>
<div class="grid g2"><div class="box"><img src="logo/naomi-acciaro-logo.svg" alt="Logo orizzontale" width="380"><small>Orizzontale: uso principale (sito, firma email)</small></div><div class="box"><img src="logo/naomi-acciaro-logo-verticale.svg" alt="Logo verticale" width="200"><small>Verticale: locandine, biglietti</small></div>
<div class="box dark"><img src="logo/naomi-acciaro-logo-su-scuro.svg" alt="Logo su scuro" width="380"><small>Su prugna scuro o foto scure</small></div><div class="box mono"><img src="logo/naomi-acciaro-logo-monocromo.svg" alt="Logo monocromo" width="380"><small>Monocromo: timbri, stampa a un colore</small></div></div>
<h3>Regole</h3><ul class="grid g3"><li class="box"><span><b>Spazio libero</b><br>Intorno al logo almeno metà altezza del marchio, su ogni lato.</span></li><li class="box"><span><b>Dimensione minima</b><br>Logo orizzontale 150 px di larghezza (40 mm in stampa); solo marchio 16 px.</span></li><li class="box"><span><b>Mai</b><br>Ruotarlo, deformarlo, aggiungere ombre, angoli arrotondati o cambiare i colori.</span></li></ul></div></section>

<section><div class="wrap"><h2>Colori.</h2><p class="lead">Una palette ricavata dalla foto: prugna dalla camicetta, neutri caldi dal camice e dalla parete, miele dai capelli. Niente nero pieno e niente bianco puro.</p><ul class="sw">{sw}</ul>
<h3>Contrasti (WCAG)</h3><table><thead><tr><th>Coppia</th><th>Rapporto</th><th>Livello</th></tr></thead><tbody>{rows}</tbody></table></div></section>

<section><div class="wrap"><h2>Caratteri.</h2><p class="lead">Due famiglie con licenza OFL, ospitate sul sito (nessun servizio esterno). Il serif dà autorevolezza e calore; il sans dà chiarezza.</p>
<div class="type"><div class="big">Instrument Serif<br><small style="font-size:.28em;font-family:'Instrument Sans';letter-spacing:0">Titoli, numeri grandi, citazioni · una sola grassetto: regular</small></div><p class="body"><b>Instrument Sans</b> (regular e bold) per testi, bottoni e microcopy. Corpo 17 px, interlinea 1,65, righe sotto i 70 caratteri.</p>
<table><thead><tr><th>Uso</th><th>Carattere</th><th>Misura</th></tr></thead><tbody><tr><th scope="row">Titolo di pagina (H1)</th><td>Instrument Serif</td><td>40–110 px, interlinea 0,94</td></tr><tr><th scope="row">Titolo di sezione (H2)</th><td>Instrument Serif</td><td>38–69 px, interlinea 1,02</td></tr><tr><th scope="row">Scheda (H3)</th><td>Instrument Serif</td><td>22–28 px</td></tr><tr><th scope="row">Testo</th><td>Instrument Sans 400</td><td>17 px / 1,65</td></tr><tr><th scope="row">Bottoni, etichette</th><td>Instrument Sans 700</td><td>15–17 px</td></tr></tbody></table></div></div></section>

<section><div class="wrap"><h2>Icone.</h2><p class="lead">Set proprio (<code>public/img/icons.svg</code>): griglia 24, tratto 1,5, angoli vivi e terminali squadrati, colore prugna dentro una tessera con rilievo. Una sola famiglia, mai icone prese da altri set.</p><ul class="icons">{icon_cells}</ul></div></section>

<section><div class="wrap"><h2>Grafica.</h2><p class="lead">Quattro segni che si riconoscono: spigoli vivi, la V del colletto, la luce della finestra, la stampa incorniciata. La profondità la fanno solo le ombre.</p>
<div class="grid g4"><div><div class="demo sq"><i></i></div><p class="cap">Angoli vivi ovunque (<code>border-radius: 0</code>). Ombre a più strati, calde.</p></div><div><div class="demo v"></div><p class="cap">La V del colletto: motivo per chiusure, riquadri e dettagli.</p></div><div><div class="demo stripes"></div><p class="cap">Luce a strisce da tapparella, sfocata: apertura di ogni pagina.</p></div><div><div class="demo mat"><i></i><b></b></div><p class="cap">Foto come stampa: passepartout avorio, lastra prugna dietro.</p></div></div></div></section>

<section><div class="wrap"><h2>Voce e testi.</h2><p class="lead">Una professionista che parla in prima persona e dà del tu. Frasi corte, concrete, a vantaggio di chi legge.</p>
<div class="dd"><div class="ok"><h3>Sì</h3><ul><li>Beneficio prima della tecnica: «Capisci cosa mangi e perché».</li><li>CTA con un verbo e una microfrase che toglie dubbi: «Prenota la prima visita · Roma o online».</li><li>Titoli che promettono un metodo, non un risultato.</li><li>Dati veri e verificabili (voto aggregato con link alla fonte).</li></ul></div><div class="no"><h3>No</h3><ul><li>Promesse di risultato («perdi 5 kg in un mese»), prima/dopo, diete miracolose.</li><li>Recensioni inventate o senza consenso scritto.</li><li>Tecnicismi senza spiegazione.</li><li>Maiuscolo urlato, punti esclamativi, «scopri il segreto».</li></ul></div></div></div></section>
</body></html>"""
(ROOT / "brand/linee-guida.html").write_text(html)
print("brand/linee-guida.html", len(html) // 1024, "KB")
