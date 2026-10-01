// Invocaciones: son un buff (etiqueta Invocación) del invocador. No ocupan espacio, no se les puede atacar,
// se pueden Disipar y desaparecen si muere el invocador. Todo lo que hacen escala con las estadísticas del invocador.
//
// Reglas generales: máximo 3 invocaciones activas por invocador · sin repetidas (salvo max > 1) ·
// si está lleno, la nueva reemplaza a la de menor duración restante.
//
// acciones:    lo que hace CADA turno (después del turno de su invocador, desde el turno siguiente a aparecer)
// alAparecer:  lo que hace UNA vez al ser invocada
// Una acción es { tipo: 'golpe', pct, golpes, elegir, efectos } o cualquier acción universal del motor
// (curar, escudo, robarHP, efecto, limpiar…) con su "a" (objetivo).
// elegir (golpes): 'menorHp' | 'azar' | 'todos' | 'masFuerte'
// enfoque: [x, y] (0–1) punto de la imagen que se centra en el medallón (por defecto la parte superior central)
// luminosa: true para imágenes con fondo negro (se dibujan en modo "pantalla": solo brilla lo claro)

export const INVOCACIONES = {
  // ---------------------------------------------------------------- Sombras de Sun Jin Woo
  iron: {
    nombre: 'Iron', rareza: 'Común', emoji: '🛡️', color: 0x94a3b8, imagen: 'assets/invocaciones/iron.webp', dur: 3,
    enfoque: [.385, .245],   // dónde está la cara en la imagen (para el medallón)
    desc: 'Golpea 25% a un enemigo al azar y da un Escudo de 50% al aliado más herido.',
    acciones: [
      { tipo: 'golpe', pct: .25, elegir: 'azar' },
      { tipo: 'escudo', pct: .50, escala: 'dano', a: 'aliadoMasHerido' },
    ],
  },
  igris: {
    nombre: 'Igris', rareza: 'Común', emoji: '🥷', color: 0x8b5cf6, imagen: 'assets/invocaciones/igris.webp', dur: 3,
    desc: 'Golpea 45% al enemigo con menos HP.',
    acciones: [{ tipo: 'golpe', pct: .45, elegir: 'menorHp' }],
  },
  shadowMingByung: {
    nombre: 'Shadow Ming Byung', rareza: 'Raro', emoji: '🙏', color: 0x34d399, imagen: 'assets/invocaciones/shadow-ming-byung.webp', dur: 3,
    luminosa: true,     // imagen con fondo negro: se muestra en modo "pantalla" (el negro se vuelve transparente)
    desc: 'Cura 15% del HP máx. al aliado más herido. Al aparecer, limpia 1 debuff de cada aliado.',
    alAparecer: [{ tipo: 'limpiar', cantidad: 1, a: 'todosAliados' }],
    acciones: [{ tipo: 'curar', base: 'hpMaxObjetivo', pct: .15, a: 'aliadoMasHerido' }],
  },
  kaisel: {
    nombre: 'Kaisel', rareza: 'Raro', emoji: '🐉', color: 0x2563eb, imagen: 'assets/invocaciones/kaisel.webp', dur: 3,
    desc: 'Roba 5% del HP máx. de 2 enemigos al azar (puede repetir) y cura a su invocador lo robado.',
    acciones: [{ tipo: 'robarHP', pct: .05, a: { azar: 2 } }],
  },
  beru: {
    nombre: 'Beru', rareza: 'Épico', emoji: '🐜', color: 0xdc2626, imagen: 'assets/invocaciones/beru.webp', dur: 3,
    desc: 'Golpea 2 veces (30%) a un enemigo al azar y aplica Sangrado o Veneno (50/50).',
    acciones: [{ tipo: 'golpe', pct: .30, golpes: 2, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', idAzar: ['bleed', 'poison'] } }] }],
  },
  bellion: {
    nombre: 'Bellion', rareza: 'Épico', emoji: '⚔️', color: 0x7c3aed, imagen: 'assets/invocaciones/bellion.webp', dur: 3,
    desc: 'Golpea 35% al enemigo más fuerte. Al aparecer, intenta Aturdir a hasta 3 enemigos distintos (cada uno con su tirada).',
    alAparecer: [{ tipo: 'efecto', id: 'stun', a: { distintos: 3 } }],
    acciones: [{ tipo: 'golpe', pct: .35, elegir: 'masFuerte' }],
  },
  kamish: {
    nombre: 'Kamish', rareza: 'Legendario', emoji: '🐲', color: 0xf59e0b, imagen: 'assets/invocaciones/kamish.webp', dur: 2,
    desc: 'Golpea 50% a todos los enemigos. Al aparecer, golpea 150% a todos y aplica Miedo (2 rondas).',
    alAparecer: [
      { tipo: 'golpe', pct: 1.50, elegir: 'todos' },
      { tipo: 'efecto', id: 'fear', dur: 2, a: 'todosEnemigos' },
    ],
    acciones: [{ tipo: 'golpe', pct: .50, elegir: 'todos' }],
  },

  // ---------------------------------------------------------------- Otras (personajes de prueba)
  bestia: {
    nombre: 'Bestia Carmesí', rareza: 'Raro', emoji: '🦂', color: 0xef4444, dur: 2,
    desc: 'Golpea 2 veces (35%) a un enemigo al azar y aplica Sangrado.',
    acciones: [{ tipo: 'golpe', pct: .35, golpes: 2, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'bleed' } }] }],
  },
  dragon: {
    nombre: 'Dragón', rareza: 'Común', emoji: '🐉', color: 0xf97316, dur: 3, max: 3,
    desc: 'Escupe fuego a un enemigo al azar: 30% + Quemadura 5% (2 rondas).',
    acciones: [{ tipo: 'golpe', pct: .30, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2 } }] }],
  },
};

// Tablas de invocación aleatoria (peso = probabilidad relativa)
export const TABLAS_INVOCACION = {
  sombras: [
    { key: 'iron', peso: 26 },
    { key: 'igris', peso: 26 },
    { key: 'shadowMingByung', peso: 18 },
    { key: 'kaisel', peso: 15 },
    { key: 'beru', peso: 9 },
    { key: 'bellion', peso: 5 },
    { key: 'kamish', peso: 1 },
  ],
};
