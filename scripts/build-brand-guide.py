#!/usr/bin/env python3
"""Genera brand/linee-guida.html: scheda di identità (colori, carattere, icone, grafica, voce). Uso: python3 scripts/build-brand-guide.py"""
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

main = [  # nome, hex, ruolo, colore del testo da usare sopra
    ("Lime", "#c6f135", "Accento: bottoni, evidenziazioni, filetti, dettagli sui riquadri scuri. Mai come testo su fondo chiaro.", "#1d2b22"),
    ("Base", "#f5f3ec", "Fondo pagina e testo sui riquadri scuri.", "#1d2b22"),
    ("Verde profondo", "#1d2b22", "Testo, piede del sito, fine delle sfumature scure. Un verde quasi nero, mai nero puro.", "#f5f3ec"),
    ("Salvia", "#8fa68e", "Tratti sottili, stelle e linee di grafica. Non per testo su chiaro.", "#1d2b22"),
]
derived = [
    ("Verde del marchio", "#2f4b3a", "Icone, titoli di accento e riquadri su fondo chiaro.", "#f5f3ec"),
    ("Verde chiaro", "#3f6049", "Riflesso in alto sui riquadri scuri.", "#f5f3ec"),
    ("Card", "#fbfaf6", "Superfici in rilievo e passe-partout delle foto.", "#1d2b22"),
    ("Fascia alternata", "#e9eddd", "Sezioni a fondo alternato.", "#1d2b22"),
    ("Fascia «a tavola»", "#dce6d6", "Sezione con i piatti d'esempio.", "#1d2b22"),
    ("Salvia chiara", "#b9c8b5", "Filetti e grafica, mai testo.", "#1d2b22"),
    ("Salvia scura", "#5b7561", "Tratti e sottolineature su fondo chiaro.", "#f5f3ec"),
    ("Testo secondario", "#4b5c50", "Paragrafi secondari, didascalie.", "#f5f3ec"),
    ("Lime chiaro", "#d9f875", "Riflesso in alto sui bottoni.", "#1d2b22"),
    ("Lime scuro", "#aedb18", "Sottolineature dei link su fondo chiaro.", "#1d2b22"),
]
mk = lambda L: "".join(f'<li style="--c:{h};--t:{t}"><b>{n}</b><code>{h}</code><span>{d}</span></li>' for n, h, d, t in L)
pairs = [("Verde profondo su Base", "#1d2b22", "#f5f3ec"), ("Testo secondario su Base", "#4b5c50", "#f5f3ec"), ("Testo secondario su fascia alternata", "#4b5c50", "#e9eddd"),
         ("Testo secondario su fascia «a tavola»", "#4b5c50", "#dce6d6"), ("Verde del marchio su Base", "#2f4b3a", "#f5f3ec"), ("Verde profondo su Lime (bottoni)", "#1d2b22", "#c6f135"),
         ("Lime su Verde profondo (piede, accenti)", "#c6f135", "#1d2b22"), ("Lime su Verde del marchio", "#c6f135", "#2f4b3a"), ("Base su Verde del marchio", "#f5f3ec", "#2f4b3a"),
         ("Testo chiaro secondario su Verde del marchio", "#cad7c6", "#2f4b3a"), ("Salvia scura su Base (solo tratti)", "#5b7561", "#f5f3ec"),
         ("Salvia su Base", "#8fa68e", "#f5f3ec"), ("Lime su Base", "#c6f135", "#f5f3ec")]
rows = "".join(f'<tr><th scope="row">{n}</th><td>{cr(a, b):.1f}:1</td><td>{"AAA" if cr(a, b) >= 7 else "AA" if cr(a, b) >= 4.5 else "solo grafica e testo molto grande"}</td></tr>' for n, a, b in pairs)

html = f"""<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Linee guida · Dott.ssa Naomi Acciaro</title><meta name="robots" content="noindex">
<style>
@font-face{{font-family:'Nunito';font-weight:400 900;src:url('../public/fonts/nunito-var.woff') format('woff')}}
:root{{--tab:#2f4b3a;--tab2:#1d2b22;--lime:#c6f135;--bg:#f5f3ec;--card:#fbfaf6;--sabbia:#e9eddd;--salvia:#8fa68e;--tortora:#b9c8b5;--nero:#1d2b22;--muted:#4b5c50;--line:rgb(29 43 34/16%);
--sh:0 1px 2px rgb(29 43 34/8%),0 14px 26px -12px rgb(29 43 34/24%),0 34px 60px -30px rgb(29 43 34/28%)}}
*{{box-sizing:border-box;border-radius:0}}body{{margin:0;background:var(--bg);color:var(--nero);font:400 17px/1.65 'Nunito',ui-rounded,system-ui,sans-serif}}
.wrap{{width:min(100% - 2.5rem,1100px);margin-inline:auto}}h1,h2,h3{{font-weight:800;line-height:1.08;margin:0}}p{{margin:0}}ul{{list-style:none;margin:0;padding:0}}
section{{padding-block:clamp(3rem,7vw,5.5rem)}}section:nth-of-type(even){{background:var(--sabbia)}}
h2{{font-size:clamp(1.9rem,4vw,3rem);margin-bottom:.8rem}}h3{{font-size:1.35rem;margin:1.8rem 0 .6rem}}.lead{{max-width:40rem;color:var(--muted);font-size:1.1rem;margin-bottom:2rem}}
.cover{{background:var(--tab);color:var(--card);padding-block:clamp(3rem,8vw,6rem)}}.cover h1{{font-size:clamp(2.6rem,7vw,5.2rem);letter-spacing:-.015em}}.cover p{{margin-top:1rem;color:#cad7c6;max-width:36rem}}.cover img{{width:132px;height:132px;display:block;margin-bottom:1.6rem;filter:drop-shadow(0 8px 16px rgb(0 0 0/40%))}}
.grid{{display:grid;gap:1.4rem}}.g2{{grid-template-columns:repeat(2,minmax(0,1fr))}}.g3{{grid-template-columns:repeat(3,minmax(0,1fr))}}.g4{{grid-template-columns:repeat(4,minmax(0,1fr))}}
.box{{background:var(--card);box-shadow:0 0 0 1px var(--line),var(--sh);padding:1.6rem;display:grid;gap:.5rem;align-content:start}}
.sw{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.2rem;margin-bottom:1.4rem}}.sw li{{background:var(--c);color:var(--t);padding:1.3rem;min-height:190px;display:grid;align-content:end;gap:.3rem;box-shadow:0 0 0 1px var(--line),var(--sh)}}.sw b{{font:800 1.5rem/1 'Nunito'}}.sw code{{font-size:.95rem}}.sw span{{font-size:.9rem;line-height:1.45}}
table{{width:100%;border-collapse:collapse;background:var(--card);box-shadow:var(--sh)}}th,td{{padding:.8rem 1rem;text-align:left;border-top:1px solid var(--line);font-size:.95rem}}thead th{{background:var(--tab);color:var(--card);border:0}}
.type{{display:grid;gap:1.2rem}}.type .big{{font:800 clamp(3rem,8vw,6rem)/1 'Nunito';letter-spacing:-.02em}}.type .alpha{{font:400 1.4rem/1.5 'Nunito';color:var(--muted);word-break:break-all}}
.icons{{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:1rem}}.icons li{{display:grid;justify-items:center;gap:.5rem;padding:1rem .5rem;background:var(--card);box-shadow:0 0 0 1px var(--line);font-size:.85rem;color:var(--muted)}}
.ico{{width:2rem;height:2rem;fill:none;stroke:var(--tab);stroke-width:1.5;stroke-linejoin:miter;stroke-linecap:square}}
.demo{{height:180px;position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--line);margin-bottom:.6rem}}.cap{{font-size:.9rem;color:var(--muted)}}
.sq{{background:var(--card);display:grid;place-items:center}}.sq i{{display:block;width:50%;height:50%;background:linear-gradient(180deg,#d9f875,#c6f135 55%,#aedb18);box-shadow:inset 0 1px 0 rgb(255 255 255/45%),0 20px 30px -14px rgb(45 70 8/50%)}}
.mat{{background:#dce6d6}}.mat i{{position:absolute;left:22%;top:14%;width:44%;height:70%;background:var(--lime);transform:translate(20px,16px)}}.mat b{{position:absolute;left:22%;top:14%;width:44%;height:70%;background:var(--card);box-shadow:0 0 0 1px var(--line);padding:9px}}.mat b::after{{content:"";display:block;width:100%;height:100%;background:linear-gradient(160deg,#e9eddd,#8fa68e)}}
.stripes{{background:var(--bg)}}.stripes::before{{content:"";position:absolute;inset:-10%;background:repeating-linear-gradient(112deg,rgb(255 255 249/0%) 0 40px,rgb(255 255 249/85%) 40px 90px,rgb(255 255 249/0%) 90px 160px);filter:blur(10px)}}
.swipe{{background:var(--bg);display:flex;gap:10px;padding:26px 0 0 18px;overflow:hidden}}.swipe i{{flex:0 0 46%;height:86px;background:var(--card);box-shadow:0 0 0 1px var(--line),var(--sh)}}.swipe::after{{content:"";position:absolute;left:18px;right:18px;bottom:26px;height:3px;background:linear-gradient(90deg,var(--tab) 0 30%,var(--tortora) 30%)}}
.dd{{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}}.dd>div{{padding:1.4rem;background:var(--card);box-shadow:0 0 0 1px var(--line)}}.dd h3{{margin:0 0 .6rem}}.dd .ok{{border-top:3px solid var(--lime)}}.dd .no{{border-top:3px solid var(--tortora)}}.dd li{{padding-block:.3rem}}
@media(max-width:800px){{.g2,.g3,.g4,.dd{{grid-template-columns:minmax(0,1fr)}}}}
</style></head><body>
{sprite}
<header class="cover"><div class="wrap"><img src="../public/img/logo-naomi.png" alt="Logo: ritratto tondo di Naomi Acciaro"><h1>Linee guida</h1><p>Colori, carattere, icone, grafica e voce del sito di Dott.ssa Naomi Acciaro, perché tutto resti coerente: sul sito, sui social, sulla carta. Slogan: <b>Con scienza e coscienza.</b></p></div></header>

<section><div class="wrap"><h2>Il logo è lei.</h2><p class="lead">Il marchio è il ritratto tondo di Naomi (<code>public/img/logo-naomi.webp</code> e <code>.png</code>): fondo salvia sfumato, mezzaluna lime che sale da sinistra, punto lime in orbita. Va usato sempre tondo, senza cornici né effetti aggiunti. In testata sta accanto al nome «Dott.ssa Naomi Acciaro» (Nunito ExtraBold) e a «Biologa nutrizionista» (Nunito SemiBold). Sotto i 48 px (favicon) si usa un ritaglio più stretto sul viso. Icone dell'app: la stessa immagine a tutto campo, quadrata.</p>
<div class="grid g4"><div class="box"><img src="../public/img/logo-naomi.png" alt="" width="120" height="120"><p class="cap">Logo tondo, da 48 px in su.</p></div><div class="box"><img src="../public/img/favicon-48.png" alt="" width="48" height="48"><p class="cap">Favicon: ritaglio sul viso, 48 e 32 px.</p></div><div class="box"><img src="../public/img/apple-touch-icon.png" alt="" width="90" height="90"><p class="cap">Icona dell'app: quadrata, a tutto campo.</p></div><div class="box"><b>Spazio libero</b><p class="cap">Intorno al logo lasciare almeno metà della sua larghezza. Mai sopra fotografie.</p></div></div></div></section>

<section><div class="wrap"><h2>Colori.</h2><p class="lead">La palette «Lime energia» è quella scelta dalla cliente: un lime vivo per l'energia, una base calda, un verde profondo al posto del nero e una salvia per i dettagli. Il lime è un accento, mai testo su fondo chiaro. Le tinte derivate servono solo per sfondi e superfici.</p><ul class="sw">{mk(main)}</ul>
<h3>Tinte derivate</h3><ul class="sw">{mk(derived)}</ul>
<h3>Contrasti (WCAG)</h3><table><thead><tr><th>Coppia</th><th>Rapporto</th><th>Livello</th></tr></thead><tbody>{rows}</tbody></table></div></section>

<section><div class="wrap"><h2>Carattere.</h2><p class="lead">Una sola famiglia, <b>Nunito</b>: tonda, semplice e molto leggibile anche su schermi piccoli. Licenza OFL, ospitata sul sito (nessun servizio esterno).</p>
<div class="type"><div class="big">Nunito</div><p class="alpha">Aa Bb Cc Dd Ee Ff Gg Hh Ii Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Zz 0123456789 àèéìòù</p>
<table><thead><tr><th>Uso</th><th>Peso</th><th>Misura</th></tr></thead><tbody><tr><th scope="row">Titolo di pagina (H1)</th><td>ExtraBold 800</td><td>34–70 px, interlinea 1,04–1,08</td></tr><tr><th scope="row">Titolo di sezione (H2)</th><td>ExtraBold 800</td><td>29–46 px, interlinea 1,1</td></tr><tr><th scope="row">Scheda (H3)</th><td>Bold 700</td><td>18–22 px</td></tr><tr><th scope="row">Testo</th><td>Regular 400</td><td>16–17 px / 1,65</td></tr><tr><th scope="row">Bottoni, etichette</th><td>Bold 700</td><td>15–17 px</td></tr></tbody></table></div></div></section>

<section><div class="wrap"><h2>Icone.</h2><p class="lead">Set proprio (<code>public/img/icons.svg</code>): griglia 24, tratto 1,5, angoli vivi e terminali squadrati, colore verde del marchio dentro una tessera con rilievo. Una sola famiglia, mai icone prese da altri set.</p><ul class="icons">{icon_cells}</ul></div></section>

<section><div class="wrap"><h2>Grafica.</h2><p class="lead">Segni che si riconoscono: spigoli vivi, la luce della finestra, la foto come stampa incorniciata, liste da sfogliare e disegni semplici che spiegano un concetto. La profondità la fanno solo le ombre.</p>
<div class="grid g4"><div><div class="demo sq"><i></i></div><p class="cap">Angoli vivi (<code>border-radius: 0</code>) anche con il carattere tondo. Ombre a più strati, verdi.</p></div><div><div class="demo stripes"></div><p class="cap">Luce a strisce da tapparella, sfocata: apertura di ogni pagina.</p></div><div><div class="demo mat"><i></i><b></b></div><p class="cap">Foto come stampa: passe-partout chiaro, lastra lime dietro.</p></div><div><div class="demo swipe"><i></i><i></i><i></i></div><p class="cap">Liste da sfogliare in orizzontale su telefono, con barra di avanzamento.</p></div></div>
<h3>Grafiche esplicative</h3><p class="lead">Cinque disegni in linea (<code>src/gfx/*.svg</code>, macro <code>{{{{gfx:nome|didascalia}}}}</code>): <b>venn</b> (scienza + coscienza), <b>squadra</b> (tu al centro), <b>piatto</b> (esempio semplificato), <b>misure</b> (pliche, circonferenze, diametri ISAK), <b>giornata</b> (alimentazione e allenamento). Usano solo i colori della palette, sono decorativi (<code>aria-hidden</code>) e hanno sempre una didascalia che porta il significato. Sono esempi illustrativi, non indicazioni cliniche.</p></div></section>

<section><div class="wrap"><h2>Voce e testi.</h2><p class="lead">Una professionista che parla in prima persona e dà del tu. Frasi corte, concrete, a vantaggio di chi legge.</p>
<div class="dd"><div class="ok"><h3>Sì</h3><ul><li>Beneficio prima della tecnica: «Capisci cosa mangi e perché».</li><li>CTA con un verbo e una microfrase che toglie dubbi: «Prenota la prima visita · Roma o online».</li><li>Titoli che promettono un metodo, non un risultato.</li><li>Dati veri e verificabili (voto aggregato con link alla fonte).</li></ul></div><div class="no"><h3>No</h3><ul><li>Promesse di risultato («perdi 5 kg in un mese»), prima/dopo, diete miracolose.</li><li>Recensioni inventate o senza consenso scritto.</li><li>Tecnicismi senza spiegazione.</li><li>Maiuscolo urlato, punti esclamativi, «scopri il segreto».</li></ul></div></div></div></section>
</body></html>"""
(ROOT / "brand/linee-guida.html").write_text(html)
print("brand/linee-guida.html", len(html) // 1024, "KB")
