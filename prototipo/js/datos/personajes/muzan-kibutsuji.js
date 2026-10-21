import { espacios } from '../reliquias.js';

// Ficha oficial #57 (2026-10-19, DoTer de Veneno / Support regenerador; Infectar pedido en la ficha, el resto "a tu
// criterio"). Muzan Kibutsuji, el Rey de los Demonios (Kimetsu no Yaiba): su sangre convierte y envenena a quien la toca
// (Infectar permanente) y regenera a sus Lunas Demoníacas. Cuando lo llevan al borde de la muerte despierta su Forma
// Final. Habilidad de líder: comanda a las Doce Lunas Demoníacas.

const muzanFormaFinal = {
  nombre: 'Muzan, Forma Final',
  emoji: '🩸', color: '#be123c', imagen: 'assets/transformaciones/muzan-forma-final.webp',
  base: { hp: 690, dmg: 57, spd: 83 },
  extra: {},
  pasiva: {
    nombre: 'Cuerpo del Rey Demonio',
    desc: 'Conserva Infectar. Al inicio de cada ronda se cura 5% de su HP máx. por cada enemigo envenenado (regenera con la sangre de sus víctimas).',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'curar', pct: .05, base: 'hpMaxObjetivo', porEnemigoCon: 'poison', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Brazos Óseos', objetivo: 'azar', estilo: 'melee', color: 0xbe123c,
      pct: .25, escala: 'dano', cd: 0, golpes: 3,
      desc: '3 latigazos de 25% a enemigos al azar, cada uno con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Mar de Sangre', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x9f1239,
      pct: .50, escala: 'dano', cd: 3,
      desc: '50% a todos los enemigos con 55% de probabilidad de Veneno. Todos los aliados se curan 7% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .55 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .07, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Mil Látigos del Rey Demonio', objetivo: 'azar', estilo: 'melee', color: 0xf43f5e,
      pct: .25, escala: 'dano', cd: 5, golpes: 6,
      desc: '6 latigazos de 25% a enemigos al azar, cada uno con 45% de probabilidad de Veneno. Todos los aliados ganan Regeneración (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'regen', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};

export default {
  id: 'muzan-kibutsuji',
  franquicia: 'Kimetsu no Yaiba', grupos: ['demonios', 'villanos'],
  nombre: 'Muzan Kibutsuji',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🎩', color: '#881337', imagen: 'assets/personajes/muzan-kibutsuji.webp',
  base: { hp: 550, dmg: 45, spd: 81 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Demonios',
    desc: 'Todos los aliados tienen +8% de HP máx. y +10% de Daño DoT.',
    bonoStat: { hpPct: .08, dot: .10 },
  },
  pasiva: {
    nombre: 'Sangre de Muzan',
    desc: 'Tiene Infectar permanente: quien lo golpee recibe Veneno sin tirada. La primera vez que va a caer queda con 15% de HP y despierta para siempre su Forma Final.',
    efectosPermanentes: ['infect'],
    ultimoAliento: { hp: .15, transformar: true },
  },
  transformacion: muzanFormaFinal,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Látigo de Carne', objetivo: 'enemigo', estilo: 'ranged', color: 0x9f1239,
      pct: .60, escala: 'dano', cd: 0,
      desc: 'Causa 60% con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Sangre del Rey Demonio', objetivo: 'todosAliados', estilo: 'support', color: 0xe11d48, cd: 3,
      desc: 'Comparte su sangre con los suyos: todos los aliados se curan 7% de su HP máx. y ganan Regeneración (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .07, base: 'hpMaxObjetivo', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'regen', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Látigos de Sangre', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf43f5e,
      pct: .60, escala: 'dano', cd: 5,
      desc: 'Látigos que salen de todo su cuerpo: 60% a todos los enemigos con 60% de probabilidad de Veneno. Todos los aliados se curan 6% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .06, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
  ],
};
