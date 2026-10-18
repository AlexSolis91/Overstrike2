// Recetas de Legendarias (aprobadas el 2026-10-18). REGLA: cada receta pide SIEMPRE 10 Épicas: Épicas definidas (×2 o ×3)
// + 2 o 3 comodines (cualquier Épica). Las recetas son de todos y se pueden repetir; cada Legendaria forjada sortea sus valores.
// El servidor valida y forja (docs/sql/007_recetas.sql; el catálogo de recetas lo sube generar_catalogo.mjs).
import { RELIQUIAS } from './reliquias.js';

export const RECETAS = {
  shadowmourne:    { definidas: { bestiari: 3, guanteletesColoso: 2, dagaViudaNegra: 2 }, comodines: 3 },
  armaduraMithril: { definidas: { cinturonArcano: 3, mascaraDragon: 2, celestia: 2 }, comodines: 3 },
  frostmourne:     { definidas: { nichirin: 3, coronaReyCaido: 3, capaEclipse: 2 }, comodines: 2 },
  escudoHyliano:   { definidas: { arcoVacioEstelar: 3, botasTrueno: 3, lanzaValquiria: 2 }, comodines: 2 },
  anilloTiempo:    { definidas: { anilloLuz: 3, piedraSol: 3, amuletoPantano: 2 }, comodines: 2 },
};
export const EPICAS_POR_RECETA = 10;

for (const [id, r] of Object.entries(RECETAS)) {
  if (RELIQUIAS[id]?.rarity !== 'Legendario') throw new Error(`Receta ${id}: no es una Legendaria`);
  const n = Object.values(r.definidas).reduce((s, x) => s + x, 0) + r.comodines;
  if (n !== EPICAS_POR_RECETA) throw new Error(`Receta ${id}: pide ${n} Épicas (deben ser ${EPICAS_POR_RECETA})`);
  for (const e of Object.keys(r.definidas)) if (RELIQUIAS[e]?.rarity !== 'Épico') throw new Error(`Receta ${id}: ${e} no es Épica`);
}

// ¿Las reliquias elegidas (instancias) cumplen la receta? Devuelve { ok, faltan: { id: n }, comodines: n usados }
export function revisarReceta(id, elegidas) {
  const r = RECETAS[id], cuenta = {};
  for (const x of elegidas) cuenta[x.id] = (cuenta[x.id] || 0) + 1;
  const faltan = {};
  let sobran = elegidas.length;
  for (const [e, n] of Object.entries(r.definidas)) { const usa = Math.min(n, cuenta[e] || 0); sobran -= usa; if (usa < n) faltan[e] = n - usa; }
  const todasEpicas = elegidas.every(x => x.rarity === 'Épico');
  return { ok: todasEpicas && !Object.keys(faltan).length && elegidas.length === EPICAS_POR_RECETA, faltan, comodines: sobran };
}

// Propuesta automática: para cada Épica definida, tus copias de menor calidad; los comodines, las de menor calidad que sobren
export function proponerIngredientes(id, disponibles, calidad) {
  const r = RECETAS[id], orden = [...disponibles].sort((a, b) => calidad(a) - calidad(b)), usadas = [];
  for (const [e, n] of Object.entries(r.definidas)) usadas.push(...orden.filter(x => x.id === e).slice(0, n));
  const resto = orden.filter(x => !usadas.includes(x));
  // primero comodines de Épicas que no son ingrediente fijo de esta receta (las definidas se guardan para otra copia)
  resto.sort((a, b) => (a.id in r.definidas) - (b.id in r.definidas) || calidad(a) - calidad(b));
  usadas.push(...resto.slice(0, r.comodines));
  return usadas;
}
