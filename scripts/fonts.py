#!/usr/bin/env python3
"""Prepara i caratteri del sito (solo latino, WOFF) a partire dalla cartella ofl/ del repository google/fonts.

Uso:  python3 scripts/fonts.py /percorso/google/fonts/ofl

Scrive in public/fonts:
  cormorant-garamond-var.woff         titoli (peso 300-600)
  cormorant-garamond-italic-var.woff  dettagli editoriali in corsivo (peso 300-600)
  dm-sans-var.woff                    testi, menu, pulsanti (peso 400-700, dimensione ottica fissa a 14)
Licenza: SIL Open Font License 1.1 (i file OFL sono copiati accanto ai caratteri)."""
import io
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = Path(__file__).resolve().parent.parent
out = root / 'public' / 'fonts'

# Latino di base + Latin-1 + Latin Extended-A + punteggiatura tipografica, € e frecce usate dal sito
UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [
    0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2032, 0x2033, 0x20AC,
    0x2190, 0x2192, 0x00B7, 0x2212, 0x00D7,
]

JOBS = [
    ('cormorantgaramond/CormorantGaramond[wght].ttf', 'cormorant-garamond-var.woff', {'wght': (300, 600)}),
    ('cormorantgaramond/CormorantGaramond-Italic[wght].ttf', 'cormorant-garamond-italic-var.woff', {'wght': (300, 600)}),
    ('dmsans/DMSans[opsz,wght].ttf', 'dm-sans-var.woff', {'wght': (400, 700), 'opsz': 14}),
]


def main(ofl):
    ofl = Path(ofl)
    out.mkdir(parents=True, exist_ok=True)
    for src, name, limits in JOBS:
        font = TTFont(ofl / src)
        font = instancer.instantiateVariableFont(font, limits)
        buf = io.BytesIO()
        font.save(buf)          # si ricarica il font: evita un errore delle tabelle «pigre» di fontTools nel passaggio successivo
        buf.seek(0)
        font = TTFont(buf)
        opts = subset.Options()
        opts.flavor = 'woff'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'onum', 'lnum', 'tnum', 'pnum', 'case']
        opts.name_IDs = [1, 2, 3, 4, 6]
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        font.flavor = 'woff'
        font.save(out / name)
        print(f'{name}: {(out / name).stat().st_size // 1024} KB')
    shutil.copy(ofl / 'cormorantgaramond' / 'OFL.txt', out / 'CormorantGaramond-OFL.txt')
    shutil.copy(ofl / 'dmsans' / 'OFL.txt', out / 'DMSans-OFL.txt')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
