// Panel de administrador "📊 Estadísticas": balance de campeones por modo (docs/sql/048_estadisticas_admin.sql).
// Arena: victorias atacando y defendiendo · Horda: oleada promedio · Jefe de Raid: promedios por ataque.
// El botón solo se muestra a administradores; además el servidor rechaza a cualquiera que no lo sea.
import { porId } from '../datos/personajes/index.js';
import { JEFES_RAID, DIFICULTADES_RAID } from '../datos/jefes/raid.js';
import { esAdmin } from './cuenta.js';
import { adminEstadisticasArena, adminEstadisticasHorda, adminEstadisticasRaid, mensajeError } from '../servicios/datos.js';

const MIN_MUESTRA = 20;                       // menos usos que esto: fila atenuada (muestra chica)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v, n) => n ? v / n : null;
const fmtPct = x => x == null ? '—' : `${(x * 100).toFixed(1)}%`;
const fmtNum = x => x == null ? '—' : Math.round(x).toLocaleString('es-MX');

// Columnas de cada pestaña: clave para ordenar, título, valor y texto de la celda
const COLUMNAS = {
  arena: [
    { k: 'usos', t: 'Usos', v: f => f.usos, txt: f => fmtNum(f.usos) },
    { k: 'uso', t: '% de uso', v: f => f.uso, txt: f => fmtPct(f.uso) },
    { k: 'atk', t: 'Atacando', v: f => pct(f.atk_v, f.atk), txt: f => `${fmtPct(pct(f.atk_v, f.atk))}<small>${f.atk_v}/${f.atk}</small>` },
    { k: 'def', t: 'Defendiendo', v: f => pct(f.def_v, f.def), txt: f => `${fmtPct(pct(f.def_v, f.def))}<small>${f.def_v}/${f.def}</small>` },
    { k: 'total', t: '% victorias', v: f => pct(f.victorias, f.usos), txt: f => `<b>${fmtPct(pct(f.victorias, f.usos))}</b>` },
  ],
  horda: [
    { k: 'usos', t: 'Usos', v: f => f.usos, txt: f => fmtNum(f.usos) },
    { k: 'promedio', t: 'Oleada promedio', v: f => +f.promedio, txt: f => `<b>${f.promedio}</b>` },
    { k: 'mediana', t: 'Mediana', v: f => +f.mediana, txt: f => f.mediana },
    { k: 'mejor', t: 'Mejor', v: f => f.mejor, txt: f => f.mejor },
  ],
  raid: [
    { k: 'usos', t: 'Ataques', v: f => f.usos, txt: f => fmtNum(f.usos) },
    { k: 'dano', t: 'Daño', v: f => +f.dano, txt: f => `<b>${fmtNum(+f.dano)}</b>` },
    { k: 'recibido', t: 'Tanqueo', v: f => +f.recibido, txt: f => fmtNum(+f.recibido) },
    { k: 'curacion', t: 'Curación', v: f => +f.curacion, txt: f => fmtNum(+f.curacion) },
    { k: 'escudo', t: 'Escudos', v: f => +f.escudo, txt: f => fmtNum(+f.escudo) },
    { k: 'jefe', t: 'Más efectivo contra', v: f => nombreJefe(f.mejor_jefe), txt: f => esc(nombreJefe(f.mejor_jefe)) },
  ],
};
const ORDEN_INICIAL = { arena: 'total', horda: 'promedio', raid: 'dano' };
const AYUDA = {
  arena: 'Combates terminados de jugadores (ataques normales y Arena en vivo). No cuentan los combates contra la Defensa de práctica.',
  horda: 'Partidas terminadas con su equipo guardado (se guarda desde el paso 48 del servidor).',
  raid: 'Promedio por ataque terminado y verificado (se guarda desde el paso 48 del servidor). Tanqueo = daño recibido.',
};
const nombreJefe = id => JEFES_RAID[id]?.nombre || id || '—';

let estado = { tab: 'arena', periodo: 'temporada', horda: 'orcos', dificultad: '', orden: null, asc: false, datos: null, cargando: false, error: '' };

export function iniciarEstadisticas() {
  const b = document.querySelector('#btn-estadisticas');
  if (!b) return;
  const pintar = () => b.classList.toggle('hidden', !esAdmin());
  addEventListener('cuenta:cambio', pintar);
  pintar();
  b.addEventListener('click', abrir);
}

function abrir() {
  if (document.querySelector('.est-fondo') || !esAdmin()) return;
  const fondo = document.createElement('div');
  fondo.className = 'dlg-fondo est-fondo';
  fondo.innerHTML = '<div class="hov-caja est-caja" role="dialog" aria-modal="true"></div>';
  const cerrar = () => { removeEventListener('keydown', tecla, true); fondo.remove(); };
  const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  fondo.addEventListener('click', e => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) return cerrar();
    const t = e.target.closest('[data-tab]');
    if (t) { estado.tab = t.dataset.tab; estado.orden = null; estado.asc = false; return cargar(); }
    const o = e.target.closest('[data-orden]');
    if (o) { estado.asc = estado.orden === o.dataset.orden ? !estado.asc : false; estado.orden = o.dataset.orden; return pintar(); }
  });
  fondo.addEventListener('change', e => {
    if (e.target.id === 'est-periodo') estado.periodo = e.target.value;
    if (e.target.id === 'est-dificultad') estado.dificultad = e.target.value;
    cargar();
  });
  addEventListener('keydown', tecla, true);
  document.body.appendChild(fondo);
  cargar();
}

async function cargar() {
  estado = { ...estado, cargando: true, error: '', datos: null };
  pintar();
  const tab = estado.tab;
  try {
    const d = tab === 'arena' ? await adminEstadisticasArena(estado.periodo)
      : tab === 'horda' ? await adminEstadisticasHorda(estado.horda)
      : await adminEstadisticasRaid(estado.dificultad || null);
    if (tab !== estado.tab) return;
    estado.datos = d;
  } catch (e) { estado.error = mensajeError(e); }
  estado.cargando = false;
  pintar();
}

function filas() {
  const d = estado.datos, l = (d?.filas || []).filter(f => porId(f.campeon));
  if (estado.tab === 'arena') for (const f of l) f.uso = d.equipos ? f.usos / d.equipos : null;
  const col = COLUMNAS[estado.tab].find(c => c.k === (estado.orden || ORDEN_INICIAL[estado.tab]));
  const val = f => col.v(f);
  return l.sort((a, b) => {
    const x = val(a), y = val(b);
    if (x == null || y == null) return x == null ? 1 : -1;
    const r = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return estado.asc ? r : -r;
  });
}

function filtros() {
  if (estado.tab === 'arena') return `<label>Periodo <select id="est-periodo">
    ${[['temporada', 'Temporada actual'], ['30', 'Últimos 30 días'], ['todo', 'Todo']].map(([v, t]) => `<option value="${v}" ${estado.periodo === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  if (estado.tab === 'horda') return '<label>Horda <select disabled><option>Orcos</option></select></label>';
  return `<label>Dificultad <select id="est-dificultad"><option value="">Todas</option>
    ${Object.entries(DIFICULTADES_RAID).map(([v, x]) => `<option value="${v}" ${estado.dificultad === v ? 'selected' : ''}>${x.nombre}</option>`).join('')}</select></label>`;
}

function resumen() {
  const d = estado.datos;
  if (!d) return '';
  if (estado.tab === 'arena') return `${fmtNum(d.equipos / 2)} combates`;
  if (estado.tab === 'horda') return `${fmtNum(d.partidas)} partidas`;
  return `${fmtNum(d.ataques)} ataques`;
}

function pintar() {
  const caja = document.querySelector('.est-caja');
  if (!caja) return;
  const cols = COLUMNAS[estado.tab], orden = estado.orden || ORDEN_INICIAL[estado.tab];
  const lista = estado.datos ? filas() : [];
  const cuerpo = estado.cargando ? '<p class="est-nota">Cargando…</p>'
    : estado.error ? `<p class="est-nota est-error">${esc(estado.error)}</p>`
    : !lista.length ? '<p class="est-nota">Todavía no hay datos.</p>'
    : `<div class="est-tabla-caja"><table class="est-tabla"><thead><tr><th>#</th><th>Campeón</th>${cols.map(c =>
        `<th data-orden="${c.k}" class="${c.k === orden ? 'on' : ''}">${c.t}${c.k === orden ? (estado.asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
      <tbody>${lista.map((f, i) => {
        const p = porId(f.campeon);
        return `<tr class="${f.usos < MIN_MUESTRA ? 'poca' : ''}"><td>${i + 1}</td>
          <td class="est-camp"><img src="${p.imagen}" alt="">${esc(p.nombre)}</td>${cols.map(c => `<td>${c.txt(f)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>`;
  caja.innerHTML = `<h2>📊 Estadísticas</h2>
    <nav class="est-tabs">${[['arena', '⚔️ Arena'], ['horda', '🧟 Horda'], ['raid', '👑 Jefe de Raid']].map(([v, t]) =>
      `<button data-tab="${v}" class="${estado.tab === v ? 'on' : ''}">${t}</button>`).join('')}</nav>
    <div class="est-barra">${filtros()}<span>${resumen()}</span></div>
    <p class="est-ayuda">${AYUDA[estado.tab]} Atenuados: menos de ${MIN_MUESTRA} usos. Toca un título para ordenar.</p>
    ${cuerpo}
    <div class="hov-botones"><button class="hd-btn" data-cerrar>Cerrar</button></div>`;
}
