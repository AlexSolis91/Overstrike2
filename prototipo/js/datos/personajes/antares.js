import { espacios } from '../reliquias.js';

// Ficha oficial #35 (2026-10-13). Antares, Monarca de la Destrucción y Rey de los Dragones (Solo Leveling). Se alimenta de TODAS
// las Quemaduras de su equipo (contador Destrucción: +3% de daño cada una) y las detona con el Aliento de la Destrucción: cada
// Quemadura hace de golpe todo su daño restante. Miedo del Rey Dragón. Enemigo jurado de Sun Jin Woo (+20% entre ellos).
// Legión de la Destrucción: +8% Daño y HP a todo su equipo por cada aliado que aplica Quemadura (rinde mucho más en equipos de quemadura).
export default {
  id: 'antares',
  nombre: 'Antares',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom'],
  starter: 'blazing',
  emoji: '🐲', color: '#dc2626', imagen: 'assets/personajes/antares.webp',
  base: { hp: 680, dmg: 86, spd: 88 },
  extra: {},
  slots: espacios('argonita', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Dragones',
    desc: 'Los aliados ganan +15% de Daño DoT (sube el % de las Quemaduras, Venenos y Sangrados que apliquen).',
    bonoStat: { dot: .15 },
  },
  pasiva: {
    nombre: 'Monarca de la Destrucción',
    desc: 'Legión de la Destrucción: por cada aliado que aplique Quemadura (máx. 4), todo su equipo gana +8% de Daño y +8% de HP máx. mientras Antares viva. Cada vez que cualquier Quemadura (suya o de un aliado) hace daño a un enemigo, gana 1 de Destrucción (máx. 10): +3% de daño cada una. Enemigo jurado de Sun Jin Woo: le hace +20% de daño.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' },
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 10, efecto: 'destruccion', a: 'propio' },
    danoPorCargas: { efecto: 'destruccion', pct: .03 },
    enemigoJurado: { id: 'sun-jin-woo', bono: .20 },
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .08, hpPct: .08 } },   // Legión de la Destrucción
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamas de la Destrucción', objetivo: 'enemigo', estilo: 'ranged', color: 0xef4444,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% con 50% de probabilidad de aplicar Quemadura 8% (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .08, dur: 2, prob: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Miedo del Rey Dragón', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Ruge y lanza fuego a todos: 70% a todos los enemigos con 50% de probabilidad de Quemadura 5% (2 rondas) a cada uno. Los que ya tenían Quemadura tienen además 40% de probabilidad de Miedo (2 rondas).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .40 } },
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .50 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Aliento de la Destrucción', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      cd: 5, consumeCargas: { pct: .10, efecto: 'destruccion' },
      desc: 'Detona las Quemaduras de todos los enemigos: cada una hace al instante todo el daño que le quedaba (su % × las rondas restantes) y desaparece. Consume toda su Destrucción: +10% a la detonación por cada una. Los que sobrevivan quedan con Miedo (2 rondas).',
      efectos: [
        { accion: { tipo: 'detonarDoT', efecto: 'burn', bonoPorCargas: .10, texto: '🐲 ¡Destrucción!' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'fear', dur: 2, a: 'sobrevivientes' } },
      ],
    },
  ],
};
