// Fichas flotantes de reliquias (pieza compartida de la Colección y la Tienda de la Horda).
// · Computadora (con cursor): la ficha aparece al pasar el cursor por encima.
// · Celular / pantalla táctil: el primer toque abre la ficha con su botón (Equipar, Comprar…) y el segundo confirma.
import { RELIQUIAS, TIPOS, RANGOS, RAREZAS, STAT_META, PLANAS, MAX_REPETIDAS } from '../datos/reliquias.js';
import { cartaReliquia } from './panel.js';

export const conCursor = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

const pct = s => !PLANAS.includes(s);
const fmt = (s, v) => pct(s) ? `${Math.round(v * 1000) / 10}%` : `${Math.round(v)}`;
const rangoTxt = (s, rz) => { const r = RANGOS[s]?.[rz]; return r ? (pct(s) ? `${r[0]}–${r[1]}%` : `${r[0]}–${r[1]}`) : ''; };

// Ficha de lo que PUEDE salir al conseguir una reliquia del catálogo (aún sin valores): línea fija y tiradas posibles
export function cartaPosible(id) {
  const r = RELIQUIAS[id], t = TIPOS[r.type], tiradas = RAREZAS[r.rarity].tiradas;
  const plana = t.plana.map(s => `<div class="rc-line flat"><span class="lbl">${STAT_META[s].label}</span><b>${rangoTxt(s, r.rarity)}</b></div>`).join(t.plana.length > 1 ? '<div class="tip-o">o</div>' : '');
  const pool = t.pct.filter(s => RANGOS[s]?.[r.rarity]).map(s => `<div class="rc-line"><span class="lbl">${STAT_META[s].label}</span><b>${rangoTxt(s, r.rarity)}</b></div>`).join('');
  return `<div class="rc${r.rarity === 'Legendario' ? ' legendaria' : ''}" style="--rc:${RAREZAS[r.rarity].color}">
    ${r.imagen ? `<img class="rc-img" src="${r.imagen}" alt="${r.name}">` : ''}
    <div class="rc-head"><div class="rc-name">${r.name}</div><div class="rc-rarity">${r.rarity}</div></div>
    <div class="rc-type">${t.categoria} · ${r.type}</div>
    <div class="tip-sub">Línea fija${t.plana.length > 1 ? ' (una de las dos)' : ''}</div>${plana}
    ${tiradas ? `<div class="rc-sep"></div><div class="tip-sub">${tiradas} tirada${tiradas > 1 ? 's' : ''} al azar entre${tiradas > 1 ? ` (cada estadística hasta ${MAX_REPETIDAS} veces)` : ''}</div>${pool}` : '<div class="tip-sub">Sin tiradas porcentuales</div>'}
    ${r.passive ? `<div class="rc-passive"><b>Pasiva</b>${r.passive}</div>` : ''}
    <div class="tip-nota">Los valores exactos se sortean al conseguirla.</div></div>`;
}

// Total por estadística de una copia (plana + tiradas)
function totales(rel) {
  const t = {}; if (!rel) return t;
  const [fk, fv] = rel.flat; t[fk] = (t[fk] || 0) + fv;
  for (const [s, v] of rel.rolls) t[s] = (t[s] || 0) + v;
  return t;
}
// Comparación de una copia con la que ya está equipada en ese espacio (▲ gana / ▼ pierde)
export function comparacion(nueva, actual) {
  if (!actual) return '<div class="tip-cmp"><div class="tip-sub">Ese espacio está vacío: todo lo que da es ganancia.</div></div>';
  const a = totales(nueva), b = totales(actual), stats = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const filas = stats.map(s => { const d = (a[s] || 0) - (b[s] || 0); if (Math.abs(d) < 1e-9) return '';
    return `<div class="rc-line ${d > 0 ? 'sube' : 'baja'}"><span class="lbl">${STAT_META[s].label}${/Pct$/.test(s) ? ' %' : ''}</span><b>${d > 0 ? '▲ +' : '▼ −'}${fmt(s, Math.abs(d))}</b></div>`; }).join('');
  return `<div class="tip-cmp"><div class="tip-sub">Contra ${actual.name} (equipada)</div>${filas || '<div class="rc-line"><span class="lbl">Mismas estadísticas</span></div>'}</div>`;
}

// ---------------------------------------------------------------- ficha flotante con el cursor
let tip = null;
function elTip() {
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip-rel hidden'; document.body.append(tip); }
  return tip;
}
export function ocultarTip() { tip?.classList.add('hidden'); }
// Activa la ficha al pasar el cursor por los elementos de "contenedor" que coincidan con "selector"; html(el) devuelve el contenido
export function activarTip(contenedor, selector, html) {
  contenedor.addEventListener('mouseover', e => {
    if (!conCursor()) return;
    const el = e.target.closest(selector); if (!el || !contenedor.contains(el)) return;
    const h = html(el); if (!h) return;
    const t = elTip(); t.innerHTML = h; t.classList.remove('hidden');
    const r = el.getBoundingClientRect(), w = t.offsetWidth, alto = t.offsetHeight;
    let left = r.right + 12, top = r.top - 10;
    if (left + w > innerWidth - 8) left = r.left - w - 12;
    if (left < 8) left = Math.max(8, Math.min(innerWidth - w - 8, r.left));
    if (top + alto > innerHeight - 8) top = Math.max(8, innerHeight - alto - 8);
    t.style.left = `${left}px`; t.style.top = `${top}px`;
  });
  contenedor.addEventListener('mouseout', e => { const el = e.target.closest(selector); if (el && !el.contains(e.relatedTarget)) ocultarTip(); });
}

// ---------------------------------------------------------------- hoja en pantallas táctiles (primer toque)
// Muestra la ficha con un botón de acción; al tocar el botón se ejecuta "accion". Tocar fuera la cierra.
export function hojaTactil(html, textoBoton, accion) {
  cerrarHoja();
  const d = document.createElement('div'); d.className = 'tip-hoja';
  d.innerHTML = `<div class="tip-hoja-caja">${html}<div class="tip-hoja-botones"><button class="eq-btn" data-cerrar>Cerrar</button>${textoBoton ? `<button class="eq-listo" data-ok>${textoBoton}</button>` : ''}</div></div>`;
  d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-cerrar]')) return cerrarHoja();
    if (e.target.closest('[data-ok]')) { cerrarHoja(); accion?.(); }
  });
  document.body.append(d);
}
export function cerrarHoja() { document.querySelectorAll('.tip-hoja').forEach(x => x.remove()); }
export { cartaReliquia };
