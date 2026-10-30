import { espacios } from '../reliquias.js';

// Ficha oficial #46 (2026-10-18, diseño "a tu criterio"). Broly, el Saiyajin Legendario: un tanque que se enfurece con cada
// golpe que recibe (Ira) hasta despertar al Super Saiyajin Legendario (permanente). Si lo derriban antes, su furia lo
// levanta y se transforma. Ya transformado, su poder crece sin límite mientras lo golpean. Sin habilidad de líder
// (en su historia nunca dirige: lo controla Paragus).

const brolyLegendario = {
  nombre: 'Broly Super Saiyajin Legendario',
  emoji: '💚', color: '#84cc16', imagen: 'assets/transformaciones/broly-super-sayajin-legendario.webp',
  base: { hp: 890, dmg: 59, spd: 92 },
  extra: { armor: .15 },
  pasiva: {
    nombre: 'Poder Sin Límites',
    desc: 'Cada vez que recibe un golpe gana +3% de Daño permanente (máx. +30%).',
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .03, tope: .30, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lariat Legendario', objetivo: 'enemigo', estilo: 'melee', color: 0x84cc16,
      pct: .8, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 golpes de 80%.',
    },
    {
      categoria: 'especial', nombre: 'Rugido Legendario', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa3e635,
      pct: 1.2, escala: 'dano', cd: 3,
      desc: 'Causa 120% a todos los enemigos con 35% de probabilidad de Miedo (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .35 } }],
    },
    {
      categoria: 'over', nombre: 'Omega Blaster', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4ade80,
      pct: 1.75, escala: 'dano', cd: 5,
      desc: 'Una esfera gigante de energía: 175% a todos los enemigos con 50% de probabilidad de Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .50 } }],
    },
  ],
};

export default {
  id: 'broly',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'villanos'],   // campaña: Guerreros Sayajin y Señores del Caos
  nombre: 'Broly',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: [],  // como Goku y Vegeta: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '💚', color: '#65a30d', imagen: 'assets/personajes/broly.webp',
  base: { hp: 850, dmg: 55, spd: 88 },
  extra: { armor: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Saiyajin Legendario',
    desc: 'Cada golpe que recibe le da 1 de Ira 💢 (máx. 5). Con 5 se transforma para siempre en Broly Super Saiyajin Legendario. La primera vez que caería, su furia lo mantiene en pie con 30% de HP y se transforma.',
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'iraBroly', a: 'propio' },
    transformarConCargas: { efecto: 'iraBroly', cargas: 5 },
    ultimoAliento: { hp: .30, transformar: true },
  },
  transformacion: brolyLegendario,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Salvaje', objetivo: 'enemigo', estilo: 'melee', color: 0x65a30d,
      pct: 1.3, escala: 'dano', cd: 0,
      desc: 'Causa 130% y gana 1 de Ira.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'iraBroly', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Incontrolable', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x84cc16, cd: 3,
      pct: 1.1, escala: 'dano',
      desc: 'Estalla de rabia: 110% a todos los enemigos, gana Provocación (2 rondas) y un Escudo del 22% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .22, escala: 'hpMax', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Bola de Energía Explosiva', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 2.3, escala: 'dano', cd: 4,
      desc: 'Causa 230% y gana 2 de Ira.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'iraBroly', a: 'propio' } }],
    },
  ],
};
