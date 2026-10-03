import { espacios } from '../reliquias.js';

// Ficha oficial #7 (revisada el 2026-10-01). Invoca un dragón al azar al inicio de cada turno (Drogon, Rhaegal, Viserion).
export default {
  id: 'daenerys-targaryen',
  nombre: 'Daenerys Targaryen',
  rol: 'Invoker', rolSecundario: 'DoTer',
  emoji: '🐉', color: '#b91c1c', imagen: 'assets/personajes/daenerys-targaryen.webp',
  base: { hp: 500, dmg: 85, spd: 77 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Dinastía Targaryen',
    desc: 'Por cada enemigo con Quemadura activa, todo el equipo gana +4% de Puntería.',
    bonoPorEfecto: { efecto: 'burn', stat: 'acc', valor: .04 },
  },
  pasiva: {
    nombre: 'Madre de Dragones',
    desc: 'Inmune a Quemadura. Al inicio de su turno invoca un dragón al azar (Rhaegal 80%, Viserion 15%, Drogon 5%); si ya lo tenía activo, lo renueva. Si pierde el turno, no invoca.',
    inmuneA: ['burn'],
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'invocarAzar', tabla: 'dragones', renueva: true, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rueda de la Opresión', objetivo: 'enemigo', estilo: 'ranged', color: 0xf97316,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100%. Si golpea a un objetivo con Quemadura, Daenerys gana Sigilo (2 rondas): no la pueden elegir con ataques de un objetivo; se rompe al recibir daño.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Locura Targaryen', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: .85, escala: 'dano', cd: 3,
      desc: 'Causa 85% a todos los enemigos. Sus invocaciones activas ganan +1 turno de duración.',
      efectos: [{ cuando: 'final', accion: { tipo: 'extenderInvocaciones', turnos: 1, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Dracarys', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff3d00,
      pct: 1.00, escala: 'dano', cd: 7,
      desc: 'Causa 100% a todos los enemigos con 80% de probabilidad de aplicar Quemadura 10% (3 rondas) a cada uno. Si tiene sus 3 dragones activos, cada dragón actúa de inmediato.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 3, prob: .80 } },
        { cuando: 'final', condicion: { invocacionesMin: 3 }, accion: { tipo: 'potenciarInvocaciones', potencia: 1, a: 'propio' } },
      ],
    },
  ],
};
