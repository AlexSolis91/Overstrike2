import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-05; sim: 52.5% contra equipos al azar, 64.7% como líder). Control + Daño: el Infinito anula golpes
// (Bloqueo) y su Expansión de Dominio aturde al equipo enemigo durante varias rondas. Líder: potencia la precisión y los críticos.
export default {
  id: 'satoru-gojo',
  franquicia: 'Jujutsu Kaisen', grupos: [],   // campaña: temas de las etapas
  nombre: 'Satoru Gojō',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['unbreakable'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🕶️', color: '#8b5cf6', imagen: 'assets/personajes/satoru-gojo.webp',
  base: { hp: 680, dmg: 64, spd: 108 },
  extra: { block: .30, acc: .25, critRate: .10 },   // Infinito: 30% de Bloqueo · Seis Ojos: Puntería y crítico
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'El Más Fuerte',
    desc: 'Los aliados hacen +15% de daño y ganan +20% de Puntería, +15% de Prob. de Crítico y +35% de Daño Crítico.',
    bonoStat: { acc: .20, critRate: .15, critDmg: .35 },
    bonoDano: .15,
  },
  pasiva: {
    nombre: 'Infinito · Seis Ojos',
    desc: 'Infinito: 30% de Bloqueo (un golpe bloqueado se anula completo, con su daño y sus efectos). Seis Ojos: inmune a Ceguera.',
    inmuneA: ['blind'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Técnica de Inversión: Azul', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0x60a5fa,
      pct: .90, cd: 0,
      desc: '2 golpes de 90% a enemigos al azar. Cada golpe tiene 30% de probabilidad de aplicar Desgaste.',
      efectos: [{ accion: { tipo: 'efecto', id: 'wear', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Técnica Imaginaria: Púrpura', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa855f7,
      pct: 1.80, cd: 4, ignoraArmadura: .50,
      desc: 'Causa 180% a todos los enemigos e ignora 50 puntos de su Armadura.',
    },
    {
      categoria: 'over', nombre: 'Expansión de Dominio: Vacío Infinito', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7c3aed,
      pct: .60, cd: 6,
      desc: 'Causa 60% a todos los enemigos con 60% de probabilidad de Aturdimiento, y levanta el Vacío Infinito (2 rondas): su equipo gana +20% de Puntería y, al inicio de cada ronda, cada enemigo tiene 40% de probabilidad de quedar Aturdido.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'zona', dur: 2, a: 'propio', zona: {
          nombre: 'Vacío Infinito', icono: '🌌',
          desc: 'su equipo +20% Puntería; al inicio de cada ronda, 40% de Aturdimiento a cada enemigo',
          bono: { acc: .20 },
          alIniciarRonda: { tipo: 'efecto', id: 'stun', prob: .40, a: 'todosEnemigos' },
        } } },
      ],
    },
  ],
};
