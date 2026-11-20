import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-19, kit del usuario). Goku Black (Dragon Ball Super): Zamasu en el cuerpo robado de Goku, el
// "dios" que quiere borrar a los mortales. Corta con su Espada de Ki, siembra Bombas con su Lazo Divino y con la Guadaña
// Divina castiga a quien se interpone (Provocación) y anula las transformaciones. Sin habilidad de líder.
const LAZO_DIVINO = {
  categoria: 'especial', nombre: 'Lazo Divino', objetivo: 'azar', golpes: 5, entre: 3, estilo: 'ranged', color: 0xf472b6,
  pct: .40, escala: 'dano', cd: 3,
  desc: '5 golpes de 40% repartidos al azar entre hasta 3 enemigos, cada uno con 45% de probabilidad de Bomba. Si el último golpe es crítico, hace estallar las Bombas que puso este ataque con el doble de daño.',
  efectos: [
    { accion: { tipo: 'efecto', id: 'bomb', prob: .45 } },
    { cuando: 'final', condicion: { ultimoGolpeCritico: true }, accion: { tipo: 'detonar', a: 'todosEnemigos', soloDelMovimiento: true, factor: 2 } },
  ],
};

export default {
  id: 'goku-black',
  franquicia: 'Dragon Ball', grupos: ['villanos'],   // campaña: temas de las etapas
  nombre: 'Goku Black',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '🌹', color: '#ec4899', imagen: 'assets/personajes/goku-black.webp',
  base: { hp: 650, dmg: 80, spd: 116 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Deidad Entre Mortales',
    desc: 'Cada vez que recibe daño (de cualquier tipo) tiene 5% de probabilidad de poner sus cooldowns en 0 y ganar un turno adicional. Por cada 10% de HP que le falte, las Bombas que coloca hacen +10% de daño (se fija al colocarlas).',
    gatillo: 'alRecibirDano', prob: .05,
    accion: { tipo: 'multiple', a: 'propio', acciones: [{ tipo: 'reiniciarCooldowns' }, { tipo: 'turnoExtra' }] },
    bombasPorHpFaltante: { cada: .10, pct: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada de Ki', objetivo: 'enemigo', estilo: 'melee', color: 0xf9a8d4,
      pct: 1.15, escala: 'dano', cd: 0,
      desc: 'Causa 115% a un enemigo con 35% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .35 } }],
    },
    LAZO_DIVINO,
    {
      categoria: 'over', nombre: 'Guadaña Divina', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xdb2777,
      pct: .75, escala: 'dano', cd: 5,
      desc: 'Causa 75% a todos los enemigos. A los que tengan Provocación o Mega Provocación les pone 2 Bombas y Sangrado (seguros). A los que estén transformados los devuelve a su forma original. Si algún enemigo golpeado ya tenía Bomba o Sangrado, Black ejecuta Lazo Divino al final (sin activar su cooldown).',
      efectos: [
        { condicion: { objetivoTeniaAntes: ['taunt', 'megaTaunt'] }, accion: { tipo: 'efecto', id: 'bomb', veces: 2, irresistible: true } },
        { condicion: { objetivoTeniaAntes: ['taunt', 'megaTaunt'] }, accion: { tipo: 'efecto', id: 'bleed', irresistible: true } },
        { accion: { tipo: 'quitarTransformacion' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: ['bomb', 'bleed'] }, accion: { tipo: 'usarMovimiento', categoria: 'especial', a: 'propio' } },
      ],
    },
  ],
};
