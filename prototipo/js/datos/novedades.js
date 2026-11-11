// Novedades del juego ("Qué cambió"): la más reciente PRIMERO. Al entrar, si el jugador no ha visto la primera, se le muestra.
// Agregar una entrada nueva arriba con cada publicación que cambie algo que el jugador note (reglas, campeones, pantallas).
// tipo: 'nuevo' (contenido nuevo), 'cambio' (reglas o balance), 'mejora' (interfaz / arreglos)
export const NOVEDADES = [
  {
    id: '2026-11-11c', fecha: '11 de noviembre de 2026', titulo: 'Tutorial con Thestalos',
    cambios: [
      { tipo: 'nuevo', texto: '🛡️ Thestalos, Guardián del Portal, ahora guía a los jugadores nuevos: Starter Pack, una primera batalla explicada paso a paso y un recorrido por todo el menú. Al terminarlo regala 50,000 de oro y 3 Runas de Portal (una vez por cuenta).' },
      { tipo: 'nuevo', texto: '🎓 La primera vez que entras a la Campaña, la Horda, el Jefe de Raid, la Arena, la Tienda, la Colección o las Misiones, Thestalos te explica cómo funciona. Puedes repetir el tutorial desde tu perfil (👤).' },
    ],
  },
  {
    id: '2026-11-11b', fecha: '11 de noviembre de 2026', titulo: 'Formas de Luke y tienda de la Horda',
    cambios: [
      { tipo: 'mejora', texto: '🟢 Luke: la forma que eliges (Djem So, Soresu o Ataru) ahora dura una ronda completa, hasta su siguiente turno, aunque Luke actúe último en la ronda. Al elegir una nueva, reemplaza a la anterior.' },
      { tipo: 'cambio', texto: '🏅 Tienda de la Horda: las reliquias Raras ahora cuestan 80 Trofeos (antes 60) y las Especiales 400 (antes 300). Las Comunes ya no se venden.' },
    ],
  },
  {
    id: '2026-11-11', fecha: '11 de noviembre de 2026', titulo: 'Nueva transformación: Dark Wukong',
    cambios: [
      { tipo: 'nuevo', texto: '🔥 Wukong: cada vez que revive tiene 30% de probabilidad de volver como Dark Wukong (Transformación Sombría). Al transformarse da Mega Aturdimiento a hasta 3 enemigos al azar (siempre entra) y causa daño triple con todos sus movimientos. Si Dark Wukong cae, vuelve a ser Wukong y al revivir se tira de nuevo.' },
    ],
  },
  {
    id: '2026-11-10c', fecha: '10 de noviembre de 2026', titulo: 'Nuevo campeón: Luke Skywalker',
    cambios: [
      { tipo: 'nuevo', texto: '🟢 Luke Skywalker, el Último Jedi (Tanque · Soporte), en el sobre Legendary Warriors. Duplica su Bloqueo y, al inicio de cada turno, eliges su forma: Djem So (Letalidad y Frenesí), Soresu (Fortaleza y Escudo) o Ataru (Celeridad y Esquivar). Cura, limpia debuffs y castiga por cada uno, y su Proyección Astral lo vuelve inmune mientras da formas a todo el equipo. Como líder, cada debuff que reciben tus aliados les sube +5% de HP máx.' },
      { tipo: 'mejora', texto: '🟢 Luke: los buffs de la forma que eliges (Djem So, Soresu o Ataru) se aplican en cuanto la eliges, antes de escoger su movimiento.' },
      { tipo: 'nuevo', texto: '✨ Buffs nuevos: 🪨 Fortaleza (+20% Armadura), 🌀 Esquivar (50% de esquivar cada golpe) y 🎯 Mega Provocación (los ataques de área enemigos solo lo alcanzan a él).' },
    ],
  },
  {
    id: '2026-11-10b', fecha: '10 de noviembre de 2026', titulo: 'Nuevo campeón: Obi-Wan Kenobi',
    cambios: [
      { tipo: 'nuevo', texto: '🛡️ Obi-Wan Kenobi, Maestro del Soresu (Tanque · Control), en el sobre Legendary Warriors. Contraataque y Provocación permanentes; cada golpe que recibe le da Soresu (+Armadura y +Bloqueo). Su Especial escuda a todo el equipo y le sube el HP máx., y su Over consume el Soresu para aturdir. Como líder (General Kenobi), su equipo recibe −15% de daño y, cada vez que bloquea, todos bajan el cooldown de un movimiento.' },
    ],
  },
  {
    id: '2026-11-10', fecha: '10 de noviembre de 2026', titulo: 'Espacios de reliquias solo con oro',
    cambios: [
      { tipo: 'cambio', texto: '💎 Los espacios extra de reliquias (Arma 2, Equipación 2 y Accesorio 2) ahora solo se abren con oro: 100,000 / 500,000 / 1,000,000. Ya no se pagan con copias del campeón; úsalas para ascender o desfragmentar.' },
    ],
  },
  {
    id: '2026-11-08c', fecha: '8 de noviembre de 2026', titulo: 'Horda por temporadas y Ticket Dorado',
    cambios: [
      { tipo: 'nuevo', texto: '🏆 Horda: ahora hay récord de temporada (dura lo mismo que la temporada de la Arena) y récord histórico. Todos los récords empezaron de cero y las partidas abiertas se cerraron (te devolvimos su Runa de Portal). Los premios de "Primera vez" se conservan.' },
      { tipo: 'nuevo', texto: '🎫 Ticket Dorado: abre gratis un sobre Relics of Power. Al cerrar cada temporada, los jugadores con récord en la Horda ganan Tickets según su puesto: 1º 10, 2º 8, 3º 6, 4º–10º 4, 11º–25º 3, 26º–50º 2 y el resto 1.' },
      { tipo: 'cambio', texto: '🎯 La misión "Supera la ronda 30 contra el Jefe de Raid" ahora da 1 Ticket Dorado (antes no daba el sobre que prometía).' },
      { tipo: 'cambio', texto: '⚡ Horda: cada 3 oleadas, cada enemigo sube +1 o +2 (al azar) su Velocidad base.' },
      { tipo: 'cambio', texto: '⚔️ Iori y Scorpion: su contraataque ahora es el buff Contraataque (como Anakin): responden con su Básico a cada ataque enemigo, sin límite por ronda. Scorpion ya no necesita que el atacante tenga Quemadura.' },
    ],
  },
  {
    id: '2026-11-08b', fecha: '8 de noviembre de 2026', titulo: 'Jefe de Raid: un ataque por campeón al día',
    cambios: [
      { tipo: 'cambio', texto: '👑 Jefe de Raid: cada campeón puede atacar al jefe una sola vez por día, en cualquier dificultad. Los que ya atacaron aparecen bloqueados 🔒 al armar tu equipo y vuelven a estar listos al cerrar el día. ¡Desarrolla varios equipos!' },
      { tipo: 'mejora', texto: '🛒 Tienda más limpia: los sobres ya no muestran cuántos campeones tienen (salvo Unbreakable Force), y Relics of Power ya no muestra el conteo de sobres.' },
    ],
  },
  {
    id: '2026-11-08', fecha: '8 de noviembre de 2026', titulo: 'Corrección del Jefe de Raid',
    cambios: [
      { tipo: 'mejora', texto: '🔎 Colección: cada campeón muestra en qué sobres sale (Obtención, con la imagen de cada sobre), y al revisar una reliquia para equipar ves qué campeón la tiene puesta.' },
      { tipo: 'mejora', texto: '🔒 ¿Te falta un campeón? Pasa el cursor sobre él en la Colección (o tócalo en el celular) para ver en qué sobres sale.' },
      { tipo: 'mejora', texto: '🛠️ Corregimos un error por el que algunos ataques al Jefe de Raid se registraban con 0 de daño: el servidor repetía la batalla y, en ciertas jugadas al azar (como a quién revive Edo Tensei), le salía distinta que en tu pantalla. Si te pasó, avísale al administrador.' },
    ],
  },
  {
    id: '2026-11-07d', fecha: '7 de noviembre de 2026', titulo: 'Legendary Warriors y sobres reacomodados',
    cambios: [
      { tipo: 'nuevo', texto: '⚔️ Legendary Warriors: el sobre de los héroes y guerreros legendarios (Goku, Vegeta, Naruto, He-Man, Superman, Gojō, Broly y más).' },
      { tipo: 'cambio', texto: '🎴 Sobres reacomodados: Phantom of Chaos queda con sus 17 campeones más oscuros; los de Veneno, Quemadura y Congelación se encuentran en sus sobres. Iori, Sasuke, Superman, Yorichi, Escanor y Marik se suman a Lords of the Flames y Blazing Legion. Todos los campeones tienen ya su sobre.' },
    ],
  },
  {
    id: '2026-11-07c', fecha: '7 de noviembre de 2026', titulo: 'Sobres temáticos y 3 sobres nuevos',
    cambios: [
      { tipo: 'cambio', texto: '🎴 Cada sobre temático ahora da solo campeones de su tema: si buscas a un campeón, ve a su sobre. Unbreakable Force sigue dando campeones de todos los sobres.' },
      { tipo: 'nuevo', texto: '🔥 Lords of the Flames, ❄️ Winter Storm y 🧪 Toxic Nightmare: sobres de Quemadura, Congelación y Veneno, con los campeones de los Starter Packs.' },
    ],
  },
  {
    id: '2026-11-07b', fecha: '7 de noviembre de 2026', titulo: 'Anakin Skywalker y Lord Vader',
    cambios: [
      { tipo: 'nuevo', texto: '⚔️ Anakin Skywalker (Daño) llega a los sobres Unbreakable Force y Phantom of Chaos: con Asistir y Contraataque responde con Djem So a todo, junta marcas de Héroe Caído y, con 30, se convierte para siempre en Lord Vader, que domina con Miedo, Aturdimiento y la Ejecución de la Orden 66.' },
    ],
  },
  {
    id: '2026-11-07', fecha: '7 de noviembre de 2026', titulo: 'Sukuna, el Rey de las Maldiciones',
    cambios: [
      { tipo: 'nuevo', texto: '👹 Sukuna (Daño · DoTer) llega a los sobres Bloodline Awakening y Phantom of Chaos: Desmantelar hace sangrar, Partir convierte el Sangrado en Hemorragia y su Expansión de Dominio, el Santuario Malévolo, corta a todos los enemigos cada ronda. Como líder, su equipo se cura cada vez que cae un enemigo.' },
    ],
  },
  {
    id: '2026-11-06b', fecha: '6 de noviembre de 2026', titulo: 'Estrellas moradas y Polvo Estelar',
    cambios: [
      { tipo: 'nuevo', texto: '🟣 Estrellas moradas: un campeón con 5★ puede seguir ascendiendo hasta 5 estrellas moradas. Cuestan 10/15/20/25/30 copias y 300/500/750/1,000/1,500 de Polvo Estelar. Cada una da +5% de Vida, Daño y Velocidad (hasta +40% en total con las normales).' },
      { tipo: 'nuevo', texto: '✨ Polvo Estelar (antes «otros fragmentos»: lo que ya tenías se conserva). Se gana en los cofres del Jefe de Raid, en las oleadas de jefe de la Horda y al terminar la temporada de la Arena.' },
      { tipo: 'cambio', texto: '⭐ Las estrellas ahora solo suben Vida, Daño y Velocidad; ya no dan puntos de crítico, puntería, resistencia, etc.' },
      { tipo: 'cambio', texto: '🧩 Desfragmentar da solo fragmentos de Runa (1 o 2 por copia). «Desfragmentar todas» se cambió por «Seleccionar para desfragmentar»: eliges qué campeones y cuántas copias.' },
    ],
  },
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
