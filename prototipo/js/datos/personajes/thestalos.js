import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-14, kit del usuario). Thestalos, guardián del portal que impide que las dimensiones choquen
// (el mismo guía del tutorial). Tanque · DoTer de Quemadura: Provocación y Asistir permanentes, crece en HP cada vez que lo
// ataca un enemigo quemado, Escudo Sagrado (bloquea 2 golpes) y un Over que crece con cada uso y quema a todo el equipo rival.
// Líder: Protector del Portal. Todos sus ataques escalan por HP.
export default {
  id: 'thestalos',
  franquicia: 'Overstrike', grupos: ['guardianes'],   // campaña: temas de las etapas
  nombre: 'Thestalos',
  rol: 'Tanque', rolSecundario: 'DoTer',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '☀️', color: '#facc15', imagen: 'assets/personajes/thestalos.webp',
  base: { hp: 830, dmg: 50, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Protector del Portal',
    desc: 'Todos los aliados tienen +10% de Daño DoT y +15% de Puntería.',
    bonoStat: { dot: .10, acc: .15 },
  },
  pasiva: {
    nombre: 'Corazones en Llamas',
    desc: 'Tiene Provocación y Asistir permanentes. Cada vez que lo ataca un enemigo con Quemadura, gana +2% de HP máx. permanente por cada enemigo con Quemadura (sin límite).',
    efectosPermanentes: ['taunt', 'assist'],
    gatillo: 'alSerAtacado', filtro: { atacanteTiene: 'burn' },
    accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .02, por: 'quemadurasEnemigas', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Erupción Solar', objetivo: 'enemigo', estilo: 'ranged', color: 0xf97316,
      pct: .80, escala: 'hp', cd: 0,
      desc: 'Causa 80% (escala por HP) con 50% de probabilidad de aplicar Quemadura y 50% de probabilidad de aplicar Quemadura Solar.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'solarBurn', prob: .50 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Magma Strength', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Thestalos gana Escudo Sagrado (bloquea los próximos 2 golpes) y se cura el 50% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'escudoSagrado', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .50, escala: 'hpMax', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Juicio del Astro Rey', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: 2.00, escala: 'hp', cd: 5, bonoPorUso: .20,
      desc: 'Causa 200% (escala por HP) a un enemigo. Si sobrevive, aplica Quemadura a todos los enemigos. Cada uso aumenta 20% el daño de este movimiento (toda la partida).',
      efectos: [
        { cuando: 'final', condicion: { objetivoVivo: true }, accion: { tipo: 'efecto', id: 'burn', a: 'todosEnemigos' } },
      ],
    },
  ],
};
