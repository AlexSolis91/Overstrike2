// Pantalla del Jefe de Raid: dificultades, barra compartida, llaves, rangos de daño, cofres y mejores daños.
// La batalla la lleva juego.js (opciones.raid); el servidor cuenta el daño y paga (docs/sql/026_jefe_raid.sql).
import * as D from '../servicios/datos.js';
import { supabase } from '../servicios/supabase.js';
import { perfilActual } from './cuenta.js';
import { equipoCampana, irA } from './menu.js';
import { JEFES_RAID, DIFICULTADES_RAID, RONDAS_RAID, FURIA_RAID, opcionesRaid } from '../datos/jefes/raid.js';
import { RELIQUIAS } from '../datos/reliquias.js';
import { VERSION } from '../datos/cuenta.js';
import { ICONO_RUNA_PORTAL } from '../datos/recompensas.js';
import { INVOCACIONES } from '../datos/invocaciones.js';

const $ = s => document.querySelector(s);
const miles = n => Math.round(n).toLocaleString('es-MX');
const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let jugar = null, E = null, error = '', sel = null, reloj = null, ocupado = false;

// Cofre 1–4: se paga 25, 50, 75 y 100% de oro, polvo y runas; derrotar al jefe los duplica
const MAX_LLAVES = 2;
const CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };

async function cargar() {
  error = '';
  if (!perfilActual()) { E = null; return; }
  try {
    E = await D.raidEstado();
    const avisos = E.recetas || [];
    if (avisos.length) alert(avisos.map(r => `🎉 El Jefe de Raid soltó una receta de ${RELIQUIAS[r.legendaria]?.name || r.legendaria}. Búscala en Colección → Forja de los Dioses.`).join('\n'));
    if (E.pendientes?.length) {                  // ataques cuya verificación no terminó: se reintentan
      const sb = await supabase();
      await Promise.all(E.pendientes.map(ataque => sb.functions.invoke('verificar-raid', { body: { ataque } }).catch(() => null)));
    }
  } catch (e) {
    E = null;
    error = /raid_estado|schema cache|does not exist/i.test(e?.message || '') ? 'Falta ejecutar docs/sql/026_jefe_raid.sql en el servidor.' : D.mensajeError(e);
  }
  const lista = E?.dificultades || [];
  if (!lista.find(d => d.id === sel && d.abierta)) sel = [...lista].reverse().find(d => d.abierta && !d.derrotado)?.id || lista.find(d => d.abierta)?.id || null;
}

const faltan = ts => {
  const s = Math.max(0, Math.floor((new Date(ts) - Date.now()) / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
function pintarRelojes() {
  const c = $('#rd-cierra'), l = $('#rd-llave');
  if (c && E) c.textContent = faltan(E.cierra);
  if (l && E?.proxima_llave) l.textContent = faltan(E.proxima_llave);
}

function htmlRangos(d) {
  const filas = d.rangos.map((r, i) => {
    const f = (i + 1) * .25, sig = d.rangos[i + 1];
    return `<tr class="${d.cofre === i + 1 ? 'yo' : ''}"><td>Cofre ${i + 1}</td><td>${miles(r)}${sig ? ` – ${miles(sig - 1)}` : ' o más'}</td><td>🪙 ${miles(d.oro * f)}</td><td>${miles(d.polvo * f)}</td><td>${Math.round(d.runas * f)}</td><td class="rd-rel">${pct(d.p_rara * f)} · ${pct(d.p_especial * f)} · ${pct(d.p_epica * f)}</td></tr>`;
  }).join('');
  return `<table class="hd-ranking rd-rangos"><tr><th>Cofre</th><th>Tu daño del día</th><th>Oro</th><th>Polvo</th><th>${ICONO_RUNA_PORTAL}</th><th>Rara · Especial · Épica</th></tr>${filas}</table>
    <p class="hd-nota">Si el jefe cae, se duplican oro, polvo y runas; las reliquias no.</p>
    <p class="hd-nota">Receta de ${RELIQUIAS[E.legendaria]?.name || 'Legendaria'}: ${pct(d.p_receta)}. Hay 1 tirada al día, en la dificultad más alta donde alcanzaste cofre.</p>`;
}

function pintar() {
  const jefe = JEFES_RAID[E?.jefe || 'lich-king'], d = E?.dificultades.find(x => x.id === sel);
  const sinSesion = !perfilActual();
  $('#rd-llaves').innerHTML = E ? `<span title="Llaves">🗝️ ${E.llaves}/${MAX_LLAVES}${E.proxima_llave ? ` · <small id="rd-llave"></small>` : ''}</span><span title="Tiempo para el reinicio">⏳ <small id="rd-cierra"></small></span>` : '';
  const hp = d ? d.hp_restante / d.hp_total : 1;
  const sig = d && d.cofre < 4 ? d.rangos[d.cofre] - d.mi_dano : 0;
  $('#rd-cuerpo').innerHTML = `
    <section>
      <div class="hd-tarjeta rd-tarjeta" style="background-image:url('assets/fondos/raid-lich-king.webp')">
        <img class="rd-arte" src="${jefe.imagen}" alt="">
        <h3>👑 ${jefe.nombre}</h3>
        <p>Todos los jugadores atacan la misma barra. El día cierra a medianoche, hora de México.</p>
      </div>
      ${sinSesion ? '<div class="hd-panel"><p>⚠️ Inicia sesión para atacar al jefe.</p></div>' : error ? `<div class="hd-panel"><p>⚠️ ${error}</p></div>` : !E ? '<div class="hd-panel"><p>Cargando…</p></div>' : `
      <div class="rd-difs">${E.dificultades.map(x => `<button class="rd-dif ${x.id === sel ? 'on' : ''}" data-dif="${x.id}" style="--dc:${DIFICULTADES_RAID[x.id].color}" ${x.abierta ? '' : 'disabled'}>${x.abierta ? (x.derrotado ? '✅ ' : '') : '🔒 '}${x.nombre}</button>`).join('')}</div>
      ${d ? `<div class="hd-panel">
        <div class="rd-hp"><i style="width:${Math.max(0, hp * 100)}%"></i><span>${miles(d.hp_restante)} / ${miles(d.hp_total)}</span></div>
        <p class="rd-mio">Tu daño hoy: <b>${miles(d.mi_dano)}</b>${d.cofre ? ` · Cofre ${d.cofre} de 4` : ' · Aún sin cofre'}${sig > 0 ? ` · Faltan ${miles(sig)} para el siguiente` : ''}</p>
        ${d.derrotado ? '<p class="hd-nota">✅ El jefe ya cayó en esta dificultad. Vuelve mañana o ataca otra.</p>' : ''}
        <button id="rd-atacar" class="hd-btn" ${!E.llaves || d.derrotado || ocupado ? 'disabled' : ''}>⚔️ Atacar (1 llave)</button>
        ${!E.llaves ? '<p class="hd-nota">Sin llaves: recibes 1 cada 6 horas, hasta ${MAX_LLAVES}.</p>' : ''}
      </div>
      <div class="hd-panel"><h4>🎁 Rangos de ${d.nombre}</h4>${htmlRangos(d)}</div>` : ''}
      ${E.cofres.length ? `<div class="hd-panel"><h4>🧰 Tus cofres</h4>${E.cofres.map(c => `<div class="rd-cofre"><span><b>${c.nombre}</b> · Cofre ${c.cofre} de 4 · ${miles(c.dano)} de daño${c.derrotado ? ' · ×2' : ''}</span>
        <button class="rd-reclamar eq-btn" data-dia="${c.dia}" data-dif="${c.dificultad}" ${c.listo && !ocupado ? '' : 'disabled'}>${c.listo ? 'Reclamar' : 'Al caer el jefe o cerrar el día'}</button></div>`).join('')}</div>` : ''}
      ${d ? `<div class="hd-panel"><h4>🏆 Mejores daños de hoy · ${d.nombre}</h4>${d.ranking.length ? `<table class="hd-ranking"><tr><th>#</th><th>Jugador</th><th>Daño</th></tr>${d.ranking.map((r, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td class="hd-rk-n">${esc(r.nombre)}</td><td><b>${miles(r.dano)}</b></td></tr>`).join('')}</table>` : '<p>Todavía nadie lo ataca hoy.</p>'}</div>` : ''}`}
    </section>
    <aside class="hd-info">
      <h4>Cómo funciona</h4>
      <p>Cada ataque gasta <b>1 llave</b> y dura hasta ${RONDAS_RAID} rondas, o hasta que caiga tu equipo. Tu daño se suma a la barra de todos y a tu cofre del día.</p>
      <p>Desde la ronda ${FURIA_RAID.desde}, el jefe gana +${Math.round(FURIA_RAID.dmgPct * 100)}% de Daño cada ronda. Derrotarlo abre la siguiente dificultad para todos.</p>
      <h4>${jefe.nombre}</h4>
      <p><b>${jefe.pasiva.nombre}:</b> ${jefe.pasiva.desc}</p>
      ${jefe.movimientos.map(m => `<p><b>${CAT[m.categoria]} · ${m.nombre}:</b> ${m.desc}</p>`).join('')}
      <p><b>Orden:</b> ${jefe.ciclo.map(c => jefe.movimientos.find(m => m.categoria === c).nombre).join(' → ')}.</p>
      <p><b>Sindragosa:</b> ${INVOCACIONES.sindragosa.desc}</p>
      <h4>Recompensas</h4>
      <p>El cofre se reclama al derrotar al jefe o al cerrar el día. Si el jefe cae, se duplican oro, Polvo Arcano y Runas de Portal.</p>
    </aside>`;
  pintarRelojes();
}

async function atacar() {
  const d = E.dificultades.find(x => x.id === sel), jefe = JEFES_RAID[E.jefe];
  let propios;
  try { propios = new Set((await D.miColeccion()).map(c => c.campeon)); } catch (e) { return alert(D.mensajeError(e)); }
  if (propios.size < 5) return alert('Necesitas al menos 5 campeones en tu colección.');
  const { porId } = await import('../datos/personajes/index.js');
  equipoCampana({
    titulo: `👑 ${jefe.nombre} · ${d.nombre} · elige tu equipo`, rivales: [jefe], propios, volverTxt: '← Jefe de Raid',
    alVolver: () => irA('raid'),
    alListo: async eqJ => {
      let a;
      try { a = await D.raidEntrar(d.id, eqJ.map(p => p.id), VERSION); }
      catch (e) { alert(D.mensajeError(e)); return irA('raid'); }
      jugar(eqJ.map(p => porId(p.id)), [jefe], {
        semilla: Number(a.semilla), rival: opcionesRaid(d.id, Number(a.hp_inicio), Number(a.hp_total)),
        raid: { ataque: a.ataque, dificultad: d.id, nombreDif: d.nombre, hpInicio: Number(a.hp_inicio), hpTotal: Number(a.hp_total), equipoMio: a.equipo, fondo: 'assets/fondos/raid-lich-king.webp' },
      });
    },
  });
}

async function reclamar(dia, dif) {
  ocupado = true; pintar();
  try {
    const r = await D.raidReclamar(dia, dif);
    const rel = (r.reliquias || []).map(x => RELIQUIAS[x.reliquia]?.name || x.reliquia);
    alert(`🧰 Cofre ${r.cofre} de 4${r.duplicado ? ' (×2, el jefe cayó)' : ''}\n🪙 ${miles(r.oro)} de oro\n✨ ${miles(r.polvo)} de Polvo Arcano\nRunas de Portal: ${r.runas}${rel.length ? `\nReliquias: ${rel.join(', ')}` : ''}`);
    dispatchEvent(new Event('inventario:cambio'));
  } catch (e) { alert(D.mensajeError(e)); }
  ocupado = false; await cargar(); pintar();
}

export async function abrirRaid() {
  pintar();
  await cargar();
  pintar();
  clearInterval(reloj);
  reloj = setInterval(() => { if (document.body.dataset.pantalla === 'raid') pintarRelojes(); else clearInterval(reloj); }, 1000);
}

export function iniciarRaid(opc) {
  jugar = opc.jugar;
  $('#rd-volver').addEventListener('click', () => irA('menu'));
  $('#pantalla-raid').addEventListener('click', e => {
    const dif = e.target.closest('.rd-dif'); if (dif) { sel = dif.dataset.dif; return pintar(); }
    if (e.target.closest('#rd-atacar')) return atacar();
    const c = e.target.closest('.rd-reclamar'); if (c) return reclamar(c.dataset.dia, c.dataset.dif);
  });
}
