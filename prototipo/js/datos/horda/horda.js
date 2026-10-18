// Modo Horda: oleadas sin tope de 5 enemigos. Cada oleada es más fuerte que la anterior (crecimiento compuesto),
// así que tarde o temprano ningún equipo resiste. Recompensas por oleada (iguales para todas las Hordas, con su lote).
import { ORCOS, FURIA } from './orcos.js';

export const HORDAS = {
  orcos: {
    nombre: 'Horda de Orcos', lote: 'orcos', enemigos: ORCOS,
    basicos: ['orco', 'arquero-orco', 'escudero-orco'],                       // oleadas 1–4
    medios: ['chaman-orco', 'domador-de-lobos', 'brujo-orco', 'portaestandarte-orco'],   // desde la 6
    elite: ['asesino-orco', 'alto-orco'],                                     // desde la 11
    limitados: ['chaman-orco', 'brujo-orco', 'domador-de-lobos', 'portaestandarte-orco'], // máx. 2 iguales por oleada
    miniJefes: ['general-galek', 'general-torl-khan'],                         // 5, 25, 45… / 15, 35, 55…
    jefes: { 10: 'gul-dan', 20: 'kargalgan' },                                 // 10, 30, 50… / 20, 40, 60…
  },
};

// Calibrado con simulaciones (2026-10-18, equipos al azar con el equipo de su ficha): llega a la oleada 10 ~94%,
// a la 20 ~12% (Kargalgan es el gran muro) y a la 30 ~3%. Las fichas se multiplican por BASE en la oleada 1.
export const BASE = .40, CRECIMIENTO = .05;     // +5% de HP y Daño por oleada, compuesto (sin tope)
export const poderOleada = n => BASE * Math.pow(1 + CRECIMIENTO, n - 1);

// Qué sale en la oleada n: { enemigos: [ids], jefe: 'miniJefe'|'jefe'|null, opciones del rival para el motor }
export function oleada(n, horda = HORDAS.orcos, rng = Math.random) {
  const al = l => l[Math.floor(rng() * l.length)];
  const pool = [...horda.basicos, ...(n >= 6 ? horda.medios : []), ...(n >= 11 ? horda.elite : [])];
  const enemigos = [];
  let rango = null, furia = null;
  if (n % 10 === 0) { const id = horda.jefes[n % 20 === 0 ? 20 : 10]; enemigos.push(id); rango = 'jefe'; furia = FURIA[id] || FURIA.jefe; }
  else if (n % 5 === 0) { enemigos.push(horda.miniJefes[Math.floor((n / 5 - 1) / 2) % 2]); rango = 'miniJefe'; furia = FURIA.miniJefe; }
  if (rango === 'jefe' && !enemigos.includes('chaman-orco')) enemigos.push('chaman-orco');   // el jefe siempre trae un Chamán
  while (enemigos.length < 5) {
    const id = al(pool);
    if (horda.limitados.includes(id) && enemigos.filter(x => x === id).length >= 2) continue;
    enemigos.push(id);
  }
  const p = poderOleada(n);
  return { n, enemigos, rango, opciones: { poder: p, sinReliquias: true, sinLider: !rango, jefe: furia || undefined } };
}
export const defsOleada = (o, horda = HORDAS.orcos) => o.enemigos.map(id => horda.enemigos[id]);

// ---------------------------------------------------------------- recompensas (el servidor las da; esto es la regla)
export const oroOleada = n => 1000 + 150 * (n - 1);
export const MULT_ORO = { miniJefe: 3, jefe: 5 };
export const PROB_RELIQUIA = .30;
export const PROB_FRAGMENTOS = .02;           // 1–3 fragmentos de Runa de Invocación
// Rareza de la reliquia según el tramo de la oleada superada (aprobado 2026-10-18): en oleadas bajas casi solo Comunes;
// llegar más lejos abre Raras, Especiales y Épicas. La Épica nunca pasa de 3%.
export const TRAMOS_RAREZA = [
  { desde: 1,  'Común': .95, 'Raro': .05,  'Especial': 0,    'Épico': 0 },
  { desde: 10, 'Común': .75, 'Raro': .22,  'Especial': .03,  'Épico': 0 },
  { desde: 20, 'Común': .50, 'Raro': .38,  'Especial': .115, 'Épico': .005 },
  { desde: 30, 'Común': .30, 'Raro': .45,  'Especial': .23,  'Épico': .02 },
  { desde: 40, 'Común': .20, 'Raro': .45,  'Especial': .32,  'Épico': .03 },
];
export function rarezasOleada(n) {
  const { desde, ...r } = [...TRAMOS_RAREZA].reverse().find(t => n >= t.desde);
  return r;
}
