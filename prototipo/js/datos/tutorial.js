// Tutorial de Overstrike 2: Thestalos, Guardián del Portal, guía al jugador nuevo.
// Cada paso: { texto, foco?, clic? }
//   texto: lo que dice Thestalos (*así* se resalta una palabra).
//   foco:  selector CSS del elemento que se ilumina (si no está visible, el paso se muestra sin foco).
//   clic:  el jugador debe tocar el elemento iluminado para seguir (el toque se pasa al botón).
// Para cambiar diálogos basta con editar este archivo.

export const GUIA = { nombre: 'Thestalos', titulo: 'Guardián del Portal', imagen: 'assets/guia/thestalos.webp' };
export const PREMIO_TUTORIAL = { oro: 50000, runasPortal: 3 };   // lo entrega el servidor (docs/sql/038_tutorial.sql), una vez por cuenta

// ---------------------------------------------------------------- recorrido inicial (obligatorio para cuentas nuevas)
export const BIENVENIDA = [
  { texto: '¡Alto ahí, viajero! Soy *Thestalos*, Guardián del Portal.' },
  { texto: 'Detrás de este Portal existen incontables dimensiones. Mi deber es vigilarlas para que nunca choquen entre ellas… pero algo las está rompiendo.' },
  { texto: 'Héroes y villanos de todos los mundos están cruzando al otro lado. Necesito a alguien capaz de *reunirlos y guiarlos*. Ese alguien eres tú.' },
  { texto: 'Primero necesitas campeones. Te regalo un *Starter Pack*: elige el que más te guste. ¡Solo puedes elegir uno!' },
];
export const ANTES_BATALLA = [
  { texto: '¡Excelentes campeones! Ahora veamos de qué son capaces.' },
  { texto: 'Unos orcos perdidos cruzaron el Portal. Son débiles, el lugar perfecto para tu *primera batalla*. Yo te diré qué hacer.' },
];
export const BATALLA_INICIO = [
  { texto: 'Abajo están *tus campeones* y arriba *tus enemigos*. Gana el equipo que deje al rival sin nadie en pie.' },
];
export const BATALLA_TURNO = [
  { texto: 'Esta barra muestra el *orden de turnos* de la ronda. Los campeones con más *Velocidad* actúan primero.', foco: '#order' },
  { texto: '¡Es el turno de uno de tus campeones! Cada uno tiene tres movimientos.', foco: '#actionbar' },
  { texto: 'El *Básico* se usa siempre. El *Especial* y el *Over* son más poderosos, pero después de usarlos tienen que recargarse unas rondas (su *cooldown*).', foco: '#actionbar' },
  { texto: 'Toca un movimiento y luego toca la carta del enemigo al que quieres atacar. Si el movimiento es para aliados o para todos, se usa directo.' },
  { texto: 'Toca cualquier carta para ver su ficha: vida, estadísticas, movimientos y los *buffs* (mejoras) o *debuffs* (castigos) que tenga encima.' },
  { texto: '¿No sabes qué hace un efecto? Aquí está la *Guía* con todos los buffs y debuffs del juego.', foco: '#btn-guia' },
  { texto: 'Y si quieres que la batalla se juegue sola, activa el modo *Auto*. ¡Ahora sí: a pelear!', foco: '#btn-auto' },
];
export const BATALLA_VICTORIA = [
  { texto: '¡Victoria! Lo hiciste muy bien. Los orcos volvieron corriendo a su dimensión.' },
  { texto: 'Ahora te mostraré dónde está todo en el *Santuario del Portal*.' },
];
export const BATALLA_DERROTA = [
  { texto: 'Hmm… esta vez no salió, pero no te preocupes: hasta los mejores guardianes caen alguna vez.' },
  { texto: 'Te mostraré dónde está todo en el *Santuario del Portal*, para que prepares a tu equipo.' },
];
export const MENU = [
  { texto: '*Campaña*: la historia del Portal y el Abismo. Etapas con estrellas, tres dificultades y recompensas. Es el mejor lugar para empezar.', foco: '[data-modo="campana"]' },
  { texto: '*Partida rápida*: arma cualquier equipo y pelea contra la IA para practicar.', foco: '[data-modo="rapida"]' },
  { texto: '*Hordas*: oleadas sin fin de enemigos. Ganas *Trofeos de Orco* para comprar reliquias en su tienda.', foco: '[data-modo="hordas"]' },
  { texto: '*Jefe de Raid*: todos los jugadores atacan al mismo jefe. Reparte daño, gana cofres y sube de dificultad.', foco: '[data-modo="jefe"]' },
  { texto: '*Arena*: arma una *Defensa* para que otros jugadores la ataquen, ataca las suyas y sube de liga.', foco: '[data-modo="arena"]' },
  { texto: 'En la *Tienda* abres sobres para conseguir más campeones.', foco: '#btn-tienda' },
  { texto: 'En la *Colección* ves a tus campeones, los subes de estrellas y les equipas *reliquias*.', foco: '#btn-coleccion' },
  { texto: 'Las *Misiones* diarias te dan oro y objetos cada día. ¡No te olvides de cobrarlas!', foco: '#btn-misiones' },
  { texto: 'Aquí se anuncian las *Novedades*: nuevos campeones, cambios y mejoras.', foco: '#btn-novedades' },
  { texto: 'Y aquí puedes chatear con otros guardianes y desafiarlos.', foco: '#soc-abrir' },
];
export const DESPEDIDA = [
  { texto: 'Por cumplir tu primera misión, acepta este regalo del Portal.', premio: true },
  { texto: 'Cada vez que entres a un lugar nuevo, apareceré para explicarte cómo funciona. ¡Las dimensiones cuentan contigo, guardián!' },
];
// Jugadores que ya tenían cuenta antes del tutorial: se les ofrece el recorrido del menú (sin batalla), una sola vez
export const OFERTA_VETERANO = '¡Hola, guardián! Soy Thestalos, Guardián del Portal. ¿Quieres un recorrido rápido por el juego? Al terminarlo te daré un regalo.';

// ---------------------------------------------------------------- batalla del tutorial: orcos perdidos, muy débiles
const golpe = (categoria, nombre, pct, cd) => ({ categoria, nombre, objetivo: 'enemigo', estilo: 'melee', color: 0x84cc16, pct, escala: 'dano', cd, desc: `Causa ${Math.round(pct * 100)}%.`, efectos: [] });
const orco = (id, nombre, imagen) => ({
  id, nombre, rol: 'Daño', emoji: '👹', color: '#65a30d', imagen: `assets/horda/${imagen}.webp`, base: { hp: 150, dmg: 10, spd: 60 }, extra: {}, slots: [],
  movimientos: [golpe('basico', 'Manotazo', 1, 0), golpe('especial', 'Garrotazo', 1.2, 3), golpe('over', 'Grito de Guerra', 1.4, 5)],
});
export const RIVALES_TUTORIAL = [
  orco('tuto-orco-perdido', 'Orco Perdido', 'orco'),
  orco('tuto-arquero-torpe', 'Arquero Torpe', 'arquero-orco'),
  orco('tuto-escudero-asustado', 'Escudero Asustado', 'escudero-orco'),
];
export const SEMILLA_TUTORIAL = 2026;

// ---------------------------------------------------------------- mini tutoriales: la primera vez que entras a cada lugar
export const MINI = {
  equipo: [
    { texto: 'Aquí armas tu equipo de *5 campeones*. Toca un campeón para agregarlo y toca su lugar para quitarlo.' },
    { texto: 'En Partida rápida también puedes elegir al equipo rival o dejar que se arme al azar. Cuando estés listo, presiona *¡Listo!*', foco: '#eq-listo' },
  ],
  campana: [
    { texto: 'Bienvenido a la *Campaña*. Cada etapa es una batalla contra un equipo fijo del Portal.', foco: '#cp-mapa' },
    { texto: 'Cada etapa da hasta *3 estrellas*: ganar, ganar sin perder aliados y ganar rápido. Juntando estrellas abres estos *cofres*.', foco: '#cp-estrellas' },
    { texto: 'Hay tres dificultades con mejores recompensas. Vence la etapa 20 para abrir la siguiente.', foco: '#cp-difs' },
  ],
  horda: [
    { texto: 'Esto es la *Horda*: oleadas de orcos cada vez más fuertes. ¿Hasta dónde puedes llegar?' },
    { texto: 'Para entrar necesitas una *Runa de Portal*. Aquí ves cuántas tienes.', foco: '#hd-runas' },
    { texto: 'Cada oleada te da *Trofeos de Orco* (más con mini-jefes y jefes). Con ellos compras reliquias en la tienda de la Horda.' },
    { texto: 'Tus campeones no se curan entre oleadas: si te retiras a tiempo, te quedas con todo lo ganado.' },
  ],
  raid: [
    { texto: 'El *Jefe de Raid*: un jefe gigante al que atacan todos los jugadores a la vez.' },
    { texto: 'Cada ataque gasta una *llave*. Recibes una cada 6 horas.', foco: '#rd-llaves' },
    { texto: 'Cada campeón puede atacar al jefe *una vez por día*, así que necesitarás a varios equipos.' },
    { texto: 'Entre más daño hagas, mejores *cofres* recibes. Si el jefe cae, se desbloquea la siguiente dificultad.' },
  ],
  arena: [
    { texto: 'La *Arena*: aquí peleas contra los equipos de otros jugadores.' },
    { texto: 'Primero arma tu *Defensa*: el equipo que pelearán los demás cuando te ataquen.', foco: '#ar-tabs' },
    { texto: 'Gana ataques para sumar puntos y subir de *liga*. Cada temporada dura 4 semanas y da premios según tu liga.' },
  ],
  tienda: [
    { texto: 'La *Tienda*. Aquí abres sobres con oro para conseguir campeones nuevos.' },
    { texto: 'Hay sobres *temáticos* (solo campeones de su tema) y sobres generales. Si te sale un campeón repetido, recibes una *copia* para subirle estrellas.' },
    { texto: 'Arriba ves tu oro, tus runas y tus demás objetos.', foco: '#tc-inv' },
  ],
  coleccion: [
    { texto: 'Tu *Colección*: todos tus campeones y los que te faltan.' },
    { texto: 'Toca a un campeón para ver su ficha, subirle *estrellas* con copias y equiparle *reliquias*.' },
    { texto: 'Las copias que sobran de un campeón al máximo se pueden *desfragmentar* para conseguir otros recursos.' },
  ],
  portal: [
    { texto: 'El *Portal de Invocación*: con una *Runa de Invocación* eliges exactamente al campeón que quieres traer.' },
  ],
  reliquias: [
    { texto: 'Las *Reliquias* son equipo para tus campeones: armas, armaduras y accesorios que suben sus estadísticas.' },
    { texto: 'Su rareza va de *Común* a *Legendaria*. Puedes mejorarlas, fusionarlas o descomponerlas.' },
  ],
  recetas: [
    { texto: 'La *Forja de los Dioses*: junta las Épicas de una receta para forjar una reliquia *Legendaria*.' },
  ],
  misiones: [
    { texto: 'Tus *Misiones diarias*: cumple objetivos sencillos y cobra sus recompensas. Se renuevan cada día.' },
  ],
};
