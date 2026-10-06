import { espacios } from '../reliquias.js';

// Ficha oficial #12 (revisada el 2026-10-04). Daño con fuego: contraataca y roba vida a los quemados, castiga a los
// equipos quemados con Spear y deja una Quemadura fuerte con su Fatality. Líder: Gran Maestro del Shirai Ryu.
export default {
  id: 'scorpion',
  nombre: 'Scorpion',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦂', color: '#f59e0b', imagen: 'assets/personajes/scorpion.webp',
  base: { hp: 715, dmg: 84, spd: 77 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Gran Maestro Shirai Ryu',
    desc: 'Los aliados ganan +15% de Daño. Cada vez que un enemigo recibe daño de Quemadura, todos los aliados ganan +2% de Daño Crítico (sin tope; se pierde si Scorpion muere).',
    bonoDano: .15,
    acumulaPorDoT: { tipo: 'burn', stat: 'critDmg', valor: .02 },
  },
  pasiva: {
    nombre: 'Llamas Devoradoras',
    desc: 'Hasta 3 veces por ronda: cuando un enemigo con Quemadura lo ataca, Scorpion contraataca con su Básico (un contraataque no provoca otro). Cada vez que ataca a un enemigo con Quemadura, le roba 5% de su HP máx.',
    gatillo: 'alSerAtacado', filtro: { atacanteTiene: 'burn' }, maxPorRonda: 3,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', contraataque: true, a: 'atacante' },
    roboSiObjetivoTiene: { efecto: 'burn', pct: .05 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Venganza Eterna', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: .85, escala: 'dano', cd: 0,
      desc: 'Causa 85%. Si es crítico, golpea una vez más (si el objetivo murió, a un enemigo al azar).',
      golpeExtraSiCritico: true,
    },
    {
      categoria: 'especial', nombre: 'Spear', objetivo: 'enemigo', estilo: 'ranged', color: 0xfbbf24,
      pct: 1.60, escala: 'dano', cd: 3,
      desc: 'Causa 160% con 50% de probabilidad de aplicar Incitar (1 ronda). Además causa daño por efecto igual al 2% del HP máx. de cada enemigo con Quemadura.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'incite', dur: 1, prob: .50 } },
        { accion: { tipo: 'danoSegunEnemigos', efecto: 'burn', pct: .02 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Fatality: Cráneo Incendiario', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 2.60, escala: 'dano', cd: 4,
      desc: 'Causa 260%. Si el objetivo sobrevive, 75% de probabilidad de aplicar Quemadura 15% (3 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, prob: .75 } }],
    },
  ],
};
