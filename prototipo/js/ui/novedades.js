// Ventana "Novedades": qué cambió en el juego. Se abre sola una vez por cada novedad nueva y con el botón 📰 del menú.
import { NOVEDADES } from '../datos/novedades.js';

const CLAVE = 'os2-novedades';
const ETIQUETA = { nuevo: 'NUEVO', cambio: 'CAMBIO', mejora: 'MEJORA' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ultima = () => NOVEDADES[0]?.id || '';
const vista = () => { try { return localStorage.getItem(CLAVE) || ''; } catch { return ''; } };
export const marcarVista = () => { try { localStorage.setItem(CLAVE, ultima()); } catch { /* sin almacenamiento */ } pintarBoton(); };

function pintarBoton() {
  const b = document.querySelector('#btn-novedades');
  if (b) b.classList.toggle('nov-nueva', vista() !== ultima());
}

export function abrirNovedades() {
  if (document.querySelector('.nov-fondo')) return;
  const fondo = document.createElement('div');
  fondo.className = 'dlg-fondo nov-fondo';
  fondo.innerHTML = `<div class="hov-caja nov-caja" role="dialog" aria-modal="true">
    <h2>📰 Novedades</h2>
    <div class="nov-lista">${NOVEDADES.map((n, i) => `<section class="nov-entrada">
      <h3>${esc(n.titulo)} <small>${esc(n.fecha)}</small></h3>
      <ul>${n.cambios.map(c => `<li class="nov-${c.tipo}"><b>${ETIQUETA[c.tipo] || ''}</b> ${esc(c.texto)}</li>`).join('')}</ul>
    </section>${i === 0 && NOVEDADES.length > 1 ? '<p class="nov-antes">Anteriores</p>' : ''}`).join('')}</div>
    <div class="hov-botones"><button class="hd-btn" data-cerrar>¡Entendido!</button></div></div>`;
  const cerrar = () => { removeEventListener('keydown', tecla, true); fondo.remove(); marcarVista(); };
  const tecla = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  fondo.addEventListener('click', e => { if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar(); });
  addEventListener('keydown', tecla, true);
  document.body.appendChild(fondo);
}

// Se muestra sola en el menú si hay una novedad que el jugador no ha visto (y no hay otra ventana abierta)
export function revisarNovedades() {
  pintarBoton();
  if (vista() === ultima() || document.body.dataset.pantalla !== 'menu') return;
  const starter = document.querySelector('#starter');
  if (document.querySelector('.dlg-fondo') || document.body.classList.contains('tuto-activo') || (starter && !starter.classList.contains('hidden'))) return;
  abrirNovedades();
}

export function iniciarNovedades() {
  document.querySelector('#btn-novedades')?.addEventListener('click', abrirNovedades);
  pintarBoton();
}
