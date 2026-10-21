import { espacios } from '../reliquias.js';

// Ficha oficial #50 (2026-10-18, diseño "a tu criterio"). Tobirama Senju, el Segundo Hokage: maestro del Estilo Agua
// (sus técnicas congelan al enemigo en este juego), creador del Dios del Trueno Volador y sensor de chakra. Control de
// Congelación y soporte: su equipo se vuelve más rápido y certero por cada aliado que congela. Habilidad de líder: fue Hokage.

export default {
  id: 'tobirama',
  franquicia: 'Naruto', grupos: ['konoha', 'hokage', 'senju', 'hielo'],   // campaña: Héroes de la Hoja y Frío Eterno
  nombre: 'Tobirama Senju',
  rol: 'Control', rolSecundario: 'Support',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🌊', color: '#2563eb', imagen: 'assets/personajes/tobirama.webp',
  base: { hp: 680, dmg: 63, spd: 112 },
  extra: { acc: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Segundo Hokage',
    desc: 'Todos los aliados tienen +10% de Velocidad y +15% de Puntería.',
    bonoStat: { spdPct: .10, acc: .15 },
  },
  pasiva: {
    nombre: 'Sensor del Segundo Hokage',
    desc: 'Por cada otro aliado cuyos movimientos aplican Congelación (máx. 4), todo su equipo gana +4% de Velocidad y +4% de Puntería mientras Tobirama viva. Todo su equipo hace +8% de daño a enemigos con Congelación.',
    bonoPorAliadosQueAplican: { efecto: 'freeze', max: 4, bono: { spdPct: .04, acc: .04 } },
    auraContra: { efecto: 'freeze', pct: .08 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Gran Bala de Agua', objetivo: 'enemigo', estilo: 'ranged', color: 0x3b82f6,
      pct: 1.30, escala: 'dano', cd: 0,
      desc: 'Causa 130% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Dragón de Agua', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.05, escala: 'dano', cd: 3,
      desc: 'Un dragón de agua arrasa el campo: 105% a todos los enemigos con 45% de probabilidad de Congelación. Todos los aliados ganan Celeridad (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Corte del Dios del Trueno Volador', objetivo: 'enemigo', estilo: 'melee', color: 0xbfdbfe,
      pct: 3.15, escala: 'dano', cd: 5, criticoSiObjetivoTiene: 'freeze',
      desc: 'Se teletransporta junto al enemigo y lo corta: 315%, crítico seguro si está Congelado. Aplica Mega Congelación con 60% de probabilidad.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .60 } }],
    },
  ],
};
