import { espacios } from '../reliquias.js';

// Ficha oficial #25 (2026-10-08, ajustada tras la simulación: ~59% de victorias, objetivo > 55%).
// Control castigador de buffs: cada buff que reciben sus enemigos lo fortalece
// (Poder Robado), sus golpes hacen más daño a quien tiene buffs, roba y bloquea buffs, y su Over arranca todos los
// buffs del objetivo. Líder: Señor de la Montaña de la Serpiente (comanda a los Guerreros del Mal).
export default {
  id: 'skeletor',
  nombre: 'Skeletor',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '💀', color: '#7c3aed', imagen: 'assets/personajes/skeletor.webp',
  base: { hp: 680, dmg: 86, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Señor de la Montaña de la Serpiente',
    desc: 'Los aliados hacen +10% de daño a enemigos que tengan algún buff.',
    bonoContraConBuff: .10,
  },
  pasiva: {
    nombre: 'Codicia del Bastón del Caos',
    desc: 'Cada vez que un enemigo recibe un buff, Skeletor gana 1 de Poder Robado 💀 (máx. 10, no se puede disipar). Sus golpes hacen +8% de daño por cada buff que tenga el objetivo (hasta +40%).',
    cargasPorBuffEnemigo: { efecto: 'poderRobado', max: 10 },
    bonoPorBuffsObjetivo: { pct: .08, max: .40 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rayo del Bastón del Caos', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110% y disipa 2 buffs del objetivo.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 2 } }],
    },
    {
      categoria: 'especial', nombre: 'Maldición de la Montaña de la Serpiente', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x6d28d9,
      pct: 1.00, escala: 'dano', cd: 2,
      desc: 'Antes de atacar, le roba 1 buff a cada enemigo. Causa 100% a todos y les aplica Bloquear Buffs (2 rondas).',
      efectos: [
        { cuando: 'antes', accion: { tipo: 'robarBuffs', cantidad: 1 } },
        { accion: { tipo: 'efecto', id: 'blockBuffs', dur: 2 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Poder de Grayskull', objetivo: 'enemigo', estilo: 'ranged', color: 0xc084fc,
      pct: 2.00, escala: 'dano', cd: 4,
      consumeCargas: { pct: .20, efecto: 'poderRobado' },
      desc: 'Causa 200% y consume todo su Poder Robado: +20% de daño por cada uno (hasta +200%). Después le arranca TODOS los buffs al objetivo (siempre, sin tirada).',
      efectos: [{ accion: { tipo: 'disipar', sinTirada: true } }],
    },
  ],
};
