// Pantalla de resultados: Victoria/Derrota, recompensas y estadísticas de desempeño de cada personaje (estilo Raid).
import { TIPOS_RECOMPENSA, COLOR_RAREZA } from '../datos/recompensas.js';
import { imgHtml } from './imagenes.js';

const $ = s => document.querySelector(s);
const METRICAS = [
  { k: 'dano', icono: '⚔️', nombre: 'Daño', clase: 'dano' },
  { k: 'escudo', icono: '🛡️', nombre: 'Escudo', clase: 'escudo' },
  { k: 'curacion', icono: '💚', nombre: 'Curación', clase: 'curacion' },
  { k: 'recibido', icono: '🎯', nombre: 'Daño recibido', clase: 'recibido' },
];
// MVP: daño + escudo + curación + la mitad del daño recibido (aguantar también cuenta) + 150 por eliminación
const puntuacion = e => e.dano + e.escudo + e.curacion + e.recibido * .5 + e.elim * 150;
const miles = n => Math.round(n).toLocaleString('es-MX');

let datos = null;

function premios(lista) {
  if (!lista?.length) return '<div class="res-sin">Esta partida no otorga recompensas</div>';
  return lista.map(r => {
    const t = TIPOS_RECOMPENSA[r.tipo] || { nombre: r.tipo, icono: '🎁' };
    return `<div class="res-premio" style="--rc:${COLOR_RAREZA[r.rareza] || '#f3d58a'}" title="${r.nombre || t.nombre}${r.rareza ? ` (${r.rareza})` : ''}">
      <span class="res-premio-ico">${t.icono}</span><b>${miles(r.cantidad ?? 1)}</b></div>`;
  }).join('');
}

function cartas(lado) {
  const eq = datos.personajes.filter(e => e.lado === lado);
  const max = Object.fromEntries(METRICAS.map(m => [m.k, Math.max(1, ...eq.map(e => e[m.k]))]));
  const mvp = eq.reduce((a, b) => puntuacion(b) > puntuacion(a) ? b : a);
  $('#res-cartas').innerHTML = eq.map(e => `
    <div class="res-carta ${e.muerto ? 'muerto' : ''} ${e === mvp && puntuacion(e) > 0 ? 'mvp' : ''}" style="--c:${e.color}">
      ${e === mvp && puntuacion(e) > 0 ? '<span class="res-mvp">👑 MVP</span>' : ''}
      <div class="res-ret">${imgHtml(e.imagen, e.nombre) || `<span>${e.emoji}</span>`}${e.muerto ? '<span class="res-calavera">☠</span>' : ''}</div>
      <div class="res-nombre">${e.nombre}</div>
      ${METRICAS.map(m => `<div class="res-fila ${m.clase}" title="${m.nombre}">
        <span class="res-ico">${m.icono}</span>
        <div class="res-barra"><i data-ancho="${e[m.k] / max[m.k] * 100}"></i></div>
        <b data-valor="${e[m.k]}">0</b></div>`).join('')}
      <div class="res-elim" title="Eliminaciones">☠️ ${e.elim} ${e.elim === 1 ? 'eliminación' : 'eliminaciones'}</div>
    </div>`).join('');
  document.querySelectorAll('.res-tabs button').forEach(b => b.classList.toggle('on', b.dataset.lado === lado));
  animar();
}

// barras que se llenan y números que suben contando
function animar() {
  requestAnimationFrame(() => document.querySelectorAll('.res-barra i').forEach(i => { i.style.width = `${i.dataset.ancho}%`; }));
  const nums = [...document.querySelectorAll('.res-fila b')], t0 = performance.now(), dur = 900;
  const paso = ahora => {
    const k = Math.min(1, (ahora - t0) / dur), f = 1 - (1 - k) ** 3;
    for (const n of nums) n.textContent = miles(+n.dataset.valor * f);
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  setTimeout(() => {                                        // respaldo: si el navegador pausó la animación, quedan los valores finales
    for (const n of nums) n.textContent = miles(+n.dataset.valor);
    document.querySelectorAll('.res-barra i').forEach(i => { i.style.width = `${i.dataset.ancho}%`; });
  }, dur + 150);
}

// gano: true/false · ronda · duracionMs · personajes: estadísticas con nombre/imagen/color · recompensas: lista
export function mostrarResultados({ gano, ronda, duracionMs, personajes, recompensas = [] }) {
  datos = { personajes };
  const caja = $('#overlay');
  caja.classList.toggle('derrota', !gano);
  $('#ov-title').textContent = gano ? 'Victoria' : 'Derrota';
  const m = Math.floor(duracionMs / 60000), s = Math.round(duracionMs / 1000) % 60;
  $('#ov-sub').textContent = `Ronda ${ronda} · Duración ${m}:${String(s).padStart(2, '0')}`;
  $('#res-premios').innerHTML = premios(recompensas);
  cartas('jugador');
  caja.classList.remove('hidden');
}

export function iniciarResultados() {
  $('#overlay').addEventListener('click', e => { const b = e.target.closest('.res-tabs button'); if (b && datos) cartas(b.dataset.lado); });
}
