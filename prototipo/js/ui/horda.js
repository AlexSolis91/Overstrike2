// Pantalla del modo Horda: entrar con una Runa de Portal, elegir equipo (solo campeones propios) y ver récord y reglas.
// La batalla por oleadas la lleva juego.js (opciones.horda); el servidor cobra cada oleada (docs/sql/006_horda.sql).
import * as D from '../servicios/datos.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, irA } from './menu.js';
import { HORDAS, oleada, defsOleada, oroOleada, TRAMOS_RAREZA } from '../datos/horda/horda.js';
import { RELIQUIAS, RAREZAS } from '../datos/reliquias.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { activarTip, cartaPosible, hojaTactil, conCursor, ocultarTip, cerrarHoja } from './tipReliquia.js';

const $ = s => document.querySelector(s);
const ICONO_PORTAL = 'assets/items/runaPortal.png';
let jugar = null, inv = null, record = 0, error = '', hitos = new Set(), filtro = 'Raro', comprando = false;
// Tienda de la Horda (docs/sql/011 y 015): precio en Trofeos de Orco por rareza (Épicas: 1 por semana); premios de primera vez
export const PRECIO_TROFEOS = { 'Común': 15, 'Raro': 60, 'Especial': 300, 'Épico': 1500 };
// Lunes de esta semana en hora de México (igual que el servidor), como 'AAAA-MM-DD'
const lunesMx = () => { const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })); h.setDate(h.getDate() - (h.getDay() + 6) % 7);
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };
const HITOS = [
  { oleada: 10, txt: `${ICONO_RUNA_PORTAL} 2 Runas de Portal · 1 vale de sobre · 25 Trofeos` },
  { oleada: 20, txt: `${ICONO_RUNA_PORTAL} 3 Runas de Portal · 2 vales de sobre · 75 Trofeos` },
  { oleada: 30, txt: `1 Épica al azar del lote · ${ICONO_RUNA_PORTAL} 5 Runas de Portal · 150 Trofeos · 🏆 Hazaña (desbloquea las recetas de Legendarias)` },
];
const tienda = () => Object.entries(RELIQUIAS).filter(([, r]) => (r.lote || 'orcos') === 'orcos' && PRECIO_TROFEOS[r.rarity] && !r.soloReceta)
  .map(([id, r]) => ({ id, ...r }));

const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');

async function cargar() {
  error = '';
  if (!perfilActual()) { inv = null; return; }
  try {
    const [i, r, h] = await Promise.all([D.miInventario(), D.miRecordHorda('orcos').catch(() => []), D.misHitosHorda('orcos').catch(() => [])]);
    inv = i; record = r?.[0]?.oleada || 0; hitos = new Set((h || []).map(x => x.oleada));
    if (inv && inv.runas_portal == null) error = 'Falta ejecutar docs/sql/006_horda.sql en el servidor.';
  } catch (e) { error = D.mensajeError(e); }
}

function pintar() {
  ocultarTip(); cerrarHoja();
  const runas = inv?.runas_portal ?? 0, h = HORDAS.orcos;
  const trofeos = inv?.trofeos_orco;
  $('#hd-runas').innerHTML = inv ? `<span title="Runas de Portal"><img src="${ICONO_PORTAL}" alt=""> ${runas}</span>${trofeos != null ? `<span title="Trofeos de Orco">🏅 ${trofeos}</span>` : ''}` : '';
  const lista = tienda().filter(r => r.rarity === filtro);
  const epicaUsada = inv?.horda_epica_semana === lunesMx();   // ya compró su Épica de esta semana
  const sinSesion = !perfilActual();
  $('#hd-cuerpo').innerHTML = `
    <section>
      <div class="hd-tarjeta" style="background-image:url('assets/horda/kargalgan.webp')">
        <h3>${h.nombre}</h3>
        ${record ? `<div class="hd-record">🏆 Tu récord: oleada ${record}</div>` : ''}
        <p>Oleadas infinitas de 5 orcos, cada una más fuerte. Tu equipo conserva su vida entre oleadas. Retírate cuando quieras: te llevas todo tu botín.</p>
        <div class="hd-acciones">
          <button id="hd-entrar" class="hd-btn" ${sinSesion || !runas || error ? 'disabled' : ''}>${ICONO_RUNA_PORTAL} Abrir portal (1 Runa)</button>
        </div>
        ${sinSesion ? '<p>⚠️ Inicia sesión para jugar la Horda.</p>' : error ? `<p>⚠️ ${error}</p>` : !runas ? '<p>No tienes Runas de Portal: cómpralas en la Tienda o gánalas en la Campaña.</p>' : ''}
      </div>
      <div class="hd-panel">
        <h4>🎉 Primera vez</h4>
        ${HITOS.map(x => `<div class="hd-hito ${hitos.has(x.oleada) ? 'ok' : ''}"><b>${hitos.has(x.oleada) ? '✅' : '🔒'} Oleada ${x.oleada}</b><span>${x.txt}</span></div>`).join('')}
      </div>
      <div class="hd-panel">
        <h4>🏅 Tienda de la Horda <small>${trofeos != null ? `Tienes ${trofeos} Trofeos de Orco` : '(falta ejecutar docs/sql/011_horda_extras.sql)'}</small></h4>
        <p class="hd-nota">${conCursor() ? 'Pasa el cursor por una reliquia para ver qué atributos le pueden salir.' : 'Toca una reliquia para ver qué atributos le pueden salir.'} Elige exactamente la reliquia de la Horda de Orcos que buscas. Ganas 1 Trofeo por oleada (×3 mini-jefe, ×5 jefe). <b>Épicas: 1 por semana</b> (se renueva el lunes).${filtro === 'Épico' && epicaUsada ? ' ✅ Ya compraste la de esta semana.' : ''}</p>
        <div class="hd-filtros">${Object.keys(PRECIO_TROFEOS).map(rz => `<button class="hd-fil ${rz === filtro ? 'on' : ''}" data-rz="${rz}" style="--rc:${RAREZAS[rz].color}">${RAREZAS[rz].plural} · ${PRECIO_TROFEOS[rz]} 🏅</button>`).join('')}</div>
        <div class="hd-tienda">${lista.map(r => `<div class="hd-rel" data-id="${r.id}" style="--rc:${RAREZAS[r.rarity].color}"><img src="${r.imagen}" alt=""><div class="hd-rel-n">${r.name}</div><div class="hd-rel-t">${r.type}</div>
          <button class="hd-comprar" data-id="${r.id}" ${trofeos == null || trofeos < PRECIO_TROFEOS[r.rarity] || comprando || (r.rarity === 'Épico' && epicaUsada) ? 'disabled' : ''}>${PRECIO_TROFEOS[r.rarity]} 🏅</button></div>`).join('')}</div>
      </div>
      <div class="hd-tarjeta hd-proximo" style="min-height:90px;margin-top:10px"><h3 style="font-size:18px">Horda de Elfos Oscuros · Horda de Demonios</h3><p>Próximamente</p></div>
    </section>
    <aside class="hd-info">
      <h4>Cómo funciona</h4>
      <p>Abrir un portal consume <b>1 Runa de Portal</b>. Elige 5 campeones de tu colección: pelean con sus estrellas y reliquias.
      Cada 5 oleadas aparece un <b>mini-jefe</b> (General Galek o General Torl-khan) y cada 10 un <b>jefe</b> (Gul'dan o Kargalgan).</p>
      <h4>Recompensas por oleada</h4>
      <p><b>Oro:</b> ${oroOleada(1).toLocaleString('es-MX')} en la oleada 1, +150 por oleada (×3 mini-jefe, ×5 jefe).<br>
      <b>Trofeos de Orco:</b> 1 por oleada (×3 mini-jefe, ×5 jefe), para la Tienda de la Horda.<br>
      <b>30%</b> de una reliquia de la Horda de Orcos · <b>2%</b> de 1–3 Fragmentos de Runa.</p>
      <table><tr><th>Oleadas</th><th>Común</th><th>Rara</th><th>Especial</th><th>Épica</th></tr>
        ${TRAMOS_RAREZA.map((t, i) => `<tr><td>${t.desde}${TRAMOS_RAREZA[i + 1] ? '–' + (TRAMOS_RAREZA[i + 1].desde - 1) : '+'}</td><td>${pct(t['Común'])}</td><td>${pct(t['Raro'])}</td><td>${pct(t['Especial'])}</td><td>${pct(t['Épico'])}</td></tr>`).join('')}
      </table>
      <h4>Consigue Runas de Portal</h4>
      <p>3 de regalo · 1 la primera vez que completas una etapa de la Campaña con 3 estrellas (y 15% al repetirla) · en la Tienda con oro (el precio sube con cada compra del día).</p>
    </aside>`;
}

export async function abrirHorda() {
  pintar();
  await cargar();
  pintar();
}

async function entrar() {
  let col;
  try { col = await D.miColeccion(); } catch (e) { return alert(D.mensajeError(e)); }
  const propios = new Set((col || []).map(r => r.campeon));
  const o = oleada(1);
  equipoCampana({
    titulo: '🧟 Horda de Orcos · elige tu equipo', rivales: defsOleada(o), propios, volverTxt: '← Horda',
    alVolver: () => irA('horda'),
    alListo: async eqJ => {
      let partida;
      try { partida = await D.hordaEntrar('orcos'); } catch (e) { alert(D.mensajeError(e)); return irA('horda'); }
      jugar(eqJ, defsOleada(o), { rival: o.opciones, horda: { partida, horda: 'orcos', n: 1, rango: o.rango, botin: { oro: 0, reliquias: [], fragmentos: 0 } } });
    },
  });
}

async function comprar(id, confirmado = false) {
  const r = RELIQUIAS[id];
  if (comprando || (!confirmado && !confirm(`¿Comprar ${r.name} (${r.rarity}) por ${PRECIO_TROFEOS[r.rarity]} Trofeos de Orco?`))) return;
  comprando = true; pintar();
  try { await D.tiendaHordaComprar(id); alert(`✅ ${r.name} se agregó a tus reliquias (Colección → Reliquias).`); }
  catch (e) { alert(D.mensajeError(e)); }
  comprando = false; await cargar(); pintar();
}

export function iniciarHorda(opc) {
  jugar = opc.jugar;
  $('#hd-volver').addEventListener('click', () => irA('menu'));
  activarTip($('#pantalla-horda'), '.hd-rel', el => cartaPosible(el.dataset.id));
  $('#pantalla-horda').addEventListener('click', e => {
    if (e.target.closest('#hd-entrar')) return entrar();
    const f = e.target.closest('.hd-fil'); if (f) { filtro = f.dataset.rz; return pintar(); }
    const card = e.target.closest('.hd-rel');
    if (card && !conCursor()) {   // táctil: primer toque = ficha con lo que puede salir y su botón Comprar
      const id = card.dataset.id, r = RELIQUIAS[id], puede = !card.querySelector('.hd-comprar')?.disabled;
      return hojaTactil(cartaPosible(id), puede ? `Comprar · ${PRECIO_TROFEOS[r.rarity]} 🏅` : '', puede ? () => comprar(id, true) : null);
    }
    const c = e.target.closest('.hd-comprar'); if (c) comprar(c.dataset.id);
  });
}
