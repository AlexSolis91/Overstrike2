// Aviso de nueva versión: cada publicación en GitHub Pages cambia el Last-Modified de la página. Si el del servidor es más
// nuevo que el de la página cargada, el menú muestra el botón para actualizar.
const $ = s => document.querySelector(s);
const CADA_MS = 2 * 60 * 1000;
const cargada = Date.parse(document.lastModified);
let hayNueva = false;

async function revisar() {
  if (hayNueva || !cargada || !/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch(location.pathname, { method: 'HEAD', cache: 'no-store' });
    const servidor = Date.parse(r.headers.get('last-modified'));
    if (!r.ok || !servidor || servidor <= cargada + 1000) return;
    hayNueva = true;
    $('#btn-actualizar').classList.remove('hidden');
  } catch (e) { /* sin conexión: se revisa después */ }
}

// Recargar no basta: el navegador puede tener guardados los archivos hasta 10 minutos. Primero los pide de nuevo al servidor.
async function actualizar() {
  const b = $('#btn-actualizar');
  b.disabled = true; b.textContent = 'Actualizando…';
  const archivos = performance.getEntriesByType('resource').map(e => e.name)
    .filter(u => new URL(u).origin === location.origin && /\.(js|css|webmanifest)(\?|$)/.test(u));
  const limite = new Promise(ok => setTimeout(ok, 8000));
  await Promise.race([limite, Promise.allSettled([location.href, ...new Set(archivos)].map(u => fetch(u, { cache: 'reload' })))]);
  location.reload();
}

export function iniciarActualizacion() {
  $('#btn-actualizar').addEventListener('click', actualizar);
  setInterval(revisar, CADA_MS);
  addEventListener('menu:mostrar', revisar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
  revisar();
}
