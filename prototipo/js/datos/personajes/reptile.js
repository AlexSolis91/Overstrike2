import { espacios } from '../reliquias.js';

// Ficha oficial #10 (propuesta y aprobada el 2026-10-02). Ácido (Veneno + Desgaste), invisibilidad (Sigilo) y remate.
// Funciona en equipos de veneno (bonos por Veneno, ayuda a The Joker a llegar a 3 acumulaciones) y fuera de ellos
// (Desgaste y Debilitar sirven a cualquier equipo de daño). Sin habilidad de líder: no es líder en su historia.
export default {
  id: 'reptile',
  nombre: 'Reptile',
  rol: 'DoTer', rolSecundario: 'Daño',
  emoji: '🦎', color: '#65a30d', imagen: 'assets/personajes/reptile.webp',
  base: { hp: 620, dmg: 80, spd: 98 },
  extra: { critRate: .05 },                       // Prob. Crítico 10%
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre Saurian',
    desc: 'Inmune a Veneno. Sus golpes a enemigos con Veneno hacen +20% de daño. Cada vez que golpea a un enemigo con Veneno, gana Sigilo (2 rondas).',
    inmuneA: ['poison'],
    bonoContra: { efecto: 'poison', pct: .20 },
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'poison' },
    accion: { tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Escupitajo Ácido', objetivo: 'enemigo', estilo: 'ranged', color: 0x84cc16,
      pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% y aplica Veneno. Si el objetivo ya tenía Veneno, también aplica Desgaste.',
      efectos: [
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'efecto', id: 'wear' } },   // se revisa ANTES de poner el nuevo Veneno
        { accion: { tipo: 'efecto', id: 'poison' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Bola de Fuerza', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 1.30, escala: 'dano', cd: 3,
      desc: 'Causa 130% y aplica Debilitar (recibe +50% de daño) por 2 rondas. Si el objetivo ya tenía algún debuff, propaga uno de ellos al azar a otro enemigo al azar (misma intensidad y duración restante; tirada de Puntería).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'weaken', dur: 2 } },
        { cuando: 'final', accion: { tipo: 'propagar', efecto: 'azar', a: 'otroEnemigoAzar' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Fatality: Lengua Ácida', objetivo: 'enemigo', estilo: 'melee', color: 0xa3e635,
      pct: 2.00, escala: 'dano', cd: 5, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 200%, +15% por cada acumulación de Veneno del objetivo (máx. +75%). Si elimina al objetivo, Reptile gana 1 turno extra.',
      efectos: [{ cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'turnoExtra', a: 'propio' } }],
    },
  ],
};
