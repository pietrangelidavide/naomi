#!/usr/bin/env python3
"""Ritocco delle foto del sito: toglie il rumore e i quadratini della compressione, riequilibra luci e colori,
ridimensiona con cura e rinfresca la nitidezza. Non inventa dettagli: dove la foto è piccola o sfocata (fotogrammi di video,
screenshot di Instagram) il guadagno è limitato; per un salto vero servono gli originali ad alta risoluzione.

Come libreria:
    from enhance import enhance, enhance_screen, remove_text, save_webp
    im = enhance(Image.open(...), width=900)          # foto
    im = enhance_screen(Image.open(...), width=1000)  # screenshot con testo (recensioni): niente livelli né contrasto locale
    a  = remove_text(cv2_bgr, [(x0, y0, x1, y1, vmin, smax)])   # toglie una scritta bianca sovrapposta alla foto
"""
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageOps


def _resize(a, width):
    if width and width != a.shape[1]:
        scale = width / a.shape[1]
        interp = cv2.INTER_AREA if scale < 1 else cv2.INTER_LANCZOS4
        a = cv2.resize(a, (width, round(a.shape[0] * scale)), interpolation=interp)
    return a


def enhance(im, width=None, strength=1.0, levels=0.55):
    """Foto. im: PIL.Image. width: larghezza finale. strength: 0..1.5 per tutto il ritocco.
    levels: quanto stirare le luci verso l'intera gamma (0 = niente)."""
    im = ImageOps.exif_transpose(im).convert('RGB')
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)

    # 1. rumore e blocchi di compressione: poco, il resto lo fa il ridimensionamento
    h = 3.2 * strength
    a = cv2.fastNlMeansDenoisingColored(a, None, h, h, 5, 15)

    # 2. dimensione: giù con INTER_AREA (toglie altro rumore), su con Lanczos
    a = _resize(a, width)

    # 3. luci e ombre: stira i livelli (solo in parte) e apre le ombre con un CLAHE leggero, sulla sola luminosità
    lab = cv2.cvtColor(a, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32)
    lo, hi = np.percentile(L, (0.6, 99.6))
    if hi - lo > 40:
        stretched = np.clip((L - lo) * 255.0 / (hi - lo), 0, 255)
        L = L + (stretched - L) * levels * strength
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    Lc = clahe.apply(np.clip(L, 0, 255).astype(np.uint8)).astype(np.float32)
    lab[:, :, 0] = np.clip(L + (Lc - L) * 0.45 * strength, 0, 255).astype(np.uint8)
    a = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # 4. colori un po' più pieni
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (1 + 0.10 * strength), 0, 255)
    a = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    out = Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))

    # 5. nitidezza: una passata larga (struttura) e una stretta (bordi)
    out = out.filter(ImageFilter.UnsharpMask(radius=2.2, percent=int(45 * strength), threshold=3))
    out = out.filter(ImageFilter.UnsharpMask(radius=0.8, percent=int(75 * strength), threshold=2))
    return out


def enhance_screen(im, width=None, strength=1.0):
    """Screenshot con testo (recensioni): toglie i quadratini del JPEG intorno alle lettere e le affina, senza toccare
    livelli, contrasto locale e colori (il bianco delle schede resta bianco)."""
    im = ImageOps.exif_transpose(im).convert('RGB')
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    h = 2.0 * strength
    a = cv2.fastNlMeansDenoisingColored(a, None, h, h, 5, 15)
    a = _resize(a, width)
    out = Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))
    return out.filter(ImageFilter.UnsharpMask(radius=1.1, percent=int(70 * strength), threshold=2))


def remove_text(a, boxes, grow=6):
    """Toglie scritte bianche sovrapposte alla foto (le didascalie di Instagram). a: immagine BGR (numpy).
    boxes: [(x0, y0, x1, y1, vmin, smax)]: dentro ogni riquadro sono 'testo' i pixel molto chiari (V >= vmin) e poco colorati
    (S <= smax). La maschera viene allargata di `grow` pixel per prendere bordo sfumato e alone, poi si ricostruisce lo sfondo
    con il riempimento per frequenze (FSR) di OpenCV: meglio di Telea su pareti con macchie e su capelli."""
    hsv = cv2.cvtColor(a, cv2.COLOR_BGR2HSV)
    m = np.zeros(a.shape[:2], np.uint8)
    for x0, y0, x1, y1, vmin, smax in boxes:
        r = hsv[y0:y1, x0:x1]
        m[y0:y1, x0:x1] = (((r[:, :, 2] >= vmin) & (r[:, :, 1] <= smax)) * 255).astype(np.uint8)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1, grow * 2 + 1)))
    valid = (m == 0).astype(np.uint8) * 255  # per xphoto: 255 = pixel buono, 0 = da ricostruire
    out = np.zeros_like(a)
    cv2.xphoto.inpaint(a, valid, out, cv2.xphoto.INPAINT_FSR_FAST)
    return out


def save_webp(im, path, quality=80):
    im.save(path, 'WEBP', quality=quality, method=6)
