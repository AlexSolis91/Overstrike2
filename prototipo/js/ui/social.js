// Panel social del menú: jugadores en línea, chat global e individual, y desafíos amistosos en vivo.
// Realtime da los avisos al instante; social_latido (cada 15 s, o 3 s con un desafío activo) los entrega igual si Realtime falla.
import * as D from '../servicios/datos.js';
import { supabase } from '../servicios/supabase.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, equipoElegido, irA } from './menu.js';
import { porId } from '../datos/personajes/index.js';
import { VERSION } from '../datos/cuenta.js';
import { sonar } from './audio.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const POR_ATENDER = ['pendiente', 'equipos'];   // uno ya en 'listo' solo se retoma si este dispositivo lo venía siguiendo
const SEG_RESPUESTA = 30, SEG_EQUIPO = 60;
let jugar = null;
let canal = null, reloj = null, latiendo = false;
let jugadores = [];
let sala = 'global';                       // 'global' o el id del otro jugador
let salas = new Map();                     // id → { nombre, no_leidos } (conversaciones privadas abiertas)
let mensajes = new Map();                  // 'global' | id → [mensajes]
let ultimoGlobal = 0, sinLeerGlobal = 0;
let des = null;                            // desafío activo
let enEquipo = false, relojEquipo = null, relojAviso = null;
const atendidos = new Set();               // `${id}:${estado}` ya procesados
let peleados = new Set();                  // ids de desafíos que ya entraron a la batalla

// Minimizar el panel: se recuerda en este dispositivo. En pantalla chica el panel se abre encima, y no se recuerda abierto.
function minimizarSocial(min) {
  document.body.classList.toggle('social-abierto', !min);
  document.body.classList.toggle('social-min', min);
  try { localStorage.setItem('os2-social-min', min ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
}
const miId = () => perfilActual()?.id;
const estadoLocal = () => document.body.dataset.pantalla === 'partida' ? 'combate' : 'libre';
const rivalDe = d => d.soy === 'a' ? d.para_nombre : d.de_nombre;
const mensajeError = e => D.mensajeError(e);

// ---------------------------------------------------------------- panel
function pintarJugadores() {
  const lista = $('#soc-jug');
  if (!lista) return;
  $('#soc-n').textContent = jugadores.length;
  lista.innerHTML = jugadores.length ? jugadores.map(j => `<li class="soc-j ${j.estado}">
      <i class="soc-punto"></i><span class="soc-nom" title="${esc(j.nombre)}">${esc(j.nombre)}${j.estado === 'combate' ? '<small>En combate</small>' : ''}</span>
      <button data-chat="${esc(j.id)}" title="Chat individual">💬</button>
      <button class="soc-reto" data-reto="${esc(j.id)}" ${j.estado === 'combate' || des ? 'disabled' : ''}>⚔️ Desafiar</button></li>`).join('')
    : '<li class="soc-vacio">No hay otros jugadores en línea.</li>';
}
function pintarTabs() {
  const privadas = [...salas].map(([id, s]) => `<button class="soc-tab ${sala === id ? 'on' : ''}" data-sala="${esc(id)}">${esc(s.nombre)}${s.no_leidos ? `<b>${s.no_leidos}</b>` : ''}<i data-cerrar="${esc(id)}" title="Cerrar">✕</i></button>`).join('');
  $('#soc-tabs').innerHTML = `<button class="soc-tab ${sala === 'global' ? 'on' : ''}" data-sala="global">🌐 Global${sinLeerGlobal ? `<b>${sinLeerGlobal}</b>` : ''}</button>${privadas}`;
  const total = sinLeerGlobal + [...salas.values()].reduce((s, x) => s + x.no_leidos, 0);
  const b = $('#soc-badge'); b.textContent = total; b.classList.toggle('hidden', !total);
}
const hora = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function pintarMensajes() {
  const caja = $('#soc-msgs');
  const lista = mensajes.get(sala) || [];
  caja.innerHTML = lista.length ? lista.map(m => `<p class="soc-m ${m.de === miId() ? 'mio' : ''}"><span><b>${esc(m.de_nombre)}</b><time>${hora(m.creado)}</time></span>${esc(m.texto)}</p>`).join('')
    : `<p class="soc-vacio">${sala === 'global' ? 'Sé el primero en escribir.' : 'Todavía no hay mensajes.'}</p>`;
  caja.scrollTop = caja.scrollHeight;
}
function pintarPanel() {
  const con = !!perfilActual();
  $('#soc-sin').classList.toggle('hidden', con);
  $('#soc-con').classList.toggle('hidden', !con);
  if (!con) return;
  pintarJugadores(); pintarTabs(); pintarMensajes();
}
const panelVisible = () => document.body.dataset.pantalla === 'menu' && (getComputedStyle($('#social')).display !== 'none');   // minimizado: los mensajes cuentan como no leídos

async function abrirSala(id, nombre) {
  sala = id;
  if (id === 'global') sinLeerGlobal = 0;
  else {
    if (!salas.has(id)) salas.set(id, { nombre, no_leidos: 0 });
    const s = salas.get(id); s.no_leidos = 0;
    D.chatLeer(id).catch(() => null);
  }
  pintarTabs(); pintarMensajes();
  try { mensajes.set(id, await D.chatHistorial(id === 'global' ? null : id)); if (sala === id) pintarMensajes(); } catch (e) { /* se reintenta con el latido */ }
  $('#soc-texto').focus();
}
function agregarMensaje(m) {
  const id = m.para ? (m.de === miId() ? m.para : m.de) : 'global';
  const lista = mensajes.get(id) || [];
  if (lista.some(x => x.id === m.id)) return;
  lista.push(m); if (lista.length > 100) lista.shift();
  mensajes.set(id, lista);
  if (id === 'global') ultimoGlobal = Math.max(ultimoGlobal, m.id);
  if (m.de !== miId()) {
    if (id !== 'global' && !salas.has(id)) salas.set(id, { nombre: m.de_nombre, no_leidos: 0 });
    if (sala === id && panelVisible()) { if (id !== 'global') D.chatLeer(id).catch(() => null); }
    else if (id === 'global') sinLeerGlobal++;
    else { salas.get(id).no_leidos++; sonar('curacion'); }
  }
  pintarTabs();
  if (sala === id) pintarMensajes();
}
async function enviarChat(e) {
  e.preventDefault();
  const inp = $('#soc-texto'), texto = inp.value.trim();
  if (!texto) return;
  inp.value = '';
  try { agregarMensaje(await D.chatEnviar(sala === 'global' ? null : sala, texto)); }
  catch (err) { inp.value = texto; aviso(mensajeError(err)); }
}

// ---------------------------------------------------------------- avisos
function aviso(texto, segundos = 4) {
  const t = document.createElement('div');
  t.className = 'soc-toast'; t.textContent = texto;
  $('#soc-toasts').append(t);
  setTimeout(() => t.remove(), segundos * 1000);
}
function pintarAviso() {
  const caja = $('#desafio-aviso');
  clearInterval(relojAviso); relojAviso = null;
  if (!des || des.estado !== 'pendiente' && !(des.estado === 'equipos' && des.yo_elegi)) return caja.classList.add('hidden');
  const nombre = esc(rivalDe(des));
  if (des.estado === 'equipos') {
    caja.innerHTML = `<p>⏳ Esperando a que <b>${nombre}</b> elija su equipo…</p><div class="da-bot"><button class="eq-btn" data-da="cancelar">Cancelar desafío</button></div>`;
    return caja.classList.remove('hidden');
  }
  const hasta = Date.now() + Math.max(1, Math.min(SEG_RESPUESTA, (new Date(des.expira) - Date.now()) / 1000)) * 1000;
  caja.innerHTML = des.soy === 'b'
    ? `<p>⚔️ El jugador <b>${nombre}</b> te ha desafiado a un combate</p><div class="da-barra"><i></i></div><div class="da-bot"><button class="eq-listo" data-da="aceptar">Aceptar</button><button class="eq-btn" data-da="rechazar">Rechazar</button></div>`
    : `<p>⚔️ Desafiaste a <b>${nombre}</b>. Esperando su respuesta…</p><div class="da-barra"><i></i></div><div class="da-bot"><button class="eq-btn" data-da="cancelar">Cancelar</button></div>`;
  caja.classList.remove('hidden');
  const barra = caja.querySelector('.da-barra i');
  const tic = () => { barra.style.width = `${Math.max(0, (hasta - Date.now()) / (SEG_RESPUESTA * 10))}%`; if (Date.now() >= hasta) { clearInterval(relojAviso); relojAviso = null; latido(); } };
  tic(); relojAviso = setInterval(tic, 250);
}
function cerrarVentanas() {
  for (const id of ['tc', 'misiones', 'cuenta', 'guia', 'ajustes', 'starter', 'ficha']) document.getElementById(id)?.classList.add('hidden');
}

// ---------------------------------------------------------------- desafíos
function terminarEleccion() {
  clearInterval(relojEquipo); relojEquipo = null;
  $('#desafio-reloj').classList.add('hidden');
  const estaba = enEquipo; enEquipo = false;
  return estaba;
}
function soltarDesafio(texto) {
  const estaba = terminarEleccion();
  des = null; pintarAviso(); pintarJugadores(); programarLatido();
  if (estaba && document.body.dataset.pantalla === 'equipo') irA('menu');
  if (texto) aviso(texto, 5);
}
// Un cambio de estado del desafío, venga de Realtime, del latido o de una respuesta
async function alDesafio(d) {
  if (!d) return;
  if (d.soy == null) d = { ...d, soy: d.de === miId() ? 'a' : 'b' };
  if (peleados.has(d.id)) return;
  if (des && des.id !== d.id) return;
  if (!des && !POR_ATENDER.includes(d.estado)) return;
  const clave = `${d.id}:${d.estado}:${d.yo_elegi ? 1 : 0}`;
  if (atendidos.has(clave) && des?.id === d.id && des.estado === d.estado) return;
  atendidos.add(clave);
  const nuevo = !des;
  des = { ...des, ...d };
  programarLatido();
  pintarJugadores();
  switch (d.estado) {
    case 'pendiente':
      if (des.soy === 'b' && estadoLocal() === 'combate') { D.desafioResponder(d.id, false, VERSION).catch(() => null); return soltarDesafio(); }
      if (nuevo && des.soy === 'b') sonar('escudo');
      return pintarAviso();
    case 'equipos':
      pintarAviso();
      if (!des.yo_elegi && !enEquipo) abrirEleccion();
      return;
    case 'listo': {
      const datos = d.mio ? d : await D.desafioDatos(d.id);
      return iniciarBatalla(datos);
    }
    case 'rechazado': return soltarDesafio(des.soy === 'a' ? `${rivalDe(des)} rechazó tu desafío.` : '');
    case 'expirado': return soltarDesafio(des.soy === 'a' ? `${rivalDe(des)} no respondió a tiempo.` : 'El desafío expiró.');
    case 'cancelado': return soltarDesafio('El desafío se canceló.');
    case 'version': return soltarDesafio('Tienen versiones distintas del juego: los dos deben recargar la página.');
    case 'terminado': return soltarDesafio();
  }
}
async function abrirEleccion() {
  enEquipo = true; cerrarVentanas();
  let propios;
  try { propios = new Set((await D.miColeccion() || []).map(r => r.campeon)); }
  catch (e) { enEquipo = false; aviso(mensajeError(e)); return cancelarDesafio(); }
  if (!des || des.estado !== 'equipos') { enEquipo = false; return; }
  const rival = rivalDe(des);
  equipoCampana({ titulo: `⚔️ Desafío contra ${rival}`, rivales: [], propios, sinRival: true, volverTxt: '✕ Cancelar desafío',
    alListo: eq => enviarEquipo(eq.map(p => p.id)), alVolver: cancelarDesafio });
  const hasta = des.equipos_hasta ? Math.min(new Date(des.equipos_hasta).getTime(), Date.now() + SEG_EQUIPO * 1000) : Date.now() + SEG_EQUIPO * 1000;
  const r = $('#desafio-reloj');
  const tic = () => {
    const s = Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
    r.textContent = `⏱️ Elige tu equipo: ${s} s`;
    if (s <= 0) { clearInterval(relojEquipo); relojEquipo = null; completarEquipo(propios); }
  };
  r.classList.remove('hidden'); tic(); relojEquipo = setInterval(tic, 500);
}
// Se acabó el tiempo: lo que llevaba elegido, luego su equipo de Ataque de la Arena y luego campeones suyos al azar
async function completarEquipo(propios) {
  const ids = equipoElegido().map(p => p.id);
  try { for (const id of (await D.arenaEstado())?.ataque || []) if (propios.has(id) && !ids.includes(id)) ids.push(id); } catch (e) { /* sin Arena: al azar */ }
  for (const id of [...propios].sort(() => Math.random() - .5)) if (!ids.includes(id)) ids.push(id);
  enviarEquipo(ids.slice(0, 5));
}
async function enviarEquipo(ids) {
  terminarEleccion();
  try {
    const d = await D.desafioEquipo(des.id, ids);
    des = { ...des, ...d };
    if (d.estado !== 'listo') irA('menu');
    alDesafio(d); pintarAviso();
  } catch (e) { soltarDesafio(mensajeError(e)); }
}
async function cancelarDesafio() {
  if (!des) return irA('menu');
  const id = des.id;
  soltarDesafio();
  irA('menu');
  D.desafioCancelar(id).catch(() => null);
}
function iniciarBatalla(d) {
  if (peleados.has(d.id)) return;
  peleados.add(d.id);
  terminarEleccion(); cerrarVentanas();
  const rival = rivalDe(des || d);
  des = null; pintarAviso(); programarLatido();
  jugar(d.mio.map(porId), d.suyo.map(porId), { semilla: d.semilla, invertido: d.soy === 'b',
    arena: { vivo: true, amistoso: true, partida: d.id, soy: d.soy, rival: { nombre: rival }, equipoMio: d.equipo_mio, equipoRival: d.equipo_suyo } });
}
async function desafiar(id) {
  if (des) return;
  try { const d = await D.desafioEnviar(id, VERSION); alDesafio(d); }
  catch (e) { aviso(mensajeError(e)); latido(); }
}
async function responder(aceptar) {
  if (!des) return;
  const id = des.id;
  $('#desafio-aviso').classList.add('hidden');
  try { const d = await D.desafioResponder(id, aceptar, VERSION); alDesafio(d); }
  catch (e) { soltarDesafio(mensajeError(e)); }
}

// ---------------------------------------------------------------- latido y Realtime
async function latido() {
  if (!perfilActual() || latiendo) return;
  latiendo = true;
  try {
    const r = await D.socialLatido(estadoLocal());
    jugadores = r.jugadores || [];
    if (des && r.desafio?.id !== des.id) await alDesafio(await D.desafioDatos(des.id));   // terminó y ya no sale como activo
    else if (r.desafio && !peleados.has(r.desafio.id)) await alDesafio(r.desafio);
    pintarJugadores();
    if ((r.ultimo_global || 0) > ultimoGlobal) {                                 // llegó algo que Realtime no entregó
      const lista = await D.chatHistorial(null);
      for (const m of lista) agregarMensaje(m);
    }
    for (const n of r.no_leidos || []) {
      if (!salas.has(n.de)) salas.set(n.de, { nombre: n.de_nombre, no_leidos: 0 });
      if (sala === n.de && panelVisible()) { mensajes.set(n.de, await D.chatHistorial(n.de)); D.chatLeer(n.de).catch(() => null); pintarMensajes(); }
      else if (salas.get(n.de).no_leidos !== n.n) { salas.get(n.de).no_leidos = n.n; mensajes.delete(n.de); }
    }
    pintarTabs();
  } catch (e) { /* sin conexión o sin el SQL 024: se reintenta en el siguiente latido */ }
  latiendo = false;
}
function programarLatido() {
  clearInterval(reloj);
  if (perfilActual()) reloj = setInterval(latido, des ? 3000 : 15000);
}
async function conectar() {
  desconectar();
  if (!perfilActual()) return pintarPanel();
  pintarPanel();
  try {
    const [g, c] = await Promise.all([D.chatHistorial(null), D.chatConversaciones()]);
    mensajes.set('global', g); ultimoGlobal = g.length ? g[g.length - 1].id : 0;
    for (const x of c) salas.set(x.con, { nombre: x.nombre, no_leidos: x.no_leidos });
    pintarPanel();
  } catch (e) { /* sin el SQL 024 todavía */ }
  programarLatido(); latido();
  const sb = await supabase();
  canal = sb.channel(`social-${miId()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' }, p => agregarMensaje(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'desafios' }, p => { if (p.new?.id) alDesafio(p.new); })
    .subscribe();
}
function desconectar() {
  clearInterval(reloj); reloj = null;
  terminarEleccion();
  if (canal) { const c = canal; canal = null; supabase().then(sb => sb.removeChannel(c)).catch(() => null); }
  jugadores = []; salas = new Map(); mensajes = new Map(); sala = 'global'; ultimoGlobal = 0; sinLeerGlobal = 0; des = null; atendidos.clear(); peleados = new Set();
  $('#desafio-aviso').classList.add('hidden');
}

export function iniciarSocial(opc) {
  jugar = opc.jugar;
  $('#social').addEventListener('click', e => {
    const t = e.target;
    const reto = t.closest('[data-reto]'); if (reto) return desafiar(reto.dataset.reto);
    const chat = t.closest('[data-chat]');
    if (chat) { const j = jugadores.find(x => x.id === chat.dataset.chat); return abrirSala(chat.dataset.chat, j?.nombre || 'Jugador'); }
    const cerrar = t.closest('[data-cerrar]');
    if (cerrar) { salas.delete(cerrar.dataset.cerrar); if (sala === cerrar.dataset.cerrar) abrirSala('global'); else pintarTabs(); return; }
    const tab = t.closest('[data-sala]');
    if (tab) return abrirSala(tab.dataset.sala, salas.get(tab.dataset.sala)?.nombre);
    if (t.closest('#soc-cerrar')) return minimizarSocial(true);
  });
  try { if (localStorage.getItem('os2-social-min') === '1') document.body.classList.add('social-min'); } catch (e) { /* sin almacenamiento */ }
  $('#soc-abrir').addEventListener('click', () => { minimizarSocial(document.body.classList.contains('social-abierto')); if (document.body.classList.contains('social-abierto')) abrirSala(sala, salas.get(sala)?.nombre); });
  $('#soc-form').addEventListener('submit', enviarChat);
  $('#desafio-aviso').addEventListener('click', e => {
    const a = e.target.closest('[data-da]')?.dataset.da;
    if (a === 'aceptar') responder(true);
    else if (a === 'rechazar') responder(false);
    else if (a === 'cancelar') cancelarDesafio();
  });
  addEventListener('cuenta:cambio', conectar);
  addEventListener('menu:mostrar', () => latido());
  pintarPanel();
}
