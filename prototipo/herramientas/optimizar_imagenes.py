"""Optimiza las imágenes de Overstrike 2.

Uso (desde la carpeta prototipo):
    python herramientas/optimizar_imagenes.py

Toma las imágenes de assets/originales/<tipo>/ y genera versiones WebP ligeras en assets/<tipo>/:

- personajes, transformaciones: recorte centrado (con sesgo hacia arriba, donde suele estar la cara)
  a 800x680, la proporción de la ilustración de la carta.
- invocaciones (512x512), reliquias (256x256): quita el fondo (transparencia real, cuadriculado falso
  "de Google" o color liso), recorta a la figura y la centra en un cuadro con fondo transparente.

El nombre del archivo debe ser el nombre del personaje/invocación/reliquia de su ficha
(mayúsculas, espacios, acentos y extensiones dobles no importan).

El nombre de salida se normaliza: "SunJinWoo.JPG.jpg" -> "sun-jin-woo.webp".
Solo procesa imágenes nuevas o modificadas (usa --todo para rehacer todas).
"""
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'originales'
OUT = ROOT / 'assets'
EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'}

PERSONAJE_SIZE = (800, 680)   # misma proporción que la ilustración de la carta
INVOCACION_SIZE = 512
RELIQUIA_SIZE = 256


def slug(path: Path) -> str:
    name = path.name
    while Path(name).suffix.lower() in EXTS:          # "Igris.PNG.png" -> "Igris"
        name = Path(name).stem
    name = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '-', name)  # "SunJinWoo" -> "Sun-Jin-Woo"
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


# ---------------------------------------------------------------- personajes
def personaje(src: Path, dst: Path):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    im = ImageOps.fit(im, PERSONAJE_SIZE, Image.LANCZOS, centering=(0.5, 0.35))
    im.save(dst, 'WEBP', quality=82, method=6)


# ---------------------------------------------------------------- invocaciones
def fondo_estimado(rgb: np.ndarray):
    """Devuelve (c1, c2, descripción) con los dos colores del fondo, o None si no se reconoce."""
    h, w, _ = rgb.shape
    b = max(4, min(h, w) // 100)
    borde = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
                            rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
    sat = borde.max(1) - borde.min(1)
    if borde.std(0).mean() < 10:                                   # color liso
        c = np.median(borde, 0)
        return c, c, 'color liso'
    lum = borde.mean(1)
    neutro_claro = (sat < 16) & (lum > 150)
    claros, grises = neutro_claro & (lum > 235), neutro_claro & (lum < 215)
    # cuadriculado gris/blanco: casi todo el borde, o al menos una parte con sus dos tonos (la figura puede tapar el resto)
    if (sat < 16).mean() > .85 or (neutro_claro.mean() > .2 and claros.mean() > .05 and grises.mean() > .05):
        if grises.mean() < .02:                  # en realidad es blanco liso (sin el segundo tono del cuadriculado)
            c = np.median(borde[claros], 0)
            return c, c, 'color liso'
        mid = (np.percentile(lum, 5) + np.percentile(lum, 95)) / 2
        return borde[lum < mid].mean(0), borde[lum >= mid].mean(0), 'cuadriculado falso'
    if claros.mean() > .3:                       # fondo blanco con trazos o figura tocando el borde
        c = np.median(borde[claros], 0)
        return c, c, 'color liso'
    return None


def quitar_fondo(rgb: np.ndarray, c1: np.ndarray, c2: np.ndarray) -> np.ndarray:
    """Devuelve RGBA. El fondo son píxeles cercanos al segmento c1–c2 (incluye las mezclas de
    las uniones del cuadriculado) conectados en regiones grandes. En los bordes se estima una
    transparencia parcial y se recupera el color real (brillos, rayos, humo)."""
    seg = c2 - c1
    L2 = float(seg @ seg) or 1.0
    t = np.clip(((rgb - c1) @ seg) / L2, 0, 1)
    B = c1 + t[..., None] * seg                                   # color de fondo más cercano
    d = np.linalg.norm(rgb - B, axis=2)
    sat = rgb.max(2) - rgb.min(2)

    cand = (d < 22) & (sat < 18)
    lab, n = ndimage.label(cand)
    if n:
        sizes = ndimage.sum(cand, lab, range(1, n + 1))
        bg = np.isin(lab, np.nonzero(sizes > 150)[0] + 1)
    else:
        bg = np.zeros_like(cand)

    alpha = np.ones(d.shape)
    alpha[bg] = 0
    borde = ndimage.binary_dilation(bg, iterations=4) & ~bg
    a = np.clip((d - 14) / 60, 0, 1)
    alpha[borde] = a[borde]

    out = rgb.copy()
    m = borde & (alpha > .02)
    am = alpha[m][:, None]
    out[m] = np.clip((rgb[m] - (1 - am) * B[m]) / am, 0, 255)     # "des-mezclar" el fondo
    return np.dstack([out, alpha * 255]).astype(np.uint8)


def quitar_cuadricula(rgb: np.ndarray) -> np.ndarray:
    """Quita un cuadriculado falso gris/blanco sin necesidad de conocer su patrón (puede venir
    deformado o con celdas de distinto tamaño).

    - Fondo: regiones grandes de píxeles neutros (sin color) y claros.
    - Brillos semitransparentes (rayos, auras): como el fondo es gris neutro, el "color" (croma)
      de un píxel solo puede venir de la figura: croma(P) = alfa * croma(F). Así se obtiene la
      transparencia sin que importe si detrás había un cuadro blanco o uno gris."""
    lum = rgb.mean(2)
    sat = rgb.max(2) - rgb.min(2)
    neutro = (sat < 16) & (lum > 150)
    lab, n = ndimage.label(neutro)
    sizes = ndimage.sum(neutro, lab, range(1, n + 1)) if n else np.array([])
    bg = np.isin(lab, np.nonzero(sizes > 150)[0] + 1)

    zona = ndimage.binary_dilation(bg, iterations=40) & ~bg
    croma = np.linalg.norm(rgb - lum[..., None], axis=2)
    sel = zona & (croma > 20)
    K = np.percentile(croma[sel], 97) if sel.any() else 120.0
    a_croma = np.clip(croma / K, 0, 1)
    a_croma = a_croma + (1 - a_croma) * np.clip((a_croma - .7) / .2, 0, 1)   # brillos intensos: opacos
    claro = np.clip((lum - 120) / 40, 0, 1)            # 0 = oscuro (armadura sólida), 1 = claro (posible brillo)
    alpha = np.where(zona, 1 - claro * (1 - a_croma), 1.0)
    alpha[bg] = 0
    alpha = np.clip(ndimage.gaussian_filter(alpha, .7), 0, 1) * ~bg

    # color: el tono sale del croma; el brillo se fija alto para que se vea como luz sobre fondo oscuro
    out = rgb.copy()
    m = zona & (alpha > .02) & (alpha < .98)
    am = alpha[m][:, None]
    tono = (rgb[m] - lum[m][:, None]) / am
    out[m] = np.clip(np.maximum(lum[m][:, None], 170) + tono, 0, 255) * (1 - am) + rgb[m] * am
    return np.dstack([out, alpha * 255]).astype(np.uint8)


def desvanecer_cortes(rgba: Image.Image) -> Image.Image:
    """Si la figura queda cortada por un borde de la imagen (llega opaca hasta el borde), suaviza ese corte
    con un desvanecido para que no se vea una línea recta al volar por el campo."""
    a = np.asarray(rgba).astype(float)
    alpha = a[..., 3]
    h, w = alpha.shape
    n = max(8, int(min(h, w) * .07))
    rampa = np.linspace(0, 1, n)
    for lado in ('top', 'bottom', 'left', 'right'):
        franja = {'top': alpha[0], 'bottom': alpha[-1], 'left': alpha[:, 0], 'right': alpha[:, -1]}[lado]
        if (franja > 200).mean() < .15:          # ese borde casi no toca la figura: nada que suavizar
            continue
        if lado == 'top': alpha[:n] *= rampa[:, None]
        if lado == 'bottom': alpha[-n:] *= rampa[::-1, None]
        if lado == 'left': alpha[:, :n] *= rampa[None, :]
        if lado == 'right': alpha[:, -n:] *= rampa[None, ::-1]
    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def recorte_transparente(src: Path, dst: Path, size: int) -> str:
    im = ImageOps.exif_transpose(Image.open(src))
    if im.mode in ('RGBA', 'LA', 'P') and np.asarray(im.convert('RGBA'))[..., 3].min() < 250:
        rgba, nota = im.convert('RGBA'), 'ya tenía transparencia'
    else:
        rgb = np.asarray(im.convert('RGB')).astype(float)
        b = max(4, min(rgb.shape[:2]) // 100)
        borde = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3), rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
        oscuro = np.median(borde.mean(1)) < 45      # fondo negro/oscuro: se conserva y el juego la muestra en modo luminoso
        f = None if oscuro else fondo_estimado(rgb)
        res = quitar_cuadricula(rgb) if f and f[2] == 'cuadriculado falso' else None
        if oscuro:
            rgba, nota = im.convert('RGBA'), 'fondo oscuro conservado (usar "luminosa: true" en la invocación)'
        elif res is not None:
            rgba, nota = Image.fromarray(res, 'RGBA'), 'fondo quitado (cuadriculado falso)'
        elif f:
            rgba, nota = Image.fromarray(quitar_fondo(rgb, f[0], f[1]), 'RGBA'), f'fondo quitado ({f[2]})'
        else:
            rgba, nota = im.convert('RGBA'), 'fondo NO reconocido, se deja igual'

    bbox = rgba.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    rgba = desvanecer_cortes(rgba)
    rgba.thumbnail((int(size * .94),) * 2, Image.LANCZOS)
    lienzo = Image.new('RGBA', (size,) * 2, (0, 0, 0, 0))
    lienzo.paste(rgba, ((size - rgba.width) // 2, (size - rgba.height) // 2))
    lienzo.save(dst, 'WEBP', quality=88, method=6)
    return nota


# ---------------------------------------------------------------- main
def main():
    todo = '--todo' in sys.argv
    tareas = [
        ('personajes', personaje),
        ('transformaciones', personaje),
        ('invocaciones', lambda a, b: recorte_transparente(a, b, INVOCACION_SIZE)),
        ('reliquias', lambda a, b: recorte_transparente(a, b, RELIQUIA_SIZE)),
    ]
    hechas = 0
    for carpeta, fn in tareas:
        (OUT / carpeta).mkdir(parents=True, exist_ok=True)
        (SRC / carpeta).mkdir(parents=True, exist_ok=True)
        # Si una original quedó por error en la carpeta de salida, se mueve a "originales"
        for extra in sorted((OUT / carpeta).glob('*')):
            if extra.suffix.lower() in EXTS and extra.suffix.lower() != '.webp':
                destino = SRC / carpeta / extra.name
                if not destino.exists():
                    extra.rename(destino)
                    print(f'  (movida a originales) {carpeta}/{extra.name}')
        for src in sorted((SRC / carpeta).glob('*')):
            if src.suffix.lower() not in EXTS:
                continue
            dst = OUT / carpeta / f'{slug(src)}.webp'
            if not todo and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
                continue
            nota = fn(src, dst) or ''
            kb_in, kb_out = src.stat().st_size / 1024, dst.stat().st_size / 1024
            print(f'  {carpeta}/{src.name}  ->  {dst.relative_to(ROOT).as_posix()}  '
                  f'({kb_in:.0f} KB -> {kb_out:.0f} KB) {nota}')
            hechas += 1
    print(f'Listo: {hechas} imagen(es) procesada(s).' if hechas else 'No hay imágenes nuevas.')


if __name__ == '__main__':
    main()
