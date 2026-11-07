import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-07; sim: ~51% contra equipos al azar, ~68% como líder). Ryomen Sukuna, el Rey de las Maldiciones
// (Jujutsu Kaisen). Daño + DoTer: Desmantelar hace sangrar, Partir convierte el Sangrado en Hemorragia y su Expansión de
// Dominio, el Santuario Malévolo, corta a todos los enemigos cada ronda. Técnica Maldita Inversa: se regenera.
export default {
  id: 'sukuna',
  franquicia: 'Jujutsu Kaisen', grupos: [],   // campaña: temas de las etapas
  nombre: 'Sukuna',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '👹', color: '#b91c1c', imagen: 'assets/personajes/sukuna.webp',
  base: { hp: 700, dmg: 72, spd: 112 },   // banda Luchador
  extra: { critRate: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de las Maldiciones',
    desc: 'Los aliados hacen +15% de daño y ganan +20% de Prob. Crítico, +20% de Puntería y +10% de Daño Crítico por cada enemigo con Sangrado. Cada vez que muere un enemigo, todo el equipo se cura 10% de su HP máx.',
    bonoDano: .15,
    bonoStat: { critRate: .20, acc: .20 },
    bonoPorEfecto: { efecto: 'bleed', stat: 'critDmg', valor: .10 },
    alMorirEnemigo: { tipo: 'curar', pct: .10, base: 'hpMaxObjetivo', a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Técnica Maldita Inversa',
    desc: 'Al inicio de cada ronda se cura 5% de su HP máx. y se limpia 1 debuff. Gana +5% de Prob. Crítico por cada enemigo con Sangrado.',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'multiple', a: 'propio', acciones: [{ tipo: 'curar', pct: .05, escala: 'hpMax' }, { tipo: 'limpiar', cantidad: 1 }] },
    bonoPorEfecto: { efecto: 'bleed', stat: 'critRate', valor: .05 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Desmantelar', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0xdc2626,
      pct: .70, cd: 0,
      desc: 'Kai: 2 cortes de 70% a un enemigo, cada uno con 40% de probabilidad de aplicar Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Partir', objetivo: 'enemigo', estilo: 'melee', color: 0x991b1b,
      pct: 1.75, cd: 3, ignoraArmadura: .50,
      desc: 'Hachi: causa 175% a un enemigo e ignora 50 puntos de su Armadura. Si sangra, su Sangrado se convierte en Hemorragia.',
      efectos: [{ cuando: 'final', accion: { tipo: 'hemorragia' } }],
    },
    {
      categoria: 'over', nombre: 'Expansión de Dominio: Santuario Malévolo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7f1d1d,
      pct: 1.00, cd: 5,
      desc: 'Causa 100% a todos los enemigos con 60% de probabilidad de Sangrado, y levanta el Santuario Malévolo (2 rondas): al inicio de cada ronda, cada enemigo recibe un corte de 45%.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bleed', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'zona', dur: 2, a: 'propio', zona: {
          nombre: 'Santuario Malévolo', icono: '⛩️',
          desc: 'al inicio de cada ronda, cada enemigo recibe un corte de 45%',
          alIniciarRonda: { tipo: 'golpeDirecto', pct: .45, nombre: 'Corte del Santuario', a: 'todosEnemigos' },
        } } },
      ],
    },
  ],
};
