import { espacios } from '../reliquias.js';

// Ficha oficial #45 (2026-10-16). Deidara de Akatsuki (Naruto): «¡El arte es una explosión!». Llena al equipo rival de Bombas
// con su arcilla explosiva y las detona todas con ¡Katsu! (también las de sus aliados). Preparado para futuros bombarderos:
// su equipo pega más a los enemigos con Bomba y gana Daño DoT por cada aliado que aplique Bomba. Sin habilidad de líder.
export default {
  id: 'deidara',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados', 'bombarderos'],   // campaña: temas de las etapas
  nombre: 'Deidara',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '💥', color: '#facc15', imagen: 'assets/personajes/deidara.webp',
  base: { hp: 550, dmg: 45, spd: 80 },
  extra: { acc: .15 },                        // su ojo explorador
  slots: espacios('argonita', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'El Arte es una Explosión',
    desc: 'Arte efímero: todo su equipo hace +15% de daño a enemigos con Bomba. Escuela de explosivos: por cada aliado que aplique Bomba (máx. 4), todo su equipo gana +10% de Daño DoT mientras Deidara viva. Su ojo explorador le da +15% de Puntería.',
    auraContra: { efecto: 'bomb', pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'bomb', max: 4, bono: { dot: .10 } },   // Escuela de explosivos
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Arcilla Explosiva C1', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0xfde68a,
      pct: .40, escala: 'dano', cd: 0,
      desc: '2 aves de arcilla de 40% a enemigos al azar (pueden repetirse), cada una con 45% de probabilidad de Bomba.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .45 } }],
    },
    {
      categoria: 'especial', nombre: 'C2: Dragón de Arcilla', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf59e0b,
      pct: .55, escala: 'dano', cd: 3,
      desc: 'Causa 55% a todos los enemigos con 60% de probabilidad de Bomba a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .60 } }],
    },
    {
      categoria: 'over', nombre: '¡Katsu! C4 Karura', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: .80, escala: 'dano', cd: 4,
      desc: 'Causa 80% a todos los enemigos con 40% de probabilidad de Bomba. Al final detona todas las Bombas de todos los enemigos (también las de sus aliados): cada una explota al instante y salpica a los aliados del portador.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bomb', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'detonar', a: 'todosEnemigos' } },
      ],
    },
  ],
};
