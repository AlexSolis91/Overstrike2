import { espacios } from '../reliquias.js';

// Ficha oficial #31 (2026-10-09). Líder de Akatsuki: cada turno pelea con uno de sus Seis Caminos (ciclo fijo, empieza en Deva).
// Bansho Ten'in atrae a cualquiera (ignora Provocación y Sigilo); Shinra Tensei repele a todos pero lo deja Expuesto
// (el intervalo de 5 segundos); en el Over los seis cuerpos atacan a la vez, cada golpe con un Camino distinto.
// Camino Animal: invoca 1 de sus 6 criaturas al azar (ver invocaciones.js, tabla animalesPain).
export default {
  id: 'pain',
  nombre: 'Pain',
  rol: 'Daño', rolSecundario: 'Invoker',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  emoji: '🌀', color: '#7c3aed', imagen: 'assets/personajes/pain.webp',
  base: { hp: 740, dmg: 92, spd: 96 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Conocer el Dolor',
    desc: 'Cada vez que un aliado recibe un golpe crítico de un enemigo (y sobrevive), gana +5% de Daño permanente (hasta +25%).',
    alRecibirCritico: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .05, tope: .25, a: 'objetivo' },
  },
  pasiva: {
    nombre: 'Los Seis Caminos del Dolor',
    desc: 'Al inicio de cada uno de sus turnos activa el siguiente Camino, siempre en este orden: Deva → Asura → Humano → Animal → Preta → Naraka → Deva… (empieza en Deva). Deva: gana Espejismo (1 ronda). Asura: sus golpes hacen +30% de daño. Humano: al terminar su movimiento le roba 1 buff al objetivo. Animal: invoca 1 criatura al azar. Preta: al terminar su movimiento le roba 5% del HP máx. al objetivo. Naraka: se cura 10% de su HP máx. y se limpia 1 debuff. En movimientos de área, Humano y Preta van a un enemigo golpeado al azar.',
    ciclo: {
      efecto: 'camino',
      fases: [
        { id: 'deva', nombre: 'Camino Deva', icono: '☀️', desc: 'gana Espejismo (1 ronda).',
          alIniciar: { tipo: 'efecto', id: 'mirror', dur: 1, a: 'propio' } },
        { id: 'asura', nombre: 'Camino Asura', icono: '🚀', desc: 'sus golpes hacen +30% de daño.', bonoDano: .30 },
        { id: 'humano', nombre: 'Camino Humano', icono: '👤', desc: 'al terminar su movimiento le roba 1 buff al objetivo.',
          alFinal: { tipo: 'robarBuffs', cantidad: 1 } },
        { id: 'animal', nombre: 'Camino Animal', icono: '🐾', desc: 'invoca 1 criatura al azar.',
          alIniciar: { tipo: 'invocarAzar', tabla: 'animalesPain', a: 'propio' } },
        { id: 'preta', nombre: 'Camino Preta', icono: '🌀', desc: 'al terminar su movimiento le roba 5% del HP máx. al objetivo.',
          alFinal: { tipo: 'robarHP', pct: .05 } },
        { id: 'naraka', nombre: 'Camino Naraka', icono: '👹', desc: 'se cura 10% de su HP máx. y se limpia 1 debuff.',
          alIniciar: { tipo: 'multiple', a: 'propio', acciones: [
            { tipo: 'curar', pct: .10, escala: 'hpMax' },
            { tipo: 'limpiar', cantidad: 1 },
          ] } },
      ],
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: "Bansho Ten'in", objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.00, escala: 'dano', cd: 0, ignoraProvocacion: true,
      desc: 'Atrae a cualquier enemigo y le causa 100%. Puede elegir a cualquiera: ignora Provocación y Sigilo.',
    },
    {
      categoria: 'especial', nombre: 'Shinra Tensei', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xc4b5fd,
      pct: 1.10, escala: 'dano', cd: 3,
      desc: 'Repele a todos: causa 110% a todos los enemigos y les disipa 1 buff a cada uno. Intervalo de 5 segundos: Pain queda Expuesto (recibe +25% de daño) por 1 ronda.',
      efectos: [
        { accion: { tipo: 'disipar', cantidad: 1 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'expuesto', dur: 1, irresistible: true, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Seis Caminos del Dolor', objetivo: 'azar', golpes: 6, estilo: 'ranged', color: 0x7c3aed,
      pct: .65, escala: 'dano', cd: 5, recorreCiclo: true,
      desc: 'Los seis cuerpos atacan a la vez: 6 golpes de 65% a enemigos al azar. Cada golpe lleva el efecto de un Camino distinto, en orden (Deva, Asura, Humano, Animal, Preta, Naraka). No cambia su Camino activo.',
    },
  ],
};
