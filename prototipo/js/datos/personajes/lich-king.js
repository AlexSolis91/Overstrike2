import { espacios } from '../reliquias.js';

// Ficha oficial #17 (revisada el 2026-10-07). Tanque de Control: Provocación permanente, roba HP y castiga a los
// enemigos congelados y poseídos. Su daño directo es bajo a propósito: su fuerza está en los robos y en el Over.
// Líder: Carcelero de los Malditos.
export default {
  id: 'lich-king',
  nombre: 'Lich King',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom'],
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '👑', color: '#60a5fa', imagen: 'assets/personajes/lich-king.webp',
  base: { hp: 800, dmg: 40, spd: 62 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Carcelero de los Malditos',
    desc: 'Cada vez que un aliado aplica Congelación o Mega Congelación a un enemigo, ese aliado le roba el 5% de su HP máx.',
    alAplicar: { efecto: 'freeze', accion: { tipo: 'robarHP', pct: .05 } },
  },
  pasiva: {
    nombre: 'El Príncipe Caído',
    desc: 'Tiene Provocación permanente (no se puede disipar). Cada vez que recibe un debuff, 50% de probabilidad de aplicar Congelación a un enemigo al azar.',
    efectosPermanentes: ['taunt'],
    gatillo: 'alRecibirDebuff', prob: .50,
    accion: { tipo: 'efecto', id: 'freeze', a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Agonía de Escarcha', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: .30, escala: 'hp', cd: 0,
      desc: 'Causa 30% (escala por HP) y roba 5% del HP máx. del objetivo. Si tenía Congelación antes del ataque, 80% de probabilidad de aplicar Posesión.',
      efectos: [
        { accion: { tipo: 'robarHP', pct: .05 } },
        { condicion: { objetivoTeniaAntes: 'freeze' }, accion: { tipo: 'efecto', id: 'possess', prob: .80 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Profanación de Vida', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: .15, escala: 'hp', cd: 2,
      desc: 'Causa 15% (escala por HP) a todos los enemigos y roba 5% del HP máx. de cada uno que tenía Congelación, Mega Congelación o Posesión antes del ataque.',
      efectos: [{ condicion: { objetivoTeniaAntes: ['freeze', 'possess'] }, accion: { tipo: 'robarHP', pct: .05 } }],
    },
    {
      categoria: 'over', nombre: 'Apocalipsis', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbfdbfe,
      pct: .10, escala: 'hp', cd: 5,
      desc: 'Causa 10% (escala por HP) a todos los enemigos. Cada uno recibe además 10% de su HP máx. por Congelación (o Mega Congelación) y 10% por Posesión que tuviera antes del ataque (máx. 20%). Ese daño ignora Armadura.',
      efectos: [{ accion: { tipo: 'danoPorDebuffs', efectos: ['freeze', 'possess'], pct: .10, color: 0xbfdbfe } }],
    },
  ],
};
