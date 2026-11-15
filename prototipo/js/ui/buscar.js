// Buscador de campeones por nombre (Colección y selección de equipo): sin acentos, sin mayúsculas, con parte del nombre.
export const normalizar = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const coincideNombre = (p, texto) => !normalizar(texto) || normalizar(p.nombre).includes(normalizar(texto));
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const buscadorHtml = (id, valor) =>
  `<label class="buscador"><span aria-hidden="true">🔍</span><input id="${id}" type="search" placeholder="Buscar campeón…" value="${esc(valor)}" autocomplete="off" spellcheck="false">${valor ? `<button type="button" class="buscador-x" data-limpiar="${id}" title="Borrar búsqueda">✕</button>` : ''}</label>`;
// Tras repintar, devuelve el foco al buscador con el cursor al final (si el jugador estaba escribiendo en él)
export function reenfocar(id, estaba) {
  if (!estaba) return;
  const i = document.getElementById(id); if (!i) return;
  i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch { /* type=search en algunos navegadores */ }
}
