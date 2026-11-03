import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-03). Nezuko Kamado, la demonio que protege a los humanos (Demon Slayer). Sanadora pura: no golpea, pero su
// sangre arde al curar y cada curación real hiere al equipo enemigo. Sin habilidad de líder.
export default {
  id: 'nezuko-kamado',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'demonios'],   // campaña: temas de las etapas
  nombre: 'Nezuko Kamado',
  rol: 'Support',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌸', color: '#ec4899', imagen: 'assets/personajes/nezuko-kamado.webp',
  base: { hp: 600, dmg: 45, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre que Arde',
    desc: 'Al recibir daño (una vez por ataque), cura 10% de su HP máx. al aliado con menos HP. El 50% de lo que realmente sane cualquiera de sus curaciones se reparte al azar como daño entre los enemigos.',
    gatillo: 'alRecibirDano', soloSiCura: true, unaVezPorMovimiento: true,
    accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'aliadoMasHerido' },
    danoPorCuracion: { pct: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Purificación', objetivo: 'aliado', estilo: 'support', color: 0xfbcfe8,
      cd: 0,
      desc: 'Cura a un aliado 15% del HP máx. de Nezuko y le aplica Aura de Luz (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .15, escala: 'hpMax', a: 'objetivo' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'auraLuz', dur: 2, a: 'objetivo' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Lluvia Carmesí', objetivo: 'todosAliados', estilo: 'support', color: 0xf472b6,
      cd: 3,
      desc: 'Cura a todos los aliados 10% del HP máx. de Nezuko y les limpia 1 debuff a cada uno.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'limpiar', cantidad: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Explosión de Sangre', objetivo: 'todosAliados', estilo: 'support', color: 0xdb2777,
      cd: 5,
      desc: 'Cura a todos los aliados 20% del HP máx. de Nezuko y baja en 1 el cooldown de una habilidad al azar de cada uno.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .20, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'reducirCooldown', azar: true, cantidad: 1, a: 'todosAliados' } },
      ],
    },
  ],
};
