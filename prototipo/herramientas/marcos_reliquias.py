"""Marcos de reliquias de Overstrike 2 (dibujados por código, uno por rareza).

Uso (desde la carpeta prototipo):
    python herramientas/marcos_reliquias.py            # monta las reliquias nuevas o modificadas
    python herramientas/marcos_reliquias.py --todo     # rehace todas
    python herramientas/marcos_reliquias.py --muestra  # solo guarda los 5 marcos de muestra en herramientas/marcos/

Toma el arte de cada reliquia de assets/originales/reliquias/ (el nombre del archivo es el nombre de la reliquia
o su id de js/datos/reliquias.js), lo recorta al centro, lo monta dentro del marco de piedra de su rareza
(con la joya del color de la rareza en la esquina superior derecha) y guarda assets/reliquias/<id>.webp (512x512, id exacto de la ficha).
Todos los marcos son de metal del color de su rareza con resplandor exterior; el de las legendarias es dorado, más intenso y con destellos.
"""
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'originales' / 'reliquias'
OUT = ROOT / 'assets' / 'reliquias'
MUESTRAS = ROOT / 'herramientas' / 'marcos'
DATOS = ROOT / 'js' / 'datos' / 'reliquias.js'
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}

S = 1024            # se dibuja a 1024 y se guarda a 512 (bordes suaves)
SALIDA = 512
M = 34              # margen exterior (espacio para el resplandor de las legendarias)
B = 64              # grosor del marco de piedra
COLORES = {         # mismos colores que RAREZAS en js/datos/reliquias.js
    'Común': (163, 172, 185), 'Raro': (74, 222, 128), 'Especial': (96, 165, 250),
    'Épico': (192, 132, 252), 'Legendario': (251, 191, 36),
}


def mezcla(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def textura_piedra(color, semilla):
    """Piedra oscura con ruido y vetas, teñida un poco del color de la rareza."""
    rng = np.random.default_rng(semilla)
    ruido = rng.normal(0, 1, (S // 8, S // 8))
    img = Image.fromarray(((ruido - ruido.min()) / (np.ptp(ruido) + 1e-9) * 255).astype('uint8')).resize((S, S), Image.BICUBIC)
    fino = Image.fromarray(rng.integers(0, 255, (S, S), dtype='uint8')).filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(img, float) * .7 + np.asarray(fino, float) * .3
    a = (a - a.min()) / (np.ptp(a) + 1e-9)
    base = np.array(mezcla((34, 34, 38), color, .10), float)
    luz = np.array(mezcla((92, 92, 98), color, .14), float)
    rgb = base[None, None, :] * (1 - a[..., None]) + luz[None, None, :] * a[..., None]
    return Image.fromarray(rgb.clip(0, 255).astype('uint8'), 'RGB')


def joya(color, r):
    """Gema facetada (rombo con brillo) del color de la rareza."""
    g = Image.new('RGBA', (r * 2 + 8, r * 2 + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    c = r + 4
    oscuro, claro = mezcla(color, (0, 0, 0), .55), mezcla(color, (255, 255, 255), .55)
    d.ellipse([c - r, c - r, c + r, c + r], fill=(40, 38, 36, 255), outline=(150, 140, 120, 255), width=4)   # engaste
    k = int(r * .78)
    pts = [(c, c - k), (c + k, c), (c, c + k), (c - k, c)]
    d.polygon(pts, fill=color + (255,))
    d.polygon([(c, c - k), (c + k, c), (c, c)], fill=claro + (255,))          # faceta iluminada
    d.polygon([(c, c + k), (c - k, c), (c, c)], fill=oscuro + (255,))         # faceta en sombra
    d.polygon([(c, c - k), (c - k, c), (c, c)], fill=mezcla(color, (255, 255, 255), .25) + (255,))
    d.ellipse([c - k * .45, c - k * .62, c - k * .1, c - k * .27], fill=(255, 255, 255, 210))   # destello
    return g


def marco(rareza):
    """Marco de metal labrado del color de la rareza, con resplandor exterior y la joya arriba a la derecha."""
    color = COLORES[rareza]
    leg = rareza == 'Legendario'
    x0, y0, x1, y1 = M, M, S - M, S - M
    capa = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    # resplandor exterior del color de la rareza (más intenso en las legendarias)
    aura = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(aura).rounded_rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], radius=30, outline=color + (255,), width=30 if leg else 16)
    capa = Image.alpha_composite(capa, aura.filter(ImageFilter.GaussianBlur(20 if leg else 12)))
    if leg:
        capa = Image.alpha_composite(capa, aura.filter(ImageFilter.GaussianBlur(8)))
    # cuerpo del marco: metal del color de la rareza (oscuro -> brillante) con textura de piedra encima
    mascara = Image.new('L', (S, S), 0)
    dm = ImageDraw.Draw(mascara)
    dm.rounded_rectangle([x0, y0, x1, y1], radius=26, fill=255)
    dm.rounded_rectangle([x0 + B, y0 + B, x1 - B, y1 - B], radius=10, fill=0)
    tex = np.asarray(textura_piedra((128, 128, 128), 7).convert('L'), float) / 255
    yy, xx = np.mgrid[0:S, 0:S] / S
    luz = np.clip(1.05 - (xx + yy) * .45, .35, 1)                 # luz desde arriba a la izquierda
    oscuro, claro = np.array(mezcla(color, (0, 0, 0), .62), float), np.array(mezcla(color, (255, 255, 255), .18), float)
    t = np.clip(luz * .75 + tex * .45 - .1, 0, 1)[..., None]
    metal = Image.fromarray((oscuro * (1 - t) + claro * t).clip(0, 255).astype('uint8'), 'RGB')
    capa.paste(metal, (0, 0), mascara)
    d = ImageDraw.Draw(capa)
    brillo, sombra = mezcla(color, (255, 255, 255), .6) + (230,), (0, 0, 0, 150)
    d.rounded_rectangle([x0, y0, x1, y1], radius=26, outline=(0, 0, 0, 220), width=5)
    d.line([(x0 + 14, y0 + 7), (x1 - 14, y0 + 7)], fill=brillo, width=4)
    d.line([(x0 + 7, y0 + 14), (x0 + 7, y1 - 14)], fill=brillo, width=4)
    d.line([(x0 + 14, y1 - 7), (x1 - 14, y1 - 7)], fill=sombra, width=5)
    d.line([(x1 - 7, y0 + 14), (x1 - 7, y1 - 14)], fill=sombra, width=5)
    # surco labrado a mitad del marco
    h = B // 2 - 2
    d.rounded_rectangle([x0 + h, y0 + h, x1 - h, y1 - h], radius=18, outline=mezcla(color, (0, 0, 0), .7) + (200,), width=5)
    d.rounded_rectangle([x0 + h + 4, y0 + h + 4, x1 - h - 4, y1 - h - 4], radius=16, outline=mezcla(color, (255, 255, 255), .35) + (120,), width=2)
    # esquinas labradas
    for (cx, cy, sx, sy) in [(x0, y0, 1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
        poly = [(cx + sx * 8, cy + sy * 8), (cx + sx * (B + 30), cy + sy * 8), (cx + sx * 8, cy + sy * (B + 30))]
        d.polygon(poly, fill=mezcla(color, (0, 0, 0), .5) + (255,), outline=(0, 0, 0, 230))
        d.line([poly[1], poly[2]], fill=mezcla(color, (255, 255, 255), .5) + (255,), width=4)
    # remaches
    for (rx, ry) in [((x0 + x1) // 2, y0 + B // 2), ((x0 + x1) // 2, y1 - B // 2), (x0 + B // 2, (y0 + y1) // 2), (x1 - B // 2, (y0 + y1) // 2)]:
        d.ellipse([rx - 10, ry - 10, rx + 10, ry + 10], fill=(20, 20, 22, 255))
        d.ellipse([rx - 7, ry - 8, rx + 6, ry + 5], fill=mezcla(color, (255, 255, 255), .55) + (255,))
    # borde interior luminoso (hacia la ilustración)
    d.rounded_rectangle([x0 + B - 6, y0 + B - 6, x1 - B + 6, y1 - B + 6], radius=12, outline=(8, 8, 10, 255), width=8)
    interior = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(interior).rounded_rectangle([x0 + B - 2, y0 + B - 2, x1 - B + 2, y1 - B + 2], radius=10, outline=color + (255,), width=12)
    capa = Image.alpha_composite(capa, interior.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(capa)
    d.rounded_rectangle([x0 + B - 2, y0 + B - 2, x1 - B + 2, y1 - B + 2], radius=10, outline=mezcla(color, (255, 255, 255), .45) + (255,), width=4)
    # joya arriba a la derecha sobre una placa oscura, con halo del color
    jx, jy, jr = x1 - B // 2 - 4, y0 + B // 2 + 4, 58
    d.rounded_rectangle([jx - jr - 14, jy - jr - 14, jx + jr + 14, jy + jr + 14], radius=20, fill=mezcla(color, (0, 0, 0), .75) + (255,),
                        outline=mezcla(color, (255, 255, 255), .4) + (255,), width=5)
    halo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([jx - jr - 34, jy - jr - 34, jx + jr + 34, jy + jr + 34], fill=color + (190,))
    capa = Image.alpha_composite(capa, halo.filter(ImageFilter.GaussianBlur(20)))
    g = joya(color, jr)
    capa.alpha_composite(g, (jx - g.width // 2, jy - g.height // 2))
    if leg:   # filo dorado brillante y destellos
        filo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        df = ImageDraw.Draw(filo)
        df.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], radius=24, outline=(255, 240, 170, 255), width=4)
        for (sx, sy) in [(x0 + 90, y0 + 4), (x1 - 4, y1 - 160), (x0 + 4, y1 - 90), ((x0 + x1) // 2 + 120, y1 - 4)]:
            df.line([(sx - 22, sy), (sx + 22, sy)], fill=(255, 255, 230, 255), width=4)
            df.line([(sx, sy - 22), (sx, sy + 22)], fill=(255, 255, 230, 255), width=4)
        capa = Image.alpha_composite(capa, filo.filter(ImageFilter.GaussianBlur(1.5)))
    return capa


def ventana():
    return (M + B - 4, M + B - 4, S - M - B + 4, S - M - B + 4)


def montar(arte, rareza):
    capa = marco(rareza)
    vx0, vy0, vx1, vy1 = ventana()
    w = vx1 - vx0
    a = arte.convert('RGB')
    lado = int(min(a.size) * .94)    # recorta un 3% por lado (quita restos de firmas en las esquinas sin cortar las armas largas)
    a = a.crop(((a.width - lado) // 2, (a.height - lado) // 2, (a.width + lado) // 2, (a.height + lado) // 2)).resize((w, w), Image.LANCZOS)
    lienzo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    m = Image.new('L', (w, w), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, w - 1], radius=12, fill=255)
    lienzo.paste(a, (vx0, vy0), m)
    lienzo = Image.alpha_composite(lienzo, capa)
    return lienzo.resize((SALIDA, SALIDA), Image.LANCZOS)


def slug(texto):
    t = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def reliquias():
    """id -> (nombre, rareza) leídos de js/datos/reliquias.js"""
    txt = DATOS.read_text(encoding='utf-8')
    return {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(r"(\w+):\s*\{\s*name:\s*'([^']+)',\s*rarity:\s*'([^']+)'", txt)}


def main():
    if '--muestra' in sys.argv:
        MUESTRAS.mkdir(parents=True, exist_ok=True)
        for r in COLORES:
            marco(r).resize((SALIDA, SALIDA), Image.LANCZOS).save(MUESTRAS / f'marco-{slug(r)}.png')
        print('Marcos de muestra en', MUESTRAS)
        return
    todo = '--todo' in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    datos = reliquias()
    por_slug = {slug(n): k for k, (n, _) in datos.items()} | {slug(k): k for k in datos}
    hechas = 0
    for f in sorted(SRC.glob('*')):
        if f.suffix.lower() not in EXTS:
            continue
        nombre = f.name
        while Path(nombre).suffix.lower() in EXTS:
            nombre = Path(nombre).stem
        clave = por_slug.get(slug(nombre))
        if not clave:
            print(f'  ?? {f.name}: no coincide con ninguna reliquia de reliquias.js')
            continue
        destino = OUT / f'{clave}.webp'
        if destino.exists() and destino.stat().st_mtime >= f.stat().st_mtime and not todo:
            continue
        img = montar(Image.open(f), datos[clave][1])
        img.save(destino, 'WEBP', quality=88, method=6)
        print(f'  {f.name} -> {destino.relative_to(ROOT)} ({datos[clave][1]})')
        hechas += 1
    print(f'Listo: {hechas} reliquia(s) montada(s).')


if __name__ == '__main__':
    main()
