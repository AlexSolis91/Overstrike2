import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-30). Yoda, el Gran Maestro Jedi (Star Wars). Soporte puro: no causa daño. Marca a sus aliados con el
// Camino Jedi y, cada vez que usa su Básico o su Especial, los marcados usan su Básico. Su Over les devuelve
// todos los cooldowns y un turno adicional. Es intocable mientras viva algún aliado, pero muere en cuanto cae el último.
// Sim 2026-10-30: 52.1% vs azar (no tiene habilidad de líder).
export default {
  id: 'yoda',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Yoda',
  rol: 'Support',
  sobres: ['sacred'],
  emoji: '🌿', color: '#86efac', imagen: 'assets/personajes/yoda.webp',
  base: { hp: 600, dmg: 40, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sabiduría Antigua',
    desc: 'Tiene Anticipar permanente: si un enemigo gana un turno adicional, Yoda juega uno antes que él. Es inmune a todo daño (golpes, DoT, Bombas, robo de vida…) mientras viva algún aliado; los debuffs de control sí le afectan. Si cae el último de sus aliados, Yoda muere al instante.',
    efectosPermanentes: ['anticipar'],
    intocable: true,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Guía del Maestro', objetivo: 'aliado', estilo: 'ranged', color: 0x86efac, cd: 0,
      desc: 'Pone la marca Camino Jedi (permanente, +5% a todas las estadísticas, no se acumula) a un aliado. Luego cada aliado con Camino Jedi usa su Básico a un enemigo al azar (o a un aliado al azar si es de apoyo).',
      efectos: [
        { accion: { tipo: 'marcar', marca: 'caminoJedi', permanente: true, bono: { todoPct: .05 } } },
        { cuando: 'final', accion: { tipo: 'ordenarBasico', marca: 'caminoJedi', texto: '🌿 Camino Jedi', a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Antiguo Camino Jedi', objetivo: 'todosAliados', estilo: 'ranged', color: 0xbbf7d0, cd: 2,
      desc: 'Cura a todos sus aliados el 5% del HP máx. de Yoda por cada aliado con Camino Jedi. Luego cada aliado con Camino Jedi usa su Básico a un enemigo al azar (o a un aliado al azar si es de apoyo).',
      efectos: [
        { accion: { tipo: 'curar', pct: .05, escala: 'hpMax', porAliadoCon: 'caminoJedi' } },
        { cuando: 'final', accion: { tipo: 'ordenarBasico', marca: 'caminoJedi', texto: '🌿 Camino Jedi', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Espíritu de la Fuerza', objetivo: 'aliado', estilo: 'ranged', color: 0x93c5fd, cd: 4,
      desc: 'Pone en 0 todos los cooldowns de un aliado y le da un turno adicional, que juega en cuanto termina el turno de Yoda.',
      efectos: [
        { accion: { tipo: 'reiniciarCooldowns' } },
        { accion: { tipo: 'turnoExtra' } },
      ],
    },
  ],
};
