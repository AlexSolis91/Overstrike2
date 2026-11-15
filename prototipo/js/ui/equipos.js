// Equipos guardados (Construcción de Equipos): caché del servidor, guardar / borrar y la ventana "Cargar Equipo".
// Servidor: docs/sql/042_equipos_guardados.sql (hasta 20 por jugador, nombre de 1–24 letras, 5 campeones propios).
import * as D from '../servicios/datos.js';
import { porId } from '../datos/personajes/index.js';
import { perfilActual } from './cuenta.js';
import { imgHtml } from './imagenes.js';
import { sonar } from './audio.js';

export const MAX_EQUIPOS = 20, MAX_NOMBRE = 24;
let lista = null;                                   // null = todavía sin leer del servidor
addEventListener('cuenta:cambio', () => { lista = null; });

export async function misEquipos({ forzar = false } = {}) {
  if (!perfilActual()) return [];
  if (!lista || forzar) lista = (await D.misEquipos()) || [];
  return lista;
}
export async function guardarEquipo(id, nombre, ids) {
  const fila = await D.equipoGuardar(id, nombre.trim(), ids);
  await misEquipos({ forzar: true });
  return fila;
}
export async function borrarEquipo(id) {
  await D.equipoBorrar(id);
  if (lista) lista = lista.filter(e => e.id !== id);
}
export function mensajeEquipos(e) {
  const m = String(e?.message || '');
  if (/equipos_guardados|equipo_guardar|equipo_borrar|schema cache|does not exist/i.test(m)) return 'La Construcción de Equipos todavía no está activa en el servidor.';
  return D.mensajeError(e);
}
export const fichasDe = eq => (eq.campeones || []).map(porId);
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mini = p => p ? `<span class="eqg-mini" style="--c:${p.color}" title="${esc(p.nombre)}">${imgHtml(p.imagen, p.nombre) || p.emoji}</span>` : '<span class="eqg-mini">?</span>';
// Fila de un equipo guardado: nombre, sus 5 retratos (el primero es el líder) y la habilidad de líder
export function filaEquipoHtml(eq, attrs = '', on = false) {
  const f = fichasDe(eq), lider = f[0];
  return `<button class="eqg-fila ${on ? 'on' : ''}" ${attrs}><b class="eqg-nom">${esc(eq.nombre)}</b>
    <span class="eqg-minis">${f.map(mini).join('')}</span>
    <small>${lider ? (lider.lider ? `👑 ${esc(lider.lider.nombre)}` : `⚠️ ${esc(lider.nombre)} no tiene habilidad de líder`) : ''}</small></button>`;
}

// Ventana "Cargar Equipo": lista los equipos guardados. Resuelve con el equipo elegido o null.
export function elegirEquipoGuardado({ titulo = '📂 Cargar Equipo' } = {}) {
  return new Promise(ok => {
    const fondo = document.createElement('div');
    fondo.className = 'dlg-fondo';
    fondo.innerHTML = `<div class="hov-caja dlg-caja eqg-caja" role="dialog" aria-modal="true"><h2>${titulo}</h2>
      <div class="eqg-cargar"><p class="tc-tenue">Cargando tus equipos…</p></div>
      <div class="hov-botones"><button class="hd-btn sec" data-r="0">Cancelar</button></div></div>`;
    let equipos = [];
    const cerrar = r => { removeEventListener('keydown', tecla, true); fondo.remove(); ok(r); };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(null); } };
    fondo.addEventListener('click', e => {
      const f = e.target.closest('[data-cargar]'); if (f) { sonar('elegir'); return cerrar(equipos.find(x => x.id === f.dataset.cargar) || null); }
      if (e.target.closest('[data-r]') || e.target === fondo) cerrar(null);
    });
    addEventListener('keydown', tecla, true);
    document.body.appendChild(fondo);
    sonar('abrir');
    misEquipos().then(l => {
      equipos = l;
      fondo.querySelector('.eqg-cargar').innerHTML = l.length ? l.map(eq => filaEquipoHtml(eq, `data-cargar="${eq.id}"`)).join('')
        : '<p class="tc-tenue">Aún no tienes equipos guardados. Créalos en <b>🛠️ Construcción de Equipos</b> (menú principal) o con <b>💾 Guardar</b> en esta pantalla.</p>';
    }).catch(e => { fondo.querySelector('.eqg-cargar').innerHTML = `<p class="tc-tenue">${esc(mensajeEquipos(e))}</p>`; });
  });
}
