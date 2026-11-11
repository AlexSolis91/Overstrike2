// Ventanas de confirmación y aviso DENTRO del juego (nunca confirm()/alert() del navegador).
//   if (!(await confirmar('¿Abrir este sobre?'))) return;
//   avisar('No tienes llaves.');
// Se apilan en una cola: si llegan dos a la vez, se muestran una detrás de otra.
let cola = Promise.resolve();

function ventana(texto, { titulo, aceptar = 'Aceptar', cancelar = null } = {}) {
  return new Promise(ok => {
    const fondo = document.createElement('div');
    fondo.className = 'dlg-fondo';
    fondo.innerHTML = `<div class="hov-caja dlg-caja" role="dialog" aria-modal="true">
      ${titulo ? `<h2>${titulo}</h2>` : ''}<p class="dlg-texto"></p>
      <div class="hov-botones">${cancelar ? `<button class="hd-btn sec" data-r="0">${cancelar}</button>` : ''}<button class="hd-btn" data-r="1">${aceptar}</button></div></div>`;
    fondo.querySelector('.dlg-texto').textContent = texto;   // texto plano: los saltos de línea se respetan (CSS pre-line)
    const cerrar = r => { removeEventListener('keydown', tecla, true); fondo.remove(); ok(r); };
    const tecla = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(!cancelar); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cerrar(true); }
    };
    fondo.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) cerrar(b.dataset.r === '1');
      else if (e.target === fondo && cancelar) cerrar(false);   // tocar fuera = cancelar
    });
    addEventListener('keydown', tecla, true);
    document.body.appendChild(fondo);
    fondo.querySelector('[data-r="1"]').focus();
  });
}

const enCola = (texto, opc) => (cola = cola.then(() => ventana(texto, opc)));

// Pregunta Sí/No; resuelve true si acepta.
export const confirmar = (texto, { titulo = 'Confirmar', aceptar = 'Aceptar', cancelar = 'Cancelar' } = {}) => enCola(texto, { titulo, aceptar, cancelar });
// Mensaje con un solo botón; resuelve al cerrarlo.
export const avisar = (texto, { titulo = 'Aviso', aceptar = 'Aceptar' } = {}) => enCola(texto, { titulo, aceptar });

// Elegir una de varias opciones (p. ej. la forma de Luke al inicio de su turno). opciones: [{ id, titulo, desc }].
// No se puede cancelar. Devuelve { promesa, cerrar }: cerrar() la quita sin elegir (resuelve null; p. ej. se acabó el tiempo).
export function elegirOpcion(texto, opciones, { titulo = 'Elige' } = {}) {
  let cerrar;
  const promesa = new Promise(ok => {
    const fondo = document.createElement('div');
    fondo.className = 'dlg-fondo';
    fondo.innerHTML = `<div class="hov-caja dlg-caja" role="dialog" aria-modal="true"><h2></h2><p class="dlg-texto"></p><div class="dlg-opciones"></div></div>`;
    fondo.querySelector('h2').textContent = titulo;
    fondo.querySelector('.dlg-texto').textContent = texto;
    const caja = fondo.querySelector('.dlg-opciones');
    for (const o of opciones) {
      const b = document.createElement('button');
      b.className = 'hd-btn dlg-opcion'; b.dataset.r = o.id;
      b.innerHTML = '<b></b><small></small>';
      b.querySelector('b').textContent = o.titulo; b.querySelector('small').textContent = o.desc || '';
      caja.appendChild(b);
    }
    cerrar = r => { fondo.remove(); ok(r); };
    fondo.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) cerrar(b.dataset.r); });
    document.body.appendChild(fondo);
    caja.querySelector('button')?.focus();
  });
  return { promesa, cerrar: () => cerrar?.(null) };
}
