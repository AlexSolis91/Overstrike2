import { espacios } from '../reliquias.js';

// Ficha oficial #20 (2026-10-07, ajustada tras la simulación: ~63% de victorias, dentro del objetivo 60–70%).
// Daño con Sangrado: castiga a los que sangran, los convierte en Hemorragia y cambia su estilo según las armas que lleva (Espadas del Caos / Lanza de Draupnir).
export default {
  id: 'kratos',
  nombre: 'Kratos',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'sacred'],
  emoji: '🪓', color: '#dc2626', imagen: 'assets/personajes/kratos.webp',
  base: { hp: 700, dmg: 85, spd: 86 },
  extra: { dot: .40 },                         // Daño DoT 40%: su Sangrado quita 7% por golpe
  // Por defecto lleva 2 Espadas (las Espadas del Caos) mientras no exista el inventario de reliquias de los jugadores
  slots: espacios('obsidiana', 'pechera', 'anilloCobre', { relic: 'nichirin' }),

  pasiva: {
    nombre: 'Fantasma de Esparta',
    desc: 'Sus golpes hacen +25% de daño a enemigos con Sangrado o Hemorragia. Cuando un enemigo con Hemorragia muere, Kratos se cura el 10% de su HP máx.',
    bonoContra: { efecto: ['bleed', 'hemo'], pct: .25 },
    gatillo: 'alMorirEnemigo', filtro: { teniaAlMorir: 'hemo' },
    accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espadas del Caos', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% con 60% de probabilidad de Sangrado. ⚔️ Con 2 Espadas equipadas: 2 golpes de 60%, cada uno con su tirada de Sangrado.',
      conEquipo: { equipo: { tipo: 'Espada', min: 2 }, cambios: { golpes: 2, pct: .60 } },
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Espartana', objetivo: 'propio', estilo: 'support', color: 0xef4444,
      cd: 3,
      desc: 'Kratos se quita sus debuffs de Control, gana Furia (+50% de daño, 2 rondas) y un turno extra para atacar de inmediato. Si hay 2 o más enemigos con Sangrado o Hemorragia, también gana Letalidad (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'Control', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', condicion: { enemigosCon: { efectos: ['bleed', 'hemo'], min: 2 } }, accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Ira del Dios de la Guerra', objetivo: 'enemigo', estilo: 'melee', color: 0xb91c1c,
      pct: 2.80, escala: 'dano', cd: 5,
      desc: 'Causa 280%. Asesino de Dioses: +30% si el objetivo tiene más HP que Kratos. Si tenía Sangrado, se convierte en Hemorragia. 🔱 Con una Lanza equipada: la lanza explota y golpea (50%) a los demás enemigos que sangran.',
      bonoSiObjetivoMasHp: .30,
      efectos: [
        { condicion: { objetivoTeniaAntes: 'bleed' }, accion: { tipo: 'hemorragia' } },
        { cuando: 'final', condicion: { equipo: { tipo: 'Lanza' } }, accion: { tipo: 'golpeDirecto', nombre: 'Lanza de Draupnir', pct: .50, color: 0x93c5fd, a: { enemigosCon: ['bleed', 'hemo'] } } },
      ],
    },
  ],
};
