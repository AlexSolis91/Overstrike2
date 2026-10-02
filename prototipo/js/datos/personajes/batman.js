import { espacios } from '../reliquias.js';

// Ficha oficial #8 (revisada el 2026-10-01). Control: aturde con su Básico y castiga a los enemigos que usan Especial u Over.
export default {
  id: 'batman',
  nombre: 'Batman',
  rol: 'Control', rolSecundario: 'Support',
  emoji: '🦇', color: '#334155', imagen: 'assets/personajes/batman.webp',
  base: { hp: 600, dmg: 45, spd: 78 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Protocolo de la Liga',
    desc: 'Al inicio de cada ronda, un aliado al azar que no tenga Esquiva Área la recibe (2 rondas): no lo alcanzan los movimientos de área enemigos, ni su daño ni sus efectos.',
    alIniciarRonda: { tipo: 'efecto', id: 'aoeDodge', dur: 2, a: { aliadoAzarSin: 'aoeDodge' } },
  },
  pasiva: {
    nombre: 'Análisis de Puntos Débiles',
    desc: 'Cada vez que un enemigo usa su Especial o su Over, le aplica al azar uno de estos debuffs que no tenga: Debilitar, Ceguera, Desgaste, Silenciar, Peste o Congelación (2 rondas; tirada de Puntería).',
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['especial', 'over'] },
    accion: { tipo: 'efecto', idAzar: ['weaken', 'blind', 'wear', 'silence', 'plague', 'freeze'], sinRepetir: true, dur: 2, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Batarang', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: .70, escala: 'dano', cd: 0,
      desc: 'Causa 70% y aplica Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun' } }],
    },
    {
      categoria: 'especial', nombre: 'Tácticas de las Sombras', objetivo: 'todosAliados', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Todos los aliados ganan Agudeza (+50% Puntería, 2 rondas) y aplica Quemadura Solar (2 rondas) a todos los enemigos.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'keen', dur: 2 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, a: 'todosEnemigos' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Plan de Contingencia', objetivo: 'propio', estilo: 'support', color: 0x64748b, cd: 5,
      desc: 'Limpia todos los debuffs de los aliados y reinicia los cooldowns de Especial y Over de sus aliados (no los suyos). Por cada debuff limpiado golpea 30% (escala por HP) a un enemigo al azar.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'reiniciarCooldowns', categorias: ['especial', 'over'], a: 'otrosAliados' } },
        { cuando: 'final', accion: { tipo: 'golpesPorConteo', conteo: 'limpiados', nombre: 'Plan de Contingencia', pct: .30, escala: 'hp', color: 0x94a3b8, a: 'propio' } },
      ],
    },
  ],
};
