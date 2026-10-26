// Ventana de Misiones diarias: progreso de las 10 misiones y botón para cobrar cada premio. El servidor cuenta y paga
// (docs/sql/016_misiones_runas.sql); el botón del menú muestra cuántos premios hay listos para cobrar.
import { MISIONES, COLOR_DIFICULTAD, avance } from '../datos/misiones.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { perfilActual } from './cuenta.js';
import { aviso } from './coleccion.js';
import * as D from '../servicios/datos.js';

const $ = s => document.querySelector(s);
const num = n => Number(n || 0).toLocaleString('es-MX');
let est = null, error = '', ocupado = false;

const PREMIO = {
  oro:          n => `🪙 ${num(n)}`,
  polvo:        n => `<img class="ico-runa" src="assets/items/polvoArcano.png" alt="Polvo Arcano" title="Polvo Arcano"> ${n}`,
  runas_portal: n => `${ICONO_RUNA_PORTAL} ${n}`,
  frag_runa:    n => `🧩 ${n}`,
  trofeos:      n => `🏅 ${n}`,
  vales:        n => `🎟️ ${n} Vale de sobre`,
};
const NOMBRE = { oro: 'oro', polvo: 'Polvo Arcano', runas_portal: 'Runa de Portal', frag_runa: 'Fragmentos', trofeos: 'Trofeos de Orco', vales: 'Vale de sobre' };
const premioHtml = p => Object.entries(p).map(([k, n]) => `<span title="${NOMBRE[k]}">${PREMIO[k](n)}</span>`).join(' ');

const cobrada = m => (est?.cobradas || []).includes(m.id);
const lista = m => !cobrada(m) && avance(m, est?.progreso) >= m.meta;

function pintarBoton() {
  const b = $('#btn-misiones'); if (!b) return;
  b.classList.toggle('hidden', !perfilActual());
  const n = est ? MISIONES.filter(lista).length : 0;
  b.innerHTML = `📜 Misiones${n ? ` <i class="mi-badge">${n}</i>` : ''}`;
}

function pintar() {
  const c = $('#mi-cont'); if (!c) return;
  if (error) return void (c.innerHTML = `<p class="tc-vacio">${error}</p>`);
  if (!est) return void (c.innerHTML = '<p class="tc-vacio">Cargando…</p>');
  c.innerHTML = `<p class="tc-nota">Se renuevan cada día a medianoche (hora de México). Completa las 9 para cobrar la última.</p>
    ${MISIONES.map(m => {
      const n = avance(m, est.progreso), hecha = cobrada(m), ok = n >= m.meta;
      return `<div class="mi-fila${hecha ? ' hecha' : ok ? ' lista' : ''}" style="--c:${COLOR_DIFICULTAD[m.dificultad]}">
        <div class="mi-info"><div class="mi-txt"><b>${m.texto}</b><span class="mi-dif">${m.dificultad}</span></div>
          <div class="mi-barra"><i style="width:${Math.round(n / m.meta * 100)}%"></i></div>
          <div class="mi-sub"><span>${num(n)} / ${num(m.meta)}</span><span class="mi-premio">${premioHtml(m.premio)}</span></div></div>
        <button class="${ok && !hecha ? 'eq-listo' : 'eq-btn'}" data-cobrar="${m.id}" ${ok && !hecha ? '' : 'disabled'}>${hecha ? '✓ Cobrada' : ok ? 'Cobrar' : 'En curso'}</button>
      </div>`; }).join('')}`;
}

async function cargar() {
  try { est = await D.misionesEstado(); error = ''; }
  catch (e) { est = null; error = /misiones_estado/i.test(e?.message || '') ? 'Falta ejecutar docs/sql/016_misiones_runas.sql en el servidor.' : D.mensajeError(e); }
}

export async function abrirMisiones() {
  if (!perfilActual()) return;
  $('#misiones').classList.remove('hidden');
  pintar(); await cargar(); pintar(); pintarBoton();
}
const cerrar = () => $('#misiones').classList.add('hidden');

async function cobrar(id) {
  if (ocupado) return; ocupado = true;
  try {
    const r = await D.misionesCobrar(id);
    aviso(`¡Premio cobrado! ${Object.entries(r.premio).map(([k, n]) => `+${num(n)} ${NOMBRE[k]}`).join(' · ')}`);
    dispatchEvent(new Event('inventario:cambio'));
  } catch (e) { aviso(D.mensajeError(e), 'error'); }
  ocupado = false;
  await cargar(); pintar(); pintarBoton();
}

export function iniciarMisiones() {
  $('#btn-misiones').addEventListener('click', abrirMisiones);
  $('#misiones').addEventListener('click', e => {
    if (e.target.id === 'misiones' || e.target.closest('#misiones-x')) return cerrar();
    const b = e.target.closest('[data-cobrar]'); if (b && !b.disabled) cobrar(+b.dataset.cobrar);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#misiones').classList.contains('hidden')) cerrar(); });
  // al volver al menú se refresca el contador del botón
  addEventListener('cuenta:cambio', async () => { est = null; pintarBoton(); if (perfilActual()) { await cargar(); pintarBoton(); } });
  addEventListener('menu:mostrar', async () => { if (perfilActual()) { await cargar(); pintarBoton(); } });
  pintarBoton();
}
