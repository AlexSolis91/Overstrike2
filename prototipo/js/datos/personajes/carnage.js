import { espacios } from '../reliquias.js';

// Ficha oficial #41 (2026-10-16). Carnage, el simbionte asesino (Marvel). Siembra el terror (Miedo) y el caos: hachas y
// tentáculos que hacen sangrar, roba vida y, cada vez que mata, sigue la masacre con un turno extra. Su equipo hace más daño a
// los aterrados (sinergia con equipos que aplican Miedo). Débil al
// fuego, como todo simbionte. Líder: Matanza Máxima (lideró a su banda de villanos en el arco del mismo nombre).
export default {
  id: 'carnage',
  franquicia: 'Marvel', grupos: ['simbiontes', 'villanos'],   // campaña: temas de las etapas
  nombre: 'Carnage',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['phantom', 'bloodline'],
  emoji: '🩸', color: '#b91c1c', imagen: 'assets/personajes/carnage.webp',
  base: { hp: 700, dmg: 75, spd: 108 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Matanza Máxima',
    desc: 'Los aliados ganan +10% de Daño. Cada vez que muere un enemigo, todos los aliados ganan +4% de Daño permanente (máx. +20%).',
    bonoDano: .10,
    alMorirEnemigo: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .04, tope: .20, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Simbionte Asesino',
    desc: 'Masacre: cada vez que elimina a un enemigo, gana 1 turno extra (1 por ronda). Sus golpes lo curan 10% del daño causado. Reino del Terror: todo su equipo hace +20% de daño a enemigos con Miedo. Débil al fuego: recibe +30% de daño de Quemadura.',
    gatillo: 'alEliminar', maxPorRonda: 1,
    accion: { tipo: 'turnoExtra', a: 'propio' },
    roboVida: .10,
    auraContra: { efecto: 'fear', pct: .20 },
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Hachas Simbiontes', objetivo: 'enemigo', golpes: 2, estilo: 'melee', color: 0xdc2626,
      pct: .50, escala: 'dano', cd: 0,
      desc: '2 golpes de 50%. Cada uno tiene 30% de probabilidad de aplicar Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Terror Escarlata', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x991b1b,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Tentáculos por todo el campo: 70% a todos los enemigos con 50% de probabilidad de Miedo (2 rondas) a cada uno. Los que ya tenían Miedo además sangran (50%).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'fear' }, accion: { tipo: 'efecto', id: 'bleed', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Matanza', objetivo: 'enemigo', estilo: 'melee', color: 0x7f1d1d,
      pct: 2.60, escala: 'dano', cd: 4, bonoPorDebuffs: { pct: .15 }, sobrante: true,
      desc: 'Causa 260% con +15% por cada tipo de debuff que tenga el objetivo. Si lo mata, el daño que sobró pasa a otro enemigo al azar.',
    },
  ],
};
