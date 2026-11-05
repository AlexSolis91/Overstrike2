// Qué buffs y debuffs puede poner cada campeón. Sale de leer su ficha (movimientos, pasiva, líder, transformaciones e
// invocaciones), así que un campeón nuevo aparece solo en el filtro del selector de equipos.
import { EFECTOS } from '../motor/efectos.js';
import { INVOCACIONES, TABLAS_INVOCACION } from './invocaciones.js';
import { OFICIALES } from './personajes/index.js';

const ACCIONES_EFECTO = { burn: 'burn', poison: 'poison', hemorragia: 'hemo', escudo: 'shield', clavarAgujas: 'aguja' };   // acciones que ponen un efecto sin decir su id

function recorrer(nodo, ids, vistos) {
  if (!nodo || typeof nodo !== 'object' || vistos.has(nodo)) return;
  vistos.add(nodo);
  if (Array.isArray(nodo)) { for (const x of nodo) recorrer(x, ids, vistos); return; }
  if (nodo.tipo === 'efecto') {
    if (nodo.id) ids.add(nodo.id);
    for (const id of nodo.idAzar || []) ids.add(id);
  }
  if (ACCIONES_EFECTO[nodo.tipo]) ids.add(ACCIONES_EFECTO[nodo.tipo]);
  for (const id of nodo.efectosPermanentes || []) ids.add(id);
  if (nodo.tipo === 'invocar' && INVOCACIONES[nodo.key]) recorrer(INVOCACIONES[nodo.key], ids, vistos);
  if (nodo.tipo === 'invocarAzar') {
    const tabla = TABLAS_INVOCACION?.[nodo.tabla];
    for (const k of Object.keys(tabla || {})) recorrer(INVOCACIONES[tabla[k]?.key ?? k], ids, vistos);
  }
  for (const [k, v] of Object.entries(nodo)) if (k !== 'condicion' && k !== 'desc') recorrer(v, ids, vistos);
}

const cache = new Map();
export function efectosDe(def) {
  if (!cache.has(def.id)) {
    const ids = new Set();
    recorrer([def.movimientos, def.pasiva, def.lider, def.transformacion], ids, new Set());
    cache.set(def.id, new Set([...ids].filter(id => ['buff', 'debuff'].includes(EFECTOS[id]?.tipo))));
  }
  return cache.get(def.id);
}

// Lista para el filtro: { buffs, debuffs }, por nombre. Solo efectos que al menos un campeón puede poner.
let lista = null;
export function efectosParaFiltro() {
  if (lista) return lista;
  const usados = new Set(OFICIALES.flatMap(p => [...efectosDe(p)]));
  const de = tipo => [...usados].filter(id => EFECTOS[id].tipo === tipo)
    .map(id => ({ id, nombre: EFECTOS[id].nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return (lista = { buffs: de('buff'), debuffs: de('debuff') });
}

// Lista desplegable del filtro. La usan el selector de equipos y la Colección.
export function selectorEfectos(id, elegido) {
  const { buffs, debuffs } = efectosParaFiltro();
  const op = l => l.map(x => `<option value="${x.id}" ${elegido === x.id ? 'selected' : ''}>${x.nombre}</option>`).join('');
  return `<select id="${id}" class="eq-efecto ${elegido ? 'on' : ''}" aria-label="Filtrar por buff o debuff"><option value="">Buff o debuff: todos</option><optgroup label="Buffs">${op(buffs)}</optgroup><optgroup label="Debuffs">${op(debuffs)}</optgroup></select>`;
}
