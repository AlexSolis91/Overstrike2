import { espacios } from '../reliquias.js';

// Ficha oficial #49 (2026-10-18, diseño "a tu criterio"). Hashirama Senju, el Primer Hokage y Dios de los Shinobi:
// Estilo Madera para atrapar (Aturdir) y someter el chakra enemigo (Disipar), regeneración sin sellos (Regeneración
// permanente) y el Buda de las Mil Manos. Fundador de Konoha (habilidad de líder). Rival eterno de Madara.

export default {
  id: 'hashirama',
  franquicia: 'Naruto', grupos: ['konoha', 'hokage', 'senju'],   // campaña: Héroes de la Hoja
  nombre: 'Hashirama Senju',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: [],  // como los demás de Konoha: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🌳', color: '#65a30d', imagen: 'assets/personajes/hashirama.webp',
  base: { hp: 780, dmg: 42, spd: 80 },
  extra: { res: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Primer Hokage',
    desc: 'Todos los aliados tienen +15% de HP máx. y +10% de Resistencia.',
    bonoStat: { hpPct: .15, res: .10 },
  },
  pasiva: {
    nombre: 'Regeneración del Senju',
    desc: 'Tiene Regeneración permanente: se cura 10% de su HP máx. al inicio de su turno, sin sellos. Rival eterno de Madara: le hace +20% de daño.',
    efectosPermanentes: ['regen'],
    enemigoJurado: { id: 'madara-uchiha', bono: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Estacas de Madera', objetivo: 'enemigo', estilo: 'ranged', color: 0x65a30d,
      pct: .85, escala: 'dano', cd: 0,
      desc: 'Causa 85% con 30% de probabilidad de Aturdir (la madera lo atrapa).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Nacimiento de un Bosque Profundo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4d7c0f,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Un bosque brota del suelo: 70% a todos los enemigos, cada uno pierde 1 buff (la madera absorbe su chakra). Todos los aliados se curan 8% de su HP máx.',
      efectos: [
        { accion: { tipo: 'disipar', cantidad: 1 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .08, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Buda de las Mil Manos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.45, escala: 'dano', cd: 5,
      desc: 'Shinsūsenju: mil palmas gigantes caen sobre todos los enemigos: 145% a cada uno con 30% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .30 } }],
    },
  ],
};
