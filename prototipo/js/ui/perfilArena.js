// Perfil de Arena de un jugador (docs/sql/043_notificaciones_perfil.sql): nickname, Elo y liga, victorias y derrotas,
// mejor récord, títulos de Campeón/Subcampeón y Poder de equipo (Ataque + Defensa). Se abre tocando un nombre.
import * as D from '../servicios/datos.js';
import { liga } from '../datos/arena.js';
import { poderEquipo, formatoPoder } from '../motor/poder.js';

const num = n => Number(n || 0).toLocaleString('es-MX');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TITULO = { 1: '🥇 Campeón', 2: '🥈 Subcampeón' };

function html(p) {
  const l = liga(p.liga);
  const atk = p.ataque?.length === 5 ? poderEquipo(p.ataque, p.equipo_atk) : 0, def = p.defensa?.length === 5 ? poderEquipo(p.defensa, p.equipo_def) : 0;
  const pct = (v, d) => v + d ? ` <small>(${Math.round(v / (v + d) * 100)}%)</small>` : '';
  return `<div class="pf-caja" role="dialog" aria-label="Perfil de ${esc(p.nombre)}" style="--lc:${l.color}">
    <button class="nt-x" data-cerrar title="Cerrar" aria-label="Cerrar">✕</button>
    <div class="pf-cab"><div class="pf-avatar">${esc(p.nombre).slice(0, 1).toUpperCase()}</div>
      <div><h3>${esc(p.nombre)}</h3><span class="ar-liga" style="--lc:${l.color}">${l.icono} ${l.id}</span> <b class="pf-elo">${num(p.puntos)}</b> <small>pts · #${num(p.puesto)}</small></div></div>
    ${p.titulos?.length ? `<div class="pf-titulos">${p.titulos.map(t => `<span class="ar-titulo p${t.puesto}">${TITULO[t.puesto]} T${t.temporada}</span>`).join('')}</div>` : ''}
    <div class="pf-poder"><small>Poder de equipo</small><b>${formatoPoder(atk + def)}</b><span>⚔️ Ataque ${num(atk)} · 🛡️ Defensa ${num(def)}</span></div>
    <dl class="pf-datos">
      <div><dt>Temporada ${p.temporada}</dt><dd>${num(p.victorias)} V · ${num(p.derrotas)} D${pct(p.victorias, p.derrotas)}</dd></div>
      <div><dt>Total en Arena</dt><dd>${num(p.total_v)} V · ${num(p.total_d)} D${pct(p.total_v, p.total_d)}</dd></div>
      <div><dt>Mejor récord</dt><dd>🏅 ${num(p.mejor)} pts</dd></div>
    </dl></div>`;
}

export async function abrirPerfil(nombre) {
  document.querySelector('#perfil-arena')?.remove();
  const m = document.createElement('div');
  m.id = 'perfil-arena'; m.className = 'aviso-modal';
  m.innerHTML = '<div class="pf-caja"><p class="tc-vacio">Cargando…</p></div>';
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-cerrar]')) m.remove(); });
  document.body.append(m);
  try { m.innerHTML = html(await D.arenaPerfil(nombre)); }
  catch (e) {
    const msg = /arena_perfil|function/i.test(e?.message || '') ? 'Falta ejecutar docs/sql/043_notificaciones_perfil.sql en el servidor.' : D.mensajeError(e);
    m.innerHTML = `<div class="pf-caja"><button class="nt-x" data-cerrar aria-label="Cerrar">✕</button><p class="tc-vacio">⚠️ ${esc(msg)}</p></div>`;
  }
}
