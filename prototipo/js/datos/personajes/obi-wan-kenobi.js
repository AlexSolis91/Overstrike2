import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-10, kit del usuario). Obi-Wan Kenobi, Maestro del Soresu (Star Wars). Tanque · Control:
// Contraataque y Provocación permanentes; cada golpe que recibe le da Soresu (+Armadura y +Bloqueo). Su Especial escuda
// al equipo y le sube el HP máx. según sus cargas; su Over las consume (Mega Aturdimiento por cada 5).
// General de la Legión 212: tiene habilidad de líder. Todos sus ataques escalan por HP. Enemigo jurado: Anakin.
// Sim 2026-11-10: 70.6% vs azar; 76.0% como líder. El usuario aprobó publicarlo así (no ajustar sin preguntar).
const BONO_SORESU = { efecto: 'soresu', bonos: { armor: .02, block: .01 } };
const MEGA_AL_AZAR = { tipo: 'efecto', id: 'stun', mega: true, a: { enemigoAzarSinMega: 'stun' } };

export default {
  id: 'obi-wan-kenobi',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Obi-Wan Kenobi',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🛡️', color: '#38bdf8', imagen: 'assets/personajes/obi-wan-kenobi.webp',
  base: { hp: 800, dmg: 50, spd: 94 },
  extra: { armor: .15, block: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'General Kenobi',
    desc: 'Los aliados reciben −15% de daño de golpes. Cada vez que Obi-Wan bloquea un ataque, baja 2 turnos el cooldown de un movimiento al azar de cada aliado.',
    reduccion: { categoria: 'golpe', pct: .15 },
    alBloquear: { tipo: 'reducirCooldown', cantidad: 2, azar: true, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Maestría Soresu',
    desc: 'Contraataque y Provocación permanentes. Cada golpe enemigo que recibe le da 1 carga de Soresu (máx. 10); cada carga da +2% de Armadura y +1 de Bloqueo. Hace +20% de daño a Anakin Skywalker (y a Lord Vader).',
    efectosPermanentes: ['counter', 'taunt'],
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'ganarCargas', efecto: 'soresu', cantidad: 1, max: 10, a: 'propio' },
    bonoPorCarga: BONO_SORESU,
    enemigoJurado: { id: 'anakin-skywalker', bono: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Desvío Soresu', objetivo: 'enemigo', estilo: 'melee', color: 0x38bdf8,
      pct: .90, escala: 'hp', cd: 0,
      desc: 'Causa 90% (escala por HP) a un enemigo con 40% de probabilidad de aplicar Agotar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'agotar', dur: 2, prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Forma III: Defensa Inquebrantable', objetivo: 'todosAliados', estilo: 'support', color: 0x7dd3fc,
      cd: 4,
      desc: 'Da a todos sus aliados un Escudo del 50% del HP máx. de Obi-Wan (2 rondas) y les sube +2% de HP máx. por cada carga de Soresu, para toda la partida. No gasta las cargas.',
      efectos: [
        { accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2 } },
        { accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .02, por: 'cargasPropias', efecto: 'soresu' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Tengo el Terreno Elevado', objetivo: 'enemigo', estilo: 'melee', color: 0x0ea5e9,
      pct: 1.50, escala: 'hp', cd: 5, consumeCargas: { pct: .20, efecto: 'soresu' },
      desc: 'Causa 150% (escala por HP) a un enemigo y consume todas sus cargas de Soresu (y su bono): +20% de daño por carga. Por cada 5 cargas consumidas, aplica Mega Aturdimiento a un enemigo al azar que no lo tenga.',
      efectos: [
        { cuando: 'final', condicion: { cargasConsumidasMin: 5 }, accion: MEGA_AL_AZAR },
        { cuando: 'final', condicion: { cargasConsumidasMin: 10 }, accion: MEGA_AL_AZAR },
      ],
    },
  ],
};
