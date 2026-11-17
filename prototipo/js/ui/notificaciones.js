// Notificaciones (docs/sql/043_notificaciones_perfil.sql): ataques a tu Defensa, recompensas de la Arena y cambios de liga.
//   · Ventana abajo a la derecha (en cualquier pantalla): llega en vivo por Supabase Realtime, dura ~7 s (se queda quieta
//     con el mouse encima), se apilan hasta 3 y tocarla abre el registro.
//   · Al volver al juego: si te atacaron varias veces mientras no estabas, un solo resumen.
//   · Registro 🔔 en el lobby: últimas 50 (30 días), pestañas Todas / Arena / Recompensas, con Ver repetición y Vengar.
import * as D from '../servicios/datos.js';
import { supabase } from '../servicios/supabase.js';
import { perfilActual } from './cuenta.js';
import { liga } from '../datos/arena.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { sonar } from './audio.js';
import { abrirPerfil } from './perfilArena.js';
import { verRepeticion, vengarCombate } from './arena.js';

const $ = s => document.querySelector(s);
const num = n => Number(n || 0).toLocaleString('es-MX');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DURACION = 7000, MAX_VISIBLES = 3;
const TITULO = { 1: '🥇 Campeón', 2: '🥈 Subcampeón', 3: '🥉 Tercer lugar' };
const GRUPO = { defensa: 'arena', liga: 'arena', semana: 'recompensas', temporada: 'recompensas' };

let lista = [], noLeidas = 0, canal = null, pestana = 'todas', jugadorId = null;

// ---------------------------------------------------------------- textos
const nombreJ = n => `<b class="nt-jug" data-perfil="${esc(n)}">${esc(n)}</b>`;
const insignia = id => { const l = liga(id); return `<span class="ar-liga" style="--lc:${l.color}">${l.icono} ${esc(l.id)}</span>`; };
export function textoNotificacion(n) {
  const d = n.datos || {};
  switch (n.tipo) {
    case 'defensa': {
      const pts = d.delta ? ` <em class="${d.delta > 0 ? 'nt-mas' : 'nt-menos'}">${d.delta > 0 ? '+' : '−'}${Math.abs(d.delta)} pts</em>` : '';
      return { icono: d.cayo ? '💥' : '🛡️', html: (d.cayo ? `Tu Defensa cayó ante ${nombreJ(d.atacante)}` : `Tu Defensa resistió el ataque de ${nombreJ(d.atacante)}`)
        + (d.venganza ? ' <small>(Venganza)</small>' : '') + pts };
    }
    case 'liga': return { icono: d.sube ? '⬆️' : '⬇️', html: d.sube ? `¡Subiste a ${insignia(d.a)}!` : `Bajaste a ${insignia(d.a)}` };
    case 'semana': return { icono: '📅', html: `Recompensa semanal (${insignia(d.liga)}): ${ICONO_RUNA_PORTAL} ${d.runas} · 🪙 ${num(d.oro)}${d.fragmentos ? ` · 🧩 ${d.fragmentos}` : ''}${d.vales ? ` · 🎟️ ${d.vales}` : ''}` };
    case 'temporada': return { icono: '🏁', html: `Temporada ${d.temporada} terminada en ${insignia(d.liga)}: +🪙 ${num(d.oro)}${d.polvo_estelar ? ` · +${d.polvo_estelar} <img class="ico-runa" src="assets/items/polvoEstelar.webp" alt="Polvo Estelar"> Polvo Estelar` : ''}${d.puesto ? ` · ¡${TITULO[d.puesto]} de la temporada!` : ''}` };
    default: return { icono: '🔔', html: 'Notificación' };
  }
}
function hace(fecha) {
  const s = Math.max(0, (Date.now() - new Date(fecha)) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------- ventana emergente (abajo a la derecha)
function contenedor() {
  let c = $('#notif-toasts');
  if (!c) { c = document.createElement('div'); c.id = 'notif-toasts'; c.setAttribute('aria-live', 'polite'); document.body.append(c); }
  return c;
}
function toast({ icono, html }, { sonido = true } = {}) {
  const c = contenedor();
  const visibles = [...c.querySelectorAll('.nt-toast:not(.nt-mas-toast):not(.sale)')];
  if (visibles.length >= MAX_VISIBLES) {                         // más de 3: se agrupan en "+N notificaciones más"
    let mas = c.querySelector('.nt-mas-toast');
    if (!mas) { mas = document.createElement('div'); mas.className = 'nt-toast nt-mas-toast'; mas.dataset.n = '0'; c.append(mas); vida(mas); }
    mas.dataset.n = String(Number(mas.dataset.n) + 1);
    mas.innerHTML = `<span class="nt-ico">🔔</span><div>+${mas.dataset.n} ${mas.dataset.n === '1' ? 'notificación' : 'notificaciones'} más</div>`;
    return;
  }
  const t = document.createElement('div');
  t.className = 'nt-toast';
  t.innerHTML = `<span class="nt-ico">${icono}</span><div>${html}</div><button class="nt-x" title="Cerrar" aria-label="Cerrar">✕</button>`;
  c.insertBefore(t, c.querySelector('.nt-mas-toast'));
  vida(t);
  if (sonido) sonar('mensajePrivado');
}
function vida(t) {                                               // ~7 s; con el mouse encima se queda quieta
  let quedan = DURACION, desde = Date.now(), reloj = null;
  const irse = () => { t.classList.add('sale'); setTimeout(() => t.remove(), 350); };
  const correr = () => { desde = Date.now(); reloj = setTimeout(irse, quedan); };
  t.addEventListener('mouseenter', () => { clearTimeout(reloj); quedan -= Date.now() - desde; });
  t.addEventListener('mouseleave', correr);
  t.addEventListener('click', e => { clearTimeout(reloj); irse(); if (!e.target.closest('.nt-x')) abrirRegistro(); });
  correr();
}

// ---------------------------------------------------------------- registro 🔔 (lobby)
function pintarBadge() {
  const b = $('#notif-badge'), btn = $('#btn-notif');
  if (!btn) return;
  btn.classList.toggle('hidden', !perfilActual());
  b.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
  b.classList.toggle('hidden', !noLeidas);
}
function htmlRegistro() {
  const filtrada = lista.filter(n => pestana === 'todas' || GRUPO[n.tipo] === pestana);
  const tabs = [['todas', 'Todas'], ['arena', '🏟️ Arena'], ['recompensas', '🎁 Recompensas']]
    .map(([k, t]) => `<button class="${pestana === k ? 'on' : ''}" data-ntab="${k}">${t}</button>`).join('');
  const filas = filtrada.map(n => {
    const t = textoNotificacion(n);
    const acc = n.tipo === 'defensa' ? `${n.repeticion ? `<button class="eq-btn" data-repeticion="${n.datos.combate}">▶ Repetición</button>` : ''}${n.puede_vengar ? `<button class="eq-btn" data-vengar="${n.datos.combate}">⚔️ Vengar</button>` : ''}` : '';
    return `<li class="${n.leida ? '' : 'nueva'}"><span class="nt-ico">${t.icono}</span><div class="nt-txt">${t.html}<small>${hace(n.creada)}</small></div>${acc ? `<div class="nt-acc">${acc}</div>` : ''}</li>`;
  }).join('');
  return `<div class="nt-caja" role="dialog" aria-label="Notificaciones"><header><h3>🔔 Notificaciones</h3><button class="nt-x" data-cerrar title="Cerrar" aria-label="Cerrar">✕</button></header>
    <nav class="nt-tabs">${tabs}</nav>
    ${filas ? `<ul class="nt-lista">${filas}</ul>` : '<p class="tc-vacio">No tienes notificaciones.</p>'}
    <p class="tc-tenue">Se guardan las últimas 50 durante 30 días.</p></div>`;
}
function pintarRegistro() { const r = $('#notif-registro'); if (r) r.innerHTML = htmlRegistro(); }
export async function abrirRegistro() {
  if (!perfilActual()) return;
  let r = $('#notif-registro');
  if (!r) {
    r = document.createElement('div'); r.id = 'notif-registro'; r.className = 'aviso-modal';
    r.addEventListener('click', alClicRegistro);
    document.body.append(r);
  }
  pintarRegistro();
  try { await cargar(); } catch (e) { /* sin el SQL 043 */ }
  pintarRegistro();
  if (noLeidas) {
    const ids = lista.filter(n => !n.leida).map(n => n.id);
    D.leerNotificaciones(null).catch(() => null);
    noLeidas = 0; pintarBadge();
    setTimeout(() => { for (const n of lista) if (ids.includes(n.id)) n.leida = true; }, 0);   // se ven resaltadas esta vez
  }
}
const cerrarRegistro = () => $('#notif-registro')?.remove();
async function alClicRegistro(e) {
  const r = e.currentTarget;
  if (e.target === r || e.target.closest('[data-cerrar]')) return cerrarRegistro();
  const t = e.target.closest('[data-ntab]'); if (t) { pestana = t.dataset.ntab; return pintarRegistro(); }
  const p = e.target.closest('[data-perfil]'); if (p) return abrirPerfil(p.dataset.perfil);
  const rp = e.target.closest('[data-repeticion]'); if (rp) { cerrarRegistro(); return verRepeticion(rp.dataset.repeticion, 'menu'); }
  const vg = e.target.closest('[data-vengar]'); if (vg) { cerrarRegistro(); return vengarCombate(vg.dataset.vengar); }
}

// ---------------------------------------------------------------- datos y tiempo real
async function cargar() {
  const r = await D.notificaciones();
  lista = r?.lista || []; noLeidas = r?.no_leidas || 0;
  pintarBadge();
}
const claveVista = () => `os2-notif-vista-${jugadorId}`;
function leerVista() { try { return Number(localStorage.getItem(claveVista())) || 0; } catch { return 0; } }
function guardarVista(id) { try { localStorage.setItem(claveVista(), String(id)); } catch { /* sin almacenamiento */ } }

// Al entrar: lo que llegó mientras no estabas (sin repetir lo que ya se mostró en este dispositivo)
function resumenAlVolver() {
  const vista = leerVista();
  const nuevas = lista.filter(n => !n.leida && n.id > vista);
  if (lista.length) guardarVista(Math.max(vista, ...lista.map(n => n.id)));
  if (!nuevas.length) return;
  const def = nuevas.filter(n => n.tipo === 'defensa'), otras = nuevas.filter(n => n.tipo !== 'defensa');
  if (def.length === 1) toast(textoNotificacion(def[0]));
  else if (def.length > 1) {
    const cayo = def.filter(n => n.datos?.cayo).length;
    toast({ icono: '🛡️', html: `Mientras no estabas: tu Defensa fue atacada <b>${def.length} veces</b> (resistió ${def.length - cayo}, cayó ${cayo})` });
  }
  for (const n of otras.slice(0, 2).reverse()) toast(textoNotificacion(n), { sonido: false });
}

function alLlegar(fila) {
  if (!fila || fila.jugador !== jugadorId || lista.some(n => n.id === fila.id)) return;
  const n = { ...fila, puede_vengar: fila.tipo === 'defensa' && !!fila.datos?.cayo, repeticion: fila.tipo === 'defensa' };
  lista.unshift(n); lista = lista.slice(0, 50);
  noLeidas++; pintarBadge(); guardarVista(n.id);
  toast(textoNotificacion(n));
  if ($('#notif-registro')) pintarRegistro();
}

async function conectar() {
  if (canal) { const sb = await supabase().catch(() => null); sb?.removeChannel(canal); canal = null; }
  lista = []; noLeidas = 0;
  const p = perfilActual();
  jugadorId = p?.id || null;
  pintarBadge();
  if (!p) return;
  try { await cargar(); } catch (e) { return; }                   // sin el SQL 043 todavía: nada
  if (jugadorId !== p.id) return;
  resumenAlVolver();
  const sb = await supabase();
  canal = sb.channel(`notif-${p.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `jugador=eq.${p.id}` }, x => alLlegar(x.new))
    .subscribe();
}

export function iniciarNotificaciones() {
  $('#btn-notif')?.addEventListener('click', abrirRegistro);
  addEventListener('cuenta:cambio', conectar);
  if (perfilActual()) conectar();
  window.__os2 ||= {};                                           // pruebas: ver la ventana sin servidor
  window.__os2.notificacionPrueba = n => alLlegar({ id: Date.now(), jugador: jugadorId, leida: false, creada: new Date().toISOString(), ...n });
}
