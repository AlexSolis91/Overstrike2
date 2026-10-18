// Tienda, Colección, Portal de Invocación y elección del Starter Pack. Todo lo que cambia la colección o el inventario lo
// hace el SERVIDOR (datos.js); aquí solo se muestra y se piden las acciones. Las aperturas usan la animación de apertura.js.
import { OFICIALES, porId } from '../datos/personajes/index.js';
import { STARTERS } from '../datos/starters.js';
import { SOBRES } from '../datos/sobres.js';
import { perfilActual } from './cuenta.js';
import { revelarCartas } from './apertura.js';
import * as D from '../servicios/datos.js';
import { RAREZAS, ESPACIOS, instancia, calidad, motivoNoEquipar } from '../datos/reliquias.js';
import { cartaReliquia } from './panel.js';

const $ = s => document.querySelector(s);
const ROL = { Support: 'Soporte', Invoker: 'Invocador' };
const COSTO_ESPACIO = { copias: [1, 3, 5], oro: [100000, 500000, 1000000] };   // igual que en el servidor
const FRAG_POR_RUNA = 20, BONO_ESTRELLA = 3;
const num = n => Number(n || 0).toLocaleString('es-MX');
const roles = p => [p.rol, p.rolSecundario].filter(Boolean).map(r => ROL[r] || r).join(' · ');
const retrato = p => p.imagen ? `<img src="${p.imagen}" alt="" loading="lazy">` : `<span class="tc-emoji">${p.emoji}</span>`;
const estrellas = n => `<span class="tc-estrellas">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;

let col = new Map();          // campeón → { copias, estrellas, espacios }
let inv = { oro: 0, frag_runa: 0, frag_otros: 0, runas: 0, vales_sobre: 0, rel_sobres: 0 };
let rels = [], sinReliquias = false;   // copias de reliquias del jugador (sinReliquias: falta docs/sql/005_reliquias.sql)
let relFiltro = { cat: '', rareza: '' }, relSel = null, slotSel = null;   // pestaña Reliquias y espacio elegido en la ficha
let cfg = [];                 // sobres_config del servidor
let pestana = 'tienda', detalle = null, elegidoPortal = null, ocupado = false;

// ---------------------------------------------------------------- avisos
export function aviso(texto, tipo = 'ok') {
  let a = $('#aviso');
  if (!a) { a = document.createElement('div'); a.id = 'aviso'; document.body.appendChild(a); }
  a.className = `visible ${tipo}`; a.textContent = texto;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('visible'), tipo === 'error' ? 4200 : 2800);
}

// ---------------------------------------------------------------- datos
async function recargar() {
  const [c, i, s, r] = await Promise.all([D.miColeccion(), D.miInventario(), D.configSobres(),
    D.misReliquias().then(x => { sinReliquias = false; return x; }).catch(() => { sinReliquias = true; return []; })]);
  col = new Map((c || []).map(r => [r.campeon, r]));
  inv = i || inv; cfg = s || [];
  rels = (r || []).map(instancia).filter(Boolean);
}
// Hace una acción del servidor sin dejar que se repita por doble toque; avisa los errores en español
async function accion(fn) {
  if (ocupado) return;
  ocupado = true; document.body.classList.add('tc-ocupado');
  try { return await fn(); }
  catch (e) { aviso(D.mensajeError(e), 'error'); }
  finally { ocupado = false; document.body.classList.remove('tc-ocupado'); }
}
const nuevosDe = ids => new Set(ids.filter(id => !col.has(id)));
const fichas = ids => ids.map(porId).filter(Boolean);

// ---------------------------------------------------------------- ventana Tienda / Colección / Portal
function pintarInventario() {
  const pct = Math.min(100, inv.frag_runa / FRAG_POR_RUNA * 100);
  $('#tc-inv').innerHTML = `
    <span title="Oro">🪙 <b>${num(inv.oro)}</b></span>
    ${inv.vales_sobre ? `<span title="Vales de sobre (ábrelos gratis en la Tienda)">🎟️ <b>${num(inv.vales_sobre)}</b></span>` : ''}
    <span title="Runas de Invocación">🔮 <b>${num(inv.runas)}</b></span>
    <span class="tc-frag" title="Fragmentos de Runa de Invocación (${FRAG_POR_RUNA} = 1 Runa)">🧩 <b>${inv.frag_runa}/${FRAG_POR_RUNA}</b><i style="--p:${pct}%"></i></span>
    <span title="Otros fragmentos (sus usos llegarán pronto)">💠 <b>${num(inv.frag_otros)}</b></span>`;
}

function sobresVisibles() {
  const ahora = Date.now();
  return cfg.filter(c => c.activo && SOBRES[c.id] && (!c.desde || Date.parse(c.desde) <= ahora) && (!c.hasta || Date.parse(c.hasta) >= ahora));
}

function htmlTienda() {
  const lista = sobresVisibles();
  if (!lista.length) return '<p class="tc-vacio">No hay sobres disponibles en este momento. ¡Vuelve pronto!</p>';
  // Sobres de campeones arriba (en el orden del registro) y sobres de reliquias abajo, cada grupo en su sección
  const orden = id => Object.keys(SOBRES).indexOf(id);
  const grupo = rel => lista.filter(c => (SOBRES[c.id].tipo === 'reliquias') === rel).sort((a, b) => orden(a.id) - orden(b.id));
  const campeones = grupo(false), reliquias = sinReliquias ? [] : grupo(true);
  return `${campeones.length ? `<h4 class="tc-seccion">Sobres de campeones</h4>${htmlSobres(campeones)}` : ''}
    ${reliquias.length ? `<h4 class="tc-seccion">Sobres de reliquias</h4>${htmlSobres(reliquias)}` : ''}`;
}
function htmlSobres(lista) {
  return `<div class="tc-sobres">${lista.map(c => { const s = SOBRES[c.id], alcanza = inv.oro >= c.precio, esRel = s.tipo === 'reliquias';
      if (esRel && sinReliquias) return '';
      return `<div class="tc-sobre ${esRel ? 'reliquias' : ''}" style="--c:${s.color}">
        ${s.imagen ? `<div class="tc-sobre-arte con-arte" style="--arte:url('${s.imagen}')"><img src="${s.imagen}" alt="${s.nombre}"></div>` : `<div class="tc-sobre-arte"><span>${s.icono}</span></div>`}
        <b>${s.nombre}</b>
        <button class="eq-listo tc-abrir" ${esRel ? 'data-reliquias' : `data-sobre="${c.id}"`} ${alcanza ? '' : 'disabled'}>${c.precio > 0 ? `🪙 ${num(c.precio)}` : 'Gratis'}</button>
        ${esRel ? htmlGarantias() : inv.vales_sobre ? `<button class="eq-btn tc-vale" data-vale="${c.id}">🎟️ Usar vale</button>` : alcanza ? '' : '<em>Te falta oro</em>'}
      </div>`; }).join('')}</div>`;
}

// Garantías por calendario del sobre de reliquias (Rara cada 2, Especial cada 6, Épica cada 50; nunca se reinician)
const GARANTIAS = [['Rara', 2, 'Raro'], ['Especial', 6, 'Especial'], ['Épica', 50, 'Épico']];
function htmlGarantias() {
  const n = inv.rel_sobres || 0;
  return `<div class="tc-garantias">${GARANTIAS.map(([nombre, c, rz]) => { const k = c - (n % c);
    return `<span style="--rc:${RAREZAS[rz].color}">${nombre}: <b>${k === 1 ? '¡el próximo!' : `en ${k} sobres`}</b></span>`; }).join('')}</div>`;
}

// ---------------------------------------------------------------- pestaña Reliquias (inventario)
const ordenRel = (a, b) => RAREZAS[b.rarity].orden - RAREZAS[a.rarity].orden || calidad(b) - calidad(a) || a.name.localeCompare(b.name);
const dondeEsta = r => r.campeon ? `${porId(r.campeon)?.nombre || r.campeon} · ${ESPACIOS.find(e => e.id === r.espacio)?.label || ''}` : '';
function miniaturaRel(r, attrs = '') {
  return `<button class="tc-rel ${r.campeon ? 'puesta' : ''} ${r.rarity === 'Legendario' ? 'legendaria' : ''}" ${attrs} style="--rc:${RAREZAS[r.rarity].color}" title="${r.name} · ${r.rarity} · Calidad ${calidad(r)}%${r.campeon ? ` · en ${dondeEsta(r)}` : ''}">
    ${r.imagen ? `<img src="${r.imagen}" alt="" loading="lazy">` : `<span>${r.name}</span>`}
    <i class="tc-rel-q">${calidad(r)}%</i>${r.campeon ? `<i class="tc-rel-en">${porId(r.campeon)?.emoji || '👤'}</i>` : ''}</button>`;
}
function htmlReliquias() {
  if (sinReliquias) return '<p class="tc-vacio">Las reliquias se activan cuando se ejecute <b>docs/sql/005_reliquias.sql</b> en el servidor.</p>';
  if (relSel) {
    const r = rels.find(x => x.uid === relSel);
    if (!r) { relSel = null; return htmlReliquias(); }
    return `<button class="eq-btn tc-volver" data-rel-volver>← Reliquias</button>
      <div class="tc-rel-det">${cartaReliquia(r)}
        <div class="tc-rel-acc">${r.campeon ? `<p>Equipada en <b>${dondeEsta(r)}</b></p><button class="eq-btn" data-quitar="${r.uid}">Quitar</button>`
          : '<p>Para equiparla, abre la ficha de un campeón en <b>Colección</b> y toca uno de sus espacios.</p>'}</div></div>`;
  }
  const chips = (clave, lista) => lista.map(([v, t]) => `<button class="${relFiltro[clave] === v ? 'on' : ''}" data-filtro="${clave}" data-valor="${v}">${t}</button>`).join('');
  const lista = rels.filter(r => (!relFiltro.cat || r.category === relFiltro.cat) && (!relFiltro.rareza || r.rarity === relFiltro.rareza)).sort(ordenRel);
  return `<div class="tc-filtros">${chips('cat', [['', 'Todas'], ['Arma', 'Armas'], ['Equipación', 'Equipación'], ['Accesorio', 'Accesorios']])}</div>
    <div class="tc-filtros">${chips('rareza', [['', 'Todas'], ...Object.keys(RAREZAS).map(k => [k, RAREZAS[k].plural])])}</div>
    <p class="tc-nota">Tienes <b>${rels.length}</b> reliquia${rels.length === 1 ? '' : 's'}${lista.length !== rels.length ? ` · mostrando ${lista.length}` : ''}. Consíguelas en el sobre <b>Relics of Power</b> de la Tienda.</p>
    ${lista.length ? `<div class="tc-rels">${lista.map(r => miniaturaRel(r, `data-rel="${r.uid}"`)).join('')}</div>` : '<p class="tc-vacio">No hay reliquias aquí todavía.</p>'}`;
}

// Espacios de reliquias de un campeón en su ficha: equipar, cambiar y quitar
function equipoDe(id) { const e = {}; for (const r of rels) if (r.campeon === id) e[r.espacio] = r; return e; }
const abiertosDe = r => r.espacios_abiertos?.length || !r.espacios ? (r.espacios_abiertos || []) : ['arma2', 'equip2', 'acc2'].slice(0, r.espacios);
function htmlEspaciosReliquias(p, r) {
  if (sinReliquias) return '';
  const equipo = equipoDe(p.id), abiertos = abiertosDe(r), arco = equipo.arma1?.type === 'Arco';
  const casillas = ESPACIOS.map(e => {
    const label = e.id === 'arma2' && arco ? 'Equipación 3' : e.label, rel = equipo[e.id], cerrado = e.extra && !abiertos.includes(e.id);
    if (cerrado) return `<div class="tc-slot cerrado"><span>🔒</span><small>${label}</small></div>`;
    return `<button class="tc-slot ${rel ? 'lleno' : ''} ${rel?.rarity === 'Legendario' ? 'legendaria' : ''} ${slotSel === e.id ? 'sel' : ''}" data-slot="${e.id}" style="--rc:${rel ? RAREZAS[rel.rarity].color : '#334155'}">
      ${rel ? (rel.imagen ? `<img src="${rel.imagen}" alt="">` : `<b>${rel.name}</b>`) : '<span>＋</span>'}<small>${label}</small></button>`;
  }).join('');
  let panel = '';
  if (slotSel) {
    const actual = equipo[slotSel], ctx = { equipo, abiertos, estrellas: r.estrellas };
    const opciones = rels.filter(x => x.uid !== actual?.uid).map(x => ({ x, motivo: motivoNoEquipar(x, slotSel, ctx) }))
      .filter(o => !o.motivo || /★/.test(o.motivo)).sort((a, b) => !!a.motivo - !!b.motivo || ordenRel(a.x, b.x));
    panel = `<div class="tc-slot-panel">
      ${actual ? `<div class="tc-rel-det">${cartaReliquia(actual)}<div class="tc-rel-acc"><button class="eq-btn" data-quitar="${actual.uid}">Quitar</button></div></div>` : ''}
      <h5>${actual ? 'Cambiar por' : 'Elige una reliquia'}</h5>
      ${opciones.length ? `<div class="tc-rels">${opciones.map(({ x, motivo }) => miniaturaRel(x, motivo ? `data-motivo="${motivo}"` : `data-equipar="${x.uid}"`)).join('')}</div>`
        : '<p class="tc-tenue">No tienes reliquias que vayan en este espacio.</p>'}
      <p class="tc-tenue">Con ${r.estrellas}★ puede usar reliquias ${Object.entries(RAREZAS).filter(([, v]) => v.estrellas <= r.estrellas).map(([, v]) => v.plural).join(', ')}. Las grises necesitan más estrellas.</p></div>`;
  }
  return `<section class="tc-equipo"><h4>🗡️ Reliquias equipadas</h4><div class="tc-slots">${casillas}</div>${panel}</section>`;
}

function htmlColeccion() {
  if (detalle) return htmlDetalle(porId(detalle));
  const tengo = OFICIALES.filter(p => col.has(p.id)).length;
  const orden = [...OFICIALES].sort((a, b) => (col.has(b.id) - col.has(a.id)) || a.nombre.localeCompare(b.nombre));
  return `<p class="tc-nota">Tienes <b>${tengo}/${OFICIALES.length}</b> campeones. Toca uno para ascenderlo, abrir espacios de reliquias o desfragmentar copias.</p>
    <div class="tc-grid">${orden.map(p => { const r = col.get(p.id);
      return `<button class="tc-carta ${r ? '' : 'falta'}" data-ver="${p.id}" style="--c:${p.color}">
        <div class="tc-img">${retrato(p)}</div>
        ${r && r.copias ? `<span class="tc-copias">×${r.copias}</span>` : ''}
        <div class="tc-pie"><b>${p.nombre}</b>${r ? estrellas(r.estrellas) : '<small>No lo tienes</small>'}</div>
      </button>`; }).join('')}</div>`;
}

function htmlDetalle(p) {
  const r = col.get(p.id);
  if (!r) { detalle = null; return htmlColeccion(); }
  const sigEstrella = r.estrellas + 1, puedeAscender = r.estrellas < 5 && r.copias >= sigEstrella;
  const sigEsp = r.espacios, espCopias = COSTO_ESPACIO.copias[sigEsp], espOro = COSTO_ESPACIO.oro[sigEsp];
  const cerrados = ESPACIOS.filter(e => e.extra && !abiertosDe(r).includes(e.id));
  return `<button class="eq-btn tc-volver" data-volver>← Colección</button>
    <div class="tc-det" style="--c:${p.color}">
      <div class="tc-det-img">${retrato(p)}</div>
      <div class="tc-det-info">
        <h3>${p.nombre}</h3><small>${roles(p)}</small>
        <div class="tc-det-est">${estrellas(r.estrellas)} <span class="tc-bono">+${r.estrellas * BONO_ESTRELLA}% a sus estadísticas</span></div>
        <p>Copias disponibles: <b>${r.copias}</b></p>
      </div>
    </div>
    <div class="tc-acciones">
      <section><h4>⭐ Ascender</h4>
        ${r.estrellas >= 5 ? '<p>¡Ya tiene las 5 estrellas!</p>' : `<p>Sube a ${sigEstrella}★ (+${BONO_ESTRELLA}% a Vida, Daño y Velocidad, +1 a sus estadísticas en %). Cuesta <b>${sigEstrella} copia${sigEstrella > 1 ? 's' : ''}</b>.</p>
        <button class="eq-listo" data-ascender ${puedeAscender ? '' : 'disabled'}>Ascender a ${sigEstrella}★</button>`}
      </section>
      <section><h4>💎 Espacios de reliquias <small>${r.espacios}/3</small></h4>
        ${sigEsp >= 3 ? '<p>Todos sus espacios están abiertos.</p>' : `<p>Elige qué espacio abrir. El siguiente cuesta <b>${espCopias} copia${espCopias > 1 ? 's' : ''}</b> o <b>🪙 ${num(espOro)}</b>.</p>
        ${cerrados.map(e => `<div class="tc-fila"><span class="tc-esp-nom">${e.label}</span>
          <button class="eq-btn" data-espacio="copias" data-esp="${e.id}" ${r.copias >= espCopias ? '' : 'disabled'}>${espCopias} copia${espCopias > 1 ? 's' : ''}</button>
          <button class="eq-btn" data-espacio="oro" data-esp="${e.id}" ${inv.oro >= espOro ? '' : 'disabled'}>🪙 ${num(espOro)}</button></div>`).join('')}`}
      </section>
      <section><h4>🧩 Desfragmentar</h4>
        <p>Cada copia da 3 fragmentos: 1 o 2 de Runa de Invocación y el resto de otros tipos.</p>
        ${r.copias ? `<div class="tc-fila"><input id="tc-cant" type="number" min="1" max="${r.copias}" value="1"><button class="eq-btn" data-desfrag>Desfragmentar</button></div>` : '<p class="tc-tenue">No tiene copias para desfragmentar.</p>'}
      </section>
    </div>
    ${htmlEspaciosReliquias(p, r)}`;
}

function htmlPortal() {
  const puedeCombinar = inv.frag_runa >= FRAG_POR_RUNA, p = elegidoPortal && porId(elegidoPortal);
  return `<div class="tc-portal">
      <div class="tc-portal-runa"><span>🔮</span><div><b>${num(inv.runas)} Runa${inv.runas === 1 ? '' : 's'} de Invocación</b>
        <small>Cada runa invoca al campeón que tú elijas.</small></div></div>
      <div class="tc-portal-frag"><div class="tc-barra"><i style="width:${Math.min(100, inv.frag_runa / FRAG_POR_RUNA * 100)}%"></i></div>
        <small>🧩 ${inv.frag_runa}/${FRAG_POR_RUNA} fragmentos para la siguiente runa</small>
        <button class="eq-btn" data-combinar ${puedeCombinar ? '' : 'disabled'}>Combinar ${FRAG_POR_RUNA} fragmentos</button></div>
    </div>
    <p class="tc-nota">Elige un campeón y gasta 1 runa para invocarlo. Si ya lo tienes, ganas una copia.</p>
    <div class="tc-grid tc-grid-portal">${OFICIALES.map(c => `<button class="tc-carta ${c.id === elegidoPortal ? 'elegido' : ''}" data-portal="${c.id}" style="--c:${c.color}">
      <div class="tc-img">${retrato(c)}</div><div class="tc-pie"><b>${c.nombre}</b><small>${col.has(c.id) ? 'Lo tienes' : 'Nuevo'}</small></div></button>`).join('')}</div>
    <div class="tc-portal-ir"><button class="eq-listo" data-invocar ${p && inv.runas > 0 ? '' : 'disabled'}>${p ? `Invocar a ${p.nombre}` : 'Elige un campeón'}</button></div>`;
}

function pintar() {
  if ($('#tc').classList.contains('hidden')) return;
  pintarInventario();
  for (const b of document.querySelectorAll('.tc-tabs button')) b.classList.toggle('on', b.dataset.tab === pestana);
  $('#tc-cont').innerHTML = pestana === 'tienda' ? htmlTienda() : pestana === 'portal' ? htmlPortal() : pestana === 'reliquias' ? htmlReliquias() : htmlColeccion();
}

export async function abrirTC(tab = 'tienda') {
  if (!perfilActual()) return;
  if (!perfilActual().starter_elegido) return mostrarStarter();
  pestana = tab; detalle = null; relSel = null; slotSel = null;
  $('#tc').classList.remove('hidden');
  $('#tc-cont').innerHTML = '<p class="tc-vacio">Cargando…</p>';
  try { await recargar(); pintar(); }
  catch (e) { $('#tc-cont').innerHTML = `<p class="tc-vacio">${D.mensajeError(e)}</p>`; }
}
const cerrarTC = () => $('#tc').classList.add('hidden');
export const tcAbierto = () => !$('#tc').classList.contains('hidden') || !$('#starter').classList.contains('hidden');

// ---------------------------------------------------------------- acciones
async function abrirSobre(id) {
  const s = SOBRES[id], precio = cfg.find(c => c.id === id)?.precio || 0;
  if (precio > 0 && !confirm(`¿Abrir ${s.nombre} por ${num(precio)} de oro?`)) return;
  await accion(async () => {
    const ids = await D.abrirSobre(id);
    const nuevos = nuevosDe(ids);
    await revelarCartas({ sobre: s, campeones: fichas(ids), nuevos });
    await recargar(); pintar();
  });
}

async function abrirReliquias() {
  const s = SOBRES.reliquias, precio = cfg.find(c => c.id === 'reliquias')?.precio || 0;
  if (precio > 0 && !confirm(`¿Abrir ${s.nombre} por ${num(precio)} de oro?`)) return;
  await accion(async () => {
    const r = await D.abrirSobreReliquias();
    const nuevas = (r.reliquias || []).map(instancia).filter(Boolean);
    await revelarCartas({ sobre: s, reliquias: nuevas });
    await recargar(); pintar();
  });
}

async function abrirConVale(id) {
  const s = SOBRES[id];
  if (!confirm(`¿Usar 1 vale para abrir ${s.nombre}? (Te quedan ${inv.vales_sobre})`)) return;
  await accion(async () => {
    const ids = await D.abrirSobreVale(id);
    await revelarCartas({ sobre: s, campeones: fichas(ids), nuevos: nuevosDe(ids) });
    await recargar(); pintar();
  });
}

async function ejecutar(e) {
  const t = e.target;
  if (t.id === 'tc' || t.closest('#tc-x')) return cerrarTC();
  const tab = t.closest('.tc-tabs button'); if (tab) { pestana = tab.dataset.tab; detalle = null; relSel = null; slotSel = null; return pintar(); }
  const gris = t.closest('button[data-motivo]'); if (gris) return aviso(gris.dataset.motivo, 'error');
  const b = t.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.sobre) return abrirSobre(b.dataset.sobre);
  if ('reliquias' in b.dataset) return abrirReliquias();
  if (b.dataset.filtro) { relFiltro[b.dataset.filtro] = b.dataset.valor; return pintar(); }
  if (b.dataset.rel) { relSel = b.dataset.rel; return pintar(); }
  if ('relVolver' in b.dataset) { relSel = null; return pintar(); }
  if (b.dataset.slot) { slotSel = slotSel === b.dataset.slot ? null : b.dataset.slot; return pintar(); }
  if (b.dataset.equipar) return accion(async () => { await D.equiparReliquia(b.dataset.equipar, detalle, slotSel); await recargar(); slotSel = null; pintar(); aviso('Reliquia equipada.'); });
  if (b.dataset.quitar) return accion(async () => { await D.desequiparReliquia(b.dataset.quitar); await recargar(); pintar(); aviso('La reliquia volvió a tu inventario.'); });
  if (b.dataset.vale) return abrirConVale(b.dataset.vale);
  if (b.dataset.ver) { detalle = b.dataset.ver; slotSel = null; return pintar(); }
  if ('volver' in b.dataset) { detalle = null; slotSel = null; return pintar(); }
  if ('ascender' in b.dataset) return accion(async () => { const n = await D.ascender(detalle); await recargar(); pintar(); aviso(`¡${porId(detalle).nombre} ascendió a ${n}★!`); });
  if (b.dataset.espacio) {
    const con = b.dataset.espacio, sig = col.get(detalle).espacios, esp = b.dataset.esp, nombre = ESPACIOS.find(e => e.id === esp)?.label || `el espacio ${sig + 1}`;
    if (con === 'oro' && !confirm(`¿Abrir ${nombre} por ${num(COSTO_ESPACIO.oro[sig])} de oro?`)) return;
    return accion(async () => { await D.desbloquearEspacio(detalle, con, esp); await recargar(); pintar(); aviso(`${nombre} desbloqueado.`); });
  }
  if ('desfrag' in b.dataset) {
    const n = Math.floor(Number($('#tc-cant').value)), max = col.get(detalle).copias;
    if (!(n >= 1 && n <= max)) return aviso(`Elige de 1 a ${max} copias.`, 'error');
    if (!confirm(`¿Desfragmentar ${n} copia${n > 1 ? 's' : ''} de ${porId(detalle).nombre}? Esto no se puede deshacer.`)) return;
    return accion(async () => { const r = await D.desfragmentar(detalle, n); await recargar(); pintar(); aviso(`Obtuviste 🧩 ${r.frag_runa} de Runa y 💠 ${r.frag_otros} de otros fragmentos.`); });
  }
  if ('combinar' in b.dataset) return accion(async () => { await D.combinarRuna(); await recargar(); pintar(); aviso('¡Creaste una Runa de Invocación! 🔮'); });
  if (b.dataset.portal) { elegidoPortal = b.dataset.portal; return pintar(); }
  if ('invocar' in b.dataset) {
    const p = porId(elegidoPortal);
    if (!confirm(`¿Gastar 1 Runa de Invocación para invocar a ${p.nombre}?`)) return;
    return accion(async () => {
      const id = await D.invocarPortal(p.id), nuevos = nuevosDe([id]);
      await revelarCartas({ sobre: { nombre: 'Portal de Invocación', icono: '🔮', color: '#a855f7' }, campeones: fichas([id]), nuevos });
      elegidoPortal = null; await recargar(); pintar();
    });
  }
}

// ---------------------------------------------------------------- Starter Pack (una sola vez por cuenta)
let starterSel = null;
function pintarStarter() {
  $('#starter-cont').innerHTML = Object.entries(STARTERS).map(([id, s]) => `
    <button class="st-pack ${starterSel === id ? 'elegido' : ''}" data-st="${id}" style="--c:${s.color}">
      ${s.imagen ? `<img class="st-arte" src="${s.imagen}" alt="${s.nombre}">` : `<span class="st-ico">${s.icono}</span>`}<b>${s.nombre}</b>
    </button>`).join('');
  const b = $('#starter-ir');
  b.disabled = !starterSel;
  b.textContent = starterSel ? `Abrir ${STARTERS[starterSel].nombre}` : 'Elige un pack';
}
export function mostrarStarter() {
  const p = perfilActual();
  if (!p || p.starter_elegido) return;
  starterSel = null; pintarStarter();
  $('#starter').classList.remove('hidden');
}
async function elegirStarter() {
  const id = starterSel, s = STARTERS[id];
  if (!id || !confirm(`¿Elegir ${s.nombre}? Solo puedes elegir un Starter Pack.`)) return;
  await accion(async () => {
    const ids = await D.abrirStarter(id);
    perfilActual().starter_elegido = id;
    $('#starter').classList.add('hidden');
    pintarPie();
    await revelarCartas({ sobre: s, campeones: fichas(ids), nuevos: new Set(ids) });
    aviso('¡Bienvenido! Tus campeones están en tu Colección.');
  });
}

// ---------------------------------------------------------------- botones del menú
function pintarPie() {
  const conSesion = !!perfilActual();
  for (const id of ['#btn-tienda', '#btn-coleccion']) $(id)?.classList.toggle('hidden', !conSesion);
}

export function iniciarColeccion() {
  $('#btn-tienda').addEventListener('click', () => abrirTC('tienda'));
  $('#btn-coleccion').addEventListener('click', () => abrirTC('coleccion'));
  $('#tc').addEventListener('click', ejecutar);
  $('#starter').addEventListener('click', e => {
    if (e.target.closest('#starter-x')) return $('#starter').classList.add('hidden');
    const p = e.target.closest('[data-st]'); if (p) { starterSel = p.dataset.st; return pintarStarter(); }
    if (e.target.closest('#starter-ir')) elegirStarter();
  });
  addEventListener('cuenta:cambio', () => {
    pintarPie();
    if (!perfilActual()) { cerrarTC(); $('#starter').classList.add('hidden'); return; }
    if (!perfilActual().starter_elegido && document.body.dataset.pantalla === 'menu') mostrarStarter();
  });
  addEventListener('inventario:cambio', async () => { if (!$('#tc').classList.contains('hidden')) { await recargar().catch(() => {}); pintar(); } });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || $('#apertura')) return;
    if (!$('#tc').classList.contains('hidden')) { if (slotSel) { slotSel = null; pintar(); } else if (relSel) { relSel = null; pintar(); } else if (detalle) { detalle = null; pintar(); } else cerrarTC(); }
    else if (!$('#starter').classList.contains('hidden')) $('#starter').classList.add('hidden');
  });
  pintarPie();
}
