import { espacios } from '../reliquias.js';

// Ficha oficial #19 (revisada el 2026-10-07). Soporte de escudos: convierte el daño que recibe en escudos para el
// más herido, escuda a todo el equipo y crece en HP; su Over roba los buffs enemigos y frena sus Overs.
// Líder: Dios Emperador Doom.
export default {
  id: 'doctor-doom',
  nombre: 'Doctor Doom',
  rol: 'Support', rolSecundario: 'Tanque',
  sobres: ['phantom'],
  emoji: '🛡️', color: '#22c55e', imagen: 'assets/personajes/doctor-doom.webp',
  base: { hp: 650, dmg: 54, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Dios Emperador Doom',
    desc: 'Todos los aliados tienen +15% de HP máx.',
    bonoStat: { hpPct: .15 },
  },
  pasiva: {
    nombre: 'Soberano de Latveria',
    desc: 'Hasta 2 veces por ronda: cuando Doctor Doom recibe daño de un golpe, el aliado más herido (puede ser él) gana un Escudo igual al 60% del daño recibido.',
    gatillo: 'alRecibirGolpe', maxPorRonda: 2,
    accion: { tipo: 'escudo', base: 'recibido', pct: .60, a: 'aliadoMasHerido' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fervor Místico', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 1.00, escala: 'hp', cd: 0,
      desc: 'Causa 100% (escala por HP) más el 30% del Escudo actual de Doctor Doom (no lo gasta).',
      bonoPorEscudoPropio: .30,
    },
    {
      categoria: 'especial', nombre: 'Protocolo Doombot', objetivo: 'propio', estilo: 'support', color: 0x86efac,
      cd: 2,
      desc: 'Todos los aliados ganan un Escudo del 10% del HP máx. de Doctor Doom. Doctor Doom gana +10% de HP máx. permanente (hasta +50%).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .10, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .10, tope: .50, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Voluntad de Hierro', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.50, escala: 'hp', cd: 4,
      desc: 'Causa 150% (escala por HP) a todos los enemigos. Les quita todos sus buffs y se los da al aliado de Doom en la misma posición (o a uno al azar si cayó). 60% de probabilidad, por enemigo, de poner su Over en cooldown completo.',
      efectos: [
        { accion: { tipo: 'transferirBuffs' } },
        { accion: { tipo: 'activarCooldown', categoria: 'over', prob: .60 } },
      ],
    },
  ],
};
