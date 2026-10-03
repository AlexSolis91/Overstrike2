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
    desc: 'Cada vez que un enemigo usa su Especial o su Over, tiene 50% de probabilidad de aplicarle al azar uno de estos debuffs que no tenga: Debilitar, Ceguera, Desgaste, Silenciar, Peste o Congelación (2 rondas; tirada de Puntería).',
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['especial', 'over'] },
    accion: { tipo: 'efecto', idAzar: ['weaken', 'blind', 'wear', 'silence', 'plague', 'freeze'], sinRepetir: true, dur: 2, prob: .50, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Batarang', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: .70, escala: 'dano', cd: 0,
      desc: 'Causa 70%. Si el objetivo tiene su Over listo para usar, tiene 20% de probabilidad de Aturdirlo.',
      efectos: [{ condicion: { objetivoOverListo: true }, accion: { tipo: 'efecto', id: 'stun', prob: .20 } }],
    },
    {
      categoria: 'especial', nombre: 'Tácticas de las Sombras', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Batman y 1 aliado al azar ganan Agudeza (+50% Puntería, 2 rondas). 40% de probabilidad de aplicar Quemadura Solar (2 rondas) a cada enemigo.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'keen', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'keen', dur: 2, a: { otrosAliadosAzar: 1 } } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .40, a: 'todosEnemigos' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Plan de Contingencia', objetivo: 'propio', estilo: 'support', color: 0x64748b, cd: 5,
      desc: 'Limpia todos los debuffs de los aliados, reinicia el cooldown del Especial de sus aliados y les baja 1 el del Over (no los suyos). Por cada debuff limpiado golpea 30% (escala por HP) a un enemigo al azar.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'reiniciarCooldowns', categorias: ['especial'], a: 'otrosAliados' } },
        { cuando: 'final', accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['over'], a: 'otrosAliados' } },
        { cuando: 'final', accion: { tipo: 'golpesPorConteo', conteo: 'limpiados', nombre: 'Plan de Contingencia', pct: .30, escala: 'hp', color: 0x94a3b8, a: 'propio' } },
      ],
    },
  ],
};
