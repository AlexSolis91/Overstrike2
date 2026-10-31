import { espacios } from '../reliquias.js';

// Ficha oficial #19 (revisada el 2026-10-07). Soporte de escudos: convierte el daño que recibe en escudos para el
// más herido, escuda a todo el equipo y crece en HP; su Over roba los buffs enemigos y frena sus Overs.
// Líder: Dios Emperador Doom.
export default {
  id: 'doctor-doom',
  franquicia: 'Marvel', grupos: ['reyes'],   // campaña: temas de las etapas
  nombre: 'Doctor Doom',
  rol: 'Support', rolSecundario: 'Tanque',
  sobres: ['phantom'],
  emoji: '🛡️', color: '#22c55e', imagen: 'assets/personajes/doctor-doom.webp?v=2',
  base: { hp: 650, dmg: 52, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Dios Emperador Doom',
    desc: 'Todos los aliados tienen +10% de HP máx., y los que tengan Escudo hacen +15% de daño.',
    bonoStat: { hpPct: .10 },
    bonoDanoConEscudo: .15,
  },
  pasiva: {
    nombre: 'Soberano de Latveria',
    desc: 'Hasta 2 veces por ronda: cuando Doctor Doom recibe daño de un golpe, el aliado más herido (puede ser él) gana un Escudo del 25% del HP máx. de Doctor Doom (1 ronda).',
    gatillo: 'alRecibirGolpe', maxPorRonda: 2,
    accion: { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fervor Místico', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: .95, escala: 'hp', cd: 0,
      desc: 'Causa 95% (escala por HP) más el 10% del Escudo actual de Doctor Doom (no lo gasta).',
      bonoPorEscudoPropio: .10,
    },
    {
      categoria: 'especial', nombre: 'Protocolo Doombot', objetivo: 'propio', estilo: 'support', color: 0x86efac,
      cd: 2,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Doctor Doom (1 ronda). Doctor Doom gana +10% de HP máx. permanente (hasta +50%).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .10, tope: .50, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Voluntad de Hierro', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.4, escala: 'hp', cd: 4,
      desc: 'Causa 140% (escala por HP) a todos los enemigos. Les quita todos sus buffs y se los da al aliado de Doom en la misma posición (o a uno al azar si cayó). 60% de probabilidad, por enemigo, de poner su Over en cooldown completo.',
      efectos: [
        { accion: { tipo: 'transferirBuffs' } },
        { accion: { tipo: 'activarCooldown', categoria: 'over', prob: .60 } },
      ],
    },
  ],
};
