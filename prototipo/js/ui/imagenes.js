// Carga previa de imágenes (con reintentos). Si alguna falla, el juego usa el emoji.
import { canvasTex } from './graficos.js';

export const IMG = {};           // ruta -> HTMLImageElement | null
export const TEX_INVOCACION = {}; // clave -> PIXI.Texture

function cargar(src, intentos = 3) {
  return new Promise(resolve => {
    let n = 0;
    const intento = () => {
      const im = new Image();
      let hecho = false;
      const fin = ok => {
        if (hecho) return; hecho = true; clearTimeout(timer);
        if (ok) resolve(im);
        else if (++n < intentos) setTimeout(intento, 400 * n);
        else resolve(null);
      };
      const timer = setTimeout(() => fin(false), 8000);
      im.onload = () => fin(true);
      im.onerror = () => fin(false);
      im.src = n ? `${src}?reintento=${n}` : src;
    };
    intento();
  });
}
// Abierto con doble clic (file://) el navegador bloquea usar imágenes locales: se detecta y se usa emoji.
function usable(img) {
  if (!img) return false;
  try {
    const g = document.createElement('canvas').getContext('2d');
    g.drawImage(img, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1);
    return true;
  } catch (e) { return false; }
}

export async function precargar(rutas, invocaciones, alAvanzar) {
  const lista = [...new Set(rutas.filter(Boolean))];
  let hechas = 0;
  await Promise.all(lista.map(async src => {
    const im = await cargar(src);
    IMG[src] = usable(im) ? im : null;
    alAvanzar?.(++hechas, lista.length);
  }));
  const fallidas = lista.filter(s => !IMG[s]);
  if (fallidas.length) console.warn('Imágenes no disponibles (se usa emoji). Si abriste index.html con doble clic, usa herramientas/servidor.py:', fallidas);
  for (const [key, def] of Object.entries(invocaciones)) {
    const im = IMG[def.imagen];
    if (im) TEX_INVOCACION[key] = canvasTex(im.naturalWidth, im.naturalHeight, g => g.drawImage(im, 0, 0), 1);
  }
}

export function drawCover(g, img, x, y, w, h, cx = .5, cy = .3) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.naturalWidth - sw) * cx, (img.naturalHeight - sh) * cy, sw, sh, x, y, w, h);
}
export const imgHtml = (src, alt = '') => IMG[src] ? `<img src="${src}" alt="${alt}">` : '';
