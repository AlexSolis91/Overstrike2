import { espacios } from '../reliquias.js';

// Ficha oficial #39 (2026-10-16). Venom, el simbionte (Marvel). Hace sangrar, se cura con cada mordida y crece al devorar
// enemigos. Hambre del Simbionte: todo su equipo pega más a los que sangran (sinergia con equipos de Sangrado). Débil al
// fuego: recibe +30% de daño de Quemadura. Líder: Rey de Negro (Eddie Brock como rey de la colmena de simbiontes).
export default {
  id: 'venom',
  franquicia: 'Marvel', grupos: ['simbiontes', 'antiheroes'],   // campaña: temas de las etapas
  nombre: 'Venom',
  rol: 'Daño', rolSecundario: 'Tanque',
  sobres: ['bloodline'],
  emoji: '🕷️', color: '#cbd5e1', imagen: 'assets/personajes/venom.webp',
  base: { hp: 750, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Negro',
    desc: 'La colmena de simbiontes: los aliados ganan +5% de HP máx. y, cada vez que muere un enemigo, todos los aliados se curan 8% de su HP máx.',
    bonoStat: { hpPct: .05 },
    alMorirEnemigo: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .08, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Simbionte',
    desc: 'Hambre del Simbionte: todo su equipo hace +15% de daño a enemigos con Sangrado o Hemorragia. Devorar: al atacar a un enemigo que ya sangraba, le roba 4% de su HP máx. Sus golpes lo curan 10% del daño causado. Débil al fuego: recibe +30% de daño de Quemadura.',
    auraContra: { efecto: ['bleed', 'hemo'], pct: .15 },
    roboSiObjetivoTiene: { efecto: 'bleed', pct: .04 },
    roboVida: .10,
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Zarpazo Simbionte', objetivo: 'enemigo', estilo: 'melee', color: 0x334155,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Causa 95% con 40% de probabilidad de aplicar Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Tentáculos Simbiontes', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x475569,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Causa 70% a todos los enemigos con 50% de probabilidad de Sangrado a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .50 } }],
    },
    {
      categoria: 'over', nombre: '¡Te Devoraremos!', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: 2.60, escala: 'dano', cd: 4,
      desc: 'Causa 260% y le roba 8% de su HP máx. Si lo mata, se lo come: se cura 20% de su HP máx. y gana +5% de Daño permanente (máx. +20%).',
      efectos: [
        { accion: { tipo: 'robarHP', pct: .08 } },
        { cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .20, a: 'propio' } },
        { cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .05, tope: .20, a: 'propio' } },
      ],
    },
  ],
};
