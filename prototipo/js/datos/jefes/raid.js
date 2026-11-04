// Jefe de Raid: datos compartidos por el juego y por el servidor que repite las batallas (sin DOM).
// El HP, los rangos y las recompensas viven en el servidor (docs/sql/026_jefe_raid.sql); aquí solo lo que necesita la batalla.
import lichKing from './lich-king.js';

export const JEFES_RAID = { 'lich-king': lichKing };
export const RONDAS_RAID = 30;
// Cada ronda el jefe y sus invocaciones hacen +2% de daño: +20% en la ronda 10, +50% en la 25
export const FURIA_RAID = { desde: 1, dmgPct: .02 };
// Subir este número al cambiar cómo se pelea contra el jefe (motor o reglas): así el servidor no rechaza ataques por una función desactualizada
export const REGLAS_RAID = 2;
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
