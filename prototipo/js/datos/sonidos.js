// Registro universal de SONIDOS. Cada evento del juego tiene un nombre; si ese nombre tiene archivo aquí, suena.
// Los eventos sin archivo quedan en silencio. Para agregar un sonido: copiar el archivo a assets/audio/sfx/ y
// agregar una línea abajo con el nombre del evento.
//
// Opcionales: v (volumen 0–1), dur (segundos máx.; corta con desvanecimiento), var (variación de tono al azar, 0.05 = ±5%),
//             gap (ms mínimos entre repeticiones del mismo sonido), duck (segundos que baja la música mientras suena).
//
// EVENTOS DISPONIBLES
//   Interfaz:     clic (cualquier botón) · elegir · quitar (galería) · listo · abrir · cerrar (paneles)
//   Movimientos:  melee · lanzar · magia (apoyo) · area · over
//   Impactos:     golpe · critico · escudoGolpe (golpe que solo da al Escudo) · efectoDano (daño por efecto) · bloqueo · quiebre (hielo) · esquiva · muerte
//   Curación:     curacion · escudo (Escudo de HP) · robo (robo de HP)
//   Daño por turno: quemadura · veneno · sangrado · solar (Quemadura Solar) · explosion (Bomba)
//   Efectos:      buff · debuff · resistido · limpiar · disipar · aturdir · congelar · silenciar
//   Turnos:       pierdeTurno · pierdeTurnoHielo · turnoExtra · ronda
//   Momentos:     transformacion · invocacion · invocacionLegendaria · pasiva · lider · sigiloRoto

// Música de fondo (assets/audio/)
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

const sfx = n => `assets/audio/sfx/${n}.mp3`;
export const SONIDOS = {
  clic:                 { archivo: sfx('boton'), v: .8, gap: 30 },
  golpe:                { archivo: sfx('golpe'), v: .85, var: .05, gap: 35 },
  critico:              { archivo: sfx('golpe'), v: 1, var: .03 },
  escudoGolpe:          { archivo: sfx('golpe'), v: .55, var: .05, gap: 35 },
  curacion:             { archivo: sfx('curacion'), v: .85, gap: 120 },
  escudo:               { archivo: sfx('escudo'), v: .9, gap: 120 },
  quemadura:            { archivo: sfx('quemadura'), v: .9, gap: 60 },
  veneno:               { archivo: sfx('veneno'), v: .9, dur: 1.6, gap: 60 },
  congelar:             { archivo: sfx('hielo'), v: .9 },
  pierdeTurnoHielo:     { archivo: sfx('hielo'), v: .9 },
  transformacion:       { archivo: sfx('transformacion'), v: 1, duck: 2.6 },
  invocacion:           { archivo: sfx('invocacion'), v: .85 },
  invocacionLegendaria: { archivo: sfx('invocacion'), v: 1, duck: 1.6 },
};
