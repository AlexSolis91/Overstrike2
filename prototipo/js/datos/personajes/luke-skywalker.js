import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-10, kit del usuario). Luke Skywalker, el Último Jedi (Star Wars). Tanque · Soporte: duplica su
// Bloqueo (tope 50%) y al inicio de su turno elige una forma de combate (Djem So, Soresu o Ataru) hasta el final de la ronda.
// Cura, limpia y castiga por cada debuff limpiado. Su Over (Proyección Astral) lo vuelve inmune mientras tenga Provocación
// y Mega Provocación, y da una forma al azar a cada aliado. Líder: Una Nueva Esperanza (+5% HP máx. por debuff recibido, sin tope).
// Sim 2026-11-10 (IA con forma automática): 62.8% vs azar; 72.3% como líder. El usuario pidió no bajarlo sin preguntar.
const HASTA_FIN_DE_RONDA = { dur: 1, finDeRonda: true };
const FORMAS = {
  djemSo: { nombre: 'Djem So', icono: '⚔️', desc: 'Letalidad y Frenesí',
    acciones: [{ tipo: 'efecto', id: 'bloodlust', ...HASTA_FIN_DE_RONDA }, { tipo: 'efecto', id: 'frenzy', ...HASTA_FIN_DE_RONDA }] },
  soresu: { nombre: 'Soresu', icono: '🛡️', desc: 'Fortaleza y Escudo (20% del HP máx.)',
    acciones: [{ tipo: 'efecto', id: 'fortaleza', ...HASTA_FIN_DE_RONDA }, { tipo: 'escudo', pct: .20, escala: 'hpMax', dur: 1 }] },
  ataru: { nombre: 'Ataru', icono: '🌀', desc: 'Celeridad y Esquivar',
    acciones: [{ tipo: 'efecto', id: 'haste', ...HASTA_FIN_DE_RONDA }, { tipo: 'efecto', id: 'esquivar', ...HASTA_FIN_DE_RONDA }] },
};

export default {
  id: 'luke-skywalker',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Luke Skywalker',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🟢', color: '#22c55e', imagen: 'assets/personajes/luke-skywalker.webp',
  base: { hp: 780, dmg: 48, spd: 92 },
  extra: { block: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Una Nueva Esperanza',
    desc: 'Cada vez que a un aliado le entra un debuff de un enemigo, ese aliado gana +5% de HP máx. para toda la partida (sin tope).',
    alAliadoRecibeDebuff: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .05 },
  },
  pasiva: {
    nombre: 'El Último Jedi',
    desc: 'Duplica su Bloqueo (nunca pasa del 50%). Cada vez que bloquea un ataque, 75% de probabilidad de bajar 1 turno el cooldown de Proyección Astral. Al inicio de su turno elige una forma hasta el final de la ronda: Djem So (Letalidad y Frenesí), Soresu (Fortaleza y Escudo del 20% de su HP máx.) o Ataru (Celeridad y Esquivar).',
    multiplicaBloqueo: 2,
    gatillo: 'alBloquear', prob: .75,
    accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['over'], a: 'propio' },
    formas: FORMAS,
    formaAuto: { herido: 'soresu', ataque: 'djemSo', normal: 'ataru' },
    inmuneCon: ['taunt', 'megaTaunt'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Descendencia Skywalker', objetivo: 'aliado', estilo: 'support', color: 0x4ade80, cd: 0,
      desc: 'Cura a un aliado el 20% del HP máx. de Luke.',
      efectos: [{ accion: { tipo: 'curar', pct: .20, escala: 'hpMax' } }],
    },
    {
      categoria: 'especial', nombre: 'Rayos de Luz', objetivo: 'todosAliados', estilo: 'support', color: 0x86efac, cd: 3,
      desc: 'Limpia 2 debuffs de cada aliado. Por cada debuff limpiado golpea 25% (escala por HP) a un enemigo al azar; si no limpió ninguno, golpea 1 vez.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', cantidad: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'golpesPorConteo', conteo: 'limpiados', min: 1, nombre: 'Rayos de Luz', categoria: 'especial', pct: .25, escala: 'hp', color: 0x86efac, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Proyección Astral', objetivo: 'propio', estilo: 'support', color: 0x22c55e, cd: 10,
      desc: 'Gana Provocación y Mega Provocación (1 ronda). Mientras tenga ambas es inmune a todo daño y a los debuffs. Da a cada aliado una forma al azar: Djem So, Soresu o Ataru.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 1, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'megaTaunt', dur: 1, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'formaAzar', a: 'todosAliados' } },
      ],
    },
  ],
};
