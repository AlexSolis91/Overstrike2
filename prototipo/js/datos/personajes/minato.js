import { espacios } from '../reliquias.js';

// Ficha oficial #34 (2026-10-11). Minato Namikaze, el Destello Amarillo / Cuarto Hokage. Marca a los enemigos con el sello del
// Dios del Trueno Volador (Marca Hiraishin: es una marca, no un debuff) y se teletransporta hacia ellos: al golpear a un marcado
// consume la marca y gana un turno extra (hasta 2 por ronda) y Velocidad. 25% de Bloqueo (esquiva teletransportándose). Las marcas puestas en un movimiento no se consumen en ese mismo.
export default {
  id: 'minato',
  nombre: 'Minato Namikaze',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '⚡', color: '#facc15', imagen: 'assets/personajes/minato.webp',
  base: { hp: 700, dmg: 94, spd: 110 },
  extra: { block: .25 },   // Hiraishin: se teletransporta fuera del golpe (25% de Bloqueo)
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Cuarto Hokage',
    desc: 'Al inicio de cada ronda, el aliado más lento gana Celeridad (+30% de Velocidad) por 1 ronda.',
    alIniciarRonda: { tipo: 'efecto', id: 'haste', dur: 1, a: 'aliadoMasLento' },
  },
  pasiva: {
    nombre: 'Destello Amarillo de Konoha',
    desc: 'Se teletransporta fuera de los golpes: 25% de Bloqueo. Cada vez que golpea a un enemigo con su Marca Hiraishin (puesta en un movimiento anterior), la consume: gana 1 turno extra (hasta 2 por ronda) y +5% de Velocidad permanente (hasta +25%).',
    consumeMarca: {
      marca: 'hiraishin', turnoExtra: true, maxPorRonda: 2, texto: 'Hiraishin',
      alConsumir: { tipo: 'bonoPermanente', stat: 'spdPct', pct: .05, tope: .25, a: 'propio' },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kunai Hiraishin', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0xfacc15,
      pct: .45, escala: 'dano', cd: 0,
      desc: 'Lanza 2 kunai de 45% a enemigos al azar. Cada uno tiene 60% de probabilidad de dejar una Marca Hiraishin (3 rondas).',
      efectos: [{ accion: { tipo: 'marcar', marca: 'hiraishin', dur: 3, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Rasengan', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: 2.00, escala: 'dano', cd: 2, criticoSiObjetivoTiene: 'hiraishin',
      desc: 'Causa 200%. Si el objetivo tiene Marca Hiraishin, Minato aparece a su espalda: crítico seguro.',
    },
    {
      categoria: 'over', nombre: 'Dios del Trueno Volador: Nivel 2', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde047,
      pct: 1.00, escala: 'dano', cd: 5, cdInicial: 0,
      desc: 'Listo desde el inicio de la partida. Golpea 100% a todos los enemigos y luego les deja a todos una Marca Hiraishin (3 rondas), sin tirada.',
      efectos: [{ cuando: 'final', accion: { tipo: 'marcar', marca: 'hiraishin', dur: 3, a: 'todosEnemigos' } }],
    },
  ],
};
