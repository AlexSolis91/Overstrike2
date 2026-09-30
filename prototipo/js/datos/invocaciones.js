// Invocaciones: son un buff (etiqueta Invocación) del invocador. No ocupan espacio, no se les puede atacar,
// se pueden Disipar y desaparecen si muere el invocador. Su daño sale de las estadísticas del invocador.
// elegir: 'menorHp' | 'azar'  ·  max: cuántas del mismo tipo puede tener (1 = reemplaza a cualquier otra invocación)
export const INVOCACIONES = {
  igris: {
    nombre: 'Igris', emoji: '🥷', color: 0x8b5cf6, imagen: 'assets/invocaciones/igris.webp',
    pct: .60, escala: 'dano', golpes: 1, elegir: 'menorHp', dur: 3, max: 1,
  },
  bestia: {
    nombre: 'Bestia Carmesí', emoji: '🦂', color: 0xef4444,
    pct: .35, escala: 'dano', golpes: 2, elegir: 'azar', dur: 2, max: 1,
    efectos: [{ accion: { tipo: 'efecto', id: 'bleed' } }],
  },
  dragon: {
    nombre: 'Dragón', emoji: '🐉', color: 0xf97316,
    pct: .30, escala: 'dano', golpes: 1, elegir: 'azar', dur: 3, max: 3,
    efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2 } }],
  },
};
