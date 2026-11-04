// Forja de los Dioses (2026-11-03). Cada receta es única de la cuenta que la ganó: el servidor sortea sus 5 Épicas y la guarda
// ligada al jugador (docs/sql/025_forja_dioses.sql). Aquí solo está lo que se muestra; el servidor vuelve a validar todo al forjar.
export const INGREDIENTES_RECETA = 5, CALIDAD_MINIMA = 80, COSTO_FORJA = 1000000;
// Qué Jefe de Raid suelta cada receta
export const JEFE_DE_LEGENDARIA = {
  frostmourne: 'Lich King', shadowmourne: 'Bolvar Fordragon', anilloTiempo: 'Zamasu', armaduraMithril: 'Balrog', escudoHyliano: 'Ganon',
};

export const motivoNoApta = (r, calidad) => r.bloqueada ? 'tiene candado' : calidad(r) < CALIDAD_MINIMA ? `su calidad es menor a ${CALIDAD_MINIMA}%` : null;
const cuantas = lista => { const m = {}; for (const id of lista) m[id] = (m[id] || 0) + 1; return m; };

// Por cada Épica que pide la receta: { id, pide, aptas, bajas, candado } según tus copias (equipadas incluidas)
export function estadoReceta(ingredientes, copias, calidad) {
  return Object.entries(cuantas(ingredientes)).map(([id, pide]) => {
    const mias = copias.filter(x => x.id === id);
    return { id, pide, aptas: mias.filter(x => !motivoNoApta(x, calidad)).length, candado: mias.filter(x => x.bloqueada).length,
      bajas: mias.filter(x => !x.bloqueada && calidad(x) < CALIDAD_MINIMA).length };
  });
}
// Propuesta: primero las que no están equipadas y, entre ellas, las de menor calidad
export function proponerIngredientes(ingredientes, copias, calidad) {
  return Object.entries(cuantas(ingredientes)).flatMap(([id, pide]) => copias
    .filter(x => x.id === id && !motivoNoApta(x, calidad))
    .sort((a, b) => !!a.campeon - !!b.campeon || calidad(a) - calidad(b))
    .slice(0, pide));
}
export function recetaCompleta(ingredientes, elegidas, calidad) {
  if (elegidas.length !== INGREDIENTES_RECETA || elegidas.some(x => motivoNoApta(x, calidad))) return false;
  const a = cuantas(ingredientes), b = cuantas(elegidas.map(x => x.id));
  return Object.keys(a).every(id => a[id] === b[id]);
}
