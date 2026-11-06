// Novedades del juego ("Qué cambió"): la más reciente PRIMERO. Al entrar, si el jugador no ha visto la primera, se le muestra.
// Agregar una entrada nueva arriba con cada publicación que cambie algo que el jugador note (reglas, campeones, pantallas).
// tipo: 'nuevo' (contenido nuevo), 'cambio' (reglas o balance), 'mejora' (interfaz / arreglos)
export const NOVEDADES = [
  {
    id: '2026-11-06', fecha: '6 de noviembre de 2026', titulo: 'Veneno, Congelación y Jefe de Raid',
    cambios: [
      { tipo: 'cambio', texto: '🧪 Veneno escalonado: las acumulaciones ya no se suman. El daño es el Veneno más alto ×1.5 por cada acumulación extra (3 Venenos = ×2.25). Tope de 10 acumulaciones; con Orochimaru, 12.' },
      { tipo: 'cambio', texto: '❄️ Congelación contra inmunes al Control: ahora les entra sin hielo. Nunca pierden el turno, pero sí bajan su Velocidad (−25%, o −50% con Mega). Quien es inmune a la Congelación en concreto la sigue bloqueando.' },
      { tipo: 'cambio', texto: '👑 Jefe de Raid: su Resistencia sube con la dificultad: Fácil 50%, Normal 75%, Difícil 100%, Brutal 125%, Pesadilla 150%. Sube tu Puntería para que tus debuffs entren siempre.' },
      { tipo: 'cambio', texto: '🐒 Wukong: revive al final de la ronda siguiente a la que murió, con todo su HP, y sin límite de veces.' },
      { tipo: 'cambio', texto: '🐍 Loki: Glorioso Propósito ahora da Espejismo a todos sus aliados (devuelven el 30% de cada golpe).' },
      { tipo: 'cambio', texto: '🐍 Orochimaru: Muda de Piel cura 5% de su HP máx. cada vez que un Veneno hace daño, sin límite por ronda.' },
      { tipo: 'mejora', texto: '🧰 Los cofres del Jefe de Raid tienen nombre (Madera, Plata, Oro y Arcano) y los de Madera y Plata ya tienen su imagen.' },
      { tipo: 'mejora', texto: '🔥 Madara estrena ilustración, y los Uchiha ahora se llaman solo por su nombre: Madara, Itachi, Obito y Sasuke.' },
      { tipo: 'mejora', texto: '💬 Las confirmaciones y avisos ahora aparecen en una ventana del juego, no del navegador.' },
      { tipo: 'mejora', texto: '📱 Celular: al armar tu equipo ya se ven los 5 lugares y el botón 🎲; en batalla vertical la barra de turnos ya no queda tapada; el Jefe de Raid ya no se sale de la pantalla (dificultades, barra de HP y reloj visibles); las tablas de la Arena y del Raid se deslizan de lado, y el botón de Venganza siempre está a la vista.' },
    ],
  },
  {
    id: '2026-11-05', fecha: '5 de noviembre de 2026', titulo: 'Superman y Satoru Gojō',
    cambios: [
      { tipo: 'nuevo', texto: '🦸 Superman (Daño · Tanque) llega al sobre Unbreakable Force: protege a sus aliados de los críticos y guarda Energía Solar para su Superflare.' },
      { tipo: 'nuevo', texto: '🕶️ Satoru Gojō (Control · Daño) llega al sobre Unbreakable Force: su Expansión de Dominio aturde al equipo enemigo varias rondas.' },
      { tipo: 'mejora', texto: '🔎 Colección: nuevo filtro por buffs y debuffs.' },
    ],
  },
];
