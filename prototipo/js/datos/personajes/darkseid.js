import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-16, kit del usuario). Darkseid, el tirano de Apokolips. Tanque · Daño: Mega Provocación permanente,
// se escuda ANTES de cada ataque de área enemigo, roba vida con su Básico, sus Rayos Omega (Daño y HP) rebotan sobre los que
// deja con 30% de HP o menos, y la Ecuación de la Anti-Vida posee al equipo rival y lo vuelve más fuerte por cada Posesión.
// Líder: Señor Supremo de Apokolips (buff al azar a cada aliado cada ronda; absorbe el HP máx. de los aliados caídos).
const BUFFS_TIRANO = ['frenzy', 'dmgUp', 'bloodlust', 'assist', 'counter', 'fortaleza', 'anticipar'];
const POSESION = [
  { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .15, a: 'propio' },
  { tipo: 'bonoPermanente', stat: 'hpPct', pct: .15, a: 'propio' },
];
const MEGA_POSESION = [
  { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .40, a: 'propio' },
  { tipo: 'bonoPermanente', stat: 'hpPct', pct: .40, a: 'propio' },
];

export default {
  id: 'darkseid',
  franquicia: 'DC', grupos: ['villanos'],   // campaña: temas de las etapas
  nombre: 'Darkseid',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '👁️', color: '#dc2626', imagen: 'assets/personajes/darkseid.webp',
  base: { hp: 820, dmg: 55, spd: 84 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Señor Supremo de Apokolips',
    desc: 'Al inicio de cada ronda, cada aliado gana un buff al azar hasta el final de la ronda: Frenesí, Furia, Letalidad, Asistir, Contraataque, Fortaleza o Anticipar. Cada vez que cae un aliado, Darkseid gana HP máx. igual al HP máx. del caído y se cura esa misma cantidad.',
    alIniciarRonda: { tipo: 'efecto', idAzar: BUFFS_TIRANO, dur: 1, finDeRonda: true, a: 'todosAliados' },
    alMorirAliado: { tipo: 'ganarHpMax', base: 'hpMaxObjetivo', pct: 1, curar: true, a: 'propio' },
  },
  pasiva: {
    nombre: 'Dios de la Tiranía',
    desc: 'Tiene Mega Provocación permanente y es inmune a Miedo. Cada vez que un enemigo usa un ataque de área, antes de recibir el daño gana un Escudo del 50% de su HP máx. (1 ronda; se suma al que tenga).',
    efectosPermanentes: ['megaTaunt'],
    inmuneA: ['fear'],
    gatillo: 'alEnemigoAoe',
    accion: { tipo: 'escudo', pct: .50, dur: 1, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe del Tirano', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: 1.20, escala: 'dano', cd: 0,
      desc: 'Causa 120% (escala por Daño) y Darkseid se cura el 50% del daño causado.',
      efectos: [{ cuando: 'final', accion: { tipo: 'curar', base: 'danoCausado', pct: .50, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Rayos Omega', objetivo: 'enemigo', estilo: 'ranged', color: 0xef4444,
      pct: 1.80, escala: 'danoHp', cd: 3, rebota: { hpMenor: .30, texto: '👁️ ¡Rayos Omega!' },
      desc: 'Causa 180% (escala por Daño y HP: 60% del Daño + 40% del HP ÷ 7.5). Si el objetivo queda con 30% de HP o menos (o cae), el rayo rebota a otro enemigo al azar que no haya golpeado en este ataque, y así sucesivamente.',
    },
    {
      categoria: 'over', nombre: 'La Ecuación de la Anti-Vida', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7f1d1d,
      pct: 2.80, escala: 'dano', cd: 6,
      desc: 'Causa 280% (escala por Daño) a todos los enemigos con 60% de probabilidad de Posesión; cada Posesión tiene 30% de volverse Mega Posesión. Por cada Posesión que entra, Darkseid gana +15% de Daño y +15% de HP máx. permanentes; por cada Mega Posesión, +40% de cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'possess', prob: .60, megaProb: .30,
        alAcertar: { tipo: 'multiple', acciones: POSESION, a: 'propio' },
        alAcertarMega: { tipo: 'multiple', acciones: MEGA_POSESION, a: 'propio' } } }],
    },
  ],
};
