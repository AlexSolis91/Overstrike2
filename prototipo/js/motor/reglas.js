// Reglas numéricas globales de Overstrike 2. Cambiar un valor aquí lo cambia para TODO el juego.

// Estadísticas secundarias con las que empiezan todos los personajes (la ficha suma "extra" encima).
export const BASE_COMUN = {
  critRate: .05, critDmg: .50,
  acc: 0, res: .50,
  armor: 0, block: 0, dot: 0, pen: 0,
};

export const TOPES = { block: .50, armor: .75 };

// Tirada de debuffs (estilo Raid): si la Puntería alcanza a la Resistencia, el debuff entra siempre;
// si no, la probabilidad baja 1% por cada punto de diferencia, sin bajar del mínimo.
export const PUNTERIA = { minimo: .10 };
export const probAplicar = (acc, res) => acc >= res ? 1 : Math.max(PUNTERIA.minimo, 1 - (res - acc));

// Escalado de movimientos: primero se calcula el "Daño base" y luego se aplica el % del movimiento.
export const ESCALADO = {
  dano: s => s.dmg,
  hp:   s => s.hp / 15,
  vel:  s => s.spd * .75,
  hpMax: s => s.hp,        // para curas/escudos "X% del HP máx."
};

// Cooldown con el que empieza cada categoría (baja 1 al final de cada ronda).
// Over = 2 -> disponible a partir de la ronda 3.
export const CD_INICIAL = { basico: 0, especial: 0, over: 2 };

// Valores fijos de buffs universales
export const BUFFS = {
  furia: .50,          // Furia: +50% Daño
  proteccion: .30,     // Protección: +30% Resistencia
  regeneracion: .10,   // Regeneración: cura 10% del HP máx. al inicio del turno del portador
  frenesi: .50,        // Frenesí: +50% Prob. Crítico (puntos)
  celeridad: .20,      // Celeridad: +20% Velocidad
  letalidad: .30,      // Letalidad: +30% Daño Crítico (puntos)
  agudeza: .50,        // Agudeza: +50% Puntería (puntos)
  perforacion: .50,    // Perforación: +50% Penetración de escudo (puntos; tope 100%)
};

// Valores fijos de debuffs universales
export const DEBUFFS = {
  debilitar: .50,      // Debilitar: +50% de daño recibido (después de la Armadura)
  ceguera: .50,        // Ceguera: −50 puntos de Puntería
  desgaste: .05,       // Desgaste: −5 puntos de Armadura al aplicarse y por cada golpe recibido...
  desgasteMax: .25,    // ...hasta −25 puntos
  pesteNegra: .05,     // Peste Negra: −5% del HP máx. original al final de cada turno del portador...
  pesteNegraPiso: .25, // ...sin bajar del 25% del HP máx. original
};

export const CONTROL = {
  quiebreCongelacion: .08,   // +daño del golpe que rompe una capa de hielo
  congelacionVel: .25,       // Congelación: −25% Velocidad (Mega: el doble) mientras dure el debuff
  durCongelacion: 2,
  miedoDano: .75,            // un personaje con Miedo hace 75% del daño
  confusionProb: .50,        // probabilidad de que un movimiento confundido cambie de objetivo
  pierdeTurno: ['stun', 'freeze', 'possess'],   // controles que quitan turnos (y dan inmunidad al terminar)
};

export const DOT = {
  // Valores provisionales hasta tener la lista de reliquias (máximo real de Daño DoT)
  veneno: dot => .02 + .05 * dot,
  sangrado: dot => .03 + .10 * dot,
  bomba: dot => .20 * (1 + dot),
  quemadura: (base, dot) => base * (1 + dot),
  maxVeneno: 5, durVeneno: 3,
  maxBombas: 3, contadorBomba: 2, salpicaduraBomba: .25,
  hemorragiaProb: .30, hemorragiaCrece: .01,
  quemaduraSuma: .10,         // una quemadura nueva suma el 10% de la más débil
};
