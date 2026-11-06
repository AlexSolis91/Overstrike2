// Jefe de Raid: Lich King. Ficha propia, distinta del campeón: es la batalla en lo alto de la Ciudadela de la Corona de Hielo.
// hp es el HP de referencia: los efectos por % de HP máx. se calculan sobre él; el HP real es la barra que comparten todos los jugadores.
export default {
  id: 'lich-king-jefe',
  franquicia: 'Warcraft', grupos: [],
  nombre: 'Lich King',
  rol: 'Tanque',
  emoji: '👑', color: '#60a5fa', imagen: 'assets/personajes/lich-king-jefe.webp',
  arteCarta: 'assets/personajes/lich-king-jefe-carta.webp',   // la carta del campo es solo esta imagen, sin barra ni estadísticas
  musica: 'jefeLichKing',                                    // pista exclusiva de este jefe (MUSICA en js/datos/sonidos.js)
  auraJefe: 'hielo',                                         // aura de la carta: hielo · fuego · oscuro
  base: { hp: 3000, dmg: 175, spd: 100 },
  extra: { armor: .20 },   // Resistencia: la base (50%) + la de la dificultad (ver DIFICULTADES_RAID)
  slots: [],
  ciclo: ['especial', 'basico', 'especial', 'basico', 'over'],   // siempre en este orden; la pantalla muestra lo que sigue
  pasiva: {
    nombre: 'Cosecha de Almas',
    desc: 'Inmune a todo Control y a la Congelación. Cada campeón que cae alimenta a Frostmourne: +10% de Daño permanente, hasta +40%.',
    inmuneA: ['Control', 'freeze'],
    gatillo: 'alMorirEnemigo',
    accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .10, tope: .40, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Segador de Almas', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc, elemento: 'hielo', ambiente: 'rayos',
      pct: 2.2, escala: 'dano', cd: 0,
      desc: 'Causa 220% a un enemigo y le aplica Aturdimiento y Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun' } }, { accion: { tipo: 'efecto', id: 'weaken', dur: 2 } }],
    },
    {
      categoria: 'especial', nombre: 'Invierno sin Remordimiento', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbae6fd, elemento: 'hielo', ambiente: 'ventisca',
      pct: 1, escala: 'dano', cd: 0,
      desc: 'Causa 100% a todos los enemigos. 30% de probabilidad de aplicar Congelación a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .30 } }],
    },
    {
      categoria: 'over', nombre: 'Furia de Frostmourne', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x38bdf8, elemento: 'hielo', ambiente: 'furia',
      pct: 1.8, escala: 'dano', cd: 0,
      desc: 'Causa 180% a todos los enemigos, les quita todos sus buffs e invoca a Sindragosa (actúa 2 veces; se puede Disipar).',
      efectos: [{ accion: { tipo: 'disipar' } }, { cuando: 'final', accion: { tipo: 'invocar', key: 'sindragosa', a: 'propio' } }],
    },
  ],
};
