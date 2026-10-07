// Animación de apertura (sobres, Starter Packs y Portal de Invocación): el sobre flota y brilla, al tocarlo tiembla
// cada vez más fuerte y estalla en un destello; las cartas salen boca abajo y se voltean una por una con un brillo del
// color del campeón, rayos de luz y la etiqueta "¡NUEVO!" o "+1 copia". Tocar acelera la revelación.
import { sonar } from './audio.js';

const espera = ms => new Promise(r => setTimeout(r, ms));
const ROL = { Support: 'Soporte', Invoker: 'Invocador' };

function cartaHtml(p, nuevo, i) {
  const roles = [p.rol, p.rolSecundario].filter(Boolean).map(r => ROL[r] || r).join(' · ');
  return `<div class="ap-carta" style="--c:${p.color};--i:${i}">
    <div class="ap-cara ap-dorso"><span class="ap-dorso-ii">II</span><span class="ap-dorso-marca">OVERSTRIKE</span></div>
    <div class="ap-cara ap-frente">
      <div class="ap-img">${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}">` : `<span class="ap-emoji">${p.emoji}</span>`}</div>
      <div class="ap-info"><b>${p.nombre}</b><small>${roles}</small></div>
      <span class="ap-tag ${nuevo ? 'nuevo' : 'copia'}">${nuevo ? '¡NUEVO!' : '+1 copia'}</span>
    </div>
  </div>`;
}

// sobre: { nombre, icono, color, imagen? } (con imagen se muestra el arte del sobre) · campeones: fichas · nuevos: Set de ids que el jugador no tenía
export function revelarCartas({ sobre, campeones, nuevos = new Set() }) {
  return new Promise(async resolve => {
    document.querySelector('#apertura')?.remove();
    const capa = document.createElement('div');
    capa.id = 'apertura';
    capa.style.setProperty('--c', sobre.color || '#f3d58a');
    capa.innerHTML = `
      <div class="ap-destello"></div>
      ${sobre.imagen
        ? `<div class="ap-sobre con-arte"><img src="${sobre.imagen}" alt="${sobre.nombre}"><div class="ap-sobre-brillo" style="--arte:url('${sobre.imagen}')"></div><small>Toca para abrir</small></div>`
        : `<div class="ap-sobre"><div class="ap-sobre-brillo"></div><span class="ap-sobre-ico">${sobre.icono || '🎁'}</span><b>${sobre.nombre}</b><small>Toca para abrir</small></div>`}
      <div class="ap-chispas"></div>
      <div class="ap-cartas">${campeones.map((p, i) => cartaHtml(p, nuevos.has(p.id), i)).join('')}</div>
      <p class="ap-ayuda">Toca para revelar más rápido</p>
      <button class="ap-continuar eq-listo">Continuar</button>`;
    document.body.appendChild(capa);
    const $ = s => capa.querySelector(s);
    requestAnimationFrame(() => capa.classList.add('visible'));

    // 1) el sobre espera el toque (o se abre solo a los 5 s)
    await new Promise(r => { const ir = () => { clearTimeout(t); $('.ap-sobre').removeEventListener('click', ir); r(); }; const t = setTimeout(ir, 5000); $('.ap-sobre').addEventListener('click', ir); });
    // 2) tiembla cada vez más y estalla
    $('.ap-sobre').classList.add('tiembla');
    sonar('transformacion');
    await espera(1100);
    let rapido = false;                         // tocar desde aquí = revelar todas rápido
    capa.addEventListener('click', () => { rapido = true; }, { once: true });
    $('.ap-chispas').innerHTML = Array.from({ length: 34 }, () => {
      const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * 320;
      return `<i style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--s:${.5 + Math.random()};--t:${.5 + Math.random() * .5}s"></i>`;
    }).join('');
    capa.classList.add('estalla');
    await espera(450);
    // 3) las cartas salen boca abajo
    capa.classList.add('cartas');
    await espera(500 + campeones.length * 120);
    // 4) se voltean una por una
    $('.ap-ayuda').classList.add('visible');
    const cartas = [...capa.querySelectorAll('.ap-carta')];
    for (const c of cartas) {
      c.classList.add('revelada');
      sonar('invocacion');
      await espera(rapido ? 140 : 950);
    }
    $('.ap-ayuda').classList.remove('visible');
    await espera(500);
    // 5) continuar
    $('.ap-continuar').classList.add('visible');
    $('.ap-continuar').addEventListener('click', e => {
      e.stopPropagation();
      capa.classList.remove('visible');
      setTimeout(() => { capa.remove(); resolve(); }, 350);
    }, { once: true });
  });
}
