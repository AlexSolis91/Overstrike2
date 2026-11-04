// Jefe de Raid: datos compartidos por el juego y por el servidor que repite las batallas (sin DOM).
// El HP, los rangos y las recompensas viven en el servidor (docs/sql/026_jefe_raid.sql); aquí solo lo que necesita la batalla.
import lichKing from './lich-king.js';

export const JEFES_RAID = { 'lich-king': lichKing };
export const RONDAS_RAID = 30;
export const FURIA_RAID = { desde: 21, dmgPct: .10, texto: '❄️ ¡FURIA DEL REY! Su Daño sube cada ronda' };
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
