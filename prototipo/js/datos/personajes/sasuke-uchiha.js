import { espacios } from '../reliquias.js';

// Ficha oficial #24 (2026-10-08). Daño con Quemadura (Amaterasu, inextinguible) y Sangrado (Chidori). Kirin remata a
// los quemados. Las llamas negras saltan a otro enemigo cuando muere uno que arde. Sin Habilidad de Líder.
export default {
  id: 'sasuke-uchiha',
  nombre: 'Sasuke Uchiha',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline'],
  emoji: '⚡', color: '#7c3aed', imagen: 'assets/personajes/sasuke-uchiha.webp',
  base: { hp: 620, dmg: 88, spd: 95 },
  extra: { dot: .30 },                          // Daño DoT 30%: Quemaduras y Sangrados más fuertes
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Mangekyō Sharingan Eterno',
    desc: 'Sus golpes hacen +20% de daño a enemigos con Quemadura o Sangrado. Cuando muere un enemigo con Quemadura, las llamas negras saltan a otro enemigo al azar y le aplican Amaterasu.',
    bonoContra: { efecto: ['burn', 'bleed', 'hemo'], pct: .20 },
    gatillo: 'alMorirEnemigo', filtro: { teniaAlMorir: 'burn' },
    accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, inextinguible: true, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Chidori', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% con 45% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .45 } }],
    },
    {
      categoria: 'especial', nombre: 'Amaterasu', objetivo: 'enemigo', estilo: 'ranged', color: 0x1f2937,
      pct: 1.20, escala: 'dano', cd: 3,
      desc: 'Causa 120% y aplica Amaterasu: Quemadura de 15% (sube con Daño DoT) durante 3 rondas que no se puede limpiar.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, inextinguible: true } }],
    },
    {
      categoria: 'over', nombre: 'Kirin', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa5b4fc,
      pct: 1.50, escala: 'dano', cd: 5,
      bonoContra: { efecto: 'burn', pct: .50 },
      desc: 'Un dragón de rayo cae sobre todos los enemigos: 150%, +50% contra los que tengan Quemadura (Kirin usa el calor del fuego). 30% de probabilidad de Sangrado a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
  ],
};
