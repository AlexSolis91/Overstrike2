import { espacios } from '../reliquias.js';

// Ficha oficial #1 (revisada el 2026-09-30).
export default {
  id: 'madara-uchiha',
  nombre: 'Madara Uchiha',
  rol: 'Daño',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🔥', color: '#b91c1c', imagen: 'assets/personajes/madara-uchiha.webp?v=2',
  base: { hp: 660, dmg: 85, spd: 90 },
  extra: {},                                   // secundarias por encima de la base común
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Gakido',
    desc: 'Reduce un 15% el daño DoT que reciben los aliados.',
    reduccion: { categoria: 'dot', pct: .15 },
  },
  pasiva: {
    nombre: 'Tsukuyomi Infinito',
    desc: 'Cada vez que acierta un golpe crítico, causa un 20% de ese daño a 3 enemigos al azar (pueden repetir). Es daño por efecto.',
    gatillo: 'alAcertarCritico',
    accion: { tipo: 'danoEfecto', fraccion: .20, a: { azar: 3 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Katon: Ryūen Hōka', objetivo: 'enemigo', estilo: 'ranged', color: 0xff5a1a,
      pct: .85, escala: 'dano', cd: 0,
      desc: 'Causa 85% del Daño. Si el objetivo tiene Quemadura, los demás enemigos reciben daño por efecto igual al 50% de esa Quemadura (sobre su HP máx.).',
      efectos: [{ cuando: 'objetivo', condicion: { objetivoTiene: 'burn' },
        accion: { tipo: 'replicarDoT', efecto: 'burn', factor: .5, a: 'otrosEnemigos' } }],
    },
    {
      categoria: 'especial', nombre: 'Susanoo', objetivo: 'enemigo', estilo: 'melee', color: 0x8b5cf6,
      pct: 1.40, escala: 'dano', cd: 2,
      desc: 'Causa 140% del Daño. Si acierta un crítico, roba el 5% del HP máx. de todos los enemigos.',
      efectos: [{ cuando: 'critico', accion: { tipo: 'robarHP', pct: .05, a: 'todosEnemigos' } }],
    },
    {
      categoria: 'over', nombre: 'Chibaku Tensei', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x9ca3af,
      pct: 1.20, escala: 'dano', cd: 4,
      bonoPorSobreviviente: .05,
      desc: 'Causa 120% del Daño a todos los enemigos. Por cada enemigo que sobreviva, este ataque gana +5% de daño (permanente). 75% de probabilidad de aplicar Miedo (2 rondas) a cada sobreviviente.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .75, a: 'sobrevivientes' } }],
    },
  ],
};
