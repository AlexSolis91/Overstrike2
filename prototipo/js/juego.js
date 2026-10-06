// Punto de entrada: une el motor (reglas) con la interfaz (animaciones y panel).
import { iniciarEscena, G, W, wait, banner, relayout, shakeScene } from './ui/graficos.js';
import { precargar } from './ui/imagenes.js';
import { Carta } from './ui/carta.js';
import * as FX from './ui/fx.js';
import { renderPanel, renderOrden, renderAccion, setHint, log, logLeido, activarReliquias } from './ui/panel.js';
import { crearCombate } from './motor/combate.js';
import { elegirIA } from './motor/ia.js';
import { OFICIALES, porId } from './datos/personajes/index.js';
import { iniciarMenu, irA, presentarVS, cargarSeleccion } from './ui/menu.js';
import { iniciarGuia, cerrarGuia, guiaAbierta } from './ui/guia.js';
import { mostrarResultados, iniciarResultados } from './ui/resultados.js';
import { sonar, musica, finDePartida, nuevaPartida, iniciarAjustes, ajustesAbiertos, cerrarAjustes, ajustes } from './ui/audio.js';
import { iniciarCuenta } from './ui/cuenta.js';
import { iniciarColeccion } from './ui/coleccion.js';
import { EFECTOS } from './motor/efectos.js';
import { INVOCACIONES } from './datos/invocaciones.js';

const { gsap } = window;
const $ = s => document.querySelector(s);

// ---------------------------------------------------------------- modo celular
const consultaMovil = matchMedia('(max-width: 900px), (max-height: 520px)');
function modoMovil() {
  const cl = document.body.classList, movil = consultaMovil.matches, horizontal = innerWidth > innerHeight;
  cl.toggle('movil', movil); cl.toggle('movil-h', movil && horizontal); cl.toggle('movil-v', movil && !horizontal);
  if (!movil) cl.remove('panel-abierto');
  relayout();
}
modoMovil();
addEventListener('resize', modoMovil);

// ---------------------------------------------------------------- carga
await iniciarEscena($('#field'));
await precargar(
  OFICIALES.flatMap(p => { const l = [p.imagen]; for (let f = p.transformacion; f; f = f.transformacion) l.push(f.imagen); return l; }).concat(Object.values(INVOCACIONES).map(i => i.imagen)),
  INVOCACIONES,
  (n, total) => { $('#loading-bar').style.width = `${n / total * 100}%`; $('#loading-text').textContent = `Cargando imágenes ${n}/${total}`; },
);
const ld = $('#loading'); ld.classList.add('fade'); setTimeout(() => ld.remove(), 500);

// ---------------------------------------------------------------- partida (se crea con los equipos elegidos)
let combate = null, P = [], ui = { ocupado: true }, vistas = {}, cartas = {};
let partida = 0, inicioPartida = 0;                 // identifica la partida en curso: al salir, las animaciones pendientes se detienen
let ultima = null;               // { jugador: [ids], rival: [ids], rivalModo } para Revancha / Cambiar equipo
const por = uid => P.find(p => p.uid === uid);
const nombre = uid => por(uid)?.nombre ?? '';
const colX = i => W / 2 + (i - 2) * 178;
activarReliquias(() => por(ui.inspeccionado));

async function iniciarPartida(eqJ, eqR) {
  partida++;
  inicioPartida = Date.now();
  combate = crearCombate({ equipoJugador: eqJ, equipoRival: eqR });
  P = combate.personajes;
  ui = { actual: null, inspeccionado: P[0].uid, miTurno: false, movSel: null, objetivosValidos: null, tipoObjetivo: null, ocupado: true, opciones: null };
  vistas = {}; cartas = {};
  for (const p of P) {
    cartas[p.uid] = new Carta(p, colX(p.pos), p.lado === 'rival' ? 215 : 585, tocarCarta);
    vistas[p.uid] = combate.vista(p);
    cartas[p.uid].aplicar(vistas[p.uid], true);
  }
  G.alTick = [(dt, T) => { for (const c of Object.values(cartas)) c.tick(dt, T, ui); }];
  window.__os2.combate = combate; window.__os2.ui = ui;
  irA('partida');
  relayout();
  for (const [i, carta] of Object.values(cartas).entries()) {
    const desde = carta.p.lado === 'jugador' ? 1000 : -200;
    carta.c.y = desde; carta.c.alpha = 0;
    gsap.to(carta.c, { y: carta.hy, alpha: 1, duration: .6, delay: .15 + (i % 5) * .08 + (carta.p.lado === 'jugador' ? .2 : 0), ease: 'back.out(1.4)' });
  }
  refrescarPanel();
  await wait(1100);
  await procesar(combate.iniciar());
}

// Empezar una partida (Listo, Revancha). Sin recargar la página: se limpia la anterior, así el audio sigue activo.
// La música de batalla (un tema al azar) empieza 2 segundos después.
async function jugar(eqJ, eqR, rivalModo) {
  ultima = { jugador: eqJ.map(p => p.id), rival: eqR.map(p => p.id), rivalModo };
  if (combate) limpiarPartida();
  nuevaPartida();
  const esta = ++arranques;
  setTimeout(() => { if (esta === arranques) musica('batalla'); }, 2000);
  await presentarVS(eqJ, eqR);
  await iniciarPartida(eqJ, eqR);
}
let arranques = 0;
// Quita todo lo visual de la partida anterior: cartas, efectos, textos, animaciones pendientes, registro y resultados
function matarTweens(o) { gsap.killTweensOf(o); if (o.scale) gsap.killTweensOf(o.scale); for (const h of o.children || []) matarTweens(h); }
function limpiarPartida() {
  partida++;
  const base = [G.bgLayer, G.ambLayer, G.cardLayer, G.fxLayer, G.textLayer];
  const restos = [...G.cardLayer.children, ...G.fxLayer.children, ...G.textLayer.children, ...G.scene.children.filter(x => !base.includes(x))];
  for (const o of restos) { matarTweens(o); o.parent?.removeChild(o); if (!o.destroyed) o.destroy({ children: true }); }
  G.alTick = [];
  combate = null; P = []; cartas = {}; vistas = {}; embestida = null; enVuelo = []; overEnCurso = null;
  $('#log').innerHTML = ''; logLeido();
  $('#overlay').classList.add('hidden');
}
function salirDePartida() { partida++; ui.miTurno = false; ui.ocupado = true; $('#overlay').classList.add('hidden'); }

function refrescarPanel() { renderPanel(por(ui.inspeccionado), vistas[ui.inspeccionado], ui); refrescarAccion(); }
function refrescarAccion() { renderAccion(por(ui.actual), vistas[ui.actual], ui); }
function inspeccionar(uid) { ui.inspeccionado = uid; refrescarPanel(); }
function aplicar(e) {
  if (!e.s) return;
  for (const [uid, v] of Object.entries(e.s)) { vistas[uid] = v; cartas[uid].aplicar(v); }
  if (e.s[ui.inspeccionado]) refrescarPanel();
  else if (e.s[ui.actual]) refrescarAccion();
}
function barra() {
  $('#test-panel').classList.toggle('disabled', !(ui.miTurno && !ui.ocupado));
  refrescarAccion();
}

// ---------------------------------------------------------------- reproducción de eventos
let embestida = null;
let enVuelo = [];                  // invocaciones que salieron a atacar y aún no vuelven (puede haber varias: p. ej. Kamish aparece mientras Beru ataca)
let overEnCurso = null;            // uid del que está ejecutando un Over (para el impacto de su primer golpe)
const MOTIVO = { stun: '💫 PIERDE EL TURNO', freeze: '❄️ CONGELADO', silence: '🔇 SILENCIADO' };

// Sonido de cada evento (todo pasa por el registro universal de sonidos)
const SONIDO_DOT = { burn: 'quemadura', poison: 'veneno', bleed: 'sangrado', hemo: 'sangrado', bomb: 'explosion', solarBurn: 'solar' };
const SONIDO_CONTROL = { stun: 'aturdir', freeze: 'congelar', silence: 'silenciar' };
function sonidoDe(e) {
  switch (e.t) {
    case 'ronda': return 'ronda';
    case 'movimiento':
      if (e.categoria === 'over') sonar('over');
      return e.estilo === 'melee' ? 'melee' : e.estilo === 'support' ? 'magia' : e.objetivos?.length > 1 ? 'area' : 'lanzar';
    case 'golpe':
      if (e.quiebre) sonar('quiebre');
      return e.critico ? 'critico' : e.dano < 1 && e.escudo > 0 ? 'escudoGolpe' : 'golpe';
    case 'danoEfecto': return 'efectoDano';
    case 'bloqueo': return 'bloqueo';
    case 'robo': return 'robo';
    case 'curacion': return e.cantidad >= 1 && !e.robo ? 'curacion' : null;
    case 'escudo': return 'escudo';
    case 'dot': return SONIDO_DOT[e.tipo];
    case 'explosion': return 'explosion';
    case 'efecto': return SONIDO_CONTROL[e.id] || (EFECTOS[e.id]?.tipo === 'buff' ? 'buff' : 'debuff');
    case 'resistido': case 'inmune': return 'resistido';
    case 'limpieza': return 'limpiar';
    case 'disipar': return 'disipar';
    case 'pierdeTurno': return e.motivo === 'freeze' ? 'pierdeTurnoHielo' : 'pierdeTurno';
    case 'muerte': return 'muerte';
    case 'pasiva': return 'pasiva';
    case 'liderActua': return 'lider';
    case 'invocacion': return e.rareza === 'Legendario' ? 'invocacionLegendaria' : 'invocacion';
    case 'invocacionAtaca': return 'lanzar';
    case 'transformacion': return 'transformacion';
    case 'turnoExtra': return 'turnoExtra';
    case 'esquiva': return 'esquiva';
    case 'sigiloRoto': return 'sigiloRoto';
  }
  return null;
}

async function manejar(e) {
  const c = uid => cartas[uid];
  const s = sonidoDe(e); if (s) sonar(s);
  switch (e.t) {
    case 'ronda':
      $('#round-label').textContent = `Ronda ${e.n}`;
      renderOrden(e.orden, P, vistas);
      log(`— Ronda ${e.n} —`, 'sys');
      banner(`RONDA ${e.n}`);
      await wait(1100);
      break;
    case 'turno':
      ui.actual = e.id; aplicar(e); renderOrden(e.orden, P, vistas); refrescarAccion();
      break;
    case 'dot':
      aplicar(e); FX.dot(c(e.a), e.dano, e.tipo);
      log(`${nombre(e.a)} pierde ${Math.round(e.dano)} (${{ burn: 'Quemadura', poison: 'Veneno', bleed: 'Sangrado', hemo: 'Hemorragia', bomb: 'Bomba', solarBurn: 'Quemadura Solar' }[e.tipo]})`, 'dmg');
      await wait(320);
      break;
    case 'pierdeTurno':
      aplicar(e); FX.textoSobre(c(e.id), MOTIVO[e.motivo] || 'PIERDE EL TURNO', '#fde047', 18, -125);
      log(`${nombre(e.id)} pierde su turno`, 'fx');
      await wait(850);
      break;
    case 'poseido':
      aplicar(e); FX.textoSobre(c(e.id), '👁️ POSEÍDO', '#d8b4fe', 18, -125);
      log(`${nombre(e.id)} está poseído y ataca a su propio equipo`, 'fx');
      await wait(600);
      break;
    case 'controlFin':
      aplicar(e); FX.textoSobre(c(e.id), 'Inmune a Control (1 turno)', '#e2e8f0', 13, -125);
      break;
    case 'golpeExtra':
      FX.textoSobre(c(e.id), '¡Golpe extra!', '#fbbf24', 15, -125);
      log(`${nombre(e.id)} golpea una vez más a ${nombre(e.a)}`, 'fx');
      await wait(250);
      break;
    case 'confundido':
      FX.textoSobre(c(e.id), '🌀 ¡Confundido!', '#f0abfc', 16, -125);
      log(`${nombre(e.id)} está confundido: su movimiento va a ${nombre(e.a)}`, 'fx');
      await wait(500);
      break;
    case 'movimiento': {
      const a = c(e.id), objetivos = e.objetivos.map(c);
      log(`${nombre(e.id)} usa ${e.nombre}`, 'sys');
      if (e.categoria === 'over') {        // cinemática: termina COMPLETA antes de que ocurra el Over
        const vel = (por(e.id).lado === 'rival' ? 1.25 : 1) * (ajustes().overRapido ? 2 : 1);
        await FX.cinematicaOver(a, e.nombre, e.color, { velocidad: vel });
        overEnCurso = e.id;
      }
      if (e.estilo === 'melee' && objetivos[0] && objetivos[0] !== a) { await FX.embestir(a, objetivos[0]); embestida = a; }
      else {
        FX.lanzar(a, e.color);
        const lejos = objetivos.filter(t => t !== a);
        if (lejos.length) { await wait(150); await Promise.all(lejos.map((t, i) => wait(i * 90).then(() => FX.proyectilA(a, t, e.color, e.estilo === 'support' ? .5 : .42)))); }
        else await wait(250);
      }
      break;
    }
    case 'movimientoFin':
      aplicar(e); overEnCurso = null;
      if (embestida) { await FX.regresar(embestida); embestida = null; }
      break;
    case 'bloqueo':
      log(`${nombre(e.a)} bloquea`, 'fx'); await FX.bloqueo(c(e.a));
      break;
    case 'golpe':
      aplicar(e); FX.golpe(c(e.a), e);
      if (overEnCurso && e.de === overEnCurso) { overEnCurso = null; shakeScene(11); await wait(90); }   // impacto del Over
      log(`${e.fuente || nombre(e.de)} → ${nombre(e.a)}: -${Math.round(e.dano)}${e.escudo >= 1 ? ` (🛡 -${Math.round(e.escudo)})` : ''}${e.critico ? ' ¡Crítico!' : ''}`, 'dmg');
      await wait(e.multi ? 240 : 170);
      break;
    case 'danoEfecto':
      aplicar(e); FX.danoEfecto(c(e.a), e);
      log(`${nombre(e.a)} recibe ${Math.round(e.dano)} de daño por efecto`, 'dmg');
      await wait(170);
      break;
    case 'robo':
      aplicar(e); log(`${nombre(e.de)} roba ${Math.round(e.cantidad)} HP a ${nombre(e.a)}`, 'dmg');
      await FX.robo(c(e.a), c(e.de), e);
      break;
    case 'curacion':
      aplicar(e); FX.curacion(c(e.a), e.cantidad);
      if (!e.robo) log(`${nombre(e.a)} recupera ${Math.round(e.cantidad)} HP`, 'heal');
      await wait(e.robo ? 200 : 320);
      break;
    case 'escudo':
      aplicar(e); FX.escudo(c(e.a), e.cantidad);
      log(`${nombre(e.a)} gana ${Math.round(e.cantidad)} de Escudo`, 'heal');
      await wait(300);
      break;
    case 'efecto':
      aplicar(e); FX.efecto(c(e.a), e.id, e.texto);
      log(`${nombre(e.a)}: ${e.texto.replace(/^[^\p{L}\d+\-¡]+\s/u, '')}`, 'fx');   // quita solo un emoji inicial
      await wait(280);
      break;
    case 'resistido': FX.textoSobre(c(e.a), 'RESISTIDO'); log(`${nombre(e.a)} resiste el efecto`); await wait(220); break;
    case 'inmune': FX.textoSobre(c(e.a), e.texto ? e.texto.toUpperCase() : 'INMUNE', '#e2e8f0'); log(`${nombre(e.a)}: ${e.texto || 'inmune al Control'}`); await wait(220); break;
    case 'sinEfecto': FX.textoSobre(c(e.a), e.texto); await wait(200); break;
    case 'limpieza': aplicar(e); FX.limpieza(c(e.a)); log(`${nombre(e.a)}: se limpian ${e.n} debuff(s)`, 'heal'); await wait(320); break;
    case 'disipar': aplicar(e); FX.disipar(c(e.a), e.n); log(`${nombre(e.a)}: se disipan ${e.n} buff(s)`, 'fx'); await wait(320); break;
    case 'explosion': log(`💥 Explota una Bomba en ${nombre(e.a)}`, 'dmg'); await FX.explosion(c(e.a)); break;
    case 'salpicadura': aplicar(e); FX.salpicadura(c(e.a), e.dano); break;
    case 'muerte':
      aplicar(e); log(`☠️ ${nombre(e.a)} ha sido derrotado`, 'sys');
      if (e.lider) log(`👑 Se pierde la habilidad de líder de ${nombre(e.a)}`, 'sys');
      await FX.muerte(c(e.a));
      break;
    case 'pasiva':
      FX.textoSobre(c(e.id), `✦ ${e.nombre}`, '#e9d5ff', 14, -125);
      log(`✦ Pasiva de ${nombre(e.id)}: ${e.nombre}`, 'fx');
      await wait(250);
      break;
    case 'liderActua':
      FX.textoSobre(c(e.id), `👑 ${e.nombre}`, '#fde68a', 14, -125);
      log(`👑 Líder ${nombre(e.id)}: ${e.nombre}`, 'fx');
      await wait(300);
      break;
    case 'bono': aplicar(e); FX.textoSobre(c(e.id), e.texto, '#fbbf24', 14, -125); log(`${nombre(e.id)}: ${e.texto}`, 'fx'); break;
    case 'invocacion':
      log(`${nombre(e.de)} invoca a ${INVOCACIONES[e.key].nombre}${e.rareza ? ` (${e.rareza})` : ''}`, e.rareza === 'Legendario' ? 'sys' : 'fx');
      if (e.rareza === 'Legendario') { banner(`¡${INVOCACIONES[e.key].nombre.toUpperCase()}!`, { size: 70, color: '#fbbf24', hold: 1 }); await wait(700); }
      await FX.invocacion(c(e.de), e.key, e.idx);
      aplicar(e);
      break;
    case 'invocacionActua':
      log(`${INVOCACIONES[e.key].nombre} actúa`, 'fx');
      await FX.invocacionPulso(c(e.de), e.key, e.idx);
      break;
    case 'dominio':
      aplicar(e);
      { const extra = e.potencia > 1 ? ` +${Math.round((e.potencia - 1) * 100)}%` : '', veces = e.veces > 1 ? ` ×${e.veces}` : '';
        FX.textoSobre(c(e.id), `👑 Invocaciones${veces}${extra}`, '#c4b5fd', 16, -125);
        log(`${nombre(e.id)}: sus invocaciones actúan${e.veces > 1 ? ` ${e.veces} veces` : ''}${extra ? ` con${extra} de potencia` : ''}`, 'sys'); }
      await wait(300);
      break;
    case 'invocacionRetira': FX.invocacionSeVa(c(e.de), e.key); aplicar(e); log(`${INVOCACIONES[e.key].nombre} se retira`); break;
    case 'invocacionRenueva': aplicar(e); FX.textoSobre(c(e.de), 'Invocación renovada', '#fbbf24', 14, -125); break;
    case 'invocacionExpira': FX.invocacionSeVa(c(e.de), e.key); log(`${INVOCACIONES[e.key].nombre} de ${nombre(e.de)} se desvanece`); break;
    case 'invocacionAtaca':
      log(`${INVOCACIONES[e.key].nombre} ataca a ${nombre(e.a)}`, 'fx');
      enVuelo.push({ key: e.key, de: e.de, spr: await FX.invocacionSale(c(e.de), e.key, e.idx, c(e.a)) });
      break;
    case 'invocacionVuelve': {        // vuelve la última que salió de ese tipo (y de ese invocador)
      const i = enVuelo.findLastIndex(v => v.key === e.key && v.de === e.de);
      const [v] = i >= 0 ? enVuelo.splice(i, 1) : [];
      await FX.invocacionVuelve(v?.spr);
      break;
    }
    case 'actualizar': case 'finRonda': aplicar(e); break;
    case 'transformacion':
      log(`🔥 ${nombre(e.id)} se transforma en ${e.nombre}`, 'sys');
      await FX.transformacion(c(e.id), e.color, e.nombre, () => c(e.id).cambiarForma(e.s[e.id].forma));
      aplicar(e);
      break;
    case 'esquiva':
      FX.textoSobre(c(e.a), '💨 ESQUIVA', '#bfdbfe', 16, -125);
      log(`${nombre(e.a)} esquiva el ataque de área`, 'fx');
      break;
    case 'sigiloRoto':
      aplicar(e); FX.textoSobre(c(e.a), '👤 Sigilo roto', '#cbd5e1', 14, -125);
      log(`${nombre(e.a)} pierde el Sigilo`, 'fx');
      break;
    case 'turnoExtraGanado':
      FX.textoSobre(c(e.id), '⏩ +1 turno', '#fde68a', 15, -125);
      log(`⏩ ${nombre(e.id)} gana un turno extra`, 'fx');
      await wait(250);
      break;
    case 'turnoExtra':
      aplicar(e);
      banner('¡TURNO EXTRA!', { size: 40, color: '#fde68a', hold: .4 }); await wait(450);
      log(`⏩ Turno extra de ${nombre(e.id)}`, 'sys');
      break;
    case 'transformacionFin':
      log(`${nombre(e.id)} vuelve a su forma original`, 'sys');
      await FX.revertir(c(e.id), () => c(e.id).cambiarForma(null));
      aplicar(e);
      break;
    case 'auraFuego':
      FX.textoSobre(c(e.a), '♨️ Aura de Fuego', '#ff8a5c', 13, -125);
      log(`Aura de Fuego de ${nombre(e.a)} contraataca a ${nombre(e.de)}`, 'fx');
      await wait(150);
      break;
    case 'bonoVisible': case 'extension':
      aplicar(e); FX.textoSobre(c(e.a), e.texto, e.t === 'extension' ? '#ffa04d' : '#86efac', 14, -125);
      log(`${nombre(e.a)}: ${e.texto}`, 'fx');
      await wait(180);
      break;
    case 'bonoOculto':
      aplicar(e); FX.textoSobre(c(e.id), '🛡️ ' + e.texto, '#fcd34d', 14, -125);
      log(`${nombre(e.lider)} (líder): ${nombre(e.id)} gana ${e.texto}`, 'fx');
      break;
  }
}

async function procesar(res) {
  const esta = partida;
  ui.ocupado = true; barra();
  for (const e of res.eventos) { if (esta !== partida) return; await manejar(e); }
  if (esta !== partida) return;
  if (res.fin) return terminar(res.fin);
  const esp = res.esperando;
  const actor = por(esp.id);
  ui.actual = esp.id; ui.opciones = esp.opciones;
  if (actor.lado === 'jugador') {
    ui.miTurno = true; ui.ocupado = false;
    inspeccionar(actor.uid);
    setHint(`Turno de ${actor.nombre}: elige un movimiento`);
    barra();
  } else {
    ui.miTurno = false;
    inspeccionar(actor.uid);
    setHint(`Turno rival: ${actor.nombre}`);
    await wait(700);
    if (esta !== partida) return;
    await procesar(combate.actuar(elegirIA(combate)));
  }
}

function terminar(fin) {
  ui.fin = fin; ui.miTurno = false; ui.actual = null; ui.ocupado = true; barra(); setHint('');
  // la ventana de resultados aparece a los 0.7 s; la música del menú entra 2 s después de la ventana
  finDePartida(fin.ganador === 'empate' ? null : fin.ganador === 'jugador', 700 + 2000);
  const personajes = combate.estadisticas().map(e => {
    const p = por(e.uid), f = vistas[e.uid]?.forma;            // si terminó transformado, se muestra su forma
    return { ...e, nombre: f?.nombre || p.nombre, imagen: f?.imagen || p.imagen, emoji: f?.emoji || p.emoji, color: f?.color || p.color };
  });
  const esta = partida;
  setTimeout(() => esta === partida && mostrarResultados({ gano: fin.ganador === 'jugador', empate: fin.ganador === 'empate', limite: !!fin.limite, ronda: fin.ronda, duracionMs: Date.now() - inicioPartida, personajes, recompensas: fin.recompensas || [] }), 700);
}

// ---------------------------------------------------------------- entrada del jugador
function cancelarObjetivo() {
  ui.movSel = null; ui.objetivosValidos = null; ui.tipoObjetivo = null;
  if (ui.miTurno) setHint(`Turno de ${nombre(ui.actual)}: elige un movimiento`);
  refrescarPanel();
}
async function ejecutar(categoria, objetivo) {
  ui.miTurno = false; ui.movSel = null; ui.objetivosValidos = null; ui.tipoObjetivo = null;
  setHint(''); refrescarPanel();
  await procesar(combate.actuar({ categoria, objetivo }));
}
function elegirMovimiento(cat) {
  if (!ui.miTurno || ui.ocupado) return;
  const op = ui.opciones.find(o => o.categoria === cat);
  if (!op?.disponible) return;
  const mov = (vistas[ui.actual]?.movs || por(ui.actual).movimientos).find(m => m.categoria === cat);
  if (mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') {
    ui.movSel = cat; ui.objetivosValidos = op.objetivos; ui.tipoObjetivo = mov.objetivo;
    setHint(`${mov.nombre}: elige ${mov.objetivo === 'aliado' ? 'un aliado' : 'un enemigo'} · ${document.body.classList.contains('movil') ? 'toca el movimiento otra vez para cancelar' : 'Esc para cancelar'}`);
    refrescarPanel();
  } else ejecutar(cat, null);
}
function tocarCarta(carta) {
  if (ui.movSel && ui.miTurno && ui.objetivosValidos?.includes(carta.p.uid)) { ejecutar(ui.movSel, carta.p.uid); return; }
  inspeccionar(carta.p.uid);
  if (document.body.classList.contains('movil')) document.body.classList.add('panel-abierto');   // celular: abre el cajón
}

const cerrarPanel = () => document.body.classList.remove('panel-abierto');
$('#panel-close').addEventListener('click', cerrarPanel);
$('#panel-fondo').addEventListener('click', cerrarPanel);
$('#girar-x').addEventListener('click', () => $('#girar').classList.add('cerrado'));
$('#actionbar').addEventListener('click', e => {
  const b = e.target.closest('.act');
  if (!b || b.classList.contains('off')) return;
  if (ui.movSel === b.dataset.cat) { cancelarObjetivo(); return; }       // clic otra vez = cancelar
  elegirMovimiento(b.dataset.cat);
});
function alternar(id, boton) {
  const el = $(id), abrir = el.classList.contains('hidden');
  for (const [otro, btn] of [['#log-panel', '#btn-log'], ['#test-panel', '#btn-test']]) { $(otro).classList.add('hidden'); $(btn).classList.remove('on'); }
  if (abrir) { el.classList.remove('hidden'); $(boton).classList.add('on'); }
  if (id === '#log-panel') logLeido();
}
$('#btn-log').addEventListener('click', () => alternar('#log-panel', '#btn-log'));
$('#log-close').addEventListener('click', () => alternar('#log-panel', '#btn-log'));
$('#btn-test').addEventListener('click', () => alternar('#test-panel', '#btn-test'));

// ---------------------------------------------------------------- pantalla completa
// PC y Android: API de pantalla completa (+ girar a horizontal en móvil). iPhone: Safari no la permite en
// páginas, así que se explica cómo instalarlo en la pantalla de inicio (ahí abre sin barras).
const raiz = document.documentElement;
const enPantallaCompleta = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const instalada = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
if (instalada) document.body.classList.add('app-instalada');
function marcarFull() {
  const on = enPantallaCompleta();
  $('#btn-full').classList.toggle('on', on);
  $('#btn-full').innerHTML = on ? '⛶<span class="lbl"> Salir</span>' : '⛶<span class="lbl"> Pantalla completa</span>';
}
$('#btn-full').addEventListener('click', async () => {
  try {
    if (enPantallaCompleta()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
    if (!pedir) { $('#ios-tip').classList.remove('hidden'); return; }
    await pedir.call(raiz, { navigationUI: 'hide' });
    if (matchMedia('(pointer: coarse)').matches) await screen.orientation?.lock?.('landscape').catch(() => {});
  } catch (e) { console.warn('Pantalla completa no permitida:', e?.message); }   // p. ej. el navegador la rechazó
});
$('#ios-ok').addEventListener('click', () => $('#ios-tip').classList.add('hidden'));
document.addEventListener('fullscreenchange', marcarFull);
document.addEventListener('webkitfullscreenchange', marcarFull);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (ajustesAbiertos()) { cerrarAjustes(); return; }
  if (guiaAbierta()) { cerrarGuia(); return; }
  if (document.body.classList.contains('panel-abierto')) { cerrarPanel(); return; }
  if (ui.movSel) cancelarObjetivo();
  else if (!$('#log-panel').classList.contains('hidden')) alternar('#log-panel', '#btn-log');
  else if (!$('#test-panel').classList.contains('hidden')) alternar('#test-panel', '#btn-test');
});
$('#ov-revancha').addEventListener('click', () => jugar(ultima.jugador.map(porId), ultima.rival.map(porId), ultima.rivalModo));
$('#ov-equipo').addEventListener('click', () => { cargarSeleccion(ultima.jugador.map(porId), ultima.rival.map(porId), ultima.rivalModo); irA('equipo'); });
$('#ov-menu').addEventListener('click', () => irA('menu'));
$('#btn-menu').addEventListener('click', () => { if (ui.fin || confirm('¿Abandonar la partida y volver al menú?')) irA('menu'); });
$('#menu-full').addEventListener('click', () => $('#btn-full').click());
$('#test-panel').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || !ui.miTurno || ui.ocupado) return;
  cancelarObjetivo();
  await procesar(combate.probar(ui.inspeccionado, b.dataset.fx));
});

// Acceso para pruebas desde la consola del navegador (p. ej. que la IA juegue por el jugador)
window.__os2 = { combate, ui, jugarIA: () => ui.miTurno && !ui.ocupado && (() => { const d = elegirIA(combate); return ejecutar(d.categoria, d.objetivo); })() };
window.__os2.audio = { sonar, finDePartida };          // pruebas de sonido desde la consola
window.__os2.empezar = (j, r) => jugar(j.map(porId), r.map(porId), 'construir');   // pruebas: __os2.empezar(['goku',...], [...])

iniciarGuia();
iniciarResultados();
iniciarAjustes();
iniciarCuenta();
iniciarColeccion();
// Clic de interfaz para todos los botones (los que tienen su propio sonido lo suman encima)
document.addEventListener('click', e => { if (e.target.closest('button:not([disabled]):not(.act.off)')) sonar('clic'); }, true);

// ---------------------------------------------------------------- inicio: menú, o directo a la partida si venimos de "Revancha"/"Jugar"
iniciarMenu({ jugar: (j, r) => jugar(j, r, document.querySelector('.eq-modo button.on')?.dataset.modo || 'azar'), salirDePartida });
let pendiente = null;
try { pendiente = JSON.parse(sessionStorage.getItem('os2-partida') || 'null'); sessionStorage.removeItem('os2-partida'); } catch (e) { /* sin almacenamiento */ }
const eqs = pendiente && [pendiente.jugador.map(porId), pendiente.rival.map(porId)];
if (eqs && eqs.every(eq => eq.length === 5 && eq.every(Boolean))) {
  ultima = pendiente;
  irA('partida', { reemplazar: true });
  await presentarVS(...eqs);
  await iniciarPartida(...eqs);
} else irA('menu', { reemplazar: true });
