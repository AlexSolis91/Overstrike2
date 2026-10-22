// Pantalla de la Arena (Fase 1): liga y puntos, 5 ataques diarios, equipos de Ataque y Defensa (sin repetir campeones),
// buscar rival (cuenta regresiva de 10 s; por ahora siempre contra una Defensa jugada por la IA), clasificación de liga,
// ranking global, historial de defensas y recompensas. El servidor valida y paga (docs/sql/008_arena.sql).
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import * as D from '../servicios/datos.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, irA } from './menu.js';
import { OFICIALES, porId } from '../datos/personajes/index.js';
import { LIGAS, liga, siguienteLiga, ATAQUES_DIARIOS, CAMPEONES_MINIMOS, BUSQUEDA_SEG, ORO_VICTORIA, SEMANAL, TEMPORADA } from '../datos/arena.js';
import { imgHtml } from './imagenes.js';
import { VERSION } from '../datos/cuenta.js';

const $ = s => document.querySelector(s);
const num = n => Number(n || 0).toLocaleString('es-MX');
let jugar = null, est = null, error = '', pestana = 'arena', ranking = null, historial = null, propios = new Set(), buscando = null;

async function cargar() {
  error = '';
  if (!perfilActual()) { est = null; return; }
  try {
    const [e, col, t] = await Promise.all([D.arenaEstado(), D.miColeccion(), D.arenaMisTitulos().catch(() => [])]);
    est = e; propios = new Set((col || []).map(r => r.campeon)); titulos = t || [];
  } catch (e) { est = null; error = /arena_estado|function/i.test(e?.message || '') ? 'Falta ejecutar docs/sql/008_arena.sql en el servidor.' : D.mensajeError(e); }
}

const TITULO = { 1: '🥇 Campeón', 2: '🥈 Subcampeón', 3: '🥉 Tercer lugar' };
const titulo = t => t ? `<span class="ar-titulo p${t.puesto}" title="${TITULO[t.puesto]} de la Temporada ${t.temporada}">${TITULO[t.puesto]} T${t.temporada}</span>` : '';
let titulos = [];
const insignia = (id, grande = false) => { const l = liga(id); return `<span class="ar-liga ${grande ? 'grande' : ''}" style="--lc:${l.color}">${l.icono} ${l.id}</span>`; };
const fila = ids => `<div class="ar-equipo">${[0, 1, 2, 3, 4].map(i => { const p = porId(ids?.[i]);
  return `<div class="ar-ret ${i === 0 ? 'lider' : ''}" style="--c:${p?.color || '#334155'}">${p ? imgHtml(p.imagen, p.nombre) || p.emoji : '＋'}${i === 0 && p ? '<i>👑</i>' : ''}</div>`; }).join('')}</div>`;

function htmlArena() {
  const l = liga(est.liga), sig = siguienteLiga(est.liga), falta = sig ? Math.max(0, sig.min - est.puntos) : 0;
  const listo = est.defensa?.length === 5 && est.ataque?.length === 5;
  return `<div class="ar-cuerpo">
    <section class="ar-panel ar-principal" style="--lc:${l.color}">
      ${insignia(est.liga, true)}
      ${titulos.length ? `<div class="ar-titulos">${titulos.map(titulo).join('')}</div>` : ''}
      <div class="ar-puntos"><b>${num(est.puntos)}</b> puntos · puesto #${num(est.puesto)}</div>
      ${sig ? `<div class="ar-barra"><i style="width:${Math.min(100, (est.puntos - l.min) / (sig.min - l.min) * 100)}%"></i></div><small>Faltan ${num(falta)} para ${sig.icono} ${sig.id}${sig.nota ? ` (${sig.nota})` : ''}</small>` : ''}
      <div class="ar-diarios"><div>${Array.from({ length: ATAQUES_DIARIOS }, (_, i) => `<span class="${i < est.diarios ? 'on' : ''}">⚔️</span>`).join('')}</div>
        <small>${est.diarios > 0 ? `${est.diarios} ataque(s) diario(s): valen puntos completos` : `Ataques extra: 25% de los puntos (hoy +${est.extra_puntos}/60)`}</small></div>
      <button id="ar-buscar" class="hd-btn ar-buscar" ${listo ? '' : 'disabled'}>🔍 Buscar rival</button>
      ${listo ? '' : '<small>Publica tu Defensa y arma tu Ataque para buscar rival.</small>'}
      <div class="ar-stats">⚔️ ${est.victorias}V / ${est.derrotas}D · 🛡️ ${est.def_victorias}V / ${est.def_derrotas}D · Temporada ${est.temporada} (termina ${new Date(est.fin_temporada + 'T00:00:00').toLocaleDateString('es-MX')})</div>
    </section>
    <section class="ar-panel">
      <h4>⚔️ Equipo de Ataque</h4>${fila(est.ataque)}<button class="eq-btn" data-editar="ataque">Editar Ataque</button>
      <h4>🛡️ Equipo de Defensa</h4>${fila(est.defensa)}<button class="eq-btn" data-editar="defensa">${est.defensa?.length === 5 ? 'Editar Defensa' : 'Publicar Defensa'}</button>
      <p class="tc-tenue">Un campeón no puede estar en los dos equipos. Tu Defensa pelea (con la IA) cuando otros te atacan: cada defensa exitosa te da puntos.</p>
    </section></div>`;
}
function htmlRanking() {
  if (!ranking) return '<p class="tc-vacio">Cargando…</p>';
  const lista = ranking.lista || [];
  return `<p class="tc-nota">${pestana === 'liga' ? `Los mejores de ${insignia(est.liga)}` : 'Ranking global (top 100)'} · tu puesto global: <b>#${num(ranking.puesto)}</b></p>
    ${lista.length ? `<table class="ar-tabla"><tr><th>#</th><th>Jugador</th><th>Liga</th><th>Puntos</th><th>Líder</th><th>V/D</th></tr>
      ${lista.map(r => `<tr class="${r.yo ? 'yo' : ''} ${r.titulo ? 'con-titulo p' + r.titulo.puesto : ''}"><td>${r.puesto}</td><td>${r.nombre} ${titulo(r.titulo)}</td><td>${insignia(r.liga)}</td><td>${num(r.puntos)}</td>
        <td>${porId(r.lider)?.nombre || '—'}</td><td>${r.victorias}/${r.derrotas}</td></tr>`).join('')}</table>` : '<p class="tc-vacio">Todavía no hay jugadores en esta clasificación.</p>'}`;
}
function htmlDefensas() {
  if (!historial) return '<p class="tc-vacio">Cargando…</p>';
  return historial.length ? `<table class="ar-tabla"><tr><th>Atacante</th><th>Resultado</th><th>Puntos</th><th>Cuándo</th><th></th></tr>
    ${historial.map(h => `<tr><td>${h.atacante}</td><td>${h.defendida ? '🛡️ Defendida' : '💥 Derrota'}</td><td>${h.delta_def > 0 ? '+' : ''}${h.delta_def ?? 0}</td>
      <td>${new Date(h.iniciado).toLocaleString('es-MX')}</td>
      <td>${h.puede_vengar ? `<button class="eq-btn" data-vengar="${h.combate}">⚔️ Venganza</button>` : h.vengado ? '✔ Vengado' : ''}</td></tr>`).join('')}</table>
    <p class="tc-tenue">Venganza: ataca a quien venció tu Defensa (una vez por derrota, dentro de 7 días). Cuenta como uno de tus ataques.</p>` : '<p class="tc-vacio">Nadie ha atacado tu Defensa todavía.</p>';
}
function htmlRecompensas() {
  return `<table class="ar-tabla"><tr><th>Liga</th><th>Desde</th><th>Oro por victoria</th><th>Cada semana</th><th>Fin de temporada</th></tr>
    ${LIGAS.map(l => { const s = SEMANAL[l.id]; return `<tr><td>${insignia(l.id)}</td><td>${l.nota ? 'Top 100 · 2,800+' : num(l.min)}</td><td>🪙 ${num(ORO_VICTORIA[l.id])}</td>
      <td>${ICONO_RUNA_PORTAL} ${s.runas} · 🪙 ${num(s.oro)}${s.frag ? ` · 🧩 ${s.frag}` : ''}${s.vales ? ` · 🎟️ ${s.vales}` : ''}</td><td>🪙 ${num(TEMPORADA[l.id])}</td></tr>`; }).join('')}</table>
    <p class="tc-tenue">Temporadas de 4 semanas: al terminar, todos vuelven a 0 puntos. 5 ataques diarios valen puntos completos; los extra, el 25% (tope +60 al día) y 10% del oro.
    Defensa exitosa: +10 (ataque diario) o +3 (extra), tope +100 al día. Si una batalla llega al límite de rondas, gana la Defensa.</p>`;
}

function pintar() {
  const cuerpo = $('#ar-cuerpo');
  $('#ar-tabs').innerHTML = [['arena', '🏟️ Arena'], ['liga', '📊 Mi liga'], ['global', '🌍 Ranking global'], ['defensas', '🛡️ Defensas'], ['recompensas', '🎁 Recompensas']]
    .map(([k, t]) => `<button class="${pestana === k ? 'on' : ''}" data-artab="${k}">${t}</button>`).join('');
  if (!perfilActual()) return (cuerpo.innerHTML = '<p class="tc-vacio">Inicia sesión para jugar la Arena.</p>');
  if (error) return (cuerpo.innerHTML = `<p class="tc-vacio">⚠️ ${error}</p>`);
  if (!est) return (cuerpo.innerHTML = '<p class="tc-vacio">Cargando…</p>');
  if (est.campeones < CAMPEONES_MINIMOS) return (cuerpo.innerHTML = `<p class="tc-vacio">🔒 La Arena se desbloquea con ${CAMPEONES_MINIMOS} campeones (tienes ${est.campeones}). Consíguelos en la Tienda, el Portal o la Campaña.</p>`);
  cuerpo.innerHTML = pestana === 'arena' ? htmlArena() : pestana === 'defensas' ? htmlDefensas() : pestana === 'recompensas' ? htmlRecompensas() : htmlRanking();
}

// Aviso en pantalla (HTML, para poder mostrar imágenes como la Runa de Portal); se cierra con el botón
function avisoHtml(html) {
  const d = document.createElement('div');
  d.className = 'aviso-modal';
  d.innerHTML = `<div class="aviso-caja"><p>${html}</p><button class="eq-listo">Aceptar</button></div>`;
  d.querySelector('button').addEventListener('click', () => d.remove());
  document.body.append(d);
}

function mostrarAvisos() {
  for (const a of est?.avisos || []) {
    const txt = a.tipo === 'temporada' ? `🏁 Temporada ${a.temporada} terminada en ${liga(a.liga).icono} ${a.liga}: +🪙 ${num(a.oro)}${a.puesto ? ` · ¡${TITULO[a.puesto]} de la temporada!` : ''}`
      : `📅 Recompensa semanal (${liga(a.liga).icono} ${a.liga}): ${ICONO_RUNA_PORTAL} ${a.runas} · 🪙 ${num(a.oro)}${a.fragmentos ? ` · 🧩 ${a.fragmentos}` : ''}${a.vales ? ` · 🎟️ ${a.vales}` : ''}`;
    avisoHtml(txt);
  }
}

export async function abrirArena() {
  pintar();
  await cargar();
  pintar(); mostrarAvisos();
}

async function cambiarPestana(k) {
  pestana = k; pintar();
  try {
    if (k === 'liga' || k === 'global') { ranking = null; pintar(); ranking = await D.arenaRanking(k === 'liga' ? est.liga : null); }
    if (k === 'defensas') { historial = null; pintar(); historial = await D.arenaHistorial(); }
  } catch (e) { error = D.mensajeError(e); }
  pintar();
}

function editar(tipo) {
  const otro = new Set(tipo === 'ataque' ? est.defensa : est.ataque);
  const disponibles = new Set([...propios].filter(id => !otro.has(id)));
  equipoCampana({
    titulo: tipo === 'ataque' ? '⚔️ Arena · equipo de Ataque' : '🛡️ Arena · equipo de Defensa', rivales: [], propios: disponibles, sinRival: true, volverTxt: '← Arena',
    inicial: (tipo === 'ataque' ? est.ataque : est.defensa).map(porId).filter(Boolean),
    alVolver: () => irA('arena'),
    alListo: async eq => {
      try { await D.arenaGuardarEquipo(tipo, eq.map(p => p.id)); } catch (e) { alert(D.mensajeError(e)); }
      irA('arena');
    },
  });
}

// Buscar rival: cuenta regresiva de 10 s (en la Fase 2 aquí entra el combate en vivo); luego, una Defensa jugada por la IA
async function buscar() {
  if (buscando) return;
  const caja = document.createElement('div');
  caja.id = 'ar-busqueda';
  caja.innerHTML = `<div class="hov-caja"><h2>🔍 Buscando rival…</h2><div class="ar-cuenta">${BUSQUEDA_SEG}</div><div class="hov-sub">Buscando jugadores de tu nivel</div>
    <div class="hov-botones"><button class="hd-btn sec" data-cancelar>Cancelar</button></div></div>`;
  document.body.appendChild(caja);
  let n = BUSQUEDA_SEG, cancelado = false;
  caja.addEventListener('click', e => { if (e.target.closest('[data-cancelar]')) { cancelado = true; } });
  buscando = true;
  let vivo = null, sinVivo = false;
  while (n > 0 && !cancelado && !vivo) {                     // cada segundo: ¿alguien más busca ahora? → partida en vivo
    try { const m = await D.arenaVivoBuscar(est.ataque, VERSION); if (m?.partida) vivo = m; }
    catch (e) { if (/arena_vivo|function/i.test(e?.message || '')) sinVivo = true; else { caja.remove(); buscando = null; return alert(D.mensajeError(e)); } }
    if (vivo) break;
    await new Promise(r => setTimeout(r, 1000)); n--; const c = caja.querySelector('.ar-cuenta'); if (c) c.textContent = n;
  }
  if (!vivo && !sinVivo) { try { const m = await D.arenaVivoCancelar(); if (m?.partida) vivo = m; } catch (e) { /* sigue contra una Defensa */ } }
  if (cancelado && !vivo) { caja.remove(); buscando = null; return; }
  if (vivo) {
    caja.remove(); buscando = null;
    return jugar(vivo.mio.map(porId), vivo.suyo.map(porId), { semilla: vivo.semilla, invertido: vivo.soy === 'b',
      arena: { vivo: true, partida: vivo.partida, soy: vivo.soy, rival: vivo.rival, equipoMio: vivo.equipo_mio, equipoRival: vivo.equipo_suyo } });
  }
  caja.querySelector('h2').textContent = '⚔️ ¡Rival encontrado!'; caja.querySelector('.ar-cuenta').textContent = '';
  let r;
  try { r = await D.arenaAtacar(est.ataque, VERSION); } catch (e) { caja.remove(); buscando = null; return alert(D.mensajeError(e)); }
  caja.remove(); buscando = null;
  pelear(r);
}
// Contra una Defensa (búsqueda o Venganza): la Defensa de práctica usa el equipo de la ficha de cada campeón
function pelear(r) {
  jugar(est.ataque.map(porId), r.rival.defensa.map(porId), { semilla: r.semilla,
    arena: { combate: r.combate, diario: r.diario, bot: r.bot, rival: r.rival, equipoRival: r.equipo_rival || null, venganza: !!r.venganza } });
}
async function vengar(combate) {
  if (est.ataque?.length !== 5) return alert('Primero arma tu equipo de Ataque.');
  if (!confirm('¿Atacar a este jugador con tu equipo de Ataque? (cuenta como uno de tus ataques)')) return;
  try { pelear(await D.arenaVenganza(combate, est.ataque, VERSION)); } catch (e) { alert(D.mensajeError(e)); }
}

export function iniciarArena(opc) {
  jugar = opc.jugar;
  $('#ar-volver').addEventListener('click', () => irA('menu'));
  $('#pantalla-arena').addEventListener('click', e => {
    const t = e.target.closest('[data-artab]'); if (t) return cambiarPestana(t.dataset.artab);
    const ed = e.target.closest('[data-editar]'); if (ed) return editar(ed.dataset.editar);
    const vg = e.target.closest('[data-vengar]'); if (vg) return vengar(vg.dataset.vengar);
    if (e.target.closest('#ar-buscar')) return buscar();
  });
}
