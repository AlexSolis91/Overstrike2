// Pantalla del MODO CAMPAÑA (HTML): mapa del Portal con 20 etapas, pestañas de dificultad, etapas ocultas hasta llegar a
// ellas (con animación de revelación), detalle de la etapa (equipo enemigo, premios, estrellas) y repetición en serie.
// Las victorias se cobran en el servidor (campana_completar): aquí solo se muestra y se lanza la batalla.
import { AREAS, TEMAS, DIFICULTADES, RECOMPENSAS, RONDAS_3_ESTRELLAS, equipoDeTema, estrellas } from '../datos/campana.js';
import { imgHtml } from './imagenes.js';
import { irA, equipoCampana } from './menu.js';
import { sonar } from './audio.js';
import * as D from '../servicios/datos.js';
import { perfilActual } from './cuenta.js';

const $ = s => document.querySelector(s);
const AREA_IDS = ['portal', 'abismo'];
let AREA = 'portal';
const DIFS = ['normal', 'dificil', 'brutal'];
const miles = n => Math.round(n).toLocaleString('es-MX');

const progAreas = { portal: new Map(), abismo: new Map() };   // por área: `${dif}-${etapa}` → { estrellas, victorias, ultima }
let prog = progAreas.portal;
let propios = new Set();             // campeones del jugador
let dif = 'normal', sel = null, cargando = false;
let alJugar = null;                  // (eqJ, eqR, opciones) => inicia la batalla (juego.js)

// ---------------------------------------------------------------- reglas de desbloqueo (las mismas que valida el servidor)
const clave = (d, e) => `${d}-${e}`;
const ganada = (d, e) => prog.has(clave(d, e));
// el Abismo: cada dificultad se abre al completar la etapa 20 del Portal en esa misma dificultad (igual que el servidor)
const difAbierta = d => AREA === 'abismo' ? progAreas.portal.has(clave(d, 20)) : d === 'normal' || ganada(DIFS[DIFS.indexOf(d) - 1], 20);
const areaAbierta = a => a === 'portal' || progAreas.portal.has(clave('normal', 20));
const etapaAbierta = (d, e) => difAbierta(d) && (e === 1 || ganada(d, e - 1));
const totalEstrellas = d => [...prog].filter(([k]) => k.startsWith(d + '-')).reduce((s, [, v]) => s + v.estrellas, 0);
const etapaDe = e => AREAS[AREA].etapas[e - 1];

// lo ya revelado en este dispositivo (para animar solo lo nuevo)
const visto = (() => { try { return new Set(JSON.parse(localStorage.getItem('os2-camp-visto') || '[]')); } catch (e) { return new Set(); } })();
const marcarVisto = k0 => { const k = AREA === 'portal' ? k0 : `${AREA}-${k0}`; visto.add(k); try { localStorage.setItem('os2-camp-visto', JSON.stringify([...visto])); } catch (e) { /* sin almacenamiento */ } };

// ---------------------------------------------------------------- premios que se muestran (los paga el servidor)
function premiosDe(d, e) {
  const m = DIFICULTADES[d].premio * (AREA === 'abismo' ? 2 : 1), lista = [];   // el Abismo paga el doble (igual que el servidor)
  if (!ganada(d, e)) {
    lista.push({ ico: '🪙', n: RECOMPENSAS.oroPrimera * m, t: 'Oro' });
    if (e === 10) lista.push({ ico: '🧩', n: RECOMPENSAS.miniJefe.frag_runa * m, t: 'Fragmentos de Runa' });
    if (e === 20) { const j = RECOMPENSAS.jefe[d], x = AREA === 'abismo' ? 2 : 1; if (j.vales) lista.push({ ico: '🎟️', n: j.vales * x, t: 'Vale de sobre' }); if (j.runas) lista.push({ ico: '🔮', n: j.runas * x, t: 'Runas' }); }
    return { primera: true, lista };
  }
  return { primera: false, lista: [{ ico: '🪙', n: RECOMPENSAS.oroRepetir * m, t: 'Oro' }] };
}

// ---------------------------------------------------------------- mapa
const POS = Array.from({ length: 20 }, (_, i) => {         // camino en zigzag: 4 filas de 5
  const fila = Math.floor(i / 5), col = i % 5;
  return { x: 10 + (fila % 2 ? 4 - col : col) * 20, y: 13 + fila * 24 };
});

function nodo(e) {
  const abierta = etapaAbierta(dif, e), g = prog.get(clave(dif, e)), et = etapaDe(e), jefe = !!et.jefe;
  const siguiente = abierta && !g, k = clave(dif, e), revelar = abierta && !visto.has(AREA === 'portal' ? k : `${AREA}-${k}`);
  const cls = ['cp-nodo', jefe ? 'jefe' : '', abierta ? 'abierta' : 'oculta', g ? 'ganada' : '', siguiente ? 'siguiente' : '', sel === e ? 'sel' : '', revelar ? 'revelar' : ''].join(' ');
  const estr = g ? `<span class="cp-estr">${'★'.repeat(g.estrellas)}${'☆'.repeat(3 - g.estrellas)}</span>` : '';
  const cara = abierta
    ? `<span class="cp-num">${e}</span>${jefe ? `<span class="cp-jefe-ico">${e === 20 ? '👑' : '💀'}</span>` : ''}${estr}`
    : `<span class="cp-num">${jefe ? (e === 20 ? '👑' : '💀') : '?'}</span><span class="cp-candado">🔒</span>`;
  return `<button class="${cls}" data-etapa="${e}" style="--x:${POS[e - 1].x}%;--y:${POS[e - 1].y}%">${cara}</button>`;
}

function mapa() {
  const lineas = POS.slice(1).map((p, i) => {
    const q = POS[i], hecho = ganada(dif, i + 1);
    return `<line x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}" class="${hecho ? 'hecho' : ''}"/>`;
  }).join('');
  return `<div class="cp-portal"></div><svg class="cp-camino" viewBox="0 0 100 100" preserveAspectRatio="none">${lineas}</svg>
    ${Array.from({ length: 20 }, (_, i) => nodo(i + 1)).join('')}`;
}

// ---------------------------------------------------------------- detalle de la etapa
function retrato(p, i) {
  return `<div class="cp-ret" style="--c:${p.color}">${imgHtml(p.imagen, p.nombre) || `<span>${p.emoji}</span>`}${i === 0 ? '<i class="cp-corona">👑</i>' : ''}<small>${p.nombre}</small></div>`;
}

function detalle() {
  if (!sel) return `<div class="cp-vacio">Elige una etapa de ${AREAS[AREA].nombre}</div>`;
  const e = sel, et = etapaDe(e);
  if (!etapaAbierta(dif, e)) return `<div class="cp-oculta-det">
      <div class="cp-silueta">${et.jefe ? (e === 20 ? '👑' : '💀') : '❔'}</div>
      <h3>Etapa ${e} · ???</h3>
      <p>${difAbierta(dif) ? `Gana la etapa ${e - 1} para revelarla.` : AREA === 'abismo' ? `Completa la etapa 20 del Portal en ${DIFICULTADES[dif].nombre} para abrir el Abismo en esta dificultad.` : `Completa la etapa 20 en ${DIFICULTADES[DIFS[DIFS.indexOf(dif) - 1]].nombre} para abrir esta dificultad.`}</p></div>`;
  const tema = TEMAS[et.tema], eq = equipoDeTema(et.tema), g = prog.get(clave(dif, e)), pr = premiosDe(dif, e);
  const conds = [['Ganar la batalla', 1], ['Sin perder aliados', 2], [`Ganar en ${RONDAS_3_ESTRELLAS} rondas o menos`, 3]];
  return `<div class="cp-det">
    <div class="cp-det-top"><span class="cp-etq">Etapa ${e} · ${DIFICULTADES[dif].nombre}</span>${et.jefe ? `<span class="cp-tag-jefe">${e === 20 ? '👑 JEFE FINAL' : '💀 MINI-JEFE'}</span>` : ''}</div>
    <h3>${tema.nombre}</h3>
    <div class="cp-rivales">${eq.map(retrato).join('')}</div>
    <div class="cp-bloque"><b>Recompensas ${pr.primera ? '<span class="cp-primera">1.ª victoria</span>' : '<span class="cp-rep">repetir</span>'}</b>
      <div class="cp-premios">${pr.lista.map(r => `<span title="${r.t}">${r.ico} ${miles(r.n)}</span>`).join('')}</div></div>
    <div class="cp-bloque"><b>Estrellas ${g ? `<span class="cp-estr">${'★'.repeat(g.estrellas)}${'☆'.repeat(3 - g.estrellas)}</span>` : ''}</b>
      <ul class="cp-conds">${conds.map(([t, n]) => `<li class="${g && g.estrellas >= n ? 'ok' : ''}">${g && g.estrellas >= n ? '★' : '☆'} ${t}</li>`).join('')}</ul></div>
    <div class="cp-acciones">
      <button class="eq-listo" data-jugar>⚔️ Elegir equipo</button>
      ${g ? '<button class="eq-btn" data-serie="5">🔁 Repetir ×5</button><button class="eq-btn" data-serie="10">🔁 Repetir ×10</button>' : ''}
    </div></div>`;
}

// ---------------------------------------------------------------- pintar
function pintar() {
  const total = totalEstrellas(dif);
  $('#cp-titulo').textContent = AREAS[AREA].titulo;
  $('#cp-areas').innerHTML = AREA_IDS.map(a => `<button class="${a === AREA ? 'on' : ''} ${areaAbierta(a) ? '' : 'cerrada'}" data-area="${a}">${areaAbierta(a) ? '' : '🔒 '}${AREAS[a].titulo}</button>`).join('');
  $('#cp-mapa').classList.toggle('abismo', AREA === 'abismo');
  $('#cp-difs').innerHTML = DIFS.map(d => `<button class="${d === dif ? 'on' : ''} ${difAbierta(d) ? '' : 'cerrada'}" data-dif="${d}">${difAbierta(d) ? '' : '🔒 '}${DIFICULTADES[d].nombre}</button>`).join('');
  $('#cp-estrellas').innerHTML = `⭐ <b>${total}</b>/60 ${[20, 40, 60].map(u => `<span class="cp-cofre ${total >= u ? 'abierto' : ''}" title="Cofre de ${u} estrellas">🎁${u}</span>`).join('')}`;
  $('#cp-mapa').innerHTML = mapa();
  $('#cp-detalle').innerHTML = detalle();
  // marca como vistas las etapas recién reveladas (la animación ya quedó puesta)
  setTimeout(() => { for (let e = 1; e <= 20; e++) if (etapaAbierta(dif, e)) marcarVisto(clave(dif, e)); }, 50);
}

function aviso(texto) {
  const a = $('#cp-aviso'); a.textContent = texto; a.classList.add('ver');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('ver'), 3200);
}

// ---------------------------------------------------------------- carga
async function cargar() {
  if (cargando) return;
  cargando = true;
  $('#cp-mapa').innerHTML = '<div class="cp-cargando">Abriendo el Portal…</div>'; $('#cp-detalle').innerHTML = '';
  try {
    if (!perfilActual()) { $('#cp-mapa').innerHTML = `<div class="cp-sin-sesion"><p>Inicia sesión para cruzar el Portal: tu progreso y tus premios se guardan en tu cuenta.</p><button class="eq-listo" data-login>👤 Iniciar sesión</button></div>`; return; }
    const [p, p2, c] = await Promise.all([D.miCampana('portal'), D.miCampana('abismo').catch(() => []), D.miColeccion()]);
    const aMapa = l => new Map((l || []).map(r => [clave(r.dificultad, r.etapa), { estrellas: r.estrellas, victorias: r.victorias, ultima: Date.parse(r.ultima) }]));
    progAreas.portal = aMapa(p); progAreas.abismo = aMapa(p2);
    if (!areaAbierta(AREA)) AREA = 'portal';
    prog = progAreas[AREA];
    propios = new Set((c || []).map(r => r.campeon));
    if (!difAbierta(dif)) dif = 'normal';
    if (!sel || !etapaAbierta(dif, sel)) sel = siguienteDe(dif);
    pintar();
  } catch (e) {
    $('#cp-mapa').innerHTML = `<div class="cp-sin-sesion"><p>${D.mensajeError(e)}</p><button class="eq-btn" data-reintentar>Reintentar</button></div>`;
  } finally { cargando = false; }
}
const siguienteDe = d => { for (let e = 1; e <= 20; e++) if (etapaAbierta(d, e) && !ganada(d, e)) return e; return 20; };

// ---------------------------------------------------------------- jugar
function opcionesDe(d, e) {
  const et = etapaDe(e), cfg = DIFICULTADES[d];
  return {
    campana: { area: AREA, dif: d, etapa: e, tema: TEMAS[et.tema].nombre, jefe: !!et.jefe },
    rival: { ...cfg.rival, poder: et.poder * cfg.mult, jefe: et.jefe ? {} : undefined },
  };
}
function elegirEquipo(e, serie = 0) {
  if (propios.size < 5) return aviso('Necesitas al menos 5 campeones: abre tu Starter Pack en la Tienda.');
  const et = etapaDe(e);
  equipoCampana({
    titulo: `${TEMAS[et.tema].nombre} · Etapa ${e}`,
    rivales: equipoDeTema(et.tema), propios,
    alVolver: () => irA('campana'),
    alListo: eqJ => alJugar(eqJ, equipoDeTema(et.tema), { ...opcionesDe(dif, e), serie }),
  });
}

// Después de una batalla de campaña: calcula las estrellas, cobra en el servidor y devuelve lo que se mostrará
export async function cerrarBatalla({ campana, gano, muertosAliados, rondas }) {
  const n = estrellas({ gano, muertosAliados, rondas });
  const res = { estrellas: n, condiciones: [gano, gano && muertosAliados === 0, gano && rondas <= RONDAS_3_ESTRELLAS], recompensas: [], avisos: [] };
  if (!gano) return res;
  const k = clave(campana.dif, campana.etapa), pa = progAreas[campana.area] || prog, antes = pa.get(k);
  try {
    const r = await D.campanaCompletar(campana.area, campana.dif, campana.etapa, n);
    res.recompensas = (r.recompensas || []).filter(x => x.tipo !== 'cofre');
    res.primera = r.primera;
    for (const c of (r.recompensas || []).filter(x => x.tipo === 'cofre')) res.avisos.push(`🎁 ¡Cofre de ${c.cantidad} estrellas abierto!`);
    pa.set(k, { estrellas: Math.max(n, antes?.estrellas || 0), victorias: (antes?.victorias || 0) + 1, ultima: Date.now() });
    if (n === 3 && (!antes || antes.estrellas < 3)) res.avisos.unshift('🌟 ¡Etapa perfecta!');
    if (!antes && campana.etapa < 20) res.avisos.push('🌀 ¡Nueva etapa revelada!');
    if (!antes && campana.etapa === 20 && campana.area === 'portal') res.avisos.push(`🕳️ ¡El Abismo se abrió en ${DIFICULTADES[campana.dif].nombre}!`);
    if (!antes && campana.etapa === 20 && campana.area === 'portal' && campana.dif !== 'brutal') res.avisos.push(`🔓 ¡Dificultad ${DIFICULTADES[DIFS[DIFS.indexOf(campana.dif) + 1]].nombre} desbloqueada!`);
  } catch (e) {
    res.error = D.mensajeError(e);
  }
  return res;
}
// Siguiente etapa (si existe y ya está abierta) para el botón de resultados
export function siguienteEtapa(campana) {
  const e = campana.etapa + 1;
  return e <= 20 && etapaAbierta(campana.dif, e) ? e : null;
}
export function jugarEtapa(d, e, eqJ, serie = 0) { alJugar(eqJ, equipoDeTema(etapaDe(e).tema), { ...opcionesDe(d, e), serie }); }
export function elegirEquipoEtapa(d, e) { dif = d; sel = e; elegirEquipo(e); }
// Segundos que faltan para poder cobrar otra repetición (el servidor exige 90 s entre victorias)
export function esperaRepeticion() {
  const ultima = Math.max(0, ...[...progAreas.portal.values(), ...progAreas.abismo.values()].map(v => v.ultima || 0));
  return Math.max(0, Math.ceil((ultima + 90000 - Date.now()) / 1000));
}

// ---------------------------------------------------------------- arranque
export function iniciarCampana({ jugar }) {
  alJugar = jugar;
  $('#cp-volver').addEventListener('click', () => irA('menu'));
  $('#pantalla-campana').addEventListener('click', e => {
    const t = e.target;
    const ar = t.closest('[data-area]');
    if (ar) { if (!areaAbierta(ar.dataset.area)) return aviso('Completa la etapa 20 del Portal en Normal para abrir el Abismo.'); AREA = ar.dataset.area; prog = progAreas[AREA]; if (!difAbierta(dif)) dif = 'normal'; sel = siguienteDe(dif); sonar('elegir'); return pintar(); }
    const d = t.closest('[data-dif]');
    if (d) { if (!difAbierta(d.dataset.dif)) return aviso(`Completa la etapa 20 en ${DIFICULTADES[DIFS[DIFS.indexOf(d.dataset.dif) - 1]].nombre} para abrir ${DIFICULTADES[d.dataset.dif].nombre}.`); dif = d.dataset.dif; sel = siguienteDe(dif); sonar('elegir'); return pintar(); }
    const n = t.closest('.cp-nodo'); if (n) { sel = +n.dataset.etapa; sonar('elegir'); return pintar(); }
    if (t.closest('[data-jugar]')) return elegirEquipo(sel);
    const s = t.closest('[data-serie]'); if (s) return elegirEquipo(sel, +s.dataset.serie);
    if (t.closest('[data-login]')) return $('#btn-cuenta')?.click();
    if (t.closest('[data-reintentar]')) return cargar();
  });
  addEventListener('cuenta:cambio', () => { if (document.body.dataset.pantalla === 'campana') cargar(); });
}
export const abrirCampana = () => cargar();
