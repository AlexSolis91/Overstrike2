import { espacios } from '../reliquias.js';

// Ficha oficial #51 (2026-10-18; rediseñado 2026-10-25 como DoTer de Bombas). El Pingüino (Oswald Cobblepot): el Rey del
// Inframundo de Gótica y traficante de armas. Su paraguas ametralladora todavía escupe fuego (Quemadura, por eso sigue en
// Blazing Legion), pero su sello son los explosivos: paraguas-bomba y su ejército de pingüinos con cohetes (Batman Returns).
// Sus explosivos de contrabando potencian las Bombas que el enemigo ya llevaba encima (×1.5) y su Over las hace estallar.
// Sinergia con Deidara (bombarderos). Sin habilidad de líder.
export default {
  id: 'el-pinguino',
  franquicia: 'DC', grupos: ['villanos-de-gotham', 'bombarderos'],   // campaña: Ciudad Gótica y Señores del Caos
  nombre: 'El Pingüino',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐧', color: '#475569', imagen: 'assets/personajes/el-pinguino.webp',
  base: { hp: 600, dmg: 50, spd: 85 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Explosivos de Contrabando',
    desc: 'Cuando golpea a un enemigo que ya tenía Bombas antes de su ataque, cada una de esas Bombas hace ×1.5 de daño al explotar (una vez por Bomba en cada ataque). Sus golpes hacen +10% de daño a enemigos con Bomba.',
    potenciaBombas: { factor: 1.5 },
    bonoContra: { efecto: 'bomb', pct: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Paraguas Ametralladora', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: .43, escala: 'dano', cd: 0, golpes: 3,
      desc: '3 disparos de 43%, cada uno con 20% de probabilidad de Quemadura (el paraguas también lanza fuego).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .20 } }],
    },
    {
      categoria: 'especial', nombre: 'Paraguas Explosivo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Lanza paraguas-bomba sobre todo el campo: 65% a todos los enemigos con 55% de probabilidad de Bomba.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .55 } }],
    },
    {
      categoria: 'over', nombre: 'Ejército de Pingüinos Cohete', objetivo: 'azar', golpes: 6, estilo: 'ranged', color: 0xfb923c,
      pct: .32, escala: 'dano', cd: 5,
      desc: 'Sus pingüinos con cohetes en la espalda caen sobre el campo: 6 explosiones de 32% a enemigos al azar, cada una con 30% de probabilidad de Bomba. Al final detona todas las Bombas de los enemigos (las que ya tenían salen potenciadas ×1.5).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bomb', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'detonar', a: 'todosEnemigos' } },
      ],
    },
  ],
};
