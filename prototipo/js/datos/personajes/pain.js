import { espacios } from '../reliquias.js';

// Ficha oficial #31 (2026-10-09). Líder de Akatsuki: cada turno pelea con uno de sus Seis Caminos (ciclo fijo, empieza en Deva).
// Bansho Ten'in atrae a cualquiera (ignora Provocación y Sigilo); Rinne Tensei revive a un aliado; Shinra Tensei (Over) repele
// a todos y puede dejarlos en Mega Aturdimiento: quien no lo recibe estalla en 30% de su HP máx. repartido entre sus aliados.
// Rediseño 2026-11-21.
// Camino Animal: invoca 1 de sus 6 criaturas al azar (ver invocaciones.js, tabla animalesPain).
export default {
  id: 'pain',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Pain',
  rol: 'Daño', rolSecundario: 'Invoker',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌀', color: '#7c3aed', imagen: 'assets/personajes/pain.webp',
  base: { hp: 700, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Conocer el Dolor',
    desc: 'Al inicio de cada ronda limpia 3 debuffs en total del equipo aliado (al azar entre todos). Por cada debuff limpiado, Pain recupera 10% de su HP máx.',
    alIniciarRonda: { tipo: 'secuencia', acciones: [
      { tipo: 'limpiar', total: 3, a: 'todosAliados' },
      { tipo: 'curar', escala: 'hpMax', pct: .10, porCada: 'limpiados', a: 'propio' },
    ] },
  },
  pasiva: {
    nombre: 'Los Seis Caminos del Dolor',
    desc: 'Al inicio de cada uno de sus turnos activa el siguiente Camino, siempre en este orden: Deva → Asura → Humano → Animal → Preta → Naraka → Deva… (empieza en Deva). Deva: gana Reflejar (2 rondas). Asura: sus golpes hacen +50% de daño. Humano: disipa todos los buffs del equipo enemigo. Animal: invoca 1 criatura al azar. Preta: al terminar su movimiento les quita 5% de HP máx. (para el resto de la partida) a todos los enemigos golpeados; Pain gana todo ese HP como HP máx. y se cura lo mismo (a los jefes no se les baja: reciben ese daño). Naraka: se cura 40% de su HP máx. y se limpia 1 debuff.',
    ciclo: {
      efecto: 'camino',
      fases: [
        { id: 'deva', nombre: 'Camino Deva', icono: '☀️', desc: 'gana Reflejar (2 rondas).',
          alIniciar: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'propio' } },
        { id: 'asura', nombre: 'Camino Asura', icono: '🚀', desc: 'sus golpes hacen +50% de daño.', bonoDano: .50 },
        { id: 'humano', nombre: 'Camino Humano', icono: '👤', desc: 'disipa todos los buffs del equipo enemigo.',
          alIniciar: { tipo: 'disipar', a: 'todosEnemigos' } },
        { id: 'animal', nombre: 'Camino Animal', icono: '🐾', desc: 'invoca 1 criatura al azar.',
          alIniciar: { tipo: 'invocarAzar', tabla: 'animalesPain', a: 'propio' } },
        { id: 'preta', nombre: 'Camino Preta', icono: '🌀', desc: 'al terminar su movimiento les quita 5% de HP máx. a los enemigos golpeados; Pain gana ese HP como HP máx. y se cura lo mismo.',
          alFinal: { tipo: 'robarHpMax', pct: .05 }, alFinalTodos: true },
        { id: 'naraka', nombre: 'Camino Naraka', icono: '👹', desc: 'se cura 40% de su HP máx. y se limpia 1 debuff.',
          alIniciar: { tipo: 'multiple', a: 'propio', acciones: [
            { tipo: 'curar', pct: .40, escala: 'hpMax' },
            { tipo: 'limpiar', cantidad: 1 },
          ] } },
      ],
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: "Bansho Ten'in", objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.2, escala: 'dano', cd: 0, ignoraProvocacion: true,
      desc: 'Atrae a cualquier enemigo y le causa 120%. Puede elegir a cualquiera: ignora Provocación y Sigilo.',
    },
    {
      categoria: 'especial', nombre: 'Rinne Tensei no Jutsu', objetivo: 'propio', estilo: 'support', color: 0xc4b5fd, cd: 4,
      desc: 'Revive a un aliado caído al azar con 50% de HP. Pain se limpia todos sus debuffs y gana Escudo Sagrado.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'reanimar', cantidad: 1, hp: .50, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'limpiar', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'escudoSagrado', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Shinra Tensei', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7c3aed,
      pct: 2.0, escala: 'dano', cd: 6,
      desc: 'Repele a todos: causa 200% a todos los enemigos, con 50% de probabilidad de dejar a cada uno en Mega Aturdimiento. Cada enemigo que no lo reciba provoca un daño igual al 30% de su HP máx., repartido al azar entre todos los enemigos vivos.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .50,
          alFallar: { tipo: 'danoRepartido', base: 'hpMaxObjetivo', pct: .30, a: 'propio' } } },
      ],
    },
  ],
};
