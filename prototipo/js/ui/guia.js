// Guía de efectos: manual con todos los buffs (izquierda) y debuffs (derecha) del registro universal.
// Se arma sola desde EFECTOS, así que cada efecto nuevo aparece aquí sin tocar este archivo.
import { EFECTOS } from '../motor/efectos.js';

const $ = s => document.querySelector(s);
const MEGA = { stun: 'Mega Aturdimiento', freeze: 'Mega Congelación', possess: 'Mega Posesión' };
const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function fila([id, e]) {
  const extra = MEGA[id] ? ` <small>· ${MEGA[id]}</small>` : '';
  return `<div class="gu-item ${e.tipo}" data-buscar="${sinAcentos(`${e.nombre} ${MEGA[id] || ''} ${e.tags.join(' ')} ${e.desc}`)}">
    <span class="gu-ico">${e.icono}</span>
    <div><div class="gu-nom"><b>${e.nombre}</b>${extra}${e.tags.map(t => `<span class="gu-tag">${t}</span>`).join('')}</div><p>${e.desc}</p></div>
  </div>`;
}
function render() {
  const lista = Object.entries(EFECTOS).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, 'es'));
  const buffs = lista.filter(([, e]) => e.tipo === 'buff'), debuffs = lista.filter(([, e]) => e.tipo === 'debuff');
  $('#gu-buffs').innerHTML = `<h3>Buffs <small>${buffs.length}</small></h3>` + buffs.map(fila).join('');
  $('#gu-debuffs').innerHTML = `<h3>Debuffs <small>${debuffs.length}</small></h3>` + debuffs.map(fila).join('');
}
function filtrar() {
  const q = sinAcentos($('#gu-buscar').value.trim());
  for (const el of document.querySelectorAll('.gu-item')) el.classList.toggle('oculto', !!q && !el.dataset.buscar.includes(q));
}
export function abrirGuia() { $('#guia').classList.remove('hidden'); $('#gu-buscar').value = ''; filtrar(); }
export const cerrarGuia = () => $('#guia').classList.add('hidden');
export const guiaAbierta = () => !$('#guia').classList.contains('hidden');

export function iniciarGuia() {
  render();
  $('#guia').addEventListener('click', e => { if (e.target.id === 'guia' || e.target.closest('#gu-x')) cerrarGuia(); });
  $('#gu-buscar').addEventListener('input', filtrar);
  for (const b of document.querySelectorAll('[data-abre-guia]')) b.addEventListener('click', abrirGuia);
}
