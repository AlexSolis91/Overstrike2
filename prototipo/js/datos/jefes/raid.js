// Jefe de Raid: datos compartidos por el juego y por el servidor que repite las batallas (sin DOM).
// El HP, los rangos y las recompensas viven en el servidor (docs/sql/026_jefe_raid.sql); aquí solo lo que necesita la batalla.
import lichKing from './lich-king.js';

export const JEFES_RAID = { 'lich-king': lichKing };
export const RONDAS_RAID = Infinity;   // sin tope: la pelea termina cuando cae tu equipo o el jefe
// Cuánto sube el daño del jefe y de sus invocaciones en cada ronda. Acumulado: +25% en la ronda 5, +75% en la 10, +150% en la 15,
// +250% en la 20, +375% en la 25 y +625% en la 30; después, +100% por ronda.
export const FURIA_RAID = { desde: 1, tramos: [{ hasta: 5, pct: .05 }, { hasta: 10, pct: .10 }, { hasta: 15, pct: .15 }, { hasta: 20, pct: .20 }, { hasta: 25, pct: .25 }, { hasta: 30, pct: .50 }, { pct: 1 }] };
// Daño extra acumulado en una ronda, como fracción (ronda 10 → 1 = +100%)
export const furiaAcumulada = ronda => {
  let total = 0;
  for (let r = 1; r <= ronda; r++) total += FURIA_RAID.tramos.find(t => t.hasta == null || r <= t.hasta).pct;
  return total;
};
// Subir este número al cambiar cómo se pelea contra el jefe (motor o reglas): así el servidor no rechaza ataques por una función desactualizada
export const REGLAS_RAID = 4;
// Cuánto pega el jefe en cada dificultad
export const DIFICULTADES_RAID = {
  facil: { nombre: 'Fácil', dmg: 1, color: '#86efac' },
  normal: { nombre: 'Normal', dmg: 1.5, color: '#7dd3fc' },
  dificil: { nombre: 'Difícil', dmg: 2, color: '#fde68a' },
  brutal: { nombre: 'Brutal', dmg: 3, color: '#fdba74' },
  pesadilla: { nombre: 'Pesadilla', dmg: 4, color: '#fca5a5' },
};
// Opciones de crearCombate para el equipo del jefe
export const opcionesRaid = (dificultad, hpInicio, hpTotal) => ({
  dmgPct: DIFICULTADES_RAID[dificultad].dmg - 1, barra: { hp: hpInicio, total: hpTotal }, limiteRondas: RONDAS_RAID, furiaRonda: FURIA_RAID,
});
