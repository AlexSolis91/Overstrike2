import { espacios } from '../reliquias.js';

// Ficha oficial #13 (diseñada el 2026-10-05). Aldebarán de Tauro, Caballero Dorado: aguanta golpes con los brazos
// cruzados (postura del Gran Cuerno), acumula Furia Dorada y la descarga en el Gran Cuerno. Todo escala por HP.
// Sin habilidad de líder: en su historia no es líder (los Dorados responden al Patriarca).
export default {
  id: 'aldebaran',
  nombre: 'Aldebarán',
  rol: 'Tanque', rolSecundario: 'Daño',
  emoji: '🐂', color: '#eab308', imagen: 'assets/personajes/aldebaran.webp',
  base: { hp: 810, dmg: 45, spd: 70 },
  extra: { armor: .15 },                              // su armadura dorada
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Postura del Gran Cuerno',
    desc: 'Pelea con los brazos cruzados: recibe −15% de daño de golpes y cada golpe que recibe le da 1 carga de Furia Dorada (máx. 5). Con Control activo no gana cargas.',
    reduccionPropia: { categoria: 'golpe', pct: .15 },
    cargasAlRecibirGolpe: { max: 5 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Embestida del Toro', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: .90, escala: 'hp', cd: 0,
      desc: 'Causa 90% (escala por HP) y Aldebarán gana un Escudo del 6% de su HP máx.',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: .06, escala: 'hpMax', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Gran Cuerno', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 1.60, escala: 'hp', cd: 3,
      desc: 'Causa 160% (escala por HP). Consume todas sus cargas de Furia Dorada: +15% de daño por carga (máx. +75%). Si consumió 3 o más, tiene 40% de probabilidad de Aturdir.',
      consumeCargas: { pct: .15 },
      efectos: [{ condicion: { cargasConsumidasMin: 3 }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Orgullo del Toro Dorado', objetivo: 'propio', estilo: 'support', color: 0xeab308,
      cd: 5,
      desc: 'Gana Provocación (2 rondas) y un Escudo del 20% de su HP máx. Mientras dure esa Provocación, cada golpe le da 2 cargas. Al terminar, lanza automáticamente un Gran Cuerno contra el último enemigo que lo golpeó.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .20, escala: 'hpMax', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, cargasX: 2, a: 'propio',
          alTerminar: { tipo: 'usarMovimiento', categoria: 'especial', a: 'ultimoAtacante' } } },
      ],
    },
  ],
};
