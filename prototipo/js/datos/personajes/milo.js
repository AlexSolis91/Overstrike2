import { espacios } from '../reliquias.js';

// Ficha oficial #29 (2026-10-09, ajustada tras la simulación: ~62% de victorias, objetivo 55–65%).
// DoTer de Veneno y Sangrado con apoyo: clava Agujas Escarlata (hasta 14, las estrellas de Escorpio) que duelen cada
// turno y amplifican los DoTs del enemigo; Antares, la 15.ª, las consume. Punto Shinou: cura y limpia DoTs.
export default {
  id: 'milo',
  nombre: 'Milo',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['bloodline'],
  starter: 'noxious',                         // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦂', color: '#dc2626', imagen: 'assets/personajes/milo.webp',
  base: { hp: 640, dmg: 78, spd: 96 },
  extra: { dot: .30 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Las 15 Estrellas de Escorpio',
    desc: 'Cada golpe de Milo clava 1 Aguja Escarlata 📍 en el enemigo (máx. 14). Cada aguja le quita 0.5% de su HP máx. al inicio de su turno (14 agujas = 7%) y le hace recibir +3% de daño de Veneno y Sangrado (hasta +42%). Las agujas son un debuff: se pueden limpiar.',
    gatillo: 'alGolpear', filtro: { en: 'enemigos' },
    accion: { tipo: 'clavarAgujas', n: 1, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Aguja Escarlata', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0xef4444,
      pct: .50, escala: 'dano', cd: 0,
      desc: '2 golpes de 50%. Cada golpe clava 1 aguja y tiene 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Restricción y Punto Shinou', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfb7185,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Causa 70% a todos los enemigos, clava 2 agujas más en cada uno y aplica Sangrado (60%). Presiona el Punto Shinou del aliado más herido: lo cura 15% de su HP máx. y le limpia sus DoTs.',
      efectos: [
        { accion: { tipo: 'clavarAgujas', n: 2 } },
        { accion: { tipo: 'efecto', id: 'bleed', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'DoT', a: 'aliadoMasHerido' } },
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .15, a: 'aliadoMasHerido' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Antares', objetivo: 'enemigo', estilo: 'ranged', color: 0xb91c1c,
      pct: 1.80, escala: 'dano', cd: 5,
      consumeAgujas: { pct: .12 },
      desc: 'La aguja número 15: causa 180% +12% por cada Aguja Escarlata del objetivo (las consume; con 14 agujas, +168%). Aplica Veneno y Sangrado.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { accion: { tipo: 'efecto', id: 'bleed' } },
      ],
    },
  ],
};
