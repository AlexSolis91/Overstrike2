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
// elegir (golpes): 'menorHp' | 'azar' | 'todos' | 'masFuerte' · golpeExtraSi: <efecto> = un golpe más si el objetivo lo tiene
// enfoque: [x, y] (0–1) punto de la imagen que se centra en el medallón (por defecto la parte superior central)
// luminosa: true para imágenes con fondo negro (se dibujan en modo "pantalla": solo brilla lo claro)

export const INVOCACIONES = {
  // ---------------------------------------------------------------- Naruto
  clonSombra: {
    nombre: 'Clon de Sombra', rareza: 'Común', emoji: '🥷', color: 0xf97316, imagen: 'assets/invocaciones/clon-de-sombra.webp', dur: 2, max: 3,
    enfoque: [.40, .30],
    desc: 'Golpea 60% a un enemigo al azar.',
    acciones: [{ tipo: 'golpe', pct: .60, elegir: 'azar' }],
  },
  // ---------------------------------------------------------------- Sombras de Sun Jin Woo
  iron: {
    nombre: 'Iron', rareza: 'Común', emoji: '🛡️', color: 0x94a3b8, imagen: 'assets/invocaciones/iron.webp', dur: 2,
    enfoque: [.385, .245],   // dónde está la cara en la imagen (para el medallón)
    desc: 'Golpea 25% a un enemigo al azar y da un Escudo del 50% del HP máx. de Sun Jin Woo (1 ronda) al aliado más herido.',
    acciones: [
      { tipo: 'golpe', pct: .25, elegir: 'azar' },
      { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
    ],
  },
  igris: {
    nombre: 'Igris', rareza: 'Común', emoji: '🥷', color: 0x8b5cf6, imagen: 'assets/invocaciones/igris.webp', dur: 2,
    desc: 'Golpea 45% al enemigo con menos HP.',
    acciones: [{ tipo: 'golpe', pct: .45, elegir: 'menorHp' }],
  },
  shadowMingByung: {
    nombre: 'Shadow Ming Byung', rareza: 'Raro', emoji: '🙏', color: 0x38bdf8, imagen: 'assets/invocaciones/shadow-ming-byung.webp', dur: 2,
    enfoque: [.49, .2],
    desc: 'Cura 15% del HP máx. al aliado más herido. Al aparecer, limpia 1 debuff de cada aliado.',
    alAparecer: [{ tipo: 'limpiar', cantidad: 1, a: 'todosAliados' }],
    acciones: [{ tipo: 'curar', base: 'hpMaxObjetivo', pct: .15, a: 'aliadoMasHerido' }],
  },
  kaisel: {
    nombre: 'Kaisel', rareza: 'Raro', emoji: '🐉', color: 0x2563eb, imagen: 'assets/invocaciones/kaisel.webp', dur: 2,
    enfoque: [.29, .21],
    desc: 'Roba 5% del HP máx. de 2 enemigos al azar (puede repetir) y cura a su invocador lo robado.',
    acciones: [{ tipo: 'robarHP', pct: .05, a: { azar: 2 } }],
  },
  beru: {
    nombre: 'Beru', rareza: 'Épico', emoji: '🐜', color: 0xa855f7, imagen: 'assets/invocaciones/beru.webp', dur: 2,
    enfoque: [.37, .41],
    desc: 'Golpea 2 veces (30%) a un enemigo al azar. Cada golpe tiene 50% de probabilidad de aplicar Sangrado o Veneno (50/50).',
    acciones: [{ tipo: 'golpe', pct: .30, golpes: 2, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', idAzar: ['bleed', 'poison'], prob: .50 } }] }],
  },
  bellion: {
    nombre: 'Bellion', rareza: 'Épico', emoji: '⚔️', color: 0x7c3aed, imagen: 'assets/invocaciones/bellion.webp', dur: 2,
    enfoque: [.585, .19],
    desc: 'Golpea 35% al enemigo más fuerte. Al aparecer, tiene 60% de probabilidad de Aturdir a cada uno de hasta 3 enemigos distintos (cada uno con su tirada).',
    alAparecer: [{ tipo: 'efecto', id: 'stun', prob: .60, a: { distintos: 3 } }],
    acciones: [{ tipo: 'golpe', pct: .35, elegir: 'masFuerte' }],
  },
  tusk: {   // la sombra de Kargalgan, el chamán de los Altos Orcos (jefe final de la Horda): Sed de Sangre, Bola de Fuego y Barrera de Sangre
    nombre: 'Tusk', rareza: 'Épico', emoji: '🔮', color: 0xdc2626, imagen: 'assets/invocaciones/tusk.webp', dur: 2,
    enfoque: [.53, .17],
    desc: 'Lanza una Bola de Fuego a un enemigo al azar: 45% con 40% de probabilidad de Quemadura, y da a todos los aliados un Escudo (Barrera de Sangre) del 25% del HP máx. de Sun Jin Woo (1 ronda). Al aparecer, Sed de Sangre: todos los aliados ganan Celeridad y Frenesí (2 rondas).',
    alAparecer: [
      { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' },
      { tipo: 'efecto', id: 'frenzy', dur: 2, a: 'todosAliados' },
    ],
    acciones: [
      { tipo: 'golpe', pct: .45, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .40 } }] },
      { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 1, a: 'todosAliados' },
    ],
  },
  kamish: {
    nombre: 'Kamish', rareza: 'Legendario', emoji: '🐲', color: 0x9333ea, imagen: 'assets/invocaciones/kamish.webp', dur: 1,
    enfoque: [.44, .16],
    desc: 'Golpea 50% a todos los enemigos. Al aparecer, golpea 150% a todos y tiene 80% de probabilidad de aplicar Miedo (2 rondas) a cada uno.',
    alAparecer: [
      { tipo: 'golpe', pct: 1.50, elegir: 'todos' },
      { tipo: 'efecto', id: 'fear', dur: 2, prob: .80, a: 'todosEnemigos' },
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
  // ---------------------------------------------------------------- Domador de Lobos (Horda de Orcos)
  loboGuerra: {
    nombre: 'Lobo de Guerra', rareza: 'Común', emoji: '🐺', color: 0x78716c, imagen: 'assets/invocaciones/lobo-de-guerra.webp', dur: 3,
    enfoque: [.30, .55],
    desc: 'Muerde 80% al enemigo con menos HP, con 40% de probabilidad de Sangrado.',
    acciones: [{ tipo: 'golpe', pct: .80, elegir: 'menorHp', efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }] }],
  },
  // ---------------------------------------------------------------- Dragones de Daenerys Targaryen
  drogon: {
    nombre: 'Drogon', rareza: 'Legendario', emoji: '🐲', color: 0xdc2626, imagen: 'assets/invocaciones/drogon.webp', dur: 2,
    enfoque: [.565, .465],
    desc: 'Golpea 60% a un enemigo al azar; si tiene Quemadura, lo golpea una segunda vez.',
    acciones: [{ tipo: 'golpe', pct: .60, elegir: 'azar', golpeExtraSi: 'burn' }],
  },
  rhaegal: {
    nombre: 'Rhaegal', rareza: 'Común', emoji: '🐉', color: 0x16a34a, imagen: 'assets/invocaciones/rhaegal.webp', dur: 2,
    enfoque: [.565, .37],
    desc: '60% de probabilidad de aplicar Quemadura 2% (2 rondas) a cada enemigo. Si es más débil que la Quemadura que ya tienen, no alarga su duración.',
    acciones: [{ tipo: 'efecto', id: 'burn', valor: .02, dur: 2, noRenueva: true, prob: .60, a: 'todosEnemigos' }],
  },
  viserion: {
    nombre: 'Viserion', rareza: 'Épico', emoji: '🐉', color: 0xfde68a, imagen: 'assets/invocaciones/viserion.webp', dur: 2,
    enfoque: [.28, .665],
    desc: 'Reduce 1 turno el cooldown del Especial y del Over de Daenerys.',
    acciones: [{ tipo: 'reducirCooldown', cantidad: 1, categorias: ['especial', 'over'], a: 'propio' }],
  },
  // ---------------------------------------------------------------- Ozymandias
  esfingeWehemMesut: {
    nombre: 'Esfinge Wehem-Mesut', rareza: 'Épico', emoji: '🦁', color: 0xeab308, imagen: 'assets/invocaciones/esfinge-wehem-mesut.webp', dur: 2,
    enfoque: [.27, .45],
    desc: 'Golpea 50% al enemigo más fuerte y da Protección (+30% Resistencia, 1 ronda) al aliado más herido.',
    acciones: [
      { tipo: 'golpe', pct: .50, elegir: 'masFuerte' },
      { tipo: 'efecto', id: 'protect', dur: 1, a: 'aliadoMasHerido' },
    ],
  },
  // ---------------------------------------------------------------- Sasori
  tercerKazekage: {
    nombre: 'Marioneta del Tercer Kazekage', rareza: 'Épico', emoji: '🪆', color: 0x57534e, imagen: 'assets/invocaciones/tercer-kazekage.webp', dur: 3,
    enfoque: [.38, .20],
    desc: 'Arena de Hierro: golpea 60% a todos los enemigos con 60% de probabilidad de Veneno a cada uno.',
    acciones: [{ tipo: 'golpe', pct: .60, elegir: 'todos', efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .60 } }] }],
  },
  // ---------------------------------------------------------------- Camino Animal de Pain
  ciempiesGigante: {
    nombre: 'Ciempiés Gigante', rareza: 'Común', emoji: '🐛', color: 0xf97316, imagen: 'assets/invocaciones/ciempies-gigante.webp', dur: 2,
    enfoque: [.55, .55],
    desc: 'Se enrosca sobre un enemigo al azar: golpea 40% con 35% de probabilidad de Aturdirlo.',
    acciones: [{ tipo: 'golpe', pct: .40, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .35 } }] }],
  },
  camaleonGigante: {
    nombre: 'Camaleón Gigante', rareza: 'Común', emoji: '🦎', color: 0x4d7c0f, imagen: 'assets/invocaciones/camaleon-gigante.webp', dur: 2,
    enfoque: [.40, .45],
    desc: 'Al aparecer, oculta a Pain: gana Sigilo (2 rondas). Ataca invisible al enemigo con menos HP: 45%.',
    alAparecer: [{ tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' }],
    acciones: [{ tipo: 'golpe', pct: .45, elegir: 'menorHp' }],
  },
  bueyGigante: {
    nombre: 'Buey Gigante', rareza: 'Raro', emoji: '🐂', color: 0x78350f, imagen: 'assets/invocaciones/buey-gigante.webp', dur: 2,
    enfoque: [.45, .35],
    desc: 'Embiste al enemigo más fuerte: 70%.',
    acciones: [{ tipo: 'golpe', pct: .70, elegir: 'masFuerte' }],
  },
  rinoceronteGigante: {
    nombre: 'Rinoceronte Gigante', rareza: 'Raro', emoji: '🦏', color: 0x52525b, imagen: 'assets/invocaciones/rinoceronte-gigante.webp', dur: 2,
    enfoque: [.50, .35],
    desc: 'Arrasa el campo: golpea 30% a todos los enemigos. Al aparecer, da a Pain un Escudo del 50% de su HP máx. (2 rondas).',
    alAparecer: [{ tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'propio' }],
    acciones: [{ tipo: 'golpe', pct: .30, elegir: 'todos' }],
  },
  pajaroGigante: {
    nombre: 'Pájaro Taladro', rareza: 'Épico', emoji: '🦅', color: 0xeab308, imagen: 'assets/invocaciones/pajaro-gigante.webp', dur: 2,
    enfoque: [.35, .55],
    desc: 'Cae en picada con su pico taladro sobre un enemigo al azar: 55% con 40% de probabilidad de Debilitarlo (2 rondas).',
    acciones: [{ tipo: 'golpe', pct: .55, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .40 } }] }],
  },
  perroCerbero: {
    nombre: 'Perro Cerbero', rareza: 'Épico', emoji: '🐕', color: 0xc2410c, imagen: 'assets/invocaciones/perro-cerbero.webp', dur: 2, max: 3,
    enfoque: [.65, .35],
    desc: 'Muerde a un enemigo al azar: 35%. Después tiene 50% de probabilidad de dividirse: aparece otro Perro Cerbero (máx. 3).',
    acciones: [
      { tipo: 'golpe', pct: .35, elegir: 'azar' },
      { tipo: 'invocar', key: 'perroCerbero', prob: .50, a: 'propio' },
    ],
  },
  // ---------------------------------------------------------------- Monstruos de Marik Ishtar (tabla `monstruosMarik`; Ra solo con su Over)
  revivalJam: {
    nombre: 'Revival Jam', rareza: 'Común', emoji: '👻', color: 0x60a5fa, imagen: 'assets/invocaciones/revival-jam.webp', dur: 3,
    desc: 'Golpea 60% a un enemigo al azar y le aplica Agotar (2 rondas).',
    acciones: [{ tipo: 'golpe', pct: .60, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'agotar', dur: 2 } }] }],
  },
  slimeEgipcio: {
    nombre: 'Dios Egipcio de Slime', rareza: 'Común', emoji: '🫠', color: 0x94a3b8, imagen: 'assets/invocaciones/dios-egipcio-de-slime.webp', dur: 3,
    desc: 'Golpea 65% a un enemigo al azar y le baja 5 puntos de Puntería para toda la partida (acumulable hasta −25).',
    acciones: [{ tipo: 'golpe', pct: .65, elegir: 'azar', efectos: [{ accion: { tipo: 'reducirStat', stat: 'acc', valor: .05, tope: .25 } }] }],
  },
  ruedaPesadillas: {
    nombre: 'Rueda de las Pesadillas', rareza: 'Raro', emoji: '☸️', color: 0xa1a1aa, imagen: 'assets/invocaciones/rueda-de-las-pesadillas.webp', dur: 3, luminosa: true,
    desc: 'Golpea 65% a un enemigo al azar con 30% de probabilidad de Aturdirlo.',
    acciones: [{ tipo: 'golpe', pct: .65, elegir: 'azar', efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .30 } }] }],
  },
  cofrePesadillas: {
    nombre: 'Cofre de las Pesadillas', rareza: 'Raro', emoji: '🧰', color: 0xa855f7, imagen: 'assets/invocaciones/cofre-de-las-pesadillas.webp', dur: 3,
    desc: 'Golpea 60% a un enemigo al azar. Al aparecer: 50% de probabilidad de Confundir (2 rondas) a 2 enemigos al azar.',
    alAparecer: [{ tipo: 'efecto', id: 'confuse', dur: 2, prob: .50, a: { distintos: 2 } }],
    acciones: [{ tipo: 'golpe', pct: .60, elegir: 'azar' }],
  },
  lavaGolem: {
    nombre: 'Lava Golem', rareza: 'Épico', emoji: '🌋', color: 0xf97316, imagen: 'assets/invocaciones/lava-golem.webp', dur: 3,
    desc: 'Golpea 75% a un enemigo al azar. Al aparecer: daño igual al 5% de la suma del HP máx. de los enemigos, repartido al azar entre ellos.',
    alAparecer: [{ tipo: 'danoRepartido', base: 'hpMaxEnemigos', pct: .05, paquetes: 10 }],
    acciones: [{ tipo: 'golpe', pct: .75, elegir: 'azar' }],
  },
  huevoSol: {
    nombre: 'Huevo del Sol', rareza: 'Épico', emoji: '🥚', color: 0xfbbf24, imagen: 'assets/invocaciones/huevo-del-sol.webp', dur: 3,
    desc: 'No ataca. Al aparecer: 60% de probabilidad de aplicar Quemadura Solar (2 rondas) a cada enemigo. El Canto del Dios del Sol lo sacrifica para invocar al Dragón Alado de Ra.',
    alAparecer: [{ tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60, a: 'todosEnemigos' }],
    acciones: [],
  },
  raAlado: {
    nombre: 'Dragón Alado de Ra', rareza: 'Legendario', emoji: '🐉', color: 0xfacc15, imagen: 'assets/invocaciones/dragon-alado-de-ra.webp', dur: 3, luminosa: true, protegida: true,
    desc: 'Golpea 100% a cada enemigo. Si golpea a alguno con Quemadura Solar, dura 1 turno más (1 vez por turno). Solo aparece con el Canto del Dios del Sol y ninguna otra invocación lo reemplaza.',
    acciones: [{ tipo: 'golpe', pct: 1.00, elegir: 'todos', extenderSi: 'solarBurn' }],
  },
};

// Tablas de invocación aleatoria (peso = probabilidad relativa)
export const TABLAS_INVOCACION = {
  dragones: [
    { key: 'rhaegal', peso: 40 },
    { key: 'viserion', peso: 35 },
    { key: 'drogon', peso: 25 },
  ],
  monstruosMarik: [
    { key: 'revivalJam', peso: 24 },
    { key: 'slimeEgipcio', peso: 24 },
    { key: 'ruedaPesadillas', peso: 18 },
    { key: 'cofrePesadillas', peso: 16 },
    { key: 'lavaGolem', peso: 10 },
    { key: 'huevoSol', peso: 8 },
  ],
  animalesPain: [
    { key: 'ciempiesGigante', peso: 22 },
    { key: 'camaleonGigante', peso: 22 },
    { key: 'bueyGigante', peso: 18 },
    { key: 'rinoceronteGigante', peso: 16 },
    { key: 'pajaroGigante', peso: 12 },
    { key: 'perroCerbero', peso: 10 },
  ],
  sombras: [
    { key: 'iron', peso: 26 },
    { key: 'igris', peso: 26 },
    { key: 'shadowMingByung', peso: 18 },
    { key: 'kaisel', peso: 15 },
    { key: 'beru', peso: 9 },
    { key: 'tusk', peso: 7 },
    { key: 'bellion', peso: 5 },
    { key: 'kamish', peso: 1 },
  ],
};
