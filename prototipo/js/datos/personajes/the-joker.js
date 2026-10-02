import { espacios } from '../reliquias.js';

// Ficha oficial #9 (revisada el 2026-10-02). Envenena a todo el equipo enemigo, lo controla con su pasiva
// y detona todos los venenos con su Over.
export default {
  id: 'the-joker',
  nombre: 'The Joker',
  rol: 'DoTer', rolSecundario: 'Control',
  emoji: '🃏', color: '#7c3aed', imagen: 'assets/personajes/the-joker.webp',
  base: { hp: 540, dmg: 50, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'Anarquía y Caos',
    desc: 'Hasta 2 veces por ronda: cuando un enemigo recibe daño de Veneno, aplica Aturdimiento o Confusión (1 ronda), al azar, a un enemigo al azar (tirada de Puntería).',
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'efecto', idAzar: ['stun', 'confuse'], dur: 1, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Naipes Impregnados', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% y aplica Veneno. Si el objetivo tenía más HP actual que The Joker, aplica 2 Venenos más, cada uno a un enemigo al azar (pueden caer en el mismo).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { condicion: { objetivoMasHpQueYo: true }, accion: { tipo: 'efecto', id: 'poison', a: { azar: 2 } } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Detonador del Caos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: .75, escala: 'dano', cd: 3,
      desc: 'Causa 75% a todos los enemigos y les aplica Veneno. Luego aplica Mega Aturdimiento a un enemigo al azar con 3 o más acumulaciones de Veneno.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'stun', mega: true, a: { azarCon: { efecto: 'poison', min: 3 } } } },
      ],
    },
    {
      categoria: 'over', nombre: '¿Por qué tan serio?', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xa3e635,
      pct: .75, escala: 'vel', cd: 5,
      desc: '3 golpes de 75% (escala por Velocidad) a enemigos al azar. Cada golpe que acierta a un enemigo con Veneno hace que todos los Venenos de todos los enemigos hagan su daño al instante (sin gastarse).',
      efectos: [{ condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'activarDoT', efecto: 'poison', a: 'todosEnemigos' } }],
    },
  ],
};
