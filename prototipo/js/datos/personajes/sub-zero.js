import { espacios } from '../reliquias.js';

// Ficha oficial #11 (revisada el 2026-10-04). Control con Congelación: congela, rompe Armadura de los congelados y
// castiga a los enemigos cuando sus aliados les rompen el hielo. Líder: Gran Maestro del Lin Kuei.
export default {
  id: 'sub-zero',
  nombre: 'Sub-Zero',
  rol: 'Control', rolSecundario: 'Daño',
  emoji: '🥶', color: '#38bdf8', imagen: 'assets/personajes/sub-zero.webp',
  base: { hp: 620, dmg: 55, spd: 79 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Manto del Lin Kuei',
    desc: 'Los aliados ganan +15% de Prob. Crítico y +15% de Daño Crítico al golpear a un enemigo con Congelación o Mega Congelación.',
    bonoCriticoContra: { efecto: 'freeze', critRate: .15, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Absolute Zero',
    desc: 'Hasta 2 veces por ronda: cada vez que un golpe rompe una capa de Congelación o Mega Congelación de un enemigo, Sub-Zero ejecuta Ice Blast sobre un enemigo al azar.',
    gatillo: 'alRomperCapa', maxPorRonda: 2,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ice Blast', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0x7dd3fc,
      pct: .80, escala: 'dano', cd: 0,
      desc: 'Golpea 2 veces (80%) a un enemigo. Cada golpe tiene 15% de probabilidad de aplicar Congelación. Contra enemigos con Congelación ignora 25 puntos de Armadura.',
      ignoraArmaduraSi: { efecto: 'freeze', puntos: .25 },
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .15 } }],
    },
    {
      categoria: 'especial', nombre: 'Ice Burst', objetivo: 'enemigo', estilo: 'ranged', color: 0x38bdf8,
      pct: 1.40, escala: 'dano', cd: 2,
      desc: 'Causa 140% con 50% de probabilidad de aplicar Congelación y roba 5% del HP máx. del objetivo. Sub-Zero gana Perforación y Celeridad (2 rondas). Contra enemigos con Congelación ignora 50 puntos de Armadura.',
      ignoraArmaduraSi: { efecto: 'freeze', puntos: .50 },
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .50 } },
        { accion: { tipo: 'robarHP', pct: .05 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'pierce', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Deep Freeze', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 1.30, escala: 'dano', cd: 5,
      desc: 'Causa 130% a todos los enemigos con 75% de probabilidad de aplicar Congelación (100% contra los más rápidos que Sub-Zero). +50% de Prob. Crítico contra los que ya tenían Congelación antes del ataque.',
      critExtraSi: { teniaAntes: 'freeze', pct: .50 },
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .75, probSiMasRapido: 1 } }],
    },
  ],
};
