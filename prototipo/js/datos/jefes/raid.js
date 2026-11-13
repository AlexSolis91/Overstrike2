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
// Cofres 1–4 del Jefe de Raid (sin imagen se muestra 🧰). probEstelar: probabilidad de Polvo Estelar (igual que en docs/sql/031)
export const COFRES_RAID = [
  { nombre: 'Cofre de Madera', imagen: 'assets/cofres/cofre-de-madera.webp', probEstelar: .15 },
  { nombre: 'Cofre de Plata', imagen: 'assets/cofres/cofre-de-plata.webp', probEstelar: .25 },
  { nombre: 'Cofre de Oro', imagen: 'assets/cofres/cofre-de-oro.webp', probEstelar: .40 },
  { nombre: 'Cofre Arcano', imagen: 'assets/cofres/cofre-arcano.webp', probEstelar: .60 },
];
export const nombreCofre = n => COFRES_RAID[n - 1]?.nombre || `Cofre ${n}`;
export const imgCofre = (n, clase = '') => COFRES_RAID[n - 1]?.imagen ? `<img class="${clase}" src="${COFRES_RAID[n - 1].imagen}" alt="">` : `<span class="${clase} sin">🧰</span>`;

export const REGLAS_RAID = 20;
// La Hemorragia crece 10 veces más lento contra un jefe: +0.1 puntos por golpe en vez de +1
export const CRECE_HEMO_RAID = .1;
// Cuánto pega el jefe en cada dificultad (dmg), Polvo Estelar que da un cofre si sale (estelar) y cuánta Resistencia gana sobre la suya (res: +25 puntos por nivel;
// Lich King: 50% en Fácil → 150% en Pesadilla)
export const DIFICULTADES_RAID = {
  facil: { nombre: 'Fácil', dmg: 1, res: 0, estelar: 5, color: '#86efac' },
  normal: { nombre: 'Normal', dmg: 1.25, res: .25, estelar: 8, color: '#7dd3fc' },
  dificil: { nombre: 'Difícil', dmg: 1.5, res: .50, estelar: 12, color: '#fde68a' },
  brutal: { nombre: 'Brutal', dmg: 2, res: .75, estelar: 18, color: '#fdba74' },
  pesadilla: { nombre: 'Pesadilla', dmg: 2.5, res: 1, estelar: 25, color: '#fca5a5' },
};
// Opciones de crearCombate para el equipo del jefe
export const opcionesRaid = (dificultad, hpInicio, hpTotal) => ({
  dmgPct: DIFICULTADES_RAID[dificultad].dmg - 1, res: DIFICULTADES_RAID[dificultad].res, barra: { hp: hpInicio, total: hpTotal, creceHemo: CRECE_HEMO_RAID }, limiteRondas: RONDAS_RAID, furiaRonda: FURIA_RAID,
});
