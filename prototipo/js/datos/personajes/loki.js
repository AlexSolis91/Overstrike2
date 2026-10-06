import { espacios } from '../reliquias.js';

// Ficha oficial #16 (diseñada el 2026-10-06). Loki, Dios del Engaño. Basado en Pelops el Vencedor (Raid): tanque que
// envenena y confunde a quien lo ataca, roba buffs a los envenenados y con su Over protege a su equipo con Espejismos
// (reflejan daño), Furia y Provocación. Usurpó el trono de Asgard: tiene habilidad de líder.
export default {
  id: 'loki',
  nombre: 'Loki',
  rol: 'Tanque', rolSecundario: 'Control',
  emoji: '🐍', color: '#16a34a', imagen: 'assets/personajes/loki.webp',
  base: { hp: 760, dmg: 50, spd: 92 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey Usurpador',
    desc: 'Todos los aliados ganan +20% de Resistencia.',
    bonoStat: { res: .20 },
  },
  pasiva: {
    nombre: 'Maestro de Engaños',
    desc: 'Inmune a Veneno y Aturdimiento. Cada vez que un enemigo lo ataca (una vez por movimiento): 60% de probabilidad de envenenar al atacante y 20% de confundirlo (1 ronda). Además, mientras Loki viva y no tenga Desgaste, todo su equipo recibe −10% de daño (efecto de Abundancia del Usurpador).',
    inmuneA: ['poison', 'stun'],
    gatillo: 'alSerAtacado',
    accion: { tipo: 'multiple', a: 'atacante', acciones: [
      { tipo: 'efecto', id: 'poison', prob: .60 },
      { tipo: 'efecto', id: 'confuse', dur: 1, prob: .20 },
    ] },
    reduccionAliados: { pct: .10, salvoSi: 'wear' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Daga del Embaucador', objetivo: 'enemigo', estilo: 'melee', color: 0x22c55e,
      pct: .90, escala: 'hp', cd: 0,
      desc: 'Causa 90% (escala por HP) con 30% de probabilidad de aplicar Miedo (2 rondas). Contra enemigos envenenados el Miedo no se puede resistir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .30, irresistibleSi: 'poison' } }],
    },
    {
      categoria: 'especial', nombre: 'Truco de la Serpiente', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 1.40, escala: 'hp', cd: 3,
      desc: 'Causa 140% (escala por HP), +10% por cada Veneno del objetivo (máx. +50%). Si el objetivo está envenenado, le roba 1 buff al azar y tiene 40% de probabilidad de Aturdirlo.',
      bonoPorAcumulacion: { efecto: 'poison', pct: .10, max: 5 },
      efectos: [
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'robarBuffs', cantidad: 1 } },
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Abundancia del Usurpador', objetivo: 'propio', estilo: 'support', color: 0x67e8f9,
      cd: 5,
      desc: 'Todos los aliados ganan Espejismo (2 rondas: devuelven el 30% del daño de cada golpe recibido) y Furia (1 ronda). Loki gana Provocación (2 rondas). Efecto pasivo: mientras Loki viva y no tenga Desgaste, su equipo recibe −10% de daño.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
  ],
};
