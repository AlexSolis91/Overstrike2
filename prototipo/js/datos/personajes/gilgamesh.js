import { espacios } from '../reliquias.js';

// Ficha oficial #32 (2026-10-09). El Rey de los Héroes: empieza Arrogante (−10% de daño y Enuma Elish sellado) hasta que el
// enemigo se gana su respeto (HP < 60%, muere un aliado o recibe un crítico). Entonces va en serio: +25% de Daño permanente,
// Enuma Elish listo al instante y 1 turno extra. Gate of Babylon dispara tesoros con efectos al azar; Enkidu encadena; Enuma Elish destruye Escudos.
export default {
  id: 'gilgamesh',
  nombre: 'Gilgamesh',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['sacred'],
  emoji: '👑', color: '#eab308', imagen: 'assets/personajes/gilgamesh.webp',
  base: { hp: 690, dmg: 92, spd: 93 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Tesoro del Rey',
    desc: 'Los aliados ganan +10% de Daño. Cada vez que muere un enemigo, todos los aliados ganan +5% de Daño Crítico permanente (hasta +25%).',
    bonoDano: .10,
    alMorirEnemigo: { tipo: 'bonoPermanente', stat: 'critDmg', pct: .05, tope: .25, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Arrogancia del Rey',
    desc: 'Empieza Arrogante: hace −10% de daño y su Over (Enuma Elish) está sellado. Se vuelve Serio para siempre en cuanto su HP baja de 60%, muere un aliado o recibe un golpe crítico: gana +25% de Daño permanente, Enuma Elish queda listo al instante y gana 1 turno extra.',
    sello: {
      nombre: 'Arrogancia', icono: '👑', categoria: 'over', dano: -.10,
      desc: 'hace −10% de daño y Enuma Elish está sellado. Va en serio si su HP baja de 60%, muere un aliado o recibe un crítico.',
      romper: { hpMenor: .60, muereAliado: true, recibeCritico: true },
      textoRomper: '👑 ¡Ahora va en serio!',
      alRomper: { tipo: 'multiple', a: 'propio', acciones: [
        { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .25 },
        { tipo: 'turnoExtra' },
      ] },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Gate of Babylon', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xfacc15,
      pct: .40, escala: 'dano', cd: 0,
      desc: 'Abre los portales de su tesoro: 3 proyectiles de 40% a enemigos al azar. Cada uno tiene 30% de probabilidad de aplicar un efecto al azar: Sangrado, Quemadura 5% (2 rondas), Veneno, Debilitar (2 rondas) o Desgaste.',
      efectos: [{ accion: { tipo: 'efecto', idAzar: ['bleed', 'burn', 'poison', 'weaken', 'wear'], valor: .05, dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Enkidu, Cadenas del Cielo', objetivo: 'enemigo', estilo: 'ranged', color: 0xe5e7eb,
      pct: 1.00, escala: 'dano', cd: 3,
      desc: 'Causa 100% y lo encadena: 60% de probabilidad de Aturdirlo. Si Gilgamesh ya va en serio, es Mega Aturdimiento (pierde 2 turnos).',
      efectos: [
        { condicion: { sellado: true }, accion: { tipo: 'efecto', id: 'stun', prob: .60 } },
        { condicion: { sellado: false }, accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .60 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Enuma Elish', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xdc2626,
      pct: 2.60, escala: 'dano', cd: 4, rompeEscudo: true, ignoraArmadura: 1,
      desc: 'La Espada de la Ruptura: antes de golpear destruye todo el Escudo de cada enemigo; luego causa 260% a todos e ignora su Armadura. Sellado hasta que Gilgamesh va en serio.',
    },
  ],
};
