import { espacios } from '../reliquias.js';

// Ficha oficial #4 (diseñada el 2026-10-01). Invocador de sombras: ver INVOCACIONES y TABLAS_INVOCACION.sombras.
export default {
  id: 'sun-jin-woo',
  nombre: 'Sun Jin Woo',
  rol: 'Daño', rolSecundario: 'Invocador',
  emoji: '🌑', color: '#8b5cf6', imagen: 'assets/personajes/sun-jin-woo.webp',
  base: { hp: 650, dmg: 70, spd: 88 },
  extra: {},
  slots: espacios('nichirin', 'botas', 'anilloCobre'),

  pasiva: {
    nombre: 'Extracción de las Sombras',
    desc: 'Cada vez que Sun Jin Woo o sus sombras eliminan a un enemigo, invoca una sombra Épica o Legendaria al azar. Es inmune a Veneno.',
    gatillo: 'alEliminar',
    inmuneA: ['poison'],
    accion: { tipo: 'invocarAzar', tabla: 'sombras', rarezas: ['Épico', 'Legendario'], a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Daga del Monarca', objetivo: 'enemigo', estilo: 'melee', color: 0xc4b5fd,
      pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% del Daño a un enemigo.',
    },
    {
      categoria: 'especial', nombre: '¡Arise!', objetivo: 'propio', estilo: 'support', color: 0x8b5cf6, cd: 2,
      desc: 'Invoca 1 sombra al azar (Común: Iron, Igris · Raro: Shadow Ming Byung, Kaisel · Épico: Beru, Bellion · Legendario: Kamish). Máximo 3 a la vez.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocarAzar', tabla: 'sombras', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Dominio del Monarca', objetivo: 'propio', estilo: 'support', color: 0x6d28d9, cd: 4,
      desc: 'Todas sus sombras actúan de inmediato con +50% de potencia y renuevan su duración.',
      efectos: [{ cuando: 'final', accion: { tipo: 'potenciarInvocaciones', potencia: 1.5, renovar: true, a: 'propio' } }],
    },
  ],
};
