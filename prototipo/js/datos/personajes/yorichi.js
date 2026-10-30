import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-29; Phantom of Chaos; sim: 52.3% contra equipos al azar, 47.6% como líder). Yorichi Tsugikuni (Demon Slayer), creador de la Respiración del Sol: marca a los enemigos con
// Quemadura Solar, acelera sus cooldowns al golpear a los marcados y remata con las 13 Posturas del Sol.
export default {
  id: 'yorichi',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios'],   // campaña: temas de las etapas
  nombre: 'Yorichi',
  rol: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '☀️', color: '#dc2626', imagen: 'assets/personajes/yorichi.webp',
  base: { hp: 720, dmg: 75, spd: 115 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Marca de los Cazadores',
    desc: 'Los aliados ganan +8% de Puntería por cada enemigo con Quemadura Solar.',
    bonoPorEfecto: { efecto: 'solarBurn', stat: 'acc', valor: .08 },
  },
  pasiva: {
    nombre: 'Mundo Transparente',
    desc: 'Gana +5% de Daño Crítico por cada enemigo con Quemadura Solar.',
    bonoPorEfecto: { efecto: 'solarBurn', stat: 'critDmg', valor: .05 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Primera y Última Postura del Sol', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 1.15, cd: 0,
      desc: 'Causa 115% y aplica Quemadura Solar (2 rondas). Si el objetivo ya tenía Quemadura Solar, baja 1 turno el cooldown de su Especial y su Over.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'solarBurn' }, accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['especial', 'over'], a: 'propio' } },
        { accion: { tipo: 'efecto', id: 'solarBurn', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Respiración Solar', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xf97316,
      pct: 1.45, cd: 2,
      desc: 'Causa 145% a todos los enemigos y les disipa 1 buff.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Las 13 Posturas del Sol', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: .36, cd: 5, golpes: 13,
      desc: '13 golpes de 36% al mismo enemigo. Cada crítico baja 1 turno el cooldown de este movimiento. Si el objetivo tenía Quemadura Solar, gana un turno extra.',
      efectos: [
        { cuando: 'critico', accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['over'], a: 'propio' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'solarBurn' }, accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
  ],
};
