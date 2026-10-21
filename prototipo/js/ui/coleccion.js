// Tienda, Colección, Portal de Invocación y elección del Starter Pack. Todo lo que cambia la colección o el inventario lo
// hace el SERVIDOR (datos.js); aquí solo se muestra y se piden las acciones. Las aperturas usan la animación de apertura.js.
import { OFICIALES, porId } from '../datos/personajes/index.js';
import { STARTERS } from '../datos/starters.js';
import { SOBRES } from '../datos/sobres.js';
import { perfilActual } from './cuenta.js';
import { revelarCartas } from './apertura.js';
import * as D from '../servicios/datos.js';
import { RAREZAS, ESPACIOS, STAT_META, instancia, calidad, motivoNoEquipar } from '../datos/reliquias.js';
import { cartaReliquia } from './panel.js';
import { RECETAS, revisarReceta, proponerIngredientes } from '../datos/recetas.js';
import { RELIQUIAS } from '../datos/reliquias.js';

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
let rels = [], sinReliquias = false, hazana = null;   // copias de reliquias del jugador; hazana: superó la oleada 30 de la Horda (null = sin SQL 011)
// (sinReliquias: falta docs/sql/005_reliquias.sql)
let relFiltro = { cat: '', rareza: '' }, relSel = null, slotSel = null;   // pestaña Reliquias y espacio elegido en la ficha
let relModo = 'ver', relMarcadas = new Set();
let recetaSel = null, recetaMarcadas = new Set();   // pestaña Recetas: Legendaria elegida y las 10 Épicas que se entregan   // pestaña Reliquias: 'ver' | 'descomponer' | 'fusionar' y las reliquias elegidas
// Polvo Arcano y fusión (igual que en el servidor, docs/sql/006_horda.sql)
const POLVO = { 'Común': 1, 'Raro': 5, 'Especial': 20, 'Épico': 100 };
const COSTO_MEJORA = { 'Común': 2, 'Raro': 8, 'Especial': 25, 'Épico': 80, 'Legendario': 200 };
const ORO_FUSION = { 'Común': 1000, 'Raro': 5000, 'Especial': 20000 };
const SIG_RAREZA = { 'Común': 'Raro', 'Raro': 'Especial', 'Especial': 'Épico' };
const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const precioPortal = () => { const n = inv.portal_dia === hoyMx() ? inv.portal_compras || 0 : 0; return n === 0 ? 10000 : n === 1 ? 20000 : 40000; };
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
  hazana = await D.misHitosHorda('orcos').then(h => (h || []).some(x => x.oleada === 30)).catch(() => null);
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
    <span title="Otros fragmentos (sus usos llegarán pronto)">💠 <b>${num(inv.frag_otros)}</b></span>
    ${inv.runas_portal != null ? `<span title="Runas de Portal (entrar a la Horda)"><img class="tc-ico" src="assets/items/runaPortal.png" alt=""> <b>${num(inv.runas_portal)}</b></span>` : ''}
    ${inv.polvo_arcano != null ? `<span title="Polvo Arcano (mejorar valores de reliquias)"><img class="tc-ico" src="assets/items/polvoArcano.png" alt=""> <b>${num(inv.polvo_arcano)}</b></span>` : ''}`;
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
  const precio = precioPortal();
  const objetos = inv.runas_portal == null ? '' : `<h4 class="tc-seccion">Objetos</h4><div class="tc-sobres"><div class="tc-sobre" style="--c:#3b82f6">
      <div class="tc-sobre-arte"><img src="assets/items/runaPortal.png" alt="Runa de Portal" style="object-fit:contain;padding:10px"></div>
      <b>Runa de Portal</b>
      <button class="eq-listo tc-abrir" data-comprarportal ${inv.oro >= precio ? '' : 'disabled'}>🪙 ${num(precio)}</button>
      <em>Abre la Horda · el precio sube con cada compra del día (10,000 · 20,000 · 40,000)</em></div></div>`;
  return `${campeones.length ? `<h4 class="tc-seccion">Sobres de campeones</h4>${htmlSobres(campeones)}` : ''}
    ${reliquias.length ? `<h4 class="tc-seccion">Sobres de reliquias</h4>${htmlSobres(reliquias)}` : ''}${objetos}`;
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

// ---------------------------------------------------------------- pestaña Recetas (forjar Legendarias con 10 Épicas)
const epicasLibres = () => rels.filter(r => r.rarity === 'Épico' && !r.campeon && !r.bloqueada);
function htmlRecetas() {
  if (sinReliquias) return '<p class="tc-vacio">Las recetas se activan con las reliquias del servidor.</p>';
  if (recetaSel) return htmlReceta(recetaSel);
  const libres = epicasLibres();
  return `<p class="tc-nota">Cada receta pide <b>10 Épicas</b>: algunas definidas y otras <b>comodín</b> (cualquier Épica). Las equipadas o con candado no cuentan. Puedes forjar cada Legendaria las veces que quieras.</p>
    ${hazana === false ? '<p class="tc-nota">🔒 <b>Hazaña requerida:</b> para forjar las Legendarias de la Horda de Orcos primero tienes que superar la <b>oleada 30</b> de la Horda (una vez).</p>' : hazana ? '<p class="tc-nota">🏆 Hazaña de la oleada 30 conseguida.</p>' : ''}
    <div class="tc-recetas">${Object.entries(RECETAS).map(([id, r]) => {
      const leg = RELIQUIAS[id], prop = proponerIngredientes(id, libres, calidad), ok = revisarReceta(id, prop).ok;
      return `<button class="tc-receta ${ok ? 'lista' : ''}" data-receta="${id}">
        <img class="tc-receta-img" src="${leg.imagen}" alt="">
        <div><b>${leg.name}</b><small>${leg.category} · ${leg.type}</small>
          <div class="tc-ing">${Object.entries(r.definidas).map(([e, n]) => { const t = libres.filter(x => x.id === e).length;
            return `<span class="${t >= n ? 'ok' : ''}">${t >= n ? '✔' : '✖'} ${RELIQUIAS[e].name} ${Math.min(t, n)}/${n}</span>`; }).join('')}
            <span class="${prop.length === 10 && ok ? 'ok' : ''}">${ok ? '✔' : '✖'} ${r.comodines} Épicas cualquiera</span></div>
          ${ok ? '<em class="tc-forjable">✨ ¡Puedes forjarla!</em>' : ''}</div></button>`; }).join('')}</div>`;
}
function htmlReceta(id) {
  const r = RECETAS[id], leg = RELIQUIAS[id], libres = epicasLibres();
  const elegidas = libres.filter(x => recetaMarcadas.has(x.uid)), rev = revisarReceta(id, elegidas);
  return `<button class="eq-btn tc-volver" data-receta-volver>← Recetas</button>
    <div class="tc-rel-det"><div class="rc legendaria" style="--rc:${RAREZAS.Legendario.color}"><img class="rc-img" src="${leg.imagen}" alt="">
      <div class="rc-head"><div class="rc-name">${leg.name}</div><div class="rc-rarity">Legendaria</div></div><div class="rc-type">${leg.category} · ${leg.type}</div>
      <div class="rc-passive"><b>Pasiva</b>${leg.passive}</div></div>
      <div class="tc-rel-acc">
        <h5>Ingredientes (${elegidas.length}/10)</h5>
        <div class="tc-ing">${Object.entries(r.definidas).map(([e, n]) => { const t = elegidas.filter(x => x.id === e).length;
          return `<span class="${t >= n ? 'ok' : ''}">${t >= n ? '✔' : '✖'} ${RELIQUIAS[e].name} ${Math.min(t, n)}/${n}</span>`; }).join('')}
          <span class="${rev.ok ? 'ok' : ''}">${rev.ok ? '✔' : '✖'} Comodines (cualquier Épica) ${Math.max(0, rev.comodines)}/${r.comodines}</span></div>
        <p class="tc-tenue">Te propusimos tus copias de menor calidad. Toca una Épica para quitarla o agregarla.</p>
        ${hazana === false ? '<p class="tc-tenue">🔒 Necesitas la Hazaña: supera la oleada 30 de la Horda.</p>' : ''}
        <button class="eq-listo" data-forjar="${id}" ${rev.ok && hazana !== false ? '' : 'disabled'}>🔨 Forjar ${leg.name}</button>
      </div></div>
    <div class="tc-rels">${libres.sort((a, b) => (b.id in r.definidas) - (a.id in r.definidas) || calidad(a) - calidad(b))
      .map(x => miniaturaRel(x, `data-ingrediente="${x.uid}"`).replace('class="tc-rel ', `class="tc-rel ${recetaMarcadas.has(x.uid) ? 'marcada' : ''} `)).join('')
      || '<p class="tc-vacio">No tienes Épicas libres.</p>'}</div>`;
}

// ---------------------------------------------------------------- pestaña Reliquias (inventario)
const ordenRel = (a, b) => RAREZAS[b.rarity].orden - RAREZAS[a.rarity].orden || calidad(b) - calidad(a) || a.name.localeCompare(b.name);
const dondeEsta = r => r.campeon ? `${porId(r.campeon)?.nombre || r.campeon} · ${ESPACIOS.find(e => e.id === r.espacio)?.label || ''}` : '';
function miniaturaRel(r, attrs = '') {
  return `<button class="tc-rel ${r.campeon ? 'puesta' : ''} ${r.rarity === 'Legendario' ? 'legendaria' : ''} ${relMarcadas.has(r.uid) ? 'marcada' : ''}" ${attrs} style="--rc:${RAREZAS[r.rarity].color}" title="${r.name} · ${r.rarity} · Calidad ${calidad(r)}%${r.campeon ? ` · en ${dondeEsta(r)}` : ''}">
    ${r.imagen ? `<img src="${r.imagen}" alt="" loading="lazy">` : `<span>${r.name}</span>`}
    <i class="tc-rel-q">${calidad(r)}%</i>${r.campeon ? `<i class="tc-rel-en">${porId(r.campeon)?.emoji || '👤'}</i>` : ''}${r.bloqueada ? '<i class="tc-rel-lock">🔒</i>' : ''}</button>`;
}
function htmlReliquias() {
  if (sinReliquias) return '<p class="tc-vacio">Las reliquias se activan cuando se ejecute <b>docs/sql/005_reliquias.sql</b> en el servidor.</p>';
  if (relSel) {
    const r = rels.find(x => x.uid === relSel);
    if (!r) { relSel = null; return htmlReliquias(); }
    return `<button class="eq-btn tc-volver" data-rel-volver>← Reliquias</button>
      <div class="tc-rel-det">${cartaReliquia(r)}
        <div class="tc-rel-acc">${r.campeon ? `<p>Equipada en <b>${dondeEsta(r)}</b></p><button class="eq-btn" data-quitar="${r.uid}">Quitar</button>`
          : '<p>Para equiparla, abre la ficha de un campeón en <b>Colección</b> y toca uno de sus espacios.</p>'}
          ${inv.polvo_arcano != null ? `<button class="eq-btn" data-candado="${r.uid}">${r.bloqueada ? '🔓 Quitar candado' : '🔒 Poner candado'}</button>
          <p class="tc-tenue">Con candado no se puede descomponer ni fusionar.</p>${htmlMejorar(r)}` : ''}</div></div>`;
  }
  const herr = inv.polvo_arcano == null ? '' : `<div class="tc-filtros tc-herr">${[['ver', '👁️ Ver'], ['descomponer', '🧪 Descomponer'], ['fusionar', '⚗️ Fusionar']]
    .map(([m, t]) => `<button class="${relModo === m ? 'on' : ''}" data-relmodo="${m}">${t}</button>`).join('')}</div>${htmlAccionMasiva()}`;
  const chips = (clave, lista) => lista.map(([v, t]) => `<button class="${relFiltro[clave] === v ? 'on' : ''}" data-filtro="${clave}" data-valor="${v}">${t}</button>`).join('');
  const lista = rels.filter(r => (!relFiltro.cat || r.category === relFiltro.cat) && (!relFiltro.rareza || r.rarity === relFiltro.rareza)).sort(ordenRel);
  return `${herr}<div class="tc-filtros">${chips('cat', [['', 'Todas'], ['Arma', 'Armas'], ['Equipación', 'Equipación'], ['Accesorio', 'Accesorios']])}</div>
    <div class="tc-filtros">${chips('rareza', [['', 'Todas'], ...Object.keys(RAREZAS).map(k => [k, RAREZAS[k].plural])])}</div>
    <p class="tc-nota">Tienes <b>${rels.length}</b> reliquia${rels.length === 1 ? '' : 's'}${lista.length !== rels.length ? ` · mostrando ${lista.length}` : ''}. Consíguelas en el sobre <b>Relics of Power</b> de la Tienda.</p>
    ${lista.length ? `<div class="tc-rels">${lista.map(r => miniaturaRel(r, relModo === 'ver' ? `data-rel="${r.uid}"` : bloqueoMasivo(r) ? `data-motivo="${bloqueoMasivo(r)}"` : `data-marcar="${r.uid}"`)).join('')}</div>` : '<p class="tc-vacio">No hay reliquias aquí todavía.</p>'}`;
}
// Descomponer / fusionar: qué reliquias no se pueden elegir y la barra con el botón de la acción
function bloqueoMasivo(r) {
  if (r.campeon) return 'Está equipada: quítala primero';
  if (r.bloqueada) return 'Tiene candado';
  if (relModo === 'descomponer' && r.rarity === 'Legendario') return 'Las Legendarias no se descomponen';
  if (relModo === 'fusionar') {
    if (!SIG_RAREZA[r.rarity]) return `Las ${RAREZAS[r.rarity].plural} no se fusionan`;
    const otra = rels.find(x => relMarcadas.has(x.uid));
    if (otra && otra.rarity !== r.rarity && !relMarcadas.has(r.uid)) return 'Las 10 deben ser de la misma rareza';
  }
  return '';
}
function htmlAccionMasiva() {
  const marcadas = rels.filter(r => relMarcadas.has(r.uid));
  if (relModo === 'descomponer') {
    const polvo = marcadas.reduce((s, r) => s + (POLVO[r.rarity] || 0), 0);
    return `<div class="tc-masiva"><span>Toca las reliquias que quieres romper: dan Polvo Arcano (Común 1 · Rara 5 · Especial 20 · Épica 100).</span>
      <div><button class="eq-btn" data-marcartodas="Común">Todas las Comunes</button><button class="eq-btn" data-marcartodas="Raro">Todas las Raras</button>
      <button class="eq-btn" data-desmarcar>Ninguna</button>
      <button class="eq-listo" data-descomponer ${marcadas.length ? '' : 'disabled'}>🧪 Descomponer ${marcadas.length} (+${num(polvo)})</button></div></div>`;
  }
  if (relModo === 'fusionar') {
    const rz = marcadas[0]?.rarity;
    return `<div class="tc-masiva"><span>Elige 10 reliquias de la misma rareza: se convierten en 1 reliquia al azar de la rareza siguiente.
      ${rz ? `Costo: 🪙 ${num(ORO_FUSION[rz])} → 1 ${SIG_RAREZA[rz]}.` : ''}</span>
      <div><button class="eq-btn" data-desmarcar>Ninguna</button>
      <button class="eq-listo" data-fusionar ${marcadas.length === 10 ? '' : 'disabled'}>⚗️ Fusionar (${marcadas.length}/10)</button></div></div>`;
  }
  return '';
}
// Mejorar valores con Polvo Arcano: cada línea (plana o una porcentual; las de 2–3 tiradas se sortean juntas)
function htmlMejorar(r) {
  const costo = COSTO_MEJORA[r.rarity], lineas = [['plana', STAT_META[r.flat[0]].label]];
  for (const [k] of r.rolls) if (!lineas.some(l => l[0] === k)) lineas.push([k, STAT_META[k].label]);
  return `<h5>🎲 Mejorar valores (${num(costo)} de Polvo por intento)</h5>
    <p class="tc-tenue">Vuelve a sortear una línea dentro de su rango. El nuevo valor reemplaza al anterior, aunque salga más bajo.</p>
    <div class="tc-mejorar">${lineas.map(([k, t]) => `<button class="eq-btn" data-mejorar="${k}" data-relid="${r.uid}" ${inv.polvo_arcano >= costo ? '' : 'disabled'}>${t}</button>`).join('')}</div>`;
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
  $('#tc-cont').innerHTML = pestana === 'tienda' ? htmlTienda() : pestana === 'portal' ? htmlPortal() : pestana === 'reliquias' ? htmlReliquias() : pestana === 'recetas' ? htmlRecetas() : htmlColeccion();
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
  const tab = t.closest('.tc-tabs button'); if (tab) { pestana = tab.dataset.tab; detalle = null; relSel = null; slotSel = null; relModo = 'ver'; relMarcadas.clear(); recetaSel = null; recetaMarcadas.clear(); return pintar(); }
  const gris = t.closest('button[data-motivo]'); if (gris) return aviso(gris.dataset.motivo, 'error');
  const b = t.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.sobre) return abrirSobre(b.dataset.sobre);
  if ('reliquias' in b.dataset) return abrirReliquias();
  if (b.dataset.filtro) { relFiltro[b.dataset.filtro] = b.dataset.valor; return pintar(); }
  if (b.dataset.receta) { recetaSel = b.dataset.receta; recetaMarcadas = new Set(proponerIngredientes(recetaSel, epicasLibres(), calidad).map(x => x.uid)); return pintar(); }
  if ('recetaVolver' in b.dataset) { recetaSel = null; recetaMarcadas.clear(); return pintar(); }
  if (b.dataset.ingrediente) { const u = b.dataset.ingrediente; if (recetaMarcadas.has(u)) recetaMarcadas.delete(u); else if (recetaMarcadas.size < 10) recetaMarcadas.add(u); return pintar(); }
  if (b.dataset.forjar) {
    const id = b.dataset.forjar, ids = [...recetaMarcadas];
    if (!confirm(`¿Forjar ${RELIQUIAS[id].name}? Se consumen estas 10 Épicas. Esto no se puede deshacer.`)) return;
    return accion(async () => {
      const fila = await D.forjarLegendaria(id, ids); recetaMarcadas.clear(); recetaSel = null;
      await revelarCartas({ sobre: { nombre: 'Forja Legendaria', icono: '🔨', color: RAREZAS.Legendario.color }, reliquias: [instancia(fila)].filter(Boolean) });
      await recargar(); pintar();
    });
  }
  if (b.dataset.relmodo) { relModo = b.dataset.relmodo; relMarcadas.clear(); return pintar(); }
  if (b.dataset.marcar) { const id = b.dataset.marcar; if (relMarcadas.has(id)) relMarcadas.delete(id); else if (relModo !== 'fusionar' || relMarcadas.size < 10) relMarcadas.add(id); return pintar(); }
  if (b.dataset.marcartodas) { for (const r of rels) if (r.rarity === b.dataset.marcartodas && !bloqueoMasivo(r)) relMarcadas.add(r.uid); return pintar(); }
  if ('desmarcar' in b.dataset) { relMarcadas.clear(); return pintar(); }
  if ('descomponer' in b.dataset) {
    const ids = [...relMarcadas];
    if (!confirm(`¿Descomponer ${ids.length} reliquia(s)? Esto no se puede deshacer.`)) return;
    return accion(async () => { const polvo = await D.descomponerReliquias(ids); relMarcadas.clear(); await recargar(); pintar(); aviso(`Obtuviste ${num(polvo)} de Polvo Arcano.`); });
  }
  if ('fusionar' in b.dataset) {
    const ids = [...relMarcadas], rz = rels.find(r => r.uid === ids[0])?.rarity;
    if (!confirm(`¿Fusionar estas 10 reliquias ${RAREZAS[rz].plural} por ${num(ORO_FUSION[rz])} de oro? Esto no se puede deshacer.`)) return;
    return accion(async () => {
      const fila = await D.fusionarReliquias(ids); relMarcadas.clear();
      await revelarCartas({ sobre: { nombre: 'Fusión', icono: '⚗️', color: RAREZAS[SIG_RAREZA[rz]].color }, reliquias: [instancia(fila)].filter(Boolean) });
      await recargar(); pintar();
    });
  }
  if (b.dataset.candado) { const r = rels.find(x => x.uid === b.dataset.candado); return accion(async () => { await D.bloquearReliquia(r.uid, !r.bloqueada); await recargar(); pintar(); }); }
  if (b.dataset.mejorar) return accion(async () => { await D.mejorarReliquia(b.dataset.relid, b.dataset.mejorar); await recargar(); pintar(); aviso('¡Nuevo valor sorteado!'); });
  if ('comprarportal' in b.dataset) {
    const precio = precioPortal();
    if (!confirm(`¿Comprar 1 Runa de Portal por ${num(precio)} de oro?`)) return;
    return accion(async () => { const r = await D.comprarRunaPortal(); await recargar(); pintar(); aviso(`¡Runa de Portal comprada! Tienes ${r.runas}. La siguiente cuesta ${num(r.siguiente)}.`); });
  }
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
