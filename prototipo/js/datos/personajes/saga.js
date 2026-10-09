import { espacios } from '../reliquias.js';

// Ficha oficial #27 (2026-10-09, ajustada tras la simulación: ~67% de victorias, objetivo 65–75%).
// Control de Confusión y Posesión con doble personalidad: cada mente que manipula le da
// Oscuridad; con 3, su lado malvado (Saga Oscuro) toma el control 4 turnos y luego vuelve. Todo su equipo castiga a los confundidos y poseídos. Las dos formas comparten
// cooldowns. Over: Explosión de Galaxias (empieza y se recarga en 6). Líder: Patriarca del Santuario.

const sagaOscuro = {
  nombre: 'Saga Oscuro',
  emoji: '😈', color: '#7c3aed', imagen: 'assets/transformaciones/saga-oscuro.webp',
  base: { hp: 760, dmg: 110, spd: 100 },
  extra: { acc: .20 },
  compartirCooldowns: true,
  pasiva: {
    nombre: 'El Dios Malvado',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Confusión o Posesión, y los golpes de Saga Oscuro +20% más.',
    auraContra: { efecto: ['confuse', 'possess'], pct: .40 },
    bonoContra: { efecto: ['confuse', 'possess'], pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de Ares', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: 1.20, escala: 'dano', cd: 0,
      desc: 'Causa 120% con 50% de probabilidad de Posesión. Si el objetivo ya estaba Poseído, se convierte en Mega Posesión.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'possess' }, accion: { tipo: 'efecto', id: 'possess', mega: true, prob: .50 } },
        { accion: { tipo: 'efecto', id: 'possess', prob: .50 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Satán Imperial', objetivo: 'enemigo', estilo: 'ranged', color: 0x6d28d9,
      pct: 1.40, escala: 'dano', cd: 3,
      desc: 'Causa 140% y con 80% de probabilidad aplica Mega Posesión: el enemigo ataca a sus aliados durante 2 turnos.',
      efectos: [{ accion: { tipo: 'efecto', id: 'possess', mega: true, prob: .80 } }],
    },
    {
      categoria: 'over', nombre: 'Explosión de Galaxias', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xc084fc,
      pct: 2.40, escala: 'dano', cd: 6,
      bonoContra: { efecto: ['confuse', 'possess'], pct: .30 },
      desc: 'Ataque devastador: 240% a todos los enemigos, +30% contra los que tengan Confusión o Posesión. Cooldown 6 (comparte el de Saga de Géminis).',
    },
  ],
};

export default {
  id: 'saga',
  nombre: 'Saga',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '♊', color: '#d4a017', imagen: 'assets/personajes/saga.webp',
  base: { hp: 720, dmg: 88, spd: 95 },
  extra: { acc: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Patriarca del Santuario',
    desc: 'Todos los aliados tienen +20% de Puntería.',
    bonoStat: { acc: .20 },
  },
  pasiva: {
    nombre: 'Dualidad de Géminis',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Confusión o Posesión. Cada vez que Saga aplica Confusión o Posesión gana 1 de Oscuridad 🌑 (máx. 3). Con 3, su lado malvado toma el control: se transforma en Saga Oscuro por 4 turnos (consume la Oscuridad) y luego vuelve. Se puede repetir.',
    auraContra: { efecto: ['confuse', 'possess'], pct: .40 },
    cargasAlAplicar: { efectos: ['confuse', 'possess'], efecto: 'oscuridad', max: 3 },
    transformarConCargas: { efecto: 'oscuridad', cargas: 3, turnos: 4 },
  },
  transformacion: sagaOscuro,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Ilusorio', objetivo: 'enemigo', estilo: 'melee', color: 0xfde68a,
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110% con 60% de probabilidad de Confusión (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Laberinto de Géminis', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.00, escala: 'dano', cd: 2,
      desc: 'Causa 100% a todos los enemigos con 80% de probabilidad de Confusión (2 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .80 } }],
    },
    {
      categoria: 'over', nombre: 'Explosión de Galaxias', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde047,
      pct: 2.00, escala: 'dano', cd: 6, cdInicial: 6,
      bonoContra: { efecto: ['confuse', 'possess'], pct: .30 },
      desc: 'Ataque devastador: 200% a todos los enemigos, +30% contra los que tengan Confusión o Posesión. Empieza con cooldown 6 y se recarga en 6.',
    },
  ],
};
