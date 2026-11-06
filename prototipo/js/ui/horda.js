// Pantalla del modo Horda: entrar con una Runa de Portal, elegir equipo (solo campeones propios) y ver récord y reglas.
// La batalla por oleadas la lleva juego.js (opciones.horda); el servidor cobra cada oleada (docs/sql/006_horda.sql).
import * as D from '../servicios/datos.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, irA } from './menu.js';
import { HORDAS, oleada, defsOleada, oroOleada, ORO_PASO, TRAMOS_RAREZA } from '../datos/horda/horda.js';
import { RELIQUIAS, RAREZAS } from '../datos/reliquias.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { repetirHorda, oleadaGuardada, defsGuardadas, totalDecisiones } from '../motor/hordaReanudar.js';
import { porId } from '../datos/personajes/index.js';
import { guardarLocal, leerLocal, borrarLocal } from '../servicios/hordaGuardada.js';
import { activarTip, cartaPosible, hojaTactil, conCursor, ocultarTip, cerrarHoja } from './tipReliquia.js';
import { confirmar, avisar } from './dialogo.js';

const $ = s => document.querySelector(s);
const ICONO_PORTAL = 'assets/items/runaPortal.png';
let jugar = null, inv = null, record = 0, error = '', hitos = new Set(), filtro = 'Raro', comprando = false;
let abierta = null;   // partida sin terminar que se puede continuar: { id, g }
let ranking;   // undefined = cargando · null = falta el SQL 020 · { lista, yo }
// Tienda de la Horda (docs/sql/011 y 015): precio en Trofeos de Orco por rareza (Épicas: 1 por semana); premios de primera vez
export const PRECIO_TROFEOS = { 'Común': 15, 'Raro': 60, 'Especial': 300, 'Épico': 1500 };
// Lunes de esta semana en hora de México (igual que el servidor), como 'AAAA-MM-DD'
const lunesMx = () => { const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })); h.setDate(h.getDate() - (h.getDay() + 6) % 7);
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };
const HITOS = [
  { oleada: 10, txt: `🪙 10,000 de oro · 1 vale de sobre · 25 Trofeos` },
  { oleada: 20, txt: `🪙 20,000 de oro · 2 vales de sobre · 75 Trofeos` },
  { oleada: 30, txt: `1 Épica al azar del lote · 🪙 40,000 de oro · 150 Trofeos` },
];
const tienda = () => Object.entries(RELIQUIAS).filter(([, r]) => (r.lote || 'orcos') === 'orcos' && PRECIO_TROFEOS[r.rarity] && !r.soloReceta)
  .map(([id, r]) => ({ id, ...r }));

const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');

async function cargarRanking() {
  ranking = await D.hordaRanking('orcos').catch(() => null);
}

// Récords de la Horda: top 50 (🥇🥈🥉) y, si estoy fuera, mi puesto al final
function htmlRanking() {
  if (ranking === undefined) return '<p>Cargando…</p>';
  if (!ranking) return '<p>⚠️ Falta ejecutar docs/sql/020_horda_ranking.sql en el servidor.</p>';
  if (!ranking.lista.length) return '<p>Todavía nadie tiene récord. ¡Sé el primero!</p>';
  const fecha = f => new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const fila = r => `<tr class="${r.yo ? 'yo' : ''}"><td>${['🥇', '🥈', '🥉'][r.puesto - 1] || r.puesto}</td><td class="hd-rk-n">${r.nombre}</td><td><b>${r.oleada}</b></td><td>${fecha(r.fecha)}</td></tr>`;
  const fuera = ranking.yo && ranking.yo.puesto > ranking.lista.length;
  return `<table class="hd-ranking"><tr><th>#</th><th>Jugador</th><th>Oleada</th><th>Fecha</th></tr>
    ${ranking.lista.map(fila).join('')}${fuera ? `<tr class="hd-rk-sep"><td colspan="4">⋯</td></tr>${fila(ranking.yo)}` : ''}</table>`;
}

// De la copia del dispositivo y la del servidor, la que llegó más lejos
function partidaAbierta(fila) {
  if (!fila) return null;
  const local = leerLocal(fila.id);
  const g = local && totalDecisiones(local) >= totalDecisiones(fila.guardado) ? local : fila.guardado;
  return g ? { id: fila.id, g } : null;
}

async function cargar() {
  error = '';
  if (!perfilActual()) { inv = null; abierta = null; return; }
  try {
    const [i, r, h, p] = await Promise.all([D.miInventario(), D.miRecordHorda('orcos').catch(() => []), D.misHitosHorda('orcos').catch(() => []), D.miPartidaHorda('orcos').catch(() => null)]);
    abierta = partidaAbierta(p);
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
          ${abierta ? `<button id="hd-continuar" class="hd-btn">▶️ Continuar partida (oleada ${abierta.g.olas.length})</button>` : ''}
          <button id="hd-entrar" class="hd-btn" ${sinSesion || !runas || error ? 'disabled' : ''}>${ICONO_RUNA_PORTAL} Abrir portal (1 Runa)</button>
        </div>
        ${sinSesion ? '<p>⚠️ Inicia sesión para jugar la Horda.</p>' : error ? `<p>⚠️ ${error}</p>` : !runas ? '<p>No tienes Runas de Portal: gánalas en las Misiones diarias y en la Arena.</p>' : ''}
      </div>
      <div class="hd-panel">
        <h4>🎉 Primera vez</h4>
        ${HITOS.map(x => `<div class="hd-hito ${hitos.has(x.oleada) ? 'ok' : ''}"><b>${hitos.has(x.oleada) ? '✅' : '🔒'} Oleada ${x.oleada}</b><span>${x.txt}</span></div>`).join('')}
      </div>
      <div class="hd-panel">
        <h4>🏅 Tienda de la Horda <small>${trofeos != null ? `Tienes ${trofeos} Trofeos de Orco` : sinSesion ? '(inicia sesión para ver tus Trofeos)' : '(falta ejecutar docs/sql/011_horda_extras.sql)'}</small></h4>
        ${trofeos != null && !('horda_epica_semana' in inv) ? '<p class="hd-nota">⚠️ Falta ejecutar docs/sql/015_tienda_horda_precios.sql: el servidor todavía cobra los precios anteriores.</p>' : ''}
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
      <p><b>Oro:</b> ${oroOleada(1).toLocaleString('es-MX')} en la oleada 1, +${ORO_PASO} por oleada (×3 mini-jefe, ×5 jefe).<br>
      <b>Trofeos de Orco:</b> 1 por oleada (×3 mini-jefe, ×5 jefe), para la Tienda de la Horda.<br>
      <b>30%</b> de una reliquia de la Horda de Orcos · <b>2%</b> de 1–3 Fragmentos de Runa.</p>
      <table><tr><th>Oleadas</th><th>Común</th><th>Rara</th><th>Especial</th><th>Épica</th></tr>
        ${TRAMOS_RAREZA.map((t, i) => `<tr><td>${t.desde}${TRAMOS_RAREZA[i + 1] ? '–' + (TRAMOS_RAREZA[i + 1].desde - 1) : '+'}</td><td>${pct(t['Común'])}</td><td>${pct(t['Raro'])}</td><td>${pct(t['Especial'])}</td><td>${pct(t['Épico'])}</td></tr>`).join('')}
      </table>
      <h4>Consigue Runas de Portal</h4>
      <p>3 de regalo al empezar · 1 en la misión diaria "Gana 5 combates de Arena" · 3.3% de 1 runa en cada combate de Arena (ganes o pierdas) · la recompensa semanal de tu liga de Arena (1–4).</p>
      <h4>🏆 Récords de la Horda de Orcos</h4>
      <p class="hd-nota">La oleada más alta de cada jugador. En empate, va primero quien la alcanzó antes.</p>
      ${htmlRanking()}
    </aside>`;
}

export async function abrirHorda() {
  ranking = undefined;
  pintar();
  await Promise.all([cargar(), cargarRanking()]);
  pintar();
}

async function entrar() {
  if (abierta && !await confirmar(`Tienes una partida en la oleada ${abierta.g.olas.length}. Si abres otro portal, esa partida se cierra (conservas su botín). ¿Abrir otro?`)) return;
  let col;
  try { col = await D.miColeccion(); } catch (e) { return avisar(D.mensajeError(e)); }
  const propios = new Set((col || []).map(r => r.campeon));
  const o = oleada(1);
  equipoCampana({
    titulo: '🧟 Horda de Orcos · elige tu equipo', rivales: defsOleada(o), propios, volverTxt: '← Horda',
    alVolver: () => irA('horda'),
    alListo: async eqJ => {
      let partida, filasCol, filasRel;
      try { [filasCol, filasRel] = await Promise.all([D.miColeccion(), D.misReliquias()]); partida = await D.hordaEntrar('orcos'); }
      catch (e) { avisar(D.mensajeError(e)); return irA('horda'); }
      abierta = null;
      const equipo = eqJ.map(p => p.id), botin = { oro: 0, reliquias: [], fragmentos: 0 };
      // Todo lo necesario para reconstruir la partida; las estrellas y reliquias quedan congeladas mientras dure
      const g = { partida, horda: 'orcos', semilla: Math.floor(Math.random() * 2 ** 31), equipo, olas: [o.enemigos], dec: [[]], marcas: {}, botin, botinHasta: 0,
        cuenta: { col: (filasCol || []).filter(r => equipo.includes(r.campeon)), reliquias: (filasRel || []).filter(r => equipo.includes(r.campeon)) } };
      guardarLocal(g); D.hordaGuardar(partida, g).catch(() => null);
      jugar(eqJ, defsOleada(o), { rival: o.opciones, semilla: g.semilla, horda: { partida, horda: 'orcos', n: 1, rango: o.rango, botin, botinHasta: 0, g } });
    },
  });
}

// Continuar: reconstruye el combate desde la semilla y las decisiones. Si el juego cambió y ya no coincide, se cierra y se devuelve la Runa.
async function continuar() {
  const { id, g } = abierta, btn = $('#hd-continuar');
  btn.disabled = true; btn.textContent = 'Retomando la partida…';
  await new Promise(ok => setTimeout(ok, 30));              // deja pintar el botón: reconstruir bloquea un par de segundos
  let rep;
  try { rep = repetirHorda(g); }
  catch (e) {
    console.warn('Partida de Horda no reconstruible:', e);
    let txt = 'Tu partida no se pudo retomar porque el juego se actualizó. El botín que ya cobraste es tuyo.';
    try { txt += (await D.hordaNoReanudable(id)).devuelta ? ' Te devolvimos tu Runa de Portal.' : ''; borrarLocal(id); }
    catch (e2) { txt = D.mensajeError(e2); }
    avisar(txt);
    await cargar(); return pintar();
  }
  const n = g.olas.length, o = oleadaGuardada(g, n);
  jugar(g.equipo.map(porId), defsGuardadas(g, n), { rival: o.opciones, horda: { partida: id, horda: g.horda, n, rango: o.rango, botin: g.botin, botinHasta: g.botinHasta, g, rep } });
}

async function comprar(id, confirmado = false) {
  const r = RELIQUIAS[id];
  if (comprando || (!confirmado && !await confirmar(`¿Comprar ${r.name} (${r.rarity}) por ${PRECIO_TROFEOS[r.rarity]} Trofeos de Orco?`))) return;
  comprando = true; pintar();
  try { await D.tiendaHordaComprar(id); avisar(`✅ ${r.name} se agregó a tus reliquias (Colección → Reliquias).`); }
  catch (e) { avisar(D.mensajeError(e)); }
  comprando = false; await cargar(); pintar();
}

export function iniciarHorda(opc) {
  jugar = opc.jugar;
  $('#hd-volver').addEventListener('click', () => irA('menu'));
  activarTip($('#pantalla-horda'), '.hd-rel', el => cartaPosible(el.dataset.id));
  $('#pantalla-horda').addEventListener('click', e => {
    if (e.target.closest('#hd-entrar')) return entrar();
    if (e.target.closest('#hd-continuar')) return continuar();
    const f = e.target.closest('.hd-fil'); if (f) { filtro = f.dataset.rz; return pintar(); }
    const card = e.target.closest('.hd-rel');
    if (card && !conCursor()) {   // táctil: primer toque = ficha con lo que puede salir y su botón Comprar
      const id = card.dataset.id, r = RELIQUIAS[id], puede = !card.querySelector('.hd-comprar')?.disabled;
      return hojaTactil(cartaPosible(id), puede ? `Comprar · ${PRECIO_TROFEOS[r.rarity]} 🏅` : '', puede ? () => comprar(id, true) : null);
    }
    const c = e.target.closest('.hd-comprar'); if (c) comprar(c.dataset.id);
  });
}
