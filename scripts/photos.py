#!/usr/bin/env python3
"""Prepara le foto del 6 novembre 2026 (recensioni, scrivania, trittico «Chi è Naomi»): ritagli, ritocco, peso. Scrive in public/img.

Uso:  python3 scripts/photos.py CARTELLA_DELLE_FOTO [nome ...]
      (senza nomi rifà tutto; con nomi, per esempio  r3 scrivania-1  rifà solo quelli)

Gli originali non stanno nel repository: restano in public/img solo i ritagli già pronti, in WebP. I nomi dei file consegnati sono
nelle tabelle qui sotto. Lo script aggiorna anche larghezza e altezza di ogni recensione in src/reviews.json (servono al sito
per riservare lo spazio prima del caricamento).

Ritocco: scripts/enhance.py. Per le due foto con scritte sovrapposte (le didascalie di Instagram) la scritta viene tolta e lo sfondo
ricostruito; i riquadri e le soglie sono nella tabella TESTO."""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
from enhance import enhance, enhance_screen, remove_text, save_webp  # noqa: E402

root = Path(__file__).resolve().parent.parent
img = root / 'public' / 'img'

# ---- recensioni: screenshot delle storie, ritagliati intorno alle schede (senza barra di stato e bande nere)
# nome: (file consegnato, (sinistra, alto, destra, basso))
RECENSIONI = {
    'r1': ('591c46c3-image.jpg', (100, 800, 1220, 2230)),    # 28 ott 2026, cupola
    'r2': ('0f1c4cfb-image.jpg', (150, 650, 1170, 1930)),    # 16 set 2026, colonnato
    'r3': ('247d494d-image.jpg', (30, 130, 1290, 2250)),     # apr 2026, tre recensioni sul Teide
    'r4': ('eb0fda97-image.jpg', (140, 230, 1230, 2100)),    # 18 mar 2026 + messaggio WhatsApp
    'r5': ('1b2c36fa-image.jpg', (300, 620, 1320, 1790)),    # 25 feb 2026, Cecilia C.
    'r6': ('2d1cf742-image.png', (90, 400, 1230, 1820)),     # 6 mag 2025 (tolti orologio e bande nere)
    'r7': ('1b6ad903-image.png', (100, 570, 1220, 2150)),    # 19 mar 2025 (idem)
}
LARGHEZZA_RECENSIONI = 1100

# ---- foto con scritta sovrapposta: riquadri (x0, y0, x1, y1, V minimo, S massima) dove cercare il bianco del testo
TESTO = {
    'f7124e84-image.jpg': [(250, 760, 1075, 890, 215, 50), (250, 898, 1075, 972, 215, 50)],   # «se ti alleni per la prova costume…»
    'a9aa5d0d-image.jpg': [(170, 356, 1165, 490, 200, 60)],                                   # «ti mostro come è cambiato il mio corpo…»
}

# ---- foto: nome in uscita: (file consegnato, riquadro o None, larghezza in uscita)
FOTO = {
    'scrivania-1': ('328ed6a0-image.jpg', None, 900),                      # alla scrivania, scrive al computer
    'scrivania-2': ('dea2df63-image.jpg', None, 900),                      # alla scrivania, guarda lo schermo
    'naomi-stacco': ('f7124e84-image.jpg', (120, 659, 1220, 2034), 800),    # allenamento, senza la scritta
    'naomi-casa': ('a9aa5d0d-image.jpg', (320, 330, 1320, 1580), 800),      # in salotto, senza la scritta
    'naomi-tesi': ('3e85df2c-image.jpg', (100, 505, 900, 955), 900),        # discussione della tesi, 16:9: solo lei, senza la commissione
}


def carica(src_dir, nome):
    """Immagine BGR di partenza; se ha una scritta da togliere, la toglie."""
    a = cv2.imread(str(src_dir / nome))
    if a is None:
        raise SystemExit(f'non trovo {src_dir / nome}')
    if nome in TESTO:
        a = remove_text(a, TESTO[nome])
        if nome == 'a9aa5d0d-image.jpg':
            # la scritta tagliava anche lo stipite chiaro della finestra (x 1095-1135): lo si ricopia dal tratto pulito più in basso
            strip = a[500:630, 1095:1135].copy()
            h = 130
            src = strip
            mask = np.zeros((h, 40), np.float32)
            mask[:, :] = 1.0
            mask[:12] = np.linspace(0, 1, 12)[:, None]   # sfumo in alto e in basso
            mask[-12:] = np.linspace(1, 0, 12)[:, None]
            dst = a[366:366 + h, 1095:1135].astype(np.float32)
            a[366:366 + h, 1095:1135] = (dst * (1 - mask[..., None]) + src.astype(np.float32) * mask[..., None]).astype(np.uint8)
    return a


def pil(a):
    return Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))


def main(src_dir, only=()):
    reviews_path = root / 'src' / 'reviews.json'
    reviews = json.loads(reviews_path.read_text())
    (img / 'recensioni').mkdir(parents=True, exist_ok=True)

    for name, (f, box) in RECENSIONI.items():
        if only and name not in only:
            continue
        im = ImageOps.exif_transpose(Image.open(src_dir / f)).convert('RGB').crop(box)
        out = enhance_screen(im, width=min(LARGHEZZA_RECENSIONI, im.width))
        path = img / 'recensioni' / f'{name}.webp'
        save_webp(out, path, quality=80)
        for r in reviews:
            if r['id'] == name:
                r['w'], r['h'] = out.width, out.height
        print(f'{name}: {out.width}x{out.height}, {path.stat().st_size // 1024} KB')
    reviews_path.write_text(json.dumps(reviews, ensure_ascii=False, indent=2) + '\n')

    for name, (f, box, w) in FOTO.items():
        if only and name not in only:
            continue
        a = carica(src_dir, f)
        im = pil(a)
        if box:
            im = im.crop(box)
        out = enhance(im, width=w)
        path = img / f'{name}.webp'
        save_webp(out, path, quality=80)
        print(f'{name}: {out.width}x{out.height}, {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]), tuple(sys.argv[2:]))
