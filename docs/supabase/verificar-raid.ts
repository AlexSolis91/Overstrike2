// @ts-nocheck
// Edge Function "verificar-raid" (Supabase → Edge Functions → Deploy a new function → Via Editor → nombre: verificar-raid).
// ARCHIVO GENERADO por prototipo/herramientas/empaquetar_verificador.mjs: no editar a mano.
// Repite un ataque al Jefe de Raid con el MISMO motor del juego (viene incluido abajo) y cuenta el daño que sale de esa repetición.
// Si el ataque se jugó con otra versión del juego (fichas distintas), acepta el daño reportado, igual que la Arena.
// Las llaves SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo: no hay que escribir ninguna.
// Después de publicarla (y cada vez que cambien las fichas, generarla y publicarla otra vez), encender en el SQL Editor:
//   update public.raid_config set verificar = true;
import { createClient } from 'npm:@supabase/supabase-js@2';

const __m: any = {};

__m["motor/reglas.js"] = (() => { const __e: any = {};
// Reglas numéricas globales de Overstrike 2. Cambiar un valor aquí lo cambia para TODO el juego.

// Estadísticas secundarias con las que empiezan todos los personajes (la ficha suma "extra" encima).
const BASE_COMUN = {
  critRate: .05, critDmg: .50,
  acc: .50, res: .50,
  armor: 0, block: 0, dot: 0, pen: 0,
};

// Estrellas de la cuenta (ascensión): por estrella, +3% HP/Daño/Velocidad y +1 punto a cada estadística en %
const BONO_ESTRELLA = { base: .03, pct: .01 };

const TOPES = { block: .50, armor: .75 };

// Tirada de debuffs (estilo Raid): si la Puntería alcanza a la Resistencia, el debuff entra siempre;
// si no, la probabilidad baja 1% por cada punto de diferencia, sin bajar del mínimo.
const PUNTERIA = { minimo: .10, auraFuego: .50, auraGelida: .50 };   // auraFuego / auraGelida: probabilidad de Quemadura / Congelación al atacante
const probAplicar = (acc, res) => acc >= res ? 1 : Math.max(PUNTERIA.minimo, 1 - (res - acc));

// Escalado de movimientos: primero se calcula el "Daño base" y luego se aplica el % del movimiento.
const ESCALADO = {
  dano: s => s.dmg,
  hp:   s => s.hp / 15,
  vel:  s => s.spd * .75,
  hpMax: s => s.hp,        // para curas/escudos "X% del HP máx."
};

// Cooldown con el que empieza cada categoría (baja 1 al final de cada ronda).
// Over = 2 -> disponible a partir de la ronda 3.
const CD_INICIAL = { basico: 0, especial: 0, over: 2 };

// Límite de rondas: al terminar esta ronda, gana el equipo con más personajes vivos (mismo número = empate).
const LIMITE_RONDAS = 20;

// Valores fijos de buffs universales
const BUFFS = {
  furia: .50,          // Furia: +50% Daño
  proteccion: .30,     // Protección: +30% Resistencia
  regeneracion: .10,   // Regeneración: cura 10% del HP máx. al inicio del turno del portador
  frenesi: .50,        // Frenesí: +50% Prob. Crítico (puntos)
  celeridad: .20,      // Celeridad: +20% Velocidad
  letalidad: .30,      // Letalidad: +30% Daño Crítico (puntos)
  agudeza: .50,        // Agudeza: +50% Puntería (puntos)
  espejismo: .30,      // Espejismo: devuelve al atacante el 30% del daño de cada golpe recibido
  auraGelida: .20,     // Aura Gélida: −20% de daño de los golpes enemigos
  perforacion: .50,    // Perforación: +50% Penetración de escudo (puntos; tope 100%)
  auraLuz: 2,          // Aura de Luz: multiplica las curaciones que recibe
};

// Valores fijos de debuffs universales
const DEBUFFS = {
  aguja: .03,          // Aguja Escarlata: +3% de daño de Veneno y Sangrado por cada aguja clavada...
  agujaTurno: .005,     // ...y cada aguja quita 0.5% del HP máx. al inicio de su turno (14 agujas = 7%)
  agujaMax: 14,        // ...hasta 14 (las 14 estrellas de Escorpio; la 15.ª es Antares)
  debilitar: .50,
  agotar: .15,         // Agotar: −15% de Daño
  expuesto: .25,       // Expuesto (p. ej. tras Shinra Tensei): +25% de daño recibido      // Debilitar: +50% de daño recibido (después de la Armadura)
  ceguera: .50,        // Ceguera: −50 puntos de Puntería
  desgaste: .05,       // Desgaste: −5 puntos de Armadura al aplicarse y por cada golpe recibido...
  desgasteMax: .25,    // ...hasta −25 puntos
  pesteNegra: .05,     // Peste Negra: −5% del HP máx. original al final de cada turno del portador...
  pesteNegraPiso: .25, // ...sin bajar del 25% del HP máx. original
};

const CONTROL = {
  quiebreCongelacion: .08,   // +daño del golpe que rompe una capa de hielo
  congelacionVel: .25,       // Congelación: −25% Velocidad (Mega: el doble) mientras dure el debuff
  durCongelacion: 2,
  miedoDano: .75,            // un personaje con Miedo hace 75% del daño
  confusionProb: .50,        // probabilidad de que un movimiento confundido cambie de objetivo
  pierdeTurno: ['stun', 'freeze', 'possess'],   // controles que quitan turnos (y dan inmunidad al terminar)
};

const DOT = {
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

__e["BASE_COMUN"] = BASE_COMUN;
__e["BONO_ESTRELLA"] = BONO_ESTRELLA;
__e["BUFFS"] = BUFFS;
__e["CD_INICIAL"] = CD_INICIAL;
__e["CONTROL"] = CONTROL;
__e["DEBUFFS"] = DEBUFFS;
__e["DOT"] = DOT;
__e["ESCALADO"] = ESCALADO;
__e["LIMITE_RONDAS"] = LIMITE_RONDAS;
__e["PUNTERIA"] = PUNTERIA;
__e["TOPES"] = TOPES;
__e["probAplicar"] = probAplicar;
return __e; })();

__m["motor/efectos.js"] = (() => { const __e: any = {};
// Registro universal de buffs y debuffs. Cada efecto existe UNA sola vez y todos los personajes lo usan igual.
// tipo: 'buff' | 'debuff'   ·   tags: etiquetas internas para filtros (limpiar solo DoT, inmune a Control, etc.)

const { BUFFS, DEBUFFS, CONTROL, DOT, PUNTERIA } = __m["motor/reglas.js"];

const p = v => `${Math.round(v * 1000) / 10}%`;

// desc: explicación para el jugador (Guía de efectos). Los números salen de reglas.js.
const EFECTOS = {
  // ---- DoT
  burn:    { nombre: 'Quemadura',   icono: '🔥', color: 0xff7a2a, tipo: 'debuff', tags: ['DoT', 'Fuego'],
    desc: `Al inicio de su turno pierde un % de su HP máx. (según quien la aplicó; sube con Daño DoT). Ignora Armadura y Escudo. Si recibe otra, se fusionan: queda la más fuerte + ${p(DOT.quemaduraSuma)} de la más débil.` },
  poison:  { nombre: 'Veneno',      icono: '🧪', color: 0x7ee36b, tipo: 'debuff', tags: ['DoT', 'Veneno'],
    desc: `Al inicio de su turno pierde ${p(DOT.veneno(0))} de su HP máx. por cada Veneno (sube con Daño DoT). Se acumulan hasta ${DOT.maxVeneno}; cada uno dura ${DOT.durVeneno} rondas. Ignora Armadura y Escudo.` },
  bleed:   { nombre: 'Sangrado',    icono: '🩸', color: 0xff3355, tipo: 'debuff', tags: ['DoT', 'Sangrado'],
    desc: `Cada golpe que recibe le quita además ${p(DOT.sangrado(0))} de su HP máx. (sube con Daño DoT). Dura hasta que lo limpien. Si recibe otro Sangrado, ${p(DOT.hemorragiaProb)} de convertirse en Hemorragia.` },
  hemo:    { nombre: 'Hemorragia',  icono: '🩸', color: 0xffd36b, tipo: 'debuff', tags: ['DoT', 'Sangrado'],
    desc: `Pierde HP con cada golpe que recibe y cada vez que usa un movimiento, y crece +${p(DOT.hemorragiaCrece)} con cada golpe. Dura hasta que la limpien.` },
  bomb:    { nombre: 'Bomba',       icono: '💣', color: 0xffb03b, tipo: 'debuff', tags: ['DoT', 'Explosivo'],
    desc: `Explota al terminar su cuenta regresiva (${DOT.contadorBomba} rondas): ${p(DOT.bomba(0))} de su HP máx. y ${p(DOT.salpicaduraBomba)} de eso a cada uno de sus aliados. Máximo ${DOT.maxBombas} a la vez.` },
  // ---- Control
  stun:    { nombre: 'Aturdimiento', mega: 'Mega Aturdimiento', icono: '💫', color: 0xfacc15, tipo: 'debuff', tags: ['Control'],
    desc: `Pierde su próximo turno. Mega Aturdimiento: 2 turnos.` },
  freeze:  { nombre: 'Congelación',  mega: 'Mega Congelación',  icono: '❄️', color: 0x7dd3fc, tipo: 'debuff', tags: ['Control'],
    desc: `Bloque de hielo de 1 capa y −${p(CONTROL.congelacionVel)} Velocidad (${CONTROL.durCongelacion} rondas). Si llega a su turno con hielo, lo pierde. Cada golpe rompe 1 capa (+${p(CONTROL.quiebreCongelacion)} de daño). Congelar a alguien congelado = Mega: 2 capas y −${p(CONTROL.congelacionVel * 2)} Velocidad.` },
  possess: { nombre: 'Posesión',     mega: 'Mega Posesión',     icono: '👁️', color: 0xc084fc, tipo: 'debuff', tags: ['Control'],
    desc: `En su turno ataca a un aliado suyo al azar con su Básico. Mega Posesión: 2 turnos.` },
  confuse: { nombre: 'Confusión',    icono: '🌀', color: 0xf0abfc, tipo: 'debuff', tags: ['Control'],
    desc: `${p(CONTROL.confusionProb)} de que sus movimientos de un objetivo vayan a un personaje al azar (aliado o enemigo).` },
  agotar:  { nombre: 'Agotar', icono: '🥱', color: 0x94a3b8, tipo: 'debuff', tags: ['Estadística'],
    desc: `−${p(DEBUFFS.agotar)} de Daño.` },
  weaken:  { nombre: 'Debilitar',   icono: '💔', color: 0xf87171, tipo: 'debuff', tags: ['Estadística'],
    desc: `Recibe +${p(DEBUFFS.debilitar)} de daño de golpes y daño por efecto (después de la Armadura).` },
  silence: { nombre: 'Silencio',     icono: '🔇', color: 0xa78bfa, tipo: 'debuff', tags: ['Control'],
    desc: `Bloquea al azar uno de sus movimientos que esté listo. Si no le queda ninguno para usar, pierde el turno.` },
  blind:   { nombre: 'Ceguera',     icono: '🕶️', color: 0x9ca3af, tipo: 'debuff', tags: ['Estadística'],
    desc: `−${p(DEBUFFS.ceguera)} de Puntería: le cuesta mucho más aplicar debuffs y disipar.` },
  wear:    { nombre: 'Desgaste',    icono: '💥', color: 0xd97706, tipo: 'debuff', tags: ['Estadística'],
    desc: `−${p(DEBUFFS.desgaste)} de Armadura, y −${p(DEBUFFS.desgaste)} más por cada golpe que recibe, hasta −${p(DEBUFFS.desgasteMax)}. Dura hasta que lo limpien.` },
  plague:  { nombre: 'Peste',       icono: '🦠', color: 0x84cc16, tipo: 'debuff', tags: ['Peste'],
    desc: `No puede recibir curaciones (sí escudos). Si recibe otra Peste, se convierte en Peste Negra.` },
  blackPlague: { nombre: 'Peste Negra', icono: '☠️', color: 0x3f6212, tipo: 'debuff', tags: ['Peste'],
    desc: `No puede recibir curaciones y al final de cada uno de sus turnos pierde ${p(DEBUFFS.pesteNegra)} de su HP máx. original (mínimo ${p(DEBUFFS.pesteNegraPiso)}). Esa pérdida es permanente aunque la limpien.` },
  solarBurn: { nombre: 'Quemadura Solar', icono: '🔆', color: 0xfbbf24, tipo: 'debuff', tags: ['Quemadura Solar'],
    desc: `Toda curación que recibe le hace daño por el monto completo, ignorando Armadura y Escudo.` },
  incite:  { nombre: 'Incitar',      icono: '🗣️', color: 0xfb923c, tipo: 'debuff', tags: ['Control'],
    desc: `Solo puede usar su Básico y solo contra quien lo incitó (si ese enemigo muere, vuelve a actuar normal).` },
  fear:    { nombre: 'Miedo',        icono: '😱', color: 0x94a3b8, tipo: 'debuff', tags: ['Control'],
    desc: `No puede usar su Especial ni su Over y hace −${p(1 - CONTROL.miedoDano)} de daño.` },
  // ---- Buffs
  mirror:  { nombre: 'Espejismo', icono: '🪞', color: 0x67e8f9, tipo: 'buff', tags: ['Reflejo'],
    desc: `Cada golpe que recibe de un enemigo le devuelve al atacante el ${p(BUFFS.espejismo)} del daño, incluido el que absorba su Escudo (daño por efecto que ignora Armadura). Igual recibe el golpe completo.` },
  orgullo: { nombre: 'Orgullo Sayajin', icono: '⚜️', color: 0x60a5fa, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Cargas de Vegeta (máx. 5): las gana cuando su Rival usa un movimiento y con sus críticos. Al llegar a 5 se transforma; Final Flash las consume para hacer más daño. No se disipa ni se limpia.' },
  aguja: { nombre: 'Aguja Escarlata', icono: '📍', color: 0xdc2626, tipo: 'marca', tags: ['Aguja'], noDisipable: true,
    desc: `Cada aguja clavada le quita ${Math.round(DEBUFFS.agujaTurno * 1000) / 10}% del HP máx. al inicio de su turno y le hace recibir +${p(DEBUFFS.aguja)} de daño de Veneno y Sangrado (máx. ${DEBUFFS.agujaMax} agujas). Marca de Milo: no se disipa ni se limpia (Antares las consume).` },
  blockBuffs: { nombre: 'Bloquear Buffs', icono: '🚫', color: 0x94a3b8, tipo: 'debuff', tags: ['Bloqueo'],
    desc: 'No puede recibir buffs nuevos mientras dure (los que ya tiene, los permanentes y las cargas no se ven afectados).' },
  oscuridad: { nombre: 'Oscuridad', icono: '🌑', color: 0x7c3aed, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Cargas de Saga (máx. 3): las gana al aplicar Confusión o Posesión. Con 3, su lado malvado toma el control: se transforma en Saga Oscuro por 4 turnos. No se disipa ni se limpia.' },
  grayskull: { nombre: 'Poder de Grayskull', icono: '⚡', color: 0xfacc15, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Cargas de He-Man (máx. 5): las gana al proteger a un aliado y con su Básico. Golpe de Grayskull las consume. No se disipa ni se limpia.' },
  poderRobado: { nombre: 'Poder Robado', icono: '💀', color: 0x8b5cf6, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Cargas de Skeletor (máx. 10): gana 1 cada vez que un enemigo recibe un buff. Poder de Grayskull las consume. No se disipa ni se limpia.' },
  selloMaldito: { nombre: 'Sello Maldito del Cielo', icono: '☯️', color: 0x7c3aed, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Sello de Orochimaru sobre los aliados que aplican Veneno: aumenta sus estadísticas toda la partida. No se limpia ni se disipa.' },
  edoTensei: { nombre: 'Edo Tensei', icono: '⚰️', color: 0x65a30d, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Reanimado por Orochimaru: no puede morir (se queda en 1 HP) mientras Orochimaru viva, y sus golpes tienen 30% de probabilidad de aplicar Veneno. Si Orochimaru cae, vuelve a ser mortal. No se limpia.' },
  cargaElectrica: { nombre: 'Carga Eléctrica', icono: '⚡', color: 0xa5b4fc, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Baran sobre un enemigo: cada golpe de Baran deja 1. Con 2 sufre una Sobrecarga: queda Aturdido (sin tirada) y las cargas se reinician. El Juicio del Rey Demonio las consume. No se limpia.' },
  destruccion: { nombre: 'Destrucción', icono: '🔥', color: 0xdc2626, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Antares (máx. 10): gana 1 cada vez que cualquier Quemadura hace daño a un enemigo; cada una le da +3% de daño. El Aliento de la Destrucción las consume. No se disipa ni se limpia.' },
  esclavoRuna: { nombre: 'Esclavo de la Runa', icono: '❄️', color: 0x93c5fd, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Revivido por Frostmourne: lucha para el equipo de su portador durante 2 rondas, sin habilidad de líder. Al terminar vuelve a morir y ya no puede revivir. No se disipa ni se limpia.' },
  escarchaSillad: { nombre: 'Bendición de la Escarcha', icono: '🧊', color: 0x38bdf8, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Sillad, el Monarca de la Escarcha, bendice a cada aliado (incluido él) cuyos movimientos aplican Congelación con un bono de estadísticas todo el combate. No se disipa ni se limpia.' },
  emblemaFairyTail: { nombre: 'Emblema de Fairy Tail', icono: '🧚', color: 0xef4444, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Natsu lucha por sus compañeros del gremio: cada aliado (incluido él) cuyos movimientos aplican Quemadura tiene un bono de estadísticas mientras dure el combate. No se disipa ni se limpia.' },
  llamaNatsu: { nombre: 'Llama del Dragón', icono: '🔥', color: 0xef4444, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Natsu (máx. 5): gana 1 cada vez que una Quemadura hace daño a un enemigo (máx. 2 por ronda); cada una le da +5% de daño. Su Rugido del Dragón de Fuego y Rayo las consume (+10% de daño cada una). No se disipa ni se limpia.' },
  esperanzaTrunks: { nombre: 'Esperanza', icono: '✨', color: 0xfacc15, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Trunks (máx. 5): gana 1 cuando un DoT daña a un enemigo (máx. 2 por ronda), 2 cuando un aliado se transforma y con sus ataques. Con 5 se transforma para siempre en Super Saiyajin. No se disipa ni se limpia.' },
  potencialGohan: { nombre: 'Potencial', icono: '🔥', color: 0x8b5cf6, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Gohan (máx. 3): gana 1 al proteger a su equipo y 3 si cae un aliado. Con 3 despierta para siempre como Gohan Bestia. No se disipa ni se limpia.' },
  iraBroly: { nombre: 'Ira', icono: '💢', color: 0x84cc16, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Broly (máx. 5): gana 1 con cada golpe que recibe (y con sus ataques). Con 5 se transforma para siempre en Broly Super Saiyajin Legendario. No se disipa ni se limpia.' },
  almasShadowmourne: { nombre: 'Almas de Shadowmourne', icono: '🪓', color: 0x7dd3fc, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de la reliquia Shadowmourne (máx. 20): gana 1 por cada movimiento en área o de varios golpes que ejecuta su portador; cada Alma da +15 de Daño. Dura toda la batalla; no se disipa ni se limpia.' },
  cuervos: { nombre: 'Clones de Cuervo', icono: '🐦‍⬛', color: 0x334155, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Contador de Itachi: cada clon absorbe por completo un ataque enemigo contra él (era un genjutsu) y los cuervos pueden asustar al atacante. No se disipa ni se limpia.' },
  hiraishin: { nombre: 'Marca Hiraishin', icono: '🗡️', color: 0xfacc15, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Sello del Dios del Trueno Volador de Minato: el ancla a la que se teletransporta. Cuando Minato golpea a un enemigo con su marca, la consume y gana un turno extra (hasta 2 por ronda) y Velocidad. Dura 3 rondas; no se limpia.' },
  zona:    { nombre: 'Zona', icono: '🏛️', color: 0xfacc15, tipo: 'marca', tags: ['Zona'], noDisipable: true,
    desc: 'Zona levantada por su portador (p. ej. el Ramesseum Tentyris de Ozymandias): fortalece a todo su equipo y puede actuar al inicio de cada ronda mientras dure. No se puede disipar.' },
  sello:   { nombre: 'Sellado', icono: '🔒', color: 0xfbbf24, tipo: 'marca', tags: ['Sello'], noDisipable: true,
    desc: 'Uno de sus movimientos está sellado hasta que se cumpla una condición de su pasiva (p. ej. la Arrogancia de Gilgamesh). No se puede disipar.' },
  camino:  { nombre: 'Camino', icono: '☯️', color: 0xa855f7, tipo: 'marca', tags: ['Postura'], noDisipable: true,
    desc: 'Postura activa de un ciclo (p. ej. los Seis Caminos de Pain): cambia al inicio de cada uno de sus turnos y le da un efecto distinto. No se puede disipar.' },
  expuesto: { nombre: 'Expuesto', icono: '🎯', color: 0xfca5a5, tipo: 'debuff', tags: ['Estadística'],
    desc: `Recibe +${p(DEBUFFS.expuesto)} de daño de golpes y daño por efecto (después de la Armadura).` },
  rival:   { nombre: 'Rival', icono: '👑', color: 0xfbbf24, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Marca de Vegeta: recibe más daño de él y cada movimiento que usa le da Orgullo. No es un debuff: no se limpia ni cuenta como debuff.' },
  marcaDemonio: { nombre: 'Marca del Demonio', icono: '😈', color: 0x7c3aed, tipo: 'marca', tags: ['Marca'], noDisipable: true, acumulaDano: true,
    desc: 'Marca de Meliodas: acumula todo el daño que recibe. Al volver a usar Contra Venganza lo libera sobre un enemigo al azar (ignora Armadura) y la marca empieza de nuevo. No se disipa ni se limpia.' },
  theOne:  { nombre: 'The One', icono: '☀️', color: 0xfbbf24, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: 'Marcas de Escanor: gana 1 cada vez que recibe daño (máx. 12) y cada una le da más HP máx. Con 12 es The One. No se disipan ni se limpian.' },
  cargas:  { nombre: 'Furia Dorada', icono: '🐂', color: 0xfbbf24, tipo: 'marca', tags: ['Carga'], noDisipable: true,
    desc: `Cargas que gana al recibir golpes; un movimiento que las consume hace más daño. No se disipan ni se limpian.` },
  caminoJedi: { nombre: 'Camino Jedi', icono: '🌿', color: 0x86efac, tipo: 'marca', tags: ['Marca'], noDisipable: true,
    desc: 'Marca de Yoda: +5% a todas las estadísticas mientras la tenga (no se acumula). Cuando Yoda usa su Básico o su Especial, el portador usa su Básico. No se limpia ni se disipa.' },
  shield:  { nombre: 'Escudo', icono: '🛡️', color: 0x67e8f9, tipo: 'buff', tags: ['Escudo'],
    desc: 'Absorbe el daño antes que el HP. Dura 1 o 2 rondas; desaparece al gastarse y se puede disipar o robar. Un Escudo nuevo se suma al que ya tiene, sin renovar su duración.' },
  anticipar: { nombre: 'Anticipar', icono: '🔮', color: 0xc4b5fd, tipo: 'buff', tags: ['Turno'],
    desc: 'Cuando un enemigo gana un turno adicional, el portador juega un turno adicional ANTES que él.' },
  taunt:   { nombre: 'Provocación', icono: '🎯', color: 0xf97316, tipo: 'buff', tags: ['Provocación'],
    desc: `Los enemigos deben atacarlo con sus movimientos de un solo objetivo. No afecta ataques de área ni al azar.` },
  frostAura: { nombre: 'Aura Gélida', icono: '🧊', color: 0x7dd3fc, tipo: 'buff', tags: ['Hielo'],
    desc: `Recibe −${p(BUFFS.auraGelida)} de daño de los golpes enemigos. Quien lo golpee tiene ${p(PUNTERIA.auraGelida)} de probabilidad de recibir Congelación. 2 rondas.` },
  fireAura: { nombre: 'Aura de Fuego', icono: '♨️', color: 0xff6a3d, tipo: 'buff', tags: ['Fuego'],
    desc: `Quien lo golpee tiene ${p(PUNTERIA.auraFuego)} de probabilidad de recibir Quemadura 5% (1 turno).` },
  infect: { nombre: 'Infectar', icono: '🦠', color: 0x84cc16, tipo: 'buff', tags: ['Veneno'],
    desc: `Quien lo golpee recibe Veneno sin tirada (siempre entra, salvo inmunidad).` },
  aoeDodge: { nombre: 'Esquiva Área', icono: '💨', color: 0x93c5fd, tipo: 'buff', tags: ['Esquiva'],
    desc: `No lo alcanzan los movimientos de área de los enemigos: ni su daño ni sus efectos.` },
  stealth: { nombre: 'Sigilo',      icono: '👤', color: 0x94a3b8, tipo: 'buff', tags: ['Sigilo'],
    desc: `Los enemigos no pueden elegirlo con ataques de un solo objetivo. Se rompe al recibir cualquier daño.` },
  pierce:  { nombre: 'Perforación', icono: '🗡️', color: 0x22d3ee, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.perforacion)} de Penetración de escudo: esa parte del daño pasa directo al HP aunque el objetivo tenga Escudo.` },
  protect: { nombre: 'Protección', icono: '🔰', color: 0x60a5fa, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.proteccion)} de Resistencia: resiste mejor los debuffs.` },
  auraLuz: { nombre: 'Aura de Luz', icono: '🌟', color: 0xfde68a, tipo: 'buff', tags: ['Curación'],
    desc: `Las curaciones que recibe se multiplican ×${BUFFS.auraLuz}.` },
  regen:   { nombre: 'Regeneración', icono: '💚', color: 0x4ade80, tipo: 'buff', tags: ['Curación'],
    desc: `Al inicio de su turno se cura ${p(BUFFS.regeneracion)} de su HP máx.` },
  dmgUp:   { nombre: 'Furia',       icono: '⚔️', color: 0x4ade80, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.furia)} de Daño.` },
  frenzy:  { nombre: 'Frenesí',     icono: '💢', color: 0xf43f5e, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.frenesi)} de Probabilidad de Crítico.` },
  haste:   { nombre: 'Celeridad',   icono: '⚡', color: 0x38bdf8, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.celeridad)} de Velocidad.` },
  bloodlust: { nombre: 'Letalidad', icono: '🪓', color: 0xdc2626, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.letalidad)} de Daño Crítico.` },
  keen:    { nombre: 'Agudeza',     icono: '🏹', color: 0xfacc15, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.agudeza)} de Puntería: sus debuffs entran con más facilidad.` },
  summon:  { nombre: 'Invocación',  icono: '✦',  color: 0xffd36b, tipo: 'buff', tags: ['Invocación'],
    desc: `Una criatura invocada que actúa después del turno de su invocador. Desaparece si muere el invocador o se acaba su duración. Se puede Disipar.` },
};

const esDe = (estado, tag) => EFECTOS[estado.id].tags.includes(tag);

__e["EFECTOS"] = EFECTOS;
__e["esDe"] = esDe;
return __e; })();

__m["motor/rng.js"] = (() => { const __e: any = {};
// Generador aleatorio con semilla: la misma semilla produce la misma partida (necesario para el multijugador).
function crearRng(semilla = Date.now()) {
  let a = semilla >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.elegir = arr => arr[Math.floor(rng() * arr.length)];
  return rng;
}

__e["crearRng"] = crearRng;
return __e; })();

__m["datos/invocaciones.js"] = (() => { const __e: any = {};
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

const INVOCACIONES = {
  // ---------------------------------------------------------------- Jefe de Raid: Lich King
  // vuelo: true → en el campo del jefe cruza la pantalla al aparecer y al atacar
  sindragosa: {
    nombre: 'Sindragosa', rareza: 'Legendario', emoji: '🐉', color: 0x38bdf8, imagen: 'assets/invocaciones/sindragosa.webp', dur: 2,
    enfoque: [.62, .36], vuelo: true,
    desc: 'La Reina de los Vermis de Escarcha. Al aparecer aplica Desgaste a todos los enemigos. Cada turno, Aliento de Escarcha: golpea 70% a todos los enemigos, con 25% de probabilidad de Congelación.',
    alAparecer: [{ tipo: 'efecto', id: 'wear', a: 'todosEnemigos' }],
    acciones: [{ tipo: 'golpe', pct: .70, elegir: 'todos', efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .25 } }] }],
  },
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
const TABLAS_INVOCACION = {
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

__e["INVOCACIONES"] = INVOCACIONES;
__e["TABLAS_INVOCACION"] = TABLAS_INVOCACION;
return __e; })();

__m["motor/combate.js"] = (() => { const __e: any = {};
// MOTOR DE COMBATE UNIVERSAL de Overstrike 2.
// - No sabe nada de la pantalla: aplica reglas y produce una lista de EVENTOS que la interfaz anima.
// - Ningún personaje tiene código propio: sus fichas solo combinan piezas (acciones, gatillos, condiciones, efectos).
// - Todo el azar pasa por un generador con semilla (misma semilla + mismas decisiones = misma partida).

const { BASE_COMUN, TOPES, ESCALADO, CD_INICIAL, LIMITE_RONDAS, CONTROL, DOT, BUFFS, DEBUFFS, PUNTERIA, probAplicar, BONO_ESTRELLA } = __m["motor/reglas.js"];
const { EFECTOS, esDe } = __m["motor/efectos.js"];
const { crearRng } = __m["motor/rng.js"];
const { INVOCACIONES, TABLAS_INVOCACION } = __m["datos/invocaciones.js"];

const CATEGORIAS = ['basico', 'especial', 'over'];
const NOMBRE_CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };
const NOMBRE_STAT = { hpPct: 'HP máx.', dmgPct: 'Daño', critDmg: 'Daño Crítico', critRate: 'Prob. Crítico', armor: 'Armadura', res: 'Resistencia', acc: 'Puntería', pen: 'Penetración de escudo' };
const clonar = o => JSON.parse(JSON.stringify(o));

// rival (opcional, p. ej. Campaña): { poder: ×HP y ×Daño, spdPct, sinReliquias, sinLider, jefe: { hpExtra, umbral, dmgPct, spdPct } }
// invertido (Arena en vivo): crea primero el equipo rival. El segundo jugador ve su equipo como "jugador" pero el motor queda en
// el mismo orden que en la pantalla del primero (misma semilla + mismas decisiones = misma partida en las dos pantallas).
function crearCombate({ equipoJugador, equipoRival, semilla = Date.now(), rival: opcionesRival = {}, invertido = false }) {
  const rng = crearRng(semilla);
  const P = [];
  const S = { ronda: 0, rondaBase: 0, actuaron: new Set(), orden: [], actual: null, esperando: null, fin: null,
    anticipan: [], cola: [], reanudar: null };   // turnos especiales: Anticipar y turnos regalados (ver seguirTras)
  let EV = [];
  // Reacciones: lo que una pasiva hace en respuesta a la acción de otro (p. ej. Sub-Zero lanza Ice Blast cuando le rompen
  // el hielo a un enemigo) espera a que termine el movimiento en curso, para no mezclarse con él.
  const reacciones = [];
  let profundidad = 0;
  function procesarReacciones() {
    if (profundidad) return;
    while (reacciones.length) reacciones.shift()();
  }

  // ================================================================ personajes
  function crearPersonaje(def, lado, pos) {
    const p = clonar(def);
    Object.assign(p, {
      uid: `${lado}-${pos}`, lado, pos, esLider: pos === 0 && !!def.lider,
      estados: [], muerto: false, cds: {}, bonos: {}, desempate: rng(),
      inmune: false, recienLiberado: false,
      permanente: {},        // bonos permanentes e invisibles (p. ej. Armadura de un líder); no se disipan
      usosPasiva: 0,         // activaciones de la pasiva en la ronda actual (para "máximo X por ronda")
      est: { dano: 0, escudo: 0, curacion: 0, recibido: 0, elim: 0 },   // estadísticas de la partida (pantalla de resultados)
      ultimoDanoDe: null,    // quién le hizo daño por última vez (para acreditar la eliminación)
    });
    for (const m of p.movimientos) {                     // conEquipo: el movimiento cambia si lleva cierto equipo (p. ej. 2 Espadas)
      if (m.conEquipo && tieneEquipo(p, m.conEquipo.equipo)) { Object.assign(m, m.conEquipo.cambios); m.equipoActivo = true; }
      p.cds[m.categoria] = cdDe(p, m.cdInicial ?? CD_INICIAL[m.categoria] ?? 0);   // cdInicial: con qué cooldown empieza (p. ej. Explosión de Galaxias: 6)
    }
    // efectosPermanentes: la pasiva da ese efecto toda la partida (sin duración, no se disipa ni se roba)
    for (const id of def.pasiva?.efectosPermanentes || []) p.estados.push({ id, permanente: true });
    const cl = def.pasiva?.clones;                       // clones: empieza con N (p. ej. Clones de Cuervo de Itachi)
    if (cl?.iniciales) p.estados.push({ id: cl.efecto, valor: cl.iniciales });
    if (def.pasiva?.sello) { p.sellado = true; p.estados.push({ id: 'sello', permanente: true }); }   // sello: un movimiento bloqueado hasta romperlo
    // Escudo (estilo Raid): es el buff 'shield' y su cantidad vive en el buff (valor). p.escudo lo lee y lo escribe:
    // al gastarse (≤ 0) el buff desaparece; al expirar, disiparse o robarse, el escudo se va con él.
    Object.defineProperty(p, 'escudo', {
      get() { return get(this, 'shield')?.valor || 0; },
      set(v) { const e = get(this, 'shield'); if (v <= .5) { if (e) quitar(this, e); } else if (e) e.valor = v; else this.estados.push({ id: 'shield', valor: v, dur: 1 }); },
      enumerable: true, configurable: true,
    });
    p.hp = stats(p).hp;
    return p;
  }

  // Equipo: cuenta las reliquias equipadas (espacios no bloqueados) por tipo (Espada, Lanza…) o categoría (Arma, Accesorio…)
  function tieneEquipo(p, { tipo, categoria, min = 1 }) {
    const n = (p.slots || []).filter(sl => !sl.locked && sl.relic                     // sl.relic: copia de la reliquia (catálogo + valores)
      && (!tipo || sl.relic.type === tipo) && (!categoria || sl.relic.category === categoria)).length;
    return n >= min;
  }

  // Pasivas de reliquia (pieza universal): las reliquias equipadas con "motor" (p. ej. Shadowmourne)
  //   critDmgAoe: +X Daño Crítico en los golpes de movimientos a todos los enemigos
  //   contador: { efecto, al: ['aoe','multigolpe'], max, bono }: +1 por movimiento de ese tipo; bono por cada uno (toda la batalla)
  //   cooldownPct: multiplica los cooldowns de sus movimientos (redondeo hacia arriba), incluida la espera inicial del Over
  //   revivir: { hp }: al ser eliminado, revive al FINAL de la ronda siguiente con ese % de HP (una vez por batalla;
  //     si otro efecto lo revive antes, el anillo no se gasta y la cuenta vuelve a empezar en su siguiente muerte)
  //   inmuneA: [ids]: esos efectos no se le pueden aplicar (aviso "Inmune"), incluidas sus versiones Mega
  //   recuperaGolpes: X: al final de cada ronda se cura X veces el HP que perdió por golpes en esa ronda (es curación)
  //   bono: { stat: v }: bono fijo de estadística (p. ej. hpPct: .5 = +50% HP máx.)
  //   crece: { stat, valor, max }: al final de cada ronda (vivo) suma "valor" a esa estadística hasta "max"; se conserva si revive.
  //     Si es hpPct, también gana la vida que sube su máximo. No se muestra contador.
  //   convertir: { hp, rondas, maxBatalla }: si un ATAQUE suyo elimina enemigos, revive a uno de ellos al azar como su aliado
  //     (hp %, sin líder ni efectos) durante N rondas, una vez por ronda y hasta maxBatalla. Al terminar vuelve a morir del
  //     lado enemigo y ya no puede revivir. Si cae antes, queda muerto para siempre. Marca visible "Esclavo de la Runa".
  //   multiGolpe: [[prob, mult], ...]: en cada golpe, UNA tirada excluyente (p. ej. 15% ×3, 50% ×2); se multiplica con el crítico
  const pasivasDeReliquia = p => (p.slots || []).filter(sl => !sl.locked && sl.relic?.motor).map(sl => sl.relic.motor);
  const cdDe = (p, cd) => {                              // cooldown real de un movimiento (reliquias que lo reducen)
    for (const m of pasivasDeReliquia(p)) if (m.cooldownPct != null) cd = Math.ceil(cd * m.cooldownPct);
    return cd;
  };

  // capas: qué sumar ({} = solo la base de su forma). Sin capas = todo. Sirve para el desglose del panel.
  const TODAS = { estrellas: true, reliquias: true, buffs: true, debuffs: true, lider: true, permanente: true };
  function stats(p, capas = TODAS) {
    const b = p.base;
    const flat = { hp: 0, dmg: 0, spd: 0 }, pct = { hp: 0, dmg: 0, spd: 0 };
    const sec = { ...BASE_COMUN };
    for (const [k, v] of Object.entries(p.extra || {})) sec[k] = (sec[k] || 0) + v;
    if (capas.reliquias) for (const sl of p.slots || []) {
      const r = sl.relic;
      if (!r || sl.locked) continue;
      flat[r.flat[0]] += r.flat[1];
      for (const [k, v] of r.rolls) {
        if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] += v;
      }
    }
    if (capas.estrellas && p.estrellas) {                            // estrellas de la cuenta: +3% HP/Daño/Velocidad y +1 punto a cada % por estrella
      const n = p.estrellas;
      pct.hp += BONO_ESTRELLA.base * n; pct.dmg += BONO_ESTRELLA.base * n; pct.spd += BONO_ESTRELLA.base * n;
      for (const k of Object.keys(BASE_COMUN)) sec[k] += BONO_ESTRELLA.pct * n;
    }
    if (capas.reliquias) for (const m of pasivasDeReliquia(p)) {      // reliquia: bono fijo y lo que ha crecido
      for (const [k, v] of Object.entries({ ...m.bono }).concat(m.crece ? [[m.crece.stat, p.creceRel?.[m.crece.stat] || 0]] : [])) {
        if (k in flat) flat[k] += v; else if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
      }
    }
    if (capas.reliquias) for (const m of pasivasDeReliquia(p)) {      // contador de reliquia: bono por cada carga
      const n = m.contador && get(p, m.contador.efecto)?.valor;
      if (n) for (const [k, v] of Object.entries(m.contador.bono)) {
        if (k in flat) flat[k] += v * n; else if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v * n; else sec[k] = (sec[k] || 0) + v * n;
      }
    }
    for (const e of p.estados) {
      if (!capas[EFECTOS[e.id]?.tipo === 'debuff' ? 'debuffs' : 'buffs']) continue;
      if (e.id === 'dmgUp') pct.dmg += e.valor;
      if (e.id === 'protect') sec.res += BUFFS.proteccion;
      if (e.id === 'frenzy') sec.critRate += BUFFS.frenesi;
      if (e.id === 'haste') pct.spd += BUFFS.celeridad;
      if (e.id === 'bloodlust') sec.critDmg += BUFFS.letalidad;
      if (e.id === 'keen') sec.acc += BUFFS.agudeza;
      if (e.id === 'pierce') sec.pen += BUFFS.perforacion;
      if (e.id === 'blind') sec.acc -= DEBUFFS.ceguera;
      if (e.id === 'agotar') pct.dmg -= DEBUFFS.agotar;
      if (e.id === 'wear') sec.armor -= e.valor;
      if (e.id === 'freeze') pct.spd -= CONTROL.congelacionVel * (e.mega ? 2 : 1);
    }
    if (capas.lider) for (const x of P) {                // pasiva "bonoPorAliadosQueAplican": bono a todo su equipo según cuántos aliados aplican X (mientras viva)
      const bp = x.pasiva?.bonoPorAliadosQueAplican;
      if (!bp || x.lado !== p.lado || x.muerto || !x.aliadosQueAplican) continue;
      const n = Math.min(x.aliadosQueAplican, bp.max ?? 4);
      for (const [k, v] of Object.entries(bp.bono)) { if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v * n; else sec[k] = (sec[k] || 0) + v * n; }
    }
    if (capas.buffs) for (const x of P) {                // zona: bono a todo el equipo de quien la levantó (p. ej. Ramesseum Tentyris)
      if (x.lado !== p.lado || x.muerto) continue;
      const z = get(x, 'zona');
      for (const [k, v] of Object.entries(z?.zona?.bono || {})) { if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v; }
    }
    let todo = 1;                                   // bono "todoPct": +X% a TODAS sus estadísticas (p. ej. Camino Jedi de Yoda)
    if (capas.buffs) for (const e of p.estados) if (e.bono) {      // marca con bono de estadísticas (p. ej. Sello Maldito)
      for (const [k, v] of Object.entries(e.bono)) { if (k === 'todoPct') todo *= 1 + v; else if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v; }
    }
    sec.armor = Math.max(0, sec.armor);   // la Armadura nunca baja de 0% (la Puntería sí puede quedar negativa, p. ej. con Ceguera)
    if (capas.lider) for (const l of lideresDe(p)) {          // líder "bonoPorEfecto": +valor a una estadística por cada enemigo con ese efecto
      const b = l.lider?.bonoPorEfecto;
      if (b) sec[b.stat] = (sec[b.stat] || 0) + b.valor * enemigosDe(p).filter(x => get(x, b.efecto)).length;
      if (l.lider?.bonoDano) pct.dmg += l.lider.bonoDano;                                  // líder "bonoDano": +X% de Daño fijo
      for (const [k, v] of Object.entries(l.lider?.bonoStat || {})) {   // líder "bonoStat": p. ej. +15% Armadura o hpPct: +15% HP máx.
        if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
      }
      const ac = l.lider?.acumulaPorDoT;                                                   // líder "acumulaPorDoT": lo ganado hasta ahora
      if (ac && l.acumLider) sec[ac.stat] = (sec[ac.stat] || 0) + l.acumLider;
    }
    const bpe = p.pasiva?.bonoPorEfecto;                 // pasiva "bonoPorEfecto": como el líder, pero solo para él (p. ej. Mundo Transparente de Yorichi)
    if (capas.buffs && bpe) sec[bpe.stat] = (sec[bpe.stat] || 0) + bpe.valor * enemigosDe(p).filter(x => get(x, bpe.efecto)).length;
    if (capas.permanente) for (const [k, v] of Object.entries(p.campana || {})) {     // poder del rival en modos como Campaña (y la furia del Jefe)
      if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
    }
    if (capas.permanente) for (const [k, v] of Object.entries(p.permanente || {})) {
      if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
    }
    const php = p.pasiva?.porHpPerdido;                  // pasiva: +estadísticas por cada tramo completo de HP que le falta (p. ej. Capitán América)
    if (capas.buffs && php && p.hp != null) {
      const tramos = Math.floor(Math.max(0, 1 - p.hp / ((b.hp + flat.hp) * (1 + pct.hp) * todo)) / php.cada + 1e-9);
      for (const [k, v] of Object.entries(php.bono)) sec[k] = (sec[k] || 0) + v * tramos;
    }
    if (todo !== 1) for (const k of Object.keys(sec)) sec[k] *= todo;
    return {
      hp: (b.hp + flat.hp) * (1 + pct.hp) * todo,
      dmg: (b.dmg + flat.dmg) * (1 + pct.dmg) * todo,
      spd: (b.spd + flat.spd) * (1 + pct.spd) * todo,
      ...sec,
    };
  }
  const maxHp = p => stats(p).hp;
  // Desglose para el panel: cuánto suma o resta cada origen (se agregan por capas, en este orden)
  function desglose(p) {
    const orden = ['estrellas', 'reliquias', 'buffs', 'debuffs', 'lider', 'permanente'], capas = {}, out = {};
    let antes = stats(p, capas);
    const base = antes;
    for (const c of orden) {
      capas[c] = true;
      const ahora = stats(p, capas);
      out[c] = Object.fromEntries(Object.keys(ahora).map(k => [k, ahora[k] - antes[k]]));
      antes = ahora;
    }
    return { base, ...out };
  }
  const get = (p, id) => p.estados.find(e => e.id === id);
  const todos = (p, id) => p.estados.filter(e => e.id === id);
  const vivos = lado => P.filter(p => p.lado === lado && !p.muerto);
  const enemigosDe = p => vivos(p.lado === 'jugador' ? 'rival' : 'jugador');
  const aliadosDe = p => vivos(p.lado);
  const lideresDe = p => P.filter(x => x.lado === p.lado && x.esLider && !x.muerto);
  const quitar = (p, e) => { p.estados = p.estados.filter(x => x !== e); };

  // ================================================================ vista (lo que la interfaz necesita)
  function vistaEstados(p) {
    const out = [];
    const grupo = (id, extra) => ({ id, icono: EFECTOS[id].icono, color: EFECTOS[id].color, tipo: EFECTOS[id].tipo, tags: EFECTOS[id].tags, ...extra });
    const pctTxt = v => `${Math.round(v * 1000) / 10}%`;
    for (const e of p.estados) {
      if (e.id === 'poison' || e.id === 'bomb' || e.id === 'summon') continue;
      const def = EFECTOS[e.id];
      const nombre = e.mega ? def.mega : def.nombre;
      let texto = '', n = '';
      switch (e.id) {
        case 'burn': texto = `${pctTxt(e.valor)} HP máx. al inicio del turno · ${e.dur} ronda(s)${e.inextinguible ? ' · Amaterasu: no se puede limpiar' : ''}`; n = e.dur; break;
        case 'bleed': texto = `${pctTxt(e.valor)} HP máx. por golpe recibido · hasta limpiarlo`; break;
        case 'hemo': texto = `${pctTxt(e.valor)} por golpe y por movimiento · +1 por golpe`; n = Math.round(e.valor * 100); break;
        case 'stun': case 'possess':
          texto = e.id === 'possess' ? `Ataca a sus aliados · ${e.turnos} turno(s)` : `Pierde ${e.turnos} turno(s)`;
          n = e.turnos; break;
        case 'freeze':
          texto = `${e.capas ? `${e.capas} capa(s) de hielo: pierde su turno si no las rompen (cada golpe rompe 1, +${Math.round(CONTROL.quiebreCongelacion * 100)}% daño)` : 'Hielo roto: puede actuar'} · −${Math.round(CONTROL.congelacionVel * (e.mega ? 200 : 100))}% Velocidad · ${e.dur} ronda(s)`;
          n = e.capas || e.dur; break;
        case 'silence': texto = `No puede usar su ${NOMBRE_CAT[e.categoria]} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'blind': texto = `−${Math.round(DEBUFFS.ceguera * 100)}% Puntería · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'wear': texto = `−${Math.round(e.valor * 100)}% Armadura · +${Math.round(DEBUFFS.desgaste * 100)}% por golpe recibido (máx. ${Math.round(DEBUFFS.desgasteMax * 100)}%) · hasta limpiarlo`; n = Math.round(e.valor * 100); break;
        case 'plague': texto = `No puede recibir curaciones · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'blackPlague': texto = `No puede recibir curaciones · pierde ${Math.round(DEBUFFS.pesteNegra * 100)}% del HP máx. al final de su turno · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'confuse': texto = `50% de cambiar de objetivo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'fear': texto = `Solo puede usar su Básico · −25% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'dmgUp': texto = `+${Math.round(e.valor * 100)}% Daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'taunt': texto = `Los enemigos deben atacarlo con sus movimientos de un objetivo · ${e.permanente ? 'permanente' : `${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'frostAura': texto = `−${Math.round(BUFFS.auraGelida * 100)}% daño de golpes · ${Math.round(PUNTERIA.auraGelida * 100)}% de Congelar a quien lo golpee · ${e.permanente ? 'permanente' : `${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'mirror': texto = `Devuelve el ${Math.round(BUFFS.espejismo * 100)}% del daño de cada golpe recibido, incluido el absorbido por su Escudo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'aguja': texto = `${e.valor} aguja(s): pierde ${Math.round(e.valor * DEBUFFS.agujaTurno * 1000) / 10}% del HP máx. al inicio de su turno y recibe +${Math.round(e.valor * DEBUFFS.aguja * 100)}% de daño de Veneno y Sangrado`; n = e.valor; break;
        case 'blockBuffs': texto = `No puede recibir buffs nuevos · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'selloMaldito': texto = `Sello de ${porUid(e.fuente)?.nombre || 'Orochimaru'}: ${Object.entries(e.bono || {}).map(([k, v]) => `+${Math.round(v * 100)}% ${{ dmgPct: 'Daño', hpPct: 'HP máx.', spdPct: 'Velocidad' }[k] || k}`).join(', ')}`; break;
        case 'edoTensei': texto = `Reanimado por ${porUid(e.fuente)?.nombre || 'Orochimaru'}: no puede morir mientras ${porUid(e.fuente)?.nombre || 'Orochimaru'} viva · sus golpes pueden envenenar`; break;
        case 'cargaElectrica': texto = `${e.valor} carga(s) de ${porUid(e.fuente)?.nombre || 'Baran'}: al completar sus cargas, Sobrecarga (Aturdido)`; n = e.valor; break;
        case 'destruccion': texto = `${e.valor} de Destrucción (máx. 10): +${e.valor * 3}% de daño · el Aliento de la Destrucción las consume`; n = e.valor; break;
        case 'esclavoRuna': texto = `Lucha para ${porUid(e.fuente)?.nombre || 'Frostmourne'} hasta el final de la ronda ${p.convertido?.hasta ?? ''} · luego vuelve a morir`; n = p.convertido ? Math.max(0, p.convertido.hasta - S.ronda + 1) : ''; break;
        case 'escarchaSillad': texto = `Bendición de ${porUid(e.fuente)?.nombre || 'Sillad'}: ${Object.entries(e.bono || {}).map(([k, v]) => `+${Math.round(v * 100)}% ${{ dmgPct: 'Daño', hpPct: 'HP máx.', spdPct: 'Velocidad' }[k] || k}`).join(', ')}`; break;
        case 'emblemaFairyTail': texto = `Compañero de ${porUid(e.fuente)?.nombre || 'Natsu'}: ${Object.entries(e.bono || {}).map(([k, v]) => `+${Math.round(v * 100)}% ${{ dmgPct: 'Daño', hpPct: 'HP máx.', spdPct: 'Velocidad' }[k] || k}`).join(', ')}`; break;
        case 'llamaNatsu': texto = `${e.valor} Llama(s) del Dragón (máx. 5): +${e.valor * 5}% de daño · su Over las consume`; n = e.valor; break;
        case 'esperanzaTrunks': texto = `${e.valor} de Esperanza (máx. 5): con 5 se transforma en Super Saiyajin`; n = e.valor; break;
        case 'potencialGohan': texto = `${e.valor} de Potencial (máx. 3): con 3 despierta como Gohan Bestia`; n = e.valor; break;
        case 'theOne': { const bc = p.pasiva?.bonoPorCarga; texto = `${e.valor} de The One (máx. 12)${bc ? `: +${Math.round(e.valor * bc.pct * 100)}% HP máx.` : ''}${e.valor >= 12 ? ' · ¡THE ONE!' : ''}`; n = e.valor; break; }
        case 'marcaDemonio': texto = `Acumula el daño que recibe: ${Math.round(e.valor || 0)} · se libera al volver a usar Contra Venganza`; n = Math.round(e.valor || 0); break;
        case 'iraBroly': texto = `${e.valor} de Ira (máx. 5): con 5 despierta al Super Saiyajin Legendario`; n = e.valor; break;
        case 'almasShadowmourne': texto = `${e.valor} Alma(s) de Shadowmourne (máx. 20): +${e.valor * 15} de Daño · toda la batalla`; n = e.valor; break;
        case 'cuervos': texto = `${e.valor} clon(es) de cuervo: cada uno absorbe un ataque enemigo contra Itachi`; n = e.valor; break;
        case 'oscuridad': texto = `${e.valor} de Oscuridad (máx. 3): con 3 se transforma en Saga Oscuro`; n = e.valor; break;
        case 'grayskull': texto = `${e.valor} de Poder de Grayskull (máx. 5): Golpe de Grayskull +15% por cada uno`; n = e.valor; break;
        case 'poderRobado': texto = `${e.valor} de Poder Robado (máx. 10): Poder de Grayskull +20% por cada uno`; n = e.valor; break;
        case 'orgullo': texto = `${e.valor} de Orgullo (máx. 5): Final Flash +15% por cada uno`; n = e.valor; break;
        case 'caminoJedi': texto = `Marca de ${porUid(e.fuente)?.nombre || 'Yoda'}: +5% a todas sus estadísticas · usa su Básico cuando Yoda usa su Básico o Especial`; break;
        case 'anticipar': texto = `Si un enemigo gana un turno adicional, juega uno antes que él${e.permanente ? ' · permanente' : ` · ${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'hiraishin': texto = `Marca de ${porUid(e.fuente)?.nombre || 'Minato'}: al golpearlo, la consume y gana un turno extra · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'zona': texto = `${e.zona.nombre}: ${e.zona.desc} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'sello': { const se = p.pasiva?.sello; texto = se ? `${se.nombre}: ${se.desc}` : ''; break; }
        case 'rival': texto = `Rival de ${porUid(e.fuente)?.nombre || 'Vegeta'}: recibe más daño de él`; break;
        case 'cargas': texto = `${e.valor} carga(s): su próximo movimiento que las consume hace más daño`; n = e.valor; break;
        case 'incite': texto = `Solo puede usar su Básico contra ${porUid(e.fuente)?.nombre || 'quien lo incitó'} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'shield': texto = `Absorbe ${Math.round(e.valor)} de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'pierce': texto = `+${Math.round(BUFFS.perforacion * 100)}% Penetración de escudo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'solarBurn': texto = `Las curaciones le hacen daño (ignora Armadura y Escudo) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'aoeDodge': texto = `Esquiva los movimientos de área de los enemigos (daño y efectos) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'stealth': texto = `Los enemigos no pueden elegirlo con ataques de un objetivo · se rompe al recibir daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'protect': texto = `+${Math.round(BUFFS.proteccion * 100)}% Resistencia · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'frenzy': texto = `+${Math.round(BUFFS.frenesi * 100)}% Prob. Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'haste': texto = `+${Math.round(BUFFS.celeridad * 100)}% Velocidad · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'bloodlust': texto = `+${Math.round(BUFFS.letalidad * 100)}% Daño Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'keen': texto = `+${Math.round(BUFFS.agudeza * 100)}% Puntería · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'agotar': texto = `−${Math.round(DEBUFFS.agotar * 100)}% de Daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'weaken': texto = `Recibe +${Math.round(DEBUFFS.debilitar * 100)}% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'expuesto': texto = `Recibe +${Math.round(DEBUFFS.expuesto * 100)}% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'camino': { const f = p.pasiva?.ciclo?.fases?.[e.valor]; texto = f ? `${f.nombre}: ${f.desc}` : ''; break; }
        case 'auraLuz': texto = `Las curaciones que recibe se multiplican ×${BUFFS.auraLuz} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'regen': texto = `Cura ${Math.round(BUFFS.regeneracion * 100)}% del HP máx. al inicio de su turno · ${e.permanente ? 'permanente' : `${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'infect': texto = `Quien lo golpee recibe Veneno sin tirada${e.permanente ? ' · permanente' : ` · ${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'fireAura': texto = `Quema (5%, 1 turno) al enemigo que lo golpee · ${e.permanente ? 'permanente' : `${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
      }
      const fase = e.id === 'camino' ? p.pasiva?.ciclo?.fases?.[e.valor] : e.id === 'sello' ? p.pasiva?.sello : e.id === 'zona' ? e.zona : null;      // ciclo: se ve el icono y el nombre de la fase activa
      out.push(grupo(e.id, { nombre, texto, n, ...(fase ? { nombre: fase.nombre, icono: fase.icono } : {}) }));
    }
    const ven = todos(p, 'poison');
    if (ven.length) out.push(grupo('poison', { nombre: `Veneno ×${ven.length}`, n: ven.length,
      texto: `${pctTxt(ven.reduce((s, x) => s + x.valor, 0))} por turno · duraciones: ${ven.map(x => x.dur).join(', ')}` }));
    const bom = todos(p, 'bomb');
    if (bom.length) out.push(grupo('bomb', { nombre: bom.length > 1 ? `Bomba ×${bom.length}` : 'Bomba', n: Math.min(...bom.map(x => x.contador)),
      texto: `Explota en ${bom.map(x => x.contador).join(', ')} ronda(s) · ${pctTxt(bom[0].valor)} HP máx. + 25% a sus aliados` }));
    return out;
  }
  function vista(p) {
    return {
      hp: Math.max(0, p.hp), maxHp: p.barra?.total || maxHp(p), escudo: p.escudo, muerto: p.muerto, esLider: p.esLider,
      stats: stats(p), desglose: desglose(p), estados: vistaEstados(p), cds: { ...p.cds }, silenciado: get(p, 'silence')?.categoria || null, bonos: { ...p.bonos }, inmune: p.inmune,
      invocaciones: todos(p, 'summon').map(e => ({ key: e.key, dur: e.dur, fresca: !!e.fresca, max: INVOCACIONES[e.key].dur })),
      forma: p.forma ? { nombre: p.forma.nombre, imagen: p.forma.imagen, emoji: p.forma.emoji, color: p.forma.color, turnos: p.forma.turnos, total: p.forma.total, permanente: !!p.forma.permanente } : null,
      transformacion: p.transformacion ? { nombre: p.transformacion.nombre, pasiva: p.transformacion.pasiva?.nombre, movimientos: p.transformacion.movimientos.map(m => m.nombre) } : null,
      movs: p.movimientos, pasiva: p.pasiva, jefe: p.jefe ? { furia: p.jefe.furia } : null,
    };
  }
  function emitir(t, datos = {}, ...afectados) {
    const e = { t, ...datos };
    if (afectados.length) { e.s = {}; for (const p of afectados) if (p) e.s[p.uid] = vista(p); }
    EV.push(e);
    return e;
  }
  const ordenActual = () => ({ hechos: [...S.orden], actual: S.actual?.uid || null, pendientes: pendientes().map(p => p.uid) });

  // ================================================================ turnos
  function comparar(a, b) {
    return stats(b).spd - stats(a).spd || b.base.spd - a.base.spd || b.desempate - a.desempate;
  }
  const pendientes = () => P.filter(p => !p.muerto && !S.actuaron.has(p) && p !== S.actual).sort(comparar);
  const siguiente = () => P.filter(p => !p.muerto && !S.actuaron.has(p)).sort(comparar)[0];

  function iniciarRonda() {
    S.ronda++;
    const fr = opcionesRival.furiaRonda;                    // furia por rondas (Jefe de Raid): desde esa ronda el jefe pega más cada ronda
    if (fr && S.ronda >= fr.desde) for (const j of P.filter(x => x.lado === 'rival' && !x.muerto)) {
      j.campana.dmgPct = (j.campana.dmgPct || 0) + fr.dmgPct;
      if (S.ronda === fr.desde) emitir('jefeFuria', { id: j.uid, texto: fr.texto }, j);
    }
    S.actuaron = new Set(); S.orden = [];
    for (const p of P) { p.desempate = rng(); p.usosPasiva = 0; }
    for (const x of P) {                                    // pasiva "revivirRonda": muerto, cada inicio de ronda puede revivir (una vez por partida)
      const rr = x.pasiva?.revivirRonda;
      if (!rr || !x.muerto || x.revivioRonda || x.noRevivir || rng() >= rr.prob) continue;
      x.revivioRonda = true;
      emitir('pasiva', { id: x.uid, nombre: x.pasiva.nombre });
      revivir(x, rr.hp);
      if (rr.alRevivir) ejecutarAccion(x, rr.alRevivir, {});
    }
    emitir('ronda', { n: S.ronda, orden: ordenActual() });
    for (const l of P.filter(x => x.esLider && !x.muerto && x.lider?.alIniciarRonda)) {
      emitir('liderActua', { id: l.uid, nombre: l.lider.nombre });
      ejecutarAccion(l, l.lider.alIniciarRonda, {});
    }
    for (const p of P) {                                    // pasiva "efectoPropio": empieza con ese efecto y, si se le termina o se lo limpian,
      const ep = !p.muerto && p.pasiva?.efectoPropio;       // se le vuelve a aplicar al inicio de la ronda siguiente (p. ej. Veneno de Glicinia de Shinobu)
      if (ep && !get(p, ep.id)) aplicarEfecto(p, p, { ...ep });
    }
    for (const p of P) pasivas(p, 'alIniciarRonda', {});      // pasivas "al inicio de cada ronda" (p. ej. Modo Rikudo)
    for (const p of P) {                                    // zona: actúa al inicio de cada ronda mientras dure (p. ej. Luz de Dendera)
      const z = !p.muerto && get(p, 'zona');
      if (!z?.zona?.alIniciarRonda || !enemigosDe(p).length) continue;
      emitir('pasiva', { id: p.uid, nombre: z.zona.nombre });
      ejecutarAccion(p, z.zona.alIniciarRonda, {});
    }
    procesarReacciones();
  }

  function finRonda() {
    for (const p of P) {                                    // reliquia "recuperaGolpes": cura X veces el HP perdido por golpes en la ronda
      const perdido = p.perdidoGolpesRonda || 0; p.perdidoGolpesRonda = 0;
      if (p.muerto || !perdido) continue;
      const m = pasivasDeReliquia(p).find(x => x.recuperaGolpes);
      if (m) curar(p, p, perdido * m.recuperaGolpes);
    }
    for (const x of P) if (x.convertido && x.convertido.hasta <= S.ronda) {   // reliquia "convertir": se acaba su tiempo
      const vivo = !x.muerto;
      x.lado = x.convertido.lado; x.convertido = null; x.noRevivir = true;
      if (vivo) { x.hp = 0; x.muerto = true; x.estados = []; x.escudo = 0; emitir('muerte', { a: x.uid, invocaciones: 0, lider: false }, x); emitir('bonoVisible', { a: x.uid, texto: '❄️ La runa lo libera' }, x); }
    }
    for (const p of P) if (!p.muerto) for (const m of pasivasDeReliquia(p)) {   // reliquia "crece" (p. ej. Armadura de Mithril)
      const c = m.crece; if (!c) continue;
      p.creceRel ||= {};
      const antes = p.creceRel[c.stat] || 0, nuevo = Math.min(c.max, antes + c.valor);
      if (nuevo <= antes) continue;
      const hpAntes = maxHp(p);
      p.creceRel[c.stat] = nuevo;
      if (c.stat === 'hpPct') { p.hp += maxHp(p) - hpAntes; emitir('actualizar', {}, p); }
    }
    const explotan = [], terminan = [];
    for (const p of P) {
      if (p.muerto) continue;
      for (const c of CATEGORIAS) if (p.cds[c] > 0) p.cds[c]--;
      if (p.formaBase && p.formaBase.cds !== p.cds) for (const c of CATEGORIAS) if (p.formaBase.cds[c] > 0) p.formaBase.cds[c]--;
      for (const e of p.estados) {
        // Regla general: un efecto aplicado a alguien que YA actuó en esta ronda no pierde duración al final de ella
        const salta = e.nuevo; e.nuevo = false;
        if (salta) continue;
        if (e.dur !== undefined) e.dur--;
        if (e.alTerminar && e.dur !== undefined && e.dur <= 0) terminan.push([p, e]);
        if (e.id === 'bomb') { e.contador--; if (e.contador <= 0) explotan.push([p, e]); }
      }
      todos(p, 'summon').filter(e => e.dur <= 0).forEach(e => emitir('invocacionExpira', { de: p.uid, key: e.key }));
      p.estados = p.estados.filter(e => (e.dur === undefined || e.dur > 0) && !(e.id === 'bomb' && e.contador <= 0));
    }
    for (const [p, b] of explotan) if (!p.muerto) explotarBomba(p, b, false);
    for (const x of P) if (x.muerto && x.reviveRonda && x.reviveRonda <= S.ronda && !x.revivioReliquia) {   // reliquia "revivir"
      x.revivioReliquia = true; revivir(x, x.reviveRelHp);
      if (!x.muerto) emitir('bonoVisible', { a: x.uid, texto: '⏳ ¡Vuelve en el tiempo!' }, x);
    }
    // "alTerminar": al expirar el efecto (no si lo disipan o limpian), su dueño ejecuta la acción (p. ej. Gran Cuerno de Aldebarán)
    for (const [p, e] of terminan) { const d = porUid(e.duenoTerminar) || p; if (!d.muerto && enemigosDe(d).length) ejecutarAccion(d, e.alTerminar, {}); }
    procesarReacciones();
    emitir('finRonda', {}, ...P);
  }

  function inicioTurno(p) {
    if (get(p, 'regen')) curar(p, p, maxHp(p) * BUFFS.regeneracion);
    const q = get(p, 'burn');
    if (q) danoDoT(p, q.valor, 'burn', fuentesDe([q]));
    const v = todos(p, 'poison');
    if (v.length && !p.muerto) danoDoT(p, v.reduce((s, x) => s + x.valor, 0), 'poison', fuentesDe(v));
    const ag = get(p, 'aguja');                                   // Agujas Escarlata: la agonía crece con cada aguja
    if (ag && !p.muerto) danoDoT(p, ag.valor * DEBUFFS.agujaTurno, 'aguja', fuentesDe([ag]));
  }

  // Devuelve true si el personaje no puede elegir su acción este turno (perdió el turno o está poseído)
  function procesarControl(p) {
    const c = p.estados.find(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0));
    if (!c) return false;
    if (c.id === 'freeze') {       // hielo sin romper: pierde el turno y el hielo desaparece (el debuff sigue: −Velocidad)
      c.capas = 0;
      emitir('pierdeTurno', { id: p.uid, motivo: 'freeze' }, p);
      p.inmune = true; p.recienLiberado = true;
      emitir('controlFin', { id: p.uid }, p);
      return true;
    }
    c.turnos--;
    if (c.id === 'possess') {
      emitir('poseido', { id: p.uid, mega: !!c.mega }, p);
      const victimas = aliadosDe(p).filter(x => x !== p);
      const basico = p.movimientos.find(m => m.categoria === 'basico');
      if (victimas.length && basico) ejecutarMovimiento(p, basico, rng.elegir(victimas), { forzado: true });
    } else {
      emitir('pierdeTurno', { id: p.uid, motivo: c.id }, p);
    }
    if (p.muerto) return true;
    if (c.turnos <= 0) {
      quitar(p, c);
      p.inmune = true; p.recienLiberado = true;       // protección contra el bloqueo infinito
      emitir('controlFin', { id: p.uid }, p);
    } else if (c.mega && c.turnos === 1) {
      c.mega = false;
      emitir('actualizar', {}, p);
    }
    return true;
  }

  function terminarTurno(p) {
    if (get(p, 'blackPlague') && !p.muerto) pesteNegra(p);
    S.actuaron.add(p); S.orden.push(p.uid);
    const dren = p.pasiva?.drenajePropio;                  // p. ej. Modo Barión: quema su propia vida (nunca baja de 1 HP)
    if (dren && !p.muerto) {
      const d = Math.min(p.hp - 1, dren * maxHp(p));
      if (d > 0) { p.hp -= d; emitir('danoEfecto', { de: p.uid, a: p.uid, dano: d, escudo: 0, color: 0xf97316 }, p); }
    }
    for (const x of P) if (x.muerto && x.reviveEn > 0 && --x.reviveEn === 0) revivir(x);
    p.faseActiva = null;
    if (p.inmune && !p.recienLiberado) p.inmune = false;
    p.recienLiberado = false;
    for (const e of todos(p, 'summon')) e.fresca = false;
    if (p.forma && !p.forma.permanente && !p.muerto) {   // la forma dura N turnos propios (el turno en que se transforma no cuenta)
      if (p.forma.recien) p.forma.recien = false;
      else if (--p.forma.turnos <= 0) revertir(p);
      else emitir('actualizar', {}, p);
    }
    S.actual = null;
  }

  // Peste Negra: reduce el HP máx. (5% del original, piso 25%). No es daño; el HP actual solo baja si queda por encima del nuevo máximo.
  // La pérdida es permanente (aunque se limpie) y se guarda como bono permanente negativo, así sigue en las transformaciones.
  function pesteNegra(p) {
    const perdido = p.pestePerdida || 0;
    const quita = Math.min(DEBUFFS.pesteNegra, 1 - DEBUFFS.pesteNegraPiso - perdido);
    if (quita <= 1e-9) return;
    p.pestePerdida = perdido + quita;
    p.permanente.hpPct = (p.permanente.hpPct || 0) - quita;
    if (!p.barra) p.hp = Math.min(p.hp, maxHp(p));
    emitir('bonoVisible', { a: p.uid, texto: `☠️ −${Math.round(quita * 100)}% HP máx.` }, p);
  }

  // pasiva "ciclo": al inicio de cada turno en que actúa pasa a la siguiente fase (empieza en la primera) y ejecuta su "alIniciar".
  // La fase activa da "bonoDano" a sus golpes y "alFinal" al terminar su movimiento (objetivo principal; en área, uno golpeado al azar).
  function avanzarCiclo(p) {
    const ci = p.pasiva?.ciclo;
    if (!ci || p.muerto) return;
    p.cicloIdx = p.cicloIdx == null ? 0 : (p.cicloIdx + 1) % ci.fases.length;
    const f = ci.fases[p.cicloIdx];
    p.faseActiva = f;
    let e = get(p, ci.efecto);
    if (!e) { e = { id: ci.efecto, permanente: true }; p.estados.push(e); }
    e.valor = p.cicloIdx;
    emitir('bonoVisible', { a: p.uid, texto: `${f.icono} ${f.nombre}` }, p);
    if (f.alIniciar) ejecutarAccion(p, f.alIniciar, { objetivo: p });
    procesarReacciones();
  }

  // pasiva "sello": rompe el sello (para siempre): el movimiento sellado queda listo al instante y ejecuta "alRomper"
  function romperSello(p) {
    if (!p.sellado || p.muerto) return;
    const se = p.pasiva.sello;
    p.sellado = false;
    quitar(p, get(p, 'sello'));
    p.cds[se.categoria] = 0;
    emitir('pasiva', { id: p.uid, nombre: p.pasiva.nombre });
    emitir('bonoVisible', { a: p.uid, texto: se.textoRomper || '🔓 ¡Sello roto!' }, p);
    if (se.alRomper) ejecutarAccion(p, se.alRomper, { objetivo: p });
    emitir('actualizar', {}, p);
  }

  function comprobarFin() {
    if (S.fin) return true;
    const gj = vivos('jugador').length, gr = vivos('rival').length;
    if (gj && gr) return false;
    S.fin = { ganador: gj ? 'jugador' : 'rival', ronda: S.ronda };
    emitir('fin', S.fin);
    return true;
  }

  // Límite de rondas: gana quien tenga más personajes vivos; mismo número = empate
  function finPorLimite() {
    const gj = vivos('jugador').length, gr = vivos('rival').length;
    S.fin = { ganador: gj > gr ? 'jugador' : gr > gj ? 'rival' : 'empate', ronda: S.ronda, limite: true };
    emitir('fin', S.fin);
  }

  function avanzar() {
    while (!comprobarFin()) {
      let n = S.ronda ? siguiente() : null;
      if (!n) {
        if (S.ronda) { finRonda(); if (comprobarFin()) return; if (S.ronda - S.rondaBase >= (opcionesRival.limiteRondas || LIMITE_RONDAS)) { finPorLimite(); return; } }
        iniciarRonda();
        n = siguiente();
        if (!n) return;
      }
      S.actual = n;
      emitir('turno', { id: n.uid, orden: ordenActual() }, n);
      inicioTurno(n);
      if (comprobarFin()) return;
      if (n.muerto) { terminarTurno(n); continue; }
      if (procesarControl(n)) { terminarTurno(n); continue; }
      const ops = opciones(n);
      if (!ops.some(o => o.disponible)) {            // Silencio (o Silencio + Miedo): lo único listo está bloqueado -> pierde el turno
        emitir('pierdeTurno', { id: n.uid, motivo: 'silence' }, n);
        n.inmune = true; n.recienLiberado = true;
        terminarTurno(n); continue;
      }
      avanzarCiclo(n);
      if (comprobarFin()) return;
      pasivas(n, 'alIniciarTurno', { objetivo: n });
      if (comprobarFin()) return;
      S.esperando = { id: n.uid, opciones: opciones(n) };
      return;
    }
  }

  // Incitar: quien lo aplicó (si sigue vivo); mientras dure, solo puede usar el Básico y solo contra él
  const incitadoPor = p => { const e = get(p, 'incite'); const f = e && porUid(e.fuente); return f && !f.muerto && f.lado !== p.lado ? f : null; };
  // requiereInvocaciones { key, o, oActiva }: tiene esa invocación, al menos `o` invocaciones activas, o la invocación `oActiva`
  const puedeSacrificar = (p, r) => { const l = todos(p, 'summon'); return l.some(e => e.key === r.key || e.key === r.oActiva) || l.length >= r.o; };
  // Silencio bloquea su categoría; Miedo bloquea Especial y Over (también si los usaría una pasiva o reacción)
  const movBloqueado = (p, categoria) => get(p, 'silence')?.categoria === categoria || (categoria !== 'basico' && !!get(p, 'fear'));
  function opciones(p) {
    const inc = incitadoPor(p);
    return p.movimientos.map(m => ({
      categoria: m.categoria,
      agotado: !!(m.unaVez && p.usados?.has(m.nombre)),     // unaVez: solo se puede usar una vez por partida
      sellado: !!(p.sellado && p.pasiva.sello.categoria === m.categoria),
      sinCaidos: !!(m.requiereAliadoCaido && !P.some(x => x.lado === p.lado && x.muerto && x !== p)),   // p. ej. Edo Tensei
      sinSacrificio: !!(m.requiereInvocaciones && !puedeSacrificar(p, m.requiereInvocaciones)),          // p. ej. Canto del Dios del Sol
      miedo: m.categoria !== 'basico' && !!get(p, 'fear'),
      disponible: !(p.sellado && p.pasiva.sello.categoria === m.categoria) && !(m.requiereAliadoCaido && !P.some(x => x.lado === p.lado && x.muerto && x !== p)) && (p.cds[m.categoria] || 0) === 0 && !movBloqueado(p, m.categoria) && (!inc || m.categoria === 'basico')
        && !(m.unaVez && p.usados?.has(m.nombre)) && !(m.requiereInvocaciones && !puedeSacrificar(p, m.requiereInvocaciones)),
      cd: p.cds[m.categoria] || 0,
      objetivos: objetivosValidos(p, m).map(t => t.uid),
    }));
  }
  // ================================================================ turnos especiales
  // Anticipar (buff o pasiva): cuando un enemigo gana un turno extra, quien tiene Anticipar juega un turno ANTES de que el
  // enemigo lo tome. Los turnos regalados (turnoExtra a otro) se juegan al terminar el turno de quien los dio. Ninguno de los
  // dos es un turno normal: sin DoT, Regeneración ni control y no baja cooldowns (igual que un turno extra), y no activan Anticipar.
  function ganoTurnoExtra(t) {
    for (const x of P) if (!x.muerto && x.lado !== t.lado && get(x, 'anticipar') && !S.anticipan.includes(x)) S.anticipan.push(x);
  }
  const puedeJugar = x => x && !x.muerto && !conControl(x) && opciones(x).some(o => o.disponible);
  function turnoEspecial(x, texto) {
    x.turnoEspecial = true; S.actual = x;
    emitir('turnoExtra', { id: x.uid, texto }, x);
    emitir('bonoVisible', { a: x.uid, texto }, x);
    S.esperando = { id: x.uid, opciones: opciones(x) };
  }
  // Qué pasa después de que alguien actúa: Anticipar > su turno extra > fin de su turno > turnos regalados > siguiente en la ronda
  function seguirTras(a) {
    if (!comprobarFin()) {
      let x; while ((x = S.anticipan.shift()) && !puedeJugar(x));
      if (x) { if (!a.turnoEspecial) S.reanudar = a; return turnoEspecial(x, '🔮 ¡Anticipar!'); }
    }
    if (a.turnoEspecial) {
      if (a.turnosExtra > 0 && !comprobarFin() && puedeJugar(a)) {   // ganó un turno extra durante su turno especial: lo juega ya
        a.turnosExtra--;
        emitir('turnoExtra', { id: a.uid }, a);
        S.esperando = { id: a.uid, opciones: opciones(a) };
        return;
      }
      a.turnosExtra = 0; a.turnoEspecial = false;
      const r = S.reanudar; S.reanudar = null;
      if (r) { S.actual = r; return seguirTras(r); }     // vuelve con quien iba a tomar su turno extra
      return siguienteDeCola();
    }
    if (a.turnosExtra > 0 && !a.muerto && !comprobarFin() && opciones(a).some(o => o.disponible)) {   // turno extra: sin DoT, Regeneración ni control; no baja cooldowns
      a.turnosExtra--;
      emitir('turnoExtra', { id: a.uid }, a);
      S.esperando = { id: a.uid, opciones: opciones(a) };
      return;
    }
    a.turnosExtra = 0;
    terminarTurno(a);
    siguienteDeCola();
  }
  function siguienteDeCola() {
    let x; while (!comprobarFin() && (x = S.cola.shift())) if (puedeJugar(x)) return turnoEspecial(x, '✨ Turno adicional');
    S.cola = [];
    avanzar();
  }

  function objetivosValidos(p, m) {
    const inc = incitadoPor(p);
    if (inc && m.categoria === 'basico' && m.objetivo === 'enemigo') return [inc];
    if (m.objetivo === 'enemigo') return m.ignoraProvocacion ? enemigosDe(p) : conSigilo(conProvocacion(enemigosDe(p)));   // ignoraProvocacion: también ignora Sigilo
    if (m.objetivo === 'aliado') return aliadosDe(p);
    return [];
  }
  // Esquiva Área: los movimientos de "todos los enemigos" (daño y efectos) no lo alcanzan
  function sinEsquiva(lista) {
    const fuera = lista.filter(x => get(x, 'aoeDodge'));
    for (const x of fuera) emitir('esquiva', { a: x.uid });
    return lista.filter(x => !fuera.includes(x));
  }
  // Sigilo: no se puede elegir con ataques de un objetivo (si todos lo tienen, no cuenta)
  function conSigilo(lista) {
    const visibles = lista.filter(x => !get(x, 'stealth'));
    return visibles.length ? visibles : lista;
  }
  // cualquier daño que baje HP o Escudo rompe el Sigilo
  // fuente: quién causó el daño (personaje), o lista [[personaje, fracción], ...] si se reparte (p. ej. Venenos de varios)
  function recibioDano(t, cantidad, fuente = null) {
    const real = Math.max(0, cantidad - Math.max(0, -t.hp));        // sin el daño sobrante del golpe que mata
    t.est.recibido += real;
    const reparto = !fuente ? [] : Array.isArray(fuente) ? fuente : [[fuente, 1]];
    for (const [f, frac] of reparto) if (f && f.lado !== t.lado) f.est.dano += real * frac;
    const ultimo = reparto.filter(([f]) => f && f.lado !== t.lado).sort((x, y) => y[1] - x[1])[0];
    if (ultimo) t.ultimoDanoDe = ultimo[0];
    if (t.pasiva?.rival && cantidad > 0 && !t.muerto) revisarTransformacion(t);
    if (t.pasiva?.transformarSi && cantidad > 0 && !t.muerto && t.hp > 0) revisarTransformarSi(t);
    if (t.jefe && !t.jefe.furia && t.hp > 0 && t.hp < t.jefe.umbral * maxHp(t)) {   // Jefe: entra en furia una vez
      t.jefe.furia = true;
      t.campana.dmgPct = (t.campana.dmgPct || 0) + t.jefe.dmgPct;
      t.campana.spdPct = (t.campana.spdPct || 0) + t.jefe.spdPct;
      emitir('jefeFuria', { id: t.uid, texto: `🔥 ¡FURIA! +${Math.round(t.jefe.dmgPct * 100)}% Daño y +${Math.round(t.jefe.spdPct * 100)}% Velocidad` }, t);
    }
    const rs = t.sellado && t.pasiva.sello.romper;
    if (rs?.hpMenor && t.hp > 0 && t.hp < rs.hpMenor * maxHp(t)) romperSello(t);
    const s = cantidad > 0 && !t.muerto && get(t, 'stealth');
    if (s) { quitar(t, s); emitir('sigiloRoto', { a: t.uid }, t); }
    for (const e of t.estados) if (EFECTOS[e.id]?.acumulaDano && real > 0) { e.valor = (e.valor || 0) + real; emitir('actualizar', {}, t); }   // marca acumuladora (p. ej. Marca del Demonio)
    // pasiva "cargasAlRecibirDano": CUALQUIER daño recibido (golpe, DoT o efecto) le da 1 carga (p. ej. The One de Escanor)
    const cd = t.pasiva?.cargasAlRecibirDano;
    if (cd && cantidad > 0 && t.hp > 0 && !t.muerto) ganarCargas(t, 1, cd.max, cd.efecto);
    // pasiva "curaAlRecibirDe": el daño de un enemigo que tiene ese efecto lo cura un % (con `siPropio`: solo si él tiene ese otro efecto)
    const cr = t.pasiva?.curaAlRecibirDe, at = fuente && !Array.isArray(fuente) ? fuente : null;
    if (cr && cantidad > 0 && t.hp > 0 && !t.muerto && at && at.lado !== t.lado && get(at, cr.efecto) && (!cr.siPropio || get(t, cr.siPropio))) {
      emitir('bonoVisible', { a: t.uid, texto: cr.texto || '¡Absorbe el daño!' }, t);
      curar(t, t, real * cr.pct);
    }
    // gatillo "alRecibirDano": CUALQUIER daño recibido (golpe, DoT o efecto). El daño de danoPorCuracion no lo activa: dos Nezuko se rebotarían sin fin
    if (cantidad > 0 && t.hp > 0 && !t.muerto && !repartiendoCuracion) pasivas(t, 'alRecibirDano', { atacante: at });
  }
  const porUid = uid => uid && P.find(p => p.uid === uid);
  // tiene un Control que le quita turnos (aturdido, poseído o con hielo sin romper)
  // un movimiento con "iaMinEnemigosCon { efecto, min }" solo conviene si al menos min enemigos vivos (o todos, si quedan menos) tienen ese
  // efecto (p. ej. Mil Cortes Divinos cura a los enemigos: solo vale la pena con Quemadura Solar). Lo usan la IA y los contraataques.
  const movimientoConviene = (a, m) => { const c = m.iaMinEnemigosCon; if (!c) return true; const en = enemigosDe(a); return en.filter(x => get(x, c.efecto)).length >= Math.min(c.min, en.length); };
  const conControl = p => p.estados.some(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0));
  function ganarCargas(p, n, max, id = 'cargas') {          // id: tipo de carga ('cargas' = Furia Dorada, 'orgullo' = Orgullo Sayajin…)
    let e = get(p, id);
    if (!e) { e = { id, valor: 0 }; p.estados.push(e); }
    const antes = e.valor; e.valor = Math.min(max, e.valor + n);
    if (e.valor !== antes) emitir('actualizar', {}, p);
    const bc = p.pasiva?.bonoPorCarga;         // pasiva "bonoPorCarga": cada carga ganada da un bono permanente (si es HP máx., el actual sube lo mismo)
    if (bc && bc.efecto === id && e.valor > antes) {
      const hpAntes = maxHp(p);
      p.permanente[bc.stat] = (p.permanente[bc.stat] || 0) + (e.valor - antes) * bc.pct;
      const sube = maxHp(p) - hpAntes;
      if (sube > 0) { p.hp += sube; p.hpGanadoCargas = (p.hpGanadoCargas || 0) + sube; }
    }
    const am = p.pasiva?.alMaxCargas;          // pasiva "alMaxCargas": al llegar al máximo por primera vez, ejecuta una acción (p. ej. Provocación permanente)
    if (am && am.efecto === id && e.valor >= max && antes < max && !p.maxCargasHecho) {
      p.maxCargasHecho = true;
      if (am.texto) emitir('bonoVisible', { a: p.uid, texto: am.texto }, p);
      for (const acc of [].concat(am.accion)) ejecutarAccion(p, acc, { objetivo: p, ejecutor: p });
    }
    const tc = p.pasiva?.transformarConCargas;       // al juntar N cargas: se transforma (consume las cargas); p. ej. Saga → Saga Oscuro
    if (tc && tc.efecto === id && e.valor >= tc.cargas && !p.forma && p.transformacion && !p.transformando && (!tc.soloLider || p.esLider)) {   // soloLider: solo si es el líder del equipo
      p.transformando = true;
      reacciones.push(() => {
        p.transformando = false;
        if (p.muerto || p.forma) return;
        quitar(p, get(p, id));
        transformar(p, tc.turnos);
      });
    }
  }
  // ---------------------------------------------------------------- Rivalidad (pasiva "rival"): marca a un enemigo como su Rival
  // Rival = Goku si está en el equipo enemigo; si no, el enemigo con más Daño. Si el Rival muere, bono permanente y nuevo Rival.
  const tieneBuff = t => t.estados.some(e => EFECTOS[e.id]?.tipo === 'buff' && e.id !== 'summon');   // algún buff activo (sin contar invocaciones)
  const esRival = (v, t) => t.estados.some(e => e.id === 'rival' && e.fuente === v.uid);
  function elegirRival(v, avisar = true) {
    const l = enemigosDe(v);
    if (!l.length) return;
    const r = l.find(x => x.id === 'goku') || l.reduce((x, y) => stats(y).dmg > stats(x).dmg ? y : x);
    r.estados.push({ id: 'rival', fuente: v.uid, permanente: true });
    if (avisar) emitir('efecto', { a: r.uid, id: 'rival', texto: `👑 Nuevo Rival de ${v.nombre}` }, r);
  }
  function ganarOrgullo(p, n) {
    const rv = p.pasiva?.rival;
    if (!rv || p.muerto) return;
    ganarCargas(p, n, rv.max || 5, 'orgullo');
    revisarTransformacion(p);
  }
  // transformación automática: al llegar a N de Orgullo o al bajar de cierto % de HP (una vez; se hace al terminar la acción en curso)
  function revisarTransformacion(p) {
    const tc = p.pasiva?.rival?.transformar;
    if (!tc || p.forma || p.muerto || !p.transformacion || p.transformando) return;
    if ((get(p, 'orgullo')?.valor || 0) >= tc.cargas || p.hp / maxHp(p) < tc.hp) {
      p.transformando = true;
      reacciones.push(() => { p.transformando = false; if (!p.forma && !p.muerto) transformar(p); });
    }
  }
  // pasiva "transformarSi { hpMenor, invocacion, consumir }": se transforma (al terminar la acción en curso) si su HP está en hpMenor o menos
  // y tiene esa invocación activa; con consumir, la invocación desaparece (p. ej. Marik → Ra Modo Fénix con el Dragón Alado de Ra)
  function revisarTransformarSi(p) {
    const ti = p.pasiva?.transformarSi;
    if (!ti || p.forma || p.muerto || !p.transformacion || p.transformando) return;
    if (p.hp / maxHp(p) > ti.hpMenor || !todos(p, 'summon').some(e => e.key === ti.invocacion)) return;
    p.transformando = true;
    reacciones.push(() => {
      p.transformando = false;
      if (p.forma || p.muerto) return;
      const e = todos(p, 'summon').find(x => x.key === ti.invocacion);
      if (!e || p.hp / maxHp(p) > ti.hpMenor) return;
      if (ti.consumir) { quitar(p, e); emitir('invocacionRetira', { de: p.uid, key: e.key }, p); }
      transformar(p, ti.turnos);
      if (ti.hp) { p.hp = Math.max(p.hp, maxHp(p) * ti.hp); emitir('actualizar', {}, p); }   // hp: renace con ese % de vida (p. ej. el Fénix)
    });
  }
  function revivir(x, hpPct) {
    if (x.noRevivir) return;                         // p. ej. un esclavo de Frostmourne que ya cumplió su tiempo
    if (!enemigosDe(x).length) return;               // la partida ya terminó
    Object.assign(x, { muerto: false, estados: [], escudo: 0, inmune: false, recienLiberado: false, reviveEn: 0, reviveRonda: 0 });
    for (const id of x.pasiva?.efectosPermanentes || []) x.estados.push({ id, permanente: true });
    x.hp = maxHp(x) * (hpPct ?? x.pasiva?.revivir?.hp ?? 1);
    if (x.pasiva?.rival) elegirRival(x);
    emitir('revivir', { a: x.uid, nombre: x.pasiva?.revivir && hpPct == null ? x.pasiva.nombre : '' }, x);
  }
  // reparto del daño de un DoT entre quienes lo aplicaron (cada acumulación recuerda su "fuente")
  const fuentesDe = estados => { const tot = estados.reduce((s, e) => s + (e.valor || 0), 0) || 1; return estados.map(e => [porUid(e.fuente), (e.valor || 0) / tot]); };
  // Provocación: si algún candidato la tiene, los ataques de un solo objetivo solo pueden ir a ellos
  function conProvocacion(lista) {
    const prov = lista.filter(x => get(x, 'taunt'));
    return prov.length ? prov : lista;
  }

  // ================================================================ daño
  function reduccion(t, categoria) {
    let r = 0;
    for (const l of lideresDe(t)) if (l.lider?.reduccion?.categoria === categoria) r += l.lider.reduccion.pct;
    for (const p of aliadosDe(t)) {                      // pasiva "reduccionAliados": todo su equipo recibe menos daño mientras no tenga X
      const ra = p.pasiva?.reduccionAliados;
      if (ra && !(ra.salvoSi && get(p, ra.salvoSi))) r += ra.pct;
    }
    if (categoria === 'golpe' && get(t, 'frostAura')) r += BUFFS.auraGelida;   // Aura Gélida
    const rp = t.pasiva?.reduccionPropia;                  // pasiva: reduce el daño que recibe él mismo (p. ej. Aldebarán)
    if (rp?.categoria === categoria) r += rp.pct;
    return Math.min(r, .9);
  }
  // pasiva "intocable" (p. ej. Yoda): no recibe daño de ningún tipo mientras viva algún aliado suyo
  const intocable = t => !!t.pasiva?.intocable && !t.muerto && aliadosDe(t).some(x => x !== t);
  function repartir(t, d, pen) {
    if (intocable(t)) { emitir('inmune', { a: t.uid, texto: 'Intocable' }); return { aHp: 0, aEsc: 0 }; }
    let aHp = d * Math.min(pen, 1), aEsc = d - aHp;
    if (t.escudo > 0) { const abs = Math.min(t.escudo, aEsc); t.escudo -= abs; aHp += aEsc - abs; aEsc = abs; }
    else { aHp += aEsc; aEsc = 0; }
    t.hp -= aHp;
    return { aHp, aEsc };
  }
  const baseDe = (p, escala) => (ESCALADO[escala || 'dano'])(stats(p));

  // Un GOLPE: Crítico -> (Miedo) -> (quiebre de Congelación) -> Armadura -> reducciones -> Penetración de escudo/Escudo
  function golpear(a, t, mov, ctx) {
    const sa = stats(a), st = stats(t);
    let d = baseDe(a, mov.escala) * mov.pct * (1 + (a.bonos[mov.categoria] || 0));
    if (mov.bonoPorHpPerdido) {      // +X% por cada tramo completo de HP perdido del atacante
      const tramos = Math.floor((1 - a.hp / maxHp(a)) / mov.bonoPorHpPerdido.cada + 1e-9);
      d *= 1 + Math.max(0, tramos) * mov.bonoPorHpPerdido.pct;
    }
    if (ctx.cargas && mov.consumeCargas) d *= 1 + ctx.cargas * mov.consumeCargas.pct;   // cargas consumidas por este movimiento
    if (a.pasiva?.rival && esRival(a, t)) d *= 1 + a.pasiva.rival.bono;      // Rivalidad: más daño a su Rival
    if (mov.bonoContra && [].concat(mov.bonoContra.efecto).some(id => get(t, id))) d *= 1 + mov.bonoContra.pct;   // p. ej. Kirin contra quemados
    const agujas = mov.consumeAgujas && get(t, 'aguja');     // Antares: +X% por cada aguja del objetivo (y las consume)
    if (agujas) { d *= 1 + agujas.valor * mov.consumeAgujas.pct; quitar(t, agujas); emitir('bono', { id: a.uid, texto: `📍 Antares ×${agujas.valor}` }, a, t); }
    if (mov.bonoSiObjetivoMasHp && t.hp > a.hp) d *= 1 + mov.bonoSiObjetivoMasHp;   // p. ej. Asesino de Dioses
    if (mov.bonoPorEscudoPropio) d += a.escudo * mov.bonoPorEscudoPropio;   // + % de su propio Escudo (no lo gasta)
    const bh = mov.bonoPorHpGanado;          // + % del HP máx. que ganó con sus cargas (con `si`: solo si cumple esa condición)
    if (bh && a.hpGanadoCargas && cumple(bh.si, { ejecutor: a, objetivo: t })) d += a.hpGanadoCargas * bh.pct;
    const dv = a.pasiva?.danoPorVelocidad;     // pasiva: +X% de daño por cada punto de Velocidad que le saca al objetivo (con tope)
    if (dv && t.lado !== a.lado) { const dif = stats(a).spd - stats(t).spd; if (dif > 0) d *= 1 + Math.min(dif * dv.pct, dv.max); }
    const bb = a.pasiva?.bonoPorBuffsObjetivo;   // pasiva: +X% de daño por cada buff activo del objetivo (sin contar invocaciones), con tope
    if (bb && t.lado !== a.lado) d *= 1 + Math.min(t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && e.id !== 'summon').length * bb.pct, bb.max ?? 9);
    for (const l of lideresDe(a)) if (l.lider?.bonoContraConBuff && t.lado !== a.lado && tieneBuff(t)) d *= 1 + l.lider.bonoContraConBuff;
    for (const l of lideresDe(a)) if (l.lider?.bonoContraControl && t.lado !== a.lado && t.estados.some(e => EFECTOS[e.id]?.tags.includes('Control'))) d *= 1 + l.lider.bonoContraControl;   // líder: +X% a enemigos con Control
    const bm = mov.bonoPorMarca;               // movimiento: +X% por cada carga de SU marca en el objetivo; con consume, las quita
    const mkb = bm && t.estados.find(e => e.id === bm.marca && e.fuente === a.uid);
    if (mkb) { d *= 1 + (mkb.valor || 1) * bm.pct; if (bm.consume) quitar(t, mkb); }   // líder: +X% a enemigos con buffs
    for (const l of lideresDe(a)) if (l.lider?.bonoDanoConEscudo && a.escudo > 0) d *= 1 + l.lider.bonoDanoConEscudo;   // líder: +X% de daño a los aliados con Escudo
    for (const p of aliadosDe(a)) {          // pasiva "auraContra": TODO su equipo (incluido él) hace +X% a enemigos con esos efectos
      const ac = p.pasiva?.auraContra;
      if (ac && t.lado !== a.lado && [].concat(ac.efecto).some(id => get(t, id))) d *= 1 + ac.pct;
    }
    const dc = a.pasiva?.danoPorCargas;       // pasiva: +X% de daño por cada carga de un contador (p. ej. Destrucción de Antares)
    if (dc) d *= 1 + (get(a, dc.efecto)?.valor || 0) * dc.pct;
    const ej = a.pasiva?.enemigoJurado;       // pasiva: +X% de daño a un personaje concreto (p. ej. Antares ↔ Sun Jin Woo)
    if (ej && t.lado !== a.lado && t.id === ej.id) d *= 1 + ej.bono;
    const bc = a.pasiva?.bonoContra;          // pasiva: +X% de daño a enemigos con un efecto (p. ej. Reptile contra envenenados)
    if (bc && [].concat(bc.efecto).some(id => get(t, id))) d *= 1 + bc.pct;
    const fz = ctx.fase !== undefined ? ctx.fase : (S.actual === a && mov.categoria !== 'invocacion' ? a.faseActiva : null);   // ciclo: bono de la fase (p. ej. Camino Asura)
    if (fz?.bonoDano && t.lado !== a.lado) d *= 1 + fz.bonoDano;
    if (mov.bonoPorDebuffs) {                // +pct por cada tipo distinto de debuff del objetivo (3 Venenos = 1 tipo)
      const tipos = new Set(t.estados.filter(e => EFECTOS[e.id]?.tipo === 'debuff').map(e => e.id));
      d *= 1 + tipos.size * mov.bonoPorDebuffs.pct;
    }
    if (mov.bonoPorDuracionDebuffs) {         // movimiento: +X% por cada ronda restante de los debuffs del atacante y del objetivo (con tope)
      const b = mov.bonoPorDuracionDebuffs, rondas = [...a.estados, ...t.estados].reduce((s, e) => s + (EFECTOS[e.id]?.tipo === 'debuff' ? e.dur || 0 : 0), 0);
      d *= 1 + Math.min(rondas * b.pct, b.max);
    }
    if (mov.bonoPorAcumulacion) {             // movimiento: +X% por cada acumulación de un efecto en el objetivo (con tope)
      const b = mov.bonoPorAcumulacion;
      d *= 1 + Math.min(todos(t, b.efecto).length, b.max ?? 99) * b.pct;
    }
    const garantizado = (mov.criticoSiObjetivoTiene && !!get(t, mov.criticoSiObjetivoTiene))   // p. ej. Rasengan contra marcados
      || (mov.criticoSiHpMin !== undefined && t.hp / maxHp(t) >= mov.criticoSiHpMin)
      || (mov.criticoSiMasRapido && stats(a).spd > stats(t).spd);          // p. ej. Totsuka: crítico seguro contra los más lentos
    let probCrit = sa.critRate + (mov.critExtra || 0), danoCrit = sa.critDmg;
    if (mov.critExtraSi && ctx.teniaAntes?.has(mov.critExtraSi.teniaAntes)) probCrit += mov.critExtraSi.pct;   // +crítico si ya tenía X antes del movimiento
    for (const l of lideresDe(a)) {          // líder "bonoCriticoContra": +Prob. y +Daño Crítico al golpear a un enemigo con ese efecto
      const b = l.lider?.bonoCriticoContra;
      if (b && t.lado !== a.lado && get(t, b.efecto)) { probCrit += b.critRate || 0; danoCrit += b.critDmg || 0; }
    }
    if (mov.objetivo === 'todosEnemigos' && mov.categoria !== 'invocacion')   // reliquia: +Daño Crítico en área (p. ej. Shadowmourne)
      for (const m of pasivasDeReliquia(a)) danoCrit += m.critDmgAoe || 0;
    const acc = a.pasiva?.acumulaCriticoContra;   // pasiva: cada golpe a un enemigo con X sube Prob. y Daño Crítico (permanente, con tope)
    if (acc && t.lado !== a.lado) {
      const e = acc.efecto === 'debuff' ? t.estados.find(x => EFECTOS[x.id]?.tipo === 'debuff') : get(t, acc.efecto);   // 'debuff': cualquier debuff
      if (e) {
        const inc = e.mega && acc.valorMega != null ? acc.valorMega : acc.valor;
        let subio = 0;
        for (const k of acc.stats || ['critRate', 'critDmg']) {          // stats: solo esas (p. ej. Ra: solo Daño Crítico)
          const antes = a.permanente[k] || 0, nuevo = Math.min(acc.tope, antes + inc);
          a.permanente[k] = nuevo; subio = Math.max(subio, nuevo - antes);
          if (k === 'critRate') probCrit += nuevo - antes; else danoCrit += nuevo - antes;
        }
        if (subio > 0) emitir('bonoVisible', { a: a.uid, texto: `+${Math.round(subio * 100)}% ${acc.stats?.length === 1 ? NOMBRE_STAT[acc.stats[0]] || acc.stats[0] : 'Prob. y Daño Crítico'}` }, a);
      }
    }
    const critico = !mov.sinCritico && (ctx.forzarCritico || garantizado || rng() < probCrit);   // sinCritico: este ataque no puede ser crítico
    if (critico && a.pasiva?.rival?.orgulloAlCritico) ganarOrgullo(a, 1);
    if (critico && t.pasiva?.rival?.orgulloAlRecibirCritico && t.lado !== a.lado) ganarOrgullo(t, 1);
    if (critico) d *= 1 + danoCrit;
    for (const m of pasivasDeReliquia(a)) if (m.multiGolpe && mov.categoria !== 'invocacion') {   // reliquia: daño doble/triple
      let r = rng(), x = 1;
      for (const [prob, mult] of [...m.multiGolpe].sort((u, v) => v[1] - u[1])) { if (r < prob) { x = mult; break; } r -= prob; }
      if (x > 1) { d *= x; emitir('bonoVisible', { a: t.uid, texto: `¡Daño ×${x}!` }, t); }
    }
    if (a.sellado && a.pasiva.sello.dano) d *= 1 + a.pasiva.sello.dano;   // sello: p. ej. Arrogante = −10% de daño
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    let quiebre = false;
    const hielo = get(t, 'freeze');
    // 1 golpe = 1 capa rota (+8%). Un golpe de un movimiento que APLICA Congelación no rompe capas (ayuda a mantenerlas)
    if (hielo?.capas > 0 && !(mov.efectos || []).some(ef => ef.accion?.id === 'freeze')) {
      d *= 1 + CONTROL.quiebreCongelacion; quiebre = true; hielo.capas--;
      if (hielo.mega && ctx.acum) ctx.acum.rompioMega = true;
    }
    let ignora = mov.ignoraArmadura || 0;
    if (mov.ignoraArmaduraSi && get(t, mov.ignoraArmaduraSi.efecto)) ignora += mov.ignoraArmaduraSi.puntos;   // solo si el objetivo tiene X
    d *= 1 - Math.min(Math.max(0, st.armor - ignora), TOPES.armor);   // ignorar Armadura: resta puntos
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    if (get(t, 'expuesto')) d *= 1 + DEBUFFS.expuesto;
    d *= 1 - reduccion(t, 'golpe');
    // pasiva "protector": un aliado de t recibe en su lugar un % del golpe (con su propia Armadura y reducciones)
    const prot = t.lado !== a.lado && aliadosDe(t).find(x => x !== t && x.pasiva?.protector && !conControl(x));
    if (prot && d > 0) {
      const pr = prot.pasiva.protector, parte = d * pr.pct;
      d -= parte;
      let d2 = parte * (1 - Math.min(stats(prot).armor, TOPES.armor)) * (1 - reduccion(prot, 'golpe'));
      const r2 = repartir(prot, d2, sa.pen);
      emitir('danoEfecto', { de: a.uid, a: prot.uid, dano: r2.aHp, escudo: r2.aEsc, color: 0xfacc15 }, prot);
      recibioDano(prot, r2.aHp + r2.aEsc, a);
      if (r2.aEsc > 0) perdioEscudo(prot);
      if (pr.cargas && !prot.muerto) ganarCargas(prot, 1, pr.cargas.max, pr.cargas.efecto);
      if (prot.hp <= 0) morir(prot, a);
    }
    const hpAntesGolpe = t.hp;
    const { aHp, aEsc } = repartir(t, d, sa.pen);
    if (aHp > 0) t.perdidoGolpesRonda = (t.perdidoGolpesRonda || 0) + aHp;   // reliquia "recuperaGolpes"
    if (ctx.acum) ctx.acum.dano += aHp + aEsc;
    const des = get(t, 'wear');                // Desgaste: cada golpe recibido (no bloqueado) quita 5 puntos más de Armadura
    if (des && des.valor < DEBUFFS.desgasteMax) des.valor = Math.min(DEBUFFS.desgasteMax, des.valor + DEBUFFS.desgaste);
    const robo = a.pasiva?.roboVida;          // robo de vida: % del daño causado (incluye lo absorbido por escudos)
    if (robo && !a.muerto && (get(a, 'solarBurn') || (a.hp < maxHp(a) && puedeCurarse(a)))) curar(a, a, (aHp + aEsc) * robo);
    emitir('golpe', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, critico, quiebre, color: mov.color, fuente: ctx.fuente, multi: (mov.golpes || 1) > 1 }, t);
    recibioDano(t, aHp + aEsc, a);
    for (const e of a.estados) if (e.alGolpear && t.lado !== a.lado && !t.muerto && !a.muerto) ejecutarAccion(a, e.alGolpear, { objetivo: t });   // marca con "alGolpear"
    const ce = a.pasiva?.cargaEnemigo;        // pasiva "cargaEnemigo": cada golpe deja 1 carga de su marca en el enemigo; al máximo, alMax y se reinicia
    if (ce && t.lado !== a.lado && !t.muerto && !a.muerto && !mov.bonoPorMarca?.consume) {
      let k = t.estados.find(e => e.id === ce.marca && e.fuente === a.uid);
      if (!k) { k = { id: ce.marca, valor: 0, fuente: a.uid }; t.estados.push(k); }
      k.valor++;
      if (k.valor >= ce.max) {
        quitar(t, k);
        emitir('bonoVisible', { a: t.uid, texto: ce.texto || '¡Sobrecarga!' }, t);
        for (const acc of [].concat(ce.alMax)) ejecutarAccion(a, acc, { objetivo: t, ejecutor: a });   // alMax: una acción o una lista (cada una con su destino)
      } else emitir('actualizar', {}, t);
    }
    const cm = a.pasiva?.consumeMarca;          // pasiva "consumeMarca": golpear a quien tiene SU marca (puesta en otro movimiento) la consume
    const mk = cm && t.lado !== a.lado && t.estados.find(e => e.id === cm.marca && e.fuente === a.uid && e.movId !== movId);
    if (mk && !a.muerto) {
      quitar(t, mk);
      emitir('bonoVisible', { a: t.uid, texto: `${EFECTOS[cm.marca].icono} ¡${cm.texto || 'Marca consumida'}!` }, t);
      if (cm.alConsumir) ejecutarAccion(a, cm.alConsumir, { objetivo: a });
      if (a.turnoMarcaRonda !== S.ronda) { a.turnoMarcaRonda = S.ronda; a.turnosMarca = 0; }
      if (cm.turnoExtra && a.turnosMarca < (cm.maxPorRonda ?? 1)) { a.turnosMarca++; ejecutarAccion(a, { tipo: 'turnoExtra', a: 'propio' }, {}); }   // maxPorRonda: turnos extra por ronda
    }
    if (critico && t.lado !== a.lado && t.hp > 0 && t.sellado && t.pasiva.sello.romper.recibeCritico) romperSello(t);
    if (critico && t.lado !== a.lado && t.hp > 0) for (const l of lideresDe(t)) if (l.lider?.alRecibirCritico) ejecutarAccion(l, l.lider.alRecibirCritico, { objetivo: t });   // líder: p. ej. Conocer el Dolor
    // pasiva "cargasAlRecibirGolpe": cada golpe de un enemigo le da cargas (el doble si su Provocación lo indica); con Control no
    const cg = t.pasiva?.cargasAlRecibirGolpe;
    if (cg && !t.muerto && t.lado !== a.lado && !conControl(t)) ganarCargas(t, get(t, 'taunt')?.cargasX || 1, cg.max);
    pasivas(a, 'alGolpear', { objetivo: t });          // gatillo "cada vez que golpea" (filtro opcional: el objetivo tiene X)
    // líder "cooldownAlGolpear": cuando un aliado golpea con un movimiento de un objetivo o de golpes al azar (no de área ni invocaciones),
    // prob de +cantidad turnos de cooldown a uno de esos movimientos del golpeado (una tirada por movimiento y objetivo)
    if (t.lado !== a.lado && !t.muerto && mov.objetivo !== 'todosEnemigos' && CATEGORIAS.includes(mov.categoria)) for (const l of lideresDe(a)) {
      const cl = l.lider?.cooldownAlGolpear, k = `${movId}:${l.uid}`;
      if (!cl || t.cdLiderMov === k) continue;
      t.cdLiderMov = k;
      if (rng() < cl.prob) ejecutarAccion(l, { tipo: 'sumarCooldown', cantidad: cl.cantidad || 1, categorias: cl.categorias, a: 'objetivo' }, { objetivo: t });
    }
    if (t.lado !== a.lado && aHp + aEsc > 0) pasivas(t, 'alRecibirGolpe', { atacante: a, recibido: aHp + aEsc });   // p. ej. Doom
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) {
      morir(t, a);
      // "sobrante": el daño que excedió al matar pasa a otro enemigo al azar (ya mitigado; sin crítico; una sola vez)
      const exceso = aHp - hpAntesGolpe, otros = mov.sobrante && t.muerto && t.lado !== a.lado ? enemigosDe(a) : [];
      if (exceso > 0 && otros.length && !a.muerto) {
        const d2 = rng.elegir(otros);
        emitir('golpeExtra', { id: a.uid, a: d2.uid });
        danoEfecto(a, d2, exceso, mov.color, { sinArmadura: true });
      }
    }
    if (get(t, 'mirror') && t.lado !== a.lado && !a.muerto && aHp + aEsc > 0)   // Espejismo: devuelve parte del golpe (daño por efecto, no es golpe; ignora Armadura)
      danoEfecto(t, a, (aHp + aEsc) * BUFFS.espejismo, 0x67e8f9, { sinArmadura: true });
    const aura = get(t, 'fireAura');
    if (aura && !t.muerto && !a.muerto && t.lado !== a.lado) {
      emitir('auraFuego', { a: t.uid, de: a.uid });
      intentarEfecto(t, a, { id: 'burn', valor: .05, dur: 1, prob: PUNTERIA.auraFuego });
    }
    if (get(t, 'infect') && !t.muerto && !a.muerto && t.lado !== a.lado) {   // Infectar: quien lo golpea recibe Veneno sin tirada
      emitir('bonoVisible', { a: a.uid, texto: '🦠 ¡Infectado!' }, a);
      intentarEfecto(t, a, { id: 'poison', irresistible: true });
    }
    if (get(t, 'frostAura') && !t.muerto && !a.muerto && t.lado !== a.lado) {
      emitir('auraGelida', { a: t.uid, de: a.uid });
      intentarEfecto(t, a, { id: 'freeze', prob: PUNTERIA.auraGelida });
    }
    if (critico) {
      const c = { objetivo: t, dano: aHp + aEsc };
      for (const ef of mov.efectos || []) if (ef.cuando === 'critico') ejecutarAccion(a, ef.accion, c);
      pasivas(a, 'alAcertarCritico', c);
    }
    if (!t.muerto) {
      const bl = get(t, 'bleed');
      if (bl) danoDoT(t, bl.valor, 'bleed', fuentesDe([bl]));
      const hm = get(t, 'hemo');
      if (hm && !t.muerto) { danoDoT(t, hm.valor, 'hemo', fuentesDe([hm])); hm.valor += DOT.hemorragiaCrece; emitir('actualizar', {}, t); }
    }
    // gatillo "al romperse una capa de hielo" de un ENEMIGO del dueño de la pasiva (solo por golpes)
    if (quiebre) for (const p of P) if (!p.muerto && p.lado !== t.lado && p.pasiva?.gatillo === 'alRomperCapa')
      reacciones.push(() => pasivas(p, 'alRomperCapa', { objetivo: t, rompio: a }));
    return critico;
  }

  // Daño por EFECTO: aplica Armadura y Escudo; no se bloquea, no es crítico y NO cuenta como golpe.
  function danoEfecto(a, t, cantidad, color, { sinArmadura = false } = {}) {
    if (t.muerto || cantidad <= 0) return;
    let d = cantidad;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    if (!sinArmadura) d *= 1 - Math.min(stats(t).armor, TOPES.armor);
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    if (get(t, 'expuesto')) d *= 1 + DEBUFFS.expuesto;
    d *= 1 - reduccion(t, 'efecto');
    const { aHp, aEsc } = repartir(t, d, stats(a).pen);
    emitir('danoEfecto', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, color }, t);
    recibioDano(t, aHp + aEsc, a);
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) morir(t, a);
  }

  // Gatillo "cuando un aliado (o uno mismo) pierde Escudo"
  function perdioEscudo(t) {
    for (const p of aliadosDe(t)) pasivas(p, 'alPerderEscudo', { objetivo: t });
  }

  // Daño DoT: % del HP máx.; ignora Armadura, Escudo y Bloqueo.
  function danoDoT(t, valor, tipo, fuente = null) {
    if (t.muerto) return;
    const ag = (tipo === 'poison' || tipo === 'bleed' || tipo === 'hemo') && get(t, 'aguja');   // Agujas Escarlata: +3% por aguja
    const db = t.pasiva?.debilidadA;                        // pasiva "debilidadA": recibe +pct de daño de esos DoT (p. ej. Venom: fuego)
    const debil = db && [].concat(db.efecto).includes(tipo) ? 1 + db.pct : 1;
    const aura = P.reduce((m, x) => m * (x.lado !== t.lado && !x.muerto && x.pasiva?.auraDoT ? 1 + x.pasiva.auraDoT : 1), 1);   // pasiva "auraDoT": los DoT de su equipo hacen +X% (p. ej. Trunks)
    if (intocable(t)) return;
    const d = valor * maxHp(t) * (1 - reduccion(t, 'dot')) * (ag ? 1 + ag.valor * DEBUFFS.aguja : 1) * debil * aura;
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo, dano: d }, t);
    recibioDano(t, d, fuente);
    if (t.hp <= 0) morir(t);
    for (const p of P) pasivas(p, 'alDanoDoT', { objetivo: t, tipo, dano: d });
    // líder "acumulaPorDoT": cada daño de ese DoT a un enemigo suma al bono del equipo (sin tope; se pierde si el líder muere)
    for (const l of P) { const ac = l.lider?.acumulaPorDoT;
      if (ac && l.esLider && !l.muerto && t.lado !== l.lado && ac.tipo === tipo) l.acumLider = (l.acumLider || 0) + ac.valor; }
  }

  // Robar HP: ignora Armadura y Escudo, no le afectan reducciones; cura al ladrón (lo que exceda su HP máx. se pierde).
  function robarHP(a, t, pct) {
    if (t.muerto || a.muerto || intocable(t)) return;
    const d = pct * maxHp(t);
    t.hp -= d;
    emitir('robo', { de: a.uid, a: t.uid, cantidad: d }, t);
    recibioDano(t, d, a);
    if (t.hp <= 0) morir(t, a);
    curar(a, a, d, true);
  }

  const puedeCurarse = t => !get(t, 'plague') && !get(t, 'blackPlague') && !get(t, 'solarBurn');
  let repartiendoCuracion = false;
  function curar(a, t, cantidad, silencioso = false) {
    if (t.muerto) return;
    if (get(t, 'solarBurn')) { curacionEnemiga(t); danoSolar(t, cantidad); return; }      // Quemadura Solar: la curación hace daño (gana a la Peste)
    if (!puedeCurarse(t)) { emitir('sinEfecto', { a: t.uid, texto: '🦠 No puede curarse' }); return; }
    if (get(t, 'auraLuz')) cantidad *= BUFFS.auraLuz;               // después de la Quemadura Solar: el Aura no duplica ese daño
    const real = Math.max(0, Math.min(cantidad, maxHp(t) - t.hp));
    if (real > 0) curacionEnemiga(t);
    t.hp += real;
    a.est.curacion += real;                                         // solo lo que realmente sanó
    emitir('curacion', { de: a.uid, a: t.uid, cantidad: real, robo: silencioso }, t);
    if (real > 0) for (const p of aliadosDe(t)) if (p !== t) pasivas(p, 'alCurarAliado', { objetivo: t, curacion: real });
    const dc = a.pasiva?.danoPorCuracion;                           // pasiva "danoPorCuracion": lo que sanó de verdad hiere a los enemigos (p. ej. Nezuko)
    if (dc && real > 0 && !a.muerto) {
      const previo = repartiendoCuracion; repartiendoCuracion = true;
      repartirDano(a, real * dc.pct, 10, 0xf472b6);
      repartiendoCuracion = previo;
    }
  }
  // un total de daño por efecto, en N paquetes que caen al azar sobre enemigos (reparto desigual)
  function repartirDano(a, total, n, color) {
    const porEnemigo = new Map();
    for (let i = 0; i < n; i++) { const e = rng.elegir(enemigosDe(a)); if (e) porEnemigo.set(e, (porEnemigo.get(e) || 0) + total / n); }
    for (const [e, d] of porEnemigo) danoEfecto(a, e, d, color);
  }

  // pasiva "bonoPorCuracionEnemiga": cada curación que recibe un enemigo (también la que la Quemadura Solar vuelve daño)
  // le da un bono permanente, con tope (p. ej. Dragón de la Ira de Meliodas: +1% de Daño, hasta +50%)
  function curacionEnemiga(t) {
    for (const p of enemigosDe(t)) {
      const bc = p.pasiva?.bonoPorCuracionEnemiga;
      if (!bc) continue;
      const actual = p.permanente[bc.stat] || 0;
      if (actual < bc.tope - 1e-9) p.permanente[bc.stat] = Math.min(bc.tope, actual + bc.pct);
    }
  }

  // Quemadura Solar: el monto COMPLETO de la curación se vuelve daño. Ignora Armadura y Escudo, no se bloquea ni es crítico,
  // le afectan las reducciones de DoT y nadie recibe crédito si mata.
  function danoSolar(t, cantidad) {
    const d = cantidad * (1 - reduccion(t, 'dot'));
    if (d <= 0 || intocable(t)) return;
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo: 'solarBurn', dano: d }, t);
    recibioDano(t, d, fuentesDe([get(t, 'solarBurn')].filter(Boolean)));
    if (t.hp <= 0) morir(t);
    // líder "curaPorQuemaduraSolar": ese daño cura a su equipo, repartido entre los vivos (sin cadenas de Quemadura Solar)
    if (!S.curaSolar) for (const l of P) if (l.lider?.curaPorQuemaduraSolar && l.esLider && !l.muerto && l.lado !== t.lado) {
      const al = aliadosDe(l); if (!al.length) continue;
      S.curaSolar = true;
      for (const x of al) curar(l, x, d / al.length);
      S.curaSolar = false;
    }
  }

  function morir(t, asesino = null) {
    if (t.muerto) return;
    const re = t.estados.find(e => e.inmortalMientras && !porUid(e.inmortalMientras)?.muerto);   // marca "inmortal mientras X viva" (p. ej. Edo Tensei)
    if (re) {
      t.hp = 1;
      emitir('bonoVisible', { a: t.uid, texto: re.textoInmortal || '¡No puede morir!' }, t);
      emitir('actualizar', {}, t);
      return;
    }
    if (get(t, 'zona')?.zona?.inmortal) {             // zona "inmortal": mientras dure, su portador no baja de 1 HP
      t.hp = 1;
      emitir('bonoVisible', { a: t.uid, texto: get(t, 'zona').zona.textoInmortal || '¡No puede caer!' }, t);
      emitir('actualizar', {}, t);
      return;
    }
    const ua = t.pasiva?.ultimoAliento;               // la primera vez que muere: queda con 1 HP (y puede transformarse)
    if (ua && !t.usoUltimoAliento) {
      t.usoUltimoAliento = true; t.hp = Math.max(1, (ua.hp || 0) * maxHp(t));   // hp: % de su HP máx. con el que queda (1 HP si no se indica)
      emitir('pasiva', { id: t.uid, nombre: t.pasiva.nombre });
      emitir('actualizar', {}, t);
      if (ua.transformar && t.transformacion && !t.forma) reacciones.push(() => { if (!t.muerto && !t.forma) transformar(t); });
      return;
    }
    const bombas = todos(t, 'bomb');
    const invocaciones = todos(t, 'summon').length;
    if (t.ultimoDanoDe && t.ultimoDanoDe.lado !== t.lado) t.ultimoDanoDe.est.elim++;   // la eliminación es de quien hizo el último daño
    const teniaAlMorir = new Set(t.estados.map(e => e.id));
    const rivalDe = P.filter(v => v.lado !== t.lado && !v.muerto && v.pasiva?.rival && esRival(v, t));
    if (t.convertido) t.noRevivir = true;            // esclavo de Frostmourne: si cae, queda muerto para siempre
    t.muerto = true; t.hp = 0; t.escudo = 0; t.estados = [];
    emitir('muerte', { a: t.uid, invocaciones, lider: t.esLider && !!t.lider }, t);
    // pasiva "sucesorDe": si cae el líder indicado de su equipo, ese aliado surge como nuevo líder (p. ej. Obito tras Pain)
    if (t.esLider && t.lider) {
      const s = aliadosDe(t).find(x => x !== t && !x.muerto && x.lider && x.pasiva?.sucesorDe?.id === t.id);
      if (s) { t.esLider = false; reacciones.push(() => surgirLider(s, t)); }
    }
    if ((t.esLider && t.lider) || t.pasiva?.bonoPorAliadosQueAplican) for (const x of aliadosDe(t)) if (!x.barra && x.hp > maxHp(x)) { x.hp = maxHp(x); emitir('actualizar', {}, x); }
    const rv = t.pasiva?.revivir;                      // pasiva "revivir": vuelve tras N turnos (de cualquiera), una vez por partida
    const rr = !t.revivioReliquia && pasivasDeReliquia(t).find(m => m.revivir);   // reliquia "revivir" (p. ej. Anillo del Tiempo)
    if (rr) { t.reviveRonda = S.ronda + 1; t.reviveRelHp = rr.revivir.hp ?? 1; emitir('extension', { a: t.uid, texto: '⏳ Revivirá al final de la próxima ronda' }, t); }
    if (rv && !t.revivio) { t.revivio = true; t.reviveEn = rv.turnos + (S.actual ? 1 : 0); emitir('extension', { a: t.uid, texto: `🐒 Revivirá en ${rv.turnos} turnos` }, t); }
    for (const b of bombas) explotarBomba(t, b, true);
    if (asesino && asesino.lado !== t.lado) pasivas(asesino, 'alEliminar', { objetivo: t });
    for (const v of rivalDe) {
      const b = v.pasiva.rival.alMorirRival || 0;
      if (b) { v.permanente.dmgPct = (v.permanente.dmgPct || 0) + b; emitir('bonoVisible', { a: v.uid, texto: `+${Math.round(b * 100)}% Daño permanente` }, v); }
      elegirRival(v);
    }
    for (const p of P.filter(x => x.lado !== t.lado && !x.muerto)) pasivas(p, 'alMorirEnemigo', { objetivo: t, teniaAlMorir });
    for (const p of aliadosDe(t)) pasivas(p, 'alMorirAliado', { objetivo: t });   // p. ej. Almas Atadas de Gul'dan
    for (const p of aliadosDe(t)) if (p.sellado && p.pasiva.sello.romper.muereAliado) romperSello(p);
    const solo = aliadosDe(t);                        // pasiva "intocable": si cae el último de sus aliados, muere al instante
    if (solo.length === 1 && solo[0].pasiva?.intocable) morir(solo[0]);
    for (const l of P.filter(x => x.lado !== t.lado && x.esLider && !x.muerto && x.lider?.alMorirEnemigo)) ejecutarAccion(l, l.lider.alMorirEnemigo, { objetivo: t });   // líder: p. ej. Tesoro del Rey
  }

  // Sucesión de liderazgo: el sucesor pasa a ser el líder (su habilidad de líder se activa) y ejecuta sus acciones "alSurgir"
  function surgirLider(s, viejo) {
    if (s.muerto || P.some(x => x.lado === s.lado && x.esLider && !x.muerto)) return;
    const su = s.pasiva.sucesorDe;
    s.esLider = true;
    emitir('nuevoLider', { id: s.uid, de: viejo.uid, nombre: s.lider.nombre, texto: su.texto || `👑 ${s.nombre} toma el mando` }, s);
    for (const acc of su.alSurgir || []) ejecutarAccion(s, acc, {});
    emitir('actualizar', {}, ...aliadosDe(s));
  }

  function explotarBomba(t, b, soloSalpicadura) {
    const d = b.valor * maxHp(t) * (S.factorBombas || 1);     // movimiento "potenciaBombas": las que estallan durante él hacen ×factor
    let total = 0;
    emitir('explosion', { a: t.uid, soloSalpicadura });
    if (!soloSalpicadura && !t.muerto && !intocable(t)) {
      const real = d * (1 - reduccion(t, 'dot'));
      total += real;
      t.hp -= real;
      emitir('dot', { a: t.uid, tipo: 'bomb', dano: real }, t);
      recibioDano(t, real, porUid(b.fuente));
      if (t.hp <= 0) morir(t);
    }
    for (const x of aliadosDe(t)) {
      if (x === t || intocable(x)) continue;
      const s = d * DOT.salpicaduraBomba * (1 - reduccion(x, 'dot'));
      total += s;
      x.hp -= s;
      emitir('salpicadura', { a: x.uid, dano: s }, x);
      recibioDano(x, s, porUid(b.fuente));
      if (x.hp <= 0) morir(x);
    }
    // líder "escudoPorBomba { pct, dur }": cada Bomba que estalla en un enemigo da a todos los aliados vivos un Escudo de pct × HP máx. del líder
    for (const l of P) if (l.lider?.escudoPorBomba && l.esLider && !l.muerto && l.lado !== t.lado)
      for (const x of aliadosDe(l)) darEscudo(l, x, maxHp(l) * l.lider.escudoPorBomba.pct, l.lider.escudoPorBomba.dur ?? 1);
  }

  // ================================================================ efectos (buffs / debuffs)
  function intentarEfecto(a, t, acc) {
    const def = EFECTOS[acc.id];
    if (t.muerto) return;
    if (def.tipo === 'buff') {                                           // los buffs a aliados no tiran Puntería; solo su probabilidad, si la ficha la indica
      if (acc.prob == null || rng() < acc.prob) aplicarEfecto(a, t, acc);
      return;
    }
    let prob = acc.prob;
    if (acc.probSiMasRapido != null && stats(t).spd > stats(a).spd) prob = acc.probSiMasRapido;
    if (acc.probSiConBuff != null && tieneBuff(t)) prob = acc.probSiConBuff;            // p. ej. ¡Te tengo!: 50% si tiene algún buff   // p. ej. Deep Freeze: 100% contra los más rápidos
    const psp = acc.probSiPropioTiene;                                   // otra probabilidad si quien lo aplica tiene ese efecto (p. ej. Loki con Desgaste: la mitad)
    if (psp && get(a, psp.efecto)) prob = (prob ?? 1) * psp.factor;
    if (prob != null && rng() >= prob) return;                          // 1) probabilidad del movimiento (por defecto 100%): si falla, ni lo intenta
    const sa = stats(a), st = stats(t);                                  // 2) Puntería vs Resistencia
    const irresistible = acc.irresistible || (acc.irresistibleSi && get(t, acc.irresistibleSi))   // irresistible: siempre entra
      || (a.pasiva?.seguroVsLentos && stats(t).spd < stats(a).spd);                            // pasiva: siempre entra contra los más lentos   // p. ej. Miedo de Loki contra envenenados
    if (!irresistible && rng() >= probAplicar(sa.acc, st.res)) { emitir('resistido', { a: t.uid, id: acc.id }); return; }
    aplicarEfecto(a, t, acc);
  }

  // Escudo (buff 'shield'): si ya tiene uno, la cantidad se SUMA y conserva la duración que le quedaba (no se renueva);
  // si no, entra con la duración `dur`. Bloquear Buffs lo impide. La cantidad nunca depende del daño hecho o recibido.
  function darEscudo(a, t, c, dur = 1) {
    if (c <= 0 || t.muerto) return;
    if (get(t, 'blockBuffs')) { emitir('sinEfecto', { a: t.uid, texto: '🚫 Buffs bloqueados' }); return; }
    const e = get(t, 'shield');
    if (e) e.valor += c;
    else {
      t.estados.push({ id: 'shield', valor: c, dur, fuente: a.uid });
      if (S.actuaron.has(t) || S.actual === t) get(t, 'shield').nuevo = true;   // ya actuó: su duración empieza a contar desde la siguiente ronda
      for (const p of enemigosDe(t)) { const cb = p.pasiva?.cargasPorBuffEnemigo; if (cb) ganarCargas(p, 1, cb.max, cb.efecto); }
    }
    a.est.escudo += c;
    emitir('escudo', { de: a.uid, a: t.uid, cantidad: c }, t);
  }

  function aplicarEfecto(a, t, acc) {
    // Protección contra el bloqueo infinito: aplica a CUALQUIER vía (movimientos, pasivas, efectos garantizados)
    if (t.inmune && (CONTROL.pierdeTurno.includes(acc.id) || acc.id === 'silence')) { emitir('inmune', { a: t.uid }); return; }
    for (const m of pasivasDeReliquia(t)) if (m.inmuneA?.includes(acc.id)) { emitir('inmune', { a: t.uid, texto: `Inmune a ${EFECTOS[acc.id].nombre}` }); return; }   // reliquia (p. ej. Escudo Hyliano)
    const inm = t.pasiva?.inmuneA;
    if (inm && (inm.includes(acc.id) || EFECTOS[acc.id].tags.some(tag => inm.includes(tag)) || (inm.includes('debuff') && EFECTOS[acc.id].tipo === 'debuff'))) { emitir('inmune', { a: t.uid, texto: `Inmune a ${EFECTOS[acc.id].nombre}` }); return; }
    const sa = stats(a);
    const def = EFECTOS[acc.id];
    if (def.tipo === 'buff' && get(t, 'blockBuffs')) { emitir('sinEfecto', { a: t.uid, texto: '🚫 Buffs bloqueados' }); return; }
    let texto = def.nombre, id = acc.id;
    const antes = new Set(t.estados);
    switch (acc.id) {
      case 'burn': {
        const v = acc.valorFinal ?? DOT.quemadura(acc.valor ?? .10, sa.dot);   // valorFinal: copia exacta (Propagar)
        const e = get(t, 'burn');
        if (e) {
          const debil = v < e.valor;              // "débil" = menor % final que la Quemadura activa
          if (!debil) e.fuente = a.uid;           // la Quemadura es de quien aplicó la más fuerte
          const f = Math.max(e.valor, v), d = Math.min(e.valor, v); e.valor = f + d * DOT.quemaduraSuma;
          if (!(debil && acc.noRenueva)) e.dur = Math.max(e.dur, acc.dur ?? 2);   // noRenueva: la débil no alarga la duración
          if (acc.inextinguible) e.inextinguible = true;
        }
        else t.estados.push({ id: 'burn', valor: v, dur: acc.dur ?? 2, fuente: a.uid, ...(acc.inextinguible ? { inextinguible: true } : {}) });
        texto = `${get(t, 'burn').inextinguible ? '⚫🔥 Amaterasu' : '🔥 Quemadura'} ${Math.round(get(t, 'burn').valor * 1000) / 10}%`;
        break;
      }
      case 'poison': {
        const v = acc.valorFinal ?? DOT.veneno(sa.dot), pila = todos(t, 'poison');
        const maxV = Math.max(DOT.maxVeneno, ...aliadosDe(a).map(x => x.pasiva?.venenoMax || 0));   // pasiva "venenoMax": los Venenos de su equipo se acumulan hasta N
        if (pila.length < maxV) t.estados.push({ id: 'poison', valor: v, dur: acc.dur ?? DOT.durVeneno, fuente: a.uid });
        else {
          const debil = pila.reduce((x, y) => (x.valor < y.valor || (x.valor === y.valor && x.dur < y.dur)) ? x : y);
          debil.valor = Math.max(debil.valor, v); debil.dur = acc.dur ?? DOT.durVeneno; debil.tocado = true; debil.fuente = a.uid;
        }
        texto = `🧪 Veneno ×${todos(t, 'poison').length}`;
        break;
      }
      case 'bleed': {
        if (get(t, 'hemo')) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Hemorragia' }); return; }
        const v = acc.valorFinal ?? DOT.sangrado(sa.dot), e = get(t, 'bleed');
        if (e) {
          e.valor = Math.max(e.valor, v);
          if (rng() < DOT.hemorragiaProb) {
            quitar(t, e); t.estados.push({ id: 'hemo', valor: e.valor, fuente: a.uid });
            id = 'hemo'; texto = '¡HEMORRAGIA!';
            break;
          }
        } else t.estados.push({ id: 'bleed', valor: v, fuente: a.uid });
        texto = `🩸 Sangrado ${Math.round(get(t, 'bleed').valor * 1000) / 10}%`;
        break;
      }
      case 'bomb': {
        if (todos(t, 'bomb').length >= DOT.maxBombas) { emitir('sinEfecto', { a: t.uid, texto: 'Máximo de bombas' }); return; }
        t.estados.push({ id: 'bomb', valor: acc.valorFinal ?? DOT.bomba(sa.dot), contador: acc.dur ?? DOT.contadorBomba, fuente: a.uid });
        texto = `💣 Bomba (${acc.dur ?? DOT.contadorBomba})`;
        break;
      }
      case 'hemo': {            // solo llega como copia (Propagar): reemplaza un Sangrado o mejora una Hemorragia
        const e = get(t, 'hemo');
        if (e) e.valor = Math.max(e.valor, acc.valorFinal ?? 0);
        else { const b = get(t, 'bleed'); if (b) quitar(t, b); t.estados.push({ id: 'hemo', valor: acc.valorFinal ?? DOT.sangrado(sa.dot), fuente: a.uid }); }
        texto = '¡HEMORRAGIA!';
        break;
      }
      case 'freeze': {          // 1 capa (−25% Vel). Congelar a quien ya está congelado = Mega (2 capas, −50%). A una Mega no le hace nada
        const e = get(t, 'freeze'), dur = acc.dur ?? CONTROL.durCongelacion;
        if (e?.mega) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Mega Congelación' }); return; }
        if (e) Object.assign(e, { mega: true, capas: 2, dur });
        else t.estados.push({ id: 'freeze', mega: !!acc.mega, capas: acc.capas ?? (acc.mega ? 2 : 1), dur });
        texto = get(t, 'freeze').mega ? def.mega : def.nombre;
        break;
      }
      case 'silence': {        // bloquea al azar uno de sus movimientos que NO esté en cooldown
        const e = get(t, 'silence');
        if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); texto = `🔇 ${NOMBRE_CAT[e.categoria]} silenciado`; break; }
        const listos = t.movimientos.filter(m => (t.cds[m.categoria] || 0) === 0);
        if (!listos.length) { emitir('sinEfecto', { a: t.uid, texto: 'Nada que silenciar' }); return; }
        const cat = rng.elegir(listos).categoria;
        t.estados.push({ id: 'silence', categoria: cat, dur: acc.dur ?? 2 });
        texto = `🔇 ${NOMBRE_CAT[cat]} silenciado`;
        break;
      }
      case 'wear': {           // sin duración: dura hasta que lo limpien
        if (get(t, 'wear')) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Desgaste' }); return; }
        t.estados.push({ id: 'wear', valor: acc.valorFinal ?? DEBUFFS.desgaste });
        break;
      }
      case 'plague': {         // Peste sobre Peste = Peste Negra
        const p1 = get(t, 'plague'), p2 = get(t, 'blackPlague'), dur = acc.dur ?? 2;
        if (p2) { p2.dur = Math.max(p2.dur, dur); id = 'blackPlague'; texto = EFECTOS.blackPlague.nombre; break; }
        if (p1) { quitar(t, p1); t.estados.push({ id: 'blackPlague', dur: Math.max(p1.dur, dur) }); id = 'blackPlague'; texto = '☠️ ¡PESTE NEGRA!'; break; }
        t.estados.push({ id: 'plague', dur });
        break;
      }
      case 'blackPlague': {    // solo llega como copia (Propagar)
        const p1 = get(t, 'plague'), p2 = get(t, 'blackPlague'), dur = acc.dur ?? 2;
        if (p2) { p2.dur = Math.max(p2.dur, dur); break; }
        if (p1) quitar(t, p1);
        t.estados.push({ id: 'blackPlague', dur });
        break;
      }
      case 'stun': case 'possess': {
        const turnos = acc.turnos ?? (acc.mega ? 2 : 1), e = get(t, acc.id);
        if (e) { e.turnos = Math.max(e.turnos, turnos); e.mega = e.mega || !!acc.mega; }
        else t.estados.push({ id: acc.id, turnos, mega: !!acc.mega });
        texto = acc.mega ? def.mega : def.nombre;
        break;
      }
      case 'confuse': case 'fear': case 'dmgUp': case 'taunt': case 'fireAura': case 'frostAura': case 'infect': case 'blockBuffs': case 'protect': case 'regen':
      case 'frenzy': case 'haste': case 'bloodlust': case 'keen': case 'weaken': case 'agotar': case 'expuesto': case 'blind': case 'stealth': case 'pierce': case 'solarBurn': case 'aoeDodge': case 'incite': case 'mirror': case 'anticipar': case 'auraLuz': {
        if (acc.id === 'stealth' && get(t, 'taunt')) { emitir('sinEfecto', { a: t.uid, texto: 'Con Provocación no puede tener Sigilo' }); return; }
        if (acc.id === 'taunt' && get(t, 'stealth')) { quitar(t, get(t, 'stealth')); emitir('sigiloRoto', { a: t.uid }, t); }
        if (acc.id === 'dmgUp') acc = { ...acc, valor: BUFFS.furia };      // Furia siempre +50%
        const e = get(t, acc.id);
        if (e?.permanente) { emitir('sinEfecto', { a: t.uid, texto: `Ya tiene ${def.nombre} permanente` }); return; }
        const extra = {};                     // alTerminar: acción al terminar el efecto por duración · cargasX: multiplica cargas ganadas
        if (acc.alTerminar) { extra.alTerminar = acc.alTerminar; extra.duenoTerminar = a.uid; }
        if (acc.cargasX) extra.cargasX = acc.cargasX;
        if (e && acc.permanente) { e.permanente = true; delete e.dur; }
        else if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); if (acc.valor) e.valor = Math.max(e.valor || 0, acc.valor); if (acc.id === 'incite') e.fuente = a.uid; Object.assign(e, extra); }
        else if (acc.permanente) t.estados.push({ id: acc.id, permanente: true, valor: acc.valor, fuente: a.uid });   // permanente: sin duración, no se disipa
        else t.estados.push({ id: acc.id, dur: acc.dur ?? 2, valor: acc.valor, fuente: a.uid, ...extra });
        if (acc.id === 'dmgUp') texto = `+${Math.round((acc.valor || 0) * 100)}% Daño`;
        break;
      }
    }
    // finDeRonda: el efecto expira al final de ESTA ronda aunque el objetivo ya haya actuado (p. ej. el Sigilo del Kamui de Obito)
    if (!acc.finDeRonda && (S.actuaron.has(t) || S.actual === t)) {       // ya actuó en esta ronda: la duración empieza a contar desde la siguiente
      const tocado = acc.id === 'poison' || acc.id === 'bomb' ? t.estados.filter(e => e.id === acc.id && (!antes.has(e) || e.tocado)) : [get(t, id)];
      for (const e of tocado) if (e) e.nuevo = true;
    }
    for (const e of t.estados) delete e.tocado;
    emitir('efecto', { a: t.uid, id, texto }, t);
    if (t.lado !== a.lado) liderAlAplicar(a, t, id);
    if (def.tipo === 'debuff' && a !== t) reacciones.push(() => pasivas(t, 'alRecibirDebuff', { atacante: a, efecto: id }));
    // líder "copiarDebuffAliado": un debuff que un enemigo le pone a un aliado se copia (misma intensidad y duración) en un enemigo al azar,
    // con Tirada de Puntería del líder. Las copias no se vuelven a copiar (evita cadenas entre dos líderes).
    if (def.tipo === 'debuff' && a.lado !== t.lado && !acc.copiaLider) for (const l of lideresDe(t)) if (l.lider?.copiarDebuffAliado) {
      const e = get(t, id), pr = l.lider.copiarDebuffAliado.prob;    // prob: probabilidad de copiarlo (por defecto siempre)
      if (!e || (pr != null && rng() >= pr)) continue;
      const copia = { ...copiaDe(e), copiaLider: true };
      reacciones.push(() => {
        const d = !l.muerto && rng.elegir(enemigosDe(l));
        if (!d) return;
        emitir('bonoVisible', { a: l.uid, texto: l.lider.texto || '¡Contraataque!' }, l);
        intentarEfecto(l, d, copia);
      });
    }
    const ca = a.pasiva?.cargasAlAplicar;          // pasiva "cargasAlAplicar": gana cargas al aplicar esos debuffs a enemigos (p. ej. Saga)
    if (ca && t.lado !== a.lado && ca.efectos.includes(acc.id)) ganarCargas(a, 1, ca.max, ca.efecto);
    if (def.tipo === 'buff') for (const p of enemigosDe(t)) {      // pasiva "cargasPorBuffEnemigo": cada buff que recibe un enemigo le da 1 carga
      const cb = p.pasiva?.cargasPorBuffEnemigo;
      if (cb) ganarCargas(p, 1, cb.max, cb.efecto);
    }
  }

  // Líder con pieza "alAplicar": cada vez que su equipo acierta ese debuff en un enemigo, un aliado al azar gana un bono permanente
  function liderAlAplicar(a, t, id) {
    for (const l of lideresDe(a)) {
      const reg = l.lider?.alAplicar;
      if (!reg || reg.efecto !== id) continue;
      if (reg.accion) { ejecutarAccion(a, reg.accion, { objetivo: t }); continue; }
      const aliados = aliadosDe(l);
      if (!aliados.length) continue;
      const x = rng.elegir(aliados);
      x.permanente[reg.stat] = (x.permanente[reg.stat] || 0) + reg.valor;
      emitir('bonoOculto', { id: x.uid, texto: `+${Math.round(reg.valor * 100)}% Armadura`, lider: l.uid }, x);
    }
  }

  function limpiar(a, t, acc) {
    let deb = t.estados.filter(e => EFECTOS[e.id].tipo === 'debuff' && !e.inextinguible && (!acc.etiqueta || esDe(e, acc.etiqueta)));   // inextinguible: no se limpia
    if (acc.cantidad && deb.length > acc.cantidad) deb = [...deb].sort(() => rng() - .5).slice(0, acc.cantidad);
    t.estados = t.estados.filter(e => !deb.includes(e));
    emitir('limpieza', { de: a.uid, a: t.uid, n: deb.length }, t);
    return deb.length;
  }
  function disipar(a, t, acc) {
    const sa = stats(a), st = stats(t);
    let buf = t.estados.filter(e => EFECTOS[e.id].tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && (!acc.etiqueta || esDe(e, acc.etiqueta)));
    if (acc.cantidad && buf.length > acc.cantidad) buf = [...buf].sort(() => rng() - .5).slice(0, acc.cantidad);
    let n = 0;
    for (const b of buf) if (acc.sinTirada || rng() < probAplicar(sa.acc, st.res)) { quitar(t, b); n++; }   // sinTirada: quita sin tirar Puntería
    emitir('disipar', { de: a.uid, a: t.uid, n }, t);
  }

  // ================================================================ acciones universales
  function objetivosAccion(a, spec, ctx) {
    if (!spec || spec === 'objetivo') return ctx.objetivo ? [ctx.objetivo] : [];
    if (spec === 'propio') return [a];
    if (spec === 'ultimoAtacante') { const u = a.ultimoDanoDe; if (u && !u.muerto && u.lado !== a.lado) return [u]; const l = enemigosDe(a); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'atacante') return ctx.atacante && !ctx.atacante.muerto ? [ctx.atacante] : [];
    if (spec === 'todosEnemigos') return ctx.esMovimiento ? sinEsquiva(enemigosDe(a)) : enemigosDe(a);
    if (spec === 'otrosAliados') return aliadosDe(a).filter(x => x !== a);
    if (spec.otrosAliadosAzar) return [...aliadosDe(a).filter(x => x !== a)].sort(() => rng() - .5).slice(0, spec.otrosAliadosAzar);
    if (spec.aliadoAzarSin) { const l = aliadosDe(a).filter(x => !get(x, spec.aliadoAzarSin)); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'otrosEnemigos') return enemigosDe(a).filter(x => x !== ctx.objetivo);
    if (spec === 'otroEnemigoAzar') { const l = enemigosDe(a).filter(x => x !== ctx.objetivo); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'todosAliados') return aliadosDe(a);
    if (spec.enemigosCon) return enemigosDe(a).filter(x => x !== ctx.objetivo && [].concat(spec.enemigosCon).some(id => get(x, id)));
    if (spec.aliadosDistintos) return [...aliadosDe(a)].sort(() => rng() - .5).slice(0, spec.aliadosDistintos);
    if (spec === 'sobrevivientes') return (ctx.sobrevivientes || []).filter(x => !x.muerto);
    if (spec.aliadosAzar) return Array.from({ length: spec.aliadosAzar }, () => aliadosDe(a)).filter(l => l.length).map(l => rng.elegir(l));
    if (spec === 'aliadoMasLento') { const l = aliadosDe(a); return l.length ? [l.reduce((x, y) => stats(x).spd <= stats(y).spd ? x : y)] : []; }
    if (spec === 'aliadoMasHerido') { const l = aliadosDe(a); return l.length ? [l.reduce((x, y) => x.hp / maxHp(x) <= y.hp / maxHp(y) ? x : y)] : []; }
    if (spec.azarCon) {
      const { efecto, min = 1 } = spec.azarCon;
      let l = enemigosDe(a).filter(x => todos(x, efecto).length >= min);
      if (ctx.esMovimiento) l = l.filter(x => !get(x, 'aoeDodge'));
      return l.length ? [rng.elegir(l)] : [];
    }
    if (spec.azar) return Array.from({ length: spec.azar }, () => enemigosDe(a)).filter(l => l.length).map(l => rng.elegir(l));
    if (spec.distintos) return [...enemigosDe(a)].sort(() => rng() - .5).slice(0, spec.distintos);
    return [];
  }

  function ejecutarAccion(a, acc, ctx = {}) {
    for (const t of objetivosAccion(a, acc.a, ctx)) {
      if (t.muerto && acc.tipo !== 'curar') continue;
      switch (acc.tipo) {
        case 'efecto':
          for (let i = 0; i < (acc.veces || 1); i++) {
            if (!acc.idAzar) {
              const antes = acc.alAcertar && new Set(t.estados);
              intentarEfecto(a, t, acc);
              // alAcertar: acción por cada efecto que de verdad quedó puesto (p. ej. +5% Armadura por Bomba de Tengen)
              if (antes && t.estados.some(e => e.id === acc.id && !antes.has(e))) ejecutarAccion(a, acc.alAcertar, { ...ctx, objetivo: t });
              continue;
            }
            const ids = acc.sinRepetir ? acc.idAzar.filter(id => !get(t, id)) : acc.idAzar;   // sinRepetir: no elige uno que ya tenga
            if (!ids.length) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene todos' }); continue; }
            intentarEfecto(a, t, { ...acc, id: rng.elegir(ids) });
          }
          break;
        case 'curar': {
          const base = acc.base === 'dano' ? (ctx.dano || 0) : acc.base === 'hpMaxObjetivo' ? maxHp(t) : acc.base === 'hpMaxGolpeado' ? (ctx.objetivo ? maxHp(ctx.objetivo) : 0) : acc.base === 'curacion' ? (ctx.curacion || 0) : baseDe(a, acc.escala);
          const veces = acc.porCada ? (ctx[acc.porCada] || 0)     // porCada: 'eliminados' = una vez por cada enemigo eliminado
            : acc.porEnemigoCon ? enemigosDe(a).filter(x => get(x, acc.porEnemigoCon)).length   // porEnemigoCon: una vez por cada enemigo con ese efecto (p. ej. Muzan)
            : acc.porAliadoCon ? aliadosDe(a).filter(x => get(x, acc.porAliadoCon)).length : 1;   // porAliadoCon: por cada aliado con esa marca (p. ej. Yoda)
          if (veces > 0) curar(a, t, base * acc.pct * veces);
          break;
        }
        case 'bonoPermanente': {       // p. ej. +5% HP máx. por cada Quemadura activa en enemigos (permanente, sube también el HP actual)
          const n = acc.por === 'quemadurasEnemigas' ? enemigosDe(a).filter(x => get(x, 'burn')).length : 1;
          if (!n) { emitir('sinEfecto', { a: t.uid, texto: 'Sin quemaduras enemigas' }); break; }
          const antes = maxHp(t), actual = t.permanente[acc.stat] || 0;
          const suma = acc.tope != null ? Math.min(acc.pct * n, acc.tope - actual) : acc.pct * n;   // tope: máximo acumulado
          if (suma <= 1e-9) { emitir('sinEfecto', { a: t.uid, texto: `Máximo de ${NOMBRE_STAT[acc.stat] || acc.stat} alcanzado` }); break; }
          t.permanente[acc.stat] = actual + suma;
          t.hp += maxHp(t) - antes;
          emitir('bonoVisible', { a: t.uid, texto: `+${Math.round(suma * 100)}% ${NOMBRE_STAT[acc.stat] || acc.stat}` }, t);
          break;
        }
        case 'activarDoT': {           // hace el daño de un DoT al instante sin consumirlo (cuenta como daño DoT)
          const l = todos(t, acc.efecto);           // todas las acumulaciones (p. ej. 5 Venenos)
          if (l.length) danoDoT(t, l.reduce((s, x) => s + x.valor, 0), acc.efecto, a);
          break;
        }
        case 'extenderDuracion': {
          const e = get(t, acc.efecto);
          if (e) { e.dur += acc.rondas || 1; emitir('extension', { a: t.uid, texto: `🔥 +${acc.rondas || 1} ronda` }, t); }
          break;
        }
        case 'transformar': transformar(t, acc.turnos); break;
        case 'extenderInvocaciones': {      // +N turnos a todas sus invocaciones activas
          const l = todos(t, 'summon');
          if (!l.length) break;
          for (const e of l) e.dur += acc.turnos || 1;
          emitir('extension', { a: t.uid, texto: `✦ Invocaciones +${acc.turnos || 1} turno` }, t);
          break;
        }
        case 'reducirCooldown': {           // baja el cooldown de los movimientos indicados de su objetivo
          let n = 0;
          let cats = (acc.categorias || CATEGORIAS).filter(c => t.cds[c] > 0);
          if (acc.azar) { const l = cats.filter(c => t !== a || c !== ctx.categoriaMov); cats = l.length ? [rng.elegir(l)] : []; }   // azar: solo una, sin contar el movimiento que se está usando
          for (const c of cats) { t.cds[c] = Math.max(0, t.cds[c] - (acc.cantidad || 1)); n++; }
          if (n) emitir('extension', { a: t.uid, texto: `⏳ −${acc.cantidad || 1} cooldown` }, t);
          break;
        }
        case 'detonarDoT': {           // hace al instante todo el daño restante de un DoT (valor × rondas que le quedan) y lo quita (salvo inextinguible)
          const e = get(t, acc.efecto);
          if (!e || t.muerto) break;
          const extra = acc.bonoPorCargas ? (ctx.cargas || 0) * acc.bonoPorCargas : 0;   // + % por cargas consumidas por el movimiento
          if (!e.inextinguible) quitar(t, e);
          emitir('bonoVisible', { a: t.uid, texto: acc.texto || '💥 ¡Detonación!' }, t);
          danoDoT(t, e.valor * Math.max(1, e.dur ?? 1) * (1 + extra), acc.efecto, porUid(e.fuente) || a);
          break;
        }
        case 'reanimar': {              // revive hasta N aliados caídos con % de HP y les pone una marca (p. ej. Edo Tensei)
          const caidos = P.filter(x => x.lado === a.lado && x.muerto && x !== a && !(x.reviveEn > 0)).sort(() => rng() - .5).slice(0, acc.cantidad || 1);
          for (const x of caidos) {
            revivir(x, acc.hp ?? .5);
            if (x.muerto || !acc.marca) continue;            // sin marca: solo revive (p. ej. Gul'dan)
            x.estados.push({ id: acc.marca, permanente: true, fuente: a.uid, inmortalMientras: acc.inmortal ? a.uid : null,
              textoInmortal: acc.textoInmortal, alGolpear: acc.alGolpear });
            emitir('efecto', { a: x.uid, id: acc.marca, texto: `${EFECTOS[acc.marca].icono} ${EFECTOS[acc.marca].nombre}` }, x);
          }
          break;
        }
        case 'marcar': {               // pone una marca (tipo marca: sin tirada, no se limpia ni disipa) con dueño; si ya la tiene de él, renueva
          if (acc.prob != null && rng() >= acc.prob) break;
          if (t.muerto) break;
          let e = t.estados.find(x => x.id === acc.marca && x.fuente === a.uid);
          const hpAntes = maxHp(t);
          if (e) { if (!e.permanente) e.dur = Math.max(e.dur, acc.dur); e.movId = movId; }
          else if (acc.permanente) { e = { id: acc.marca, permanente: true, fuente: a.uid, movId, bono: acc.bono }; t.estados.push(e); }   // permanente: toda la partida; bono: no se acumula (una marca por dueño)
          else { e = { id: acc.marca, dur: acc.dur, fuente: a.uid, movId }; t.estados.push(e); }
          if (acc.bono) t.hp += Math.max(0, maxHp(t) - hpAntes);      // si sube su HP máx., el HP actual sube lo mismo
          if (S.actuaron.has(t) || S.actual === t) e.nuevo = true;
          emitir('efecto', { a: t.uid, id: acc.marca, texto: `${EFECTOS[acc.marca].icono} ${EFECTOS[acc.marca].nombre}` }, t);
          break;
        }
        case 'zona': {                 // levanta una zona (dur rondas) en el ejecutor; si ya la tiene, renueva la duración
          let e = get(t, 'zona');
          if (e) e.dur = Math.max(e.dur, acc.dur);
          else { e = { id: 'zona', dur: acc.dur, zona: acc.zona, fuente: a.uid }; t.estados.push(e); }
          if (S.actuaron.has(t) || S.actual === t) e.nuevo = true;
          emitir('efecto', { a: t.uid, id: 'zona', texto: `${acc.zona.icono} ${acc.zona.nombre}` }, t);
          break;
        }
        case 'turnoExtra':
          if (t !== a) { if (!S.cola.includes(t)) S.cola.push(t); }   // a otro (p. ej. Espíritu de la Fuerza de Yoda): lo toma al terminar el turno en curso
          else t.turnosExtra = (t.turnosExtra || 0) + 1;
          emitir('turnoExtraGanado', { id: t.uid }, t);
          ganoTurnoExtra(t);
          break;
        case 'ordenarBasico': {        // cada aliado (no él) con esa marca usa su Básico: a un enemigo al azar (o a un aliado al azar si es de apoyo)
          // todos: él primero y luego todo su equipo, sin marca; alObjetivo: los de un objetivo van al enemigo del movimiento si sigue siendo válido
          // categoria: otro movimiento en vez del Básico; otros: sus aliados, sin marca; soloListo: solo si lo podría usar ahora; gastaCooldown: entra en cooldown
          const cat = acc.categoria || 'basico';
          const ordenados = acc.todos ? [a, ...aliadosDe(a).filter(x => x !== a)] : aliadosDe(a).filter(x => x !== a && (acc.otros || x.estados.some(e => e.id === acc.marca)));
          for (const x of ordenados) {
            const mov = x.movimientos.find(m => m.categoria === cat);
            if (!mov || x.muerto || conControl(x) || get(x, 'silence')?.categoria === cat || comprobarFin()) continue;
            if (acc.soloListo && (!opciones(x).find(o => o.categoria === cat)?.disponible || !movimientoConviene(x, mov) || mov.efectos?.some(e => e.accion.tipo === 'ordenarBasico'))) continue;   // sin cadenas de órdenes
            const v = objetivosValidos(x, mov), d = acc.alObjetivo && v.includes(ctx.objetivo) ? ctx.objetivo : v.length ? rng.elegir(v) : null;
            if ((mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && !d) continue;
            emitir('bonoVisible', { a: x.uid, texto: acc.texto || '¡A la orden!' }, x);
            if (acc.gastaCooldown) x.cds[cat] = cdDe(x, mov.cd || 0);
            ejecutarMovimiento(x, acc.factor != null && mov.pct ? { ...mov, pct: mov.pct * acc.factor } : mov, d, { reaccion: true });   // factor: % del daño normal
          }
          break;
        }
        case 'multiple':      // aplica varias acciones a cada objetivo elegido (los mismos para todas)
          for (const sub of acc.acciones) ejecutarAccion(a, { ...sub, a: 'objetivo' }, { ...ctx, objetivo: t });
          break;
        case 'danoRepartido': {     // un total de daño por efecto repartido al azar (desigual) entre los enemigos
          const total = (acc.base === 'escudosEquipo' ? aliadosDe(a).reduce((s, x) => s + x.escudo, 0)
            : acc.base === 'hpMaxEnemigos' ? enemigosDe(a).reduce((s, x) => s + maxHp(x), 0) : 0) * acc.pct;   // hpMaxEnemigos: p. ej. Lava Golem
          if (total < 1) { emitir('sinEfecto', { a: a.uid, texto: 'Sin escudos en el equipo' }); break; }
          repartirDano(a, total, acc.paquetes || 10, 0xfde68a);
          break;
        }
        case 'invocarAzar': invocarAzar(t, acc.tabla, acc.rarezas, acc.renueva); break;
        case 'potenciarInvocaciones': potenciarInvocaciones(t, acc.potencia || 1, acc.renovar, acc.veces || 1, acc.conAparecer); break;
        case 'escudo':           // Escudo de pct × HP máx. (o la escala indicada) de quien lo pone, durante `dur` rondas (1 por defecto)
          if (acc.prob != null && rng() >= acc.prob) break;
          darEscudo(a, t, baseDe(a, acc.escala || 'hpMax') * acc.pct, acc.dur ?? 1);
          break;
        case 'limpiar': ctx.limpiados = (ctx.limpiados || 0) + limpiar(a, t, acc); break;
        case 'reiniciarCooldowns': {         // pone en 0 los cooldowns indicados del objetivo
          let n = 0;
          for (const c of acc.categorias || CATEGORIAS) if (t.cds[c] > 0) { t.cds[c] = 0; n++; }
          if (n) emitir('extension', { a: t.uid, texto: '⏳ Cooldowns reiniciados' }, t);
          break;
        }
        case 'golpesPorConteo': {            // un golpe a un enemigo al azar por cada unidad contada (p. ej. debuffs limpiados)
          const n = ctx[acc.conteo] || 0;
          for (let i = 0; i < n && !a.muerto; i++) {
            const e = rng.elegir(enemigosDe(a));
            if (!e) break;
            resolverSobreObjetivo(a, e, { nombre: acc.nombre || 'Golpe', categoria: acc.categoria || 'over', pct: acc.pct, escala: acc.escala || 'dano', color: acc.color }, {});
          }
          break;
        }
        case 'disipar': disipar(a, t, acc); break;
        case 'robarHP': robarHP(a, t, acc.pct); break;
        case 'robarVelocidad': {       // roba % de Velocidad al objetivo (permanente) y se la suma, hasta un tope total
          const queda = (acc.tope ?? 1) - (a.velRobada || 0);
          const r = Math.min(acc.pct, queda);
          if (r <= 1e-9 || t.lado === a.lado) break;
          t.permanente.spdPct = (t.permanente.spdPct || 0) - r;
          a.permanente.spdPct = (a.permanente.spdPct || 0) + r;
          a.velRobada = (a.velRobada || 0) + r;
          emitir('bonoVisible', { a: a.uid, texto: `⚡ +${Math.round(r * 100)}% Velocidad robada` }, a, t);
          break;
        }
        case 'clavarAgujas': {         // clava N Agujas Escarlata (sin tirada: las clava el golpe), hasta el máximo
          let e = get(t, 'aguja');
          if (!e) { e = { id: 'aguja', valor: 0, fuente: a.uid }; t.estados.push(e); }
          const antes = e.valor; e.valor = Math.min(DEBUFFS.agujaMax, e.valor + (acc.n || 1));
          if (e.valor !== antes) emitir('efecto', { a: t.uid, id: 'aguja', texto: `📍 ${e.valor} aguja(s)` }, t);
          break;
        }
        case 'ganarCargas': ganarCargas(t, acc.cantidad || 1, acc.max || 5, acc.efecto); break;   // p. ej. Espada del Poder
        case 'invocar': if (acc.prob == null || rng() < acc.prob) invocar(t, acc.key); break;   // p. ej. Clon de Sombra
        case 'reducirHpMax': {         // baja el HP máx. del objetivo para el resto de la partida (con tope); p. ej. Modo Barión
          const nd = acc.porDebuffs ? [...(ctx.teniaAntes || [])].filter(id => EFECTOS[id]?.tipo === 'debuff').length : 1;   // porDebuffs: × debuffs que tenía antes
          const baja = Math.min(acc.pct * nd, (acc.tope ?? 1) - (t.hpMaxReducido || 0));
          if (baja <= 1e-9) break;
          t.hpMaxReducido = (t.hpMaxReducido || 0) + baja;
          t.permanente.hpPct = (t.permanente.hpPct || 0) - baja;
          if (!t.barra && t.hp > maxHp(t)) t.hp = maxHp(t);
          emitir('bonoVisible', { a: t.uid, texto: `−${Math.round(baja * 100)}% HP máx.` }, t);
          break;
        }
        case 'hemorragia': {           // convierte el Sangrado del objetivo en Hemorragia (garantizado, sin tirada)
          const b = get(t, 'bleed');
          if (!b || get(t, 'hemo')) break;
          quitar(t, b); t.estados.push({ id: 'hemo', valor: b.valor, fuente: a.uid });
          emitir('efecto', { a: t.uid, id: 'hemo', texto: '¡HEMORRAGIA!' }, t);
          break;
        }
        case 'golpeDirecto':           // un golpe más a cada destino (p. ej. la Lanza de Draupnir explota sobre los que sangran)
          resolverSobreObjetivo(a, t, { nombre: acc.nombre || 'Golpe', categoria: 'efecto', pct: acc.pct, escala: acc.escala || 'dano', golpes: 1, color: acc.color }, {});
          break;
        case 'danoPorDebuffs': {       // p. ej. Apocalipsis: 10% del HP máx. por Congelación (o Mega) y por Posesión; ignora Armadura
          const n = acc.efectos.filter(id => ctx.teniaAntes?.has(id)).length;
          if (n) danoEfecto(a, t, n * acc.pct * maxHp(t), acc.color, { sinArmadura: true });
          break;
        }
        case 'transferirBuffs': {            // quita TODOS los buffs disipables del objetivo y se los da al aliado del ejecutor en su misma posición
          const lista = t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && e.id !== 'summon');
          if (!lista.length) break;
          const vivos = aliadosDe(a), para = vivos.find(x => x.pos === t.pos) || rng.elegir(vivos);   // si el de enfrente cayó: uno al azar
          if (!para) break;
          for (const e of lista) {
            quitar(t, e);
            const mio = get(para, e.id);
            if (mio) { if (!mio.permanente) mio.dur = Math.max(mio.dur ?? 0, e.dur ?? 0); if (e.valor) mio.valor = Math.max(mio.valor || 0, e.valor); }
            else para.estados.push({ ...e, nuevo: true, fuente: a.uid });
          }
          emitir('extension', { a: para.uid, texto: `🪄 +${lista.length} buff(s) de ${t.nombre}` }, para, t);
          break;
        }
        case 'activarCooldown': {            // pone el movimiento del objetivo en su cooldown COMPLETO (si era menor)
          if (acc.prob != null && rng() >= acc.prob) break;
          const m = t.movimientos.find(x => x.categoria === acc.categoria);
          if (!m || (t.cds[acc.categoria] || 0) >= cdDe(t, m.cd || 0)) break;
          t.cds[acc.categoria] = cdDe(t, m.cd || 0);
          emitir('extension', { a: t.uid, texto: `⏳ ${NOMBRE_CAT[acc.categoria]} en cooldown (${m.cd})` }, t);
          break;
        }
        case 'robarBuffs': {                 // quita buffs al azar al objetivo y se los pasa al ejecutor (no invocaciones ni lo no disipable)
          const lista = t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && e.id !== 'summon');
          for (const e of [...lista].sort(() => rng() - .5).slice(0, acc.cantidad || 1)) {
            quitar(t, e);
            const mio = get(a, e.id);
            if (mio) { mio.dur = Math.max(mio.dur ?? 0, e.dur ?? 0); if (e.valor) mio.valor = Math.max(mio.valor || 0, e.valor); }
            else a.estados.push({ ...e, nuevo: true, fuente: a.uid });
            emitir('extension', { a: a.uid, texto: `🪄 Roba ${EFECTOS[e.id].nombre}` }, a, t);
          }
          break;
        }
        case 'danoSegunEnemigos': {          // daño por efecto = suma de pct × HP máx. de cada enemigo con ese efecto (p. ej. Spear)
          const total = enemigosDe(a).filter(x => get(x, acc.efecto)).reduce((s, x) => s + maxHp(x) * acc.pct, 0);
          danoEfecto(a, t, total, 0xf59e0b);
          break;
        }
        case 'usarMovimiento': {            // usa uno de sus movimientos sobre el objetivo (funciona igual que el normal)
          // categoria 'disponible': uno al azar entre los que no están en cooldown ni silenciados (y que la IA usaría)
          const mov = acc.categoria === 'disponible' ? rng.elegir(a.movimientos.filter(m => !(a.cds[m.categoria] > 0) && !movBloqueado(a, m.categoria) && movimientoConviene(a, m)))
            : a.movimientos.find(m => m.categoria === acc.categoria);
          const usar = d => {
            if (!mov || a.muerto || !d || d.muerto || movBloqueado(a, mov.categoria)) return;
            if (acc.gastaCooldown) a.cds[mov.categoria] = cdDe(a, mov.cd || 0);     // gastaCooldown: entra en cooldown como si lo hubiera usado
            ejecutarMovimiento(a, mov, d, { reaccion: true, contraataque: !!acc.contraataque });
          };
          // despues: espera a que termine el movimiento en curso; si su objetivo cayó, va a otro enemigo al azar
          if (acc.despues) reacciones.push(() => usar(t.muerto ? rng.elegir(enemigosDe(a)) : t));
          else usar(t);
          break;
        }
        case 'danoEfecto': danoEfecto(a, t, (ctx.dano || 0) * acc.fraccion, 0xc084fc); break;
        case 'sumarCooldown': {        // +N turnos de cooldown a uno al azar de esos movimientos del objetivo (p. ej. El Reino de las Sombras)
          const cats = (acc.categorias || CATEGORIAS).filter(c => t.movimientos.some(m => m.categoria === c));
          const c = rng.elegir(cats); if (!c) break;
          t.cds[c] = (t.cds[c] || 0) + (acc.cantidad || 1);
          emitir('bonoVisible', { a: t.uid, texto: `⏳ ${NOMBRE_CAT[c]} +${acc.cantidad || 1} cooldown` }, t);
          break;
        }
        case 'reducirStat': {          // baja una estadística del objetivo para el resto de la partida, acumulable hasta un tope (p. ej. Slime: −5 Puntería)
          t.reducido ||= {};
          const baja = Math.min(acc.valor, acc.tope - (t.reducido[acc.stat] || 0));
          if (baja <= 1e-9) break;
          t.reducido[acc.stat] = (t.reducido[acc.stat] || 0) + baja;
          t.permanente[acc.stat] = (t.permanente[acc.stat] || 0) - baja;
          emitir('bonoVisible', { a: t.uid, texto: `−${Math.round(baja * 100)} ${NOMBRE_STAT[acc.stat] || acc.stat}` }, t);
          break;
        }
        case 'sacrificarInvocar': {    // consume la invocación `sacrificio` (o, si no la tiene, `o` invocaciones) e invoca `key` (p. ej. Dragón Alado de Ra)
          const lista = todos(t, 'summon'), sac = lista.find(e => e.key === acc.sacrificio);
          const quitan = sac ? [sac] : lista.length >= acc.o ? lista.slice(0, acc.o) : null;
          if (!quitan) { emitir('sinEfecto', { a: t.uid, texto: 'Sin invocaciones para sacrificar' }); break; }
          t.estados = t.estados.filter(e => !quitan.includes(e));
          for (const e of quitan) emitir('invocacionRetira', { de: t.uid, key: e.key }, t);
          invocar(t, acc.key);
          break;
        }
        case 'liberarAcumulado': {   // libera el daño de su marca acumuladora en un enemigo al azar y pone una marca nueva (en 0)
          const e = get(t, acc.marca), d = rng.elegir(enemigosDe(t));
          if (e?.valor > 0 && d) {
            emitir('bonoVisible', { a: t.uid, texto: acc.texto || '¡Libera el daño!' }, t);
            danoEfecto(t, d, e.valor * (acc.pct ?? 1), EFECTOS[acc.marca].color, { sinArmadura: !!acc.sinArmadura });
          }
          if (e) quitar(t, e);
          if (!t.muerto) { t.estados.push({ id: acc.marca, valor: 0, permanente: true, fuente: t.uid }); emitir('efecto', { a: t.uid, id: acc.marca, texto: EFECTOS[acc.marca].nombre }, t); }
          break;
        }
        case 'replicarDoT': {
          const e = ctx.objetivo && get(ctx.objetivo, acc.efecto);
          if (e) danoEfecto(a, t, e.valor * acc.factor * maxHp(t), EFECTOS[acc.efecto].color);
          break;
        }
        case 'propagar': {     // copia un debuff del objetivo principal en su estado actual; cada copia tira Puntería
          // efecto: 'azar' = uno al azar entre los debuffs que el objetivo YA tenía antes del movimiento
          const id = acc.efecto !== 'azar' ? acc.efecto
            : (ctx._propagado ??= rng.elegir([...new Set((ctx.debuffsPrevios || []).map(e => e.id))]) || null);
          const src = id && ctx.estadoDe?.(id);
          if (src) intentarEfecto(a, t, copiaDe(src));
          break;
        }
        case 'detonar': {
          const bombas = todos(t, 'bomb');
          t.estados = t.estados.filter(e => e.id !== 'bomb');
          if (!bombas.length) emitir('sinEfecto', { a: t.uid, texto: 'Sin bombas' });
          for (const b of bombas) if (!t.muerto) explotarBomba(t, b, false);
          break;
        }
      }
    }
  }

  // Datos para aplicar una COPIA exacta de un debuff (Propagar): misma intensidad y duración restante
  function copiaDe(e) {
    const c = { id: e.id, valorFinal: e.valor, dur: e.dur };
    if (e.id === 'bomb') c.dur = e.contador;
    if (e.id === 'stun' || e.id === 'possess') { c.turnos = e.turnos; c.mega = e.mega; }
    if (e.id === 'freeze') { c.mega = e.mega; c.capas = e.capas || (e.mega ? 2 : 1); }
    return c;
  }

  function cumple(cond, ctx) {
    if (!cond) return true;
    if (cond.objetivoMarcaMin) { const { marca, min } = cond.objetivoMarcaMin; const e = ctx.objetivo?.estados.find(x => x.id === marca && x.fuente === ctx.ejecutor?.uid); return (e?.valor || 0) >= min; }
    if (cond.sellado !== undefined) return !!ctx.ejecutor && !!ctx.ejecutor.sellado === cond.sellado;   // p. ej. Enkidu: Mega Aturdimiento si ya va en serio
    if (cond.propioCargasMin) return !!ctx.ejecutor && (get(ctx.ejecutor, cond.propioCargasMin.efecto)?.valor || 0) >= cond.propioCargasMin.min;   // p. ej. Escanor con 12 de The One
    if (cond.propioTiene) return !!ctx.ejecutor && !!get(ctx.ejecutor, cond.propioTiene);   // el que ejecuta tiene ese efecto (p. ej. Shinobu envenenada)
    if (cond.objetivoTiene) return !!(ctx.objetivo && get(ctx.objetivo, cond.objetivoTiene));
    if (cond.objetivoTeniaAntes) return [].concat(cond.objetivoTeniaAntes).some(id => ctx.teniaAntes?.has(id));
    if (cond.objetivoTeniaDebuff) return [...(ctx.teniaAntes || [])].some(id => EFECTOS[id]?.tipo === 'debuff');   // cualquier debuff antes del golpe
    if (cond.rompioMega) return !!ctx.rompioMega;
    if (cond.objetivoConBuff) return !!ctx.objetivo && tieneBuff(ctx.objetivo);
    if (cond.equipo) return !!ctx.ejecutor && tieneEquipo(ctx.ejecutor, cond.equipo);
    if (cond.enemigosCon) { const { efectos, min = 1 } = cond.enemigosCon; return !!ctx.ejecutor && enemigosDe(ctx.ejecutor).filter(x => [].concat(efectos).some(id => get(x, id))).length >= min; }      // algún golpe del movimiento rompió una capa de Mega Congelación
    if (cond.cargasConsumidasMin) return (ctx.cargas || 0) >= cond.cargasConsumidasMin;
    if (cond.objetivoEfectoDurMin) { const e = ctx.objetivo && get(ctx.objetivo, cond.objetivoEfectoDurMin.efecto); return !!e && (e.dur ?? 0) >= cond.objetivoEfectoDurMin.dur; }
    if (cond.algunGolpeadoTenia) return !!ctx.golpeadosTenian?.has(cond.algunGolpeadoTenia);
    if (cond.invocacionesMin) return (ctx.invocaciones || 0) >= cond.invocacionesMin;
    if (cond.propioInvocacion) return !!ctx.ejecutor && todos(ctx.ejecutor, 'summon').some(e => e.key === cond.propioInvocacion);   // quien ejecuta tiene esa invocación activa
    if (cond.propioSinInvocacion) return !!ctx.ejecutor && !todos(ctx.ejecutor, 'summon').some(e => e.key === cond.propioSinInvocacion);
    if (cond.objetivoEliminado) return !!ctx.objetivo?.muerto;
    if (cond.objetivoMasHpQueYo) return !!ctx.objetivo && !!ctx.atacante && (ctx.hpObjetivoAntes ?? ctx.objetivo.hp) > ctx.atacante.hp;
    if (cond.objetivoOverListo) {      // el objetivo tiene su Over listo para usar (sin cooldown ni Silencio)
      const t = ctx.objetivo;
      return !!t && t.movimientos.some(m => m.categoria === 'over') && !(t.cds.over > 0) && !movBloqueado(t, 'over');
    }
    return true;
  }

  // Gatillos de pasivas (una sola función para todos los personajes)
  function pasivas(p, gatillo, ctx, pa = p.pasiva) {
    if (p.muerto || !pa || pa.gatillo !== gatillo) return;
    if (pa.filtro?.tipo && pa.filtro.tipo !== ctx.tipo) return;
    if (pa.filtro?.en === 'enemigos' && (!ctx.objetivo || ctx.objetivo.lado === p.lado)) return;
    if (pa.filtro?.en === 'propio' && ctx.objetivo !== p) return;      // solo cuando le pasa a él mismo (p. ej. su propio Veneno lo daña)
    if (pa.filtro?.categorias && !pa.filtro.categorias.includes(ctx.categoria)) return;
    if (pa.filtro?.objetivoTiene && !(ctx.objetivo && get(ctx.objetivo, pa.filtro.objetivoTiene))) return;
    if (pa.filtro?.teniaAlMorir && !ctx.teniaAlMorir?.has(pa.filtro.teniaAlMorir)) return;
    if (pa.maxPorRonda && p.usosPasiva >= pa.maxPorRonda) return;
    if (pa.unaVezPorMovimiento) { if (p.movPasiva === movId) return; p.movPasiva = movId; }   // un solo intento por movimiento
    if (pa.prob != null && rng() >= pa.prob) return;      // probabilidad de la pasiva (si falla, no gasta el uso de la ronda)
    // soloSiCura: si nadie de los destinos puede recibir curación, no se activa ni gasta uso
    if (pa.soloSiCura && !objetivosAccion(p, pa.accion.a, ctx).some(t => !t.muerto && t.hp < maxHp(t) && puedeCurarse(t))) return;
    p.usosPasiva++;
    emitir('pasiva', { id: p.uid, nombre: pa.nombre });
    ejecutarAccion(p, pa.accion, ctx);
  }

  // ================================================================ transformaciones
  // La forma reemplaza estadísticas, movimientos y pasiva; conserva buffs, debuffs, escudos, invocaciones y el líder.
  // turnos = número -> temporal (vuelve a la forma base); sin turnos -> PERMANENTE. Una forma puede tener su propia
  // "transformacion" (cadena: Goku -> Super Saiyajin -> Super Saiyajin 3). Los buffs, debuffs y bonos permanentes se
  // conservan y se aplican sobre las estadísticas base de la nueva forma.
  function transformar(p, turnos) {
    const f = p.transformacion;
    if (!f || p.muerto || (p.forma && !p.forma.permanente)) return;
    const ratio = p.hp / maxHp(p), pasivaAntes = p.pasiva;
    if (!p.formaBase) p.formaBase = { base: p.base, extra: p.extra, pasiva: p.pasiva, movimientos: p.movimientos, cds: p.cds, transformacion: p.transformacion };
    p.base = f.base; p.extra = f.extra || {}; p.pasiva = f.pasiva || null; p.movimientos = clonar(f.movimientos);
    p.transformacion = f.transformacion || null;
    if (f.lider) p.lider = f.lider;                   // la forma trae su propio líder (p. ej. Ra Modo Fénix); esLider no cambia
    if (!f.compartirCooldowns) p.cds = { basico: 0, especial: 0, over: p.movimientos.find(m => m.categoria === 'over')?.cd || 0 };   // el Over empieza con su cooldown completo (salvo formas que comparten cooldowns)
    const permanente = !turnos;
    p.forma = { nombre: f.nombre, imagen: f.imagen, emoji: f.emoji, color: f.color, turnos: turnos || 0, total: turnos || 0, permanente, recien: true };
    if (permanente) p.formaBase = null;              // ya no hay vuelta atrás
    p.hp = ratio * maxHp(p);                          // se conserva el % de vida
    emitir('transformacion', { id: p.uid, nombre: f.nombre, color: f.color }, p);
    pasivas(p, 'alTransformarse', { objetivo: p }, pasivaAntes);   // usa la pasiva que tenía al transformarse
    for (const x of aliadosDe(p)) if (x !== p && x.pasiva?.alTransformarseAliado) {   // pasiva de un aliado: reacciona cuando otro se transforma (p. ej. Trunks)
      emitir('pasiva', { id: x.uid, nombre: x.pasiva.nombre });
      for (const acc of [].concat(x.pasiva.alTransformarseAliado)) ejecutarAccion(x, acc, { objetivo: p });   // una acción o una lista
    }
  }
  function revertir(p) {
    const ratio = p.hp / maxHp(p), b = p.formaBase;
    Object.assign(p, { base: b.base, extra: b.extra, pasiva: b.pasiva, movimientos: b.movimientos, cds: b.cds, transformacion: b.transformacion, forma: null, formaBase: null });
    p.hp = ratio * maxHp(p);
    emitir('transformacionFin', { id: p.uid }, p);
  }

  // ================================================================ invocaciones
  // Reglas generales: máximo 3 invocaciones activas por invocador; si está lleno, se reemplaza la de menor duración restante.
  // Un tipo ya activo se renueva (salvo que su "max" permita varias, como los Dragones de Ysera).
  const MAX_INVOCACIONES = 3;
  // Duración completa de una invocación con la regla general: si su invocador ya actuó (o está actuando) en esta ronda,
  // no pierde duración al final de ella. Así "dura N" = actúa N veces.
  function duracionCompleta(a, e) {
    e.dur = INVOCACIONES[e.key].dur;
    e.nuevo = S.actuaron.has(a) || S.actual === a;
  }

  function invocar(a, key) {
    const def = INVOCACIONES[key];
    const mismas = todos(a, 'summon').filter(e => e.key === key);
    if (mismas.length >= (def.max || 1)) {
      const vieja = mismas.reduce((x, y) => x.dur < y.dur ? x : y);
      duracionCompleta(a, vieja);
      emitir('invocacionRenueva', { de: a.uid, key }, a);
      return;
    }
    const activas = todos(a, 'summon');
    if (activas.length >= MAX_INVOCACIONES) {
      const cand = activas.filter(x => !INVOCACIONES[x.key].protegida);   // protegida: nunca la reemplaza otra (p. ej. Dragón Alado de Ra)
      const sale = (cand.length ? cand : activas).reduce((x, y) => x.dur < y.dur ? x : y);
      a.estados = a.estados.filter(e => e !== sale);
      emitir('invocacionRetira', { de: a.uid, key: sale.key }, a);
    }
    const e = { id: 'summon', key, fresca: true };
    duracionCompleta(a, e);
    a.estados.push(e);
    emitir('invocacion', { de: a.uid, key, idx: todos(a, 'summon').length - 1, rareza: def.rareza }, a);
    for (const acc of def.alAparecer || []) accionInvocacion(a, e, acc, 1);
    revisarTransformarSi(a);
  }

  // Invocación aleatoria por pesos; nunca repite una que ya esté activa (si no se permiten varias de ese tipo)
  // renueva: si sale una invocación ya activa, se renueva en vez de volver a tirar (así se respetan los pesos de la tabla)
  function invocarAzar(a, tabla, rarezas, renueva = false) {
    const activas = new Set(todos(a, 'summon').map(e => e.key));
    const pool = (TABLAS_INVOCACION[tabla] || []).filter(x => (!rarezas || rarezas.includes(INVOCACIONES[x.key].rareza))
      && (renueva || !activas.has(x.key) || (INVOCACIONES[x.key].max || 1) > 1));
    if (!pool.length) { emitir('sinEfecto', { a: a.uid, texto: 'Todas sus invocaciones están activas' }); return; }
    let r = rng() * pool.reduce((s, x) => s + x.peso, 0);
    const elegido = pool.find(x => (r -= x.peso) < 0) || pool[pool.length - 1];
    invocar(a, elegido.key);
  }

  function elegirObjetivos(a, criterio) {
    const rivales = conProvocacion(enemigosDe(a));
    if (!rivales.length) return [];
    if (criterio === 'todos') return enemigosDe(a);
    if (criterio === 'menorHp') return [rivales.reduce((x, y) => x.hp / maxHp(x) < y.hp / maxHp(y) ? x : y)];
    if (criterio === 'masFuerte') return [rivales.reduce((x, y) => stats(x).dmg >= stats(y).dmg ? x : y)];
    return [rng.elegir(rivales)];
  }

  // Ejecuta UNA acción de una invocación. Los golpes usan las estadísticas del invocador; "potencia" multiplica los %.
  function accionInvocacion(a, e, acc, potencia, forzados) {
    if (a.muerto || S.fin) return;
    const def = INVOCACIONES[e.key];
    const idx = todos(a, 'summon').indexOf(e);
    if (acc.tipo === 'golpe') {
      let extendida = false;                 // extenderSi: +1 de duración si golpea a alguien con ese efecto (1 vez por acción; p. ej. Dragón Alado de Ra)
      for (const t of forzados || elegirObjetivos(a, acc.elegir)) {
        if (t.muerto) continue;
        if (acc.extenderSi && !extendida && get(t, acc.extenderSi) && todos(a, 'summon').includes(e)) {
          extendida = true; e.dur++; emitir('bonoVisible', { a: a.uid, texto: `${def.emoji} ${def.nombre} +1 turno` }, a);
        }
        emitir('invocacionAtaca', { de: a.uid, key: e.key, idx, a: t.uid });
        const extra = acc.golpeExtraSi && get(t, acc.golpeExtraSi) ? 1 : 0;   // p. ej. Drogon: 2.º golpe si tiene Quemadura
        resolverSobreObjetivo(a, t, { nombre: def.nombre, categoria: 'invocacion', pct: acc.pct * potencia, escala: acc.escala || 'dano',
          golpes: (acc.golpes || 1) + extra, color: def.color, efectos: acc.efectos }, { fuente: def.nombre });
        emitir('invocacionVuelve', { de: a.uid, key: e.key });
        procesarReacciones();
      }
      return;
    }
    emitir('invocacionActua', { de: a.uid, key: e.key, idx });
    ejecutarAccion(a, acc.pct ? { ...acc, pct: acc.pct * potencia } : acc, {});
  }

  function actuarInvocacion(a, e, potencia = 1) {
    for (const acc of INVOCACIONES[e.key].acciones || []) accionInvocacion(a, e, acc, potencia);
  }

  function actuanInvocaciones(a) {
    for (const e of todos(a, 'summon')) {
      if (e.fresca || a.muerto || S.fin) continue;
      if (!enemigosDe(a).length) return;
      actuarInvocacion(a, e);
    }
  }

  // Dominio del Monarca: todas actúan de inmediato con potencia extra y (opcional) renuevan su duración
  // veces: cuántas veces actúa cada invocación (en rondas: todas una vez, luego todas otra vez)
  // conAparecer: también repiten su efecto al aparecer (p. ej. Ataque Directo de Marik)
  function potenciarInvocaciones(a, potencia, renovar, veces = 1, conAparecer = false) {
    const lista = todos(a, 'summon');
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    emitir('dominio', { id: a.uid, potencia, veces }, a);
    for (let v = 0; v < veces; v++) for (const e of lista) {
      if (a.muerto || S.fin || !enemigosDe(a).length) break;
      if (conAparecer) for (const acc of INVOCACIONES[e.key].alAparecer || []) accionInvocacion(a, e, acc, 1);
      actuarInvocacion(a, e, potencia);
    }
    if (renovar) for (const e of lista) duracionCompleta(a, e);
    emitir('actualizar', {}, a);
  }

  function desatar(a, mov) {
    const lista = todos(a, 'summon').filter(e => e.key === mov.desatar);
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    for (const e of lista) {
      const golpe = (INVOCACIONES[e.key].acciones || []).find(x => x.tipo === 'golpe') || {};
      accionInvocacion(a, e, { ...golpe, tipo: 'golpe', pct: mov.pctInvocacion }, 1, enemigosDe(a));
    }
    a.estados = a.estados.filter(e => !lista.includes(e));
    emitir('invocacionRetira', { de: a.uid, key: mov.desatar }, a);
  }

  // ================================================================ movimientos
  function resolverSobreObjetivo(a, t, mov, ctx = {}) {
    if (t.muerto) return;
    const hostil = t.lado !== a.lado || ctx.forzado;
    if (hostil && rng() < Math.min(stats(t).block, TOPES.block)) { emitir('bloqueo', { de: a.uid, a: t.uid }); return; }
    const cln = hostil && t.lado !== a.lado && t.pasiva?.clones, clon = cln && get(t, cln.efecto);
    if (clon?.valor > 0) {             // pasiva "clones": un clon absorbe por completo este ataque contra él (daño y efectos)
      clon.valor--; if (!clon.valor) quitar(t, clon);
      emitir('bonoVisible', { a: t.uid, texto: cln.texto || '¡Era un clon!' }, t);
      emitir('actualizar', {}, t);
      if (cln.alAbsorber && !a.muerto) ejecutarAccion(t, cln.alAbsorber, { objetivo: a, atacante: a });
      return;
    }
    if (mov.rompeEscudo && hostil && t.escudo > 0) {     // rompeEscudo: destruye todo el Escudo del objetivo antes de golpear (p. ej. Enuma Elish)
      t.escudo = 0;
      emitir('bonoVisible', { a: t.uid, texto: '💥 ¡Escudo destruido!' }, t);
      emitir('actualizar', {}, t);
      perdioEscudo(t);
    }
    if (ctx.acum) for (const e of t.estados) ctx.acum.tenian.add(e.id);     // lo que tenía el objetivo al ser golpeado
    const hpObjetivoAntes = t.hp;
    const ctxGolpe = { ...ctx, teniaAntes: new Set(t.estados.map(e => e.id)) };   // lo que tenía ESTE objetivo antes del movimiento
    const efectosDelGolpe = () => {
      if (t.muerto) return;
      for (const ef of mov.efectos || []) {
        if (ef.cuando && ef.cuando !== 'objetivo') continue;
        const c = { objetivo: t, atacante: a, ejecutor: a, hpObjetivoAntes, cargas: ctx.cargas, teniaAntes: ctxGolpe.teniaAntes };
        if (cumple(ef.condicion, c)) ejecutarAccion(a, ef.accion, c);
      }
    };
    // cada golpe intenta sus efectos: 2 golpes al mismo objetivo = 2 tiradas
    let huboCritico = false;
    if (mov.pct) for (let i = 0; i < (mov.golpes || 1) && !t.muerto; i++) { huboCritico = golpear(a, t, mov, ctxGolpe) || huboCritico; efectosDelGolpe(); }
    else efectosDelGolpe();
    // pasiva "potenciaBombas": las Bombas que el enemigo YA tenía antes de este ataque hacen ×factor de daño (una vez por Bomba y ataque)
    const pb = a.pasiva?.potenciaBombas;
    if (pb && mov.pct && !t.muerto && t.lado !== a.lado && ctx.bombasPrevias) for (const b of todos(t, 'bomb')) {
      if (!ctx.bombasPrevias.has(b) || ctx.bombasPotenciadas.has(b)) continue;
      ctx.bombasPotenciadas.add(b); b.valor *= pb.factor;
      emitir('bonoVisible', { a: t.uid, texto: `💣 ¡Bomba ×${pb.factor}!` }, t);
    }
    // pasiva "roboSiObjetivoTiene": roba % del HP máx. a quien ya tenía ese efecto al ser atacado (1 vez por movimiento y objetivo)
    const rb = a.pasiva?.roboSiObjetivoTiene;
    if (rb && mov.pct && !t.muerto && ctxGolpe.teniaAntes.has(rb.efecto) && t.lado !== a.lado && !(ctx.robados ||= new Set()).has(t)) {
      ctx.robados.add(t); robarHP(a, t, rb.pct);
    }
    // "golpeExtraContra": prob. de un golpe más (1 golpe) a OTRO enemigo con ese efecto; ese golpe no provoca otro
    const gx = mov.golpeExtraContra;
    if (gx && !a.muerto && rng() < gx.prob) {
      const l = enemigosDe(a).filter(x => x !== t && get(x, gx.efecto));
      if (l.length) { const d = rng.elegir(l); emitir('golpeExtra', { id: a.uid, a: d.uid }); resolverSobreObjetivo(a, d, { ...mov, golpes: 1, golpeExtraContra: null }, ctx); }
    }
    // "golpeExtraSiCritico": un golpe más (máximo uno) si alguno fue crítico; si el objetivo murió, va a un enemigo al azar
    if (mov.golpeExtraSiCritico && huboCritico && !a.muerto) {
      const destino = !t.muerto ? t : rng.elegir(enemigosDe(a));
      if (destino) { emitir('golpeExtra', { id: a.uid, a: destino.uid }); resolverSobreObjetivo(a, destino, { ...mov, golpes: 1, golpeExtraSiCritico: false }, ctx); }
    }
  }

  // Efectos que un movimiento puede aplicar o propagar (la interfaz los usa, p. ej. para el sonido de un golpe de fuego)
  const formasDe = d => { const l = [d]; for (let f = d.transformacion; f; f = f.transformacion) l.push(f); return l; };
  // ¿Algún movimiento o pasiva (en cualquier forma) aplica ese efecto? (p. ej. Loki envenena desde su pasiva)
  const aplicaEnFormas = (d, id) => formasDe(d).some(f => (f.movimientos || []).some(m => efectosQueAplica(m).includes(id)) || efectosQueAplica({ efectos: [{ accion: f.pasiva?.accion }] }).includes(id));
  function efectosQueAplica(mov) {
    const ids = new Set();
    const ver = acc => {
      if (!acc) return;
      if (acc.tipo === 'efecto' && acc.id) ids.add(acc.id);       // los efectos al azar (idAzar) no cuentan
      if (acc.tipo === 'propagar' && acc.efecto) ids.add(acc.efecto);
      (acc.acciones || []).forEach(ver);
    };
    for (const ef of mov.efectos || []) ver(ef.accion);
    return [...ids];
  }

  let movId = 0;                       // cuenta los movimientos ejecutados (pasivas "una vez por movimiento")
  function ejecutarMovimiento(a, mov, objetivo, ctx = {}) {
    movId++;
    profundidad++;
    moverse(a, mov, objetivo, ctx);
    profundidad--;
    procesarReacciones();
  }

  function moverse(a, mov, objetivo, ctx) {
    // Confusión: los movimientos de un solo objetivo pueden cambiar de objetivo
    if (!ctx.forzado && get(a, 'confuse') && (mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && rng() < CONTROL.confusionProb) {
      const nuevo = rng.elegir(P.filter(x => !x.muerto && x !== a));
      if (nuevo) { objetivo = nuevo; emitir('confundido', { id: a.uid, a: nuevo.uid }); }
    }
    if (mov.objetivo === 'todosEnemigos') for (const l of P.filter(x => x.lado !== a.lado && x.esLider && !x.muerto && x.lider?.alEnemigoAoe)) {   // líder "alEnemigoAoe": tira por cada aliado antes del ataque
      const ae = l.lider.alEnemigoAoe;
      for (const x of aliadosDe(l)) if (rng() < ae.prob) aplicarEfecto(l, x, { id: ae.id, dur: ae.dur });
    }
    // 'azar': cada golpe va a un enemigo al azar (puede repetir; ignora Provocación)
    const azar = mov.objetivo === 'azar' ? Array.from({ length: mov.golpes || 1 }, () => rng.elegir(enemigosDe(a))).filter(Boolean) : null;
    const objetivos = azar ? azar : mov.objetivo === 'todosEnemigos' ? sinEsquiva(enemigosDe(a))
      : mov.objetivo === 'todosAliados' ? aliadosDe(a)
        : mov.objetivo === 'propio' ? [a] : [objetivo].filter(Boolean);
    emitir('movimiento', { id: a.uid, categoria: mov.categoria, nombre: mov.nombre, estilo: mov.estilo, color: mov.color,
      objetivos: objetivos.map(t => t.uid), forzado: !!ctx.forzado, golpea: !!mov.pct, aplica: efectosQueAplica(mov), elemento: mov.elemento || null });
    const atacanteTenia = new Set(a.estados.map(e => e.id));   // lo que tenía el atacante al empezar (para "atacado por un enemigo con X")

    if (mov.consumeCargas) {                          // consume todas sus cargas (de ese tipo): cada una suma daño a este movimiento
      const idc = mov.consumeCargas.efecto || 'cargas', e = get(a, idc);
      ctx = { ...ctx, cargas: e?.valor || 0 };
      if (e) { quitar(a, e); emitir('bono', { id: a.uid, texto: `${EFECTOS[idc].icono} ×${ctx.cargas} cargas` }, a); }
    }
    const hm = get(a, 'hemo');                       // Hemorragia: pierde HP al ejecutar un movimiento
    if (hm) danoDoT(a, hm.valor, 'hemo', fuentesDe([hm]));
    if (!ctx.forzado && !ctx.reaccion) a.cds[mov.categoria] = cdDe(a, mov.cd || 0);
    if (mov.unaVez) (a.usados ||= new Set()).add(mov.nombre);

    if (!a.muerto) {
      const principal = objetivo || objetivos[0] || null;
      const invocacionesAntes = todos(a, 'summon').length;    // invocaciones activas al ejecutar el movimiento
      const vivosAlEmpezar = new Set(objetivos.filter(t => !t.muerto));
      const previos = principal ? clonar(principal.estados) : [];    // para Propagar aunque el objetivo muera
      const c = { ...ctx, acum: { dano: 0, tenian: new Set() },
        bombasPrevias: new Set(enemigosDe(a).flatMap(x => todos(x, 'bomb'))), bombasPotenciadas: new Set() };   // pasiva "potenciaBombas"
      const factorBombasAntes = S.factorBombas;      // movimiento "potenciaBombas": las Bombas que estallen durante él hacen ×factor
      if (mov.potenciaBombas) S.factorBombas = mov.potenciaBombas.factor;
      if (mov.invocar) invocar(a, mov.invocar);
      else if (mov.desatar) desatar(a, mov);
      else if (azar) azar.forEach((t, i) => {
        if (t.muerto) t = rng.elegir(enemigosDe(a));        // si el elegido ya cayó, el golpe va a otro enemigo vivo
        if (!t || a.muerto) return;
        // recorreCiclo: el golpe i usa la fase i del ciclo (su bono de daño y sus efectos), sin cambiar la fase activa
        const f = mov.recorreCiclo ? a.pasiva?.ciclo?.fases?.[i % a.pasiva.ciclo.fases.length] || null : undefined;
        resolverSobreObjetivo(a, t, { ...mov, golpes: 1 }, f !== undefined ? { ...c, fase: f } : c);
        if (f?.alIniciar && !a.muerto) ejecutarAccion(a, f.alIniciar, { objetivo: a });
        if (f?.alFinal && !a.muerto && !t.muerto) ejecutarAccion(a, f.alFinal, { objetivo: t, ejecutor: a });
      });
      else {
        for (const ef of mov.efectos || []) if (ef.cuando === 'antes')     // "antes": se aplican a cada objetivo ANTES de golpear
          for (const t of objetivos) { const cx = { objetivo: t, ejecutor: a }; if (!t.muerto && cumple(ef.condicion, cx)) ejecutarAccion(a, ef.accion, cx); }
        for (const t of objetivos) resolverSobreObjetivo(a, t, mov, c);
        if (mov.salta && !a.muerto) {        // "salta": después del objetivo, salta a N enemigos distintos con otro % (p. ej. Cadena de Relámpagos)
          const otros = [...enemigosDe(a).filter(x => !objetivos.includes(x))].sort(() => rng() - .5).slice(0, mov.salta.veces);
          for (const d of otros) {
            if (a.muerto) break;
            emitir('bonoVisible', { a: d.uid, texto: mov.salta.texto || '¡Salta!' }, d);
            resolverSobreObjetivo(a, d, { ...mov, pct: mov.salta.pct, golpes: 1, salta: null }, c);
          }
        }
      }

      const sobrevivientes = [...new Set(objetivos)].filter(t => !t.muerto && t.lado !== a.lado);
      const eliminados = [...new Set(objetivos)].filter(t => t.muerto && t.lado !== a.lado && vivosAlEmpezar.has(t)).length;
      const final = {
        ejecutor: a, sobrevivientes, eliminados, objetivo: principal, danoCausado: c.acum.dano, golpeadosTenian: c.acum.tenian, rompioMega: !!c.acum.rompioMega, invocaciones: invocacionesAntes, esMovimiento: true, categoriaMov: mov.categoria,
        estadoDe: id => (principal && !principal.muerto && get(principal, id)) || previos.find(e => e.id === id),
        debuffsPrevios: previos.filter(e => EFECTOS[e.id]?.tipo === 'debuff'),
      };
      for (const ef of mov.efectos || []) if (ef.cuando === 'final' && cumple(ef.condicion, final)) ejecutarAccion(a, ef.accion, final);
      S.factorBombas = factorBombasAntes;
      const fa = a.faseActiva;                         // ciclo: efecto final de la fase activa (solo en su turno, con su propio movimiento)
      if (fa?.alFinal && S.actual === a && !ctx.forzado && !ctx.reaccion && !mov.recorreCiclo && !a.muerto) {
        const dest = mov.objetivo === 'enemigo' && principal && !principal.muerto && principal.lado !== a.lado ? principal : rng.elegir(sobrevivientes);
        if (dest) ejecutarAccion(a, fa.alFinal, { objetivo: dest, ejecutor: a });
      }
      if (mov.bonoPorSobreviviente && sobrevivientes.length) {
        a.bonos[mov.categoria] = (a.bonos[mov.categoria] || 0) + mov.bonoPorSobreviviente * sobrevivientes.length;
        emitir('bono', { id: a.uid, texto: `${mov.nombre} +${Math.round(a.bonos[mov.categoria] * 100)}%` }, a);
      }
    }
    if (!a.muerto && mov.pct && mov.categoria !== 'invocacion' && enemigosDe(a).length) for (const m of pasivasDeReliquia(a)) {   // reliquia "convertir"
      const cv = m.convertir; if (!cv) continue;
      if ((a.conversiones || 0) >= cv.maxBatalla || a.convirtioRonda === S.ronda) continue;
      const caidos = [...new Set(objetivos)].filter(t => t.muerto && t.lado !== a.lado && !t.noRevivir && !t.convertido);
      if (!caidos.length) continue;
      const t = rng.elegir(caidos);
      a.conversiones = (a.conversiones || 0) + 1; a.convirtioRonda = S.ronda;
      t.convertido = { lado: t.lado, hasta: S.ronda + cv.rondas, era: t.esLider };
      t.lado = a.lado; t.esLider = false; t.muerto = false;           // pasa al equipo del portador (sin habilidad de líder)
      t.muerto = true; revivir(t, cv.hp);
      t.estados.push({ id: 'esclavoRuna', permanente: true, fuente: a.uid });
      emitir('bonoVisible', { a: t.uid, texto: '❄️ ¡Esclavo de Frostmourne!' }, t);
    }
    if (!a.muerto && mov.pct && mov.categoria !== 'invocacion') for (const m of pasivasDeReliquia(a)) {   // contador de reliquia: +1 por movimiento
      const ct = m.contador;
      const tipo = mov.objetivo === 'todosEnemigos' ? 'aoe' : (mov.golpes || 1) > 1 ? 'multigolpe' : null;
      if (ct && tipo && ct.al.includes(tipo)) ganarCargas(a, 1, ct.max, ct.efecto);
    }
    emitir('movimientoFin', { id: a.uid, estilo: mov.estilo }, a);
    if (!ctx.contraataque && !ctx.forzado) for (const d of new Set(objetivos)) {
      if (d.lado === a.lado || d.muerto || d.pasiva?.gatillo !== 'alSerAtacado') continue;
      reacciones.push(() => {
        if (a.muerto || d.muerto) return;
        if (d.pasiva.filtro?.atacanteTiene && !atacanteTenia.has(d.pasiva.filtro.atacanteTiene)) return;   // ya lo tenía al atacar
        if (d.estados.some(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0))) return;   // con Control no contraataca
        pasivas(d, 'alSerAtacado', { objetivo: a, atacante: a });
      });
    }
    // gatillo "alGolpeAliado": un enemigo usó un movimiento de UN objetivo que golpea contra él o un aliado (p. ej. Dragón de la Ira de Meliodas)
    if (!ctx.contraataque && !ctx.forzado && mov.objetivo === 'enemigo' && mov.pct && objetivo && objetivo.lado !== a.lado)
      for (const d of aliadosDe(objetivo)) if (d.pasiva?.gatillo === 'alGolpeAliado') reacciones.push(() => {
        if (a.muerto || d.muerto || conControl(d)) return;        // con Control no contraataca
        pasivas(d, 'alGolpeAliado', { objetivo: a, atacante: a });
      });
    if (!ctx.forzado && !a.muerto) for (const p of enemigosDe(a)) pasivas(p, 'alUsarMovimientoEnemigo', { objetivo: a, categoria: mov.categoria });
    if (!ctx.forzado) for (const p of enemigosDe(a)) if (p.pasiva?.rival && esRival(p, a)) ganarOrgullo(p, 1);
  }

  // ================================================================ API pública
  function ejecutar(fn) {
    EV = [];
    fn();
    return { eventos: EV, esperando: S.esperando, fin: S.fin };
  }

  const crearLado = lado => (lado === 'jugador' ? equipoJugador : equipoRival).forEach((d, i) => P.push(crearPersonaje(d, lado, i)));
  if (invertido) { crearLado('rival'); crearLado('jugador'); } else { crearLado('jugador'); crearLado('rival'); }
  function prepararRival(p, r) {                             // opciones del equipo rival (dificultad de Campaña, Horda, Jefes)
    if (r.sinReliquias) p.slots = (p.slots || []).map(sl => ({ ...sl, relic: null }));
    if (r.sinLider) p.esLider = false;
    p.campana = {};
    if (r.dmgPct) p.campana.dmgPct = r.dmgPct;
    if (r.poder && r.poder !== 1) { p.campana.hpPct = r.poder - 1; p.campana.dmgPct = r.poder - 1; }
    if (r.spdPct) p.campana.spdPct = r.spdPct;
    if (r.jefe && p.pos === 0) {                             // el Jefe: más HP y una fase de furia al bajar de cierto % de HP
      p.jefe = { furia: false, umbral: r.jefe.umbral ?? .5, dmgPct: r.jefe.dmgPct ?? .25, spdPct: r.jefe.spdPct ?? .15 };
      p.campana.hpPct = (p.campana.hpPct || 0) + (r.jefe.hpExtra ?? .5);
    }
  }
  for (const p of P.filter(x => x.lado === 'rival')) prepararRival(p, opcionesRival);
  for (const p of P) if (p.pasiva?.rival) elegirRival(p, false);
  for (const p of P) { const ma = p.pasiva?.marcaAliadosQueAplican;    // al inicio: marca con bono a cada aliado (incluido él) cuyos movimientos aplican ese efecto
    if (ma) for (const x of P.filter(x => x.lado === p.lado && aplicaEnFormas(x, ma.efecto)))
      x.estados.push({ id: ma.marca, permanente: true, fuente: p.uid, bono: ma.bono }); }
  for (const p of P) { const bp = p.pasiva?.bonoPorAliadosQueAplican;     // cuenta (al inicio) los aliados cuyos movimientos aplican ese efecto
    if (bp) p.aliadosQueAplican = P.filter(x => x !== p && x.lado === p.lado && aplicaEnFormas(x, bp.efecto)).length; }
  for (const p of P) { const ej = p.pasiva?.enemigoJurado;          // enemigo jurado: se marca como Rival desde el inicio
    if (ej) for (const t of P) if (t.lado !== p.lado && t.id === ej.id) t.estados.push({ id: 'rival', fuente: p.uid, permanente: true }); }
  for (const p of P) p.hp = stats(p).hp;      // con todos creados: incluye bonos de líder al HP máx. (el líder se crea antes que su equipo)
  if (opcionesRival.barra) {                  // Jefe de Raid: su HP real es la barra compartida; stats(p).hp queda de referencia para los efectos por % de HP
    const j = P.find(x => x.lado === 'rival');
    j.barra = { total: opcionesRival.barra.total }; j.hp = opcionesRival.barra.hp;
  }

  return {
    personajes: P,
    vista,
    stats,
    get esperando() { return S.esperando; },
    get ronda() { return S.ronda; },
    // Estadísticas de cada personaje en la partida (daño real causado, escudo otorgado, curación real, daño recibido, eliminaciones)
    estadisticas: () => P.map(p => ({ uid: p.uid, id: p.id, nombre: p.nombre, lado: p.lado, muerto: p.muerto, ...p.est,
      dano: Math.round(p.est.dano), escudo: Math.round(p.est.escudo), curacion: Math.round(p.est.curacion), recibido: Math.round(p.est.recibido) })),
    iniciar: () => ejecutar(avanzar),

    // Horda: tras ganar una oleada, entra un nuevo equipo rival. Tu equipo conserva HP, muertos, efectos y cooldowns.
    siguienteOleada(equipoRival, opciones = {}) {
      if (S.fin?.ganador !== 'jugador') throw new Error('La oleada no ha terminado');
      for (let i = P.length - 1; i >= 0; i--) if (P[i].uid.startsWith('rival-')) P.splice(i, 1);   // fuera la oleada anterior
      const nuevos = equipoRival.map((d, i) => crearPersonaje(d, 'rival', i));
      P.push(...nuevos);
      for (const p of nuevos) prepararRival(p, opciones);
      for (const p of nuevos) p.hp = stats(p).hp;
      S.fin = null; S.actual = null; S.esperando = null;
      S.actuaron = new Set(P);                     // la ronda en curso se da por terminada: la oleada nueva empieza en una ronda nueva
      S.rondaBase = S.ronda;
      return ejecutar(avanzar);
    },

    // El jugador (o la IA) decide: categoría del movimiento + uid del objetivo (si aplica)
    actuar({ categoria, objetivo }) {
      return ejecutar(() => {
        const a = S.actual;
        if (!a || !S.esperando) throw new Error('No es momento de actuar');
        const mov = a.movimientos.find(m => m.categoria === categoria);
        if (!mov || !opciones(a).find(o => o.categoria === categoria)?.disponible) throw new Error('Movimiento no disponible');
        const t = objetivo ? P.find(p => p.uid === objetivo) : null;
        if ((mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && !objetivosValidos(a, mov).includes(t)) throw new Error('Objetivo no válido');
        S.esperando = null;
        if (a.ciclo) a.cicloI = (a.cicloI || 0) + 1;   // ciclo fijo de ataques (Jefe de Raid)
        ejecutarMovimiento(a, mov, t);
        // pasiva "turnoExtraSiMasRapido": si es el más rápido de TODO el campo, gana un turno extra (una vez por ronda)
        if (a.pasiva?.turnoExtraSiMasRapido && !a.muerto && a.turnoRapidoRonda !== S.ronda
            && P.filter(x => !x.muerto && x !== a).every(x => stats(x).spd < stats(a).spd)) {
          a.turnoRapidoRonda = S.ronda; a.turnosExtra = (a.turnosExtra || 0) + 1;
          emitir('turnoExtraGanado', { id: a.uid }, a);
          ganoTurnoExtra(a);
        }
        if (!a.muerto && !comprobarFin()) actuanInvocaciones(a);
        seguirTras(a);
      });
    },

    // Barra de pruebas: aplica un efecto directamente sobre un personaje (solo durante el turno del jugador)
    probar(uid, tipo) {
      return ejecutar(() => {
        const t = P.find(p => p.uid === uid);
        if (!t || t.muerto || !S.esperando) return;
        const fuente = (t.lado === 'jugador' ? vivos('rival') : vivos('jugador'))[0] || t;
        const mov = { nombre: 'Prueba', categoria: 'prueba', pct: 1, escala: 'dano', color: 0xffd0a0 };
        switch (tipo) {
          case 'hit': golpear(fuente, t, mov, {}); break;
          case 'crit': golpear(fuente, t, mov, { forzarCritico: true }); break;
          case 'block': emitir('bloqueo', { de: fuente.uid, a: t.uid }); break;
          case 'heal': curar(t, t, maxHp(t) * .2); break;
          case 'shield': darEscudo(t, t, maxHp(t) * .5, 2); break;
          case 'burn': aplicarEfecto(fuente, t, { id: 'burn', valor: .10, dur: 2 }); break;
          case 'poison': aplicarEfecto(fuente, t, { id: 'poison' }); break;
          case 'bleed': aplicarEfecto(fuente, t, { id: 'bleed' }); break;
          case 'bomb': explotarBomba(t, { valor: .2 }, false); break;
          case 'buff': aplicarEfecto(t, t, { id: 'dmgUp', valor: .25, dur: 2 }); break;
          case 'stun': aplicarEfecto(fuente, t, { id: 'stun' }); break;
          case 'freeze': aplicarEfecto(fuente, t, { id: 'freeze' }); break;
          case 'silence': aplicarEfecto(fuente, t, { id: 'silence', dur: 2 }); break;
          case 'blind': aplicarEfecto(fuente, t, { id: 'blind', dur: 2 }); break;
          case 'wear': aplicarEfecto(fuente, t, { id: 'wear' }); break;
          case 'plague': aplicarEfecto(fuente, t, { id: 'plague', dur: 2 }); break;
          case 'weaken': aplicarEfecto(fuente, t, { id: 'weaken', dur: 2 }); break;
          case 'pierce': aplicarEfecto(t, t, { id: 'pierce', dur: 2 }); break;
          case 'aoeDodge': aplicarEfecto(t, t, { id: 'aoeDodge', dur: 2 }); break;
          case 'solarBurn': aplicarEfecto(fuente, t, { id: 'solarBurn', dur: 2 }); break;
          case 'possess': aplicarEfecto(fuente, t, { id: 'possess' }); break;
          case 'confuse': aplicarEfecto(fuente, t, { id: 'confuse', dur: 2 }); break;
          case 'fear': aplicarEfecto(fuente, t, { id: 'fear', dur: 2 }); break;
          case 'cleanse': limpiar(t, t, {}); break;
          case 'tick': inicioTurno(t); break;
        }
        if (comprobarFin()) { S.esperando = null; return; }
        if (S.actual?.muerto) { S.esperando = null; terminarTurno(S.actual); avanzar(); return; }
        if (S.fin) S.esperando = null;
        else if (S.esperando) S.esperando = { id: S.esperando.id, opciones: opciones(P.find(p => p.uid === S.esperando.id)) };
      });
    },
  };
}

__e["crearCombate"] = crearCombate;
return __e; })();

__m["motor/ia.js"] = (() => { const __e: any = {};
// IA simple: elige movimiento y objetivo usando solo lo que el motor ofrece (las mismas reglas que el jugador).
const { INVOCACIONES } = __m["datos/invocaciones.js"];

// rnd: azar de la IA (por defecto Math.random; en la Arena, uno con semilla para que el servidor pueda repetir la batalla)
function elegirIA(combate, rnd = Math.random) {
  const esp = combate.esperando;
  const P = combate.personajes;
  const a = P.find(p => p.uid === esp.id);
  const por = uid => P.find(p => p.uid === uid);
  const ratio = p => p.hp / combate.stats(p).hp;
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const invocaciones = key => a.estados.filter(e => e.id === 'summon' && (!key || e.key === key)).length;

  if (a.ciclo) {                                             // ciclo fijo (Jefe de Raid): solo elige a quién golpear
    const quiere = a.ciclo[(a.cicloI || 0) % a.ciclo.length];
    const op = esp.opciones.find(o => o.categoria === quiere && o.disponible) || esp.opciones.find(o => o.disponible);
    const mov = a.movimientos.find(m => m.categoria === op.categoria);
    return { categoria: op.categoria, objetivo: mov.objetivo === 'enemigo' || mov.objetivo === 'aliado' ? pick(op.objetivos) : null };
  }

  const planes = [];
  for (const op of esp.opciones) {
    if (!op.disponible) continue;
    const mov = a.movimientos.find(m => m.categoria === op.categoria);
    const acciones = (mov.efectos || []).map(e => e.accion.tipo);
    let objetivo = null;

    if (acciones.includes('potenciarInvocaciones') && invocaciones() < 2) continue;   // Dominio: vale la pena con 2+ sombras
    const conMarca = id => P.filter(p => p.lado === a.lado && p !== a && !p.muerto && p.estados.some(e => e.id === id)).length;
    const om = (mov.efectos || []).find(e => e.accion.tipo === 'ordenarBasico')?.accion.marca;   // órdenes (p. ej. Yoda): sin aliados marcados no hace nada
    if (om && mov.objetivo !== 'aliado' && conMarca(om) < 2) continue;
    const oc = (mov.efectos || []).find(e => e.accion.tipo === 'ordenarBasico' && e.accion.soloListo)?.accion.categoria;   // ordenar un movimiento (p. ej. Jon Snow): sin aliados listos no hace nada
    if (oc && !P.some(p => p !== a && p.lado === a.lado && !p.muerto && !(p.cds[oc] > 0))) continue;
    const mc = mov.iaMinEnemigosCon;           // solo vale la pena si suficientes enemigos tienen ese efecto (p. ej. Mil Cortes Divinos); siInvocacion: solo cuenta con esa invocación activa
    if (mc && (!mc.siInvocacion || invocaciones(mc.siInvocacion))) { const en = P.filter(p => p.lado !== a.lado && !p.muerto); if (en.filter(p => p.estados.some(e => e.id === mc.efecto)).length < Math.min(mc.min, en.length)) continue; }
    if (mov.invocar) {
      const def = INVOCACIONES[mov.invocar];
      if (invocaciones(mov.invocar) >= (def.max || 1) && invocaciones() >= 3) continue;
    } else if (mov.desatar) {
      if (invocaciones(mov.desatar) < 2) continue;
    } else if (mov.objetivo === 'enemigo') {
      // pasiva "intocable" (Yoda): no recibe daño mientras viva un aliado suyo; no vale la pena golpearlo si hay otro objetivo
      const intocable = p => p.pasiva?.intocable && P.some(x => x !== p && x.lado === p.lado && !x.muerto);
      const todos = op.objetivos.map(por), utiles = todos.filter(p => !intocable(p));
      const cands = utiles.length ? utiles : todos;
      const marcas = p => p.estados.find(e => e.id === 'aguja')?.valor || 0;
      if (mov.consumeAgujas && cands.some(marcas)) objetivo = cands.reduce((x, y) => marcas(y) > marcas(x) ? y : x);   // consume marcas: al que más tenga
      else objetivo = rnd() < .4 ? cands.reduce((x, y) => ratio(x) < ratio(y) ? x : y) : pick(cands);
    } else if (mov.objetivo === 'aliado') {
      const cands = op.objetivos.map(por);
      const marca = (mov.efectos || []).find(e => e.accion.tipo === 'marcar')?.accion.marca;
      if (marca) {                         // marcar a un aliado (p. ej. Camino Jedi): al que todavía no la tenga, nunca a sí mismo
        const sin = cands.filter(p => p !== a && !p.estados.some(e => e.id === marca));
        objetivo = pick(sin.length ? sin : cands.filter(p => p !== a).length ? cands.filter(p => p !== a) : cands);
      } else if (acciones.includes('turnoExtra')) {    // regalar un turno (p. ej. Espíritu de la Fuerza): al aliado con más cooldowns por bajar
        const otros = cands.filter(p => p !== a);
        if (!otros.length) continue;
        const cd = p => Object.values(p.cds || {}).reduce((x, y) => x + (y || 0), 0);
        objetivo = otros.reduce((x, y) => cd(y) > cd(x) ? y : x);
      } else if (acciones.includes('limpiar')) {
        const con = cands.filter(p => p.estados.some(e => ['burn', 'poison', 'bleed', 'hemo', 'bomb', 'fear', 'confuse'].includes(e.id)));
        objetivo = con.length ? con.reduce((x, y) => ratio(x) < ratio(y) ? x : y) : null;
        if (!objetivo) continue;
      } else {
        const sanables = acciones.includes('curar') ? cands.filter(p => !p.estados.some(e => e.id === 'solarBurn')) : cands;   // Quemadura Solar: curarlo lo daña
        if (!sanables.length) continue;
        objetivo = sanables.reduce((x, y) => ratio(x) < ratio(y) ? x : y);
        if (acciones.includes('curar') && ratio(objetivo) > .85) continue;
      }
    } else if (mov.objetivo === 'todosAliados' && acciones.includes('curar') && !acciones.includes('efecto') && !acciones.includes('escudo')) {
      if (P.filter(p => p.lado === a.lado && !p.muerto).every(p => ratio(p) > .8)) continue;
    }
    planes.push({ categoria: op.categoria, objetivo: objetivo?.uid || null });
  }

  if (!planes.length) {                 // nada "ideal": usa el primer movimiento disponible con un objetivo válido
    const op = esp.opciones.find(o => o.disponible && (o.objetivos.length || !['enemigo', 'aliado'].includes(a.movimientos.find(m => m.categoria === o.categoria).objetivo)));
    return { categoria: op.categoria, objetivo: op.objetivos[0] || null };
  }
  const de = c => planes.find(p => p.categoria === c);
  if (de('over') && rnd() < .75) return de('over');
  if (de('especial') && rnd() < .7) return de('especial');
  return de('basico') || planes[0];
}

__e["elegirIA"] = elegirIA;
return __e; })();

__m["datos/reliquias.js"] = (() => { const __e: any = {};
// RELIQUIAS. Tres capas:
//   1) TIPOS: los 24 tipos (categoría, estadística plana posible y estadísticas porcentuales permitidas).
//   2) RANGOS: mínimo y máximo de cada estadística según la rareza (las porcentuales en puntos enteros: 8 = 8%).
//   3) RELIQUIAS: el catálogo con nombre (rareza fija por nombre). Cada copia que entra a una cuenta (sobre, recompensa,
//      receta…) sortea SUS valores dentro de los rangos en el servidor; dos copias del mismo nombre pueden ser distintas.
// Calidad = qué tan cerca del máximo quedó cada línea (promedio); ⭐ en cada tirada que salió al máximo.
// imagen: arte montado en el marco de su rareza (herramientas/marcos_reliquias.py, desde assets/originales/reliquias/).
// legado: valores fijos del equipo de ejemplo de las fichas (partida rápida, simulaciones y rivales); no se usan al sortear.

const RAREZAS = {
  'Común':      { color: '#a3acb9', orden: 0, estrellas: 0, tiradas: 0, plural: 'Comunes' },
  'Raro':       { color: '#4ade80', orden: 1, estrellas: 1, tiradas: 1, plural: 'Raras' },
  'Especial':   { color: '#60a5fa', orden: 2, estrellas: 2, tiradas: 2, plural: 'Especiales' },
  'Épico':      { color: '#c084fc', orden: 3, estrellas: 3, tiradas: 3, plural: 'Épicas' },
  'Legendario': { color: '#fbbf24', orden: 4, estrellas: 4, tiradas: 3, plural: 'Legendarias' },
};
const MAX_REPETIDAS = 2;        // máximo de tiradas que pueden caer en la misma estadística

const STAT_META = {
  hp:       { label: 'HP',            icon: '❤️' },
  spd:      { label: 'Velocidad',     icon: '⚡' },
  dmg:      { label: 'Daño',          icon: '⚔️' },
  critRate: { label: 'Prob. Crítico', icon: '✴️' },
  critDmg:  { label: 'Daño Crítico',  icon: '💥' },
  armor:    { label: 'Armadura',      icon: '🛡️' },
  acc:      { label: 'Puntería',      icon: '🎯' },
  res:      { label: 'Resistencia',   icon: '🧿' },
  block:    { label: 'Bloqueo',       icon: '✋' },
  dot:      { label: 'Daño DoT',      icon: '☠️' },
  pen:      { label: 'Penetración de escudo', icon: '🗡️' },
  hpPct:    { label: 'HP',            icon: '❤️' },
  dmgPct:   { label: 'Daño',          icon: '⚔️' },
  spdPct:   { label: 'Velocidad',     icon: '⚡' },
};
const PLANAS = ['dmg', 'hp', 'spd'];
const PORCENTUALES = ['critRate', 'critDmg', 'dot', 'pen', 'acc', 'res', 'armor', 'block', 'hpPct', 'dmgPct', 'spdPct'];

// ---------------------------------------------------------------- 1) tipos (tabla del diseñador, 2026-10-16)
// plana: si hay dos, se sortea una (Anillo, Collar). pct: porcentuales permitidas.
const T = (categoria, plana, pct) => ({ categoria, plana, pct });
const TIPOS = {
  Espada:     T('Arma', ['dmg'], ['critDmg', 'dot', 'hpPct', 'res']),
  Hacha:      T('Arma', ['dmg'], ['critRate', 'pen', 'critDmg', 'res']),
  Arco:       T('Arma', ['dmg'], ['pen', 'acc', 'critRate', 'spdPct']),
  Daga:       T('Arma', ['dmg'], ['dot', 'critRate', 'dmgPct']),
  Martillo:   T('Arma', ['hp'], ['dmgPct', 'armor', 'hpPct']),
  Mosquete:   T('Arma', ['spd'], ['critDmg', 'dmgPct', 'dot']),
  Maza:       T('Arma', ['dmg'], ['hpPct', 'dmgPct', 'block']),
  Lanza:      T('Arma', ['spd'], ['pen', 'acc', 'critDmg', 'critRate']),
  Escudo:     T('Arma', ['hp'], ['block', 'res', 'acc', 'dmgPct']),
  Pechera:    T('Equipación', ['hp'], ['armor', 'hpPct', 'res', 'block']),
  'Cinturón': T('Equipación', ['hp'], ['armor', 'block', 'critRate', 'acc']),
  Guantes:    T('Equipación', ['dmg'], ['critDmg', 'pen', 'critRate']),
  Hombreras:  T('Equipación', ['hp'], ['res', 'armor', 'critDmg']),
  Capa:       T('Equipación', ['spd'], ['dot', 'block', 'acc', 'critRate']),
  Botas:      T('Equipación', ['spd'], ['armor', 'spdPct', 'res', 'hpPct']),
  Grebas:     T('Equipación', ['hp'], ['res', 'armor', 'spdPct']),
  Yelmo:      T('Equipación', ['hp'], ['armor', 'critRate', 'acc', 'hpPct']),
  Corona:     T('Equipación', ['dmg'], ['dot', 'armor', 'acc']),
  'Máscara':  T('Equipación', ['spd'], ['dmgPct', 'hpPct', 'res']),
  Anillo:     T('Accesorio', ['dmg', 'hp'], PORCENTUALES),
  Collar:     T('Accesorio', ['dmg', 'hp'], ['spdPct', 'armor', 'acc', 'hpPct']),
  Amuleto:    T('Accesorio', ['spd'], ['res', 'critRate', 'acc', 'block']),
  Libro:      T('Accesorio', ['dmg'], ['dot', 'critRate']),
  Piedra:     T('Accesorio', ['hp'], ['hpPct', 'acc', 'dmgPct']),
};

// ---------------------------------------------------------------- 2) rangos por rareza (aprobados 2026-10-16)
// [mínimo, máximo] en pasos enteros. La Común no tiene porcentuales.
const R = (c, r, e, ep, l) => ({ 'Común': c, 'Raro': r, 'Especial': e, 'Épico': ep, 'Legendario': l });
const RANGOS = {
  dmg:      R([3, 5], [6, 10], [11, 16], [17, 24], [25, 35]),
  hp:       R([30, 50], [60, 100], [110, 160], [170, 240], [250, 350]),
  spd:      R([2, 4], [5, 8], [9, 12], [13, 17], [18, 24]),
  critRate: R(null, [3, 5], [6, 9], [10, 13], [14, 18]),
  critDmg:  R(null, [5, 8], [9, 13], [14, 19], [20, 27]),
  dot:      R(null, [4, 6], [7, 10], [11, 14], [15, 20]),
  pen:      R(null, [5, 8], [9, 13], [14, 19], [20, 27]),
  acc:      R(null, [4, 7], [8, 12], [13, 17], [18, 24]),
  res:      R(null, [4, 7], [8, 12], [13, 17], [18, 24]),
  armor:    R(null, [2, 4], [5, 7], [8, 10], [11, 14]),
  block:    R(null, [1, 2], [2, 3], [3, 5], [5, 7]),
  hpPct:    R(null, [3, 5], [6, 8], [9, 12], [13, 17]),
  dmgPct:   R(null, [3, 5], [6, 8], [9, 12], [13, 17]),
  spdPct:   R(null, [2, 3], [3, 5], [5, 7], [7, 9]),
};

// ---------------------------------------------------------------- 3) catálogo
// enSobre: sale en el sobre de reliquias (por defecto sí; Legendarias al 0.01%). soloReceta: solo se consigue crafteando.
const RELIQUIAS = {
  obsidiana: { name: 'Espada de Obsidiana', rarity: 'Raro', type: 'Espada', imagen: 'assets/reliquias/obsidiana.webp',
    legado: { flat: ['dmg', 9, 6, 10], rolls: [['critDmg', 0.08, 0.05, 0.08]] } },
  argonita: { name: 'Arco de Argonita', rarity: 'Raro', type: 'Arco', imagen: 'assets/reliquias/argonita.webp',
    legado: { flat: ['dmg', 9, 6, 10], rolls: [['acc', 0.08, 0.05, 0.09]] } },
  lanzaFuego: { name: 'Lanza de Fuego', rarity: 'Especial', type: 'Lanza', imagen: 'assets/reliquias/lanzaFuego.webp',
    legado: { flat: ['spd', 13, 10, 15], rolls: [['critDmg', 0.11, 0.07, 0.12], ['critRate', 0.12, 0.07, 0.12]] } },
  katanaCarmesi: { name: 'Katana Carmesí', rarity: 'Especial', type: 'Espada', imagen: 'assets/reliquias/katanaCarmesi.webp',
    legado: { flat: ['dmg', 14, 12, 16], rolls: [['critDmg', 0.08, 0.06, 0.11], ['critDmg', 0.11, 0.06, 0.11]] } },
  anilloLuz: { name: 'Anillo de la Luz', rarity: 'Épico', type: 'Anillo', imagen: 'assets/reliquias/anilloLuz.webp',
    legado: { flat: ['dmg', 19, 15, 22], rolls: [['block', 0.03, 0.02, 0.05], ['armor', 0.17, 0.12, 0.18], ['hpPct', 0.21, 0.15, 0.22]] } },
  amuletoPantano: { name: 'Amuleto del Pantano', rarity: 'Épico', type: 'Amuleto', imagen: 'assets/reliquias/amuletoPantano.webp',
    legado: { flat: ['dmg', 17, 15, 22], rolls: [['dot', 0.12, 0.11, 0.14], ['dot', 0.14, 0.11, 0.14], ['dot', 0.13, 0.11, 0.14]] } },
  frostmourne: { name: 'Frostmourne', rarity: 'Legendario', type: 'Espada', imagen: 'assets/reliquias/frostmourne.webp',
    passive: 'Si el portador elimina a uno o más enemigos con un ataque, revive a uno de ellos al azar como su aliado durante 2 rondas, con 30% de su HP máx. y sin habilidad de líder (una vez por ronda, máx. 2 por batalla). Al terminar vuelve a morir y ya no puede revivir. Cada golpe del portador tiene 5% de probabilidad de hacer daño triple o 25% de hacer daño doble (se multiplica con el crítico).',
    motor: { convertir: { hp: .3, rondas: 2, maxBatalla: 2 }, multiGolpe: [[.05, 3], [.25, 2]] },
    legado: { flat: ['dmg', 35, 30, 35], rolls: [['critRate', 0.19, 0.15, 0.20], ['dmgPct', 0.23, 0.18, 0.25], ['critDmg', 0.27, 0.20, 0.27]] } },
  // motor: pasiva de reliquia que el motor ejecuta (pieza universal, ver combate.js → pasivasDeReliquia)
  shadowmourne: { name: 'Shadowmourne', rarity: 'Legendario', type: 'Hacha', imagen: 'assets/reliquias/shadowmourne.webp',
    passive: 'Los ataques en área (AOE) del portador tienen +100% de Daño Crítico. Cada movimiento en área o de varios golpes que ejecuta le da 1 Alma (máx. 20): cada Alma da +15 de Daño. Duran toda la batalla.',
    motor: { critDmgAoe: 1, contador: { efecto: 'almasShadowmourne', al: ['aoe', 'multigolpe'], max: 20, bono: { dmg: 15 } } } },
  anilloTiempo: { name: 'Anillo del Tiempo', rarity: 'Legendario', type: 'Anillo', imagen: 'assets/reliquias/anilloTiempo.webp',
    passive: 'Si el portador es eliminado, revive al final de la ronda siguiente con 50% de su HP máx. (una vez por batalla). Sus movimientos tienen 40% menos de cooldown (redondeado hacia arriba), incluida la espera inicial del Over.',
    motor: { cooldownPct: .6, revivir: { hp: .5 } } },
  escudoHyliano: { name: 'Escudo Hyliano', rarity: 'Legendario', type: 'Escudo', imagen: 'assets/reliquias/escudoHyliano.webp',
    passive: 'El portador es inmune a Aturdimiento, Congelación, Posesión y Confusión (también en su versión Mega). Al final de cada ronda se cura el 60% del HP que perdió por golpes en esa ronda (hasta su HP máx.).',
    motor: { inmuneA: ['stun', 'freeze', 'possess', 'confuse'], recuperaGolpes: .6 } },
  armaduraMithril: { name: 'Armadura de Mithril', rarity: 'Legendario', type: 'Pechera', imagen: 'assets/reliquias/armaduraMithril.webp',
    passive: 'El portador tiene +50% de HP máx. Al final de cada ronda gana +5% de HP máx. más (hasta +50% extra) y también esa vida. Mientras está muerto no crece.',
    motor: { bono: { hpPct: .5 }, crece: { stat: 'hpPct', valor: .05, max: .5 } } },
  anilloCobre: { name: 'Anillo de Cobre', rarity: 'Común', type: 'Anillo', imagen: 'assets/reliquias/anilloCobre.webp',
    legado: { flat: ['spd', 4, 2, 5], rolls: [] } },
  yelmo: { name: 'Yelmo del Centinela', rarity: 'Raro', type: 'Yelmo', imagen: 'assets/reliquias/yelmo.webp',
    legado: { flat: ['hp', 60, 45, 65], rolls: [['res', 0.06, 0.04, 0.07]] } },
  pechera: { name: 'Pechera de Escamas', rarity: 'Especial', type: 'Pechera', imagen: 'assets/reliquias/pechera.webp',
    legado: { flat: ['hp', 110, 90, 120], rolls: [['armor', 0.08, 0.06, 0.10], ['block', 0.02, 0.02, 0.04]] } },
  botas: { name: 'Botas del Viento', rarity: 'Especial', type: 'Botas', imagen: 'assets/reliquias/botas.webp',
    legado: { flat: ['spd', 11, 8, 12], rolls: [['spdPct', 0.05, 0.03, 0.06], ['res', 0.07, 0.05, 0.09]] } },
  // ---------------------------------------------------------------- reliquias nuevas (fichas del diseñador; sin "legado": no van en fichas de campeones)
  furiaEscarlata: { name: 'Furia Escarlata', rarity: 'Común', type: 'Espada', imagen: 'assets/reliquias/furiaEscarlata.webp' },
  collarNiebla: { name: 'Collar de la Niebla', rarity: 'Común', type: 'Collar', imagen: 'assets/reliquias/collarNiebla.webp' },
  anilloCobalto: { name: 'Anillo de Cobalto', rarity: 'Común', type: 'Anillo', imagen: 'assets/reliquias/anilloCobalto.webp' },
  hachaGigante: { name: 'Hacha Gigante', rarity: 'Común', type: 'Hacha', imagen: 'assets/reliquias/hachaGigante.webp' },
  arcoDorado: { name: 'Arco del Dorado', rarity: 'Raro', type: 'Arco', imagen: 'assets/reliquias/arcoDorado.webp' },
  escudoMagma: { name: 'Escudo de Magma', rarity: 'Común', type: 'Escudo', imagen: 'assets/reliquias/escudoMagma.webp' },
  coronaBestias: { name: 'Corona del Rey de las Bestias', rarity: 'Común', type: 'Corona', imagen: 'assets/reliquias/coronaBestias.webp' },
  punoCastigo: { name: 'Puño del Castigo', rarity: 'Común', type: 'Guantes', imagen: 'assets/reliquias/punoCastigo.webp' },
  nichirin: { name: 'Nichirin', rarity: 'Épico', type: 'Espada', imagen: 'assets/reliquias/nichirin.webp' },
  amuletoOlvido: { name: 'Amuleto del Olvido', rarity: 'Común', type: 'Amuleto', imagen: 'assets/reliquias/amuletoOlvido.webp' },
  arcantos: { name: 'Arcantos', rarity: 'Especial', type: 'Martillo', imagen: 'assets/reliquias/arcantos.webp' },
  hombreraTigre: { name: 'Hombrera del Rey Tigre', rarity: 'Raro', type: 'Hombreras', imagen: 'assets/reliquias/hombreraTigre.webp' },
  mosqueteMilitar: { name: 'Mosquete Militar', rarity: 'Común', type: 'Mosquete', imagen: 'assets/reliquias/mosqueteMilitar.webp' },
  dagaMortifaga: { name: 'Daga Mortífaga', rarity: 'Especial', type: 'Daga', imagen: 'assets/reliquias/dagaMortifaga.webp' },
  celestia: { name: 'Celestia', rarity: 'Épico', type: 'Maza', imagen: 'assets/reliquias/celestia.webp' },
  lanzaDraconica: { name: 'Lanza Dracónica', rarity: 'Raro', type: 'Lanza', imagen: 'assets/reliquias/lanzaDraconica.webp' },
  pecheraDraconica: { name: 'Pechera Dracónica', rarity: 'Especial', type: 'Pechera', imagen: 'assets/reliquias/pecheraDraconica.webp' },
  cinturonArcano: { name: 'Cinturón Arcano', rarity: 'Épico', type: 'Cinturón', imagen: 'assets/reliquias/cinturonArcano.webp' },
  capaGuardiaReal: { name: 'Capa de Guardia Real', rarity: 'Raro', type: 'Capa', imagen: 'assets/reliquias/capaGuardiaReal.webp' },
  botasExplorador: { name: 'Botas de Explorador', rarity: 'Común', type: 'Botas', imagen: 'assets/reliquias/botasExplorador.webp' },
  grebasCazador: { name: 'Grebas de Cazador', rarity: 'Común', type: 'Grebas', imagen: 'assets/reliquias/grebasCazador.webp' },
  bestiari: { name: 'Bestiari', rarity: 'Épico', type: 'Hacha', imagen: 'assets/reliquias/bestiari.webp' },
  libroArcano: { name: 'Libro Arcano', rarity: 'Especial', type: 'Libro', imagen: 'assets/reliquias/libroArcano.webp' },
  anilloMagnetico: { name: 'Anillo Magnético', rarity: 'Común', type: 'Anillo', imagen: 'assets/reliquias/anilloMagnetico.webp' },
  yelmoNigromante: { name: 'Yelmo de Nigromante', rarity: 'Raro', type: 'Yelmo', imagen: 'assets/reliquias/yelmoNigromante.webp' },
  pecheraBestias: { name: 'Pechera de las Bestias', rarity: 'Común', type: 'Pechera', imagen: 'assets/reliquias/pecheraBestias.webp' },
  cinturonMilicia: { name: 'Cinturón de Milicia', rarity: 'Común', type: 'Cinturón', imagen: 'assets/reliquias/cinturonMilicia.webp' },
  piedraSol: { name: 'Piedra del Sol', rarity: 'Épico', type: 'Piedra', imagen: 'assets/reliquias/piedraSol.webp' },
  collarMareaAstral: { name: 'Collar de la Marea Astral', rarity: 'Raro', type: 'Collar', imagen: 'assets/reliquias/collarMareaAstral.webp' },
  mascaraDragon: { name: 'Máscara de Dragón', rarity: 'Épico', type: 'Máscara', imagen: 'assets/reliquias/mascaraDragon.webp' },
  amuletoColmilloLunar: { name: 'Amuleto del Colmillo Lunar', rarity: 'Raro', type: 'Amuleto', imagen: 'assets/reliquias/amuletoColmilloLunar.webp' },
  capaEclipse: { name: 'Capa del Eclipse', rarity: 'Épico', type: 'Capa', imagen: 'assets/reliquias/capaEclipse.webp' },
  anilloGuardianEsmeralda: { name: 'Anillo del Guardián Esmeralda', rarity: 'Raro', type: 'Anillo', imagen: 'assets/reliquias/anilloGuardianEsmeralda.webp' },
  coronaReyCaido: { name: 'Corona del Rey Caído', rarity: 'Épico', type: 'Corona', imagen: 'assets/reliquias/coronaReyCaido.webp' },
  piedraBosqueAncestral: { name: 'Piedra del Bosque Ancestral', rarity: 'Raro', type: 'Piedra', imagen: 'assets/reliquias/piedraBosqueAncestral.webp' },
  guanteletesColoso: { name: 'Guanteletes del Coloso', rarity: 'Épico', type: 'Guantes', imagen: 'assets/reliquias/guanteletesColoso.webp' },
  grimorioPlaga: { name: 'Grimorio de la Plaga', rarity: 'Raro', type: 'Libro', imagen: 'assets/reliquias/grimorioPlaga.webp' },
  botasTrueno: { name: 'Botas del Trueno', rarity: 'Épico', type: 'Botas', imagen: 'assets/reliquias/botasTrueno.webp' },
  colganteWyvern: { name: 'Colgante de Escama de Wyvern', rarity: 'Raro', type: 'Collar', imagen: 'assets/reliquias/colganteWyvern.webp' },
  amuletoOjoKraken: { name: 'Amuleto del Ojo del Kraken', rarity: 'Especial', type: 'Amuleto', imagen: 'assets/reliquias/amuletoOjoKraken.webp' },
  dagaSaqueador: { name: 'Daga del Saqueador', rarity: 'Común', type: 'Daga', imagen: 'assets/reliquias/dagaSaqueador.webp' },
  hombrerasGlaciar: { name: 'Hombreras del Glaciar', rarity: 'Especial', type: 'Hombreras', imagen: 'assets/reliquias/hombrerasGlaciar.webp' },
  arcoCazadorFurtivo: { name: 'Arco del Cazador Furtivo', rarity: 'Común', type: 'Arco', imagen: 'assets/reliquias/arcoCazadorFurtivo.webp' },
  guantesDuelista: { name: 'Guantes del Duelista', rarity: 'Raro', type: 'Guantes', imagen: 'assets/reliquias/guantesDuelista.webp' },
  martilloForjadorEnano: { name: 'Martillo del Forjador Enano', rarity: 'Raro', type: 'Martillo', imagen: 'assets/reliquias/martilloForjadorEnano.webp' },
  mascaraBandido: { name: 'Máscara del Bandido', rarity: 'Común', type: 'Máscara', imagen: 'assets/reliquias/mascaraBandido.webp' },
  mazaCarcelero: { name: 'Maza del Carcelero', rarity: 'Común', type: 'Maza', imagen: 'assets/reliquias/mazaCarcelero.webp' },
  anilloFuegoFatuo: { name: 'Anillo de Fuego Fatuo', rarity: 'Especial', type: 'Anillo', imagen: 'assets/reliquias/anilloFuegoFatuo.webp' },
  arcoVacioEstelar: { name: 'Arco del Vacío Estelar', rarity: 'Épico', type: 'Arco', imagen: 'assets/reliquias/arcoVacioEstelar.webp' },
  yelmoCaballeroAbisal: { name: 'Yelmo del Caballero Abisal', rarity: 'Especial', type: 'Yelmo', imagen: 'assets/reliquias/yelmoCaballeroAbisal.webp' },
  hachaJarlHelado: { name: 'Hacha del Jarl Helado', rarity: 'Especial', type: 'Hacha', imagen: 'assets/reliquias/hachaJarlHelado.webp' },
  pecheraGuardabosques: { name: 'Pechera del Guardabosques', rarity: 'Raro', type: 'Pechera', imagen: 'assets/reliquias/pecheraGuardabosques.webp' },
  capaPeregrino: { name: 'Capa del Peregrino', rarity: 'Común', type: 'Capa', imagen: 'assets/reliquias/capaPeregrino.webp' },
  lanzaGuardiaFronteriza: { name: 'Lanza de la Guardia Fronteriza', rarity: 'Común', type: 'Lanza', imagen: 'assets/reliquias/lanzaGuardiaFronteriza.webp' },
  dagaColmilloVibora: { name: 'Daga Colmillo de Víbora', rarity: 'Raro', type: 'Daga', imagen: 'assets/reliquias/dagaColmilloVibora.webp' },
  yelmoRecluta: { name: 'Yelmo del Recluta', rarity: 'Común', type: 'Yelmo', imagen: 'assets/reliquias/yelmoRecluta.webp' },
  botasRastreador: { name: 'Botas del Rastreador', rarity: 'Raro', type: 'Botas', imagen: 'assets/reliquias/botasRastreador.webp' },
  martilloHerreroAldea: { name: 'Martillo del Herrero de Aldea', rarity: 'Común', type: 'Martillo', imagen: 'assets/reliquias/martilloHerreroAldea.webp' },
  diarioAprendiz: { name: 'Diario del Aprendiz', rarity: 'Común', type: 'Libro', imagen: 'assets/reliquias/diarioAprendiz.webp' },
  mosqueteCorsario: { name: 'Mosquete del Corsario', rarity: 'Especial', type: 'Mosquete', imagen: 'assets/reliquias/mosqueteCorsario.webp' },
  diademaOraculo: { name: 'Diadema del Oráculo', rarity: 'Especial', type: 'Corona', imagen: 'assets/reliquias/diademaOraculo.webp' },
  hombrerasMercenario: { name: 'Hombreras del Mercenario', rarity: 'Común', type: 'Hombreras', imagen: 'assets/reliquias/hombrerasMercenario.webp' },
  lanzaValquiria: { name: 'Lanza de la Valquiria', rarity: 'Épico', type: 'Lanza', imagen: 'assets/reliquias/lanzaValquiria.webp' },
  escudoTortugaDragon: { name: 'Escudo de la Tortuga Dragón', rarity: 'Raro', type: 'Escudo', imagen: 'assets/reliquias/escudoTortugaDragon.webp' },
  rodelaRoble: { name: 'Rodela de Roble', rarity: 'Común', type: 'Escudo', imagen: 'assets/reliquias/rodelaRoble.webp' },
  cinturonGladiador: { name: 'Cinturón del Gladiador', rarity: 'Raro', type: 'Cinturón', imagen: 'assets/reliquias/cinturonGladiador.webp' },
  guantesLenador: { name: 'Guantes del Leñador', rarity: 'Común', type: 'Guantes', imagen: 'assets/reliquias/guantesLenador.webp' },
  collarCometaAzul: { name: 'Collar del Cometa Azul', rarity: 'Especial', type: 'Collar', imagen: 'assets/reliquias/collarCometaAzul.webp' },
  grebasPaladinCeleste: { name: 'Grebas del Paladín Celeste', rarity: 'Especial', type: 'Grebas', imagen: 'assets/reliquias/grebasPaladinCeleste.webp' },
  piedraRio: { name: 'Piedra de Río', rarity: 'Común', type: 'Piedra', imagen: 'assets/reliquias/piedraRio.webp' },
  egidaFaro: { name: 'Égida del Faro', rarity: 'Especial', type: 'Escudo', imagen: 'assets/reliquias/egidaFaro.webp' },
  espadaEscudero: { name: 'Espada del Escudero', rarity: 'Común', type: 'Espada', imagen: 'assets/reliquias/espadaEscudero.webp' },
  hachaBerserker: { name: 'Hacha del Berserker', rarity: 'Raro', type: 'Hacha', imagen: 'assets/reliquias/hachaBerserker.webp' },
  cotaMallaOxidada: { name: 'Cota de Malla Oxidada', rarity: 'Común', type: 'Pechera', imagen: 'assets/reliquias/cotaMallaOxidada.webp' },
  mascaraKitsune: { name: 'Máscara del Kitsune', rarity: 'Raro', type: 'Máscara', imagen: 'assets/reliquias/mascaraKitsune.webp' },
  dagaViudaNegra: { name: 'Daga de la Viuda Negra', rarity: 'Épico', type: 'Daga', imagen: 'assets/reliquias/dagaViudaNegra.webp' },
  hachaCampesino: { name: 'Hacha del Campesino', rarity: 'Común', type: 'Hacha', imagen: 'assets/reliquias/hachaCampesino.webp' },
  sandaliasMonje: { name: 'Sandalias del Monje Errante', rarity: 'Común', type: 'Botas', imagen: 'assets/reliquias/sandaliasMonje.webp' },
  mazaInquisidor: { name: 'Maza del Inquisidor', rarity: 'Especial', type: 'Maza', imagen: 'assets/reliquias/mazaInquisidor.webp' },
  capaGrifo: { name: 'Capa de Plumas de Grifo', rarity: 'Especial', type: 'Capa', imagen: 'assets/reliquias/capaGrifo.webp' },
  trabucoCazadorBrujas: { name: 'Trabuco del Cazador de Brujas', rarity: 'Raro', type: 'Mosquete', imagen: 'assets/reliquias/trabucoCazadorBrujas.webp' },
  coronaDruida: { name: 'Corona de Espinas del Druida', rarity: 'Raro', type: 'Corona', imagen: 'assets/reliquias/coronaDruida.webp' },
  collarColmillosLobo: { name: 'Collar de Colmillos de Lobo', rarity: 'Común', type: 'Collar', imagen: 'assets/reliquias/collarColmillosLobo.webp' },
  arcabuzOxidado: { name: 'Arcabuz Oxidado', rarity: 'Común', type: 'Mosquete', imagen: 'assets/reliquias/arcabuzOxidado.webp' },
  grebasCueroRemachado: { name: 'Grebas de Cuero Remachado', rarity: 'Común', type: 'Grebas', imagen: 'assets/reliquias/grebasCueroRemachado.webp' },
};
// Lotes: cada contenido de la Horda tiene su propio lote de reliquias (solo ahí caen como recompensa sus Comunes a Épicas).
// Las 100 primeras son del lote de los Orcos. Más adelante: Elfos Oscuros y Demonios, con reliquias exclusivas.
const LOTES = {
  orcos:   { nombre: 'Horda de Orcos' },
  // elfosOscuros: { nombre: 'Horda de Elfos Oscuros' },
  // demonios:     { nombre: 'Horda de Demonios' },
};
for (const [id, r] of Object.entries(RELIQUIAS)) {
  if (!LOTES[r.lote ??= 'orcos']) throw new Error(`Reliquia ${id}: lote desconocido ${r.lote}`);                                  // reliquia nueva de otro lote: poner lote: 'elfosOscuros' / 'demonios'
  if (!TIPOS[r.type]) throw new Error(`Reliquia ${id}: tipo desconocido ${r.type}`);
  r.id = id; r.category = TIPOS[r.type].categoria;
  r.enSobre ??= !r.soloReceta;
}

// ---------------------------------------------------------------- copias (instancias)
const esPct = s => PORCENTUALES.includes(s);
const rango = (stat, rareza) => RANGOS[stat]?.[rareza] || [0, 0];
// Una copia lista para el motor y la carta: datos del catálogo + flat [stat, valor, mín, máx] + rolls [[stat, valor, mín, máx]…]
// (las porcentuales en fracción: 0.08 = 8%). fila: lo que guarda el servidor { id, reliquia, plana_stat, plana_valor, tiradas, campeon, espacio }
function instancia(fila) {
  const cat = RELIQUIAS[fila.reliquia];
  if (!cat) return null;
  const linea = (stat, v) => { const [mn, mx] = rango(stat, cat.rarity); return esPct(stat) ? [stat, v / 100, mn / 100, mx / 100] : [stat, v, mn, mx]; };
  return { ...cat, uid: fila.id, campeon: fila.campeon || null, espacio: fila.espacio || null, obtenida: fila.obtenida, bloqueada: !!fila.bloqueada,
    flat: linea(fila.plana_stat, fila.plana_valor), rolls: (fila.tiradas || []).map(([s, v]) => linea(s, v)) };
}
// Copia de ejemplo de las fichas (valores fijos de "legado")
function instanciaLegado(id) {
  const cat = RELIQUIAS[id];
  return cat ? { ...cat, uid: `legado-${id}`, flat: cat.legado.flat, rolls: cat.legado.rolls } : null;
}
// Sorteo (el oficial lo hace el servidor con las mismas reglas; este sirve para pruebas): devuelve una fila como la del servidor
function sortear(id, rng = Math.random) {
  const cat = RELIQUIAS[id], tipo = TIPOS[cat.type];
  const entero = ([mn, mx]) => mn + Math.floor(rng() * (mx - mn + 1));
  const plana = tipo.plana[Math.floor(rng() * tipo.plana.length)];
  const tiradas = [];
  for (let i = 0; i < RAREZAS[cat.rarity].tiradas; i++) {
    const libres = tipo.pct.filter(s => tiradas.filter(t => t[0] === s).length < MAX_REPETIDAS);
    const s = libres[Math.floor(rng() * libres.length)];
    tiradas.push([s, entero(rango(s, cat.rarity))]);
  }
  return { reliquia: id, plana_stat: plana, plana_valor: entero(rango(plana, cat.rarity)), tiradas };
}
// Calidad 0–100: promedio de qué tan cerca del máximo quedó cada línea (plana y cada tirada)
function calidad(rel) {
  const q = [rel.flat, ...rel.rolls].map(([, v, mn, mx]) => mx === mn ? 1 : Math.max(0, Math.min(1, (v - mn) / (mx - mn))));
  return Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100 + 1e-9);   // el mismo redondeo que _calidad_reliquia en el servidor
}

// ---------------------------------------------------------------- espacios de un campeón
// Arma 1, Equipación 1, Accesorio 1 (libres) · Arma 2, Equipación 2, Accesorio 2 (se desbloquean con copias u oro, en el orden
// que elija el jugador). Con un Arco en Arma 1, el espacio Arma 2 se vuelve Equipación 3.
const ESPACIOS = [
  { id: 'arma1', label: 'Arma 1', categoria: 'Arma' }, { id: 'equip1', label: 'Equipación 1', categoria: 'Equipación' },
  { id: 'acc1', label: 'Accesorio 1', categoria: 'Accesorio' }, { id: 'arma2', label: 'Arma 2', categoria: 'Arma', extra: true },
  { id: 'equip2', label: 'Equipación 2', categoria: 'Equipación', extra: true }, { id: 'acc2', label: 'Accesorio 2', categoria: 'Accesorio', extra: true },
];
const COSTOS_ESPACIO = ['100,000', '500,000', '1,000,000'];
const deFicha = r => typeof r === 'string' ? instanciaLegado(r) : r || null;
// Equipo de ejemplo de una ficha: ids del catálogo (se usan sus valores de "legado")
function espacios(a1, e1, c1, a2 = { locked: true }, e2 = { locked: true }, c2 = { locked: true }) {
  return [
    { label: 'Arma 1', relic: deFicha(a1) }, { label: 'Equipación 1', relic: deFicha(e1) }, { label: 'Accesorio 1', relic: deFicha(c1) },
    { label: 'Arma 2', ...a2, relic: deFicha(a2.relic) }, { label: 'Equipación 2', ...e2, relic: deFicha(e2.relic) },
    { label: 'Accesorio 2', ...c2, relic: deFicha(c2.relic) },
  ];
}

// Reglas para equipar (las mismas que valida el servidor). equipo: { arma1: copia|null, … } del campeón; abiertos: ['arma2', …]
// Devuelve el motivo si NO se puede, o null si se puede.
// Espacios de batalla con lo que el jugador tiene equipado en su cuenta (equipo: { arma1: instancia, … }; abiertos: extras abiertos).
// Un campeón sin nada equipado pelea sin reliquias. Con un Arco en Arma 1, Arma 2 se vuelve Equipación 3.
function espaciosDeCuenta(equipo = {}, abiertos = []) {
  const arco = equipo.arma1?.type === 'Arco';
  return ESPACIOS.map(e => {
    const label = e.id === 'arma2' && arco ? 'Equipación 3' : e.label;
    const locked = !!e.extra && !abiertos.includes(e.id);
    return { label, locked, bow: e.id === 'arma2' && arco, relic: locked ? null : equipo[e.id] || null };
  });
}
function motivoNoEquipar(rel, espacio, { equipo = {}, abiertos = [], estrellas = 0 } = {}) {
  const e = ESPACIOS.find(x => x.id === espacio);
  if (!e) return 'Espacio desconocido';
  if (e.extra && !abiertos.includes(espacio)) return `${e.label} está bloqueado`;
  const otro = id => equipo[id] && equipo[id].uid !== rel.uid ? equipo[id] : null;
  const arcoEnArma1 = espacio === 'arma1' ? rel.type === 'Arco' : otro('arma1')?.type === 'Arco';
  const cat = espacio === 'arma2' && arcoEnArma1 ? 'Equipación' : e.categoria;
  if (rel.category !== cat) return espacio === 'arma2' && arcoEnArma1 ? 'Con un Arco, Arma 2 se vuelve Equipación 3' : `Este espacio es de ${e.categoria}`;
  if (rel.type === 'Arco' && espacio !== 'arma1') return 'El Arco solo va en Arma 1';
  if (rel.type === 'Escudo' && otro(espacio === 'arma1' ? 'arma2' : 'arma1')?.type === 'Escudo') return 'No puede llevar dos Escudos';
  if (rel.category === 'Equipación') {
    const ids = ['equip1', 'equip2', ...(arcoEnArma1 ? ['arma2'] : [])].filter(id => id !== espacio);
    if (ids.some(id => otro(id)?.type === rel.type)) return `Ya lleva otra reliquia de tipo ${rel.type}`;
  }
  const req = RAREZAS[rel.rarity].estrellas;
  if (estrellas < req) return `Necesita ${req}★ para usar reliquias ${RAREZAS[rel.rarity].plural}`;
  return null;
}

__e["COSTOS_ESPACIO"] = COSTOS_ESPACIO;
__e["ESPACIOS"] = ESPACIOS;
__e["LOTES"] = LOTES;
__e["MAX_REPETIDAS"] = MAX_REPETIDAS;
__e["PLANAS"] = PLANAS;
__e["PORCENTUALES"] = PORCENTUALES;
__e["RANGOS"] = RANGOS;
__e["RAREZAS"] = RAREZAS;
__e["RELIQUIAS"] = RELIQUIAS;
__e["STAT_META"] = STAT_META;
__e["TIPOS"] = TIPOS;
__e["calidad"] = calidad;
__e["espacios"] = espacios;
__e["espaciosDeCuenta"] = espaciosDeCuenta;
__e["instancia"] = instancia;
__e["instanciaLegado"] = instanciaLegado;
__e["motivoNoEquipar"] = motivoNoEquipar;
__e["sortear"] = sortear;
return __e; })();

__m["datos/personajes/madara-uchiha.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #1 (revisada el 2026-09-30).
__e.default = {
  id: 'madara-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Madara Uchiha',
  rol: 'Daño',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🔥', color: '#b91c1c', imagen: 'assets/personajes/madara-uchiha.webp?v=2',
  base: { hp: 750, dmg: 75, spd: 110 },
  extra: {},                                   // secundarias por encima de la base común
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Gakido',
    desc: 'Reduce un 15% el daño DoT que reciben los aliados.',
    reduccion: { categoria: 'dot', pct: .15 },
  },
  pasiva: {
    nombre: 'Tsukuyomi Infinito',
    desc: 'Cada vez que acierta un golpe crítico, causa un 20% de ese daño a 3 enemigos al azar (pueden repetir). Es daño por efecto.',
    gatillo: 'alAcertarCritico',
    accion: { tipo: 'danoEfecto', fraccion: .20, a: { azar: 3 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Katon: Ryūen Hōka', objetivo: 'enemigo', estilo: 'ranged', color: 0xff5a1a,
      pct: 1.6, escala: 'dano', cd: 0,
      desc: 'Causa 160% del Daño. Si el objetivo tiene Quemadura, los demás enemigos reciben daño por efecto igual al 50% de esa Quemadura (sobre su HP máx.).',
      efectos: [{ cuando: 'objetivo', condicion: { objetivoTiene: 'burn' },
        accion: { tipo: 'replicarDoT', efecto: 'burn', factor: .5, a: 'otrosEnemigos' } }],
    },
    {
      categoria: 'especial', nombre: 'Susanoo', objetivo: 'enemigo', estilo: 'melee', color: 0x8b5cf6,
      pct: 2.65, escala: 'dano', cd: 2,
      desc: 'Causa 265% del Daño. Si acierta un crítico, roba el 5% del HP máx. de todos los enemigos.',
      efectos: [{ cuando: 'critico', accion: { tipo: 'robarHP', pct: .05, a: 'todosEnemigos' } }],
    },
    {
      categoria: 'over', nombre: 'Chibaku Tensei', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x9ca3af,
      pct: 2.25, escala: 'dano', cd: 4,
      bonoPorSobreviviente: .05,
      desc: 'Causa 225% del Daño a todos los enemigos. Por cada enemigo que sobreviva, este ataque gana +5% de daño (permanente). 75% de probabilidad de aplicar Miedo (2 rondas) a cada sobreviviente.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .75, a: 'sobrevivientes' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/rengoku.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #2 (revisada el 2026-10-01).
__e.default = {
  id: 'rengoku',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'fuego'],   // campaña: temas de las etapas
  nombre: 'Rengoku',
  rol: 'Tanque', rolSecundario: 'DoTer',
  sobres: [],  // sin sobre temático todavía: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🔥', color: '#f97316', imagen: 'assets/personajes/rengoku.webp',
  base: { hp: 820, dmg: 55, spd: 93 },
  extra: { armor: .20, res: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Respiración de la Llama',
    desc: 'Cada vez que su equipo acierta una Quemadura sobre un enemigo, un aliado al azar gana +3% de Armadura permanente (no se puede disipar).',
    alAplicar: { efecto: 'burn', stat: 'armor', valor: .03 },
  },
  pasiva: {
    nombre: 'Pilar de la Llama',
    desc: 'Cada vez que una Quemadura hace daño a un enemigo, Rengoku se cura 2% de su HP máx. (máximo 3 veces por ronda).',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'curar', pct: .02, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Sol Ascendente', objetivo: 'enemigo', estilo: 'melee', color: 0xff7a2a,
      pct: 1.9, escala: 'hp', cd: 0,
      desc: 'Causa 190% (escala por HP). 30% de probabilidad de aplicar Quemadura 5% (2 rondas). Rengoku gana Provocación (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .30 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Tigre de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff5a1a,
      pct: 1.6, escala: 'hp', cd: 2,
      desc: 'Causa 160% (escala por HP) a todos los enemigos. Si golpea al menos a un enemigo con Quemadura, Rengoku gana un Escudo del 200% de su HP máx. (2 rondas).',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'escudo', pct: 2.00, escala: 'hpMax', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Purgatorio', objetivo: 'enemigo', estilo: 'melee', color: 0xffb347,
      pct: 5.2, escala: 'hp', cd: 5,
      desc: 'Causa 520% (escala por HP). Propaga la Quemadura del objetivo (mismo valor y duración) a los demás enemigos, aunque el objetivo muera.',
      efectos: [{ cuando: 'final', accion: { tipo: 'propagar', efecto: 'burn', a: 'otrosEnemigos' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/alexstrasza.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #3 (revisada el 2026-10-01). Incluye su transformación "Dragón de la Vida".
const dragonDeLaVida = {
  nombre: 'Dragón de la Vida',
  emoji: '🐉', color: '#dc2626', imagen: 'assets/transformaciones/dragon-de-la-vida.webp',
  base: { hp: 650, dmg: 55, spd: 95 },
  extra: { armor: .25, res: .25 },                 // parte fija de "Aspecto Carmesí"
  pasiva: {
    nombre: 'Aspecto Carmesí',
    desc: '+25% de Armadura y Resistencia. Cada vez que un aliado recibe una curación, tiene 50% de probabilidad de aplicar Quemadura 5% (2 rondas) a un enemigo al azar.',
    gatillo: 'alCurarAliado',
    accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .50, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Aliento de Dragón', objetivo: 'todosAliados', estilo: 'support', color: 0xff6a3d, cd: 0,
      desc: 'Cura a todos los aliados 11% de su HP máx. y les aplica Aura de Fuego (2 rondas).',
      efectos: [
        { accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .11 } },
        { accion: { tipo: 'efecto', id: 'fireAura', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Vuelo del Aspecto Rojo', objetivo: 'todosAliados', estilo: 'support', color: 0xe0f7ff, cd: 3,
      desc: 'Limpia 1 debuff de cada aliado.',
      efectos: [{ accion: { tipo: 'limpiar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Furia de Alexstrasza', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff3d00, cd: 2,
      desc: 'Activa al instante el daño de las Quemaduras de todos los enemigos (cuenta como daño DoT) y les suma +1 ronda de duración.',
      efectos: [
        { accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { accion: { tipo: 'extenderDuracion', efecto: 'burn', rondas: 1 } },
      ],
    },
  ],
};

__e.default = {
  id: 'alexstrasza',
  franquicia: 'Warcraft', grupos: ['dragones', 'aspectos'],   // campaña: temas de las etapas
  nombre: 'Alexstrasza',
  rol: 'Support', rolSecundario: 'DoTer',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🌹', color: '#e11d48', imagen: 'assets/personajes/alexstrasza.webp',
  base: { hp: 650, dmg: 55, spd: 95 },
  extra: { res: .15, armor: .10 },
  slots: espacios('argonita', 'yelmo', 'anilloCobre', { label: 'Equipación 3', relic: null, bow: true }),

  pasiva: {
    nombre: 'Aspecto de la Vida',
    desc: 'Cada vez que un aliado (que no sea ella) recibe una curación, Alexstrasza se cura el 50% de esa curación.',
    gatillo: 'alCurarAliado',
    accion: { tipo: 'curar', base: 'curacion', pct: .50, a: 'propio' },
  },
  transformacion: dragonDeLaVida,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fuego Vital', objetivo: 'aliado', estilo: 'support', color: 0xff8a5c, cd: 0,
      desc: 'Cura al aliado 22% de su HP máx. y le aplica Aura de Fuego (2 rondas): quien lo golpee recibe Quemadura 5% (1 turno).',
      efectos: [
        { accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .22 } },
        { accion: { tipo: 'efecto', id: 'fireAura', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Llama Preservadora', objetivo: 'todosAliados', estilo: 'support', color: 0xfb923c, cd: 3,
      desc: 'Los aliados ganan +5% de HP máx. permanente por cada enemigo con Quemadura (el HP actual sube lo mismo).',
      efectos: [{ cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .05, por: 'quemadurasEnemigas', a: 'todosAliados' } }],
    },
    {
      categoria: 'over', nombre: 'Dragón de la Vida', objetivo: 'propio', estilo: 'support', color: 0xdc2626, cd: 5,
      desc: 'Se transforma en el Dragón de la Vida (3 turnos). 80% de probabilidad de aplicar Quemadura 10% (3 rondas) a cada enemigo y cura a todos los aliados 22% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', turnos: 3, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 3, prob: .80, a: 'todosEnemigos' } },
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .22, a: 'todosAliados' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/sun-jin-woo.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #4 (diseñada el 2026-10-01). Invocador de sombras: ver INVOCACIONES y TABLAS_INVOCACION.sombras.
__e.default = {
  id: 'sun-jin-woo',
  franquicia: 'Solo Leveling', grupos: ['cazadores', 'monarcas', 'sombras'],   // campaña: temas de las etapas
  nombre: 'Sun Jin Woo',
  rol: 'Daño', rolSecundario: 'Invocador',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌑', color: '#8b5cf6', imagen: 'assets/personajes/sun-jin-woo.webp',
  base: { hp: 600, dmg: 88, spd: 122 },
  extra: {},
  slots: espacios('katanaCarmesi', 'botas', 'anilloCobre'),

  pasiva: {
    nombre: 'Extracción de las Sombras',
    desc: 'Cada vez que Sun Jin Woo o sus sombras eliminan a un enemigo, invoca una sombra Épica o Legendaria al azar. Es inmune a Veneno. Enemigo jurado de Antares: le hace +20% de daño.',
    gatillo: 'alEliminar',
    inmuneA: ['poison'],
    enemigoJurado: { id: 'antares', bono: .20 },   // Antares, el Monarca de la Destrucción: +20% de daño contra él (y él contra Sun Jin Woo)
    accion: { tipo: 'invocarAzar', tabla: 'sombras', rarezas: ['Épico', 'Legendario'], a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Daga del Monarca', objetivo: 'enemigo', estilo: 'melee', color: 0xc4b5fd,
      pct: .47, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 cortes de 47% con las Dagas del Monarca a un enemigo.',
    },
    {
      categoria: 'especial', nombre: '¡Arise!', objetivo: 'propio', estilo: 'support', color: 0x8b5cf6, cd: 2,
      desc: 'Invoca 3 sombras al azar (Común: Iron, Igris · Raro: Shadow Ming Byung, Kaisel · Épico: Beru, Tusk, Bellion · Legendario: Kamish). Máximo 3 a la vez.',
      efectos: [1, 2, 3].map(() => ({ cuando: 'final', accion: { tipo: 'invocarAzar', tabla: 'sombras', a: 'propio' } })),
    },
    {
      categoria: 'over', nombre: 'Dominio del Monarca', objetivo: 'propio', estilo: 'support', color: 0x6d28d9, cd: 3,
      desc: 'Todas sus sombras actúan 2 veces de inmediato y renuevan su duración.',
      efectos: [{ cuando: 'final', accion: { tipo: 'potenciarInvocaciones', veces: 2, renovar: true, a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/shaka.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #5 (revisada el 2026-10-01). Tanque de escudos: todo escala con su HP.
__e.default = {
  id: 'shaka',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro'],   // campaña: temas de las etapas
  nombre: 'Shaka',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🪷', color: '#facc15', imagen: 'assets/personajes/shaka.webp',
  base: { hp: 830, dmg: 55, spd: 93 },
  extra: { armor: .25, res: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Reencarnación de Buda',
    desc: 'Al inicio de cada ronda, da un Escudo del 50% del HP máx. de Shaka (1 ronda) al aliado con menor % de HP.',
    alIniciarRonda: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
  },
  pasiva: {
    nombre: 'Sangre de Atena',
    desc: 'Cada vez que Shaka o un aliado pierde Escudo, ese aliado se cura un 5% del HP máx. de Shaka (máximo 3 veces por ronda).',
    gatillo: 'alPerderEscudo', maxPorRonda: 3, soloSiCura: true,
    accion: { tipo: 'curar', pct: .05, escala: 'hpMax', a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kahn', objetivo: 'propio', estilo: 'support', color: 0xfde68a, cd: 0,
      desc: 'Shaka se cura 12% de su HP máx. y da Protección (+30% Resistencia) o Regeneración (cura 10% HP máx.) por 1 ronda a 2 aliados al azar (puede incluirse y repetir).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .12, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', idAzar: ['protect', 'regen'], dur: 1, a: { aliadosAzar: 2 } } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Ohm', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: '3 aliados al azar (pueden repetirse) reciben un Escudo del 50% del HP máx. de Shaka (1 ronda) y Furia (+50% Daño, 2 rondas).',
      efectos: [{ cuando: 'final', accion: { tipo: 'multiple', a: { aliadosAzar: 3 }, acciones: [
        { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1 },
        { tipo: 'efecto', id: 'dmgUp', dur: 2 },
      ] } }],
    },
    {
      categoria: 'over', nombre: 'Tesoro del Cielo', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 6.8, escala: 'hp', cd: 5,
      desc: 'Causa 680% (escala por HP). Luego reparte al azar entre los enemigos daño por efecto igual al 20% de la suma de los Escudos de su equipo.',
      efectos: [{ cuando: 'final', accion: { tipo: 'danoRepartido', base: 'escudosEquipo', pct: .20, paquetes: 10, a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/goku.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #6 (revisada el 2026-10-01). Dos transformaciones PERMANENTES encadenadas:
// Goku -> Goku Super Sayajin -> Goku Super Sayajin 3. Cada forma trae sus propias estadísticas base;
// "extra" = diferencia contra la base común (Prob. Crítico 5%, Resistencia 50%, Penetración de escudo 0%, Armadura 0%).

const sangreSayajin = {
  nombre: 'Sangre Sayajin',
  desc: 'Cada vez que Goku se transforma gana 1 turno adicional y recibe uno de estos buffs al azar (que no tenga activo) por 2 rondas: Furia, Frenesí, Celeridad, Letalidad o Agudeza.',
  gatillo: 'alTransformarse',
  accion: { tipo: 'multiple', a: 'propio', acciones: [
    { tipo: 'turnoExtra' },
    { tipo: 'efecto', idAzar: ['dmgUp', 'frenzy', 'haste', 'bloodlust', 'keen'], sinRepetir: true, dur: 2 },
  ] },
};

const gokuSuperSayajin3 = {
  nombre: 'Goku Super Sayajin 3',
  emoji: '⚡', color: '#fbbf24', imagen: 'assets/transformaciones/goku-super-sayajin-3.webp',
  base: { hp: 680, dmg: 106, spd: 115 },
  extra: { critRate: .15, res: .20, pen: .20, armor: .20 },   // armor .20 = bono de "Super Saiyajin 3" (reemplaza al +10%)
  pasiva: {
    nombre: 'Leyenda Sayajin',
    desc: 'Todos sus golpes le roban HP equivalente al 5% del daño causado (incluye el daño absorbido por escudos).',
    roboVida: .05,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Super Kamehameha', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.10, escala: 'dano', cd: 0, critExtra: .15,
      desc: 'Causa 110% a todos los enemigos. +15% de Prob. Crítico en este ataque.',
    },
    {
      categoria: 'especial', nombre: 'Golpe del Dragón', objetivo: 'enemigo', estilo: 'melee', color: 0xfbbf24,
      pct: 3.20, escala: 'dano', cd: 3, bonoPorHpPerdido: { cada: .10, pct: .10 },
      desc: 'Causa 320%. +10% de daño por cada 10% de HP que le falte a Goku.',
    },
    {
      categoria: 'over', nombre: 'Genkidama', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: 2.55, escala: 'dano', cd: 5, ignoraArmadura: 1, criticoSiHpMin: .80,
      desc: 'Causa 255% a todos los enemigos e ignora el 100% de su Armadura. Contra objetivos con 80% o más de su HP máx. siempre es crítico.',
    },
  ],
};

const gokuSuperSayajin = {
  nombre: 'Goku Super Sayajin',
  emoji: '⚡', color: '#facc15', imagen: 'assets/transformaciones/goku-super-sayajin.webp',
  base: { hp: 630, dmg: 95, spd: 124 },
  extra: { critRate: .05, res: .10, pen: .10, armor: .10 },   // armor .10 = bono de "Super Saiyajin"
  pasiva: sangreSayajin,
  transformacion: gokuSuperSayajin3,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kamehameha x10', objetivo: 'enemigo', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.60, escala: 'dano', cd: 0, critExtra: .10,
      desc: 'Causa 160%. +10% de Prob. Crítico en este ataque.',
    },
    {
      categoria: 'especial', nombre: 'Teletransportación', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xfde047,
      pct: 2.40, escala: 'dano', cd: 2,
      desc: '3 golpes de 240% a enemigos al azar (pueden repetirse). Cada golpe crítico le da +5% de Daño Crítico permanente.',
      efectos: [{ cuando: 'critico', accion: { tipo: 'bonoPermanente', stat: 'critDmg', pct: .05, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Super Saiyajin 3', objetivo: 'propio', estilo: 'support', color: 0xfbbf24, cd: 3,
      desc: 'Transformación permanente en Goku Super Sayajin 3. Su bono de Armadura pasa a +20%.',
      efectos: [{ cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } }],
    },
  ],
};

__e.default = {
  id: 'goku',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: temas de las etapas
  nombre: 'Goku',
  rol: 'Daño', rolSecundario: '',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🥋', color: '#f97316', imagen: 'assets/personajes/goku.webp',
  base: { hp: 600, dmg: 90, spd: 122 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: sangreSayajin,
  transformacion: gokuSuperSayajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de Ki', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: 1.50, escala: 'dano', cd: 0, ignoraArmadura: .10,
      desc: 'Causa 150%. Ignora 10 puntos de la Armadura del enemigo.',
    },
    {
      categoria: 'especial', nombre: 'Kamehameha', objetivo: 'enemigo', estilo: 'ranged', color: 0x60a5fa,
      pct: 2.10, escala: 'dano', cd: 2,
      desc: 'Causa 210% con 40% de probabilidad de aplicar Debilitar (recibe +50% de daño) por 2 rondas.',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Super Saiyajin', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Transformación permanente en Goku Super Sayajin. Goku gana +10% de Armadura.',
      efectos: [{ cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/daenerys-targaryen.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #7 (revisada el 2026-10-01). Invoca un dragón al azar al inicio de cada turno (Drogon, Rhaegal, Viserion).
__e.default = {
  id: 'daenerys-targaryen',
  franquicia: 'Game of Thrones', grupos: ['targaryen', 'dragones', 'reyes'],   // campaña: temas de las etapas
  nombre: 'Daenerys Targaryen',
  rol: 'Invoker', rolSecundario: 'DoTer',
  sobres: [],  // sin sobre temático todavía: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐉', color: '#b91c1c', imagen: 'assets/personajes/daenerys-targaryen.webp',
  base: { hp: 600, dmg: 60, spd: 88 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Dinastía Targaryen',
    desc: 'Por cada enemigo con Quemadura activa, todo el equipo gana +4% de Puntería.',
    bonoPorEfecto: { efecto: 'burn', stat: 'acc', valor: .04 },
  },
  pasiva: {
    nombre: 'Madre de Dragones',
    desc: 'Inmune a Quemadura. Al inicio de su turno invoca un dragón al azar (Rhaegal 40%, Viserion 35%, Drogon 25%); si ya lo tenía activo, lo renueva. Si pierde el turno, no invoca.',
    inmuneA: ['burn'],
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'invocarAzar', tabla: 'dragones', renueva: true, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rueda de la Opresión', objetivo: 'enemigo', estilo: 'ranged', color: 0xf97316,
      pct: 2.00, escala: 'dano', cd: 0,
      desc: 'Causa 200%. Si golpea a un objetivo con Quemadura, Daenerys gana Sigilo (2 rondas): no la pueden elegir con ataques de un objetivo; se rompe al recibir daño.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Locura Targaryen', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: 1.7, escala: 'dano', cd: 3,
      desc: 'Causa 170% a todos los enemigos. Sus invocaciones activas ganan +1 turno de duración.',
      efectos: [{ cuando: 'final', accion: { tipo: 'extenderInvocaciones', turnos: 1, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Dracarys', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff3d00,
      pct: 2.00, escala: 'dano', cd: 7,
      desc: 'Causa 200% a todos los enemigos con 80% de probabilidad de aplicar Quemadura 10% (3 rondas) a cada uno. Si tiene sus 3 dragones activos, cada dragón actúa de inmediato.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 3, prob: .80 } },
        { cuando: 'final', condicion: { invocacionesMin: 3 }, accion: { tipo: 'potenciarInvocaciones', potencia: 1, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/batman.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #8 (revisada el 2026-10-01). Control: aturde con su Básico y castiga a los enemigos que usan Especial u Over.
__e.default = {
  id: 'batman',
  franquicia: 'DC', grupos: ['justicieros'],   // campaña: temas de las etapas
  nombre: 'Batman',
  rol: 'Control', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦇', color: '#334155', imagen: 'assets/personajes/batman.webp',
  base: { hp: 660, dmg: 60, spd: 100 },
  extra: { acc: .25, armor: .05 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Protocolo de la Liga',
    desc: 'Al inicio de cada ronda, un aliado al azar que no tenga Esquiva Área la recibe (2 rondas): no lo alcanzan los movimientos de área enemigos, ni su daño ni sus efectos.',
    alIniciarRonda: { tipo: 'efecto', id: 'aoeDodge', dur: 2, a: { aliadoAzarSin: 'aoeDodge' } },
  },
  pasiva: {
    nombre: 'Análisis de Puntos Débiles',
    desc: 'Cada vez que un enemigo usa su Especial o su Over, tiene 50% de probabilidad de aplicarle al azar uno de estos debuffs que no tenga: Debilitar, Ceguera, Desgaste, Silenciar, Peste o Congelación (2 rondas; tirada de Puntería).',
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['especial', 'over'] },
    accion: { tipo: 'efecto', idAzar: ['weaken', 'blind', 'wear', 'silence', 'plague', 'freeze'], sinRepetir: true, dur: 2, prob: .50, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Batarang', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: 2.15, escala: 'dano', cd: 0,
      desc: 'Causa 215%. Si el objetivo tiene su Over listo para usar, tiene 20% de probabilidad de Aturdirlo.',
      efectos: [{ condicion: { objetivoOverListo: true }, accion: { tipo: 'efecto', id: 'stun', prob: .20 } }],
    },
    {
      categoria: 'especial', nombre: 'Tácticas de las Sombras', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: 'Batman y 1 aliado al azar ganan Agudeza (+50% Puntería, 2 rondas). 40% de probabilidad de aplicar Quemadura Solar (2 rondas) a cada enemigo.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'keen', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'keen', dur: 2, a: { otrosAliadosAzar: 1 } } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .40, a: 'todosEnemigos' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Plan de Contingencia', objetivo: 'propio', estilo: 'support', color: 0x64748b, cd: 5,
      desc: 'Limpia todos los debuffs de los aliados, reinicia el cooldown del Especial de sus aliados y les baja 1 el del Over (no los suyos). Por cada debuff limpiado golpea 30% (escala por HP) a un enemigo al azar.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'reiniciarCooldowns', categorias: ['especial'], a: 'otrosAliados' } },
        { cuando: 'final', accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['over'], a: 'otrosAliados' } },
        { cuando: 'final', accion: { tipo: 'golpesPorConteo', conteo: 'limpiados', nombre: 'Plan de Contingencia', pct: .30, escala: 'hp', color: 0x94a3b8, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/the-joker.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #9 (revisada el 2026-10-02). Envenena a todo el equipo enemigo, lo controla con su pasiva
// y detona todos los venenos con su Over.
__e.default = {
  id: 'the-joker',
  franquicia: 'DC', grupos: ['villanos-de-gotham'],   // campaña: temas de las etapas
  nombre: 'The Joker',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🃏', color: '#7c3aed', imagen: 'assets/personajes/the-joker.webp',
  base: { hp: 600, dmg: 55, spd: 92 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'Anarquía y Caos',
    desc: 'Hasta 2 veces por ronda: cuando un enemigo recibe daño de Veneno, tiene 40% de probabilidad de aplicar Aturdimiento o Confusión (1 ronda), al azar, a un enemigo al azar (tirada de Puntería).',
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'efecto', idAzar: ['stun', 'confuse'], dur: 1, prob: .40, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Naipes Impregnados', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 2.5, escala: 'dano', cd: 0,
      desc: 'Causa 250% y tiene 30% de probabilidad de aplicar Veneno. Si el objetivo tenía más HP actual que The Joker, intenta 2 Venenos más (30% cada uno), cada uno a un enemigo al azar (pueden caer en el mismo).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .30 } },
        { condicion: { objetivoMasHpQueYo: true }, accion: { tipo: 'efecto', id: 'poison', prob: .30, a: { azar: 2 } } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Detonador del Caos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.9, escala: 'dano', cd: 3,
      desc: 'Causa 190% a todos los enemigos con 60% de probabilidad de aplicar Veneno a cada uno. Luego tiene 30% de probabilidad de aplicar Mega Aturdimiento a un enemigo al azar con 3 o más acumulaciones de Veneno.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .30, a: { azarCon: { efecto: 'poison', min: 3 } } } },
      ],
    },
    {
      categoria: 'over', nombre: '¿Por qué tan serio?', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xa3e635,
      pct: 1.9, escala: 'vel', cd: 5,
      desc: '3 golpes de 190% (escala por Velocidad) a enemigos al azar. Cada golpe que acierta a un enemigo con Veneno hace que todos los Venenos de todos los enemigos hagan su daño al instante (sin gastarse).',
      efectos: [{ condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'activarDoT', efecto: 'poison', a: 'todosEnemigos' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/reptile.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #10 (propuesta y aprobada el 2026-10-02). Ácido (Veneno + Desgaste), invisibilidad (Sigilo) y remate.
// Funciona en equipos de veneno (bonos por Veneno, ayuda a The Joker a llegar a 3 acumulaciones) y fuera de ellos
// (Desgaste y Debilitar sirven a cualquier equipo de daño). Sin habilidad de líder: no es líder en su historia.
__e.default = {
  id: 'reptile',
  franquicia: 'Mortal Kombat', grupos: ['outworld'],   // campaña: temas de las etapas
  nombre: 'Reptile',
  rol: 'Asesino', rolSecundario: 'DoTer',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦎', color: '#65a30d', imagen: 'assets/personajes/reptile.webp',
  base: { hp: 560, dmg: 80, spd: 125 },
  extra: { critRate: .15, acc: .25 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre Saurian',
    desc: 'Inmune a Veneno. Sus golpes a enemigos con Veneno hacen +40% de daño. Cada vez que golpea a un enemigo con Veneno, gana Sigilo (2 rondas).',
    inmuneA: ['poison'],
    bonoContra: { efecto: 'poison', pct: .40 },
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'poison' },
    accion: { tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Escupitajo Ácido', objetivo: 'enemigo', estilo: 'ranged', color: 0x84cc16,
      pct: 2.05, escala: 'dano', cd: 0,
      desc: 'Causa 205% con 50% de probabilidad de aplicar Veneno. Si el objetivo ya tenía Veneno, también tiene 20% de probabilidad de aplicar Desgaste.',
      efectos: [
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'efecto', id: 'wear', prob: .20 } },   // se revisa ANTES de poner el nuevo Veneno
        { accion: { tipo: 'efecto', id: 'poison', prob: .50 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Bola de Fuerza', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 2.95, escala: 'dano', cd: 3,
      desc: 'Causa 295% con 40% de probabilidad de aplicar Debilitar (recibe +50% de daño) por 2 rondas. Si el objetivo ya tenía algún debuff, propaga uno de ellos al azar a otro enemigo al azar (misma intensidad y duración restante; tirada de Puntería).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .40 } },
        { cuando: 'final', accion: { tipo: 'propagar', efecto: 'azar', a: 'otroEnemigoAzar' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Fatality: Lengua Ácida', objetivo: 'enemigo', estilo: 'melee', color: 0xa3e635,
      pct: 4.5, escala: 'dano', cd: 5, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 450%, +15% por cada acumulación de Veneno del objetivo (máx. +75%). Si elimina al objetivo, Reptile gana 1 turno extra.',
      efectos: [{ cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'turnoExtra', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/sub-zero.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #11 (revisada el 2026-10-04). Control con Congelación: congela, rompe Armadura de los congelados y
// castiga a los enemigos cuando sus aliados les rompen el hielo. Líder: Gran Maestro del Lin Kuei.
__e.default = {
  id: 'sub-zero',
  franquicia: 'Mortal Kombat', grupos: ['lin-kuei', 'hielo'],   // campaña: temas de las etapas
  nombre: 'Sub-Zero',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático todavía: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🥶', color: '#38bdf8', imagen: 'assets/personajes/sub-zero.webp',
  base: { hp: 680, dmg: 62, spd: 98 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Manto del Lin Kuei',
    desc: 'Los aliados ganan +15% de Prob. Crítico y +15% de Daño Crítico al golpear a un enemigo con Congelación o Mega Congelación.',
    bonoCriticoContra: { efecto: 'freeze', critRate: .15, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Absolute Zero',
    desc: 'Hasta 2 veces por ronda: cada vez que un golpe rompe una capa de Congelación o Mega Congelación de un enemigo, Sub-Zero ejecuta Ice Blast sobre un enemigo al azar.',
    gatillo: 'alRomperCapa', maxPorRonda: 2,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ice Blast', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0x7dd3fc,
      pct: .51, escala: 'dano', cd: 0,
      desc: 'Golpea 2 veces (51% cada golpe) a un enemigo. Cada golpe tiene 15% de probabilidad de aplicar Congelación. Contra enemigos con Congelación ignora 25 puntos de Armadura.',
      ignoraArmaduraSi: { efecto: 'freeze', puntos: .25 },
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .15 } }],
    },
    {
      categoria: 'especial', nombre: 'Ice Burst', objetivo: 'enemigo', estilo: 'ranged', color: 0x38bdf8,
      pct: 1.75, escala: 'dano', cd: 2,
      desc: 'Causa 175% con 50% de probabilidad de aplicar Congelación y roba 5% del HP máx. del objetivo. Sub-Zero gana Perforación y Celeridad (2 rondas). Contra enemigos con Congelación ignora 50 puntos de Armadura.',
      ignoraArmaduraSi: { efecto: 'freeze', puntos: .50 },
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .50 } },
        { accion: { tipo: 'robarHP', pct: .05 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'pierce', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Deep Freeze', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 1.65, escala: 'dano', cd: 5,
      desc: 'Causa 165% a todos los enemigos con 75% de probabilidad de aplicar Congelación (100% contra los más rápidos que Sub-Zero). +50% de Prob. Crítico contra los que ya tenían Congelación antes del ataque.',
      critExtraSi: { teniaAntes: 'freeze', pct: .50 },
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .75, probSiMasRapido: 1 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/scorpion.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #12 (revisada el 2026-10-04). Daño con fuego: contraataca y roba vida a los quemados, castiga a los
// equipos quemados con Spear y deja una Quemadura fuerte con su Fatality. Líder: Gran Maestro del Shirai Ryu.
__e.default = {
  id: 'scorpion',
  franquicia: 'Mortal Kombat', grupos: ['espectros', 'fuego'],   // campaña: temas de las etapas
  nombre: 'Scorpion',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦂', color: '#f59e0b', imagen: 'assets/personajes/scorpion.webp',
  base: { hp: 720, dmg: 72, spd: 105 },
  extra: { armor: .10, critRate: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Gran Maestro Shirai Ryu',
    desc: 'Los aliados ganan +15% de Daño. Cada vez que un enemigo recibe daño de Quemadura, todos los aliados ganan +2% de Daño Crítico (sin tope; se pierde si Scorpion muere).',
    bonoDano: .15,
    acumulaPorDoT: { tipo: 'burn', stat: 'critDmg', valor: .02 },
  },
  pasiva: {
    nombre: 'Llamas Devoradoras',
    desc: 'Hasta 3 veces por ronda: cuando un enemigo con Quemadura lo ataca, Scorpion contraataca con su Básico (un contraataque no provoca otro). Cada vez que ataca a un enemigo con Quemadura, le roba 5% de su HP máx.',
    gatillo: 'alSerAtacado', filtro: { atacanteTiene: 'burn' }, maxPorRonda: 3,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', contraataque: true, a: 'atacante' },
    roboSiObjetivoTiene: { efecto: 'burn', pct: .05 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Venganza Eterna', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: 1.45, escala: 'dano', cd: 0,
      desc: 'Causa 145%. Si es crítico, golpea una vez más (si el objetivo murió, a un enemigo al azar).',
      golpeExtraSiCritico: true,
    },
    {
      categoria: 'especial', nombre: 'Spear', objetivo: 'enemigo', estilo: 'ranged', color: 0xfbbf24,
      pct: 2.7, escala: 'dano', cd: 3,
      desc: 'Causa 270% con 50% de probabilidad de aplicar Incitar (1 ronda). Además causa daño por efecto igual al 2% del HP máx. de cada enemigo con Quemadura.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'incite', dur: 1, prob: .50 } },
        { accion: { tipo: 'danoSegunEnemigos', efecto: 'burn', pct: .02 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Fatality: Cráneo Incendiario', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 4.4, escala: 'dano', cd: 4,
      desc: 'Causa 440%. Si el objetivo sobrevive, 75% de probabilidad de aplicar Quemadura 15% (3 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, prob: .75 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/aldebaran.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #13 (diseñada el 2026-10-05). Aldebarán de Tauro, Caballero Dorado: aguanta golpes con los brazos
// cruzados (postura del Gran Cuerno), acumula Furia Dorada y la descarga en el Gran Cuerno. Todo escala por HP.
// Sin habilidad de líder: en su historia no es líder (los Dorados responden al Patriarca).
__e.default = {
  id: 'aldebaran',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro'],   // campaña: temas de las etapas
  nombre: 'Aldebarán',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐂', color: '#eab308', imagen: 'assets/personajes/aldebaran.webp',
  base: { hp: 850, dmg: 52, spd: 86 },
  extra: { armor: .50, res: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Postura del Gran Cuerno',
    desc: 'Pelea con los brazos cruzados: recibe −15% de daño de golpes y cada golpe que recibe le da 1 carga de Furia Dorada (máx. 5). Con Control activo no gana cargas.',
    reduccionPropia: { categoria: 'golpe', pct: .15 },
    cargasAlRecibirGolpe: { max: 5 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Embestida del Toro', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: 1.85, escala: 'hp', cd: 0,
      desc: 'Causa 185% (escala por HP) y Aldebarán gana un Escudo del 75% de su HP máx. (2 rondas).',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: .75, escala: 'hpMax', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Gran Cuerno', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 2.95, escala: 'hp', cd: 3,
      desc: 'Causa 295% (escala por HP). Consume todas sus cargas de Furia Dorada: +15% de daño por carga (máx. +75%). Si consumió 3 o más, tiene 40% de probabilidad de Aturdir.',
      consumeCargas: { pct: .15 },
      efectos: [{ condicion: { cargasConsumidasMin: 3 }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Orgullo del Toro Dorado', objetivo: 'propio', estilo: 'support', color: 0xeab308,
      cd: 5,
      desc: 'Gana Provocación (2 rondas) y un Escudo del 200% de su HP máx. (2 rondas). Mientras dure esa Provocación, cada golpe le da 2 cargas. Al terminar, lanza automáticamente un Gran Cuerno contra el último enemigo que lo golpeó.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: 2.00, escala: 'hpMax', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, cargasX: 2, a: 'propio',
          alTerminar: { tipo: 'usarMovimiento', categoria: 'especial', a: 'ultimoAtacante' } } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/rhaenys-targaryen.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #14 (revisada el 2026-10-05). Rhaenys Targaryen, "la Reina que Nunca Fue", jinete de Meleys:
// enciende y aviva las Quemaduras, encadena turnos contra enemigos quemados y aturde a los que arden.
// Sin habilidad de líder: nunca llegó a gobernar.
__e.default = {
  id: 'rhaenys-targaryen',
  franquicia: 'Game of Thrones', grupos: ['targaryen', 'dragones'],   // campaña: temas de las etapas
  nombre: 'Rhaenys Targaryen',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: [],  // sin sobre temático todavía: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐉', color: '#dc2626', imagen: 'assets/personajes/rhaenys-targaryen.webp',
  base: { hp: 560, dmg: 85, spd: 110 },
  extra: { critRate: .15 },
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'La Reina que Nunca Fue',
    desc: 'Una vez por ronda: cuando golpea a un enemigo con Quemadura, tiene 50% de probabilidad de ganar un turno adicional (un solo intento por movimiento).',
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'burn' }, maxPorRonda: 1, unaVezPorMovimiento: true, prob: .50,
    accion: { tipo: 'turnoExtra', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamarada de Meleys', objetivo: 'enemigo', estilo: 'ranged', color: 0xef4444,
      pct: 1.8, escala: 'dano', cd: 0,
      desc: 'Causa 180%. Si el objetivo tiene Quemadura, la alarga 1 ronda y, si le quedan 4 rondas o más, tiene 15% de probabilidad de Aturdirlo. Además tiene 30% de probabilidad de aplicar Quemadura 5% (2 rondas).',
      efectos: [
        { condicion: { objetivoTiene: 'burn' }, accion: { tipo: 'extenderDuracion', efecto: 'burn', rondas: 1 } },
        { condicion: { objetivoEfectoDurMin: { efecto: 'burn', dur: 4 } }, accion: { tipo: 'efecto', id: 'stun', prob: .15 } },
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .30 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Vuelo Infernal', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0xf97316,
      pct: 1.35, escala: 'dano', cd: 3,
      desc: '2 golpes de 135% a un enemigo. Si golpea a un enemigo con Quemadura, Rhaenys gana Frenesí y Letalidad (2 rondas).',
      efectos: [
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'frenzy', dur: 2, a: 'propio' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Erupción del Pozo Dragón', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      pct: 2.75, escala: 'dano', cd: 5,
      desc: 'Causa 275% a todos los enemigos. Cada enemigo con Quemadura tiene 40% de probabilidad de quedar Aturdido.',
      efectos: [{ condicion: { objetivoTiene: 'burn' }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/thor.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #15 (revisada el 2026-10-06). Thor, Rey de Asgard: debilita en área, potencia a todo su equipo con
// Mjölnir y remata con una explosión que crece con cada tipo de debuff del enemigo. Su Over llega antes cuando el
// rival usa los suyos.
__e.default = {
  id: 'thor',
  franquicia: 'Marvel', grupos: ['asgard', 'dioses'],   // campaña: temas de las etapas
  nombre: 'Thor',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '⚡', color: '#3b82f6', imagen: 'assets/personajes/thor.webp',
  base: { hp: 750, dmg: 75, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Asgard',
    desc: 'Todos los aliados ganan +15% de Armadura.',
    bonoStat: { armor: .15 },
  },
  pasiva: {
    nombre: 'Voluntad de Asgard',
    desc: 'Cada vez que un enemigo usa su Over, los cooldowns de todos los movimientos de Thor bajan 1.',
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['over'] },
    accion: { tipo: 'reducirCooldown', cantidad: 1, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Tormenta Creciente', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: .2, escala: 'dano', cd: 0,
      desc: 'Causa 20% a todos los enemigos. Cada uno tiene 30% de probabilidad de recibir Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Impacto de Mjölnir', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Causa 65%. Todos los aliados ganan Celeridad y Furia (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Explosión Divina', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbfdbfe,
      pct: .59, escala: 'dano', cd: 6,
      desc: 'Causa 59% a todos los enemigos, +30% contra cada uno por cada tipo distinto de debuff que tenga. Thor se cura 8% de su HP máx. por cada enemigo eliminado.',
      bonoPorDebuffs: { pct: .30 },
      efectos: [{ cuando: 'final', accion: { tipo: 'curar', pct: .08, escala: 'hpMax', porCada: 'eliminados', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/loki.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #16 (diseñada el 2026-10-06). Loki, Dios del Engaño. Basado en Pelops el Vencedor (Raid): tanque que
// envenena y confunde a quien lo ataca, roba todos los buffs a los envenenados y con su Over protege a su equipo con
// Escudo y Furia mientras él atrae los golpes con Provocación y Espejismo. Usurpó el trono de Asgard: tiene habilidad de líder.
__e.default = {
  id: 'loki',
  franquicia: 'Marvel', grupos: ['asgard', 'dioses'],   // campaña: temas de las etapas
  nombre: 'Loki',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom', 'sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐍', color: '#16a34a', imagen: 'assets/personajes/loki.webp',
  base: { hp: 780, dmg: 50, spd: 91 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey Usurpador',
    desc: 'Todos los aliados ganan +20% de Resistencia.',
    bonoStat: { res: .20 },
  },
  pasiva: {
    nombre: 'Maestro de Engaños',
    desc: 'Inmune a Veneno, Aturdimiento y Confusión. Cada vez que un enemigo lo ataca (una vez por movimiento): 100% de probabilidad de envenenar al atacante y 50% de confundirlo (1 ronda); con Desgaste, 50% y 25%. Además, mientras Loki viva y no tenga Desgaste, todo su equipo recibe −20% de daño (efecto de Glorioso Propósito).',
    inmuneA: ['poison', 'stun', 'confuse'],
    gatillo: 'alSerAtacado',
    accion: { tipo: 'multiple', a: 'atacante', acciones: [
      { tipo: 'efecto', id: 'poison', probSiPropioTiene: { efecto: 'wear', factor: .5 } },
      { tipo: 'efecto', id: 'confuse', dur: 1, prob: .50, probSiPropioTiene: { efecto: 'wear', factor: .5 } },
    ] },
    reduccionAliados: { pct: .20, salvoSi: 'wear' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Daga del Embaucador', objetivo: 'enemigo', estilo: 'melee', color: 0x22c55e,
      pct: 1.25, escala: 'hp', cd: 0,
      desc: 'Causa 125% (escala por HP) con 50% de probabilidad de aplicar Miedo (2 rondas). Contra enemigos envenenados el Miedo no se puede resistir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50, irresistibleSi: 'poison' } }],
    },
    {
      categoria: 'especial', nombre: 'Truco de la Serpiente', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 1.95, escala: 'hp', cd: 3,
      desc: 'Causa 195% (escala por HP), +10% por cada ronda restante de debuffs en Loki y en el objetivo (máx. +100%). Aplica Mega Aturdimiento (2 turnos). Si el objetivo está envenenado, ignora 25 puntos de Armadura, le roba todos sus buffs y el Mega Aturdimiento no se puede resistir.',
      bonoPorDuracionDebuffs: { pct: .10, max: 1 },
      ignoraArmaduraSi: { efecto: 'poison', puntos: .25 },
      efectos: [
        { condicion: { objetivoTiene: 'poison' }, accion: { tipo: 'robarBuffs', cantidad: 99 } },
        { accion: { tipo: 'efecto', id: 'stun', mega: true, irresistibleSi: 'poison' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Glorioso Propósito', objetivo: 'propio', estilo: 'support', color: 0x67e8f9,
      cd: 5,
      desc: 'Todos los aliados ganan Furia y un Escudo del 50% del HP máx. de Loki (2 rondas). Loki gana Provocación y Espejismo (2 rondas: devuelve el 30% del daño de cada golpe recibido). Efecto pasivo: mientras Loki viva y no tenga Desgaste, su equipo recibe −20% de daño.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/lich-king.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #17 (revisada el 2026-10-07). Tanque de Control: Provocación permanente, roba HP y castiga a los
// enemigos congelados y poseídos. Su daño directo es bajo a propósito: su fuerza está en los robos y en el Over.
// Líder: Carcelero de los Malditos.
__e.default = {
  id: 'lich-king',
  franquicia: 'Warcraft', grupos: ['plaga', 'reyes', 'hielo'],   // campaña: temas de las etapas
  nombre: 'Lich King',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom'],
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '👑', color: '#60a5fa', imagen: 'assets/personajes/lich-king.webp',
  base: { hp: 850, dmg: 55, spd: 85 },
  extra: { armor: .20, res: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Carcelero de los Malditos',
    desc: 'Cada vez que un aliado aplica Congelación o Mega Congelación a un enemigo, ese aliado le roba el 5% de su HP máx.',
    alAplicar: { efecto: 'freeze', accion: { tipo: 'robarHP', pct: .05 } },
  },
  pasiva: {
    nombre: 'El Príncipe Caído',
    desc: 'Tiene Provocación permanente (no se puede disipar). Cada vez que recibe un debuff, 50% de probabilidad de aplicar Congelación a un enemigo al azar.',
    efectosPermanentes: ['taunt'],
    gatillo: 'alRecibirDebuff', prob: .50,
    accion: { tipo: 'efecto', id: 'freeze', a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Agonía de Escarcha', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd, elemento: 'hielo',
      pct: .7, escala: 'hp', cd: 0,
      desc: 'Causa 70% (escala por HP) y roba 5% del HP máx. del objetivo. Si tenía Congelación antes del ataque, 80% de probabilidad de aplicar Posesión.',
      efectos: [
        { accion: { tipo: 'robarHP', pct: .05 } },
        { condicion: { objetivoTeniaAntes: 'freeze' }, accion: { tipo: 'efecto', id: 'possess', prob: .80 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Profanación de Vida', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa, elemento: 'hielo',
      pct: .39, escala: 'hp', cd: 2,
      desc: 'Causa 39% (escala por HP) a todos los enemigos y roba 5% del HP máx. de cada uno que tenía Congelación, Mega Congelación o Posesión antes del ataque.',
      efectos: [{ condicion: { objetivoTeniaAntes: ['freeze', 'possess'] }, accion: { tipo: 'robarHP', pct: .05 } }],
    },
    {
      categoria: 'over', nombre: 'Apocalipsis', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbfdbfe, elemento: 'hielo',
      pct: .2, escala: 'hp', cd: 5,
      desc: 'Causa 20% (escala por HP) a todos los enemigos. Cada uno recibe además 10% de su HP máx. por Congelación (o Mega Congelación) y 10% por Posesión que tuviera antes del ataque (máx. 20%). Ese daño ignora Armadura.',
      efectos: [{ accion: { tipo: 'danoPorDebuffs', efectos: ['freeze', 'possess'], pct: .10, color: 0xbfdbfe } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/jaina-proudmoore.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #18 (revisada el 2026-10-07). Daño de hielo: no congela por sí misma; castiga a los enemigos que sus
// aliados congelan, acumulando crítico, y su Over protege al equipo con Aura Gélida.
__e.default = {
  id: 'jaina-proudmoore',
  franquicia: 'Warcraft', grupos: ['alianza', 'hielo'],   // campaña: temas de las etapas
  nombre: 'Jaina Proudmoore',
  rol: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧙‍♀️', color: '#818cf8', imagen: 'assets/personajes/jaina-proudmoore.webp',
  base: { hp: 540, dmg: 85, spd: 108 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'Archimaga del Kirin Tor',
    desc: 'Cada vez que Jaina golpea a un enemigo con Congelación gana +5% de Prob. Crítico y +5% de Daño Crítico (+10% si es Mega Congelación) durante toda la partida, hasta +50% cada uno. Cuenta aunque el hielo ya esté roto.',
    acumulaCriticoContra: { efecto: 'freeze', valor: .05, valorMega: .10, tope: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Descarga de Escarcha', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5b4fc, elemento: 'hielo',
      pct: 1.75, escala: 'dano', cd: 0,
      desc: 'Causa 175%. 20% de probabilidad de golpear también (175%) a otro enemigo con Congelación.',
      golpeExtraContra: { efecto: 'freeze', prob: .20 },
    },
    {
      categoria: 'especial', nombre: 'Anillo de Hielo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7dd3fc, elemento: 'hielo',
      pct: 1.45, escala: 'dano', cd: 3,
      desc: 'Causa 145% a todos los enemigos. Si rompe al menos una capa de Mega Congelación, lanza 2 Descargas de Escarcha a 2 enemigos al azar (una vez por uso).',
      efectos: [{ cuando: 'final', condicion: { rompioMega: true }, accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 2 } } }],
    },
    {
      categoria: 'over', nombre: 'Invierno sin Remordimientos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0e7ff, elemento: 'hielo',
      pct: 2.35, escala: 'dano', cd: 4,
      desc: 'Causa 235% a todos los enemigos. Si golpea a alguno con Congelación, 3 aliados al azar ganan Aura Gélida (2 rondas): −20% de daño de golpes y 50% de Congelar a quien los golpee.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'freeze' }, accion: { tipo: 'efecto', id: 'frostAura', dur: 2, a: { aliadosDistintos: 3 } } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/doctor-doom.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #19 (revisada el 2026-10-07). Soporte de escudos: convierte el daño que recibe en escudos para el
// más herido, escuda a todo el equipo y crece en HP; su Over roba los buffs enemigos y frena sus Overs.
// Líder: Dios Emperador Doom.
__e.default = {
  id: 'doctor-doom',
  franquicia: 'Marvel', grupos: ['reyes'],   // campaña: temas de las etapas
  nombre: 'Doctor Doom',
  rol: 'Support', rolSecundario: 'Tanque',
  sobres: ['phantom'],
  emoji: '🛡️', color: '#22c55e', imagen: 'assets/personajes/doctor-doom.webp?v=2',
  base: { hp: 650, dmg: 52, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Dios Emperador Doom',
    desc: 'Todos los aliados tienen +10% de HP máx., y los que tengan Escudo hacen +15% de daño.',
    bonoStat: { hpPct: .10 },
    bonoDanoConEscudo: .15,
  },
  pasiva: {
    nombre: 'Soberano de Latveria',
    desc: 'Hasta 2 veces por ronda: cuando Doctor Doom recibe daño de un golpe, el aliado más herido (puede ser él) gana un Escudo del 25% del HP máx. de Doctor Doom (1 ronda).',
    gatillo: 'alRecibirGolpe', maxPorRonda: 2,
    accion: { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fervor Místico', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: .95, escala: 'hp', cd: 0,
      desc: 'Causa 95% (escala por HP) más el 10% del Escudo actual de Doctor Doom (no lo gasta).',
      bonoPorEscudoPropio: .10,
    },
    {
      categoria: 'especial', nombre: 'Protocolo Doombot', objetivo: 'propio', estilo: 'support', color: 0x86efac,
      cd: 2,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Doctor Doom (1 ronda). Doctor Doom gana +10% de HP máx. permanente (hasta +50%).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .10, tope: .50, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Voluntad de Hierro', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.4, escala: 'hp', cd: 4,
      desc: 'Causa 140% (escala por HP) a todos los enemigos. Les quita todos sus buffs y se los da al aliado de Doom en la misma posición (o a uno al azar si cayó). 60% de probabilidad, por enemigo, de poner su Over en cooldown completo.',
      efectos: [
        { accion: { tipo: 'transferirBuffs' } },
        { accion: { tipo: 'activarCooldown', categoria: 'over', prob: .60 } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/kratos.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #20 (2026-10-07, ajustada tras la simulación: ~63% de victorias, dentro del objetivo 60–70%).
// Daño con Sangrado: castiga a los que sangran, los convierte en Hemorragia y cambia su estilo según las armas que lleva (Espadas del Caos / Lanza de Draupnir).
__e.default = {
  id: 'kratos',
  franquicia: 'God of War', grupos: ['dioses', 'guerreros'],   // campaña: temas de las etapas
  nombre: 'Kratos',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'sacred'],
  emoji: '🪓', color: '#dc2626', imagen: 'assets/personajes/kratos.webp',
  base: { hp: 750, dmg: 75, spd: 98 },
  extra: { dot: .40 },                         // Daño DoT 40%: su Sangrado quita 7% por golpe
  // Por defecto lleva 2 Espadas (las Espadas del Caos) mientras no exista el inventario de reliquias de los jugadores
  slots: espacios('obsidiana', 'pechera', 'anilloCobre', { relic: 'katanaCarmesi' }),

  pasiva: {
    nombre: 'Fantasma de Esparta',
    desc: 'Sus golpes hacen +25% de daño a enemigos con Sangrado o Hemorragia. Cuando un enemigo con Hemorragia muere, Kratos se cura el 10% de su HP máx.',
    bonoContra: { efecto: ['bleed', 'hemo'], pct: .25 },
    gatillo: 'alMorirEnemigo', filtro: { teniaAlMorir: 'hemo' },
    accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espadas del Caos', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .75, escala: 'dano', cd: 0,
      desc: 'Causa 75% con 60% de probabilidad de Sangrado. ⚔️ Con 2 Espadas equipadas: 2 golpes de 60%, cada uno con su tirada de Sangrado.',
      conEquipo: { equipo: { tipo: 'Espada', min: 2 }, cambios: { golpes: 2, pct: .60 } },
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Espartana', objetivo: 'propio', estilo: 'support', color: 0xef4444,
      cd: 3,
      desc: 'Kratos se quita sus debuffs de Control, gana Furia (+50% de daño, 2 rondas) y un turno extra para atacar de inmediato. Si hay 2 o más enemigos con Sangrado o Hemorragia, también gana Letalidad (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'Control', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', condicion: { enemigosCon: { efectos: ['bleed', 'hemo'], min: 2 } }, accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Ira del Dios de la Guerra', objetivo: 'enemigo', estilo: 'melee', color: 0xb91c1c,
      pct: 2.1, escala: 'dano', cd: 5,
      desc: 'Causa 210%. Asesino de Dioses: +30% si el objetivo tiene más HP que Kratos. Si tenía Sangrado, se convierte en Hemorragia. 🔱 Con una Lanza equipada: la lanza explota y golpea (33%) a los demás enemigos que sangran.',
      bonoSiObjetivoMasHp: .30,
      efectos: [
        { condicion: { objetivoTeniaAntes: 'bleed' }, accion: { tipo: 'hemorragia' } },
        { cuando: 'final', condicion: { equipo: { tipo: 'Lanza' } }, accion: { tipo: 'golpeDirecto', nombre: 'Lanza de Draupnir', pct: .33, color: 0x93c5fd, a: { enemigosCon: ['bleed', 'hemo'] } } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/vegeta.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #21 (2026-10-07, ajustada tras la simulación: ~50% de victorias, como Goku).
// Daño que se buffea a sí mismo, sin turnos extra. Mecánica única: Rivalidad
// (marca a un Rival —Goku si está— y le hace más daño) y Orgullo Sayajin (cargas que lo transforman en Super Sayajin
// y alimentan Final Flash). Una sola transformación permanente, automática (no usa el Over).

const vegetaSuperSayajin = {
  nombre: 'Vegeta Super Sayajin',
  emoji: '⚡', color: '#facc15', imagen: 'assets/transformaciones/vegeta-super-sayajin.webp',
  base: { hp: 630, dmg: 100, spd: 122 },
  extra: { critRate: .10, armor: .10 },
  pasiva: {
    nombre: 'Orgullo del Super Sayajin',
    desc: 'Rivalidad: +40% de daño a su Rival 👑. Gana 1 Orgullo cuando su Rival usa un movimiento, cuando Vegeta hace un crítico y cuando recibe un golpe crítico (máx. 5). Si su Rival muere, +10% de Daño permanente y elige un nuevo Rival.',
    rival: { bono: .40, max: 5, orgulloAlCritico: true, orgulloAlRecibirCritico: true, alMorirRival: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Big Bang Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.85, escala: 'dano', cd: 0,
      desc: 'Causa 185%.',
    },
    {
      categoria: 'especial', nombre: 'Poder Majin', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: 3.05, escala: 'dano', cd: 3,
      desc: 'Causa 305% y Vegeta gana Furia (+50% de daño) y Letalidad (+30% de Daño Crítico) por 2 rondas.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Final Flash', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 4.70, escala: 'dano', cd: 4,
      desc: 'Causa 470% y consume todo su Orgullo: +15% de daño por cada uno (hasta +75%).',
      consumeCargas: { pct: .15, efecto: 'orgullo' },
    },
  ],
};

__e.default = {
  id: 'vegeta',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: temas de las etapas
  nombre: 'Vegeta',
  rol: 'Daño', rolSecundario: '',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '👑', color: '#2563eb', imagen: 'assets/personajes/vegeta.webp',
  base: { hp: 590, dmg: 88, spd: 120 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Príncipe de los Sayajin',
    desc: 'Rivalidad: al empezar marca como Rival 👑 a Goku (si está en el equipo enemigo) o al enemigo con más Daño, y le hace +30% de daño. Gana 1 Orgullo cuando su Rival usa un movimiento y cuando hace un crítico (máx. 5). Con 3 Orgullo, o con menos de 50% de HP, se transforma en Vegeta Super Sayajin y gana Furia y Frenesí (2 rondas). Si su Rival muere, +10% de Daño permanente y elige un nuevo Rival.',
    rival: { bono: .30, max: 5, orgulloAlCritico: true, alMorirRival: .10, transformar: { cargas: 3, hp: .50 } },
    gatillo: 'alTransformarse',                 // al transformarse: Furia + Frenesí (sin turno extra, a diferencia de Goku)
    accion: { tipo: 'multiple', a: 'propio', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'frenzy', dur: 2 }] },
  },
  transformacion: vegetaSuperSayajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Galick Gun', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.70, escala: 'dano', cd: 0,
      desc: 'Causa 170%.',
    },
    {
      categoria: 'especial', nombre: 'Big Bang Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0x93c5fd,
      pct: 2.70, escala: 'dano', cd: 2,
      desc: 'Causa 270% y Vegeta gana Frenesí (+50% de Prob. Crítico) por 2 rondas.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'frenzy', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Final Flash', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 4.05, escala: 'dano', cd: 5,
      desc: 'Causa 405% y consume todo su Orgullo: +15% de daño por cada uno (hasta +75%).',
      consumeCargas: { pct: .15, efecto: 'orgullo' },
    },
  ],
};


return __e; })();

__m["datos/personajes/wukong.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #22 (2026-10-08). Inspirado en el Sun Wukong de Raid: Shadow Legends, adaptado: Aturdir (más si el
// enemigo tiene buffs), golpe que ignora Armadura y pasa el daño sobrante, robo de todos los buffs enemigos con
// Bloquear Buffs, y revive una vez por partida. Líder: Gran Sabio Igual al Cielo (el aura de Velocidad de Raid).
__e.default = {
  id: 'wukong',
  franquicia: 'Black Myth: Wukong', grupos: ['dioses', 'guerreros'],   // campaña: temas de las etapas
  nombre: 'Wukong',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['sacred'],
  emoji: '🐒', color: '#f59e0b', imagen: 'assets/personajes/wukong.webp',
  base: { hp: 580, dmg: 85, spd: 125 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Gran Sabio Igual al Cielo',
    desc: 'Todos los aliados tienen +15% de Velocidad.',
    bonoStat: { spdPct: .15 },
  },
  pasiva: {
    nombre: 'Wukong Invencible',
    desc: 'Cuando muere, revive 3 turnos después (cuentan los turnos de cualquiera) con el 100% de su HP. Una vez por partida.',
    revivir: { turnos: 3, hp: 1 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '¡Te tengo!', objetivo: 'enemigo', estilo: 'melee', color: 0xfbbf24,
      pct: .7, escala: 'dano', cd: 0,
      desc: 'Causa 70% con 25% de probabilidad de Aturdir (50% si el enemigo tiene algún buff).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25, probSiConBuff: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Bastón Prodigioso', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: 1.05, escala: 'dano', cd: 3, ignoraArmadura: .50, sinCritico: true, sobrante: true,
      desc: 'Causa 105%, ignora 50 puntos de Armadura y no puede ser crítico. Si el objetivo muere, el daño sobrante pasa a otro enemigo. Si sobrevive y tiene algún buff, recibe Mega Aturdimiento (siempre entra).',
      efectos: [{ condicion: { objetivoConBuff: true }, accion: { tipo: 'efecto', id: 'stun', mega: true, irresistible: true } }],
    },
    {
      categoria: 'over', nombre: 'Ahora Nos Ves', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde68a,
      pct: .85, escala: 'dano', cd: 4,
      desc: 'Antes de atacar, le roba todos los buffs a todos los enemigos. Causa 85% a todos y les aplica Bloquear Buffs (2 rondas).',
      efectos: [
        { cuando: 'antes', accion: { tipo: 'robarBuffs', cantidad: 99 } },
        { accion: { tipo: 'efecto', id: 'blockBuffs', dur: 2 } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/naruto.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #23 (2026-10-08, ajustada tras la simulación: ~53% de victorias, objetivo 50–60%). Tres formas: Naruto (Clones de Sombra y "Nunca me rindo") → Modo Rikudo
// (permanente: reparte chakra y disipa con las Esferas Buscadoras de la Verdad) → Modo Barión (4 turnos, una vez por
// partida: quema su vida y la fuerza vital del enemigo; al terminar, Kurama se despide y vuelve al Modo Rikudo).

const narutoModoBarion = {
  nombre: 'Naruto Modo Barión',
  emoji: '🦊', color: '#ea580c', imagen: 'assets/transformaciones/naruto-modo-barion.webp',
  base: { hp: 880, dmg: 105, spd: 138 },
  extra: { res: .10 },
  pasiva: {
    nombre: 'Fusión con Kurama',
    desc: 'Cada golpe de Naruto reduce 5% el HP máx. del objetivo para el resto de la partida (hasta −30%). Al final de cada turno de Naruto, pierde 3% de su propio HP máx. (nunca baja de 1 HP).',
    gatillo: 'alGolpear', filtro: { en: 'enemigos' },
    accion: { tipo: 'reducirHpMax', pct: .05, tope: .30, a: 'objetivo' },
    drenajePropio: .03,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Barión', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: 2.35, escala: 'dano', cd: 0,
      desc: 'Causa 235%.',
    },
    {
      categoria: 'especial', nombre: 'Rasengan Barión', objetivo: 'enemigo', estilo: 'melee', color: 0xfb923c,
      pct: 3.8, escala: 'dano', cd: 2,
      desc: 'Causa 380%.',
    },
    {
      categoria: 'over', nombre: 'Último Golpe de Kurama', objetivo: 'enemigo', estilo: 'melee', color: 0xea580c,
      pct: 4.4, escala: 'dano', cd: 2,
      desc: 'Causa 440%.',
    },
  ],
};

const narutoModoRikudo = {
  nombre: 'Naruto Modo Rikudo',
  emoji: '☯️', color: '#facc15', imagen: 'assets/transformaciones/naruto-modo-rikudo.webp',
  base: { hp: 800, dmg: 81, spd: 116 },
  extra: { res: .10 },
  pasiva: {
    nombre: 'Chakra de los Seis Caminos',
    desc: 'Al inicio de cada ronda, el aliado más herido recibe un Escudo del 50% del HP máx. de Naruto (1 ronda).',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
  },
  transformacion: narutoModoBarion,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rasenshuriken', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.2, escala: 'dano', cd: 0,
      desc: 'Causa 120% a todos los enemigos.',
    },
    {
      categoria: 'especial', nombre: 'Esferas Buscadoras de la Verdad', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0x1f2937,
      pct: 2.6, escala: 'dano', cd: 2,
      desc: '3 golpes de 260% a enemigos al azar (pueden repetirse). Cada golpe disipa 1 buff del enemigo.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Modo Barión', objetivo: 'propio', estilo: 'support', color: 0xea580c, cd: 4, unaVez: true,
      desc: 'Se transforma en Naruto Modo Barión durante 4 turnos propios y ataca de inmediato con Golpe Barión a un enemigo al azar. Solo una vez por partida: al terminar, Kurama se despide y Naruto vuelve al Modo Rikudo.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', turnos: 4, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 1 } } },
      ],
    },
  ],
};

__e.default = {
  id: 'naruto',
  franquicia: 'Naruto', grupos: ['konoha'],   // campaña: temas de las etapas
  nombre: 'Naruto',
  rol: 'Daño', rolSecundario: 'Invocador',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🍥', color: '#f97316', imagen: 'assets/personajes/naruto.webp',
  base: { hp: 740, dmg: 72, spd: 108 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Nunca Me Rindo',
    desc: 'La primera vez que recibiría un golpe mortal, queda con 1 HP y se transforma en el acto en Naruto Modo Rikudo.',
    ultimoAliento: { transformar: true },
  },
  transformacion: narutoModoRikudo,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rasengan', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: 1.9, escala: 'dano', cd: 0,
      desc: 'Causa 190% con 50% de probabilidad de invocar 1 Clon de Sombra.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', prob: .50, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Jutsu Clones de Sombra Múltiples', objetivo: 'propio', estilo: 'support', color: 0xf97316, cd: 3,
      desc: 'Invoca 2 Clones de Sombra (golpean 60% a un enemigo al azar después de cada turno de Naruto; duran 2 turnos; máx. 3).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Modo Sabio de los Seis Caminos', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 2,
      desc: 'Transformación permanente en Naruto Modo Rikudo y ataca de inmediato con Rasenshuriken (70% a todos los enemigos).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 1 } } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/sasuke-uchiha.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #24 (2026-10-08). Daño con Quemadura (Amaterasu, inextinguible) y Sangrado (Chidori). Kirin remata a
// los quemados. Las llamas negras saltan a otro enemigo cuando muere uno que arde. Sin Habilidad de Líder.
__e.default = {
  id: 'sasuke-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'konoha'],   // campaña: temas de las etapas
  nombre: 'Sasuke Uchiha',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline'],
  emoji: '⚡', color: '#7c3aed', imagen: 'assets/personajes/sasuke-uchiha.webp',
  base: { hp: 560, dmg: 85, spd: 118 },
  extra: { dot: .30 },                          // Daño DoT 30%: Quemaduras y Sangrados más fuertes
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Mangekyō Sharingan Eterno',
    desc: 'Sus golpes hacen +20% de daño a enemigos con Quemadura o Sangrado. Cuando muere un enemigo con Quemadura, las llamas negras saltan a otro enemigo al azar y le aplican Amaterasu.',
    bonoContra: { efecto: ['burn', 'bleed', 'hemo'], pct: .20 },
    gatillo: 'alMorirEnemigo', filtro: { teniaAlMorir: 'burn' },
    accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, inextinguible: true, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Chidori', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: .51, escala: 'dano', cd: 0,
      desc: 'Causa 51% con 45% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .45 } }],
    },
    {
      categoria: 'especial', nombre: 'Amaterasu', objetivo: 'enemigo', estilo: 'ranged', color: 0x1f2937,
      pct: .6, escala: 'dano', cd: 3,
      desc: 'Causa 60% y aplica Amaterasu: Quemadura de 15% (sube con Daño DoT) durante 3 rondas que no se puede limpiar.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .15, dur: 3, inextinguible: true } }],
    },
    {
      categoria: 'over', nombre: 'Kirin', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa5b4fc,
      pct: .75, escala: 'dano', cd: 5,
      bonoContra: { efecto: 'burn', pct: .50 },
      desc: 'Un dragón de rayo cae sobre todos los enemigos: 75%, +50% contra los que tengan Quemadura (Kirin usa el calor del fuego). 30% de probabilidad de Sangrado a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/skeletor.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #25 (2026-10-08, ajustada tras la simulación: ~59% de victorias, objetivo > 55%).
// Control castigador de buffs: cada buff que reciben sus enemigos lo fortalece
// (Poder Robado), sus golpes hacen más daño a quien tiene buffs, roba y bloquea buffs, y su Over arranca todos los
// buffs del objetivo. Líder: Señor de la Montaña de la Serpiente (comanda a los Guerreros del Mal).
__e.default = {
  id: 'skeletor',
  franquicia: 'He-Man', grupos: ['villanos'],   // campaña: temas de las etapas
  nombre: 'Skeletor',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '💀', color: '#7c3aed', imagen: 'assets/personajes/skeletor.webp',
  base: { hp: 660, dmg: 62, spd: 95 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Señor de la Montaña de la Serpiente',
    desc: 'Los aliados hacen +10% de daño a enemigos que tengan algún buff.',
    bonoContraConBuff: .10,
  },
  pasiva: {
    nombre: 'Codicia del Bastón del Caos',
    desc: 'Cada vez que un enemigo recibe un buff, Skeletor gana 1 de Poder Robado 💀 (máx. 10, no se puede disipar). Sus golpes hacen +6% de daño por cada buff que tenga el objetivo (hasta +30%).',
    cargasPorBuffEnemigo: { efecto: 'poderRobado', max: 10 },
    bonoPorBuffsObjetivo: { pct: .06, max: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rayo del Bastón del Caos', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.7, escala: 'dano', cd: 0,
      desc: 'Causa 170% y disipa 2 buffs del objetivo.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 2 } }],
    },
    {
      categoria: 'especial', nombre: 'Maldición de la Montaña de la Serpiente', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x6d28d9,
      pct: 1.6, escala: 'dano', cd: 2,
      desc: 'Antes de atacar, le roba 1 buff a cada enemigo. Causa 160% a todos y les aplica Bloquear Buffs (2 rondas).',
      efectos: [
        { cuando: 'antes', accion: { tipo: 'robarBuffs', cantidad: 1 } },
        { accion: { tipo: 'efecto', id: 'blockBuffs', dur: 2 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Poder de Grayskull', objetivo: 'enemigo', estilo: 'ranged', color: 0xc084fc,
      pct: 3.1, escala: 'dano', cd: 4,
      consumeCargas: { pct: .20, efecto: 'poderRobado' },
      desc: 'Causa 310% y consume todo su Poder Robado: +20% de daño por cada uno (hasta +200%). Después le arranca TODOS los buffs al objetivo (siempre, sin tirada).',
      efectos: [{ accion: { tipo: 'disipar', sinTirada: true } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/he-man.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #26 (2026-10-08, ajustada tras la simulación: ~63% de victorias, objetivo 60–65%).
// Tanque protector: recibe en su lugar parte del daño de los golpes a sus aliados,
// acumula Poder de Grayskull y lo descarga en su Over. Líder: Defensores de Grayskull.
__e.default = {
  id: 'he-man',
  franquicia: 'He-Man', grupos: ['heroes-de-eternia', 'guerreros'],   // campaña: temas de las etapas
  nombre: 'He-Man',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '⚔️', color: '#f59e0b', imagen: 'assets/personajes/he-man.webp',
  base: { hp: 820, dmg: 52, spd: 86 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Defensores de Grayskull',
    desc: 'Todos los aliados tienen +15% de HP máx. y +15% de Resistencia.',
    bonoStat: { hpPct: .15, res: .15 },
  },
  pasiva: {
    nombre: 'Protector de Eternia',
    desc: 'Mientras no tenga un Control que le quite el turno, He-Man recibe en su lugar el 25% del daño de cada golpe a sus aliados (con su propia Armadura). Cada vez que protege gana 1 de Poder de Grayskull ⚡ (máx. 5).',
    protector: { pct: .25, cargas: { efecto: 'grayskull', max: 5 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada del Poder', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: .75, escala: 'dano', cd: 0,
      desc: 'Causa 75% y He-Man gana 1 de Poder de Grayskull.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', efecto: 'grayskull', max: 5, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: '¡Por el Poder de Grayskull!', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15, cd: 3,
      pct: .9, escala: 'dano',
      desc: 'Causa 90%. He-Man gana Furia (+50% de daño) y Protección (+30% de Resistencia) por 2 rondas, y todos sus aliados ganan un Escudo del 50% del HP máx. de He-Man (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'protect', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Golpe de Grayskull', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: 1.6, escala: 'dano', cd: 4,
      consumeCargas: { pct: .15, efecto: 'grayskull' },
      desc: 'Causa 160% y consume todo su Poder de Grayskull: +15% de daño por cada uno (hasta +75%).',
    },
  ],
};


return __e; })();

__m["datos/personajes/saga.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #27 (2026-10-09, ajustada tras la simulación: ~67% de victorias, objetivo 65–75%).
// Control de Confusión y Posesión con doble personalidad: cada mente que manipula le da
// Oscuridad; con 3, su lado malvado (Saga Oscuro) toma el control 4 turnos y luego vuelve. Todo su equipo castiga a los confundidos y poseídos. Las dos formas comparten
// cooldowns. Over: Explosión de Galaxias (empieza y se recarga en 6). Líder: Patriarca del Santuario.

const sagaOscuro = {
  nombre: 'Saga Oscuro',
  emoji: '😈', color: '#7c3aed', imagen: 'assets/transformaciones/saga-oscuro.webp',
  base: { hp: 710, dmg: 76, spd: 113 },
  extra: { acc: .20 },
  compartirCooldowns: true,
  pasiva: {
    nombre: 'El Dios Malvado',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Confusión o Posesión, y los golpes de Saga Oscuro +20% más.',
    auraContra: { efecto: ['confuse', 'possess'], pct: .40 },
    bonoContra: { efecto: ['confuse', 'possess'], pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de Ares', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: .75, escala: 'dano', cd: 0,
      desc: 'Causa 75% con 50% de probabilidad de Posesión. Si el objetivo ya estaba Poseído, se convierte en Mega Posesión.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'possess' }, accion: { tipo: 'efecto', id: 'possess', mega: true, prob: .50 } },
        { accion: { tipo: 'efecto', id: 'possess', prob: .50 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Satán Imperial', objetivo: 'enemigo', estilo: 'ranged', color: 0x6d28d9,
      pct: .85, escala: 'dano', cd: 3,
      desc: 'Causa 85% y con 80% de probabilidad aplica Mega Posesión: el enemigo ataca a sus aliados durante 2 turnos.',
      efectos: [{ accion: { tipo: 'efecto', id: 'possess', mega: true, prob: .80 } }],
    },
    {
      categoria: 'over', nombre: 'Explosión de Galaxias', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xc084fc,
      pct: 1.45, escala: 'dano', cd: 6,
      bonoContra: { efecto: ['confuse', 'possess'], pct: .30 },
      desc: 'Ataque devastador: 145% a todos los enemigos, +30% contra los que tengan Confusión o Posesión. Cooldown 6 (comparte el de Saga de Géminis).',
    },
  ],
};

__e.default = {
  id: 'saga',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro'],   // campaña: temas de las etapas
  nombre: 'Saga',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '♊', color: '#d4a017', imagen: 'assets/personajes/saga.webp',
  base: { hp: 680, dmg: 62, spd: 108 },
  extra: { acc: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Patriarca del Santuario',
    desc: 'Todos los aliados tienen +20% de Puntería.',
    bonoStat: { acc: .20 },
  },
  pasiva: {
    nombre: 'Dualidad de Géminis',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Confusión o Posesión. Cada vez que Saga aplica Confusión o Posesión gana 1 de Oscuridad 🌑 (máx. 3). Con 3, su lado malvado toma el control: se transforma en Saga Oscuro por 4 turnos (consume la Oscuridad) y luego vuelve. Se puede repetir.',
    auraContra: { efecto: ['confuse', 'possess'], pct: .40 },
    cargasAlAplicar: { efectos: ['confuse', 'possess'], efecto: 'oscuridad', max: 3 },
    transformarConCargas: { efecto: 'oscuridad', cargas: 3, turnos: 4 },
  },
  transformacion: sagaOscuro,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Ilusorio', objetivo: 'enemigo', estilo: 'melee', color: 0xfde68a,
      pct: .65, escala: 'dano', cd: 0,
      desc: 'Causa 65% con 60% de probabilidad de Confusión (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Laberinto de Géminis', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .6, escala: 'dano', cd: 2,
      desc: 'Causa 60% a todos los enemigos con 80% de probabilidad de Confusión (2 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .80 } }],
    },
    {
      categoria: 'over', nombre: 'Explosión de Galaxias', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde047,
      pct: 1.2, escala: 'dano', cd: 6, cdInicial: 6,
      bonoContra: { efecto: ['confuse', 'possess'], pct: .30 },
      desc: 'Ataque devastador: 120% a todos los enemigos, +30% contra los que tengan Confusión o Posesión. Empieza con cooldown 6 y se recarga en 6.',
    },
  ],
};


return __e; })();

__m["datos/personajes/camus.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #28 (2026-10-09). Control de Congelación: congela, encierra en el Ataúd de Hielo y remata con la
// Ejecución de Aurora. Su pasiva hace que TODO su equipo castigue a los congelados: brilla en equipos de congelación.
__e.default = {
  id: 'camus',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro', 'hielo'],   // campaña: temas de las etapas
  nombre: 'Camus',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#22d3ee', imagen: 'assets/personajes/camus.webp',
  base: { hp: 650, dmg: 60, spd: 106 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Cero Absoluto',
    desc: 'Todo su equipo (incluido Camus) hace +25% de daño a enemigos con Congelación o Mega Congelación.',
    auraContra: { efecto: 'freeze', pct: .25 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Polvo de Diamante', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5f3fc,
      pct: 1.35, escala: 'dano', cd: 0,
      desc: 'Causa 135% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ataúd de Hielo', objetivo: 'enemigo', estilo: 'ranged', color: 0x67e8f9,
      pct: 1.6, escala: 'dano', cd: 3,
      desc: 'Causa 160% y con 70% de probabilidad encierra al enemigo en Mega Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .70 } }],
    },
    {
      categoria: 'over', nombre: 'Ejecución de Aurora', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 2.15, escala: 'dano', cd: 5,
      bonoContra: { efecto: 'freeze', pct: .50 },
      desc: 'Causa 215% a todos los enemigos (+50% contra los que ya tengan Congelación) con 60% de probabilidad de Congelación a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/milo.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #29 (2026-10-09, ajustada tras la simulación: ~62% de victorias, objetivo 55–65%).
// DoTer de Veneno y Sangrado con apoyo: clava Agujas Escarlata (hasta 14, las estrellas de Escorpio) que duelen cada
// turno y amplifican los DoTs del enemigo; Antares, la 15.ª, las consume. Punto Shinou: cura y limpia DoTs.
__e.default = {
  id: 'milo',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro'],   // campaña: temas de las etapas
  nombre: 'Milo',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['bloodline'],
  starter: 'noxious',                         // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦂', color: '#dc2626', imagen: 'assets/personajes/milo.webp',
  base: { hp: 600, dmg: 55, spd: 102 },
  extra: { dot: .30 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Las 15 Estrellas de Escorpio',
    desc: 'Cada golpe de Milo clava 1 Aguja Escarlata 📍 en el enemigo (máx. 14). Cada aguja le quita 0.5% de su HP máx. al inicio de su turno (14 agujas = 7%) y le hace recibir +3% de daño de Veneno y Sangrado (hasta +42%). Las agujas son una marca: no se disipan ni se limpian.',
    gatillo: 'alGolpear', filtro: { en: 'enemigos' },
    accion: { tipo: 'clavarAgujas', n: 1, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Aguja Escarlata', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0xef4444,
      pct: .18, escala: 'dano', cd: 0,
      desc: '2 golpes de 18%. Cada golpe clava 1 aguja y tiene 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Restricción y Punto Shinou', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfb7185,
      pct: .24, escala: 'dano', cd: 3,
      desc: 'Causa 24% a todos los enemigos, clava 2 agujas más en cada uno y aplica Sangrado (60%). Presiona el Punto Shinou del aliado más herido: lo cura 5% de su HP máx. y le limpia sus DoTs.',
      efectos: [
        { accion: { tipo: 'clavarAgujas', n: 2 } },
        { accion: { tipo: 'efecto', id: 'bleed', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'DoT', a: 'aliadoMasHerido' } },
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .05, a: 'aliadoMasHerido' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Antares', objetivo: 'enemigo', estilo: 'ranged', color: 0xb91c1c,
      pct: .65, escala: 'dano', cd: 5,
      consumeAgujas: { pct: .12 },
      desc: 'La aguja número 15: causa 65% +12% por cada Aguja Escarlata del objetivo (las consume; con 14 agujas, +168%). Aplica Veneno y Sangrado.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { accion: { tipo: 'efecto', id: 'bleed' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/itachi-uchiha.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #30, rediseñada el 2026-10-12: Itachi deja de ser un personaje de velocidad (eso es de Minato) y pasa a ser el
// maestro del genjutsu. Clones de Cuervo (contador): cada uno absorbe un ataque enemigo contra él y los cuervos pueden asustar
// al atacante; gana clones al aplicar Control. Tsukuyomi (Mega Aturdimiento + Debilitar), Susanoo: Espada de Totsuka (sella el
// Over enemigo) y Espejo de Yata (Espejismo + Escudo). Sin Habilidad de Líder.
__e.default = {
  id: 'itachi-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'akatsuki', 'konoha'],   // campaña: temas de las etapas
  nombre: 'Itachi Uchiha',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '🐦‍⬛', color: '#b91c1c', imagen: 'assets/personajes/itachi-uchiha.webp',
  base: { hp: 620, dmg: 60, spd: 105 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Mangekyō Sharingan',
    desc: 'Empieza con 2 Clones de Cuervo (máx. 3). Cada clon absorbe por completo un ataque enemigo contra Itachi (daño y efectos): era un genjutsu, y los cuervos tienen 40% de probabilidad de aplicar Miedo (2 rondas) al atacante. Gana 1 clon cada vez que le aplica Aturdimiento o Miedo a un enemigo.',
    clones: {
      efecto: 'cuervos', iniciales: 2, texto: '🐦‍⬛ ¡Era un genjutsu!',
      alAbsorber: { tipo: 'efecto', id: 'fear', dur: 2, prob: .40, a: 'objetivo' },
    },
    cargasAlAplicar: { efectos: ['stun', 'fear'], efecto: 'cuervos', max: 3 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Genjutsu de Cuervos', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0x7f1d1d,
      pct: .37, escala: 'dano', cd: 0,
      desc: '2 golpes de 37% con 30% de probabilidad de Miedo (no puede usar Especial ni Over y hace −25% de daño).',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Tsukuyomi', objetivo: 'enemigo', estilo: 'ranged', color: 0xdc2626,
      pct: .9, escala: 'dano', cd: 3,
      desc: 'Causa 90% y con 70% de probabilidad atrapa al enemigo en el Tsukuyomi: Mega Aturdimiento (pierde 2 turnos). Si cae, sale mentalmente destrozado: Debilitar (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .70 } },
        { condicion: { objetivoTiene: 'stun' }, accion: { tipo: 'efecto', id: 'weaken', dur: 2 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Susanoo', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 1.65, escala: 'dano', cd: 5,
      desc: 'La Espada de Totsuka causa 165% y sella el Over del objetivo (lo pone en su cooldown completo). El Espejo de Yata le da a Itachi Espejismo (2 rondas: devuelve el 30% del daño de cada golpe) y un Escudo del 200% de su HP máx. (2 rondas).',
      efectos: [
        { accion: { tipo: 'activarCooldown', categoria: 'over' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: 2.00, escala: 'hpMax', dur: 2, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/pain.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #31 (2026-10-09). Líder de Akatsuki: cada turno pelea con uno de sus Seis Caminos (ciclo fijo, empieza en Deva).
// Bansho Ten'in atrae a cualquiera (ignora Provocación y Sigilo); Shinra Tensei repele a todos pero lo deja Expuesto
// (el intervalo de 5 segundos); en el Over los seis cuerpos atacan a la vez, cada golpe con un Camino distinto.
// Camino Animal: invoca 1 de sus 6 criaturas al azar (ver invocaciones.js, tabla animalesPain).
__e.default = {
  id: 'pain',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Pain',
  rol: 'Daño', rolSecundario: 'Invoker',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  emoji: '🌀', color: '#7c3aed', imagen: 'assets/personajes/pain.webp',
  base: { hp: 700, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Conocer el Dolor',
    desc: 'Cada vez que un aliado recibe un golpe crítico de un enemigo (y sobrevive), gana +5% de Daño permanente (hasta +25%).',
    alRecibirCritico: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .05, tope: .25, a: 'objetivo' },
  },
  pasiva: {
    nombre: 'Los Seis Caminos del Dolor',
    desc: 'Al inicio de cada uno de sus turnos activa el siguiente Camino, siempre en este orden: Deva → Asura → Humano → Animal → Preta → Naraka → Deva… (empieza en Deva). Deva: gana Espejismo (1 ronda). Asura: sus golpes hacen +30% de daño. Humano: al terminar su movimiento le roba 1 buff al objetivo. Animal: invoca 1 criatura al azar. Preta: al terminar su movimiento le roba 5% del HP máx. al objetivo. Naraka: se cura 10% de su HP máx. y se limpia 1 debuff. En movimientos de área, Humano y Preta van a un enemigo golpeado al azar.',
    ciclo: {
      efecto: 'camino',
      fases: [
        { id: 'deva', nombre: 'Camino Deva', icono: '☀️', desc: 'gana Espejismo (1 ronda).',
          alIniciar: { tipo: 'efecto', id: 'mirror', dur: 1, a: 'propio' } },
        { id: 'asura', nombre: 'Camino Asura', icono: '🚀', desc: 'sus golpes hacen +30% de daño.', bonoDano: .30 },
        { id: 'humano', nombre: 'Camino Humano', icono: '👤', desc: 'al terminar su movimiento le roba 1 buff al objetivo.',
          alFinal: { tipo: 'robarBuffs', cantidad: 1 } },
        { id: 'animal', nombre: 'Camino Animal', icono: '🐾', desc: 'invoca 1 criatura al azar.',
          alIniciar: { tipo: 'invocarAzar', tabla: 'animalesPain', a: 'propio' } },
        { id: 'preta', nombre: 'Camino Preta', icono: '🌀', desc: 'al terminar su movimiento le roba 5% del HP máx. al objetivo.',
          alFinal: { tipo: 'robarHP', pct: .05 } },
        { id: 'naraka', nombre: 'Camino Naraka', icono: '👹', desc: 'se cura 10% de su HP máx. y se limpia 1 debuff.',
          alIniciar: { tipo: 'multiple', a: 'propio', acciones: [
            { tipo: 'curar', pct: .10, escala: 'hpMax' },
            { tipo: 'limpiar', cantidad: 1 },
          ] } },
      ],
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: "Bansho Ten'in", objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.2, escala: 'dano', cd: 0, ignoraProvocacion: true,
      desc: 'Atrae a cualquier enemigo y le causa 120%. Puede elegir a cualquiera: ignora Provocación y Sigilo.',
    },
    {
      categoria: 'especial', nombre: 'Shinra Tensei', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xc4b5fd,
      pct: 1.35, escala: 'dano', cd: 3,
      desc: 'Repele a todos: causa 135% a todos los enemigos y les disipa 1 buff a cada uno. Intervalo de 5 segundos: Pain queda Expuesto (recibe +25% de daño) por 1 ronda.',
      efectos: [
        { accion: { tipo: 'disipar', cantidad: 1 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'expuesto', dur: 1, irresistible: true, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Seis Caminos del Dolor', objetivo: 'azar', golpes: 6, estilo: 'ranged', color: 0x7c3aed,
      pct: .8, escala: 'dano', cd: 5, recorreCiclo: true,
      desc: 'Los seis cuerpos atacan a la vez: 6 golpes de 80% a enemigos al azar. Cada golpe lleva el efecto de un Camino distinto, en orden (Deva, Asura, Humano, Animal, Preta, Naraka). No cambia su Camino activo.',
    },
  ],
};


return __e; })();

__m["datos/personajes/gilgamesh.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #32 (2026-10-09). El Rey de los Héroes: empieza Arrogante (−10% de daño y Enuma Elish sellado) hasta que el
// enemigo se gana su respeto (HP < 60%, muere un aliado o recibe un crítico). Entonces va en serio: +25% de Daño permanente,
// Enuma Elish listo al instante y 1 turno extra. Gate of Babylon dispara tesoros con efectos al azar; Enkidu encadena; Enuma Elish destruye Escudos.
__e.default = {
  id: 'gilgamesh',
  franquicia: 'Fate', grupos: ['reyes', 'servants'],   // campaña: temas de las etapas
  nombre: 'Gilgamesh',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['sacred'],
  emoji: '👑', color: '#eab308', imagen: 'assets/personajes/gilgamesh.webp',
  base: { hp: 720, dmg: 75, spd: 105 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Tesoro del Rey',
    desc: 'Los aliados ganan +10% de Daño. Cada vez que muere un enemigo, todos los aliados ganan +5% de Daño Crítico permanente (hasta +25%).',
    bonoDano: .10,
    alMorirEnemigo: { tipo: 'bonoPermanente', stat: 'critDmg', pct: .05, tope: .25, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Arrogancia del Rey',
    desc: 'Empieza Arrogante: hace −10% de daño y su Over (Enuma Elish) está sellado. Se vuelve Serio para siempre en cuanto su HP baja de 60%, muere un aliado o recibe un golpe crítico: gana +25% de Daño permanente, Enuma Elish queda listo al instante y gana 1 turno extra.',
    sello: {
      nombre: 'Arrogancia', icono: '👑', categoria: 'over', dano: -.10,
      desc: 'hace −10% de daño y Enuma Elish está sellado. Va en serio si su HP baja de 60%, muere un aliado o recibe un crítico.',
      romper: { hpMenor: .60, muereAliado: true, recibeCritico: true },
      textoRomper: '👑 ¡Ahora va en serio!',
      alRomper: { tipo: 'multiple', a: 'propio', acciones: [
        { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .25 },
        { tipo: 'turnoExtra' },
      ] },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Gate of Babylon', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0xfacc15,
      pct: .24, escala: 'dano', cd: 0,
      desc: 'Abre los portales de su tesoro: 3 proyectiles de 24% a enemigos al azar. Cada uno tiene 30% de probabilidad de aplicar un efecto al azar: Sangrado, Quemadura 5% (2 rondas), Veneno, Debilitar (2 rondas) o Desgaste.',
      efectos: [{ accion: { tipo: 'efecto', idAzar: ['bleed', 'burn', 'poison', 'weaken', 'wear'], valor: .05, dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Enkidu, Cadenas del Cielo', objetivo: 'enemigo', estilo: 'ranged', color: 0xe5e7eb,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Causa 65% y lo encadena: 60% de probabilidad de Aturdirlo. Si Gilgamesh ya va en serio, es Mega Aturdimiento (pierde 2 turnos).',
      efectos: [
        { condicion: { sellado: true }, accion: { tipo: 'efecto', id: 'stun', prob: .60 } },
        { condicion: { sellado: false }, accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .60 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Enuma Elish', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xdc2626,
      pct: 1.7, escala: 'dano', cd: 4, rompeEscudo: true, ignoraArmadura: 1,
      desc: 'La Espada de la Ruptura: antes de golpear destruye todo el Escudo de cada enemigo; luego causa 170% a todos e ignora su Armadura. Sellado hasta que Gilgamesh va en serio.',
    },
  ],
};


return __e; })();

__m["datos/personajes/ozymandias.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #33 (2026-10-11). Ozymandias (Ramsés II), Rey de Reyes: pelea desde su Templo. El Over levanta el
// Ramesseum Tentyris (zona de 3 rondas): su equipo hace más daño y resiste más, la Luz de Dendera barre a los enemigos al
// inicio de cada ronda y el Faraón no puede caer mientras el Templo siga en pie. El Over está listo desde el inicio. Privilegio Imperial: un buff al azar cada turno.
__e.default = {
  id: 'ozymandias',
  franquicia: 'Fate', grupos: ['reyes', 'servants'],   // campaña: temas de las etapas
  nombre: 'Ozymandias',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: ['sacred'],
  emoji: '🏛️', color: '#2563eb', imagen: 'assets/personajes/ozymandias.webp',
  base: { hp: 720, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Carisma del Faraón',
    desc: 'Los aliados ganan +10% de Prob. Crítico y +15% de Daño Crítico.',
    bonoStat: { critRate: .10, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Privilegio Imperial',
    desc: 'Inmune a Miedo. Al inicio de cada uno de sus turnos gana un buff al azar que no tenga (1 ronda): Furia, Protección, Regeneración, Agudeza o Celeridad.',
    inmuneA: ['fear'],
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'efecto', idAzar: ['dmgUp', 'protect', 'regen', 'keen', 'haste'], sinRepetir: true, dur: 1, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Luz de Dendera', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde68a,
      pct: .42, escala: 'dano', cd: 0,
      desc: 'El rayo de la Gran Bombilla de Dendera: causa 42% con 30% de probabilidad de aplicar Ceguera (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'blind', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Esfinge Wehem-Mesut', objetivo: 'enemigo', estilo: 'melee', color: 0xeab308,
      pct: .34, escala: 'dano', cd: 3,
      desc: 'Causa 34% e invoca una Esfinge Wehem-Mesut (2 turnos): golpea 50% al enemigo más fuerte y da Protección al aliado más herido.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocar', key: 'esfingeWehemMesut', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Ramesseum Tentyris', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .46, escala: 'dano', cd: 5, cdInicial: 0,
      desc: 'Listo desde el inicio de la partida. Levanta el Gran Templo Resplandeciente (3 rondas) y causa 46% a todos los enemigos. Mientras el Templo siga en pie: todo su equipo hace +15% de daño y tiene +15% de Resistencia, al inicio de cada ronda la Luz de Dendera golpea 40% a todos los enemigos, y Ozymandias no puede caer (no baja de 1 HP).',
      efectos: [{ cuando: 'final', accion: { tipo: 'zona', dur: 3, a: 'propio', zona: {
        nombre: 'Ramesseum Tentyris', icono: '🏛️',
        desc: 'su equipo +15% Daño y +15% Resistencia; Luz de Dendera (40% a todos) al inicio de cada ronda; Ozymandias no puede caer',
        bono: { dmgPct: .15, res: .15 },
        alIniciarRonda: { tipo: 'golpeDirecto', nombre: 'Luz de Dendera', pct: .40, color: 0xfde68a, a: 'todosEnemigos' },
        inmortal: true, textoInmortal: '🏛️ ¡El Faraón no cae!',
      } } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/minato.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #34 (2026-10-11). Minato Namikaze, el Destello Amarillo / Cuarto Hokage. Marca a los enemigos con el sello del
// Dios del Trueno Volador (Marca Hiraishin: es una marca, no un debuff) y se teletransporta hacia ellos: al golpear a un marcado
// consume la marca y gana un turno extra (hasta 2 por ronda) y Velocidad. Todos sus golpes escalan por Velocidad. 25% de Bloqueo (esquiva teletransportándose). Las marcas puestas en un movimiento no se consumen en ese mismo.
__e.default = {
  id: 'minato',
  franquicia: 'Naruto', grupos: ['konoha', 'hokage'],   // campaña: temas de las etapas
  nombre: 'Minato Namikaze',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '⚡', color: '#facc15', imagen: 'assets/personajes/minato.webp',
  base: { hp: 680, dmg: 70, spd: 120 },
  extra: { block: .25 },   // Hiraishin: se teletransporta fuera del golpe (25% de Bloqueo)
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Cuarto Hokage',
    desc: 'Al inicio de cada ronda, el aliado más lento gana Celeridad (+30% de Velocidad) por 1 ronda.',
    alIniciarRonda: { tipo: 'efecto', id: 'haste', dur: 1, a: 'aliadoMasLento' },
  },
  pasiva: {
    nombre: 'Destello Amarillo de Konoha',
    desc: 'Se teletransporta fuera de los golpes: 25% de Bloqueo. Cada vez que golpea a un enemigo con su Marca Hiraishin (puesta en un movimiento anterior), la consume: gana 1 turno extra (hasta 2 por ronda) y +5% de Velocidad permanente (hasta +25%).',
    consumeMarca: {
      marca: 'hiraishin', turnoExtra: true, maxPorRonda: 2, texto: 'Hiraishin',
      alConsumir: { tipo: 'bonoPermanente', stat: 'spdPct', pct: .05, tope: .25, a: 'propio' },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kunai Hiraishin', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0xfacc15,
      pct: .37, escala: 'vel', cd: 0,
      desc: 'Lanza 2 kunai de 37% (escala por Velocidad) a enemigos al azar. Cada uno tiene 60% de probabilidad de dejar una Marca Hiraishin (3 rondas).',
      efectos: [{ accion: { tipo: 'marcar', marca: 'hiraishin', dur: 3, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Rasengan', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: 1.65, escala: 'vel', cd: 2, criticoSiObjetivoTiene: 'hiraishin',
      desc: 'Causa 165% (escala por Velocidad). Si el objetivo tiene Marca Hiraishin, Minato aparece a su espalda: crítico seguro.',
    },
    {
      categoria: 'over', nombre: 'Dios del Trueno Volador: Nivel 2', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde047,
      pct: .8, escala: 'vel', cd: 5, cdInicial: 0,
      desc: 'Listo desde el inicio de la partida. Golpea 80% (escala por Velocidad) a todos los enemigos y luego les deja a todos una Marca Hiraishin (3 rondas), sin tirada.',
      efectos: [{ cuando: 'final', accion: { tipo: 'marcar', marca: 'hiraishin', dur: 3, a: 'todosEnemigos' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/antares.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #35 (2026-10-13). Antares, Monarca de la Destrucción y Rey de los Dragones (Solo Leveling). Se alimenta de TODAS
// las Quemaduras de su equipo (contador Destrucción: +3% de daño cada una) y las detona con el Aliento de la Destrucción: cada
// Quemadura hace de golpe todo su daño restante. Miedo del Rey Dragón. Enemigo jurado de Sun Jin Woo (+20% entre ellos).
// Legión de la Destrucción: +8% Daño y HP a todo su equipo por cada aliado que aplica Quemadura (rinde mucho más en equipos de quemadura).
// Forma verdadera (solo como líder): el dragón rojo, Rey de los Dragones. Es permanente y comparte cooldowns.
const reyDragon = {
  nombre: 'Antares, Rey de los Dragones',
  emoji: '🐉', color: '#b91c1c', imagen: 'assets/transformaciones/antares-rey-de-los-dragones.webp',
  base: { hp: 880, dmg: 77, spd: 108 },
  compartirCooldowns: true,
  pasiva: {
    nombre: 'Forma Verdadera del Rey Dragón',
    desc: 'Escamas del Rey Dragón: inmune a Quemadura y recibe −15% de daño de golpes. Conserva la Legión de la Destrucción, el contador de Destrucción (+3% de daño cada una) y la rivalidad con Sun Jin Woo.',
    inmuneA: ['burn'],
    reduccionPropia: { categoria: 'golpe', pct: .15 },
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' },
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 10, efecto: 'destruccion', a: 'propio' },
    danoPorCargas: { efecto: 'destruccion', pct: .03 },
    enemigoJurado: { id: 'sun-jin-woo', bono: .20 },
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .08, hpPct: .08 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Garras del Rey Dragón', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: 1.3, escala: 'dano', cd: 0,
      desc: 'Causa 130% con 60% de probabilidad de aplicar Quemadura 10% (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 2, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Aliento del Rey Dragón', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: 1.1, escala: 'dano', cd: 3,
      desc: 'Causa 110% a todos los enemigos con 80% de probabilidad de Quemadura 10% (3 rondas) a cada uno. Los que ya tenían Quemadura tienen además 40% de probabilidad de Miedo (2 rondas).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .40 } },
        { accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 3, prob: .80 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Aliento de la Destrucción', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      cd: 5, consumeCargas: { pct: .10, efecto: 'destruccion' },
      desc: 'Detona las Quemaduras de todos los enemigos: cada una hace al instante todo el daño que le quedaba y desaparece. +10% por cada Destrucción consumida. Los que sobrevivan quedan con Miedo (2 rondas).',
      efectos: [
        { accion: { tipo: 'detonarDoT', efecto: 'burn', bonoPorCargas: .10, texto: '🐉 ¡Destrucción!' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'fear', dur: 2, a: 'sobrevivientes' } },
      ],
    },
  ],
};

__e.default = {
  id: 'antares',
  franquicia: 'Solo Leveling', grupos: ['monarcas', 'dragones'],   // campaña: temas de las etapas
  nombre: 'Antares',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom'],
  starter: 'blazing',
  emoji: '🐲', color: '#dc2626', imagen: 'assets/personajes/antares.webp',
  base: { hp: 650, dmg: 60, spd: 100 },
  extra: {},
  slots: espacios('argonita', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Dragones',
    desc: 'Los aliados ganan +15% de Daño DoT (sube el % de las Quemaduras, Venenos y Sangrados que apliquen). Despertar del Rey Dragón: siendo líder, al acumular 4 de Destrucción las consume y se transforma para siempre en su Forma Verdadera, el Rey de los Dragones.',
    bonoStat: { dot: .15 },
  },
  pasiva: {
    nombre: 'Monarca de la Destrucción',
    desc: 'Legión de la Destrucción: por cada aliado que aplique Quemadura (máx. 4), todo su equipo gana +8% de Daño y +8% de HP máx. mientras Antares viva. Cada vez que cualquier Quemadura (suya o de un aliado) hace daño a un enemigo, gana 1 de Destrucción (máx. 10): +3% de daño cada una. Enemigo jurado de Sun Jin Woo: le hace +20% de daño.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' },
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 10, efecto: 'destruccion', a: 'propio' },
    danoPorCargas: { efecto: 'destruccion', pct: .03 },
    enemigoJurado: { id: 'sun-jin-woo', bono: .20 },
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .08, hpPct: .08 } },   // Legión de la Destrucción
    transformarConCargas: { efecto: 'destruccion', cargas: 4, soloLider: true },   // Despertar del Rey Dragón (solo como líder)
  },
  transformacion: reyDragon,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamas de la Destrucción', objetivo: 'enemigo', estilo: 'ranged', color: 0xef4444,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Causa 95% con 50% de probabilidad de aplicar Quemadura 8% (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .08, dur: 2, prob: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Miedo del Rey Dragón', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Ruge y lanza fuego a todos: 65% a todos los enemigos con 50% de probabilidad de Quemadura 5% (2 rondas) a cada uno. Los que ya tenían Quemadura tienen además 40% de probabilidad de Miedo (2 rondas).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .40 } },
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .50 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Aliento de la Destrucción', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      cd: 5, consumeCargas: { pct: .10, efecto: 'destruccion' },
      desc: 'Detona las Quemaduras de todos los enemigos: cada una hace al instante todo el daño que le quedaba (su % × las rondas restantes) y desaparece. Consume toda su Destrucción: +10% a la detonación por cada una. Los que sobrevivan quedan con Miedo (2 rondas).',
      efectos: [
        { accion: { tipo: 'detonarDoT', efecto: 'burn', bonoPorCargas: .10, texto: '🐲 ¡Destrucción!' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'fear', dur: 2, a: 'sobrevivientes' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/baran.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #36 (2026-10-14). Baran, Rey de los Demonios y Monarca de las Llamas Blancas (Solo Leveling). Sus rayos dejan
// Carga Eléctrica en los enemigos (contador con dueño, no es debuff): con 2, Sobrecarga = Aturdido sin tirada. La Cadena de
// Relámpagos salta a todos los demás enemigos y el Juicio del Rey Demonio consume las cargas para pegar más y aturdir a los que tenían carga.
__e.default = {
  id: 'baran',
  franquicia: 'Solo Leveling', grupos: ['monarcas', 'demonios'],   // campaña: temas de las etapas
  nombre: 'Baran',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['phantom'],
  emoji: '😈', color: '#6366f1', imagen: 'assets/personajes/baran.webp',
  base: { hp: 720, dmg: 72, spd: 110 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Demonios',
    desc: 'Los aliados hacen +15% de daño a enemigos con algún efecto de Control activo (Aturdimiento, Congelación, Miedo, Confusión, Posesión…).',
    bonoContraControl: .15,
  },
  pasiva: {
    nombre: 'Monarca de las Llamas Blancas',
    desc: 'Cada golpe de Baran deja 1 Carga Eléctrica en el enemigo. Con 2 cargas sufre una Sobrecarga: queda Aturdido (sin tirada de Puntería) y sus cargas se reinician.',
    cargaEnemigo: {
      marca: 'cargaElectrica', max: 2, texto: '⚡ ¡Sobrecarga!',
      alMax: { tipo: 'efecto', id: 'stun', irresistible: true, a: 'objetivo' },
    },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Relámpago Demoníaco', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5b4fc,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% a un enemigo.',
    },
    {
      categoria: 'especial', nombre: 'Cadena de Relámpagos', objetivo: 'enemigo', estilo: 'ranged', color: 0xc7d2fe,
      pct: 1.00, escala: 'dano', cd: 3, salta: { veces: 4, pct: .70, texto: '⚡ ¡Salta el rayo!' },
      desc: 'Causa 100% al objetivo y luego el rayo salta a todos los demás enemigos con 70% cada uno. Cada golpe deja Carga Eléctrica.',
    },
    {
      categoria: 'over', nombre: 'Juicio del Rey Demonio', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0e7ff,
      pct: 1.35, escala: 'dano', cd: 4, cdInicial: 0, bonoPorMarca: { marca: 'cargaElectrica', pct: .25, consume: true },
      desc: 'Listo desde el inicio de la partida. Un rayo blanco cae sobre todos: 135% a todos los enemigos, +25% contra los que tengan Carga Eléctrica (la consume). Los que tenían carga quedan Aturdidos.',
      efectos: [{ cuando: 'antes', condicion: { objetivoMarcaMin: { marca: 'cargaElectrica', min: 1 } }, accion: { tipo: 'efecto', id: 'stun', a: 'objetivo' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/orochimaru.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #37 (2026-10-15). Orochimaru, el Sannin de las Serpientes. Nido de Serpientes: mientras viva, los Venenos de su
// equipo se acumulan hasta 8 (en vez de 5) y se cura con cada Veneno que hace daño (Muda de Piel). Over: Edo Tensei (sin daño):
// reanima hasta 2 aliados caídos, que no pueden morir mientras Orochimaru viva y envenenan con sus golpes. Líder de Otogakure.
// Sello Maldito del Cielo: marca con bono a él y a cada aliado envenenador; su equipo hace +25% a envenenados.
__e.default = {
  id: 'orochimaru',
  franquicia: 'Naruto', grupos: ['sannin', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Orochimaru',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['phantom'],
  starter: 'noxious',
  emoji: '🐍', color: '#4d7c0f', imagen: 'assets/personajes/orochimaru.webp',
  base: { hp: 600, dmg: 50, spd: 95 },
  extra: {},
  slots: espacios('obsidiana', 'yelmo', 'anilloCobre'),

  lider: {
    nombre: 'Señor de Otogakure',
    desc: 'Los aliados ganan +15% de Puntería y +10% de Daño DoT.',
    bonoStat: { acc: .15, dot: .10 },
  },
  pasiva: {
    nombre: 'Nido de Serpientes',
    desc: 'Sello Maldito del Cielo: al empezar la partida, Orochimaru y cada aliado que aplique Veneno reciben el Sello Maldito (+15% de Daño, +12% de HP máx. y +10% de Velocidad toda la partida). Todo su equipo hace +25% de daño a enemigos envenenados. Veneno de Manda: mientras Orochimaru viva, los Venenos que aplique su equipo se acumulan hasta 8 (en vez de 5). Muda de Piel: cada vez que un Veneno hace daño a un enemigo, Orochimaru se cura 2% de su HP máx. (máximo 3 veces por ronda).',
    venenoMax: 8,
    auraContra: { efecto: 'poison', pct: .25 },
    marcaAliadosQueAplican: { efecto: 'poison', marca: 'selloMaldito', bono: { dmgPct: .15, hpPct: .12, spdPct: .10 } },
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'curar', pct: .02, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Manos de Serpiente Ocultas', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0x65a30d,
      pct: .45, escala: 'dano', cd: 0,
      desc: 'Sen\'eijashu: 2 golpes de 45% a enemigos al azar, cada uno con 40% de probabilidad de aplicar Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Espada Kusanagi', objetivo: 'enemigo', estilo: 'melee', color: 0xa3e635,
      pct: 1.35, escala: 'dano', cd: 3,
      desc: 'Causa 135% y aplica 2 Venenos al objetivo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison' } },
        { accion: { tipo: 'efecto', id: 'poison' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Edo Tensei', objetivo: 'propio', estilo: 'support', color: 0x4d7c0f, cd: 5, requiereAliadoCaido: true,
      desc: 'Reanimación Impura (no causa daño). Solo se puede usar si hay al menos un aliado caído. Revive hasta 2 aliados caídos con 50% de su HP máx. Los reanimados no pueden morir mientras Orochimaru viva (se quedan en 1 HP) y sus golpes tienen 30% de probabilidad de aplicar Veneno. Si Orochimaru cae, vuelven a ser mortales.',
      efectos: [{ cuando: 'final', accion: { tipo: 'reanimar', cantidad: 2, hp: .50, marca: 'edoTensei', inmortal: true, textoInmortal: '⚰️ ¡El Edo Tensei lo mantiene en pie!',
        alGolpear: { tipo: 'efecto', id: 'poison', prob: .30 }, a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/ghost-rider.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #38 (2026-10-16). Ghost Rider, el Espíritu de Venganza (Marvel). Su fuego infernal no lo quema: es inmune a
// Quemadura y quien lo golpea arde (Aura de Fuego permanente). Castiga a los pecadores ya quemados (+daño contra ellos), los
// obliga a sentir su propia Quemadura con la Mirada de Penitencia (elige a quien quiera, aunque haya Provocación) y arrasa
// al equipo rival con su motocicleta infernal. Jinetes de las Llamas: rinde más junto a otros quemadores.
__e.default = {
  id: 'ghost-rider',
  franquicia: 'Marvel', grupos: ['espectros', 'fuego'],   // campaña: temas de las etapas
  nombre: 'Ghost Rider',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  starter: 'blazing',
  emoji: '💀', color: '#f97316', imagen: 'assets/personajes/ghost-rider.webp',
  base: { hp: 740, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('lanzaFuego', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Juicio del Espíritu de Venganza',
    desc: 'Los aliados ganan +5% de Daño y, al golpear a un enemigo con Quemadura, +15% de Prob. Crítico y +15% de Daño Crítico.',
    bonoDano: .05,
    bonoCriticoContra: { efecto: 'burn', critRate: .15, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Espíritu de Venganza',
    desc: 'Fuego del Infierno: inmune a Quemadura y con Aura de Fuego permanente (quien lo golpee puede quemarse). Sus golpes hacen +25% de daño a enemigos con Quemadura. Jinetes de las Llamas: por cada aliado que aplique Quemadura (máx. 4), todo su equipo gana +5% de Daño y +5% de Prob. Crítico mientras Ghost Rider viva.',
    inmuneA: ['burn'],
    efectosPermanentes: ['fireAura'],
    bonoContra: { efecto: 'burn', pct: .25 },
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .05, critRate: .05 } },   // Jinetes de las Llamas
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Cadena Infernal', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .5, escala: 'dano', cd: 0,
      salta: { veces: 1, pct: .45, texto: '⛓️ ¡Cadena!' },
      desc: 'Causa 50% y la cadena salta a otro enemigo al azar con 45%. 35% de probabilidad de Quemadura 8% (2 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .08, dur: 2, prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Mirada de Penitencia', objetivo: 'enemigo', estilo: 'ranged', color: 0xfb923c,
      pct: .8, escala: 'dano', cd: 3, ignoraProvocacion: true,
      desc: 'Elige a cualquier enemigo (ignora Provocación y Sigilo). Causa 80%: si tenía Quemadura, siente todo su dolor (la Quemadura hace su daño al instante, sin gastarse) y 60% de probabilidad de Miedo (2 rondas) que no se puede resistir.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .60, irresistible: true } },
      ],
    },
    {
      categoria: 'over', nombre: 'Jinete del Infierno', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: .7, escala: 'dano', cd: 4,
      desc: 'Arrasa al equipo rival con su motocicleta infernal: 70% a todos los enemigos con 75% de probabilidad de Quemadura 12% (3 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .12, dur: 3, prob: .75 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/venom.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #39 (2026-10-16). Venom, el simbionte (Marvel). Hace sangrar, se cura con cada mordida y crece al devorar
// enemigos. Hambre del Simbionte: todo su equipo pega más a los que sangran (sinergia con equipos de Sangrado). Débil al
// fuego: recibe +30% de daño de Quemadura. Líder: Rey de Negro (Eddie Brock como rey de la colmena de simbiontes).
__e.default = {
  id: 'venom',
  franquicia: 'Marvel', grupos: ['simbiontes', 'antiheroes'],   // campaña: temas de las etapas
  nombre: 'Venom',
  rol: 'Daño', rolSecundario: 'Tanque',
  sobres: ['bloodline'],
  emoji: '🕷️', color: '#cbd5e1', imagen: 'assets/personajes/venom.webp',
  base: { hp: 750, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Negro',
    desc: 'La colmena de simbiontes: los aliados ganan +5% de HP máx. y, cada vez que muere un enemigo, todos los aliados se curan 8% de su HP máx.',
    bonoStat: { hpPct: .05 },
    alMorirEnemigo: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .08, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Simbionte',
    desc: 'Hambre del Simbionte: todo su equipo hace +15% de daño a enemigos con Sangrado o Hemorragia. Devorar: al atacar a un enemigo que ya sangraba, le roba 4% de su HP máx. Sus golpes lo curan 10% del daño causado. Débil al fuego: recibe +30% de daño de Quemadura.',
    auraContra: { efecto: ['bleed', 'hemo'], pct: .15 },
    roboSiObjetivoTiene: { efecto: 'bleed', pct: .04 },
    roboVida: .10,
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Zarpazo Simbionte', objetivo: 'enemigo', estilo: 'melee', color: 0x334155,
      pct: .9, escala: 'dano', cd: 0,
      desc: 'Causa 90% con 40% de probabilidad de aplicar Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Tentáculos Simbiontes', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x475569,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Causa 65% a todos los enemigos con 50% de probabilidad de Sangrado a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .50 } }],
    },
    {
      categoria: 'over', nombre: '¡Te Devoraremos!', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: 2.45, escala: 'dano', cd: 4,
      desc: 'Causa 245% y le roba 8% de su HP máx. Si lo mata, se lo come: se cura 19% de su HP máx. y gana +5% de Daño permanente (máx. +20%).',
      efectos: [
        { accion: { tipo: 'robarHP', pct: .08 } },
        { cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .19, a: 'propio' } },
        { cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .05, tope: .20, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/spider-man.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #40 (2026-10-16). Spider-Man (Marvel). El más ágil: su Sentido Arácnido le da Bloqueo y lo saca de los
// ataques de área; sus telarañas ciegan y dejan atrapados (Aturdimiento) a los ya cegados; su equipo castiga a los enemigos
// atrapados (aura +15% contra Aturdimiento o Ceguera) y la Red Arácnida potencia a su equipo por cada aliado que aturde
// (sinergia con equipos de aturdidores). Sin habilidad de líder.
__e.default = {
  id: 'spider-man',
  franquicia: 'Marvel', grupos: ['heroes-urbanos', 'vengadores'],   // campaña: temas de las etapas
  nombre: 'Spider-Man',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // solo en Unbreakable Force
  emoji: '🕸️', color: '#dc2626', imagen: 'assets/personajes/spider-man.webp',
  base: { hp: 640, dmg: 58, spd: 108 },
  extra: { block: .20 },                     // Sentido Arácnido
  slots: espacios('obsidiana', 'botas', 'anilloCobre'),

  pasiva: {
    nombre: 'Sentido Arácnido',
    desc: 'Esquiva casi todo: +20% de Bloqueo y Esquiva Área permanente (los ataques de área no lo alcanzan). Atrapados en la red: todo su equipo hace +15% de daño a enemigos con Aturdimiento o Ceguera. Red Arácnida: por cada aliado que aplique Aturdimiento (máx. 4), todo su equipo gana +3% de Daño y +3% de Velocidad mientras Spider-Man viva.',
    efectosPermanentes: ['aoeDodge'],
    auraContra: { efecto: ['stun', 'blind'], pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'stun', max: 4, bono: { dmgPct: .03, spdPct: .03 } },   // Red Arácnida
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Arácnido', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: .85, escala: 'dano', cd: 0,
      desc: 'Causa 85% con 30% de probabilidad de Ceguera (1 ronda): telaraña a la cara.',
      efectos: [{ accion: { tipo: 'efecto', id: 'blind', dur: 1, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Red de Telaraña', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe2e8f0,
      pct: .56, escala: 'dano', cd: 3,
      desc: 'Causa 56% a todos los enemigos con 40% de probabilidad de Ceguera (2 rondas) a cada uno. Los que ya estaban cegados tienen además 40% de probabilidad de Aturdimiento: quedan pegados a la red.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'blind' }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } },
        { accion: { tipo: 'efecto', id: 'blind', dur: 2, prob: .40 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Balanceo Máximo', objetivo: 'azar', golpes: 5, estilo: 'melee', color: 0x2563eb,
      pct: .56, escala: 'dano', cd: 4, critExtra: .25,
      desc: 'Se columpia por todo el campo: 5 golpes de 56% a enemigos al azar (pueden repetirse), con +25% de Prob. Crítico. Cada golpe tiene 25% de probabilidad de Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/carnage.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #41 (2026-10-16). Carnage, el simbionte asesino (Marvel). Siembra el terror (Miedo) y el caos: hachas y
// tentáculos que hacen sangrar, roba vida y, cada vez que mata, sigue la masacre con un turno extra. Su equipo hace más daño a
// los aterrados (sinergia con equipos que aplican Miedo). Débil al
// fuego, como todo simbionte. Líder: Matanza Máxima (lideró a su banda de villanos en el arco del mismo nombre).
__e.default = {
  id: 'carnage',
  franquicia: 'Marvel', grupos: ['simbiontes', 'villanos'],   // campaña: temas de las etapas
  nombre: 'Carnage',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['phantom', 'bloodline'],
  emoji: '🩸', color: '#b91c1c', imagen: 'assets/personajes/carnage.webp',
  base: { hp: 700, dmg: 75, spd: 108 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Matanza Máxima',
    desc: 'Los aliados ganan +10% de Daño. Cada vez que muere un enemigo, todos los aliados ganan +4% de Daño permanente (máx. +20%).',
    bonoDano: .10,
    alMorirEnemigo: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .04, tope: .20, a: 'todosAliados' },
  },
  pasiva: {
    nombre: 'Simbionte Asesino',
    desc: 'Masacre: cada vez que elimina a un enemigo, gana 1 turno extra (1 por ronda). Sus golpes lo curan 10% del daño causado. Reino del Terror: todo su equipo hace +20% de daño a enemigos con Miedo. Débil al fuego: recibe +30% de daño de Quemadura.',
    gatillo: 'alEliminar', maxPorRonda: 1,
    accion: { tipo: 'turnoExtra', a: 'propio' },
    roboVida: .10,
    auraContra: { efecto: 'fear', pct: .20 },
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Hachas Simbiontes', objetivo: 'enemigo', golpes: 2, estilo: 'melee', color: 0xdc2626,
      pct: .50, escala: 'dano', cd: 0,
      desc: '2 golpes de 50%. Cada uno tiene 30% de probabilidad de aplicar Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Terror Escarlata', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x991b1b,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Tentáculos por todo el campo: 70% a todos los enemigos con 50% de probabilidad de Miedo (2 rondas) a cada uno. Los que ya tenían Miedo además sangran (50%).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'fear' }, accion: { tipo: 'efecto', id: 'bleed', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Matanza', objetivo: 'enemigo', estilo: 'melee', color: 0x7f1d1d,
      pct: 2.60, escala: 'dano', cd: 4, bonoPorDebuffs: { pct: .15 }, sobrante: true,
      desc: 'Causa 260% con +15% por cada tipo de debuff que tenga el objetivo. Si lo mata, el daño que sobró pasa a otro enemigo al azar.',
    },
  ],
};


return __e; })();

__m["datos/personajes/gaara.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #42 (2026-10-16). Gaara del Desierto, Quinto Kazekage (Naruto). Defensa Absoluta: su arena se mueve sola, le
// regenera un Escudo cada ronda y se interpone en los golpes a sus aliados (protector). Ataúd de Arena aturde, Escudo de Arena
// protege a todo el equipo y el Funeral de la Cascada de Arena castiga con la arena acumulada en los Escudos de su equipo.
// Sinergia: protege a atacantes frágiles (equipos de rol Daño). Líder: Quinto Kazekage.
__e.default = {
  id: 'gaara',
  franquicia: 'Naruto', grupos: ['kages', 'jinchuriki', 'arena'],   // campaña: temas de las etapas
  nombre: 'Gaara',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['sacred'],
  emoji: '⏳', color: '#c2410c', imagen: 'assets/personajes/gaara.webp',
  base: { hp: 800, dmg: 45, spd: 82 },
  extra: { armor: .15 },                      // Armadura de Arena
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Quinto Kazekage',
    desc: 'Protege a su aldea: al inicio de cada ronda, el aliado más herido recibe un Escudo del 50% del HP máx. de Gaara (1 ronda).',
    alIniciarRonda: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'aliadoMasHerido' },
  },
  pasiva: {
    nombre: 'Defensa Absoluta',
    desc: 'La arena lo protege sola: al inicio de cada ronda gana un Escudo del 25% de su HP máx. (1 ronda) y recibe en lugar de sus aliados el 20% de cada golpe que les den (con su propia Armadura).',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 1, a: 'propio' },
    protector: { pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ataúd de Arena', objetivo: 'enemigo', estilo: 'ranged', color: 0xd97706,
      pct: .7, escala: 'hp', cd: 0,
      desc: 'Causa 70% (escala por HP) con 25% de probabilidad de Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Escudo de Arena', objetivo: 'todosAliados', estilo: 'support', color: 0xf59e0b,
      cd: 3,
      desc: 'Todos los aliados reciben un Escudo del 50% del HP máx. de Gaara (1 ronda) y él gana Provocación (1 ronda).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 1, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Funeral de la Cascada de Arena', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb45309,
      pct: .7, escala: 'hp', cd: 4,
      desc: 'Causa 70% a todos los enemigos (escala por HP) con 30% de probabilidad de Aturdimiento. Luego la arena reparte al azar entre los enemigos daño igual al 10% de la suma de los Escudos de su equipo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'danoRepartido', base: 'escudosEquipo', pct: .10, paquetes: 10, a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/sasori.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #43 (2026-10-16). Sasori de la Arena Roja, el Maestro Marionetista (Naruto, Akatsuki). Su cuerpo es una
// marioneta: inmune a Veneno y Sangrado. Pelea con marionetas cargadas del veneno más letal de la Arena: la cola de Hiruko,
// la Marioneta del Tercer Kazekage (invocación con Arena de Hierro) y el Ejército de las Cien Marionetas, que hace estallar
// al instante todos los Venenos de los enemigos. Sus golpes pegan más cuantas más acumulaciones de Veneno tenga el objetivo
// (sinergia con equipos de Veneno). Sin habilidad de líder.
__e.default = {
  id: 'sasori',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados', 'arena', 'marionetistas'],   // campaña: temas de las etapas
  nombre: 'Sasori',
  rol: 'Invoker', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  starter: 'noxious',
  emoji: '🎭', color: '#b91c1c', imagen: 'assets/personajes/sasori.webp',
  base: { hp: 650, dmg: 62, spd: 92 },
  extra: {},
  slots: espacios('argonita', 'pechera', 'amuletoPantano'),

  pasiva: {
    nombre: 'Cuerpo de Marioneta',
    desc: 'Su cuerpo es una marioneta: es inmune a Veneno y Sangrado. Veneno de la Arena Roja: sus movimientos de ataque hacen +15% de daño por cada acumulación de Veneno del objetivo (máx. 5).',
    inmuneA: ['poison', 'bleed', 'hemo'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Cola de Hiruko', objetivo: 'enemigo', estilo: 'melee', color: 0x7c2d12,
      pct: 1.05, escala: 'dano', cd: 0, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 105% (+15% por cada Veneno del objetivo, máx. 5) con 50% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Marioneta del Tercer Kazekage', objetivo: 'enemigo', estilo: 'ranged', color: 0x57534e,
      pct: .95, escala: 'dano', cd: 3, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 95% (+15% por cada Veneno del objetivo) con 50% de probabilidad de Veneno e invoca a la Marioneta del Tercer Kazekage (3 turnos): cada turno, Arena de Hierro a todos los enemigos (60%) con 60% de probabilidad de Veneno a cada uno.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .50 } },
        { cuando: 'final', accion: { tipo: 'invocar', key: 'tercerKazekage', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Ejército de las Cien Marionetas', objetivo: 'azar', golpes: 8, estilo: 'ranged', color: 0xb91c1c,
      pct: .32, escala: 'dano', cd: 4, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: '8 golpes de 32% a enemigos al azar (+15% por cada Veneno del objetivo), cada uno con 30% de probabilidad de Veneno. Al final, todos los Venenos de todos los enemigos hacen su daño al instante (todas sus acumulaciones, sin gastarse).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'activarDoT', efecto: 'poison', a: 'todosEnemigos' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/obito-uchiha.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #44 (2026-10-16). Obito Uchiha, el Hombre Enmascarado (Naruto). Kamui: los ataques de área lo atraviesan
// (Esquiva Área permanente) y, una vez por ronda, al recibir un golpe se desvanece en su dimensión (Sigilo hasta el final de la
// ronda). Con su Sharingan confunde y posee a sus enemigos, y su equipo castiga a los controlados (sinergia con control
// mental: Saga, Lich King, Loki, Joker). Plan Ojo de Luna. Líder: Líder de Akatsuki (la manejó desde las sombras como «Madara»).
__e.default = {
  id: 'obito-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'akatsuki', 'renegados'],   // campaña: temas de las etapas
  nombre: 'Obito Uchiha',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '🌀', color: '#ea580c', imagen: 'assets/personajes/obito-uchiha.webp',
  base: { hp: 680, dmg: 62, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'amuletoPantano'),

  lider: {
    nombre: 'Líder de Akatsuki',
    desc: 'Los aliados ganan +10% de Puntería y hacen +10% de daño a enemigos con cualquier efecto de Control. El Verdadero Líder: si Pain es el líder de su equipo y cae, Obito surge como líder (se activa esta habilidad), limpia todos los debuffs de sus aliados, disipa todos los buffs enemigos y cura a sus aliados 30% de su HP máx.',
    bonoStat: { acc: .10 },
    bonoContraControl: .10,
  },
  pasiva: {
    nombre: 'Kamui',
    desc: 'Intangible: los ataques de área no lo alcanzan (Esquiva Área permanente). Una vez por ronda, al recibir un golpe, se desvanece en su dimensión: gana Sigilo hasta el final de esa ronda. Prisioneros del Sharingan: todo su equipo hace +35% de daño a enemigos con Confusión o Posesión. Seguidores del Plan: por cada aliado que aplique Confusión (máx. 4), todo su equipo gana +5% de Daño y +5% de HP máx. mientras Obito viva.',
    efectosPermanentes: ['aoeDodge'],
    gatillo: 'alRecibirGolpe', maxPorRonda: 1,
    accion: { tipo: 'efecto', id: 'stealth', dur: 1, finDeRonda: true, a: 'propio' },
    auraContra: { efecto: ['confuse', 'possess'], pct: .35 },
    sucesorDe: {                                            // El Verdadero Líder de Akatsuki
      id: 'pain', texto: '🌀 ¡Obito surge como el verdadero líder!',
      alSurgir: [
        { tipo: 'limpiar', a: 'todosAliados' },
        { tipo: 'disipar', sinTirada: true, a: 'todosEnemigos' },
        { tipo: 'curar', base: 'hpMaxObjetivo', pct: .30, a: 'todosAliados' },
      ],
    },
    bonoPorAliadosQueAplican: { efecto: 'confuse', max: 4, bono: { dmgPct: .05, hpPct: .05 } },   // Seguidores del Plan
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kamui', objetivo: 'enemigo', estilo: 'melee', color: 0xea580c,
      pct: .9, escala: 'dano', cd: 0,
      desc: 'Causa 90% con 25% de probabilidad de Confusión (1 ronda).',
      efectos: [{ accion: { tipo: 'efecto', id: 'confuse', dur: 1, prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Control del Sharingan', objetivo: 'enemigo', estilo: 'ranged', color: 0xdc2626,
      pct: 1.55, escala: 'dano', cd: 3,
      desc: 'Causa 155% con 40% de probabilidad de Posesión: en su turno ataca a sus propios aliados.',
      efectos: [{ accion: { tipo: 'efecto', id: 'possess', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Plan Ojo de Luna', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      pct: 1.1, escala: 'dano', cd: 5,
      desc: 'Causa 110% a todos los enemigos con 60% de probabilidad de Confusión (2 rondas). Los que ya estaban confundidos tienen además 50% de probabilidad de Posesión.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'confuse' }, accion: { tipo: 'efecto', id: 'possess', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'confuse', dur: 2, prob: .60 } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/deidara.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #45 (2026-10-16). Deidara de Akatsuki (Naruto): «¡El arte es una explosión!». Llena al equipo rival de Bombas
// con su arcilla explosiva y las detona todas con ¡Katsu! (también las de sus aliados). Preparado para futuros bombarderos:
// su equipo pega más a los enemigos con Bomba y gana Daño DoT por cada aliado que aplique Bomba. Sin habilidad de líder.
__e.default = {
  id: 'deidara',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados', 'bombarderos'],   // campaña: temas de las etapas
  nombre: 'Deidara',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '💥', color: '#facc15', imagen: 'assets/personajes/deidara.webp',
  base: { hp: 560, dmg: 50, spd: 90 },
  extra: { acc: .15 },                        // su ojo explorador
  slots: espacios('argonita', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'El Arte es una Explosión',
    desc: 'Arte efímero: todo su equipo hace +15% de daño a enemigos con Bomba. Escuela de explosivos: por cada aliado que aplique Bomba (máx. 4), todo su equipo gana +10% de Daño DoT mientras Deidara viva. Su ojo explorador le da +15% de Puntería.',
    auraContra: { efecto: 'bomb', pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'bomb', max: 4, bono: { dot: .10 } },   // Escuela de explosivos
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Arcilla Explosiva C1', objetivo: 'azar', golpes: 2, estilo: 'ranged', color: 0xfde68a,
      pct: .3, escala: 'dano', cd: 0,
      desc: '2 aves de arcilla de 30% a enemigos al azar (pueden repetirse), cada una con 45% de probabilidad de Bomba.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .45 } }],
    },
    {
      categoria: 'especial', nombre: 'C2: Dragón de Arcilla', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf59e0b,
      pct: .42, escala: 'dano', cd: 3,
      desc: 'Causa 42% a todos los enemigos con 60% de probabilidad de Bomba a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .60 } }],
    },
    {
      categoria: 'over', nombre: '¡Katsu! C4 Karura', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: .6, escala: 'dano', cd: 4,
      desc: 'Causa 60% a todos los enemigos con 40% de probabilidad de Bomba. Al final detona todas las Bombas de todos los enemigos (también las de sus aliados): cada una explota al instante y salpica a los aliados del portador.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bomb', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'detonar', a: 'todosEnemigos' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/broly.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #46 (2026-10-18, diseño "a tu criterio"). Broly, el Saiyajin Legendario: un tanque que se enfurece con cada
// golpe que recibe (Ira) hasta despertar al Super Saiyajin Legendario (permanente). Si lo derriban antes, su furia lo
// levanta y se transforma. Ya transformado, su poder crece sin límite mientras lo golpean. Sin habilidad de líder
// (en su historia nunca dirige: lo controla Paragus).

const brolyLegendario = {
  nombre: 'Broly Super Saiyajin Legendario',
  emoji: '💚', color: '#84cc16', imagen: 'assets/transformaciones/broly-super-sayajin-legendario.webp',
  base: { hp: 890, dmg: 59, spd: 92 },
  extra: { armor: .15 },
  pasiva: {
    nombre: 'Poder Sin Límites',
    desc: 'Cada vez que recibe un golpe gana +3% de Daño permanente (máx. +30%).',
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .03, tope: .30, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lariat Legendario', objetivo: 'enemigo', estilo: 'melee', color: 0x84cc16,
      pct: .8, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 golpes de 80%.',
    },
    {
      categoria: 'especial', nombre: 'Rugido Legendario', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa3e635,
      pct: 1.2, escala: 'dano', cd: 3,
      desc: 'Causa 120% a todos los enemigos con 35% de probabilidad de Miedo (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .35 } }],
    },
    {
      categoria: 'over', nombre: 'Omega Blaster', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4ade80,
      pct: 1.75, escala: 'dano', cd: 5,
      desc: 'Una esfera gigante de energía: 175% a todos los enemigos con 50% de probabilidad de Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .50 } }],
    },
  ],
};

__e.default = {
  id: 'broly',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'villanos'],   // campaña: Guerreros Sayajin y Señores del Caos
  nombre: 'Broly',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: [],  // como Goku y Vegeta: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '💚', color: '#65a30d', imagen: 'assets/personajes/broly.webp',
  base: { hp: 850, dmg: 55, spd: 88 },
  extra: { armor: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Saiyajin Legendario',
    desc: 'Cada golpe que recibe le da 1 de Ira 💢 (máx. 5). Con 5 se transforma para siempre en Broly Super Saiyajin Legendario. La primera vez que caería, su furia lo mantiene en pie con 30% de HP y se transforma.',
    gatillo: 'alRecibirGolpe',
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'iraBroly', a: 'propio' },
    transformarConCargas: { efecto: 'iraBroly', cargas: 5 },
    ultimoAliento: { hp: .30, transformar: true },
  },
  transformacion: brolyLegendario,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Salvaje', objetivo: 'enemigo', estilo: 'melee', color: 0x65a30d,
      pct: 1.3, escala: 'dano', cd: 0,
      desc: 'Causa 130% y gana 1 de Ira.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'iraBroly', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Incontrolable', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x84cc16, cd: 3,
      pct: 1.1, escala: 'dano',
      desc: 'Estalla de rabia: 110% a todos los enemigos, gana Provocación (2 rondas) y un Escudo del 100% de su HP máx. (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Bola de Energía Explosiva', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 2.3, escala: 'dano', cd: 4,
      desc: 'Causa 230% y gana 2 de Ira.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'iraBroly', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/gohan.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #47 (2026-10-18, diseño "a tu criterio"). Gohan: el guerrero que pelea por proteger. Escuda y libera a su
// equipo y aturde a los enemigos. Cada vez que protege acumula Potencial; si cae un aliado, su poder oculto estalla
// (como con Piccolo en Super Hero) y despierta para siempre como Gohan Bestia. Sin habilidad de líder.

const gohanBestia = {
  nombre: 'Gohan Bestia',
  emoji: '🐺', color: '#c4b5fd', imagen: 'assets/transformaciones/gohan-bestia.webp',
  base: { hp: 670, dmg: 63, spd: 96 },
  extra: { acc: .20 },
  pasiva: {
    nombre: 'Instinto de Bestia',
    desc: 'Cada vez que cae un aliado, todos los aliados se curan 10% de su HP máx. y ganan Furia (2 rondas).',
    gatillo: 'alMorirAliado',
    accion: { tipo: 'multiple', a: 'todosAliados', acciones: [{ tipo: 'curar', pct: .10, base: 'hpMaxObjetivo' }, { tipo: 'efecto', id: 'dmgUp', dur: 2 }] },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Bestial', objetivo: 'enemigo', estilo: 'melee', color: 0xc4b5fd,
      pct: .65, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 golpes de 65%, cada uno con 30% de probabilidad de Aturdir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Protectora', objetivo: 'todosAliados', estilo: 'support', color: 0xa78bfa, cd: 3,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Gohan (2 rondas) y Furia (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Cañón Especial Bestia', objetivo: 'enemigo', estilo: 'ranged', color: 0xe9d5ff,
      pct: 2.00, escala: 'dano', cd: 5,
      desc: 'Un rayo que lo atraviesa todo: 200% con 40% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .40 } }],
    },
  ],
};

__e.default = {
  id: 'gohan',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: Guerreros Sayajin
  nombre: 'Gohan',
  rol: 'Support', rolSecundario: 'Control',
  sobres: [],  // como Goku, Vegeta y Broly: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🥋', color: '#7c3aed', imagen: 'assets/personajes/gohan.webp',
  base: { hp: 620, dmg: 55, spd: 98 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Poder Oculto',
    desc: 'Cada vez que protege a su equipo gana 1 de Potencial 🔥 (máx. 3). Si cae un aliado, su poder estalla: gana 3. Con 3 despierta para siempre como Gohan Bestia.',
    gatillo: 'alMorirAliado',
    accion: { tipo: 'ganarCargas', cantidad: 3, max: 3, efecto: 'potencialGohan', a: 'propio' },
    transformarConCargas: { efecto: 'potencialGohan', cargas: 3 },
  },
  transformacion: gohanBestia,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Masenko', objetivo: 'enemigo', estilo: 'ranged', color: 0xfacc15,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Causa 95% con 25% de probabilidad de Aturdir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Escudo del Maestro', objetivo: 'todosAliados', estilo: 'support', color: 0x8b5cf6, cd: 3,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Gohan (2 rondas) y se les quita el Control. Gana 1 de Potencial.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'Control', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 3, efecto: 'potencialGohan', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Kamehameha Padre e Hijo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.35, escala: 'dano', cd: 5,
      desc: 'Causa 135% a todos los enemigos con 35% de probabilidad de Aturdir. Gana 1 de Potencial.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 3, efecto: 'potencialGohan', a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/trunks.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #48 (2026-10-18, diseño "a tu criterio"). Trunks del Futuro: el espadachín que viajó en el tiempo para
// cambiar un futuro sin esperanza. No aplica DoTs: castiga a los enemigos que ya los tienen (todo su equipo hace más daño
// contra ellos) y cada Daño en el tiempo de sus aliados le da Esperanza. También se alimenta de las transformaciones de su
// equipo. Con 5 de Esperanza se transforma para siempre en Super Saiyajin. Sin habilidad de líder.
const DOTS = ['burn', 'poison', 'bleed', 'hemo'];

const trunksSuperSaiyajin = {
  nombre: 'Trunks Super Saiyajin',
  emoji: '⚔️', color: '#facc15', imagen: 'assets/transformaciones/trunks-super-sayajin.webp',
  base: { hp: 740, dmg: 76, spd: 118 },
  extra: { critRate: .10 },
  pasiva: {
    nombre: 'Esperanza del Futuro',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Quemadura, Veneno, Sangrado o Hemorragia, y los DoT de su equipo hacen +30% de daño. Cuando un aliado se transforma, ese aliado gana Furia y Celeridad (2 rondas).',
    auraContra: { efecto: DOTS, pct: .40 },
    auraDoT: .30,
    alTransformarseAliado: { tipo: 'multiple', a: 'objetivo', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'haste', dur: 2 }] },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada del Futuro', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: .65, escala: 'dano', cd: 0, golpes: 2, bonoPorDebuffs: { pct: .15 },
      desc: '2 cortes de 65%, +15% por cada tipo distinto de debuff del objetivo.',
    },
    {
      categoria: 'especial', nombre: 'Masenko Ha', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.15, escala: 'dano', cd: 3, bonoPorDebuffs: { pct: .20 },
      desc: '115% a todos los enemigos, +20% contra cada uno por tipo distinto de debuff. Todos los aliados ganan Furia (2 rondas).',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } }],
    },
    {
      categoria: 'over', nombre: 'Shining Sword Attack', objetivo: 'enemigo', estilo: 'melee', color: 0xfef08a,
      pct: 2.5, escala: 'dano', cd: 5, bonoPorDebuffs: { pct: .25 },
      desc: 'Lo corta en pedazos y lo remata con una ráfaga: 250%, +25% por cada tipo distinto de debuff del objetivo.',
    },
  ],
};

__e.default = {
  id: 'trunks',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: Guerreros Sayajin
  nombre: 'Trunks',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: [],  // como los demás Sayajin: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🗡️', color: '#8b5cf6', imagen: 'assets/personajes/trunks.webp',
  base: { hp: 680, dmg: 68, spd: 112 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Guerrero del Futuro',
    desc: 'Todo su equipo hace +30% de daño a enemigos con Quemadura, Veneno, Sangrado o Hemorragia, y los DoT de su equipo hacen +15% de daño. Cada vez que un DoT hace daño a un enemigo gana 1 de Esperanza ✨ (máx. 2 por ronda); cuando un aliado se transforma gana 2 y ese aliado gana Furia y Celeridad (2 rondas). Con 5 se transforma para siempre en Super Saiyajin.',
    auraContra: { efecto: DOTS, pct: .30 },
    auraDoT: .15,
    gatillo: 'alDanoDoT', filtro: { en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'esperanzaTrunks', a: 'propio' },
    alTransformarseAliado: [{ tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'esperanzaTrunks', a: 'propio' },
      { tipo: 'multiple', a: 'objetivo', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'haste', dur: 2 }] }],
    transformarConCargas: { efecto: 'esperanzaTrunks', cargas: 5 },
  },
  transformacion: trunksSuperSaiyajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Corte del Futuro', objetivo: 'enemigo', estilo: 'melee', color: 0xa78bfa,
      pct: 1.15, escala: 'dano', cd: 0, bonoPorDebuffs: { pct: .15 },
      desc: 'Causa 115%, +15% por cada tipo distinto de debuff del objetivo.',
    },
    {
      categoria: 'especial', nombre: 'Burning Attack', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .95, escala: 'dano', cd: 3, bonoPorDebuffs: { pct: .15 },
      desc: '95% a todos los enemigos, +15% contra cada uno por tipo distinto de debuff. Gana 1 de Esperanza.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'esperanzaTrunks', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Heat Dome Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde68a,
      pct: 2.05, escala: 'dano', cd: 5, bonoPorDebuffs: { pct: .20 },
      desc: '205%, +20% por cada tipo distinto de debuff del objetivo. Gana 2 de Esperanza.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'esperanzaTrunks', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/hashirama.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #49 (2026-10-18, diseño "a tu criterio"). Hashirama Senju, el Primer Hokage y Dios de los Shinobi:
// Estilo Madera para atrapar (Aturdir) y someter el chakra enemigo (Disipar), regeneración sin sellos (Regeneración
// permanente) y el Buda de las Mil Manos. Fundador de Konoha (habilidad de líder). Rival eterno de Madara.

__e.default = {
  id: 'hashirama',
  franquicia: 'Naruto', grupos: ['konoha', 'hokage', 'senju'],   // campaña: Héroes de la Hoja
  nombre: 'Hashirama Senju',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: [],  // como los demás de Konoha: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🌳', color: '#65a30d', imagen: 'assets/personajes/hashirama.webp',
  base: { hp: 840, dmg: 50, spd: 88 },
  extra: { res: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Primer Hokage',
    desc: 'Todos los aliados tienen +15% de HP máx. y +10% de Resistencia.',
    bonoStat: { hpPct: .15, res: .10 },
  },
  pasiva: {
    nombre: 'Regeneración del Senju',
    desc: 'Tiene Regeneración permanente: se cura 10% de su HP máx. al inicio de su turno, sin sellos. Rival eterno de Madara: le hace +20% de daño.',
    efectosPermanentes: ['regen'],
    enemigoJurado: { id: 'madara-uchiha', bono: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Estacas de Madera', objetivo: 'enemigo', estilo: 'ranged', color: 0x65a30d,
      pct: .8, escala: 'dano', cd: 0,
      desc: 'Causa 80% con 30% de probabilidad de Aturdir (la madera lo atrapa).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Nacimiento de un Bosque Profundo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4d7c0f,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Un bosque brota del suelo: 65% a todos los enemigos, cada uno pierde 1 buff (la madera absorbe su chakra). Todos los aliados se curan 7% de su HP máx.',
      efectos: [
        { accion: { tipo: 'disipar', cantidad: 1 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .07, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Buda de las Mil Manos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.35, escala: 'dano', cd: 5,
      desc: 'Shinsūsenju: mil palmas gigantes caen sobre todos los enemigos: 135% a cada uno con 30% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .30 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/tobirama.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #50 (2026-10-18, diseño "a tu criterio"). Tobirama Senju, el Segundo Hokage: maestro del Estilo Agua
// (sus técnicas congelan al enemigo en este juego), creador del Dios del Trueno Volador y sensor de chakra. Control de
// Congelación y soporte: su equipo se vuelve más rápido y certero por cada aliado que congela. Habilidad de líder: fue Hokage.

__e.default = {
  id: 'tobirama',
  franquicia: 'Naruto', grupos: ['konoha', 'hokage', 'senju', 'hielo'],   // campaña: Héroes de la Hoja y Frío Eterno
  nombre: 'Tobirama Senju',
  rol: 'Control', rolSecundario: 'Support',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🌊', color: '#2563eb', imagen: 'assets/personajes/tobirama.webp',
  base: { hp: 650, dmg: 58, spd: 110 },
  extra: { acc: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Voluntad del Segundo Hokage',
    desc: 'Todos los aliados tienen +10% de Velocidad y +15% de Puntería.',
    bonoStat: { spdPct: .10, acc: .15 },
  },
  pasiva: {
    nombre: 'Sensor del Segundo Hokage',
    desc: 'Por cada otro aliado cuyos movimientos aplican Congelación (máx. 4), todo su equipo gana +4% de Velocidad y +4% de Puntería mientras Tobirama viva. Todo su equipo hace +8% de daño a enemigos con Congelación.',
    bonoPorAliadosQueAplican: { efecto: 'freeze', max: 4, bono: { spdPct: .04, acc: .04 } },
    auraContra: { efecto: 'freeze', pct: .08 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Gran Bala de Agua', objetivo: 'enemigo', estilo: 'ranged', color: 0x3b82f6,
      pct: 1.4, escala: 'dano', cd: 0,
      desc: 'Causa 140% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Dragón de Agua', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.15, escala: 'dano', cd: 3,
      desc: 'Un dragón de agua arrasa el campo: 115% a todos los enemigos con 45% de probabilidad de Congelación. Todos los aliados ganan Celeridad (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Corte del Dios del Trueno Volador', objetivo: 'enemigo', estilo: 'melee', color: 0xbfdbfe,
      pct: 3.4, escala: 'dano', cd: 5, criticoSiObjetivoTiene: 'freeze',
      desc: 'Se teletransporta junto al enemigo y lo corta: 340%, crítico seguro si está Congelado. Aplica Mega Congelación con 60% de probabilidad.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .60 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/el-pinguino.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #51 (2026-10-18; rediseñado 2026-10-25 como DoTer de Bombas). El Pingüino (Oswald Cobblepot): el Rey del
// Inframundo de Gótica y traficante de armas. Su paraguas ametralladora todavía escupe fuego (Quemadura, por eso sigue en
// Blazing Legion), pero su sello son los explosivos: paraguas-bomba y su ejército de pingüinos con cohetes (Batman Returns).
// Sus explosivos de contrabando potencian las Bombas que el enemigo ya llevaba encima (×1.5) y su Over las hace estallar.
// Sinergia con Deidara (bombarderos). Sin habilidad de líder.
__e.default = {
  id: 'el-pinguino',
  franquicia: 'DC', grupos: ['villanos-de-gotham', 'bombarderos'],   // campaña: Ciudad Gótica y Señores del Caos
  nombre: 'El Pingüino',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐧', color: '#475569', imagen: 'assets/personajes/el-pinguino.webp',
  base: { hp: 600, dmg: 50, spd: 85 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Explosivos de Contrabando',
    desc: 'Cuando golpea a un enemigo que ya tenía Bombas antes de su ataque, cada una de esas Bombas hace ×1.5 de daño al explotar (una vez por Bomba en cada ataque). Sus golpes hacen +10% de daño a enemigos con Bomba.',
    potenciaBombas: { factor: 1.5 },
    bonoContra: { efecto: 'bomb', pct: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Paraguas Ametralladora', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: .43, escala: 'dano', cd: 0, golpes: 3,
      desc: '3 disparos de 43%, cada uno con 20% de probabilidad de Quemadura (el paraguas también lanza fuego).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .20 } }],
    },
    {
      categoria: 'especial', nombre: 'Paraguas Explosivo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .65, escala: 'dano', cd: 3,
      desc: 'Lanza paraguas-bomba sobre todo el campo: 65% a todos los enemigos con 55% de probabilidad de Bomba.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .55 } }],
    },
    {
      categoria: 'over', nombre: 'Ejército de Pingüinos Cohete', objetivo: 'azar', golpes: 6, estilo: 'ranged', color: 0xfb923c,
      pct: .32, escala: 'dano', cd: 5,
      desc: 'Sus pingüinos con cohetes en la espalda caen sobre el campo: 6 explosiones de 32% a enemigos al azar, cada una con 30% de probabilidad de Bomba. Al final detona todas las Bombas de los enemigos (las que ya tenían salen potenciadas ×1.5).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bomb', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'detonar', a: 'todosEnemigos' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/natsu-dragneel.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #52 (2026-10-19, rol DoTer de Quemadura; el resto "a tu criterio"). Natsu Dragneel, el Dragon Slayer de
// Fuego de Fairy Tail, criado por el dragón Igneel. El fuego no lo quema: se lo come. Cada Quemadura que arde en los enemigos
// (suya o de sus aliados) lo alimenta con Llamas del Dragón (+daño), y su Over las libera en el Modo Dragón de Fuego y Rayo.
// Sin habilidad de líder.
__e.default = {
  id: 'natsu-dragneel',
  franquicia: 'Fairy Tail', grupos: ['dragones', 'fuego'],   // campaña: Jinetes de Dragones (Dragon Slayer) y Legión de Fuego
  nombre: 'Natsu Dragneel',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐲', color: '#ef4444', imagen: 'assets/personajes/natsu-dragneel.webp',
  base: { hp: 620, dmg: 58, spd: 98 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Dragon Slayer de Fuego',
    desc: 'Inmune a Quemadura. Se come las llamas: cada vez que una Quemadura hace daño a un enemigo gana 1 Llama del Dragón 🔥 (máx. 2 por ronda, tope 5). Cada Llama le da +5% de daño. Su Over las consume. Emblema de Fairy Tail: cada aliado (incluido él) cuyos movimientos aplican Quemadura gana +25% de Daño y +15% de HP máx. todo el combate.',
    inmuneA: ['burn'],
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'llamaNatsu', a: 'propio' },
    danoPorCargas: { efecto: 'llamaNatsu', pct: .05 },
    marcaAliadosQueAplican: { efecto: 'burn', marca: 'emblemaFairyTail', bono: { dmgPct: .25, hpPct: .15 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño de Hierro del Dragón de Fuego', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: .49, escala: 'dano', cd: 0,
      desc: 'Causa 49% con 35% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Rugido del Dragón de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .42, escala: 'dano', cd: 3,
      desc: 'Un torrente de fuego desde su boca: 42% a todos los enemigos con 50% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .50 } }],
    },
    {
      categoria: 'over', nombre: 'Rugido del Dragón de Fuego y Rayo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf0abfc,
      pct: .6, escala: 'dano', cd: 5, consumeCargas: { pct: .10, efecto: 'llamaNatsu' },
      desc: 'Modo Dragón de Fuego y Rayo: 60% a todos los enemigos con 50% de probabilidad de Quemadura y 25% de Aturdir. Consume sus Llamas del Dragón: +10% de daño por cada una.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'stun', prob: .25 } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/kyo-kusanagi.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #53 (2026-10-19, rol DoTer de Quemadura; el resto "a tu criterio"). Kyo Kusanagi, heredero del clan
// Kusanagi y campeón de The King of Fighters: sus llamas sagradas sellaron a Orochi. Su distintivo frente a los demás
// DoTers de Quemadura es el ritmo de combo: cada Quemadura que arde en los enemigos le recarga antes su Desperation Move
// (Orochinagi), así que con un equipo de fuego lo lanza mucho más seguido y arrastra a todo su equipo con Furia y Celeridad. Sin habilidad de líder.
__e.default = {
  id: 'kyo-kusanagi',
  franquicia: 'The King of Fighters', grupos: ['guerreros', 'fuego'],   // campaña: Guerreros Legendarios y Legión de Fuego
  nombre: 'Kyo Kusanagi',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🔥', color: '#ea580c', imagen: 'assets/personajes/kyo-kusanagi.webp',
  base: { hp: 600, dmg: 55, spd: 97 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Llamas del Clan Kusanagi',
    desc: 'Ritmo de combo: cada vez que una Quemadura (suya o de sus aliados) hace daño a un enemigo, el cooldown de su Over baja 1 ronda (máx. 3 por ronda). Hace +20% de daño a enemigos con Quemadura.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'reducirCooldown', categorias: ['over'], cantidad: 1, a: 'propio' },
    bonoContra: { efecto: 'burn', pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '100 Shiki: Oniyaki', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .45, escala: 'dano', cd: 0, golpes: 2,
      desc: 'Un gancho ascendente envuelto en llamas: 2 golpes de 45%, cada uno con 25% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Combo Aragami · Konokizu · Yanosabi', objetivo: 'enemigo', estilo: 'melee', color: 0xfb923c,
      pct: .41, escala: 'dano', cd: 3, golpes: 3,
      desc: 'Su cadena de combo clásica: 3 golpes de 41% al mismo enemigo, cada uno con 40% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Ura 108 Shiki: Orochinagi', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.05, escala: 'dano', cd: 5,
      desc: 'Carga las llamas sagradas y las desata en una ola: 105% a todos los enemigos con 60% de probabilidad de Quemadura. Todos los aliados ganan Furia y Celeridad (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/iori-yagami.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #54 (2026-10-19, diseño "a tu criterio" con pasiva de contraataque). Iori Yagami, heredero del clan Yagami
// y rival eterno de Kyo Kusanagi: llamas púrpura (Quemadura) y zarpazos de su sangre de Orochi (Sangrado). Contraataca a
// cualquiera que lo ataque, y castiga a los que sangran. Sin habilidad de líder.
__e.default = {
  id: 'iori-yagami',
  franquicia: 'The King of Fighters', grupos: ['guerreros', 'fuego'],   // campaña: Guerreros Legendarios y Legión de Fuego
  nombre: 'Iori Yagami',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌙', color: '#7e22ce', imagen: 'assets/personajes/iori-yagami.webp',
  base: { hp: 680, dmg: 68, spd: 106 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre de Orochi',
    desc: 'Hasta 2 veces por ronda: cuando un enemigo lo ataca, Iori contraataca con su Básico (un contraataque no provoca otro). Todo su equipo hace +20% de daño a enemigos con Sangrado. Rival eterno de Kyo Kusanagi: le hace +20% de daño.',
    gatillo: 'alSerAtacado', maxPorRonda: 2,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', contraataque: true, a: 'atacante' },
    auraContra: { efecto: 'bleed', pct: .20 },
    enemigoJurado: { id: 'kyo-kusanagi', bono: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '108 Shiki: Yami Barai', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: .8, escala: 'dano', cd: 0,
      desc: 'Una llama púrpura que corre por el suelo: 80% con 30% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: '127 Shiki: Aoi Hana', objetivo: 'enemigo', estilo: 'melee', color: 0x9333ea,
      pct: .5, escala: 'dano', cd: 3, golpes: 3,
      desc: 'Tres zarpazos encadenados: 3 golpes de 50%, cada uno con 40% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Kin 1211 Shiki: Ya Otome', objetivo: 'enemigo', estilo: 'melee', color: 0xc084fc,
      pct: .32, escala: 'dano', cd: 5, golpes: 8,
      desc: 'Las Ocho Doncellas: 8 zarpazos de 32% al mismo enemigo, cada uno con 25% de probabilidad de Sangrado, y lo remata en una explosión de llamas púrpura (Quemadura).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bleed', prob: .25 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'burn', a: 'objetivo' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/sillad.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #55 (2026-10-19, Control de Congelación / Support; el resto "a tu criterio"). Sillad, el Monarca de la
// Escarcha (Solo Leveling): rey de los Elfos de Hielo y uno de los Monarcas que combatieron a los Gobernantes. Su frío no
// lo afecta, bendice a los suyos que dominan el hielo y su Over levanta su reino de escarcha eterna, que congela al enemigo
// ronda tras ronda. Habilidad de líder: es un rey que comanda su ejército de elfos de hielo.
__e.default = {
  id: 'sillad',
  franquicia: 'Solo Leveling', grupos: ['monarcas', 'hielo'],   // campaña: Los Monarcas y Frío Eterno
  nombre: 'Sillad',
  rol: 'Control', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#38bdf8', imagen: 'assets/personajes/sillad.webp',
  base: { hp: 680, dmg: 60, spd: 98 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Elfos de Hielo',
    desc: 'Todos los aliados tienen +10% de HP máx. y +10% de Puntería.',
    bonoStat: { hpPct: .10, acc: .10 },
  },
  pasiva: {
    nombre: 'Monarca de la Escarcha',
    desc: 'Inmune a Congelación. Bendición de la Escarcha: cada aliado (incluido él) cuyos movimientos aplican Congelación gana +10% de Daño y +6% de Velocidad todo el combate.',
    inmuneA: ['freeze'],
    marcaAliadosQueAplican: { efecto: 'freeze', marca: 'escarchaSillad', bono: { dmgPct: .10, spdPct: .06 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lanza de la Escarcha', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc,
      pct: .57, escala: 'dano', cd: 0,
      desc: 'Causa 57% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ventisca del Monarca', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbae6fd, cd: 3,
      pct: .45, escala: 'dano',
      desc: 'Una ventisca helada: 45% a todos los enemigos con 40% de probabilidad de Congelación. Todos los aliados ganan un Escudo del 50% del HP máx. de Sillad (1 ronda).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Reino de la Escarcha Eterna', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: .53, escala: 'dano', cd: 5,
      desc: 'Congela el campo de batalla: 53% a todos los enemigos con 50% de probabilidad de Congelación, y levanta su reino (3 rondas): su equipo tiene +10% de Resistencia, y al inicio de cada ronda cada enemigo tiene 15% de probabilidad de Congelarse.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .50 } },
        { cuando: 'final', accion: { tipo: 'zona', dur: 3, a: 'propio', zona: {
          nombre: 'Reino de la Escarcha Eterna', icono: '🏔️',
          desc: 'su equipo +10% Resistencia; al inicio de cada ronda, 15% de Congelación a cada enemigo',
          bono: { res: .10 },
          alIniciarRonda: { tipo: 'efecto', id: 'freeze', prob: .15, a: 'todosEnemigos' },
        } } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/rakan.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #56 (2026-10-19, diseño "a tu criterio"). Rakan, el Monarca de los Colmillos y Rey de las Bestias
// (Solo Leveling): el depredador más veloz entre los Monarcas. Desgarra con garras y colmillos (Sangrado) y cada presa que
// sangra le entrega su velocidad. Su aullido desata a la manada. Habilidad de líder: es el rey de las bestias.
__e.default = {
  id: 'rakan',
  franquicia: 'Solo Leveling', grupos: ['monarcas'],   // campaña: Los Monarcas
  nombre: 'Rakan',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐺', color: '#b91c1c', imagen: 'assets/personajes/rakan.webp',
  base: { hp: 700, dmg: 70, spd: 115 },
  extra: { critRate: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de las Bestias',
    desc: 'Todos los aliados tienen +8% de Velocidad y +8% de Prob. Crítico.',
    bonoStat: { spdPct: .08, critRate: .08 },
  },
  pasiva: {
    nombre: 'Monarca de los Colmillos',
    desc: 'Depredador: cada vez que golpea a un enemigo con Sangrado (1 vez por movimiento) le roba 4% de Velocidad para siempre (tope total 40%). Hace +10% de daño a enemigos con Sangrado.',
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'bleed' }, unaVezPorMovimiento: true,
    accion: { tipo: 'robarVelocidad', pct: .04, tope: .40, a: 'objetivo' },
    bonoContra: { efecto: 'bleed', pct: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Colmillos del Rey Bestia', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: .27, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 mordidas de 27%, cada una con 30% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Aullido de la Manada', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf59e0b,
      pct: .33, escala: 'dano', cd: 3,
      desc: 'Su aullido convoca a la manada: 33% a todos los enemigos con 45% de probabilidad de Sangrado. Todos los aliados ganan Furia (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bleed', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Garras del Monarca de los Colmillos', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: .21, escala: 'dano', cd: 5, golpes: 5,
      desc: 'Una ráfaga de zarpazos a velocidad imposible: 5 golpes de 21% al mismo enemigo, cada uno con 40% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/muzan-kibutsuji.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #57 (2026-10-19, DoTer de Veneno / Support regenerador; Infectar pedido en la ficha, el resto "a tu
// criterio"). Muzan Kibutsuji, el Rey de los Demonios (Kimetsu no Yaiba): su sangre convierte y envenena a quien la toca
// (Infectar permanente) y regenera a sus Lunas Demoníacas. Cuando lo llevan al borde de la muerte despierta su Forma
// Final. Habilidad de líder: comanda a las Doce Lunas Demoníacas.

const muzanFormaFinal = {
  nombre: 'Muzan, Forma Final',
  emoji: '🩸', color: '#be123c', imagen: 'assets/transformaciones/muzan-forma-final.webp',
  base: { hp: 760, dmg: 67, spd: 105 },
  extra: {},
  pasiva: {
    nombre: 'Cuerpo del Rey Demonio',
    desc: 'Conserva Infectar. Al inicio de cada ronda se cura 5% de su HP máx. por cada enemigo envenenado (regenera con la sangre de sus víctimas).',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'curar', pct: .05, base: 'hpMaxObjetivo', porEnemigoCon: 'poison', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Brazos Óseos', objetivo: 'azar', estilo: 'melee', color: 0xbe123c,
      pct: .20, escala: 'dano', cd: 0, golpes: 3,
      desc: '3 latigazos de 20% a enemigos al azar, cada uno con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Mar de Sangre', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x9f1239,
      pct: .45, escala: 'dano', cd: 3,
      desc: '45% a todos los enemigos con 55% de probabilidad de Veneno. Todos los aliados se curan 6% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .55 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .06, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Mil Látigos del Rey Demonio', objetivo: 'azar', estilo: 'melee', color: 0xf43f5e,
      pct: .20, escala: 'dano', cd: 5, golpes: 6,
      desc: '6 latigazos de 20% a enemigos al azar, cada uno con 45% de probabilidad de Veneno. Todos los aliados ganan Regeneración (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'regen', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};

__e.default = {
  id: 'muzan-kibutsuji',
  franquicia: 'Kimetsu no Yaiba', grupos: ['demonios', 'villanos'],
  nombre: 'Muzan Kibutsuji',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🎩', color: '#881337', imagen: 'assets/personajes/muzan-kibutsuji.webp',
  base: { hp: 620, dmg: 55, spd: 103 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Demonios',
    desc: 'Todos los aliados tienen +8% de HP máx. y +10% de Daño DoT.',
    bonoStat: { hpPct: .08, dot: .10 },
  },
  pasiva: {
    nombre: 'Sangre de Muzan',
    desc: 'Tiene Infectar permanente: quien lo golpee recibe Veneno sin tirada. La primera vez que va a caer queda con 15% de HP y despierta para siempre su Forma Final.',
    efectosPermanentes: ['infect'],
    ultimoAliento: { hp: .15, transformar: true },
  },
  transformacion: muzanFormaFinal,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Látigo de Carne', objetivo: 'enemigo', estilo: 'ranged', color: 0x9f1239,
      pct: .55, escala: 'dano', cd: 0,
      desc: 'Causa 55% con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Sangre del Rey Demonio', objetivo: 'todosAliados', estilo: 'support', color: 0xe11d48, cd: 3,
      desc: 'Comparte su sangre con los suyos: todos los aliados se curan 6% de su HP máx. y ganan Regeneración (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .06, base: 'hpMaxObjetivo', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'regen', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Látigos de Sangre', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf43f5e,
      pct: .55, escala: 'dano', cd: 5,
      desc: 'Látigos que salen de todo su cuerpo: 55% a todos los enemigos con 60% de probabilidad de Veneno. Todos los aliados se curan 5% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .05, base: 'hpMaxObjetivo', a: 'todosAliados' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/poison-ivy.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #58 (2026-10-19, envenenadora y aplicadora de Sangrado que brilla con Hemorragias; el resto "a tu
// criterio"). Poison Ivy (Pamela Isley), la reina de las plantas de Gótica: espinas que desgarran (Sangrado), toxinas
// vegetales (Veneno) y feromonas que doblegan la voluntad (Posesión). Sus enredaderas beben de las Hemorragias abiertas:
// cada una que sangra a un enemigo le inyecta más toxina, y todo su equipo castiga a los que tienen Hemorragia.
__e.default = {
  id: 'poison-ivy',
  franquicia: 'DC', grupos: ['villanos-de-gotham'],   // campaña: Ciudad Gótica y Señores del Caos
  nombre: 'Poison Ivy',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom', 'bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🌿', color: '#16a34a', imagen: 'assets/personajes/poison-ivy.webp',
  base: { hp: 590, dmg: 52, spd: 92 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Reina de las Plantas',
    desc: 'Enredaderas sedientas: hasta 3 veces por ronda, cuando una Hemorragia hace daño a un enemigo, le inyecta 1 Veneno sin tirada. Todo su equipo hace +30% de daño a enemigos con Hemorragia.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'hemo', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' },
    auraContra: { efecto: 'hemo', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Látigo de Espinas', objetivo: 'enemigo', estilo: 'ranged', color: 0x15803d,
      pct: 1.3, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 latigazos de 130%, cada uno con 40% de probabilidad de Sangrado (si ya sangra, puede abrirse en Hemorragia).',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Jardín Venenoso', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 2.05, escala: 'dano', cd: 3,
      desc: 'Esporas tóxicas cubren el campo: 205% a todos los enemigos con 55% de probabilidad de Veneno. Las espinas abren las heridas: el Sangrado de cada enemigo se convierte en Hemorragia (sin tirada), y los que tienen Hemorragia reciben además 1 Veneno sin tirada.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .55 } },
        { condicion: { objetivoTiene: 'bleed' }, accion: { tipo: 'hemorragia' } },
        { condicion: { objetivoTiene: 'hemo' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true } },
      ],
    },
    {
      categoria: 'over', nombre: 'Beso de la Hiedra', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 5.00, escala: 'dano', cd: 5,
      desc: 'Las enredaderas lo atrapan y le abren las heridas: 500%, su Sangrado se convierte en Hemorragia (sin tirada) y tiene 40% de probabilidad de Posesión por el beso venenoso.',
      efectos: [
        { accion: { tipo: 'hemorragia' } },
        { accion: { tipo: 'efecto', id: 'possess', prob: .40 } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/ermac.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #59 (2026-10-19, "a tu criterio" solo con mecánicas que ya existen). Ermac (Mortal Kombat): un guerrero
// hecho de miles de almas fundidas por la hechicería de Shao Kahn. "Somos muchos": cuando cae, las almas lo reconstruyen
// (revivir, como Wukong). Su energía de almas es verde y corrosiva (Veneno), su telequinesis levanta y estrella al enemigo
// (Aturdir) y su Tormenta de Almas les arranca la vida (robar HP). Sin habilidad de líder.
__e.default = {
  id: 'ermac',
  franquicia: 'Mortal Kombat', grupos: [],   // campaña: Torneo de Mortal Kombat
  nombre: 'Ermac',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '👻', color: '#15803d', imagen: 'assets/personajes/ermac.webp',
  base: { hp: 580, dmg: 50, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Somos Muchos',
    desc: 'Las almas que lo forman lo reconstruyen: una vez por partida, al caer vuelve al combate 3 turnos después con 40% de su HP máx. Todo su equipo hace +30% de daño a enemigos con Veneno.',
    revivir: { turnos: 3, hp: .40 },
    auraContra: { efecto: 'poison', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Telequinético', objetivo: 'enemigo', estilo: 'ranged', color: 0x22c55e,
      pct: .8, escala: 'dano', cd: 0,
      desc: 'Un golpe de energía de almas: 80% con 35% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Levitación Telequinética', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x4ade80,
      pct: .58, escala: 'dano', cd: 3,
      desc: 'Levanta a todos los enemigos y los estrella contra el suelo: 58% a cada uno con 45% de probabilidad de Veneno y 25% de Aturdir.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .45 } },
        { accion: { tipo: 'efecto', id: 'stun', prob: .25 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Tormenta de Almas', objetivo: 'azar', estilo: 'ranged', color: 0x86efac,
      pct: .39, escala: 'dano', cd: 5, golpes: 6,
      desc: 'Libera las almas que lo forman: 6 impactos de 39% a enemigos al azar, cada uno con 35% de probabilidad de Veneno. Al final les arranca la vida: roba 5% del HP máx. de cada enemigo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'robarHP', pct: .05, a: 'todosEnemigos' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/shinobu-kocho.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #60 (2026-10-19, DoTer de Veneno y Support que se cura a sí misma; veneno propio persistente pedido en la
// ficha, el resto "a tu criterio"). Shinobu Kocho, la Pilar del Insecto (Kimetsu no Yaiba): sin fuerza para decapitar
// demonios, los mata con aguijones de veneno de glicinia. Durante años ingirió ese veneno hasta volver su propio cuerpo
// letal para Doma. Siempre está envenenada (Veneno propio que vuelve si se le acaba o se lo limpian); cada vez que ese
// veneno la daña se cura con su medicina, y mientras lo lleva en la sangre sus aguijones inyectan dosis garantizadas.
// Técnicas: Respiración del Insecto (Mushi no Kokyū). Sin habilidad de líder.
__e.default = {
  id: 'shinobu-kocho',
  franquicia: 'Kimetsu no Yaiba', grupos: ['cazadores-de-demonios'],   // campaña: Cazadores
  nombre: 'Shinobu Kocho',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦋', color: '#a855f7', imagen: 'assets/personajes/shinobu-kocho.webp',
  base: { hp: 550, dmg: 48, spd: 105 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Cuerpo de Glicinia',
    desc: 'Empieza envenenada con su propio veneno de glicinia; si se le termina o se lo limpian, vuelve a envenenarse al inicio de la ronda siguiente. Cada vez que su Veneno la daña, se cura 10% de su HP máx. (su medicina de la Finca Mariposa). Pilar del Insecto: todo su equipo hace +22% de daño a enemigos con Veneno.',
    efectoPropio: { id: 'poison' },
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'propio' },
    accion: { tipo: 'curar', pct: .10, base: 'hpMaxObjetivo', a: 'propio' },
    auraContra: { efecto: 'poison', pct: .22 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Danza de la Mariposa: Capricho', objetivo: 'enemigo', estilo: 'melee', color: 0xc084fc,
      pct: .8, escala: 'dano', cd: 0, golpes: 3,
      desc: 'Chō no Mai: Tawamure. 3 aguijones de 80%, cada uno con 30% de probabilidad de Veneno. Si Shinobu está envenenada, el último aguijón inyecta además 1 Veneno sin tirada.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .30 } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Danza de la Libélula: Hexágono de Ojo Compuesto', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: .56, escala: 'dano', cd: 3, golpes: 6,
      desc: 'Seirei no Mai: Fukugan Rokkaku. 6 aguijones de 56% al mismo enemigo, cada uno con 35% de probabilidad de Veneno. Luego se cura 27% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .27, base: 'hpMaxObjetivo', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Danza de la Abeja: Picadura Verdadera', objetivo: 'enemigo', estilo: 'melee', color: 0xe9d5ff,
      pct: 3.35, escala: 'dano', cd: 5,
      desc: 'Hachi Kiba no Mai: Makoto Hayai. Un aguijón a velocidad imposible: 335%. Si Shinobu está envenenada, le inyecta 3 Venenos sin tirada y todos los Venenos del objetivo hacen su daño al instante.',
      efectos: [
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', accion: { tipo: 'activarDoT', efecto: 'poison', a: 'objetivo' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/mr-freeze.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #61 (2026-10-20, diseño "a tu criterio"). Mr. Freeze (Victor Fries, DC): el criobiólogo que solo
// sobrevive dentro de su traje criogénico (Aura Gélida permanente: resiste los golpes y congela a quien lo toca), con su
// pistola congelante y su obsesión por salvar a Nora. El calor es su punto débil (recibe más daño de Quemadura). Tanque
// que provoca al enemigo para que choque contra su traje. Sin habilidad de líder.
__e.default = {
  id: 'mr-freeze',
  franquicia: 'DC', grupos: ['villanos-de-gotham', 'hielo'],   // campaña: Ciudad Gótica, Señores del Caos y Frío Eterno
  nombre: 'Mr. Freeze',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🥶', color: '#67e8f9', imagen: 'assets/personajes/mr-freeze.webp',
  base: { hp: 780, dmg: 45, spd: 80 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Traje Criogénico',
    desc: 'Tiene Aura Gélida permanente: recibe −20% de daño de los golpes y quien lo golpee tiene 50% de probabilidad de recibir Congelación. Sin el frío no sobrevive: recibe +30% de daño de Quemadura.',
    efectosPermanentes: ['frostAura'],
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Pistola Congelante', objetivo: 'enemigo', estilo: 'ranged', color: 0x67e8f9,
      pct: .55, escala: 'dano', cd: 0,
      desc: 'Un rayo criogénico: 55% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ráfaga Criogénica', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa5f3fc,
      pct: .35, escala: 'dano', cd: 3,
      desc: 'Barre el campo con su pistola: 35% a todos los enemigos con 40% de probabilidad de Congelación. Gana Provocación (2 rondas): los enemigos tienen que atacar su traje.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Cero Absoluto', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: .70, escala: 'dano', cd: 5,
      desc: 'Lleva el campo de batalla al cero absoluto: 70% a todos los enemigos con 60% de probabilidad de Congelación (Mega Congelación si ya estaban congelados).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/baruka.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #62 (2026-10-20, Congelación y Mega Congelación; el resto "a tu criterio"). Baruka (Solo Leveling): el
// jefe de los Elfos de Hielo de la Puerta Roja, al servicio del Monarca de la Escarcha. Su arma, las Dagas de Baruka, y
// una velocidad que dejó atrás a casi todos los cazadores: si es el más rápido del campo actúa dos veces por ronda, y sus
// tormentas de hielo congelan y ralentizan al enemigo (le roban Velocidad) para que nadie lo alcance. Sin habilidad de líder.
__e.default = {
  id: 'baruka',
  franquicia: 'Solo Leveling', grupos: ['hielo'],   // campaña: Frío Eterno
  nombre: 'Baruka',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🗡️', color: '#3b82f6', imagen: 'assets/personajes/baruka.webp',
  base: { hp: 640, dmg: 62, spd: 108 },
  extra: { critRate: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Jefe de los Elfos de Hielo',
    desc: 'El más veloz de la Puerta Roja: si es el personaje más rápido de todo el campo, gana un turno extra (una vez por ronda).',
    turnoExtraSiMasRapido: true,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Dagas de Baruka', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: .65, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 cortes de 65% con sus dagas heladas, cada uno con 25% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Tormenta de Hielo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: .9, escala: 'dano', cd: 3,
      desc: 'Una ventisca de los Elfos de Hielo: 90% a todos los enemigos con 40% de probabilidad de Congelación. A cada enemigo congelado le roba 5% de Velocidad para siempre (tope total 30%).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { condicion: { objetivoTiene: 'freeze' }, accion: { tipo: 'robarVelocidad', pct: .05, tope: .30 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Danza de las Dagas Heladas', objetivo: 'enemigo', estilo: 'melee', color: 0xbfdbfe,
      pct: .7, escala: 'dano', cd: 5, golpes: 4, criticoSiObjetivoTiene: 'freeze',
      desc: 'Desaparece y reaparece a su espalda: 4 cortes de 70%, crítico seguro si el objetivo está Congelado, cada uno con 30% de probabilidad de Congelación (Mega si ya lo estaba).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .30 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/bjorn-ironside.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #63 (2026-10-20, tanque defensivo y support de grandes escudos según su HP máx., sinergia con equipos de
// Congelación sin congelar él; el resto "a tu criterio"). Bjorn Ironside (Vikings): hijo de Ragnar, rey de Kattegat, al
// que llamaron "Costado de Hierro" porque ninguna arma lo hería. Levanta el muro de escudos para su gente y se crece en el
// invierno del norte: cada aliado que congela al enemigo endurece a todo su equipo (más HP máx., y por eso escudos más
// grandes). Habilidad de líder: rey de Kattegat.
__e.default = {
  id: 'bjorn-ironside',
  franquicia: 'Vikings', grupos: ['reyes', 'guerreros'],   // campaña: Los Reyes y Guerreros Legendarios
  nombre: 'Bjorn Ironside',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🛡️', color: '#64748b', imagen: 'assets/personajes/bjorn-ironside.webp',
  base: { hp: 790, dmg: 48, spd: 84 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Kattegat',
    desc: 'Todos los aliados tienen +10% de HP máx. y +5% de Armadura.',
    bonoStat: { hpPct: .10, armor: .05 },
  },
  pasiva: {
    nombre: 'Costado de Hierro',
    desc: 'Ninguna arma lo hiere: recibe −15% de daño de los golpes. Invierno del Norte: por cada otro aliado cuyos movimientos aplican Congelación (máx. 4), todo su equipo tiene +3% de HP máx. mientras Bjorn viva (y sus escudos crecen con su HP).',
    reduccionPropia: { categoria: 'golpe', pct: .15 },
    bonoPorAliadosQueAplican: { efecto: 'freeze', max: 4, bono: { hpPct: .03 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada de Ironside', objetivo: 'enemigo', estilo: 'melee', color: 0x94a3b8,
      pct: .8, escala: 'dano', cd: 0,
      desc: 'Causa 80% y gana un Escudo del 50% de su HP máx. (1 ronda).',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Muro de Escudos', objetivo: 'todosAliados', estilo: 'support', color: 0x60a5fa, cd: 3,
      desc: 'Levanta el muro de escudos vikingo: todos los aliados ganan un Escudo del 50% del HP máx. de Bjorn (2 rondas), y él gana Provocación (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Saqueo del Mediterráneo', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xcbd5e1,
      pct: 1.00, escala: 'dano', cd: 5,
      desc: 'Lleva a sus guerreros al saqueo: 100% a todos los enemigos, y todos los aliados ganan un Escudo del 100% del HP máx. de Bjorn (2 rondas).',
      efectos: [{ cuando: 'final', accion: { tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'todosAliados' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/aokiji.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #64 (2026-10-20, Frostborn; el resto "a tu criterio"). Kuzan "Aokiji" (One Piece): ex Almirante de la
// Marina y usuario de la Hie Hie no Mi, una fruta Logia: su cuerpo es hielo, los golpes lo atraviesan y su propio frío no
// lo afecta. Ice Block: Partisan lanza picas de hielo, Ice Time congela todo lo que toca y Ice Age congela el campo de
// batalla entero (como el mar en Marineford y en Punk Hazard). Su "Justicia Holgazana": pelea sin prisa (lento) pero
// cuando actúa, congela. Sin habilidad de líder.
__e.default = {
  id: 'aokiji',
  franquicia: 'One Piece', grupos: ['hielo'],   // campaña: Frío Eterno
  nombre: 'Aokiji',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#0ea5e9', imagen: 'assets/personajes/aokiji.webp',
  base: { hp: 700, dmg: 65, spd: 100 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Hie Hie no Mi (Logia)',
    desc: 'Su cuerpo es hielo: recibe −20% de daño de los golpes (lo atraviesan) y es inmune a Congelación.',
    reduccionPropia: { categoria: 'golpe', pct: .20 },
    inmuneA: ['freeze'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ice Block: Partisan', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc,
      pct: .75, escala: 'dano', cd: 0, golpes: 2,
      desc: 'Lanza picas de hielo: 2 impactos de 75%, cada uno con 25% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Ice Time', objetivo: 'enemigo', estilo: 'melee', color: 0xbae6fd,
      pct: 2.15, escala: 'dano', cd: 3,
      desc: 'Lo toca y lo congela de pies a cabeza: 215% con 55% de probabilidad de Mega Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .55 } }],
    },
    {
      categoria: 'over', nombre: 'Ice Age', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 2.00, escala: 'dano', cd: 5,
      desc: 'Congela todo el campo de batalla: 200% a todos los enemigos con 60% de probabilidad de Congelación (Mega si ya estaban congelados).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/doomsday.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial #65 (2026-10-21, Tanque; el resto "a tu criterio", fiel al lore). Doomsday (DC): el monstruo creado en
// Krypton a base de morir y renacer, el que mató a Superman. Evolución reactiva: cada golpe que recibe lo endurece (más
// Armadura y Daño permanentes) y, si cae, vuelve a levantarse conservando todo lo que se adaptó. Espolones de hueso que
// desgarran (Sangrado). Sin habilidad de líder: es una fuerza de destrucción, no un líder.
__e.default = {
  id: 'doomsday',
  franquicia: 'DC', grupos: ['villanos'],   // campaña: Ciudad Gótica (DC) y Señores del Caos
  nombre: 'Doomsday',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦴', color: '#64748b', imagen: 'assets/personajes/doomsday.webp',
  base: { hp: 850, dmg: 55, spd: 88 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Evolución Reactiva',
    desc: 'Hasta 3 veces por ronda: cada golpe que recibe lo adapta y gana +2% de Armadura y +2% de Daño permanentes (máx. +30% cada uno). La primera vez que cae, se levanta 2 turnos después con 50% de HP y conserva todo lo que se adaptó.',
    gatillo: 'alRecibirGolpe', maxPorRonda: 3,
    accion: { tipo: 'multiple', a: 'propio', acciones: [
      { tipo: 'bonoPermanente', stat: 'armor', pct: .02, tope: .30 },
      { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .02, tope: .30 },
    ] },
    revivir: { turnos: 2, hp: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puños de Hueso', objetivo: 'enemigo', estilo: 'melee', color: 0x94a3b8,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Golpea con sus espolones de hueso: 95% con 30% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Embestida Imparable', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x64748b,
      pct: .75, escala: 'dano', cd: 3,
      desc: 'Arrasa todo a su paso: 75% a todos los enemigos y gana Provocación (2 rondas): quiere que lo golpeen para seguir adaptándose.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'El Día del Juicio', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 2.3, escala: 'dano', cd: 5,
      desc: 'El golpe que derribó a Superman: 230% con 40% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .40 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/escanor.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-27; Sacred Aegis; sim: 50.0% contra equipos al azar). Escanor, el León del Pecado del Orgullo
// (Nanatsu no Taizai): tanque que crece con cada daño que recibe (marcas The One: +HP máx.) hasta convertirse en The One
// (12 marcas): Provocación permanente, se cura con el daño de los enemigos con Quemadura Solar y sus movimientos se potencian.
// Sin habilidad de líder (no es líder en su historia).
__e.default = {
  id: 'escanor',
  franquicia: 'Nanatsu no Taizai', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Escanor',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦁', color: '#f59e0b', imagen: 'assets/personajes/escanor.webp',
  base: { hp: 800, dmg: 55, spd: 85 },
  extra: { armor: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'The One',
    desc: 'Cada vez que recibe daño de cualquier fuente gana 1 marca de The One (máx. 12); cada marca le da +10% de HP máx. (el HP actual sube lo mismo). Con 12 marcas gana Provocación permanente y, mientras la tenga, se cura el 50% del daño que le hacen los enemigos con Quemadura Solar.',
    cargasAlRecibirDano: { efecto: 'theOne', max: 12 },
    bonoPorCarga: { efecto: 'theOne', stat: 'hpPct', pct: .10 },
    alMaxCargas: { efecto: 'theOne', texto: '☀️ ¡THE ONE!', accion: { tipo: 'efecto', id: 'taunt', permanente: true, a: 'propio' } },
    curaAlRecibirDe: { efecto: 'solarBurn', siPropio: 'taunt', pct: .50, texto: '☀️ ¡Absorbe el daño!' },
    aura: { tipo: 'solar', efecto: 'theOne', desde: 6, max: 12 },   // solo visual: la carta empieza a arder con 6 marcas y estalla en llamaradas solares con 12
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Sol Cruel', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: .85, escala: 'hp', cd: 0,
      desc: 'Causa 85% (escala por HP). Si el objetivo tiene Quemadura Solar, Escanor gana 1 marca de The One. Con 12 marcas golpea también a otro enemigo al azar (85%).',
      efectos: [
        { condicion: { objetivoTiene: 'solarBurn' }, accion: { tipo: 'ganarCargas', efecto: 'theOne', max: 12, a: 'propio' } },
        { cuando: 'final', condicion: { propioCargasMin: { efecto: 'theOne', min: 12 } }, accion: { tipo: 'golpeDirecto', nombre: 'Sol Cruel', pct: .85, escala: 'hp', a: 'otroEnemigoAzar' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Prominencia Loca', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfbbf24,
      pct: .9, escala: 'hp', cd: 2,
      desc: 'Causa 90% (escala por HP) a todos los enemigos con 60% de probabilidad de aplicar Quemadura Solar (2 rondas). Con 12 marcas de The One, Escanor gana un turno extra.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60 } },
        { cuando: 'final', condicion: { propioCargasMin: { efecto: 'theOne', min: 12 } }, accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Lanza Divina de Escanor', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: 2.4, escala: 'hp', cd: 4, sobrante: true,
      desc: 'Causa 240% (escala por HP). Si mata al objetivo, el daño sobrante pasa a otro enemigo al azar. Con 12 marcas de The One suma daño igual al 25% del HP máx. que ganó con sus marcas.',
      bonoPorHpGanado: { pct: .25, si: { propioCargasMin: { efecto: 'theOne', min: 12 } } },
    },
  ],
};


return __e; })();

__m["datos/personajes/meliodas.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-27; Phantom of Chaos; sim: 51.1% contra equipos al azar, 57.2% como líder). Meliodas, el Dragón del Pecado de la Ira (Nanatsu no Taizai), capitán de los Siete Pecados
// Capitales: contraataca cuando golpean a sus aliados, devuelve los debuffs (Full Counter), acumula el daño recibido en la
// Marca del Demonio y lo libera, y crece con cada curación enemiga. Su Over "cura" a los enemigos: con Quemadura Solar,
// esa curación se vuelve daño.
__e.default = {
  id: 'meliodas',
  franquicia: 'Nanatsu no Taizai', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Meliodas',
  rol: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐉', color: '#7c3aed', imagen: 'assets/personajes/meliodas.webp',
  base: { hp: 730, dmg: 75, spd: 112 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Fullcounter Attack',
    desc: 'Cuando un enemigo le aplica un debuff a un aliado, 30% de probabilidad de que Meliodas aplique una copia (misma intensidad y duración) a un enemigo al azar, con su Tirada de Puntería. Las copias no se vuelven a copiar.',
    copiarDebuffAliado: { prob: .30 }, texto: '⚔️ ¡Full Counter!',
  },
  pasiva: {
    nombre: 'Dragón de la Ira',
    desc: 'Cuando un enemigo golpea a un aliado (o a él) con un ataque de un objetivo, 50% de probabilidad de contraatacarlo con uno de sus movimientos disponibles al azar, que entra en cooldown (máx. 1 por ronda; no con Control). Cada curación que recibe un enemigo (también la que la Quemadura Solar vuelve daño) le da +1% de Daño permanente (máx. +50%).',
    gatillo: 'alGolpeAliado', prob: .50, maxPorRonda: 1,
    accion: { tipo: 'usarMovimiento', categoria: 'disponible', gastaCooldown: true, contraataque: true, a: 'atacante' },
    bonoPorCuracionEnemiga: { stat: 'dmgPct', pct: .01, tope: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamas del Purgatorio', objetivo: 'enemigo', estilo: 'melee', color: 0x7c3aed,
      pct: .85, cd: 0,
      desc: 'Causa 85% con 60% de probabilidad de aplicar Quemadura Solar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Contra Venganza', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: 1.60, cd: 2,
      desc: 'Causa 160%. Libera todo el daño acumulado en su Marca del Demonio sobre un enemigo al azar (ignora Armadura) y gana una Marca del Demonio nueva, que acumula todo el daño que reciba.',
      efectos: [{ cuando: 'final', accion: { tipo: 'liberarAcumulado', marca: 'marcaDemonio', sinArmadura: true, texto: '😈 ¡Contra Venganza!', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Mil Cortes Divinos', objetivo: 'azar', golpes: 10, estilo: 'melee', color: 0xc084fc,
      pct: .30, cd: 5,
      desc: '10 golpes de 30% a enemigos al azar. Cada golpe cura a todo el equipo enemigo un 5% del HP máx. del golpeado (con Quemadura Solar, esa curación les hace daño). La IA solo lo usa si al menos 2 enemigos tienen Quemadura Solar.',
      iaMinEnemigosCon: { efecto: 'solarBurn', min: 2 },
      efectos: [{ accion: { tipo: 'curar', base: 'hpMaxGolpeado', pct: .05, a: 'todosEnemigos' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/marik-ishtar.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-28; Phantom of Chaos; sim: 54.3% contra equipos al azar, 59.2% como líder). Marik Ishtar (Yu-Gi-Oh!), líder de los Cazadores Raros: invoca monstruos al azar cada turno,
// sacrifica el Huevo del Sol (o 3 monstruos) para traer al Dragón Alado de Ra y, herido con Ra en el campo, se funde con él
// en Ra Modo Fénix (permanente): inmune a debuffs, combina Quemadura y Quemadura Solar, y cambia su habilidad de líder.

const raModoFenix = {
  nombre: 'Ra Modo Fénix',
  emoji: '🔥', color: '#f59e0b', imagen: 'assets/transformaciones/ra-modo-fenix.webp',
  base: { hp: 670, dmg: 68, spd: 88 },
  extra: {},
  lider: {
    nombre: 'Dios Definitivo del Sol',
    desc: 'Cuando la Quemadura Solar le hace daño a un enemigo, ese daño se reparte como curación entre los aliados vivos.',
    curaPorQuemaduraSolar: true,
  },
  pasiva: {
    nombre: 'Fénix Invencible',
    desc: 'Inmune a debuffs. Cada golpe a un enemigo con algún debuff le da +5% de Daño Crítico permanente (máx. +100%). Cuando una Quemadura daña a un enemigo con Quemadura Solar, ese enemigo recibe una "curación" igual a ese daño (la Quemadura Solar la vuelve daño).',
    inmuneA: ['debuff'],
    acumulaCriticoContra: { efecto: 'debuff', valor: .05, tope: 1, stats: ['critDmg'] },
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos', objetivoTiene: 'solarBurn' },
    accion: { tipo: 'curar', base: 'dano', pct: 1, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fuego Negro', objetivo: 'enemigo', estilo: 'ranged', color: 0xf59e0b,
      pct: 1.75, cd: 0,
      desc: 'Causa 175%. Si el objetivo tenía Quemadura Solar, le aplica Quemadura 10% (2 rondas); si tenía Quemadura, le aplica Quemadura Solar (2 rondas).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'solarBurn' }, accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 2 } },
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'solarBurn', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Cañón de las Llamas del Sol', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfbbf24,
      pct: 1.75, cd: 2,
      desc: 'Causa 175% a todos los enemigos y les baja 3% de HP máx. por cada debuff que tenían (para toda la partida; máx. −30% en total).',
      efectos: [{ accion: { tipo: 'reducirHpMax', pct: .03, porDebuffs: true, tope: .30 } }],
    },
    {
      categoria: 'over', nombre: 'Incineración de Fénix Divino', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: 2.9, cd: 4,
      desc: 'Causa 290% a todos los enemigos y activa al instante el daño de sus Quemaduras. Si alguno tenía Quemadura Solar, después lanza un Fuego Negro a un enemigo al azar.',
      efectos: [
        { accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'solarBurn' }, accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { azar: 1 } } },
      ],
    },
  ],
};

__e.default = {
  id: 'marik-ishtar',
  franquicia: 'Yu-Gi-Oh!', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Marik Ishtar',
  rol: 'Invocador', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '👁️', color: '#a855f7', imagen: 'assets/personajes/marik-ishtar.webp',
  base: { hp: 620, dmg: 58, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'El Reino de las Sombras',
    desc: 'Cuando un aliado golpea a un enemigo con un movimiento de un objetivo o de varios golpes (no de área), 50% de probabilidad de sumarle 1 turno de cooldown a su Especial u Over (una tirada por movimiento y enemigo).',
    cooldownAlGolpear: { prob: .50, cantidad: 1, categorias: ['especial', 'over'] },
  },
  pasiva: {
    nombre: 'Duelista Retorcido',
    desc: 'Al inicio de cada uno de sus turnos invoca un monstruo al azar (máx. 3; si está lleno, reemplaza al de menor duración, nunca al Dragón Alado de Ra). Si su HP queda en 50% o menos con el Dragón Alado de Ra en el campo, se funde con él y renace con toda su vida como Ra Modo Fénix (para siempre).',
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'invocarAzar', tabla: 'monstruosMarik', a: 'propio' },
    transformarSi: { hpMenor: .50, invocacion: 'raAlado', consumir: true, hp: 1 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de las Sombras', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: 1.6, cd: 0,
      desc: 'Causa 160% e invoca un monstruo al azar.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocarAzar', tabla: 'monstruosMarik', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Ataque Directo', objetivo: 'enemigo', estilo: 'melee', color: 0x7c3aed,
      pct: 2.55, cd: 2,
      desc: 'Causa 255%. Todas sus invocaciones repiten su efecto al aparecer y atacan de inmediato.',
      efectos: [{ cuando: 'final', accion: { tipo: 'potenciarInvocaciones', conAparecer: true, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Canto del Dios del Sol', objetivo: 'propio', estilo: 'support', color: 0xfacc15,
      cd: 1, requiereInvocaciones: { key: 'huevoSol', o: 3, oActiva: 'raAlado' }, iaMinEnemigosCon: { efecto: 'solarBurn', min: 1, siInvocacion: 'raAlado' },
      desc: 'Sin el Dragón Alado de Ra: se cura 4% de su HP máx. por cada enemigo con Quemadura Solar, sacrifica el Huevo del Sol (o, si no lo tiene, 3 invocaciones) e invoca a Ra; requiere el Huevo del Sol o 3 invocaciones. Con Ra ya en el campo: no sacrifica nada y esa curación es para todos los aliados.',
      efectos: [
        { cuando: 'final', condicion: { propioSinInvocacion: 'raAlado' }, accion: { tipo: 'curar', pct: .04, escala: 'hpMax', porEnemigoCon: 'solarBurn', a: 'propio' } },
        { cuando: 'final', condicion: { propioInvocacion: 'raAlado' }, accion: { tipo: 'curar', pct: .04, escala: 'hpMax', porEnemigoCon: 'solarBurn', a: 'todosAliados' } },
        { cuando: 'final', condicion: { propioSinInvocacion: 'raAlado' }, accion: { tipo: 'sacrificarInvocar', sacrificio: 'huevoSol', o: 3, key: 'raAlado', a: 'propio' } },
      ],
    },
  ],
  transformacion: raModoFenix,
};


return __e; })();

__m["datos/personajes/yorichi.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-29; Phantom of Chaos; sim: 52.3% contra equipos al azar, 47.6% como líder). Yorichi Tsugikuni (Demon Slayer), creador de la Respiración del Sol: marca a los enemigos con
// Quemadura Solar, acelera sus cooldowns al golpear a los marcados y remata con las 13 Posturas del Sol.
__e.default = {
  id: 'yorichi',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios'],   // campaña: temas de las etapas
  nombre: 'Yorichi',
  rol: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '☀️', color: '#dc2626', imagen: 'assets/personajes/yorichi.webp',
  base: { hp: 720, dmg: 75, spd: 115 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Marca de los Cazadores',
    desc: 'Los aliados ganan +8% de Puntería por cada enemigo con Quemadura Solar.',
    bonoPorEfecto: { efecto: 'solarBurn', stat: 'acc', valor: .08 },
  },
  pasiva: {
    nombre: 'Mundo Transparente',
    desc: 'Gana +5% de Daño Crítico por cada enemigo con Quemadura Solar.',
    bonoPorEfecto: { efecto: 'solarBurn', stat: 'critDmg', valor: .05 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Primera y Última Postura del Sol', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 1.15, cd: 0,
      desc: 'Causa 115% y aplica Quemadura Solar (2 rondas). Si el objetivo ya tenía Quemadura Solar, baja 1 turno el cooldown de su Especial y su Over.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'solarBurn' }, accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['especial', 'over'], a: 'propio' } },
        { accion: { tipo: 'efecto', id: 'solarBurn', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Respiración Solar', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xf97316,
      pct: 1.45, cd: 2,
      desc: 'Causa 145% a todos los enemigos y les disipa 1 buff.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Las 13 Posturas del Sol', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: .36, cd: 5, golpes: 13,
      desc: '13 golpes de 36% al mismo enemigo. Cada crítico baja 1 turno el cooldown de este movimiento. Si el objetivo tenía Quemadura Solar, gana un turno extra.',
      efectos: [
        { cuando: 'critico', accion: { tipo: 'reducirCooldown', cantidad: 1, categorias: ['over'], a: 'propio' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'solarBurn' }, accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/tengen.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-30). Tengen Uzui, el Pilar del Sonido (Demon Slayer): ex-shinobi, el más veloz y vistoso de los
// Pilares. Tanque bombardero: tiene Provocación permanente y cada golpe suyo hace estallar las Bombas que el enemigo ya
// llevaba (su "partitura"). Su Over siembra Bombas que estallan en cadena ×2. Sinergia con Deidara y El Pingüino.
// Sim 2026-10-30: 53.6% vs azar (51.0% como líder) · 74.2% con Deidara y El Pingüino (el usuario aceptó ~72.5%).
__e.default = {
  id: 'tengen',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'bombarderos'],   // campaña: temas de las etapas
  nombre: 'Tengen',
  rol: 'Tanque', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  emoji: '💥', color: '#e879f9', imagen: 'assets/personajes/tengen.webp',
  base: { hp: 800, dmg: 52, spd: 95 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Pilar del Sonido',
    desc: 'Cada vez que estalla una Bomba en un enemigo, todos sus aliados ganan un Escudo del 25% del HP máx. de Tengen (2 rondas).',
    escudoPorBomba: { pct: .25, dur: 2 },
  },
  pasiva: {
    nombre: 'Al Ritmo de la Partitura',
    desc: 'Tiene Provocación permanente (no se puede disipar). Cada golpe de Tengen hace estallar al instante las Bombas que el objetivo tenga.',
    efectosPermanentes: ['taunt'],
    gatillo: 'alGolpear', filtro: { en: 'enemigos', objetivoTiene: 'bomb' },
    accion: { tipo: 'detonar', a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rugido', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf0abfc,
      pct: .55, escala: 'hp', cd: 0,
      desc: 'Causa 55% (escala por HP) a todos los enemigos y hace estallar sus Bombas. Cada enemigo que tenía Bomba tiene 35% de probabilidad de quedar Aturdido.',
      efectos: [{ condicion: { objetivoTeniaAntes: 'bomb' }, accion: { tipo: 'efecto', id: 'stun', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Sentencia de Muerte', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .85, escala: 'hp', cd: 3,
      desc: 'Causa 85% (escala por HP) a todos los enemigos con 40% de probabilidad de Bomba a cada uno. Por cada Bomba colocada, Tengen gana +5% de Armadura permanente (máx. +50%).',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .40,
        alAcertar: { tipo: 'bonoPermanente', stat: 'armor', pct: .05, tope: .50, a: 'propio' } } }],
    },
    {
      categoria: 'over', nombre: 'Sinfonía Estridente', objetivo: 'azar', golpes: 10, estilo: 'ranged', color: 0xe879f9,
      pct: .35, escala: 'hp', cd: 5, potenciaBombas: { factor: 2 },
      desc: '10 golpes de 35% (escala por HP) a enemigos al azar, cada uno con 70% de probabilidad de Bomba. Cada golpe hace estallar las Bombas que el objetivo ya tenía: durante la Sinfonía, todas las Bombas que estallan hacen el doble de daño.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: .70 } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/nezuko-kamado.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-11-03). Nezuko Kamado, la demonio que protege a los humanos (Demon Slayer). Sanadora pura: no golpea, pero su
// sangre arde al curar y cada curación real hiere al equipo enemigo. Sin habilidad de líder.
__e.default = {
  id: 'nezuko-kamado',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'demonios'],   // campaña: temas de las etapas
  nombre: 'Nezuko Kamado',
  rol: 'Support',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌸', color: '#ec4899', imagen: 'assets/personajes/nezuko-kamado.webp',
  base: { hp: 600, dmg: 45, spd: 88 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre que Arde',
    desc: 'Al recibir daño (una vez por ataque), cura 10% de su HP máx. al aliado con menos HP. El 50% de lo que realmente sane cualquiera de sus curaciones se reparte al azar como daño entre los enemigos.',
    gatillo: 'alRecibirDano', soloSiCura: true, unaVezPorMovimiento: true,
    accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'aliadoMasHerido' },
    danoPorCuracion: { pct: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Purificación', objetivo: 'aliado', estilo: 'support', color: 0xfbcfe8,
      cd: 0,
      desc: 'Cura a un aliado 15% del HP máx. de Nezuko y le aplica Aura de Luz (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .15, escala: 'hpMax', a: 'objetivo' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'auraLuz', dur: 2, a: 'objetivo' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Lluvia Carmesí', objetivo: 'todosAliados', estilo: 'support', color: 0xf472b6,
      cd: 3,
      desc: 'Cura a todos los aliados 10% del HP máx. de Nezuko y les limpia 1 debuff a cada uno.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'limpiar', cantidad: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Explosión de Sangre', objetivo: 'todosAliados', estilo: 'support', color: 0xdb2777,
      cd: 5,
      desc: 'Cura a todos los aliados 20% del HP máx. de Nezuko y baja en 1 el cooldown de una habilidad al azar de cada uno.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .20, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'reducirCooldown', azar: true, cantidad: 1, a: 'todosAliados' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/jon-snow.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-11-03). Jon Snow, Rey en el Norte y heredero Targaryen (Game of Thrones). Comandante que prepara a su equipo para
// el crítico, aturde a los enemigos ya debilitados y hace que todos desaten su Over a la vez. Vuelve de la muerte una vez. Tiene habilidad de líder.
// Sim 2026-11-03: 56.9% vs azar; 76.1% como líder.
__e.default = {
  id: 'jon-snow',
  franquicia: 'Game of Thrones', grupos: ['targaryen', 'reyes'],   // campaña: temas de las etapas
  nombre: 'Jon Snow',
  rol: 'Support', rolSecundario: 'Control',
  sobres: [],  // sin sobre temático, como Daenerys y Rhaenys: sale en Unbreakable Force (y en los aleatorios)
  emoji: '🐺', color: '#94a3b8', imagen: 'assets/personajes/jon-snow.webp',
  base: { hp: 640, dmg: 55, spd: 97 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Príncipe Prometido',
    desc: 'Cuando un enemigo usa una habilidad de área, cada aliado tiene 50% de probabilidad de ganar Esquiva Área (1 ronda) antes del ataque.',
    alEnemigoAoe: { prob: .50, id: 'aoeDodge', dur: 1 },
  },
  pasiva: {
    nombre: 'Legítimo Targaryen',
    desc: 'Si está muerto, al inicio de cada ronda tiene 50% de probabilidad de revivir con 60% de HP (solo una vez por partida). Al revivir, el cooldown del Over de todos los aliados baja a 0.',
    revivirRonda: { prob: .50, hp: .60, alRevivir: { tipo: 'reiniciarCooldowns', categorias: ['over'], a: 'todosAliados' } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Comandante de la Guardia de la Noche', objetivo: 'todosAliados', estilo: 'support', color: 0x94a3b8,
      cd: 0,
      desc: 'Todos los aliados ganan Frenesí y Letalidad (1 ronda).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'frenzy', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'bloodlust', dur: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Ejecución Bastarda', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xcbd5e1,
      pct: 1.00, escala: 'dano', cd: 4,
      desc: 'Golpea a cada enemigo con 100%. Los que ya tenían un debuff tienen 50% de probabilidad de recibir Mega Aturdimiento.',
      efectos: [{ condicion: { objetivoTeniaDebuff: true }, accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .50 } }],
    },
    {
      categoria: 'over', nombre: 'El Rey del Norte', objetivo: 'propio', estilo: 'support', color: 0xe2e8f0,
      cd: 6,
      desc: 'Cada aliado con su Over disponible lo usa sobre objetivos al azar. Ese Over entra en cooldown.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ordenarBasico', categoria: 'over', otros: true, soloListo: true, gastaCooldown: true, texto: '👑 ¡El Rey del Norte!', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/personajes/yoda.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-10-30). Yoda, el Gran Maestro Jedi (Star Wars). Soporte puro: no causa daño. Marca a sus aliados con el
// Camino Jedi y, cada vez que usa su Básico o su Especial, los marcados usan su Básico. Su Over les devuelve
// todos los cooldowns y un turno adicional. Es intocable mientras viva algún aliado, pero muere en cuanto cae el último.
// Sim 2026-10-30: 52.1% vs azar (no tiene habilidad de líder).
__e.default = {
  id: 'yoda',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Yoda',
  rol: 'Support',
  sobres: ['sacred'],
  emoji: '🌿', color: '#86efac', imagen: 'assets/personajes/yoda.webp',
  base: { hp: 600, dmg: 40, spd: 100 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sabiduría Antigua',
    desc: 'Tiene Anticipar permanente: si un enemigo gana un turno adicional, Yoda juega uno antes que él. Es inmune a todo daño (golpes, DoT, Bombas, robo de vida…) mientras viva algún aliado; los debuffs de control sí le afectan. Si cae el último de sus aliados, Yoda muere al instante.',
    efectosPermanentes: ['anticipar'],
    intocable: true,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Guía del Maestro', objetivo: 'aliado', estilo: 'ranged', color: 0x86efac, cd: 0,
      desc: 'Pone la marca Camino Jedi (permanente, +5% a todas las estadísticas, no se acumula) a un aliado. Luego cada aliado con Camino Jedi usa su Básico a un enemigo al azar (o a un aliado al azar si es de apoyo).',
      efectos: [
        { accion: { tipo: 'marcar', marca: 'caminoJedi', permanente: true, bono: { todoPct: .05 } } },
        { cuando: 'final', accion: { tipo: 'ordenarBasico', marca: 'caminoJedi', texto: '🌿 Camino Jedi', a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Antiguo Camino Jedi', objetivo: 'todosAliados', estilo: 'ranged', color: 0xbbf7d0, cd: 2,
      desc: 'Cura a todos sus aliados el 5% del HP máx. de Yoda por cada aliado con Camino Jedi. Luego cada aliado con Camino Jedi usa su Básico a un enemigo al azar (o a un aliado al azar si es de apoyo).',
      efectos: [
        { accion: { tipo: 'curar', pct: .05, escala: 'hpMax', porAliadoCon: 'caminoJedi' } },
        { cuando: 'final', accion: { tipo: 'ordenarBasico', marca: 'caminoJedi', texto: '🌿 Camino Jedi', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Espíritu de la Fuerza', objetivo: 'aliado', estilo: 'ranged', color: 0x93c5fd, cd: 4,
      desc: 'Pone en 0 todos los cooldowns de un aliado y le da un turno adicional, que juega en cuanto termina el turno de Yoda.',
      efectos: [
        { accion: { tipo: 'reiniciarCooldowns' } },
        { accion: { tipo: 'turnoExtra' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/capitan-america.js"] = (() => { const __e: any = {};
const { espacios } = __m["datos/reliquias.js"];

// Ficha oficial (2026-11-02). Capitán América, el centinela de la libertad (Marvel). Tanque que se endurece mientras más
// heridas lleva, protege con su escudo y hace que todo el equipo ataque a su señal. Lideró a los Vengadores: tiene habilidad de líder.
// Sim 2026-11-02: 58.9% vs azar; 64.5% como líder.
__e.default = {
  id: 'capitan-america',
  franquicia: 'Marvel', grupos: ['vengadores'],   // campaña: temas de las etapas
  nombre: 'Capitán América',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: [],  // solo en Unbreakable Force
  emoji: '🛡️', color: '#2563eb', imagen: 'assets/personajes/capitan-america.webp',
  base: { hp: 800, dmg: 50, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Líder de los Vengadores',
    desc: 'Todos los aliados ganan +20% de Daño y +20% de Daño Crítico.',
    bonoStat: { dmgPct: .20, critDmg: .20 },
  },
  pasiva: {
    nombre: 'Puedo Hacer Esto Todo el Día',
    desc: 'Por cada 10% de HP que le falte, gana +5% de Armadura, +5% de Resistencia y +2% de Bloqueo.',
    porHpPerdido: { cada: .10, bono: { armor: .05, res: .05, block: .02 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lanzamiento de Escudo', objetivo: 'enemigo', estilo: 'ranged', color: 0x3b82f6,
      pct: 1.25, escala: 'hp', cd: 0,
      desc: 'Causa 125% (escala por HP). Además, cada uno con 50% de probabilidad y por 1 ronda: gana Provocación, gana Espejismo y gana un Escudo del 50% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 1, prob: .50, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 1, prob: .50, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, prob: .50, a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: '¡Avengers, Unidos!', objetivo: 'enemigo', estilo: 'support', color: 0xef4444,
      cd: 4,
      desc: 'El Capitán y todos sus aliados usan su Básico. Los de un objetivo atacan al enemigo elegido (si cae, a otro al azar); los de área, a sí mismo o a un aliado funcionan normal.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ordenarBasico', todos: true, alObjetivo: true, texto: '🛡️ ¡Avengers, Unidos!', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Baluarte de la Libertad', objetivo: 'todosAliados', estilo: 'support', color: 0x93c5fd,
      cd: 5,
      desc: 'El Capitán se cura 50% de su HP máx. y todos los aliados ganan un Escudo del 100% del HP máx. del Capitán (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .50, escala: 'hpMax', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};


return __e; })();

__m["datos/personajes/index.js"] = (() => { const __e: any = {};
// Registro de personajes. Cada ficha oficial nueva se agrega aquí y aparece sola en la construcción de equipos.
const madara = __m["datos/personajes/madara-uchiha.js"].default;
const rengoku = __m["datos/personajes/rengoku.js"].default;
const alexstrasza = __m["datos/personajes/alexstrasza.js"].default;
const sunJinWoo = __m["datos/personajes/sun-jin-woo.js"].default;
const shaka = __m["datos/personajes/shaka.js"].default;
const goku = __m["datos/personajes/goku.js"].default;
const daenerys = __m["datos/personajes/daenerys-targaryen.js"].default;
const batman = __m["datos/personajes/batman.js"].default;
const joker = __m["datos/personajes/the-joker.js"].default;
const reptile = __m["datos/personajes/reptile.js"].default;
const subZero = __m["datos/personajes/sub-zero.js"].default;
const scorpion = __m["datos/personajes/scorpion.js"].default;
const aldebaran = __m["datos/personajes/aldebaran.js"].default;
const rhaenys = __m["datos/personajes/rhaenys-targaryen.js"].default;
const thor = __m["datos/personajes/thor.js"].default;
const loki = __m["datos/personajes/loki.js"].default;
const lichKing = __m["datos/personajes/lich-king.js"].default;
const jaina = __m["datos/personajes/jaina-proudmoore.js"].default;
const doom = __m["datos/personajes/doctor-doom.js"].default;
const kratos = __m["datos/personajes/kratos.js"].default;
const vegeta = __m["datos/personajes/vegeta.js"].default;
const wukong = __m["datos/personajes/wukong.js"].default;
const naruto = __m["datos/personajes/naruto.js"].default;
const sasuke = __m["datos/personajes/sasuke-uchiha.js"].default;
const skeletor = __m["datos/personajes/skeletor.js"].default;
const heMan = __m["datos/personajes/he-man.js"].default;
const saga = __m["datos/personajes/saga.js"].default;
const camus = __m["datos/personajes/camus.js"].default;
const milo = __m["datos/personajes/milo.js"].default;
const itachi = __m["datos/personajes/itachi-uchiha.js"].default;
const pain = __m["datos/personajes/pain.js"].default;
const gilgamesh = __m["datos/personajes/gilgamesh.js"].default;
const ozymandias = __m["datos/personajes/ozymandias.js"].default;
const minato = __m["datos/personajes/minato.js"].default;
const antares = __m["datos/personajes/antares.js"].default;
const baran = __m["datos/personajes/baran.js"].default;
const orochimaru = __m["datos/personajes/orochimaru.js"].default;
const ghostRider = __m["datos/personajes/ghost-rider.js"].default;
const venom = __m["datos/personajes/venom.js"].default;
const spiderMan = __m["datos/personajes/spider-man.js"].default;
const carnage = __m["datos/personajes/carnage.js"].default;
const gaara = __m["datos/personajes/gaara.js"].default;
const sasori = __m["datos/personajes/sasori.js"].default;
const obito = __m["datos/personajes/obito-uchiha.js"].default;
const deidara = __m["datos/personajes/deidara.js"].default;
const broly = __m["datos/personajes/broly.js"].default;
const gohan = __m["datos/personajes/gohan.js"].default;
const trunks = __m["datos/personajes/trunks.js"].default;
const hashirama = __m["datos/personajes/hashirama.js"].default;
const tobirama = __m["datos/personajes/tobirama.js"].default;
const pinguino = __m["datos/personajes/el-pinguino.js"].default;
const natsu = __m["datos/personajes/natsu-dragneel.js"].default;
const kyo = __m["datos/personajes/kyo-kusanagi.js"].default;
const iori = __m["datos/personajes/iori-yagami.js"].default;
const sillad = __m["datos/personajes/sillad.js"].default;
const rakan = __m["datos/personajes/rakan.js"].default;
const muzan = __m["datos/personajes/muzan-kibutsuji.js"].default;
const poisonIvy = __m["datos/personajes/poison-ivy.js"].default;
const ermac = __m["datos/personajes/ermac.js"].default;
const shinobu = __m["datos/personajes/shinobu-kocho.js"].default;
const mrFreeze = __m["datos/personajes/mr-freeze.js"].default;
const baruka = __m["datos/personajes/baruka.js"].default;
const bjorn = __m["datos/personajes/bjorn-ironside.js"].default;
const aokiji = __m["datos/personajes/aokiji.js"].default;
const doomsday = __m["datos/personajes/doomsday.js"].default;
const escanor = __m["datos/personajes/escanor.js"].default;
const meliodas = __m["datos/personajes/meliodas.js"].default;
const marik = __m["datos/personajes/marik-ishtar.js"].default;
const yorichi = __m["datos/personajes/yorichi.js"].default;
const tengen = __m["datos/personajes/tengen.js"].default;
const nezuko = __m["datos/personajes/nezuko-kamado.js"].default;
const jonSnow = __m["datos/personajes/jon-snow.js"].default;
const yoda = __m["datos/personajes/yoda.js"].default;
const capitanAmerica = __m["datos/personajes/capitan-america.js"].default;

const OFICIALES = [madara, rengoku, alexstrasza, sunJinWoo, shaka, goku, vegeta, batman, joker, reptile, subZero, scorpion, aldebaran, rhaenys, thor, loki, lichKing, jaina, doom, kratos, daenerys, wukong, naruto, sasuke, skeletor, heMan, saga, camus, milo, itachi, pain, gilgamesh, ozymandias, minato, antares, baran, orochimaru, ghostRider, venom, spiderMan, carnage, gaara, sasori, obito, deidara, broly, gohan, trunks, hashirama, tobirama, pinguino, natsu, kyo, iori, sillad, rakan, muzan, poisonIvy, ermac, shinobu, mrFreeze, baruka, bjorn, aokiji, doomsday, escanor, meliodas, marik, yorichi, tengen, yoda, capitanAmerica, nezuko, jonSnow];
const porId = id => OFICIALES.find(p => p.id === id);

__e["OFICIALES"] = OFICIALES;
__e["porId"] = porId;
return __e; })();

__m["datos/jefes/lich-king.js"] = (() => { const __e: any = {};
// Jefe de Raid: Lich King. Ficha propia, distinta del campeón: es la batalla en lo alto de la Ciudadela de la Corona de Hielo.
// hp es el HP de referencia: los efectos por % de HP máx. se calculan sobre él; el HP real es la barra que comparten todos los jugadores.
__e.default = {
  id: 'lich-king-jefe',
  franquicia: 'Warcraft', grupos: [],
  nombre: 'Lich King',
  rol: 'Tanque',
  emoji: '👑', color: '#60a5fa', imagen: 'assets/personajes/lich-king-jefe.webp',
  arteCarta: 'assets/personajes/lich-king-jefe-carta.webp',   // la carta del campo es solo esta imagen, sin barra ni estadísticas
  auraJefe: 'hielo',                                         // aura de la carta: hielo · fuego · oscuro
  base: { hp: 3000, dmg: 70, spd: 100 },
  extra: { armor: .20, res: .50 },
  slots: [],
  ciclo: ['especial', 'basico', 'especial', 'basico', 'over'],   // siempre en este orden; la pantalla muestra lo que sigue
  pasiva: {
    nombre: 'Cosecha de Almas',
    desc: 'Inmune a todo Control. Cada campeón que cae alimenta a Frostmourne: +10% de Daño permanente, hasta +40%.',
    inmuneA: ['Control'],
    gatillo: 'alMorirEnemigo',
    accion: { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .10, tope: .40, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Segador de Almas', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc, elemento: 'hielo', ambiente: 'rayos',
      pct: 2.2, escala: 'dano', cd: 0,
      desc: 'Causa 220% a un enemigo y le aplica Aturdimiento y Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun' } }, { accion: { tipo: 'efecto', id: 'weaken', dur: 2 } }],
    },
    {
      categoria: 'especial', nombre: 'Invierno sin Remordimiento', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbae6fd, elemento: 'hielo', ambiente: 'ventisca',
      pct: 1, escala: 'dano', cd: 0,
      desc: 'Causa 100% a todos los enemigos. 30% de probabilidad de aplicar Congelación a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .30 } }],
    },
    {
      categoria: 'over', nombre: 'Furia de Frostmourne', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x38bdf8, elemento: 'hielo', ambiente: 'furia',
      pct: 1.8, escala: 'dano', cd: 0,
      desc: 'Causa 180% a todos los enemigos, les quita todos sus buffs e invoca a Sindragosa (actúa 2 veces; se puede Disipar).',
      efectos: [{ accion: { tipo: 'disipar' } }, { cuando: 'final', accion: { tipo: 'invocar', key: 'sindragosa', a: 'propio' } }],
    },
  ],
};


return __e; })();

__m["datos/jefes/raid.js"] = (() => { const __e: any = {};
// Jefe de Raid: datos compartidos por el juego y por el servidor que repite las batallas (sin DOM).
// El HP, los rangos y las recompensas viven en el servidor (docs/sql/026_jefe_raid.sql); aquí solo lo que necesita la batalla.
const lichKing = __m["datos/jefes/lich-king.js"].default;

const JEFES_RAID = { 'lich-king': lichKing };
const RONDAS_RAID = 30;
const FURIA_RAID = { desde: 21, dmgPct: .10, texto: '❄️ ¡FURIA DEL REY! Su Daño sube cada ronda' };
// Cuánto pega el jefe en cada dificultad
const DIFICULTADES_RAID = {
  facil: { nombre: 'Fácil', dmg: 1, color: '#86efac' },
  normal: { nombre: 'Normal', dmg: 1.5, color: '#7dd3fc' },
  dificil: { nombre: 'Difícil', dmg: 2, color: '#fde68a' },
  brutal: { nombre: 'Brutal', dmg: 3, color: '#fdba74' },
  pesadilla: { nombre: 'Pesadilla', dmg: 4, color: '#fca5a5' },
};
// Opciones de crearCombate para el equipo del jefe
const opcionesRaid = (dificultad, hpInicio, hpTotal) => ({
  dmgPct: DIFICULTADES_RAID[dificultad].dmg - 1, barra: { hp: hpInicio, total: hpTotal }, limiteRondas: RONDAS_RAID, furiaRonda: FURIA_RAID,
});

__e["DIFICULTADES_RAID"] = DIFICULTADES_RAID;
__e["FURIA_RAID"] = FURIA_RAID;
__e["JEFES_RAID"] = JEFES_RAID;
__e["RONDAS_RAID"] = RONDAS_RAID;
__e["opcionesRaid"] = opcionesRaid;
return __e; })();

__m["datos/cuenta.js"] = (() => { const __e: any = {};
// Armar fichas de batalla con datos de una cuenta (estrellas y reliquias equipadas). Sin DOM: lo usan el juego y el servidor
// (la verificación de batallas de la Arena repite la batalla con estas mismas funciones).
const { instancia, espaciosDeCuenta, RELIQUIAS } = __m["datos/reliquias.js"];
const { OFICIALES } = __m["datos/personajes/index.js"];
const { JEFES_RAID } = __m["datos/jefes/raid.js"];
const { INVOCACIONES } = __m["datos/invocaciones.js"];

const abiertosDe = r => r?.espacios_abiertos?.length || !r?.espacios ? (r?.espacios_abiertos || []) : ['arma2', 'equip2', 'acc2'].slice(0, r.espacios);

// Datos de batalla de un equipo que manda el servidor: { col: [{campeon, estrellas, espacios, espacios_abiertos}], reliquias: [filas] }
function cuentaDesdeServidor(j) {
  const equipo = {};
  for (const f of j?.reliquias || []) if (f.campeon && f.espacio) (equipo[f.campeon] ||= {})[f.espacio] = instancia(f);
  return { col: new Map((j?.col || []).map(r => [r.campeon, r])), equipo, reliquias: true };
}

// Ficha lista para la batalla: estrellas y reliquias de la cuenta (un campeón que no tienes pelea con 0★ y sin reliquias)
function conCuenta(def, cuenta) {
  if (!cuenta) return def;
  const r = cuenta.col.get(def.id);
  const out = { ...def, estrellas: r?.estrellas || 0 };
  if (cuenta.reliquias) out.slots = espaciosDeCuenta(cuenta.equipo[def.id] || {}, abiertosDe(r));
  return out;
}

// Versión del juego (huella de las fichas y reliquias): en vivo solo se emparejan jugadores con la misma, y el servidor
// solo verifica batallas jugadas con la versión que conoce
// Lo que solo se ve no cambia una batalla: no debe obligar a volver a publicar la función que las verifica
const VISUALES = new Set(['imagen', 'arteCarta', 'auraJefe', 'ambiente', 'emoji', 'color', 'enfoque', 'luminosa', 'vuelo', 'desc', 'nombre', 'estilo']);
const sinVisuales = o => JSON.parse(JSON.stringify(o, (k, v) => VISUALES.has(k) ? undefined : v));
const VERSION = (() => {
  const t = JSON.stringify([OFICIALES.map(p => [p.id, p.base, p.extra, p.movimientos, p.pasiva, p.lider]), Object.keys(RELIQUIAS), sinVisuales(JEFES_RAID), sinVisuales(INVOCACIONES)]);
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h >>> 0);
})();

__e["VERSION"] = VERSION;
__e["abiertosDe"] = abiertosDe;
__e["conCuenta"] = conCuenta;
__e["cuentaDesdeServidor"] = cuentaDesdeServidor;
return __e; })();

__m["motor/verificar.js"] = (() => { const __e: any = {};
// Verificación de batallas de la Arena (sin DOM): repite la batalla con la misma semilla y las decisiones del jugador.
// La Defensa la juega la IA con un azar con semilla (semillaIA), así que sus decisiones también se comprueban: deben ser
// exactamente las que la IA habría tomado. Lo usa la Edge Function "verificar-arena" (docs/supabase/verificar-arena.ts).
const { crearCombate } = __m["motor/combate.js"];
const { elegirIA } = __m["motor/ia.js"];
const { crearRng } = __m["motor/rng.js"];
const { porId } = __m["datos/personajes/index.js"];
const { cuentaDesdeServidor, conCuenta } = __m["datos/cuenta.js"];
const { JEFES_RAID, opcionesRaid } = __m["datos/jefes/raid.js"];

const semillaIA = semilla => (semilla ^ 0x5bd1e995) >>> 0;

// combate: fila de arena_combates (ataque, defensa, semilla, equipo_atk, equipo_def, decisiones, gano)
// Devuelve { ok, ganador, motivo }
function repetirCombate(c) {
  try {
    const atk = c.ataque.map(porId), def = c.defensa.map(porId);
    if (atk.some(x => !x) || def.some(x => !x)) return { ok: false, motivo: 'Campeón desconocido' };
    const cuentaA = cuentaDesdeServidor(c.equipo_atk), cuentaD = c.equipo_def ? cuentaDesdeServidor(c.equipo_def) : null;
    const combate = crearCombate({ equipoJugador: atk.map(d => conCuenta(d, cuentaA)), equipoRival: cuentaD ? def.map(d => conCuenta(d, cuentaD)) : def, semilla: c.semilla });
    const rnd = crearRng(semillaIA(c.semilla));
    let r = combate.iniciar(), i = 0;
    const lista = c.decisiones || [];
    while (!r.fin && r.esperando) {
      const d = lista[i++];
      if (!d) return { ok: false, motivo: 'Faltan decisiones' };
      const actor = combate.personajes.find(p => p.uid === r.esperando.id);
      if (actor.lado === 'rival') {                       // la Defensa (IA): debe coincidir con lo que la IA decide
        const ia = elegirIA(combate, rnd);
        if (ia.categoria !== d.c || (ia.objetivo || null) !== (d.o || null)) return { ok: false, motivo: `Decisión de la Defensa alterada (turno ${i})` };
      }
      r = combate.actuar({ categoria: d.c, objetivo: d.o || null });
    }
    const gano = r.fin?.ganador === 'jugador' && !r.fin?.limite;
    return { ok: gano === !!c.gano, ganador: r.fin?.ganador, limite: !!r.fin?.limite, motivo: gano === !!c.gano ? '' : 'El resultado no coincide' };
  } catch (e) { return { ok: false, motivo: String(e?.message || e) }; }
}

// Jefe de Raid. a: fila de raid_ataques (semilla, dificultad, hp_inicio, hp_total, equipo, equipo_datos, decisiones).
// El daño es lo que baja la barra al repetir. Se permite terminar antes de tiempo (el jugador abandonó): cuenta lo jugado.
function repetirRaid(a, jefe = 'lich-king') {
  try {
    const eq = a.equipo.map(porId);
    if (eq.some(x => !x)) return { ok: false, motivo: 'Campeón desconocido' };
    const cuenta = cuentaDesdeServidor(a.equipo_datos);
    const combate = crearCombate({ equipoJugador: eq.map(d => conCuenta(d, cuenta)), equipoRival: [JEFES_RAID[jefe]], semilla: Number(a.semilla),
      rival: opcionesRaid(a.dificultad, Number(a.hp_inicio), Number(a.hp_total)) });
    const rnd = crearRng(semillaIA(Number(a.semilla)));
    const lista = a.decisiones || [];
    const b = combate.personajes.find(p => p.lado === 'rival');
    let r = combate.iniciar(), i = 0;
    while (!r.fin && r.esperando) {
      const d = lista[i++];
      if (!d) break;
      const actor = combate.personajes.find(p => p.uid === r.esperando.id);
      if (actor.lado === 'rival') {
        const ia = elegirIA(combate, rnd);
        if (ia.categoria !== d.c || (ia.objetivo || null) !== (d.o || null)) return { ok: false, motivo: `Decisión del jefe alterada (turno ${i})` };
      }
      r = combate.actuar({ categoria: d.c, objetivo: d.o || null });
    }
    return { ok: true, dano: Math.max(0, Math.round(Number(a.hp_inicio) - Math.max(0, b.hp))) };
  } catch (e) { return { ok: false, motivo: String(e?.message || e) }; }
}

__e["repetirCombate"] = repetirCombate;
__e["repetirRaid"] = repetirRaid;
__e["semillaIA"] = semillaIA;
return __e; })();

const { repetirRaid } = __m["motor/verificar.js"];
const { VERSION } = __m["datos/cuenta.js"];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { ataque } = await req.json();
    const url = Deno.env.get('SUPABASE_URL');
    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await usuario.auth.getUser();
    if (!user) return json({ error: 'Inicia sesión primero' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: a } = await admin.from('raid_ataques').select('*').eq('id', ataque).single();
    if (!a || a.jugador !== user.id) return json({ error: 'No existe ese ataque' }, 404);
    if (a.estado !== 'pendiente') return json({ error: 'Ese ataque no espera verificación' }, 400);
    const r = a.version === VERSION ? repetirRaid(a) : { ok: true, dano: a.dano };
    const { data, error } = await admin.rpc('raid_resultado_verificado', { p_ataque: ataque, p_dano: r.ok ? r.dano : 0 });
    if (error) return json({ error: error.message }, 400);
    return json({ ...data, verificado: r.ok, motivo: r.motivo || '' });
  } catch (e) { return json({ error: String(e?.message || e) }, 500); }
});
