import { espacios } from '../reliquias.js';

// Ficha oficial #40 (2026-10-16). Spider-Man (Marvel). El más ágil: su Sentido Arácnido le da Bloqueo y lo saca de los
// ataques de área; sus telarañas ciegan y dejan atrapados (Aturdimiento) a los ya cegados; su equipo castiga a los enemigos
// atrapados (aura +15% contra Aturdimiento o Ceguera) y la Red Arácnida potencia a su equipo por cada aliado que aturde
// (sinergia con equipos de aturdidores). Sin habilidad de líder.
export default {
  id: 'spider-man',
  franquicia: 'Marvel', grupos: ['heroes-urbanos', 'vengadores'],   // campaña: temas de las etapas
  nombre: 'Spider-Man',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // solo en Unbreakable Force
  emoji: '🕸️', color: '#dc2626', imagen: 'assets/personajes/spider-man.webp',
  base: { hp: 600, dmg: 59, spd: 93 },
  extra: { block: .20 },                     // Sentido Arácnido
  slots: espacios('obsidiana', 'botas', 'anilloCobre'),

  pasiva: {
    nombre: 'Sentido Arácnido',
    desc: 'Esquiva casi todo: +20% de Bloqueo y Esquiva Área permanente (los ataques de área no lo alcanzan). Atrapados en la red: todo su equipo hace +15% de daño a enemigos con Aturdimiento o Ceguera. Red Arácnida: por cada aliado que aplique Aturdimiento (máx. 4), todo su equipo gana +3% de Daño y +3% de Velocidad mientras Spider-Man viva.',
    efectosPermanentes: ['aoeDodge'],
    auraContra: { efecto: ['stun', 'blind'], pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'stun', max: 4, bono: { dmgPct: .03, spdPct: .03 } },   // Red Arácnida
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Arácnido', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% con 30% de probabilidad de Ceguera (1 ronda): telaraña a la cara.',
      efectos: [{ accion: { tipo: 'efecto', id: 'blind', dur: 1, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Red de Telaraña', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe2e8f0,
      pct: .60, escala: 'dano', cd: 3,
      desc: 'Causa 60% a todos los enemigos con 40% de probabilidad de Ceguera (2 rondas) a cada uno. Los que ya estaban cegados tienen además 40% de probabilidad de Aturdimiento: quedan pegados a la red.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'blind' }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } },
        { accion: { tipo: 'efecto', id: 'blind', dur: 2, prob: .40 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Balanceo Máximo', objetivo: 'azar', golpes: 5, estilo: 'melee', color: 0x2563eb,
      pct: .60, escala: 'dano', cd: 4, critExtra: .25,
      desc: 'Se columpia por todo el campo: 5 golpes de 60% a enemigos al azar (pueden repetirse), con +25% de Prob. Crítico. Cada golpe tiene 25% de probabilidad de Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
  ],
};
