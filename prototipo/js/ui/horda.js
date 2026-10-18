// Pantalla del modo Horda: entrar con una Runa de Portal, elegir equipo (solo campeones propios) y ver récord y reglas.
// La batalla por oleadas la lleva juego.js (opciones.horda); el servidor cobra cada oleada (docs/sql/006_horda.sql).
import * as D from '../servicios/datos.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, irA } from './menu.js';
import { HORDAS, oleada, defsOleada, oroOleada, TRAMOS_RAREZA } from '../datos/horda/horda.js';

const $ = s => document.querySelector(s);
const ICONO_PORTAL = 'assets/items/runaPortal.png';
let jugar = null, inv = null, record = 0, error = '';

const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');

async function cargar() {
  error = '';
  if (!perfilActual()) { inv = null; return; }
  try {
    const [i, r] = await Promise.all([D.miInventario(), D.miRecordHorda('orcos').catch(() => [])]);
    inv = i; record = r?.[0]?.oleada || 0;
    if (inv && inv.runas_portal == null) error = 'Falta ejecutar docs/sql/006_horda.sql en el servidor.';
  } catch (e) { error = D.mensajeError(e); }
}

function pintar() {
  const runas = inv?.runas_portal ?? 0, h = HORDAS.orcos;
  $('#hd-runas').innerHTML = inv ? `<span title="Runas de Portal"><img src="${ICONO_PORTAL}" alt=""> ${runas}</span>` : '';
  const sinSesion = !perfilActual();
  $('#hd-cuerpo').innerHTML = `
    <section>
      <div class="hd-tarjeta" style="background-image:url('assets/horda/kargalgan.webp')">
        <h3>${h.nombre}</h3>
        ${record ? `<div class="hd-record">🏆 Tu récord: oleada ${record}</div>` : ''}
        <p>Oleadas infinitas de 5 orcos, cada una más fuerte. Tu equipo conserva su vida entre oleadas. Retírate cuando quieras: te llevas todo tu botín.</p>
        <div class="hd-acciones">
          <button id="hd-entrar" class="hd-btn" ${sinSesion || !runas || error ? 'disabled' : ''}>🌀 Abrir portal (1 Runa)</button>
        </div>
        ${sinSesion ? '<p>⚠️ Inicia sesión para jugar la Horda.</p>' : error ? `<p>⚠️ ${error}</p>` : !runas ? '<p>No tienes Runas de Portal: cómpralas en la Tienda o gánalas en la Campaña.</p>' : ''}
      </div>
      <div class="hd-tarjeta hd-proximo" style="min-height:90px;margin-top:10px"><h3 style="font-size:18px">Horda de Elfos Oscuros · Horda de Demonios</h3><p>Próximamente</p></div>
    </section>
    <aside class="hd-info">
      <h4>Cómo funciona</h4>
      <p>Abrir un portal consume <b>1 Runa de Portal</b>. Elige 5 campeones de tu colección: pelean con sus estrellas y reliquias.
      Cada 5 oleadas aparece un <b>mini-jefe</b> (General Galek o General Torl-khan) y cada 10 un <b>jefe</b> (Gul'dan o Kargalgan).</p>
      <h4>Recompensas por oleada</h4>
      <p><b>Oro:</b> ${oroOleada(1).toLocaleString('es-MX')} en la oleada 1, +150 por oleada (×3 mini-jefe, ×5 jefe).<br>
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

export function iniciarHorda(opc) {
  jugar = opc.jugar;
  $('#hd-volver').addEventListener('click', () => irA('menu'));
  $('#pantalla-horda').addEventListener('click', e => { if (e.target.closest('#hd-entrar')) entrar(); });
}
