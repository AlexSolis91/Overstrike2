import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-30). Tengen Uzui, el Pilar del Sonido (Demon Slayer): ex-shinobi, el más veloz y vistoso de los
// Pilares. Tanque bombardero: tiene Provocación permanente y cada golpe suyo hace estallar las Bombas que el enemigo ya
// llevaba (su "partitura"). Su Over siembra Bombas que estallan en cadena ×2. Sinergia con Deidara y El Pingüino.
// Sim 2026-10-30: 53.6% vs azar (51.0% como líder) · 74.2% con Deidara y El Pingüino (el usuario aceptó ~72.5%).
export default {
  id: 'tengen',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'bombarderos'],   // campaña: temas de las etapas
  nombre: 'Tengen',
  rol: 'Tanque', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  emoji: '💥', color: '#e879f9', imagen: 'assets/personajes/tengen.webp',
  base: { hp: 800, dmg: 52, spd: 95 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Pilar del Sonido',
    desc: 'Cada vez que una Bomba hace daño a un enemigo (también su salpicadura), su equipo gana un Escudo del 20% de esa cantidad, repartido entre los aliados vivos.',
    escudoPorBomba: { pct: .20 },
  },
  pasiva: {
    nombre: 'Al Ritmo de la Partitura',
    desc: 'Tiene Provocación permanente (no se puede disipar). Cada golpe de Tengen hace estallar al instante las Bombas que el objetivo tenga.',
    efectosPermanentes: ['taunt'],
    gatillo: 'alGolpear', filtro: { en: 'enemigos', objetivoTiene: 'bomb' },
    accion: { tipo: 'detonar', a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rugido', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf0abfc,
      pct: .55, escala: 'hp', cd: 0,
      desc: 'Causa 55% (escala por HP) a todos los enemigos y hace estallar sus Bombas. Cada enemigo que tenía Bomba tiene 35% de probabilidad de quedar Aturdido.',
      efectos: [{ condicion: { objetivoTeniaAntes: 'bomb' }, accion: { tipo: 'efecto', id: 'stun', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Sentencia de Muerte', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .85, escala: 'hp', cd: 3,
      desc: 'Causa 85% (escala por HP) a todos los enemigos con 40% de probabilidad de Bomba a cada uno. Por cada Bomba colocada, Tengen gana +5% de Armadura permanente (máx. +50%).',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .40,
        alAcertar: { tipo: 'bonoPermanente', stat: 'armor', pct: .05, tope: .50, a: 'propio' } } }],
    },
    {
      categoria: 'over', nombre: 'Sinfonía Estridente', objetivo: 'azar', golpes: 10, estilo: 'ranged', color: 0xe879f9,
      pct: .35, escala: 'hp', cd: 5, potenciaBombas: { factor: 2 },
      desc: '10 golpes de 35% (escala por HP) a enemigos al azar, cada uno con 70% de probabilidad de Bomba. Cada golpe hace estallar las Bombas que el objetivo ya tenía: durante la Sinfonía, todas las Bombas que estallan hacen el doble de daño.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .70 } }],
    },
  ],
};
