// Pantallas fuera de la batalla (HTML, no Pixi): lobby con los modos de juego, construcción de equipos y presentación VS.
import { OFICIALES } from '../datos/personajes/index.js';
import { BASE_COMUN } from '../motor/reglas.js';
import { imgHtml } from './imagenes.js';

const $ = s => document.querySelector(s);
const TAM = 5;                                   // los equipos siempre son de 5
const MODOS = [
  { id: 'rapida', nombre: 'Partida rápida', icono: '⚔️', desc: 'Arma tu equipo y enfrenta a la IA', activo: true },
  { id: 'campana', nombre: 'Campaña', icono: '📜' },
  { id: 'multi', nombre: 'Multijugador', icono: '🌐' },
  { id: 'hordas', nombre: 'Hordas', icono: '🧟' },
  { id: 'jefe', nombre: 'Jefe de Clan', icono: '🐲' },
  { id: 'arena', nombre: 'Arena', icono: '🏟️' },
];
const ROL = { Invocador: 'Invoker' };          // mismos roles con distinto nombre en las fichas
const rolesDe = p => [p.rol, p.rolSecundario].filter(Boolean).map(r => ROL[r] || r);
const CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };
const OBJ = { enemigo: 'Un enemigo', aliado: 'Un aliado', propio: 'Propio', todosEnemigos: 'Todos los enemigos', todosAliados: 'Todos los aliados', azar: 'Enemigos al azar' };
const pct = v => `${Math.round(v * 1000) / 10}%`;

const E = { jugador: [], rival: [], rivalModo: 'azar', editando: 'jugador', filtro: null, sel: null };
let alJugar = null;

// ---------------------------------------------------------------- navegación entre pantallas (con el botón "atrás")
const PANTALLAS = ['menu', 'equipo', 'partida'];
let alSalirDePartida = null;
export function irA(p, { reemplazar = false } = {}) {
  if (reemplazar) history.replaceState(null, '', '#' + p); else if (location.hash !== '#' + p) history.pushState(null, '', '#' + p);
  mostrar(p);
}
function mostrar(p) {
  const antes = document.body.dataset.pantalla;
  document.body.dataset.pantalla = p;
  if (antes === 'partida' && p !== 'partida') alSalirDePartida?.();
  if (p === 'equipo') renderEquipo();
}
addEventListener('popstate', () => {
  const p = location.hash.slice(1);
  mostrar(PANTALLAS.includes(p) && p !== 'partida' ? p : 'menu');
});

// ---------------------------------------------------------------- lobby
function renderMenu() {
  $('#menu-modos').innerHTML = MODOS.map(m => `
    <button class="modo ${m.activo ? 'activo' : 'pronto'}" data-modo="${m.id}" ${m.activo ? '' : 'disabled'}>
      <span class="modo-ico">${m.icono}</span>
      <span class="modo-txt"><b>${m.nombre}</b><small>${m.activo ? m.desc : 'Próximamente'}</small></span>
    </button>`).join('');
}

// ---------------------------------------------------------------- construcción de equipos
const equipoDe = lado => E[lado];
const enEquipo = (lado, id) => equipoDe(lado).some(p => p.id === id);
const aleatorio = (base = []) => {
  const resto = OFICIALES.filter(p => !base.some(b => b.id === p.id)).sort(() => Math.random() - .5);
  return [...base, ...resto].slice(0, TAM);
};
const listo = () => E.jugador.length === TAM && (E.rivalModo === 'azar' || E.rival.length === TAM);

function retrato(p, cls = '') {
  return `<div class="ret ${cls}" style="--c:${p.color}">${imgHtml(p.imagen, p.nombre) || `<span class="ret-emoji">${p.emoji}</span>`}</div>`;
}

function renderEquipo() {
  // filas de equipos
  for (const lado of ['jugador', 'rival']) {
    const fila = $(`.eq-fila[data-lado="${lado}"]`);
    const oculto = lado === 'rival' && E.rivalModo === 'azar';
    fila.classList.toggle('editando', E.editando === lado);
    fila.classList.toggle('azar', oculto);
    fila.querySelector('.eq-slots').innerHTML = oculto
      ? '<div class="eq-azar-txt">🎲 La IA elegirá 5 personajes al azar</div>'
      : Array.from({ length: TAM }, (_, i) => {
        const p = equipoDe(lado)[i];
        const sel = E.sel && E.sel.lado === lado && E.sel.i === i;
        return `<div class="slot ${i === 0 ? 'lider' : ''} ${p ? 'lleno' : ''} ${sel ? 'sel' : ''}" data-lado="${lado}" data-i="${i}">
          ${i === 0 ? '<span class="slot-corona">👑</span>' : ''}
          ${p ? `${retrato(p)}<span class="slot-nombre">${p.nombre}</span><button class="slot-x" data-lado="${lado}" data-i="${i}" title="Quitar">✕</button>` : `<span class="slot-vacio">${i === 0 ? 'Líder' : i + 1}</span>`}
        </div>`;
      }).join('');
  }
  document.querySelectorAll('.eq-modo button').forEach(b => b.classList.toggle('on', b.dataset.modo === E.rivalModo));
  // habilidad de líder del equipo que se está editando
  const lider = equipoDe(E.editando)[0];
  $('#eq-lider').innerHTML = !lider ? '<span class="tenue">👑 El primer personaje de la fila es el líder: su habilidad de líder afecta a todo el equipo.</span>'
    : lider.lider ? `👑 <b>${lider.lider.nombre}</b> (${lider.nombre}): ${lider.lider.desc}`
      : `<span class="aviso">⚠️ ${lider.nombre} no tiene habilidad de líder: este equipo jugará sin una.</span>`;
  // filtros
  const roles = [...new Set(OFICIALES.flatMap(rolesDe))];
  $('#eq-filtros').innerHTML = `<span class="eq-editando">Eligiendo para: <b>${E.editando === 'jugador' ? 'Tu equipo' : 'Rival'}</b></span>` +
    [null, ...roles].map(r => `<button class="filtro ${E.filtro === r ? 'on' : ''}" data-rol="${r ?? ''}">${r ?? 'Todos'}</button>`).join('');
  // galería
  const lista = OFICIALES.filter(p => !E.filtro || rolesDe(p).includes(E.filtro));
  $('#eq-galeria').innerHTML = lista.map(p => {
    const pos = equipoDe(E.editando).findIndex(x => x.id === p.id);
    return `<div class="gc ${pos >= 0 ? 'elegido' : ''}" data-id="${p.id}" style="--c:${p.color}">
      ${retrato(p, 'gc-img')}
      ${pos >= 0 ? `<span class="gc-pos">${pos === 0 ? '👑' : pos + 1}</span>` : ''}
      <button class="gc-info" data-id="${p.id}" title="Ver ficha">i</button>
      <div class="gc-nombre">${p.nombre}</div>
      <div class="gc-rol">${rolesDe(p).join(' · ')}</div>
      <div class="gc-stats"><span>❤️ ${p.base.hp}</span><span>⚔️ ${p.base.dmg}</span><span>⚡ ${p.base.spd}</span></div>
    </div>`;
  }).join('');
  $('#eq-listo').disabled = !listo();
  $('#eq-listo').title = listo() ? '' : 'Completa los 5 personajes de cada equipo que construyas';
}

function alternarPersonaje(id) {
  const p = OFICIALES.find(x => x.id === id), lado = E.editando, eq = equipoDe(lado);
  const i = eq.findIndex(x => x.id === id);
  if (i >= 0) eq.splice(i, 1);
  else if (eq.length < TAM) eq.push(p);
  else return aviso('El equipo ya tiene 5 personajes: quita uno primero');
  E.sel = null;
  renderEquipo();
}
function tocarSlot(lado, i) {
  if (lado === 'rival' && E.rivalModo === 'azar') return;
  E.editando = lado;
  const eq = equipoDe(lado);
  if (!eq[i]) { E.sel = null; return renderEquipo(); }
  if (!E.sel || E.sel.lado !== lado) E.sel = { lado, i };
  else if (E.sel.i === i) E.sel = null;
  else { [eq[E.sel.i], eq[i]] = [eq[i], eq[E.sel.i]]; E.sel = null; }     // tocar dos casillas = intercambiarlas
  renderEquipo();
}
let avisoT = null;
function aviso(t) {
  const a = $('#eq-aviso'); a.textContent = t; a.classList.add('ver');
  clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('ver'), 1800);
}

// ---------------------------------------------------------------- ficha completa de un personaje
function movHtml(m) {
  const extra = [OBJ[m.objetivo], m.pct ? `${Math.round(m.pct * 100)}%${m.golpes > 1 ? ` × ${m.golpes}` : ''} (escala por ${m.escala === 'hp' ? 'HP' : m.escala === 'vel' ? 'Velocidad' : 'Daño'})` : null, m.cd ? `Cooldown ${m.cd}` : 'Sin cooldown'].filter(Boolean).join(' · ');
  return `<div class="fm"><div class="fm-top"><span class="fm-cat ${m.categoria}">${CAT[m.categoria]}</span><b>${m.nombre}</b></div><small>${extra}</small><p>${m.desc || ''}</p></div>`;
}
function statsHtml(base, extra = {}) {
  const s = { ...BASE_COMUN }; for (const [k, v] of Object.entries(extra)) s[k] = (s[k] || 0) + v;
  const filas = [['❤️ HP', base.hp], ['⚔️ Daño', base.dmg], ['⚡ Velocidad', base.spd], ['✴️ Prob. Crítico', pct(s.critRate)], ['💥 Daño Crítico', pct(s.critDmg)],
    ['🎯 Puntería', pct(s.acc)], ['🧿 Resistencia', pct(s.res)], ['🛡️ Armadura', pct(s.armor)], ['✋ Bloqueo', pct(s.block)], ['☠️ Daño DoT', pct(s.dot)], ['🗡️ Penetración de escudo', pct(s.pen)]];
  return `<div class="fs">${filas.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
}
function fichaHtml(p) {
  let formas = '';
  for (let f = p.transformacion, n = 1; f; f = f.transformacion, n++) {
    formas += `<section><h4>Transformación ${n}: ${f.nombre}</h4>${statsHtml(f.base, f.extra)}
      ${f.pasiva ? `<div class="fb"><b>Pasiva: ${f.pasiva.nombre}</b><p>${f.pasiva.desc}</p></div>` : ''}${f.movimientos.map(movHtml).join('')}</section>`;
  }
  return `<div class="fh">${retrato(p, 'fh-img')}<div><h3>${p.nombre}</h3><div class="gc-rol">${rolesDe(p).join(' · ')}</div></div></div>
    <section><h4>Estadísticas base <small>(sin reliquias)</small></h4>${statsHtml(p.base, p.extra)}</section>
    ${p.lider ? `<div class="fb lider"><b>👑 Líder: ${p.lider.nombre}</b><p>${p.lider.desc}</p></div>` : '<div class="fb"><b>👑 Sin habilidad de líder</b></div>'}
    ${p.pasiva ? `<div class="fb"><b>✦ Pasiva: ${p.pasiva.nombre}</b><p>${p.pasiva.desc}</p></div>` : ''}
    <section><h4>Movimientos</h4>${p.movimientos.map(movHtml).join('')}</section>${formas}`;
}
function abrirFicha(id) { $('#ficha-cont').innerHTML = fichaHtml(OFICIALES.find(p => p.id === id)); $('#ficha').classList.remove('hidden'); }
const cerrarFicha = () => $('#ficha').classList.add('hidden');

// ---------------------------------------------------------------- presentación VS
export function presentarVS(eqJ, eqR) {
  const lado = eq => eq.map((p, i) => `<div class="vs-p" style="--c:${p.color};--d:${i * .07}s">${retrato(p)}<span>${i === 0 ? '👑 ' : ''}${p.nombre}</span></div>`).join('');
  $('#vs-j').innerHTML = lado(eqJ); $('#vs-r').innerHTML = lado(eqR);
  const vs = $('#pantalla-vs'); vs.classList.remove('hidden', 'sale'); void vs.offsetWidth; vs.classList.add('entra');
  return new Promise(r => setTimeout(() => { vs.classList.add('sale'); setTimeout(() => { vs.classList.add('hidden'); vs.classList.remove('entra', 'sale'); r(); }, 450); }, 1900));
}

// ---------------------------------------------------------------- arranque
export function iniciarMenu({ jugar, salirDePartida }) {
  alJugar = jugar; alSalirDePartida = salirDePartida;
  renderMenu();
  $('#menu-modos').addEventListener('click', e => { if (e.target.closest('[data-modo="rapida"]')) irA('equipo'); });
  $('#eq-volver').addEventListener('click', () => irA('menu'));
  $('#pantalla-equipo').addEventListener('click', e => {
    const t = e.target;
    const info = t.closest('.gc-info'); if (info) return abrirFicha(info.dataset.id);
    const x = t.closest('.slot-x'); if (x) { equipoDe(x.dataset.lado).splice(+x.dataset.i, 1); E.sel = null; return renderEquipo(); }
    const slot = t.closest('.slot'); if (slot) return tocarSlot(slot.dataset.lado, +slot.dataset.i);
    const gc = t.closest('.gc'); if (gc) return alternarPersonaje(gc.dataset.id);
    const f = t.closest('.filtro'); if (f) { E.filtro = f.dataset.rol || null; return renderEquipo(); }
    const m = t.closest('.eq-modo button'); if (m) { E.rivalModo = m.dataset.modo; E.editando = m.dataset.modo === 'construir' ? 'rival' : 'jugador'; E.sel = null; return renderEquipo(); }
    const az = t.closest('.eq-azar');
    if (az) { const l = az.dataset.lado; if (l === 'rival') E.rivalModo = 'construir';
      E[l] = E[l].length === TAM ? aleatorio() : aleatorio(E[l]); E.editando = l; E.sel = null; return renderEquipo(); }
    const fila = t.closest('.eq-fila'); if (fila && !(fila.dataset.lado === 'rival' && E.rivalModo === 'azar')) { E.editando = fila.dataset.lado; return renderEquipo(); }
  });
  $('#eq-listo').addEventListener('click', () => {
    if (!listo()) return;
    alJugar([...E.jugador], E.rivalModo === 'azar' ? aleatorio() : [...E.rival]);
  });
  $('#ficha').addEventListener('click', e => { if (e.target.id === 'ficha' || e.target.closest('#ficha-x')) cerrarFicha(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#ficha').classList.contains('hidden')) cerrarFicha(); });
}
// Recupera la selección (al volver de una partida para "Cambiar equipo")
export function cargarSeleccion(eqJ, eqR, rivalModo) { E.jugador = [...eqJ]; E.rival = rivalModo === 'construir' ? [...eqR] : []; E.rivalModo = rivalModo; E.editando = 'jugador'; }
export const seleccion = () => ({ rivalModo: E.rivalModo });
