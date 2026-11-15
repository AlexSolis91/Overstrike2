// Pantallas fuera de la batalla (HTML, no Pixi): lobby con los modos de juego, construcción de equipos y presentación VS.
import { OFICIALES } from '../datos/personajes/index.js';
import { BASE_COMUN } from '../motor/reglas.js';
import { imgHtml } from './imagenes.js';
import { sonar, musica, temaDePartida } from './audio.js';
import { FONDOS } from '../datos/fondos.js';
import { temporizar } from './graficos.js';
import { efectosDe, selectorEfectos } from '../datos/efectosCampeon.js';
import { coincideNombre, buscadorHtml, reenfocar } from './buscar.js';
import { misEquipos, guardarEquipo, borrarEquipo, elegirEquipoGuardado, mensajeEquipos, filaEquipoHtml, MAX_EQUIPOS, MAX_NOMBRE } from './equipos.js';
import { avisar, confirmar, pedirTexto } from './dialogo.js';
import { perfilActual } from './cuenta.js';
import { abrirFichaCampeon } from './coleccion.js';
import * as D from '../servicios/datos.js';

const $ = s => document.querySelector(s);
const TAM = 5;                                   // los equipos siempre son de 5
const MODOS = [
  { id: 'rapida', nombre: 'Partida rápida', icono: '⚔️', desc: 'Arma tu equipo y enfrenta a la IA', activo: true },
  { id: 'campana', nombre: 'Campaña', icono: '📜', desc: 'El Portal y el Abismo: 40 etapas y 3 dificultades', activo: true },
  { id: 'multi', nombre: 'Multijugador', icono: '🌐' },
  { id: 'hordas', nombre: 'Hordas', icono: '🧟', desc: 'Oleadas sin fin: ¿hasta dónde llegas?', activo: true },
  { id: 'jefe', nombre: 'Jefe de Raid', icono: '👑', desc: 'Todos contra Lich King: reparte daño y gana cofres', activo: true },
  { id: 'arena', nombre: 'Arena', icono: '🏟️', desc: 'Defiende y ataca: sube de liga', activo: true },
  { id: 'equipos', nombre: 'Construcción de Equipos', icono: '🛠️', desc: 'Arma y guarda tus equipos para cargarlos en cualquier modo', activo: true },
];
const ROL = { Invocador: 'Invoker' };          // mismos roles con distinto nombre en las fichas
const rolesDe = p => [p.rol, p.rolSecundario].filter(Boolean).map(r => ROL[r] || r);
const CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };
const OBJ = { enemigo: 'Un enemigo', aliado: 'Un aliado', propio: 'Propio', todosEnemigos: 'Todos los enemigos', todosAliados: 'Todos los aliados', azar: 'Enemigos al azar' };
const pct = v => `${Math.round(v * 1000) / 10}%`;

const E = { jugador: [], rival: [], rivalModo: 'azar', editando: 'jugador', filtro: null, efecto: null, busca: '', sel: null, campana: null };
// campana.armado (Construcción de Equipos): { id, nombre, original } del equipo guardado que se está editando (id null = nuevo)
// campana (modo Campaña): { titulo, rivales: [fichas], propios: Set(ids), alListo(eqJ), alVolver() } · el rival es fijo y solo se eligen campeones propios
let alJugar = null;

// ---------------------------------------------------------------- navegación entre pantallas (con el botón "atrás")
const PANTALLAS = ['menu', 'equipo', 'partida', 'campana', 'horda', 'arena', 'raid'];
let alSalirDePartida = null, alAbrirRaid = null;
export function irA(p, { reemplazar = false } = {}) {
  if (reemplazar) history.replaceState(null, '', '#' + p); else if (location.hash !== '#' + p) history.pushState(null, '', '#' + p);
  mostrar(p);
}
function mostrar(p) {
  const antes = document.body.dataset.pantalla;
  document.body.dataset.pantalla = p;
  if (antes === 'partida' && p !== 'partida') alSalirDePartida?.();
  musica(p === 'partida' ? temaDePartida() : 'menu');
  fondo(p === 'menu' || p === 'campana' || p === 'horda' || p === 'arena' || p === 'raid' ? 'menu' : p === 'equipo' ? 'equipo' : null);
  if (p === 'equipo') renderEquipo();
  if (p === 'campana') alAbrirCampana?.();
  if (p === 'horda') alAbrirHorda?.();
  if (p === 'arena') alAbrirArena?.();
  if (p === 'raid') alAbrirRaid?.();
  if (p === 'menu') { E.campana = null; dispatchEvent(new Event('menu:mostrar')); }
}
addEventListener('popstate', () => {
  const p = location.hash.slice(1);
  mostrar(PANTALLAS.includes(p) && p !== 'partida' ? p : 'menu');
});

// ---------------------------------------------------------------- fondo animado (video) por grupo de pantallas
// grupo: 'menu' | 'equipo' | null (sin video). Si el grupo no cambia, el video sigue sin reiniciarse (equipos → VS).
let grupoFondo = null, apagado = null;
const ultimoFondo = {};
export function fondo(grupo) {
  const capa = $('#fondo-video'), v = capa?.querySelector('video');
  if (!v) return;
  const lista = (grupo && FONDOS[grupo]) || [];
  if (!lista.length) {                                   // sin video: se desvanece y se pausa
    if (grupoFondo === null) return;
    grupoFondo = null; v.classList.remove('listo');
    clearTimeout(apagado);
    apagado = setTimeout(() => { if (grupoFondo === null) { v.pause(); document.body.classList.remove('fondo-activo'); } }, 900);
    return;
  }
  clearTimeout(apagado);
  document.body.classList.add('fondo-activo');
  if (grupo === grupoFondo) { if (v.paused) v.play().catch(() => {}); return; }
  grupoFondo = grupo; capa.dataset.grupo = grupo;
  let i = Math.floor(Math.random() * lista.length);
  if (lista.length > 1 && i === ultimoFondo[grupo]) i = (i + 1) % lista.length;     // no repetir el anterior
  ultimoFondo[grupo] = i;
  const f = lista[i];
  v.classList.remove('listo', 'girado', 'girar-90', 'girar--90');
  if (f.girar) v.classList.add('girado', `girar-${f.girar}`);
  v.muted = true;                                        // en silencio: así el navegador lo deja reproducirse solo
  if (!v.src.endsWith(f.archivo)) v.src = f.archivo;
  v.onplaying = () => { if (grupoFondo) v.classList.add('listo'); };
  v.play().catch(() => { /* sin permiso todavía o sin archivo: se reintenta abajo */ });
}
// Si el navegador no lo dejó arrancar (ventana oculta, ahorro de energía…), se reintenta al volver a la ventana o al primer toque
const reintentarFondo = () => {
  const v = $('#fondo-video video');
  if (v?.src && v.paused && grupoFondo && document.visibilityState === 'visible') v.play().catch(() => {});
};
document.addEventListener('visibilitychange', reintentarFondo);
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, reintentarFondo, { capture: true, passive: true });

// ---------------------------------------------------------------- lobby
function renderMenu() {
  $('#menu-modos').innerHTML = MODOS.map(m => `
    <button class="modo ${m.activo ? 'activo' : 'pronto'}" data-modo="${m.id}" ${m.activo ? '' : 'disabled'}>
      <span class="modo-ico">${m.icono}</span>
      <span class="modo-txt"><b>${m.nombre}</b><small>${m.activo ? m.desc : 'Próximamente'}</small></span>${m.activo ? '' : '<span class="modo-candado" aria-hidden="true">🔒</span>'}
    </button>`).join('');
}

// ---------------------------------------------------------------- construcción de equipos
const equipoDe = lado => E[lado];
const enEquipo = (lado, id) => equipoDe(lado).some(p => p.id === id);
const aleatorio = (base = []) => {
  const resto = OFICIALES.filter(p => !base.some(b => b.id === p.id)).sort(() => Math.random() - .5);
  return [...base, ...resto].slice(0, TAM);
};
const listo = () => E.jugador.length === TAM && (E.campana?.armado ? !!E.campana.armado.nombre.trim() : (E.campana || E.rivalModo === 'azar' || E.rival.length === TAM));

function retrato(p, cls = '') {
  return `<div class="ret ${cls}" style="--c:${p.color}">${imgHtml(p.imagen, p.nombre) || `<span class="ret-emoji">${p.emoji}</span>`}</div>`;
}

function renderEquipo() {
  // filas de equipos
  const camp = E.campana;
  document.body.classList.toggle('eq-campana', !!camp);
  document.body.classList.toggle('eq-sin-rival', !!camp?.sinRival);
  document.body.classList.toggle('eq-constructor', !!camp?.armado);
  document.body.classList.toggle('eq-guardables', !!perfilActual());
  $('#eq-listo').textContent = camp?.armado ? '💾 Guardar' : '¡Listo!';
  $('#eq-guardados').innerHTML = camp?.armado ? htmlConstructor() : '';
  $('#pantalla-equipo h2').textContent = camp ? camp.titulo : 'Construye tu equipo';
  $('#eq-volver').textContent = camp ? (camp.volverTxt || '← Portal') : '← Menú';
  if (camp) { E.editando = 'jugador'; E.rival = camp.rivales; }
  for (const lado of ['jugador', 'rival']) {
    const fila = $(`.eq-fila[data-lado="${lado}"]`);
    const oculto = lado === 'rival' && E.rivalModo === 'azar' && !camp;
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
    buscadorHtml('eq-buscar', E.busca) +
    [null, ...roles].map(r => `<button class="filtro ${E.filtro === r ? 'on' : ''}" data-rol="${r ?? ''}">${r ?? 'Todos'}</button>`).join('') + selectorEfectos('eq-efecto', E.efecto);
  // galería
  const lista = OFICIALES.filter(p => (!E.filtro || rolesDe(p).includes(E.filtro)) && (!E.efecto || efectosDe(p).has(E.efecto)) && coincideNombre(p, E.busca) && (!camp || camp.propios.has(p.id)));
  $('#eq-galeria').innerHTML = !lista.length ? `<p class="eq-sin">${E.busca ? 'Ningún campeón coincide con tu búsqueda.' : 'Ningún campeón coincide con estos filtros.'}</p>` : lista.map(p => {
    const pos = equipoDe(E.editando).findIndex(x => x.id === p.id), bloq = camp?.bloqueados?.has(p.id);
    return `<div class="gc ${pos >= 0 ? 'elegido' : ''} ${bloq ? 'bloq' : ''}" data-id="${p.id}" style="--c:${p.color}" ${bloq ? `title="${camp.motivoBloqueo}"` : ''}>
      ${retrato(p, 'gc-img')}
      ${pos >= 0 ? `<span class="gc-pos">${pos === 0 ? '👑' : pos + 1}</span>` : ''}${bloq ? '<span class="gc-bloq">🔒</span>' : ''}
      <button class="gc-info" data-id="${p.id}" title="Ver ficha">i</button>
      <div class="gc-nombre">${p.nombre}</div>
      <div class="gc-rol">${rolesDe(p).join(' · ')}</div>
      <div class="gc-stats"><span>❤️ ${p.base.hp}</span><span>⚔️ ${p.base.dmg}</span><span>⚡ ${p.base.spd}</span></div>
    </div>`;
  }).join('');
  $('#eq-listo').disabled = !listo();
  $('#eq-listo').title = listo() ? '' : camp?.armado ? 'Elige 5 campeones y ponle nombre al equipo' : camp ? 'Elige 5 de tus campeones' : 'Completa los 5 personajes de cada equipo que construyas';
  if (camp && !lista.length && !E.busca && !E.filtro && !E.efecto) $('#eq-galeria').innerHTML = '<p class="eq-vacio">No tienes campeones todavía: abre tu Starter Pack en la Tienda.</p>';
}

function alternarPersonaje(id) {
  const p = OFICIALES.find(x => x.id === id), lado = E.campana ? 'jugador' : E.editando, eq = equipoDe(lado);
  const i = eq.findIndex(x => x.id === id);
  if (i < 0 && E.campana?.bloqueados?.has(id)) { sonar('resistido'); return aviso(E.campana.motivoBloqueo); }
  if (i >= 0) { eq.splice(i, 1); sonar('quitar'); }
  else if (eq.length < TAM) { eq.push(p); sonar('elegir'); }
  else { sonar('resistido'); return aviso('El equipo ya tiene 5 personajes: quita uno primero'); }
  E.sel = null;
  renderEquipo();
}
function tocarSlot(lado, i) {
  if (lado === 'rival' && (E.rivalModo === 'azar' || E.campana)) return;
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

// ---------------------------------------------------------------- equipos guardados: Cargar / Guardar / Construcción de Equipos
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let guardados = [];                                   // equipos guardados (barra de la Construcción de Equipos)
const idsDe = eq => eq.map(p => p.id).join(',');
const nuevoConstructor = () => ({ id: null, nombre: '', original: { ids: '', nombre: '' } });
const cambiado = () => { const c = E.campana?.armado; return !!c && E.jugador.length > 0 && (idsDe(E.jugador) !== c.original.ids || c.nombre.trim() !== c.original.nombre); };
const descartar = async () => !cambiado() || confirmar('Tienes cambios sin guardar en este equipo. ¿Descartarlos?', { aceptar: 'Descartar' });

function htmlConstructor() {
  const c = E.campana.armado;
  return `<div class="eqg-barra">
      <label class="eqg-nombre"><span>Nombre del equipo</span><input id="eqg-nombre" maxlength="${MAX_NOMBRE}" value="${esc(c.nombre)}" placeholder="Ej. Equipo de Arena" autocomplete="off" spellcheck="false"></label>
      <div class="eqg-botones"><button class="eq-btn" data-eqg="nuevo">＋ Nuevo</button>
        <button class="eq-btn" data-eqg="duplicar" ${c.id ? '' : 'disabled'}>⧉ Duplicar</button>
        <button class="eq-btn" data-eqg="borrar" ${c.id ? '' : 'disabled'}>🗑️ Borrar</button></div>
    </div>
    <div class="eqg-lista"><span class="eqg-cuenta">Tus equipos<b>${guardados.length}/${MAX_EQUIPOS}</b></span>${guardados.length
      ? guardados.map(eq => filaEquipoHtml(eq, `data-eqg-abrir="${eq.id}"`, eq.id === c.id)).join('')
      : '<span class="eqg-vacio">Todavía no guardas ninguno: elige 5 campeones, ponle nombre y presiona 💾 Guardar.</span>'}</div>`;
}

export async function abrirConstructor() {
  if (!perfilActual()) return avisar('Inicia sesión para construir y guardar tus equipos.');
  let filas;
  try { [filas, guardados] = await Promise.all([D.miColeccion(), misEquipos({ forzar: true })]); }
  catch (e) { return avisar(mensajeEquipos(e)); }
  E.campana = { titulo: '🛠️ Construcción de Equipos', rivales: [], propios: new Set((filas || []).map(r => r.campeon)), sinRival: true, volverTxt: '← Menú',
    alVolver: () => irA('menu'), armado: nuevoConstructor() };
  E.jugador = []; E.sel = null; E.filtro = null; E.efecto = null; E.busca = '';
  irA('equipo');
}
function editarGuardado(eq) {
  const c = E.campana.armado;
  E.jugador = eq.campeones.map(id => OFICIALES.find(p => p.id === id)).filter(p => p && E.campana.propios.has(p.id));
  Object.assign(c, { id: eq.id, nombre: eq.nombre, original: { ids: idsDe(E.jugador), nombre: eq.nombre } });
  E.sel = null; sonar('elegir'); renderEquipo();
}
async function accionConstructor(que) {
  const c = E.campana.armado;
  if (que === 'nuevo') { if (!await descartar()) return; E.campana.armado = nuevoConstructor(); E.jugador = []; E.sel = null; return renderEquipo(); }
  if (que === 'duplicar') {
    if (guardados.length >= MAX_EQUIPOS) return avisar(`Ya tienes ${MAX_EQUIPOS} equipos guardados: borra uno para guardar otro.`);
    Object.assign(c, { id: null, nombre: `${c.nombre.trim()} (copia)`.slice(0, MAX_NOMBRE), original: { ids: '', nombre: '' } });
    renderEquipo(); return aviso('⧉ Copia lista: cámbiale el nombre o los campeones y presiona 💾 Guardar');
  }
  if (que === 'borrar') {
    const eq = guardados.find(x => x.id === c.id); if (!eq) return;
    if (!await confirmar(`¿Borrar el equipo "${eq.nombre}"? Esto no se puede deshacer.`, { aceptar: 'Borrar' })) return;
    try { await borrarEquipo(eq.id); guardados = await misEquipos(); } catch (e) { return avisar(mensajeEquipos(e)); }
    E.campana.armado = nuevoConstructor(); E.jugador = []; E.sel = null; sonar('quitar'); renderEquipo();
    return aviso(`🗑️ "${eq.nombre}" borrado`);
  }
}
async function guardarConstructor() {
  const c = E.campana.armado, nombre = c.nombre.trim();
  if (!c.id && guardados.length >= MAX_EQUIPOS) return avisar(`Ya tienes ${MAX_EQUIPOS} equipos guardados: borra uno para guardar otro.`);
  try {
    const fila = await guardarEquipo(c.id, nombre, E.jugador.map(p => p.id));
    guardados = await misEquipos();
    Object.assign(c, { id: fila.id, nombre: fila.nombre, original: { ids: idsDe(E.jugador), nombre: fila.nombre } });
  } catch (e) { return avisar(mensajeEquipos(e)); }
  sonar('listo'); renderEquipo(); aviso(`💾 "${nombre}" guardado`);
}
// Ficha del campeón dentro de la Construcción de Equipos: stats, habilidades y reliquias (se pueden cambiar) + agregar / quitar
function fichaConstructor(id) {
  sonar('abrir');
  abrirFichaCampeon(id, {
    accion: x => ({ texto: enEquipo('jugador', x) ? '✕ Quitar del equipo' : '＋ Agregar al equipo', fn: () => alternarPersonaje(x) }),
    alCerrar: () => renderEquipo(),
  });
}

// "📂 Cargar Equipo": pone un equipo guardado en la fila (si todos sus campeones pueden usarse en este modo)
async function cargarGuardado(lado) {
  const eq = await elegirEquipoGuardado(); if (!eq) return;
  const f = eq.campeones.map(id => OFICIALES.find(p => p.id === id));
  const no = m => avisar(`No es posible cargar el equipo "${eq.nombre}" ya que ${m}.`, { titulo: 'No se pudo cargar el equipo' });
  if (f.some(p => !p)) return no('uno de sus campeones ya no está disponible');
  const camp = E.campana;
  if (camp) for (const p of f) {
    const otro = camp.ocupados?.get(p.id);
    if (otro) return no(`el campeón ${p.nombre} ya se encuentra en el equipo de ${otro}`);
    if (!camp.propios.has(p.id)) return no(`ya no tienes a ${p.nombre}`);
    if (camp.bloqueados?.has(p.id)) return no(`${p.nombre} no puede usarse aquí (${camp.motivoBloqueo.replace(/^🔒\s*/, '').replace(/\.$/, '')})`);
  }
  if (lado === 'rival') E.rivalModo = 'construir';
  E[lado] = f; E.editando = lado; E.sel = null;
  sonar('elegir'); renderEquipo(); aviso(`📂 "${eq.nombre}" cargado`);
}
// "💾 Guardar": guarda el equipo de la fila del jugador con un nombre (solo campeones propios)
async function guardarDesdeSeleccion() {
  if (E.jugador.length !== TAM) { sonar('resistido'); return aviso('Completa los 5 campeones de tu equipo para guardarlo'); }
  let lista;
  try {
    lista = await misEquipos();
    if (!E.campana) {                                 // en Partida rápida se puede elegir a cualquiera: solo se guardan campeones propios
      const mios = new Set(((await D.miColeccion()) || []).map(r => r.campeon)), falta = E.jugador.find(p => !mios.has(p.id));
      if (falta) return avisar(`No puedes guardar este equipo porque no tienes a ${falta.nombre}. Los equipos guardados solo usan tus campeones.`);
    }
  } catch (e) { return avisar(mensajeEquipos(e)); }
  if (lista.length >= MAX_EQUIPOS) return avisar(`Ya tienes ${MAX_EQUIPOS} equipos guardados: borra uno en Construcción de Equipos para guardar otro.`);
  const lider = E.jugador[0];
  const nombre = await pedirTexto(`Ponle un nombre (hasta ${MAX_NOMBRE} letras). Líder: ${lider.nombre}${lider.lider ? ` · ${lider.lider.nombre}` : ' (sin habilidad de líder)'}.`,
    { titulo: '💾 Guardar equipo', valor: `Equipo ${lista.length + 1}`, max: MAX_NOMBRE, aceptar: 'Guardar' });
  if (!nombre) return;
  try { await guardarEquipo(null, nombre, E.jugador.map(p => p.id)); } catch (e) { return avisar(mensajeEquipos(e)); }
  sonar('listo'); aviso(`💾 "${nombre}" guardado`);
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
// Líder, pasiva, movimientos y transformaciones (también los usa la ficha de Colección)
export function habilidadesHtml(p) {
  let formas = '';
  for (let f = p.transformacion, n = 1; f; f = f.transformacion, n++) {
    formas += `<section><h4>Transformación ${n}: ${f.nombre}</h4>${statsHtml(f.base, f.extra)}
      ${f.pasiva ? `<div class="fb"><b>Pasiva: ${f.pasiva.nombre}</b><p>${f.pasiva.desc}</p></div>` : ''}${f.movimientos.map(movHtml).join('')}</section>`;
  }
  return `${p.lider ? `<div class="fb lider"><b>👑 Líder: ${p.lider.nombre}</b><p>${p.lider.desc}</p></div>` : '<div class="fb"><b>👑 Sin habilidad de líder</b></div>'}
    ${p.pasiva ? `<div class="fb"><b>✦ Pasiva: ${p.pasiva.nombre}</b><p>${p.pasiva.desc}</p></div>` : ''}
    <section><h4>Movimientos</h4>${p.movimientos.map(movHtml).join('')}</section>${formas}`;
}
function fichaHtml(p) {
  return `<div class="fh">${retrato(p, 'fh-img')}<div><h3>${p.nombre}</h3><div class="gc-rol">${rolesDe(p).join(' · ')}</div></div></div>
    <section><h4>Estadísticas base <small>(sin reliquias)</small></h4>${statsHtml(p.base, p.extra)}</section>
    ${habilidadesHtml(p)}`;
}
function abrirFicha(id) { $('#ficha-cont').innerHTML = fichaHtml(OFICIALES.find(p => p.id === id)); $('#ficha').classList.remove('hidden'); sonar('abrir'); }
const cerrarFicha = () => { $('#ficha').classList.add('hidden'); sonar('cerrar'); };

// ---------------------------------------------------------------- presentación VS
export function presentarVS(eqJ, eqR) {
  const lado = eq => eq.map((p, i) => `<div class="vs-p" style="--c:${p.color};--d:${i * .07}s">${retrato(p)}<span>${i === 0 ? '👑 ' : ''}${p.nombre}</span></div>`).join('');
  $('#vs-j').innerHTML = lado(eqJ); $('#vs-r').innerHTML = lado(eqR);
  const vs = $('#pantalla-vs'); vs.classList.remove('hidden', 'sale'); void vs.offsetWidth; vs.classList.add('entra');
  fondo('equipo'); document.body.classList.add('vs-activo');
  return new Promise(r => temporizar(() => { vs.classList.add('sale'); temporizar(() => { vs.classList.add('hidden'); vs.classList.remove('entra', 'sale'); document.body.classList.remove('vs-activo'); r(); }, 450); }, 1900));
}

// ---------------------------------------------------------------- arranque
let alAbrirCampana = null, alAbrirHorda = null, alAbrirArena = null;
export function iniciarMenu({ jugar, salirDePartida, abrirCampana, abrirHorda, abrirArena, abrirRaid }) {
  alJugar = jugar; alSalirDePartida = salirDePartida; alAbrirCampana = abrirCampana; alAbrirHorda = abrirHorda; alAbrirArena = abrirArena; alAbrirRaid = abrirRaid;
  renderMenu();
  $('#menu-modos').addEventListener('click', e => {
    if (e.target.closest('[data-modo="rapida"]')) { E.campana = null; irA('equipo'); }
    if (e.target.closest('[data-modo="campana"]')) irA('campana');
    if (e.target.closest('[data-modo="hordas"]')) irA('horda');
    if (e.target.closest('[data-modo="arena"]')) irA('arena');
    if (e.target.closest('[data-modo="jefe"]')) irA('raid');
    if (e.target.closest('[data-modo="equipos"]')) abrirConstructor();
  });
  $('#pantalla-equipo').addEventListener('input', e => {
    if (e.target.id === 'eq-buscar') { E.busca = e.target.value; renderEquipo(); reenfocar('eq-buscar', true); }
    if (e.target.id === 'eqg-nombre' && E.campana?.armado) { E.campana.armado.nombre = e.target.value; $('#eq-listo').disabled = !listo(); }
  });
  $('#eq-filtros').addEventListener('change', e => { if (e.target.id === 'eq-efecto') { E.efecto = e.target.value || null; renderEquipo(); } });
  $('#eq-volver').addEventListener('click', async () => { if (E.campana?.armado && !await descartar()) return; if (E.campana) { const c = E.campana; E.campana = null; c.alVolver?.(); } else irA('menu'); });
  $('#pantalla-equipo').addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-limpiar="eq-buscar"]')) { E.busca = ''; renderEquipo(); return reenfocar('eq-buscar', true); }
    const carg = t.closest('.eq-cargar'); if (carg) return cargarGuardado(carg.dataset.lado);
    if (t.closest('.eq-guardar')) return guardarDesdeSeleccion();
    const eqg = t.closest('[data-eqg]'); if (eqg) return accionConstructor(eqg.dataset.eqg);
    const abrirG = t.closest('[data-eqg-abrir]');
    if (abrirG) { const eq = guardados.find(x => x.id === abrirG.dataset.eqgAbrir); if (eq && eq.id !== E.campana?.armado?.id) descartar().then(ok => ok && editarGuardado(eq)); return; }
    if (t.closest('#eq-guardados')) return;
    const info = t.closest('.gc-info'); if (info) return E.campana?.armado ? fichaConstructor(info.dataset.id) : abrirFicha(info.dataset.id);
    const x = t.closest('.slot-x'); if (x) { if (E.campana && x.dataset.lado === 'rival') return; equipoDe(x.dataset.lado).splice(+x.dataset.i, 1); E.sel = null; return renderEquipo(); }
    const slot = t.closest('.slot'); if (slot) return tocarSlot(slot.dataset.lado, +slot.dataset.i);
    const gc = t.closest('.gc'); if (gc) return E.campana?.armado ? fichaConstructor(gc.dataset.id) : alternarPersonaje(gc.dataset.id);
    const f = t.closest('.filtro'); if (f) { E.filtro = f.dataset.rol || null; return renderEquipo(); }
    const m = t.closest('.eq-modo button'); if (m) { E.rivalModo = m.dataset.modo; E.editando = m.dataset.modo === 'construir' ? 'rival' : 'jugador'; E.sel = null; return renderEquipo(); }
    const az = t.closest('.eq-azar');
    if (az && E.campana) { if (az.dataset.lado === 'jugador') { E.jugador = [...E.jugador, ...OFICIALES.filter(p => E.campana.propios.has(p.id) && !E.campana.bloqueados?.has(p.id) && !E.jugador.includes(p)).sort(() => Math.random() - .5)].slice(0, TAM); renderEquipo(); } return; }
    if (az) { const l = az.dataset.lado; if (l === 'rival') E.rivalModo = 'construir';
      E[l] = E[l].length === TAM ? aleatorio() : aleatorio(E[l]); E.editando = l; E.sel = null; return renderEquipo(); }
    const fila = t.closest('.eq-fila'); if (fila && !E.campana && !(fila.dataset.lado === 'rival' && E.rivalModo === 'azar')) { E.editando = fila.dataset.lado; return renderEquipo(); }
  });
  $('#eq-listo').addEventListener('click', () => {
    if (!listo()) return;
    if (E.campana?.armado) return guardarConstructor();
    sonar('listo');
    if (E.campana) return E.campana.alListo([...E.jugador]);
    alJugar([...E.jugador], E.rivalModo === 'azar' ? aleatorio() : [...E.rival]);
  });
  $('#ficha').addEventListener('click', e => { if (e.target.id === 'ficha' || e.target.closest('#ficha-x')) cerrarFicha(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#ficha').classList.contains('hidden')) cerrarFicha(); });
}
// Recupera la selección (al volver de una partida para "Cambiar equipo")
export function cargarSeleccion(eqJ, eqR, rivalModo) { E.jugador = [...eqJ]; E.rival = rivalModo === 'construir' ? [...eqR] : []; E.rivalModo = rivalModo; E.editando = 'jugador'; }
export const seleccion = () => ({ rivalModo: E.rivalModo });
export const equipoElegido = () => [...E.jugador];
// Modo Campaña: abre la construcción de equipo con el rival fijo de la etapa y solo los campeones propios
// bloqueados: Set de ids propios que se ven pero no se pueden elegir (p. ej. ya atacaron hoy al Jefe de Raid); motivoBloqueo explica por qué
// ocupados: Map(id → nombre del otro equipo) que impide "Cargar" un equipo guardado con esos campeones (Arena: Ataque / Defensa)
export function equipoCampana({ titulo, rivales, propios, alListo, alVolver, volverTxt, sinRival = false, inicial = null, bloqueados = null, motivoBloqueo = '', ocupados = null }) {
  E.campana = { titulo, rivales, propios, alListo, alVolver, volverTxt, sinRival, bloqueados, motivoBloqueo, ocupados };
  E.jugador = (inicial || E.jugador).filter(p => propios.has(p.id) && !bloqueados?.has(p.id));   // conserva la última selección (si sigue siendo suya)
  E.sel = null; E.filtro = null; E.efecto = null; E.busca = '';
  irA('equipo');
}
