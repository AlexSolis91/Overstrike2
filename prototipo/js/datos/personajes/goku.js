import { espacios } from '../reliquias.js';

// Ficha oficial #6 (revisada el 2026-10-01). Dos transformaciones PERMANENTES encadenadas:
// Goku -> Goku Super Sayajin -> Goku Super Sayajin 3. Cada forma trae sus propias estadísticas base;
// "extra" = diferencia contra la base común (Prob. Crítico 5%, Resistencia 50%, Penetración de escudo 0%, Armadura 0%).

const sangreSayajin = {
  nombre: 'Sangre Sayajin',
  desc: 'Cada vez que Goku se transforma gana 1 turno adicional y recibe uno de estos buffs al azar (que no tenga activo) por 2 rondas: Furia, Frenesí, Celeridad, Letalidad o Agudeza.',
  gatillo: 'alTransformarse',
  accion: { tipo: 'multiple', a: 'propio', acciones: [
    { tipo: 'turnoExtra' },
    { tipo: 'efecto', idAzar: ['dmgUp', 'frenzy', 'haste', 'bloodlust', 'keen'], sinRepetir: true, dur: 2 },
  ] },
};

const gokuSuperSayajin3 = {
  nombre: 'Goku Super Sayajin 3',
  emoji: '⚡', color: '#fbbf24', imagen: 'assets/transformaciones/goku-super-sayajin-3.webp',
  base: { hp: 700, dmg: 100, spd: 96 },
  extra: { critRate: .15, res: .20, pen: .20, armor: .20 },   // armor .20 = bono de "Super Saiyajin 3" (reemplaza al +10%)
  pasiva: {
    nombre: 'Leyenda Sayajin',
    desc: 'Todos sus golpes le roban HP equivalente al 5% del daño causado (incluye el daño absorbido por escudos).',
    roboVida: .05,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Super Kamehameha', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: .70, escala: 'dano', cd: 0, critExtra: .15,
      desc: 'Causa 70% a todos los enemigos. +15% de Prob. Crítico en este ataque.',
    },
    {
      categoria: 'especial', nombre: 'Golpe del Dragón', objetivo: 'enemigo', estilo: 'melee', color: 0xfbbf24,
      pct: 2.00, escala: 'dano', cd: 3, bonoPorHpPerdido: { cada: .10, pct: .10 },
      desc: 'Causa 200%. +10% de daño por cada 10% de HP que le falte a Goku.',
    },
    {
      categoria: 'over', nombre: 'Genkidama', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.60, escala: 'dano', cd: 5, ignoraArmadura: 1, criticoSiHpMin: .80,
      desc: 'Causa 160% a todos los enemigos e ignora el 100% de su Armadura. Contra objetivos con 80% o más de su HP máx. siempre es crítico.',
    },
  ],
};

const gokuSuperSayajin = {
  nombre: 'Goku Super Sayajin',
  emoji: '⚡', color: '#facc15', imagen: 'assets/transformaciones/goku-super-sayajin.webp',
  base: { hp: 655, dmg: 90, spd: 94 },
  extra: { critRate: .05, res: .10, pen: .10, armor: .10 },   // armor .10 = bono de "Super Saiyajin"
  pasiva: sangreSayajin,
  transformacion: gokuSuperSayajin3,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kamehameha x10', objetivo: 'enemigo', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.00, escala: 'dano', cd: 0, critExtra: .10,
      desc: 'Causa 100%. +10% de Prob. Crítico en este ataque.',
    },
    {
      categoria: 'especial', nombre: 'Teletransportación', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xfde047,
      pct: 1.50, escala: 'dano', cd: 2,
      desc: '3 golpes de 150% a enemigos al azar (pueden repetirse). Cada golpe crítico le da +5% de Daño Crítico permanente.',
      efectos: [{ cuando: 'critico', accion: { tipo: 'bonoPermanente', stat: 'critDmg', pct: .05, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Super Saiyajin 3', objetivo: 'propio', estilo: 'support', color: 0xfbbf24, cd: 3,
      desc: 'Transformación permanente en Goku Super Sayajin 3. Su bono de Armadura pasa a +20%.',
      efectos: [{ cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } }],
    },
  ],
};

export default {
  id: 'goku',
  nombre: 'Goku',
  rol: 'Daño', rolSecundario: '',
  emoji: '🥋', color: '#f97316', imagen: 'assets/personajes/goku.webp',
  base: { hp: 620, dmg: 85, spd: 92 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: sangreSayajin,
  transformacion: gokuSuperSayajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de Ki', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: .95, escala: 'dano', cd: 0, ignoraArmadura: .10,
      desc: 'Causa 95%. Ignora 10 puntos de la Armadura del enemigo.',
    },
    {
      categoria: 'especial', nombre: 'Kamehameha', objetivo: 'enemigo', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.30, escala: 'dano', cd: 2,
      desc: 'Causa 130% con 40% de probabilidad de aplicar Debilitar (recibe +50% de daño) por 2 rondas.',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Super Saiyajin', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Transformación permanente en Goku Super Sayajin. Goku gana +10% de Armadura.',
      efectos: [{ cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } }],
    },
  ],
};
