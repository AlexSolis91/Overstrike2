// Arena (diseño aprobado el 2026-10-18; el servidor manda: docs/sql/008_arena.sql). Aquí solo lo que se muestra.
export const LIGAS = [
  { id: 'Bronce',    min: 0,    icono: '🥉', color: '#b45309' },
  { id: 'Plata',     min: 400,  icono: '🥈', color: '#cbd5e1' },
  { id: 'Oro',       min: 800,  icono: '🥇', color: '#facc15' },
  { id: 'Platino',   min: 1200, icono: '💠', color: '#5eead4' },
  { id: 'Diamante',  min: 1600, icono: '💎', color: '#60a5fa' },
  { id: 'Campeones', min: 2000, icono: '🏆', color: '#f97316' },
  { id: 'Master',    min: 2400, icono: '👑', color: '#c084fc' },
  { id: 'Leyenda',   min: 2800, icono: '🌟', color: '#fbbf24', nota: 'Top 100 global con más de 2,800 puntos' },
];
export const liga = id => LIGAS.find(l => l.id === id) || LIGAS[0];
export const siguienteLiga = id => LIGAS[LIGAS.findIndex(l => l.id === id) + 1] || null;

export const ATAQUES_DIARIOS = 5;
export const CAMPEONES_MINIMOS = 10;
export const BUSQUEDA_SEG = 10;              // cuenta regresiva al buscar rival
// Recompensas (iguales que en el servidor)
export const ORO_VICTORIA = { Bronce: 1000, Plata: 1250, Oro: 1500, Platino: 1750, Diamante: 2000, Campeones: 2250, Master: 2500, Leyenda: 3000 };
export const SEMANAL = {
  Bronce: { runas: 1, oro: 10000 }, Plata: { runas: 1, oro: 20000 }, Oro: { runas: 2, oro: 30000, frag: 5 }, Platino: { runas: 2, oro: 40000, frag: 10 },
  Diamante: { runas: 3, oro: 60000, frag: 10, vales: 1 }, Campeones: { runas: 3, oro: 80000, frag: 15, vales: 1 },
  Master: { runas: 4, oro: 100000, frag: 20, vales: 2 }, Leyenda: { runas: 4, oro: 150000, frag: 20, vales: 2 },
};
export const TEMPORADA = { Bronce: 50000, Plata: 100000, Oro: 200000, Platino: 350000, Diamante: 500000, Campeones: 800000, Master: 1200000, Leyenda: 2000000 };
