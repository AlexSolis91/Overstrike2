// Misiones diarias (se renuevan a medianoche, hora de México). El SERVIDOR cuenta el progreso y paga los premios
// (docs/sql/016_misiones_runas.sql); aquí solo están los textos. Clave, meta y premio deben coincidir con public._misiones().
export const MISIONES = [
  { id: 1,  texto: 'Gana 2 batallas de Campaña',            clave: 'campana_victorias',  meta: 2,  dificultad: 'Fácil',   premio: { oro: 3000 } },
  { id: 2,  texto: 'Juega 3 combates de Arena',             clave: 'arena_jugados',      meta: 3,  dificultad: 'Fácil',   premio: { oro: 3000 } },
  { id: 3,  texto: 'Equipa o cambia 1 reliquia',            clave: 'equipar',            meta: 1,  dificultad: 'Fácil',   premio: { polvo: 10 } },
  { id: 4,  texto: 'Gana 5 combates de Arena',              clave: 'arena_victorias',    meta: 5,  dificultad: 'Fácil',   premio: { runas_portal: 1 } },
  { id: 5,  texto: 'Abre 1 sobre',                          clave: 'sobres',             meta: 1,  dificultad: 'Media',   premio: { polvo: 20 } },
  { id: 6,  texto: 'Gana 3 etapas de Campaña con 3★',       clave: 'campana_3estrellas', meta: 3,  dificultad: 'Media',   premio: { frag_runa: 10 } },
  { id: 7,  texto: 'Supera la oleada 20 de la Horda',       clave: 'horda_oleada',       meta: 20, dificultad: 'Media',   premio: { trofeos: 20 } },
  { id: 8,  texto: 'Gana 10 combates de Arena',             clave: 'arena_victorias',    meta: 10, dificultad: 'Difícil', premio: { oro: 20000, frag_runa: 10 } },
  { id: 9,  texto: 'Supera la oleada 40 de la Horda',       clave: 'horda_oleada',       meta: 40, dificultad: 'Difícil', premio: { trofeos: 60, frag_runa: 20 } },
  { id: 10, texto: 'Completa todas las misiones diarias',   clave: 'todas',              meta: 9,  dificultad: 'Final',   premio: { vales: 1 } },
];

export const COLOR_DIFICULTAD = { 'Fácil': '#4ade80', 'Media': '#60a5fa', 'Difícil': '#c084fc', 'Final': '#fbbf24' };

// Progreso de una misión con el estado del servidor ({ progreso: { clave: n } }); la final cuenta las otras 9 completadas
export function avance(m, progreso = {}) {
  const n = m.clave === 'todas' ? MISIONES.filter(x => x.id !== m.id && (progreso[x.clave] || 0) >= x.meta).length : progreso[m.clave] || 0;
  return Math.min(n, m.meta);
}
