import { espacios } from '../reliquias.js';

// Ficha oficial #37 (2026-10-15). Orochimaru, el Sannin de las Serpientes. Nido de Serpientes: mientras viva, los Venenos de su
// equipo se acumulan hasta 8 (en vez de 5) y se cura con cada Veneno que hace daño (Muda de Piel). Over: Edo Tensei (sin daño):
// reanima hasta 2 aliados caídos, que no pueden morir mientras Orochimaru viva y envenenan con sus golpes. Líder de Otogakure.
// Sello Maldito del Cielo: marca con bono a él y a cada aliado envenenador; su equipo hace +25% a envenenados.
export default {
  id: 'orochimaru',
  franquicia: 'Naruto', grupos: ['sannin', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Orochimaru',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['phantom'],
  starter: 'noxious',
  emoji: '🐍', color: '#4d7c0f', imagen: 'assets/personajes/orochimaru.webp',
  base: { hp: 600, dmg: 50, spd: 95 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Señor de Otogakure',
    desc: 'Los aliados ganan +15% de Puntería y +10% de Daño DoT.',
    bonoStat: { acc: .15, dot: .10 },
  },
  pasiva: {
    nombre: 'Nido de Serpientes',
    desc: 'Sello Maldito del Cielo: al empezar la partida, Orochimaru y cada aliado que aplique Veneno reciben el Sello Maldito (+15% de Daño, +12% de HP máx. y +10% de Velocidad toda la partida). Todo su equipo hace +25% de daño a enemigos envenenados. Veneno de Manda: mientras Orochimaru viva, los Venenos que aplique su equipo se acumulan hasta 8 (en vez de 5). Muda de Piel: cada vez que un Veneno hace daño a un enemigo, Orochimaru se cura 2% de su HP máx. (máximo 3 veces por ronda).',
    venenoMax: 8,
    auraContra: { efecto: 'poison', pct: .25 },
    marcaAliadosQueAplican: { efecto: 'poison', marca: 'selloMaldito', bono: { dmgPct: .15, hpPct: .12, spdPct: .10 } },
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'curar', pct: .02, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Manos de Serpiente Ocultas', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0x65a30d,
      pct: .45, escala: 'dano', cd: 0,
      desc: 'Sen\'eijashu: 2 golpes de 45% a enemigos al azar, cada uno con 40% de probabilidad de aplicar Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Espada Kusanagi', objetivo: 'enemigo', estilo: 'melee', color: 0xa3e635,
      pct: 1.35, escala: 'dano', cd: 3,
      desc: 'Causa 135% y aplica 2 Venenos al objetivo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { accion: { tipo: 'efecto', id: 'poison' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Edo Tensei', objetivo: 'propio', estilo: 'support', color: 0x4d7c0f, cd: 5, requiereAliadoCaido: true,
      desc: 'Reanimación Impura (no causa daño). Solo se puede usar si hay al menos un aliado caído. Revive hasta 2 aliados caídos con 50% de su HP máx. Los reanimados no pueden morir mientras Orochimaru viva (se quedan en 1 HP) y sus golpes tienen 30% de probabilidad de aplicar Veneno. Si Orochimaru cae, vuelven a ser mortales.',
      efectos: [{ cuando: 'final', accion: { tipo: 'reanimar', cantidad: 2, hp: .50, marca: 'edoTensei', inmortal: true, textoInmortal: '⚰️ ¡El Edo Tensei lo mantiene en pie!',
        alGolpear: { tipo: 'efecto', id: 'poison', prob: .30 }, a: 'propio' } }],
    },
  ],
};
