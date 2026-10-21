import { espacios } from '../reliquias.js';

// Ficha oficial #33 (2026-10-11). Ozymandias (Ramsés II), Rey de Reyes: pelea desde su Templo. El Over levanta el
// Ramesseum Tentyris (zona de 3 rondas): su equipo hace más daño y resiste más, la Luz de Dendera barre a los enemigos al
// inicio de cada ronda y el Faraón no puede caer mientras el Templo siga en pie. El Over está listo desde el inicio. Privilegio Imperial: un buff al azar cada turno.
export default {
  id: 'ozymandias',
  franquicia: 'Fate', grupos: ['reyes', 'servants'],   // campaña: temas de las etapas
  nombre: 'Ozymandias',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: ['sacred'],
  emoji: '🏛️', color: '#2563eb', imagen: 'assets/personajes/ozymandias.webp',
  base: { hp: 650, dmg: 60, spd: 80 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Carisma del Faraón',
    desc: 'Los aliados ganan +10% de Prob. Crítico y +15% de Daño Crítico.',
    bonoStat: { critRate: .10, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Privilegio Imperial',
    desc: 'Inmune a Miedo. Al inicio de cada uno de sus turnos gana un buff al azar que no tenga (1 ronda): Furia, Protección, Regeneración, Agudeza o Celeridad.',
    inmuneA: ['fear'],
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'efecto', idAzar: ['dmgUp', 'protect', 'regen', 'keen', 'haste'], sinRepetir: true, dur: 1, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Luz de Dendera', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde68a,
      pct: .55, escala: 'dano', cd: 0,
      desc: 'El rayo de la Gran Bombilla de Dendera: causa 55% con 30% de probabilidad de aplicar Ceguera (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'blind', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Esfinge Wehem-Mesut', objetivo: 'enemigo', estilo: 'melee', color: 0xeab308,
      pct: .45, escala: 'dano', cd: 3,
      desc: 'Causa 45% e invoca una Esfinge Wehem-Mesut (2 turnos): golpea 50% al enemigo más fuerte y da Protección al aliado más herido.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocar', key: 'esfingeWehemMesut', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Ramesseum Tentyris', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .60, escala: 'dano', cd: 5, cdInicial: 0,
      desc: 'Listo desde el inicio de la partida. Levanta el Gran Templo Resplandeciente (3 rondas) y causa 60% a todos los enemigos. Mientras el Templo siga en pie: todo su equipo hace +15% de daño y tiene +15% de Resistencia, al inicio de cada ronda la Luz de Dendera golpea 40% a todos los enemigos, y Ozymandias no puede caer (no baja de 1 HP).',
      efectos: [{ cuando: 'final', accion: { tipo: 'zona', dur: 3, a: 'propio', zona: {
        nombre: 'Ramesseum Tentyris', icono: '🏛️',
        desc: 'su equipo +15% Daño y +15% Resistencia; Luz de Dendera (40% a todos) al inicio de cada ronda; Ozymandias no puede caer',
        bono: { dmgPct: .15, res: .15 },
        alIniciarRonda: { tipo: 'golpeDirecto', nombre: 'Luz de Dendera', pct: .40, color: 0xfde68a, a: 'todosEnemigos' },
        inmortal: true, textoInmortal: '🏛️ ¡El Faraón no cae!',
      } } }],
    },
  ],
};
