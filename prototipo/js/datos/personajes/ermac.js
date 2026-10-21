import { espacios } from '../reliquias.js';

// Ficha oficial #59 (2026-10-19, "a tu criterio" solo con mecánicas que ya existen). Ermac (Mortal Kombat): un guerrero
// hecho de miles de almas fundidas por la hechicería de Shao Kahn. "Somos muchos": cuando cae, las almas lo reconstruyen
// (revivir, como Wukong). Su energía de almas es verde y corrosiva (Veneno), su telequinesis levanta y estrella al enemigo
// (Aturdir) y su Tormenta de Almas les arranca la vida (robar HP). Sin habilidad de líder.
export default {
  id: 'ermac',
  franquicia: 'Mortal Kombat', grupos: [],   // campaña: Torneo de Mortal Kombat
  nombre: 'Ermac',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '👻', color: '#15803d', imagen: 'assets/personajes/ermac.webp',
  base: { hp: 550, dmg: 45, spd: 80 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Somos Muchos',
    desc: 'Las almas que lo forman lo reconstruyen: una vez por partida, al caer vuelve al combate 3 turnos después con 40% de su HP máx. Todo su equipo hace +30% de daño a enemigos con Veneno.',
    revivir: { turnos: 3, hp: .40 },
    auraContra: { efecto: 'poison', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Telequinético', objetivo: 'enemigo', estilo: 'ranged', color: 0x22c55e,
      pct: .80, escala: 'dano', cd: 0,
      desc: 'Un golpe de energía de almas: 80% con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Levitación Telequinética', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4ade80,
      pct: .60, escala: 'dano', cd: 3,
      desc: 'Levanta a todos los enemigos y los estrella contra el suelo: 60% a cada uno con 45% de probabilidad de Veneno y 25% de Aturdir.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .45 } },
        { accion: { tipo: 'efecto', id: 'stun', prob: .25 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Tormenta de Almas', objetivo: 'azar', estilo: 'ranged', color: 0x86efac,
      pct: .40, escala: 'dano', cd: 5, golpes: 6,
      desc: 'Libera las almas que lo forman: 6 impactos de 40% a enemigos al azar, cada uno con 35% de probabilidad de Veneno. Al final les arranca la vida: roba 5% del HP máx. de cada enemigo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'robarHP', pct: .05, a: 'todosEnemigos' } },
      ],
    },
  ],
};
