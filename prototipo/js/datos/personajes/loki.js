import { espacios } from '../reliquias.js';

// Ficha oficial #16 (diseñada el 2026-10-06). Loki, Dios del Engaño. Basado en Pelops el Vencedor (Raid): tanque que
// envenena y confunde a quien lo ataca, roba todos los buffs a los envenenados y con su Over protege a su equipo con
// Escudo, Furia y Espejismo (como el Escudo de Magma de Pelops) mientras él atrae los golpes con Provocación. Usurpó el trono de Asgard: tiene habilidad de líder.
export default {
  id: 'loki',
  franquicia: 'Marvel', grupos: ['asgard', 'dioses'],   // campaña: temas de las etapas
  nombre: 'Loki',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom', 'sacred', 'toxic'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐍', color: '#16a34a', imagen: 'assets/personajes/loki.webp',
  base: { hp: 780, dmg: 50, spd: 91 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey Usurpador',
    desc: 'Todos los aliados ganan +20% de Resistencia.',
    bonoStat: { res: .20 },
  },
  pasiva: {
    nombre: 'Maestro de Engaños',
    desc: 'Inmune a Veneno, Aturdimiento y Confusión. Cada vez que un enemigo lo ataca (una vez por movimiento): 100% de probabilidad de envenenar al atacante y 50% de confundirlo (1 ronda); con Desgaste, 50% y 25%. Además, mientras Loki viva y no tenga Desgaste, todo su equipo recibe −20% de daño (efecto de Glorioso Propósito).',
    inmuneA: ['poison', 'stun', 'confuse'],
    gatillo: 'alSerAtacado',
    accion: { tipo: 'multiple', a: 'atacante', acciones: [
      { tipo: 'efecto', id: 'poison', probSiPropioTiene: { efecto: 'wear', factor: .5 } },
      { tipo: 'efecto', id: 'confuse', dur: 1, prob: .50, probSiPropioTiene: { efecto: 'wear', factor: .5 } },
    ] },
    reduccionAliados: { pct: .20, salvoSi: 'wear' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Daga del Embaucador', objetivo: 'enemigo', estilo: 'melee', color: 0x22c55e,
      pct: 1.25, escala: 'hp', cd: 0,
      desc: 'Causa 125% (escala por HP) con 50% de probabilidad de aplicar Miedo (2 rondas). Contra enemigos envenenados el Miedo no se puede resistir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50, irresistibleSi: 'poison' } }],
    },
    {
      categoria: 'especial', nombre: 'Truco de la Serpiente', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 1.95, escala: 'hp', cd: 3,
      desc: 'Causa 195% (escala por HP), +10% por cada ronda restante de debuffs en Loki y en el objetivo (máx. +100%). Aplica Mega Aturdimiento (2 turnos). Si el objetivo está envenenado, ignora 25 puntos de Armadura, le roba todos sus buffs y el Mega Aturdimiento no se puede resistir.',
      bonoPorDuracionDebuffs: { pct: .10, max: 1 },
      ignoraArmaduraSi: { efecto: 'poison', puntos: .25 },
      efectos: [
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'robarBuffs', cantidad: 99 } },
        { accion: { tipo: 'efecto', id: 'stun', mega: true, irresistibleSi: 'poison' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Glorioso Propósito', objetivo: 'propio', estilo: 'support', color: 0x67e8f9,
      cd: 5,
      desc: 'Todos los aliados ganan Furia, Espejismo (devuelve el 30% del daño de cada golpe recibido) y un Escudo del 50% del HP máx. de Loki (2 rondas). Loki gana Provocación (2 rondas). Efecto pasivo: mientras Loki viva y no tenga Desgaste, su equipo recibe −20% de daño.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
  ],
};
