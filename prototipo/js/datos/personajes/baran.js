import { espacios } from '../reliquias.js';

// Ficha oficial #36 (2026-10-14). Baran, Rey de los Demonios y Monarca de las Llamas Blancas (Solo Leveling). Sus rayos dejan
// Carga Eléctrica en los enemigos (contador con dueño, no es debuff): con 2, Sobrecarga = Aturdido sin tirada. La Cadena de
// Relámpagos salta a todos los demás enemigos y el Juicio del Rey Demonio consume las cargas para pegar más y aturdir a los que tenían carga.
export default {
  id: 'baran',
  nombre: 'Baran',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['phantom'],
  emoji: '😈', color: '#6366f1', imagen: 'assets/personajes/baran.webp',
  base: { hp: 740, dmg: 100, spd: 96 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Demonios',
    desc: 'Los aliados hacen +15% de daño a enemigos con algún efecto de Control activo (Aturdimiento, Congelación, Miedo, Confusión, Posesión…).',
    bonoContraControl: .15,
  },
  pasiva: {
    nombre: 'Monarca de las Llamas Blancas',
    desc: 'Cada golpe de Baran deja 1 Carga Eléctrica en el enemigo. Con 2 cargas sufre una Sobrecarga: queda Aturdido (sin tirada de Puntería) y sus cargas se reinician.',
    cargaEnemigo: {
      marca: 'cargaElectrica', max: 2, texto: '⚡ ¡Sobrecarga!',
      alMax: { tipo: 'efecto', id: 'stun', irresistible: true, a: 'objetivo' },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Relámpago Demoníaco', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5b4fc,
      pct: 1.20, escala: 'dano', cd: 0,
      desc: 'Causa 120% a un enemigo.',
    },
    {
      categoria: 'especial', nombre: 'Cadena de Relámpagos', objetivo: 'enemigo', estilo: 'ranged', color: 0xc7d2fe,
      pct: 1.20, escala: 'dano', cd: 3, salta: { veces: 4, pct: .70, texto: '⚡ ¡Salta el rayo!' },
      desc: 'Causa 120% al objetivo y luego el rayo salta a todos los demás enemigos con 70% cada uno. Cada golpe deja Carga Eléctrica.',
    },
    {
      categoria: 'over', nombre: 'Juicio del Rey Demonio', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0e7ff,
      pct: 1.60, escala: 'dano', cd: 4, cdInicial: 0, bonoPorMarca: { marca: 'cargaElectrica', pct: .25, consume: true },
      desc: 'Listo desde el inicio de la partida. Un rayo blanco cae sobre todos: 160% a todos los enemigos, +25% contra los que tengan Carga Eléctrica (la consume). Los que tenían carga quedan Aturdidos.',
      efectos: [{ cuando: 'antes', condicion: { objetivoMarcaMin: { marca: 'cargaElectrica', min: 1 } }, accion: { tipo: 'efecto', id: 'stun', a: 'objetivo' } }],
    },
  ],
};
