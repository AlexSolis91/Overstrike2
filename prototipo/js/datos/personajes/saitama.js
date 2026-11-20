import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-16, kit del usuario). Saitama, "El Calvo con Capa" (One Punch Man): rompió su limitador con
// 100 flexiones, 100 abdominales, 100 sentadillas y 10 km diarios. Daño antitanque: +200% contra Provocación, daño por %
// del HP máx. del objetivo, Perforación para atravesar Escudos y un Golpe Serio que castiga a los que están casi intactos.
// Sin habilidad de líder (en el lore no lidera a nadie). Inmune a debuffs, pero sin ninguna protección.
export default {
  id: 'saitama',
  franquicia: 'One Punch Man', grupos: ['justicieros'],   // campaña: temas de las etapas
  nombre: 'Saitama',
  rol: 'Daño',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '👊', color: '#facc15', imagen: 'assets/personajes/saitama.webp',
  base: { hp: 700, dmg: 120, spd: 115 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Limitador Roto',
    desc: 'Sus golpes hacen +200% de daño a enemigos con Provocación o Mega Provocación. Es inmune a todos los debuffs.',
    bonoContra: { efecto: ['taunt', 'megaTaunt'], pct: 2.00 },
    inmuneA: ['debuff'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Normal', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: 1.50, escala: 'dano', cd: 0, ignoraArmadura: .20,
      desc: 'Causa 150% (escala por Daño) ignorando 20 puntos de Armadura, más 10% del HP máx. del objetivo como daño por efecto (contra jefes, de su HP de referencia).',
      efectos: [{ accion: { tipo: 'danoHpMax', pct: .10 } }],
    },
    {
      categoria: 'especial', nombre: 'Golpes Normales Consecutivos', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: .20, golpes: 10, escala: 'dano', cd: 3,
      desc: 'Gana Perforación (1 ronda) y causa 10 golpes de 20% (escala por Daño) al mismo objetivo. Cada golpe acertado tiene 50% de probabilidad de darle +5% de Daño permanente (sin límite).',
      efectos: [
        { cuando: 'antes', accion: { tipo: 'efecto', id: 'pierce', dur: 1, a: 'propio' } },
        { condicion: { azar: .50 }, accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .05, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Serie Seria: Golpe Serio', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 3.00, escala: 'dano', cd: 7, ignoraArmadura: 1,
      desc: 'Causa 300% (escala por Daño) ignorando toda la Armadura. Si el objetivo tenía más del 80% de su HP, recibe además el 50% de su HP máx. como daño por efecto (ignora Armadura; contra jefes, de su HP de referencia).',
      efectos: [{ condicion: { objetivoHpMinAntes: .80 }, accion: { tipo: 'danoHpMax', pct: .50, sinArmadura: true, color: 0xef4444 } }],
    },
  ],
};
