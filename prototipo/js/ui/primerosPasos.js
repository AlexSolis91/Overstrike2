// Ventana "Primeros pasos": objetivos para jugadores nuevos con premios pequeños. El servidor revisa y paga
// (docs/sql/040). El botón del menú desaparece cuando ya cobró todo (o si falta el SQL).
import { PRIMEROS_PASOS } from '../datos/primerosPasos.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { perfilActual } from './cuenta.js';
import { aviso, abrirTC } from './coleccion.js';
import { irA } from './menu.js';
import * as D from '../servicios/datos.js';

const $ = s => document.querySelector(s);
const num = n => Number(n || 0).toLocaleString('es-MX');
let est = null, error = '', ocupado = false;

const PREMIO = { oro: n => `🪙 ${num(n)}`, vales: n => `🎟️ ${n} Vale${n > 1 ? 's' : ''} de sobre`, runas_portal: n => `${ICONO_RUNA_PORTAL} ${n} Runa${n > 1 ? 's' : ''} de Portal` };
const NOMBRE = { oro: 'oro', vales: 'Vale de sobre', runas_portal: 'Runas de Portal' };
const premioHtml = p => Object.entries(p).map(([k, n]) => `<span>${PREMIO[k](n)}</span>`).join(' ');
const estadoDe = clave => est?.find(x => x.clave === clave) || { hecho: false, cobrado: false };
const terminado = () => !!est && estadoDe('todos').cobrado;
const listos = () => (est || []).filter(x => x.hecho && !x.cobrado).length;

function pintarBoton() {
  const b = $('#btn-pasos'); if (!b) return;
  b.classList.toggle('hidden', !perfilActual() || !est || terminado());
  const n = listos();
  b.innerHTML = `🧭 Primeros pasos${n ? ` <i class="mi-badge">${n}</i>` : ''}`;
}
function pintar() {
  const c = $('#pasos-cont'); if (!c) return;
  if (error) return void (c.innerHTML = `<p class="tc-vacio">${error}</p>`);
  if (!est) return void (c.innerHTML = '<p class="tc-vacio">Cargando…</p>');
  const hechos = PRIMEROS_PASOS.filter(p => !p.final && estadoDe(p.clave).cobrado).length, total = PRIMEROS_PASOS.filter(p => !p.final).length;
  c.innerHTML = `<p class="tc-nota">Thestalos te deja estos objetivos para conocer el juego. Cumple cada uno y cobra su premio. Llevas <b>${hechos}/${total}</b>.</p>
    ${PRIMEROS_PASOS.map(p => {
      const e = estadoDe(p.clave), ok = e.hecho && !e.cobrado;
      const boton = e.cobrado ? '<button class="eq-btn" disabled>✓ Cobrado</button>'
        : ok ? `<button class="eq-listo" data-cobrar="${p.clave}">Cobrar</button>`
        : p.ir ? `<button class="eq-btn" data-ir="${p.ir}">Ir ▸</button>` : '<button class="eq-btn" disabled>En curso</button>';
      return `<div class="mi-fila${e.cobrado ? ' hecha' : ok ? ' lista' : ''}${p.final ? ' pp-final' : ''}" style="--c:#f7c948">
        <div class="mi-info"><div class="mi-txt"><b>${p.texto}</b></div>
          <div class="mi-sub"><span>${e.cobrado ? 'Completado' : e.hecho ? '¡Listo para cobrar!' : 'Pendiente'}</span><span class="mi-premio">${premioHtml(p.premio)}</span></div></div>
        <div class="pp-botones">${boton}</div></div>`; }).join('')}`;
}
async function cargar() {
  if (!perfilActual()) { est = null; return; }
  try { est = await D.primerosPasosEstado(); error = ''; }
  catch (e) { est = null; error = /primeros_pasos/i.test(e?.message || '') ? 'Todavía no está disponible.' : D.mensajeError(e); }
}
export async function abrirPasos() {
  if (!perfilActual()) return;
  $('#pasos').classList.remove('hidden');
  pintar(); await cargar(); pintar(); pintarBoton();
}
const cerrar = () => $('#pasos').classList.add('hidden');

async function cobrar(clave) {
  if (ocupado) return; ocupado = true;
  try {
    const r = await D.primerosPasosCobrar(clave);
    aviso(`¡Premio cobrado! ${Object.entries(r.premio).map(([k, n]) => `+${num(n)} ${NOMBRE[k]}`).join(' · ')}`);
    dispatchEvent(new Event('inventario:cambio'));
  } catch (e) { aviso(D.mensajeError(e), 'error'); }
  ocupado = false;
  await cargar(); pintar(); pintarBoton();
}
function ir(destino) {
  cerrar();
  if (destino.startsWith('tc:')) return abrirTC(destino.slice(3));
  irA(destino);
}

export function iniciarPrimerosPasos() {
  $('#btn-pasos').addEventListener('click', abrirPasos);
  $('#pasos').addEventListener('click', e => {
    if (e.target.id === 'pasos' || e.target.closest('#pasos-x')) return cerrar();
    const b = e.target.closest('[data-cobrar]'); if (b && !b.disabled) return cobrar(b.dataset.cobrar);
    const i = e.target.closest('[data-ir]'); if (i) ir(i.dataset.ir);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#pasos').classList.contains('hidden')) cerrar(); });
  const refrescar = async () => { await cargar(); pintarBoton(); };
  addEventListener('cuenta:cambio', refrescar);
  addEventListener('menu:mostrar', refrescar);
}
