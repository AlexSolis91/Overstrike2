import { espacios } from '../reliquias.js';

// Ficha oficial #44 (2026-10-16). Obito Uchiha, el Hombre Enmascarado (Naruto). Kamui: los ataques de área lo atraviesan
// (Esquiva Área permanente) y, una vez por ronda, al recibir un golpe se desvanece en su dimensión (Sigilo hasta el final de la
// ronda). Con su Sharingan confunde y posee a sus enemigos, y su equipo castiga a los controlados (sinergia con control
// mental: Saga, Lich King, Loki, Joker). Plan Ojo de Luna. Líder: Líder de Akatsuki (la manejó desde las sombras como «Madara»).
export default {
  id: 'obito-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'akatsuki', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Obito Uchiha',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '🌀', color: '#ea580c', imagen: 'assets/personajes/obito-uchiha.webp',
  base: { hp: 680, dmg: 76, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'amuletoPantano'),

  lider: {
    nombre: 'Líder de Akatsuki',
    desc: 'Los aliados ganan +10% de Puntería y hacen +10% de daño a enemigos con cualquier efecto de Control. El Verdadero Líder: si Pain es el líder de su equipo y cae, Obito surge como líder (se activa esta habilidad), limpia todos los debuffs de sus aliados, disipa todos los buffs enemigos y cura a sus aliados 30% de su HP máx.',
    bonoStat: { acc: .10 },
    bonoContraControl: .10,
  },
  pasiva: {
    nombre: 'Kamui',
    desc: 'Intangible: los ataques de área no lo alcanzan (Esquiva Área permanente). Una vez por ronda, al recibir un golpe, se desvanece en su dimensión: gana Sigilo hasta el final de esa ronda. Prisioneros del Sharingan: todo su equipo hace +35% de daño a enemigos con Confusión o Posesión. Seguidores del Plan: por cada aliado que aplique Confusión (máx. 4), todo su equipo gana +5% de Daño y +5% de HP máx. mientras Obito viva.',
    efectosPermanentes: ['aoeDodge'],
    gatillo: 'alRecibirGolpe', maxPorRonda: 1,
    accion: { tipo: 'efecto', id: 'stealth', dur: 1, finDeRonda: true, a: 'propio' },
    auraContra: { efecto: ['confuse', 'possess'], pct: .35 },
    sucesorDe: {                                            // El Verdadero Líder de Akatsuki
      id: 'pain', texto: '🌀 ¡Obito surge como el verdadero líder!',
      alSurgir: [
        { tipo: 'limpiar', a: 'todosAliados' },
        { tipo: 'disipar', sinTirada: true, a: 'todosEnemigos' },
        { tipo: 'curar', base: 'hpMaxObjetivo', pct: .30, a: 'todosAliados' },
      ],
    },
    bonoPorAliadosQueAplican: { efecto: 'confuse', max: 4, bono: { dmgPct: .05, hpPct: .05 } },   // Seguidores del Plan
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kamui', objetivo: 'enemigo', estilo: 'melee', color: 0xea580c,
      pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% con 25% de probabilidad de Confusión (1 ronda).',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 1, prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Control del Sharingan', objetivo: 'enemigo', estilo: 'ranged', color: 0xdc2626,
      pct: 1.50, escala: 'dano', cd: 3,
      desc: 'Causa 150% con 40% de probabilidad de Posesión: en su turno ataca a sus propios aliados.',
      efectos: [{ accion: { tipo: 'efecto', id: 'possess', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Plan Ojo de Luna', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      pct: 1.10, escala: 'dano', cd: 5,
      desc: 'Causa 110% a todos los enemigos con 60% de probabilidad de Confusión (2 rondas). Los que ya estaban confundidos tienen además 50% de probabilidad de Posesión.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'confuse' }, accion: { tipo: 'efecto', id: 'possess', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .60 } },
      ],
    },
  ],
};
