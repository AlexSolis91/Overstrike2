import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-17, kit del usuario). Tirion Fordring (Warcraft): Alto Señor de la Cruzada Argenta, paladín de la
// Mano de Plata que guió el asalto a la Ciudadela de la Corona de Hielo. Cura, protege con la Luz y devuelve la vida a los caídos.
const ULTIMA_LUZ = { tipo: 'usarMovimiento', categoria: 'over' };

export default {
  id: 'tirion-fordring',
  franquicia: 'Warcraft', grupos: ['alianza'],   // campaña: temas de las etapas
  nombre: 'Tirion Fordring',
  rol: 'Support', rolSecundario: 'Daño',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '⚜️', color: '#facc15', imagen: 'assets/personajes/tirion-fordring.webp',
  base: { hp: 650, dmg: 52, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'La Cruzada Argenta',
    desc: 'Las curaciones del equipo aliado tienen 25% de probabilidad de dar Escudo Sagrado al curado. Cada vez que un aliado ataca con Escudo Sagrado activo, Tirion le cura el 20% de su propio HP máx.',
    alCurar: { prob: .25, efecto: 'escudoSagrado' },
    alAtacarCon: { efecto: 'escudoSagrado', accion: { tipo: 'curar', escala: 'hpMax', pct: .20, a: 'objetivo' } },
  },

  pasiva: {
    nombre: 'Paladín de la Mano de Plata',
    desc: 'La primera vez que queda con 20% de HP o menos, limpia todos sus debuffs y gana Escudo Sagrado, Protección y Fortaleza (2 rondas). Si caen todos sus aliados y él sigue en pie, ejecuta Una Luz en la Oscuridad 4 veces sin activar su cooldown (una vez por partida).',
    gatillo: 'alHpBajoPropio', hp: .20,
    accion: { tipo: 'multiple', a: 'propio', acciones: [
      { tipo: 'limpiar' },
      { tipo: 'efecto', id: 'escudoSagrado' },
      { tipo: 'efecto', id: 'protect', dur: 2 },
      { tipo: 'efecto', id: 'fortaleza', dur: 2 },
    ] },
    tambien: [
      { gatillo: 'alQuedarSolo', accion: { tipo: 'multiple', a: 'propio', acciones: [ULTIMA_LUZ, ULTIMA_LUZ, ULTIMA_LUZ, ULTIMA_LUZ] } },
    ],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Luz del Alba', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde68a,
      pct: .70, escala: 'hp', cd: 0,
      desc: 'Causa 70% (escala con HP) a todos los enemigos y cura a cada aliado lo mismo que el daño total que causó.',
      efectos: [{ cuando: 'final', accion: { tipo: 'curar', base: 'danoCausado', pct: 1, a: 'todosAliados' } }],
    },
    {
      categoria: 'especial', nombre: 'Protección de la Luz', objetivo: 'aliado', estilo: 'support', color: 0xfacc15, cd: 2,
      desc: 'Cura al aliado el 25% del HP máx. de Tirion y le da Escudo Sagrado y Protección (2 rondas).',
      efectos: [
        { accion: { tipo: 'curar', escala: 'hpMax', pct: .25 } },
        { accion: { tipo: 'efecto', id: 'escudoSagrado' } },
        { accion: { tipo: 'efecto', id: 'protect', dur: 2 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Una Luz en la Oscuridad', objetivo: 'propio', estilo: 'support', color: 0xfffbeb, cd: 5,
      desc: 'Elimina a un enemigo que haya sido revivido (sin importar su Escudo ni lo que lo revivió; no a jefes) y revive a un aliado caído al azar con 50% de HP. Si no hay a quién, cura el 20% del HP máx. de Tirion a todo su equipo.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'ejecutar', soloRevividos: true, a: 'propio', texto: '✝️ ¡Vuelve a la tierra!' } },
        { cuando: 'final', accion: { tipo: 'reanimar', cantidad: 1, hp: .50, a: 'propio' } },
        { cuando: 'final', condicion: { ctxCero: ['ejecutados', 'reanimados'] }, accion: { tipo: 'curar', escala: 'hpMax', pct: .20, a: 'todosAliados' } },
      ],
    },
  ],
};
