// Registro universal de SONIDOS. Cada evento del juego usa uno de estos; un personaje o efecto nuevo suena solo.
//
// Cada sonido se genera por código (sintetizador del navegador) con "capas":
//   { o: 'tono',  forma: 'sine'|'triangle'|'square'|'sawtooth', f: [inicio, fin] Hz, d: duración s, v: volumen, t: retraso s }
//   { o: 'ruido', filtro: 'lowpass'|'highpass'|'bandpass', f: [inicio, fin] Hz, q, d, v, t }
// Opcionales del sonido: var (variación de tono al azar, 0.06 = ±6%), duck (baja la música unos segundos), gap (ms mínimos entre repeticiones).
// Para usar un ARCHIVO real en lugar del sintetizado: archivo: 'assets/audio/sfx/golpe.mp3'
//   con archivo, opcionales: v (volumen 0–1), dur (segundos máx.; corta con desvanecimiento), var (variación de velocidad/tono)

// Música: si el archivo no existe todavía, esa pista simplemente no suena (Victoria/Derrota usan su versión sintetizada).
export const MUSICA = {
  menu: 'assets/audio/menu.mp3',
  batalla: [                       // temas de partida: en cada partida se elige uno al azar
    'assets/audio/batalla-1.mp3',  // Jinwoo Saves A-Rank Team (Solo Leveling)
    'assets/audio/batalla-2.mp3',  // Battle Theme #2 (Yu-Gi-Oh! Master Duel)
    'assets/audio/batalla-3.mp3',  // Keycard Theme #5 (Yu-Gi-Oh! Master Duel)
  ],
  victoria: 'assets/audio/victoria.mp3',
  derrota: 'assets/audio/derrota.mp3',
};

const arpegio = (notas, { forma = 'sine', d = .14, paso = .07, v = .1, t = 0 } = {}) =>
  notas.map((n, i) => ({ o: 'tono', forma, f: [n, n], d, v, t: t + i * paso }));

export const SONIDOS = {
  // ---------------------------------------------------------------- interfaz
  clic:   { gap: 30, capas: [{ o: 'tono', forma: 'triangle', f: [900, 700], d: .05, v: .12 }] },
  elegir: { capas: [{ o: 'tono', forma: 'triangle', f: [520, 780], d: .09, v: .16 }, { o: 'tono', forma: 'sine', f: [780, 1040], d: .08, v: .1, t: .05 }] },
  quitar: { capas: [{ o: 'tono', forma: 'triangle', f: [600, 380], d: .1, v: .15 }] },
  listo:  { capas: arpegio([523, 659, 784, 1046], { forma: 'triangle', d: .16, v: .13 }) },
  abrir:  { capas: [{ o: 'ruido', filtro: 'highpass', f: [1500, 4000], d: .12, v: .06 }, { o: 'tono', forma: 'sine', f: [400, 700], d: .1, v: .07 }] },
  cerrar: { capas: [{ o: 'tono', forma: 'sine', f: [700, 400], d: .09, v: .07 }] },

  // ---------------------------------------------------------------- movimientos
  melee:  { var: .08, capas: [{ o: 'ruido', filtro: 'bandpass', f: [2500, 600], q: 1, d: .14, v: .18 }] },
  lanzar: { var: .08, capas: [{ o: 'ruido', filtro: 'bandpass', f: [800, 3000], q: 1, d: .18, v: .12 }, { o: 'tono', forma: 'sine', f: [300, 600], d: .15, v: .06 }] },
  magia:  { var: .05, capas: [{ o: 'tono', forma: 'sine', f: [600, 1200], d: .25, v: .08 }, { o: 'tono', forma: 'sine', f: [900, 1800], d: .25, v: .05, t: .05 }] },
  area:   { capas: [{ o: 'ruido', filtro: 'bandpass', f: [400, 2200], q: .8, d: .35, v: .2 }] },
  over:   { duck: 1.4, capas: [{ o: 'ruido', filtro: 'lowpass', f: [3000, 60], d: .9, v: .4 }, { o: 'tono', forma: 'sawtooth', f: [55, 40], d: .9, v: .16 }, { o: 'tono', forma: 'square', f: [220, 880], d: .45, v: .05 }] },

  // ---------------------------------------------------------------- impactos
  golpe:   { var: .07, gap: 35, capas: [{ o: 'ruido', filtro: 'lowpass', f: [1800, 300], d: .12, v: .3 }, { o: 'tono', forma: 'triangle', f: [180, 60], d: .12, v: .26 }] },
  critico: { var: .05, capas: [{ o: 'ruido', filtro: 'lowpass', f: [2600, 250], d: .18, v: .38 }, { o: 'tono', forma: 'triangle', f: [200, 50], d: .18, v: .3 }, { o: 'tono', forma: 'square', f: [880, 220], d: .18, v: .1 }, { o: 'ruido', filtro: 'bandpass', f: [3000, 800], q: 1, d: .15, v: .16 }] },
  efectoDano: { var: .07, gap: 35, capas: [{ o: 'ruido', filtro: 'bandpass', f: [1400, 400], q: 1, d: .12, v: .18 }] },
  bloqueo: { capas: [{ o: 'tono', forma: 'square', f: [300, 280], d: .06, v: .14 }, { o: 'tono', forma: 'triangle', f: [1200, 1150], d: .16, v: .1 }, { o: 'ruido', filtro: 'highpass', f: [3000, 3000], d: .05, v: .12 }] },
  escudoGolpe: { var: .05, gap: 35, capas: [{ o: 'tono', forma: 'sine', f: [1400, 900], d: .2, v: .1 }, { o: 'ruido', filtro: 'bandpass', f: [5000, 2000], q: 1, d: .1, v: .08 }] },
  quiebre: { capas: [{ o: 'ruido', filtro: 'highpass', f: [6000, 2500], d: .25, v: .22 }, { o: 'tono', forma: 'triangle', f: [2000, 2600], d: .12, v: .08 }, { o: 'tono', forma: 'triangle', f: [2400, 3000], d: .12, v: .06, t: .05 }] },
  esquiva: { capas: [{ o: 'ruido', filtro: 'bandpass', f: [3000, 1200], q: 1, d: .15, v: .1 }] },
  muerte:  { duck: .8, capas: [{ o: 'tono', forma: 'sawtooth', f: [300, 60], d: .7, v: .1 }, { o: 'ruido', filtro: 'lowpass', f: [800, 100], d: .6, v: .18 }] },

  // ---------------------------------------------------------------- curación y escudos
  curacion: { gap: 60, capas: [...arpegio([523, 659, 784], { d: .15, v: .08 }), { o: 'ruido', filtro: 'highpass', f: [6000, 8000], d: .3, v: .03 }] },
  escudo:   { gap: 60, capas: [{ o: 'tono', forma: 'triangle', f: [300, 600], d: .25, v: .12 }, { o: 'tono', forma: 'sine', f: [600, 1200], d: .3, v: .06, t: .05 }] },
  robo:     { capas: [{ o: 'tono', forma: 'sawtooth', f: [200, 500], d: .25, v: .05 }, { o: 'tono', forma: 'sine', f: [400, 800], d: .25, v: .06 }] },

  // ---------------------------------------------------------------- daño por turno (DoT)
  quemadura:  { gap: 60, archivo: 'assets/audio/sfx/quemadura.mp3', v: .9, capas: [{ o: 'ruido', filtro: 'bandpass', f: [1200, 700], q: 2, d: .25, v: .18 }, { o: 'ruido', filtro: 'highpass', f: [4000, 4000], d: .2, v: .04 }] },
  veneno:     { gap: 60, archivo: 'assets/audio/sfx/veneno.mp3', dur: 1.6, v: .9, capas: [{ o: 'tono', forma: 'sine', f: [300, 180], d: .15, v: .1 }, { o: 'tono', forma: 'sine', f: [420, 250], d: .15, v: .08, t: .08 }] },
  sangrado:   { gap: 60, capas: [{ o: 'ruido', filtro: 'lowpass', f: [900, 200], d: .2, v: .2 }, { o: 'tono', forma: 'sine', f: [120, 70], d: .2, v: .16 }] },
  solar:      { gap: 60, capas: [{ o: 'tono', forma: 'square', f: [660, 330], d: .25, v: .06 }, { o: 'ruido', filtro: 'highpass', f: [5000, 5000], d: .2, v: .05 }] },
  explosion:  { duck: .8, capas: [{ o: 'ruido', filtro: 'lowpass', f: [2500, 80], d: .7, v: .42 }, { o: 'tono', forma: 'sine', f: [90, 30], d: .6, v: .38 }] },

  // ---------------------------------------------------------------- buffs, debuffs y control
  buff:     { gap: 50, capas: [{ o: 'tono', forma: 'sine', f: [440, 880], d: .2, v: .1 }, { o: 'tono', forma: 'sine', f: [660, 1320], d: .2, v: .06, t: .06 }] },
  debuff:   { gap: 50, capas: [{ o: 'tono', forma: 'triangle', f: [520, 220], d: .25, v: .12 }, { o: 'tono', forma: 'square', f: [260, 110], d: .25, v: .04 }] },
  resistido: { gap: 50, capas: [{ o: 'tono', forma: 'triangle', f: [200, 180], d: .08, v: .12 }, { o: 'ruido', filtro: 'lowpass', f: [800, 800], d: .06, v: .08 }] },
  limpiar:  { capas: [{ o: 'ruido', filtro: 'highpass', f: [2000, 9000], d: .35, v: .08 }, { o: 'tono', forma: 'sine', f: [800, 1600], d: .3, v: .06 }] },
  disipar:  { capas: [{ o: 'ruido', filtro: 'bandpass', f: [6000, 600], q: 1, d: .35, v: .1 }, { o: 'tono', forma: 'sine', f: [1200, 400], d: .3, v: .06 }] },
  aturdir:  { capas: arpegio([700, 560, 700, 560], { forma: 'sine', d: .09, paso: .08, v: .08 }) },
  congelar: { capas: [{ o: 'tono', forma: 'triangle', f: [1800, 2400], d: .2, v: .08 }, { o: 'tono', forma: 'triangle', f: [2600, 3200], d: .25, v: .06, t: .05 }, { o: 'ruido', filtro: 'highpass', f: [7000, 7000], d: .3, v: .05 }] },
  silenciar: { capas: [{ o: 'ruido', filtro: 'lowpass', f: [1200, 150], d: .3, v: .12 }, { o: 'tono', forma: 'sine', f: [400, 200], d: .25, v: .06 }] },
  pierdeTurno: { capas: [{ o: 'tono', forma: 'square', f: [160, 120], d: .25, v: .06 }, { o: 'tono', forma: 'square', f: [150, 110], d: .25, v: .05, t: .12 }] },

  // ---------------------------------------------------------------- momentos
  ronda:     { duck: 1.2, capas: [{ o: 'tono', forma: 'sine', f: [110, 105], d: 1.2, v: .3 }, { o: 'tono', forma: 'sine', f: [220, 210], d: .9, v: .12 }, { o: 'tono', forma: 'sine', f: [330, 325], d: .6, v: .06 }, { o: 'ruido', filtro: 'lowpass', f: [400, 100], d: .3, v: .16 }] },
  transformacion: { duck: 1.6, capas: [{ o: 'tono', forma: 'sawtooth', f: [110, 880], d: 1, v: .08 }, { o: 'ruido', filtro: 'bandpass', f: [300, 5000], q: 1, d: 1, v: .12 }, { o: 'tono', forma: 'sine', f: [880, 880], d: .5, v: .1, t: .9 }] },
  invocacion: { capas: [...arpegio([392, 523, 659, 784], { d: .3, v: .08 }), { o: 'ruido', filtro: 'highpass', f: [5000, 8000], d: .5, v: .04 }] },
  invocacionLegendaria: { duck: 1.6, capas: [{ o: 'tono', forma: 'sine', f: [80, 60], d: 1.2, v: .3 }, { o: 'ruido', filtro: 'lowpass', f: [1500, 80], d: .8, v: .3 }, ...arpegio([392, 523, 659, 784, 1046], { forma: 'triangle', d: .35, v: .09, t: .1 })] },
  turnoExtra: { capas: arpegio([523, 784, 1046], { forma: 'square', d: .09, paso: .06, v: .06 }) },
  pasiva:    { gap: 80, capas: [{ o: 'tono', forma: 'sine', f: [1046, 1046], d: .15, v: .05 }, { o: 'tono', forma: 'sine', f: [1568, 1568], d: .2, v: .04, t: .05 }] },
  lider:     { capas: arpegio([392, 523], { d: .25, paso: .1, v: .07 }) },
  sigiloRoto: { capas: [{ o: 'tono', forma: 'sine', f: [900, 300], d: .2, v: .07 }, { o: 'ruido', filtro: 'highpass', f: [4000, 4000], d: .1, v: .05 }] },
  victoria:  { duck: 4, capas: [...arpegio([523, 659, 784, 1046], { forma: 'triangle', d: .2, paso: .12, v: .13 }), { o: 'tono', forma: 'triangle', f: [1318, 1318], d: 1, v: .13, t: .5 }, { o: 'tono', forma: 'sine', f: [659, 659], d: 1, v: .08, t: .5 }] },
  derrota:   { duck: 4, capas: [...arpegio([392, 370, 311], { forma: 'triangle', d: .3, paso: .3, v: .12 }), { o: 'tono', forma: 'triangle', f: [262, 247], d: 1.2, v: .12, t: .9 }, { o: 'tono', forma: 'sine', f: [131, 123], d: 1.2, v: .1, t: .9 }] },
};
