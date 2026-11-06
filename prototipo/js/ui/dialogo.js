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
