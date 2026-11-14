import { espacios } from '../reliquias.js';

// Ficha oficial #19 (revisada el 2026-10-07). Soporte de escudos: convierte el daño que recibe en escudos para el
// más herido, escuda a todo el equipo y crece en HP; su Over roba los buffs enemigos y frena sus Overs.
// Líder: Dios Emperador Doom.
// 2026-11-13 (kit del usuario): escudo por cada golpe (sin límite, 2 rondas), reserva oculta de lo absorbido por los Escudos
// del equipo que libera Castigo del Dios Emperador, Fervor 30%. Sim: 70.7% vs azar (77.1% líder); publicado así a pedido del usuario.
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
    desc: 'Cada vez que Doctor Doom recibe daño de un golpe, el aliado más herido (puede ser él) gana un Escudo del 25% del HP máx. de Doctor Doom (2 rondas). Todo el daño que absorben los Escudos de su equipo se acumula y se libera con Castigo del Dios Emperador.',
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 2, a: 'aliadoMasHerido' },
    acumulaEscudos: true,   // reserva oculta: no se ve hasta que se libera
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fervor Místico', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: .95, escala: 'hp', cd: 0,
      desc: 'Causa 95% (escala por HP) más el 30% del Escudo actual de Doctor Doom (no lo gasta).',
      bonoPorEscudoPropio: .30,
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
      categoria: 'over', nombre: 'Castigo del Dios Emperador', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.4, escala: 'hp', cd: 4,
      desc: 'Causa 140% (escala por HP) a todos los enemigos. Les quita todos sus buffs y se los da al aliado de Doom en la misma posición (o a uno al azar si cayó). 60% de probabilidad, por enemigo, de poner su Over en cooldown completo. Al final libera todo el daño absorbido por los Escudos de su equipo sobre un enemigo al azar (ignora Armadura).',
      efectos: [
        { accion: { tipo: 'transferirBuffs' } },
        { accion: { tipo: 'activarCooldown', categoria: 'over', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'liberarReserva', sinArmadura: true, texto: '⚡ ¡Castigo del Dios Emperador!', a: 'propio' } },
      ],
    },
  ],
};
