import { espacios } from '../reliquias.js';

// Ficha oficial #63 (2026-10-20, tanque defensivo y support de grandes escudos según su HP máx., sinergia con equipos de
// Congelación sin congelar él; el resto "a tu criterio"). Bjorn Ironside (Vikings): hijo de Ragnar, rey de Kattegat, al
// que llamaron "Costado de Hierro" porque ninguna arma lo hería. Levanta el muro de escudos para su gente y se crece en el
// invierno del norte: cada aliado que congela al enemigo endurece a todo su equipo (más HP máx., y por eso escudos más
// grandes). Habilidad de líder: rey de Kattegat.
export default {
  id: 'bjorn-ironside',
  franquicia: 'Vikings', grupos: ['reyes', 'guerreros'],   // campaña: Los Reyes y Guerreros Legendarios
  nombre: 'Bjorn Ironside',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🛡️', color: '#64748b', imagen: 'assets/personajes/bjorn-ironside.webp',
  base: { hp: 790, dmg: 48, spd: 84 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Kattegat',
    desc: 'Todos los aliados tienen +10% de HP máx. y +5% de Armadura.',
    bonoStat: { hpPct: .10, armor: .05 },
  },
  pasiva: {
    nombre: 'Costado de Hierro',
    desc: 'Ninguna arma lo hiere: recibe −15% de daño de los golpes. Invierno del Norte: por cada otro aliado cuyos movimientos aplican Congelación (máx. 4), todo su equipo tiene +3% de HP máx. mientras Bjorn viva (y sus escudos crecen con su HP).',
    reduccionPropia: { categoria: 'golpe', pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'freeze', max: 4, bono: { hpPct: .03 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada de Ironside', objetivo: 'enemigo', estilo: 'melee', color: 0x94a3b8,
      pct: .8, escala: 'dano', cd: 0,
      desc: 'Causa 80% y gana un Escudo del 6% de su HP máx.',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: .06, escala: 'hpMax', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Muro de Escudos', objetivo: 'todosAliados', estilo: 'support', color: 0x60a5fa, cd: 3,
      desc: 'Levanta el muro de escudos vikingo: todos los aliados ganan un Escudo del 11% del HP máx. de Bjorn, y él gana Provocación (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .11, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Saqueo del Mediterráneo', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xcbd5e1,
      pct: 1.00, escala: 'dano', cd: 5,
      desc: 'Lleva a sus guerreros al saqueo: 100% a todos los enemigos, y todos los aliados ganan un Escudo del 14% del HP máx. de Bjorn.',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: .14, escala: 'hpMax', a: 'todosAliados' } }],
    },
  ],
};
