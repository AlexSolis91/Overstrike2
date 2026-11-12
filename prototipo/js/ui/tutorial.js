// Tutorial con Thestalos, Guardián del Portal: un retrato que habla en un cuadro de diálogo, con el resto de la pantalla
// oscurecida y un foco que ilumina el botón del que se habla. Textos y pasos: js/datos/tutorial.js.
//   · Cuenta nueva: bienvenida → Starter Pack → batalla guiada (victoria segura) → recorrido del menú → primera compra
//     guiada con un Vale de sobre → regalo.
//   · Cuenta anterior al tutorial: se le ofrece una vez el recorrido del menú, la compra guiada y el regalo.
//   · Mini tutoriales: la primera vez que entra a cada pantalla, pestaña o modo (después del recorrido inicial).
//   · Botón "?": repite el mini tutorial de la pantalla en la que está.
// Lo visto se guarda en la cuenta (jugadores.tutorial, docs/sql/038) y, de respaldo, en este dispositivo.
import { GUIA, BIENVENIDA, ANTES_BATALLA, BATALLA_INICIO, BATALLA_TURNO, BATALLA_VICTORIA, BATALLA_DERROTA, MENU, DESPEDIDA,
  OFERTA_VETERANO, RIVALES_TUTORIAL, SEMILLA_TUTORIAL, MINI, PREMIO_TUTORIAL,
  COMPRA_REGALO, COMPRA_TIENDA, COMPRA_SOBRE, COMPRA_SOBRE_OTRO, COMPRA_FIN } from '../datos/tutorial.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { porId } from '../datos/personajes/index.js';
import { perfilActual } from './cuenta.js';
import { mostrarStarter } from './coleccion.js';
import { marcarVista as marcarNovedades } from './novedades.js';
import { confirmar, avisar } from './dialogo.js';
import { irA } from './menu.js';
import { sonar } from './audio.js';
import * as D from '../servicios/datos.js';

const $ = s => document.querySelector(s);
const espera = ms => new Promise(ok => setTimeout(ok, ms));
const miles = n => Math.round(n).toLocaleString('es-MX');
let raiz = null, corriendo = false, jugar = null, alTerminarBatalla = null, idsStarter = null;

// ---------------------------------------------------------------- qué ya vio (cuenta + respaldo local)
const claveLocal = () => `os2-tuto-${perfilActual()?.id}`;
const local = () => { try { return JSON.parse(localStorage.getItem(claveLocal()) || '{}'); } catch { return {}; } };
const disponible = () => !!perfilActual()?.tutorial;          // sin docs/sql/038 no hay tutorial (el juego sigue como antes)
const visto = k => !!(perfilActual()?.tutorial?.[k] || local()[k]);
function marcar(k) {
  const p = perfilActual(); if (!p) return;
  p.tutorial = { ...(p.tutorial || {}), [k]: true };
  try { localStorage.setItem(claveLocal(), JSON.stringify({ ...local(), [k]: true })); } catch { /* sin almacenamiento */ }
  D.tutorialMarcar(k).catch(() => null);
}
function olvidarMinis() {
  const p = perfilActual(), l = local();
  for (const k of Object.keys(MINI)) { if (p?.tutorial) delete p.tutorial[k]; delete l[k]; }
  try { localStorage.setItem(claveLocal(), JSON.stringify(l)); } catch { /* sin almacenamiento */ }
}

// ---------------------------------------------------------------- la ventana de Thestalos
function crear() {
  if (raiz) return raiz;
  raiz = document.createElement('div');
  raiz.id = 'tuto'; raiz.className = 'hidden';
  raiz.innerHTML = `<div class="tuto-velo"></div><div class="tuto-foco"><i class="tuto-flecha">▼</i></div>
    <div class="tuto-dialogo"><img class="tuto-retrato" src="${GUIA.imagen}" alt="${GUIA.nombre}">
      <div class="tuto-caja"><div class="tuto-nombre">${GUIA.nombre} <small>${GUIA.titulo}</small></div>
        <p class="tuto-texto"></p><div class="tuto-extra"></div>
        <div class="tuto-pie"><span class="tuto-paso"></span><button class="tuto-sig">Siguiente ▸</button></div></div></div>
    <button class="tuto-saltar">Saltar tutorial</button>`;
  document.body.appendChild(raiz);
  return raiz;
}
function cerrarVentana() {
  if (!raiz) return;
  raiz.classList.add('hidden'); raiz.classList.remove('entra');
  document.body.classList.remove('tuto-activo');
}
const visible = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden' ? r : null; };
// "*palabra*" se resalta; el texto aparece letra por letra
const trozos = t => t.split(/(\*[^*]+\*)/).filter(Boolean).map(s => s.startsWith('*') ? { t: s.slice(1, -1), b: true } : { t: s, b: false });
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function htmlHasta(tr, n) {
  let h = '';
  for (const x of tr) { if (n <= 0) break; const s = esc(x.t.slice(0, n)); h += x.b ? `<b>${s}</b>` : s; n -= x.t.length; }
  return h;
}

// Muestra un paso y espera: 'sig' (siguiente), 'saltar', o el id de la opción elegida
function paso(p, i, n, { saltable }) {
  const r = crear();
  return new Promise(ok => {
    r.classList.remove('hidden'); document.body.classList.add('tuto-activo');
    requestAnimationFrame(() => r.classList.add('entra'));
    r.querySelector('.tuto-saltar').classList.toggle('hidden', !saltable);
    r.querySelector('.tuto-paso').textContent = n > 1 ? `${i + 1} / ${n}` : '';
    const extra = r.querySelector('.tuto-extra'), sig = r.querySelector('.tuto-sig'), txt = r.querySelector('.tuto-texto');
    extra.innerHTML = p.opciones ? `<div class="tuto-opciones">${p.opciones.map(o => `<button class="hd-btn ${o.sec ? 'sec' : ''}" data-op="${o.id}">${o.texto}</button>`).join('')}</div>` : '';
    sig.classList.toggle('hidden', !!p.opciones || !!p.clic);
    sig.textContent = i === n - 1 ? 'Continuar ▸' : 'Siguiente ▸';
    // foco: se recoloca solo (el botón puede moverse con animaciones o al girar el teléfono)
    const foco = r.querySelector('.tuto-foco');
    const colocar = () => {
      const rect = p.foco ? visible($(p.foco)) : null;
      r.classList.toggle('con-foco', !!rect);
      if (!rect) return;
      const m = 8;
      Object.assign(foco.style, { left: `${rect.left - m}px`, top: `${rect.top - m}px`, width: `${rect.width + m * 2}px`, height: `${rect.height + m * 2}px` });
      r.classList.toggle('foco-abajo', rect.top + rect.height / 2 > innerHeight * .5);   // el diálogo se va arriba
    };
    const objetivo = p.foco && $(p.foco), ro = objetivo && visible(objetivo);   // fuera de la vista (p. ej. un sobre abajo en la Tienda): se desplaza hasta él
    if (ro && (ro.top < 0 || ro.bottom > innerHeight)) objetivo.scrollIntoView({ block: 'center' });
    colocar();
    const reloj = setInterval(colocar, 250);
    // texto letra por letra
    const tr = trozos(p.texto), total = tr.reduce((s, x) => s + x.t.length, 0);
    let k = 0;
    txt.innerHTML = '';
    const escribir = setInterval(() => { k = Math.min(total, k + 2); txt.innerHTML = htmlHasta(tr, k); if (k >= total) clearInterval(escribir); }, 22);
    const completo = () => { if (k >= total) return true; k = total; clearInterval(escribir); txt.innerHTML = htmlHasta(tr, k); return false; };
    const fin = res => { clearInterval(reloj); clearInterval(escribir); r.removeEventListener('click', clic); removeEventListener('keydown', tecla, true); ok(res); };
    const clic = async e => {
      e.stopPropagation();
      if (e.target.closest('.tuto-saltar')) {
        if (await confirmar('¿Saltar el tutorial? Puedes repetirlo cuando quieras desde tu perfil (👤).', { titulo: GUIA.nombre, aceptar: 'Saltar', cancelar: 'Seguir' })) fin('saltar');
        return;
      }
      const op = e.target.closest('[data-op]');
      if (op) return fin(op.dataset.op);
      if (p.clic) {                                     // hay que tocar el botón iluminado: el toque se le pasa
        const rect = visible($(p.foco));
        if (rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) { fin('sig'); cerrarVentana(); $(p.foco).click(); }
        else { foco.classList.remove('late'); void foco.offsetWidth; foco.classList.add('late'); }
        return;
      }
      if (p.opciones) return;
      if (completo()) fin('sig');
    };
    const tecla = e => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
      if (document.querySelector('.dlg-fondo')) return;  // hay una confirmación encima
      e.preventDefault(); e.stopPropagation();
      if (!p.opciones && !p.clic && completo()) fin('sig');
    };
    r.addEventListener('click', clic);
    addEventListener('keydown', tecla, true);
    if (p.premio) darPremio(extra);
    if (p.vale) darVale(extra);
  });
}
// Una conversación: resuelve true si la terminó, false si saltó el tutorial (o el id de la opción, si el último paso tiene opciones)
async function hablar(pasos, { saltable = true, cerrar = true } = {}) {
  sonar('abrir');
  let res = 'sig';
  for (let i = 0; i < pasos.length; i++) {
    res = await paso(pasos[i], i, pasos.length, { saltable });
    if (res === 'saltar') { if (cerrar) cerrarVentana(); return false; }
    if (pasos[i].esperar) await hastaQue(() => $(pasos[i].esperar), 15000);   // p. ej. que se abra la ventana que tocó
  }
  if (cerrar) cerrarVentana();
  return res === 'sig' ? true : res;
}

async function hastaQue(cond, maxMs) {
  for (let t = 0; t < maxMs && !cond(); t += 150) await espera(150);
  await espera(250);                                      // que termine de dibujarse
}
const esperarEvento = nombres => new Promise(ok => {
  const f = e => { for (const n of nombres) removeEventListener(n, f); ok(e.type); };
  for (const n of nombres) addEventListener(n, f);
});

// ---------------------------------------------------------------- regalo final (lo entrega el servidor, una vez por cuenta)
async function darPremio(caja) {
  const tarjeta = (ico, n, t) => `<div class="tuto-premio-item"><span class="tuto-premio-ico">${ico}</span><b>${n}</b><small>${t}</small></div>`;
  caja.innerHTML = `<div class="tuto-premio">${tarjeta('🪙', miles(PREMIO_TUTORIAL.oro), 'Oro')}${tarjeta(ICONO_RUNA_PORTAL, PREMIO_TUTORIAL.runasPortal, 'Runas de Portal')}</div>`;
  try {
    await D.tutorialPremio();
    sonar('listo');
    caja.querySelector('.tuto-premio')?.classList.add('cobrado');
    dispatchEvent(new Event('inventario:cambio'));
  } catch (e) {
    const ya = /Ya recibiste/i.test(D.mensajeError(e));
    caja.insertAdjacentHTML('beforeend', `<p class="tuto-nota">${ya ? 'Ya habías recibido este regalo.' : 'No se pudo entregar el regalo: ' + esc(D.mensajeError(e))}</p>`);
  }
}

// ---------------------------------------------------------------- primera compra guiada (Vale de sobre del tutorial)
async function darVale(caja) {
  caja.innerHTML = '<div class="tuto-premio"><div class="tuto-premio-item"><span class="tuto-premio-ico">🎟️</span><b>1</b><small>Vale de sobre</small></div></div>';
  try {
    await D.tutorialVale();
    sonar('listo');
    caja.querySelector('.tuto-premio')?.classList.add('cobrado');
    dispatchEvent(new Event('inventario:cambio'));
  } catch (e) {
    const ya = /Ya recibiste/i.test(D.mensajeError(e));
    caja.insertAdjacentHTML('beforeend', `<p class="tuto-nota">${ya ? 'Ya habías recibido este vale.' : 'No se pudo entregar el vale: ' + esc(D.mensajeError(e))}</p>`);
  }
}
async function compraGuiada() {
  if (!await hablar(COMPRA_REGALO)) return false;
  let vales = 0;
  try { vales = (await D.miInventario())?.vales_sobre || 0; } catch { /* sin conexión: se salta la compra */ }
  if (!vales) return true;
  if (!await hablar(COMPRA_TIENDA)) return false;
  for (let intento = 0; intento < 3; intento++) {         // si cancela la confirmación, se lo vuelve a pedir (máx. 3 veces)
    const paso = $(COMPRA_SOBRE.foco) ? COMPRA_SOBRE : $(COMPRA_SOBRE_OTRO.foco) ? COMPRA_SOBRE_OTRO : null;
    if (!paso) break;
    const resultado = esperarEvento(['sobre:abierto', 'sobre:cancelado']);
    if (!await hablar([paso])) return false;
    if (await resultado === 'sobre:abierto') { await hablar(COMPRA_FIN); break; }
  }
  $('#tc-x')?.click();                                    // de vuelta al menú para la despedida
  await espera(400);
  return true;
}

// ---------------------------------------------------------------- recorrido inicial
function esperarStarter() {
  return new Promise(ok => {
    document.body.classList.add('tuto-starter');           // sin la ✕ de "Más tarde"
    const listo = e => { clearInterval(reloj); removeEventListener('starter:elegido', listo); document.body.classList.remove('tuto-starter'); idsStarter = e.detail || null; ok(); };
    addEventListener('starter:elegido', listo);
    mostrarStarter();
    const reloj = setInterval(() => {                     // si cierra la ventana sin elegir (Esc), se vuelve a abrir
      const p = perfilActual();
      if (!p) { clearInterval(reloj); removeEventListener('starter:elegido', listo); document.body.classList.remove('tuto-starter'); ok(); return; }
      if (!p.starter_elegido && $('#starter').classList.contains('hidden') && !document.querySelector('.dlg-fondo')) mostrarStarter();
    }, 600);
  });
}
async function equipoTutorial() {
  let ids = (idsStarter || []).filter(id => porId(id));
  if (ids.length < 5) { try { ids = (await D.miColeccion()).map(c => c.campeon).filter(id => porId(id)); } catch { ids = []; } }
  return [...new Set(ids)].slice(0, 5);
}
async function batalla() {
  const ids = await equipoTutorial();
  if (ids.length < 5 || !jugar) return true;              // sin 5 campeones no hay batalla guiada
  return new Promise(ok => { alTerminarBatalla = ok; jugar(ids.map(porId), RIVALES_TUTORIAL, { tutorial: true, semilla: SEMILLA_TUTORIAL }); });
}
async function recorrido({ conBatalla = true } = {}) {
  if (corriendo) return;
  corriendo = true;
  marcarNovedades();                                       // las Novedades no se encima con la bienvenida
  try {
    const p = perfilActual();
    if (!p.starter_elegido) {
      if (!visto('bienvenida')) { if (!await hablar(BIENVENIDA)) return saltado(); marcar('bienvenida'); }
      await esperarStarter();
      if (!perfilActual()?.starter_elegido) return;
    }
    if (conBatalla) {
      if (!await hablar(ANTES_BATALLA)) return saltado();
      const gano = await batalla();
      marcar('batalla');
      const ok = await hablar(gano ? BATALLA_VICTORIA : BATALLA_DERROTA);
      irA('menu');
      if (!ok) return saltado();
    }
    if (document.body.dataset.pantalla !== 'menu') irA('menu');
    await espera(700);
    if (!await hablar(MENU)) return saltado();
    if (!await compraGuiada()) return saltado();
    forzarAyuda = true; pintarAyuda();
    await hablar(visto('premio') ? DESPEDIDA.filter(x => !x.premio) : DESPEDIDA, { saltable: false });
    forzarAyuda = false;
    marcar('intro');
  } finally { corriendo = false; forzarAyuda = false; cerrarVentana(); }
}
function saltado() {
  marcar('intro');
  if (perfilActual() && !perfilActual().starter_elegido) mostrarStarter();
}

// ---------------------------------------------------------------- dentro de la batalla del tutorial (lo llama juego.js)
export async function tutorialEnBatalla(momento) {
  if (momento === 'inicio') await hablar(BATALLA_INICIO, { saltable: false });
  if (momento === 'turno') await hablar(BATALLA_TURNO, { saltable: false });
}
export function finBatallaTutorial(gano) { const f = alTerminarBatalla; alTerminarBatalla = null; f?.(gano); }

// ---------------------------------------------------------------- mini tutoriales
async function mini(clave) {
  if (corriendo || !disponible() || !visto('intro') || visto(clave) || !MINI[clave]) return;
  corriendo = true;
  marcar(clave);
  try {
    await espera(650);                                     // que la pantalla termine de dibujarse
    await hablar(MINI[clave], { saltable: false });
  } finally { corriendo = false; }
}
const PANTALLA_MINI = { equipo: 'equipo', campana: 'campana', horda: 'horda', raid: 'raid', arena: 'arena' };
// Tienda / Colección: qué mini tutorial toca según lo que está viendo
let vistaTC = null;
function claveTC(v) {
  if (!v) return null;
  if (v.pestana === 'coleccion' && v.detalle) return v.estrellas >= 5 && visto('campeon') ? 'moradas' : 'campeon';
  if (v.pestana === 'reliquias') return v.relSel ? 'reliquia' : v.relModo === 'descomponer' ? 'descomponer' : v.relModo === 'fusionar' ? 'fusionar' : 'reliquias';
  return v.pestana;
}

// ---------------------------------------------------------------- botón "?": repite el mini tutorial de la pantalla actual
function contexto() {
  if (!$('#misiones')?.classList.contains('hidden')) return 'misiones';
  if (!$('#tc')?.classList.contains('hidden')) return vistaTC?.pestana === 'coleccion' && vistaTC.detalle ? 'campeon' : claveTC(vistaTC);
  const p = document.body.dataset.pantalla;
  return p === 'menu' ? 'menu' : PANTALLA_MINI[p] || null;
}
const pasosDe = k => k === 'menu' ? MENU : MINI[k] || null;
let ayuda = null, forzarAyuda = false;   // forzarAyuda: Thestalos lo señala en la despedida
function pintarAyuda() {
  if (!ayuda) return;
  if (forzarAyuda) return void ayuda.classList.remove('hidden');
  const k = contexto();
  ayuda.classList.toggle('hidden', !perfilActual() || !disponible() || !visto('intro') || corriendo || !k || !pasosDe(k)
    || !!document.querySelector('.dlg-fondo') || !$('#guia').classList.contains('hidden') || !$('#starter').classList.contains('hidden')
    || !$('#pasos')?.classList.contains('hidden'));
}
async function repetirAyuda() {
  const k = contexto(), pasos = k && pasosDe(k);
  if (!pasos || corriendo) return;
  corriendo = true; pintarAyuda();
  try { await hablar(k === 'campeon' && vistaTC?.estrellas >= 5 ? [...MINI.campeon, ...MINI.moradas] : pasos, { saltable: false }); }
  finally { corriendo = false; pintarAyuda(); }
}

// ---------------------------------------------------------------- arranque
async function revisar() {
  const p = perfilActual();
  if (!p || !disponible() || corriendo || visto('intro') || document.body.dataset.pantalla !== 'menu') return;
  if (document.querySelector('.dlg-fondo') || !$('#tc').classList.contains('hidden')) return void setTimeout(revisar, 1500);
  if (!p.starter_elegido || visto('bienvenida')) return recorrido();     // cuenta nueva (o retoma donde se quedó)
  if (visto('oferta')) return;
  marcar('oferta');                                        // cuenta anterior al tutorial: se ofrece una sola vez
  corriendo = true;
  const r = await hablar([{ texto: OFERTA_VETERANO, opciones: [{ id: 'si', texto: '¡Sí, vamos!' }, { id: 'no', texto: 'Ahora no', sec: true }] }]);
  corriendo = false;
  if (r === 'si') return recorrido({ conBatalla: false });
  marcar('intro');
}

export function iniciarTutorial({ jugar: fn }) {
  jugar = fn;
  addEventListener('cuenta:cambio', () => setTimeout(revisar, 900));
  addEventListener('menu:mostrar', () => setTimeout(revisar, 900));
  addEventListener('tutorial:repetir', () => {
    if (corriendo || !perfilActual()) return;
    if (!disponible()) return void avisar('El tutorial todavía no está disponible. Inténtalo más tarde.', { titulo: GUIA.nombre });
    olvidarMinis();
    recorrido({ conBatalla: true });
  });
  addEventListener('tc:vista', e => { vistaTC = e.detail; mini(claveTC(e.detail)); });
  ayuda = document.createElement('button');
  ayuda.id = 'tuto-ayuda'; ayuda.className = 'hidden'; ayuda.textContent = '?'; ayuda.title = 'Ayuda de Thestalos: ¿cómo funciona esta pantalla?';
  ayuda.addEventListener('click', repetirAyuda);
  document.body.appendChild(ayuda);
  setInterval(pintarAyuda, 600);
  new MutationObserver(() => { const k = PANTALLA_MINI[document.body.dataset.pantalla]; if (k) mini(k); })
    .observe(document.body, { attributes: true, attributeFilter: ['data-pantalla'] });
  const mis = $('#misiones');
  if (mis) new MutationObserver(() => { if (!mis.classList.contains('hidden')) mini('misiones'); }).observe(mis, { attributes: true, attributeFilter: ['class'] });
}
