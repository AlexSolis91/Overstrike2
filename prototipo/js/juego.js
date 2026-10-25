// Punto de entrada: une el motor (reglas) con la interfaz (animaciones y panel).
import { MUSICA } from './datos/sonidos.js';
import { ICONO_RUNA_PORTAL } from './datos/recompensas.js';
import { iniciarEscena, G, W, wait, banner, relayout, shakeScene, setVelocidad } from './ui/graficos.js';
import { iniciarCampana, abrirCampana, cerrarBatalla, siguienteEtapa, jugarEtapa, elegirEquipoEtapa, esperaRepeticion } from './ui/campana.js';
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
import { cargarCuenta, conCuenta, cuentaDesdeServidor } from './servicios/cuentaBatalla.js';
import * as D from './servicios/datos.js';
import { oleada, defsOleada, HORDAS } from './datos/horda/horda.js';
import { iniciarHorda, abrirHorda } from './ui/horda.js';
import { iniciarArena, abrirArena } from './ui/arena.js';
import { conectarVivo, swapUid, ganadorRelativo } from './servicios/arenaVivo.js';
import { crearRng } from './motor/rng.js';
import { semillaIA } from './motor/verificar.js';
import { supabase } from './servicios/supabase.js';
import { RELIQUIAS, RAREZAS } from './datos/reliquias.js';

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
  OFICIALES.flatMap(p => { const l = [p.imagen]; for (let f = p.transformacion; f; f = f.transformacion) l.push(f.imagen); return l; })
    .concat(Object.values(INVOCACIONES).map(i => i.imagen), Object.values(HORDAS).flatMap(h => Object.values(h.enemigos).map(e => e.imagen))),   // + enemigos de la Horda
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

async function iniciarPartida(eqJ, eqR, opciones = null) {
  partida++;
  inicioPartida = Date.now();
  const vivo = opciones?.arena?.vivo;
  const cuenta = vivo ? cuentaDesdeServidor(opciones.arena.equipoMio) : await cargarCuenta();   // tus estrellas y reliquias pelean contigo
  eqJ = eqJ.map(d => conCuenta(d, cuenta));
  if (opciones?.arena?.equipoRival) { const cr = cuentaDesdeServidor(opciones.arena.equipoRival); eqR = eqR.map(d => conCuenta(d, cr)); }   // la Defensa de otro jugador con sus estrellas y reliquias
  combate = crearCombate({ equipoJugador: eqJ, equipoRival: eqR, rival: opciones?.rival, invertido: !!opciones?.invertido, ...(opciones?.semilla != null ? { semilla: opciones.semilla } : {}) });
  P = combate.personajes;
  const serie = opciones?.serie || 0;                         // en una serie de repeticiones siempre va en Auto y ×2
  ui = { actual: null, inspeccionado: P[0].uid, miTurno: false, movSel: null, objetivosValidos: null, tipoObjetivo: null, ocupado: true, opciones: null,
    camp: opciones?.campana || null, horda: opciones?.horda || null, arena: opciones?.arena || null, vivo: null, serie, auto: !!serie || autoActivo };
  setVelocidad(serie ? 2 : velocidad); marcarControles();
  vistas = {}; cartas = {};
  for (const p of P) crearCarta(p);
  G.alTick = [(dt, T) => { for (const c of Object.values(cartas)) c.tick(dt, T, ui); }];
  window.__os2.combate = combate; window.__os2.ui = ui; window.__os2.cartas = cartas;
  irA('partida');
  relayout();
  entrarCartas(Object.values(cartas));
  refrescarPanel();
  actualizarJefe();
  if (vivo) { ui.vivo = conectarVivo(opciones.arena, { alAbandonar: () => abandonoRival() }); ui.auto = false; marcarControles(); }
  else if (ui.arena) { ui.arena.decisiones = []; ui.arena.rnd = crearRng(semillaIA(opciones.semilla)); }   // contra una Defensa: se guardan las decisiones para verificarlas
  await wait(1100);
  await anunciar();
  if (vivo) { banner(`⚔️ EN VIVO vs ${opciones.arena.rival?.nombre || 'rival'}`, { size: 40, color: '#fde68a', hold: 1.2 }); await wait(1500); }
  await procesar(combate.iniciar());
}
function crearCarta(p) {
  cartas[p.uid] = new Carta(p, colX(p.pos), p.lado === 'rival' ? 215 : 585, tocarCarta);
  vistas[p.uid] = combate.vista(p);
  cartas[p.uid].aplicar(vistas[p.uid], true);
}
function entrarCartas(lista) {
  for (const [i, carta] of lista.entries()) {
    const desde = carta.p.lado === 'jugador' ? 1000 : -200;
    carta.c.y = desde; carta.c.alpha = 0;
    gsap.to(carta.c, { y: carta.hy, alpha: 1, duration: .6, delay: .15 + (i % 5) * .08 + (carta.p.lado === 'jugador' ? .2 : 0), ease: 'back.out(1.4)' });
  }
}
// Aviso al empezar: oleada de la Horda y/o jefe (Campaña y Horda)
async function anunciar() {
  const h = ui.horda;
  if (h) { banner(`🧟 Oleada ${h.n}`, { size: 52, color: '#bef264', hold: .9 }); await wait(1300); }
  const jefe = P.find(p => p.lado === 'rival' && vistas[p.uid]?.jefe);
  const tipo = h ? (h.rango === 'jefe' ? 'JEFE' : 'MINI-JEFE') : ui.camp?.etapa === 20 ? 'JEFE FINAL' : 'MINI-JEFE';
  if (jefe) { banner(`⚠️ ${tipo}: ${jefe.nombre}`, { size: 46, color: '#fca5a5', hold: 1.3 }); shakeScene(8); await wait(1600); }
}

// Empezar una partida (Listo, Revancha). Sin recargar la página: se limpia la anterior, así el audio sigue activo.
// La música de batalla (un tema al azar) empieza 2 segundos después.
async function jugar(eqJ, eqR, rivalModo, opciones = null) {
  ultima = { jugador: eqJ.map(p => p.id), rival: eqR.map(p => p.id), rivalModo, opciones };
  if (combate) limpiarPartida();
  nuevaPartida();
  const esta = ++arranques;
  const tema = opciones?.horda ? `horda${opciones.horda.horda[0].toUpperCase()}${opciones.horda.horda.slice(1)}` : 'batalla';   // Horda de Orcos → 'hordaOrcos'
  setTimeout(() => { if (esta === arranques) musica(MUSICA[tema] ? tema : 'batalla'); }, 2000);
  await presentarVS(eqJ, eqR);
  await iniciarPartida(eqJ, eqR, opciones);
}
let arranques = 0;
// Quita todo lo visual de la partida anterior: cartas, efectos, textos, animaciones pendientes, registro y resultados
function matarTweens(o) { gsap.killTweensOf(o); if (o.scale) gsap.killTweensOf(o.scale); for (const h of o.children || []) matarTweens(h); }
function limpiarPartida() {
  partida++;
  const base = [G.bgLayer, G.ambLayer, G.cardLayer, G.fxLayer, G.textLayer];
  for (const c of Object.values(cartas)) if (c.face?.texture && !c.face.texture.destroyed) c.face.texture.destroy(true);   // imágenes de las cartas (memoria gráfica)
  const restos = [...G.cardLayer.children, ...G.fxLayer.children, ...G.textLayer.children, ...G.scene.children.filter(x => !base.includes(x))];
  for (const o of restos) { matarTweens(o); o.parent?.removeChild(o); if (!o.destroyed) o.destroy({ children: true }); }
  G.alTick = [];
  combate = null; P = []; cartas = {}; vistas = {}; embestida = null; enVuelo = []; overEnCurso = null;
  $('#log').innerHTML = ''; logLeido();
  $('#overlay').classList.add('hidden');
}
function salirDePartida() { if (ui.vivo && !ui.fin) { D.arenaVivoResultado(ui.arena.partida, ui.arena.soy === 'a' ? 'b' : 'a').catch(() => null); } ui.vivo?.cerrar(); ui.vivo = null; cerrarHorda(); $('#horda-ov').classList.add('hidden'); partida++; ui.miTurno = false; ui.ocupado = true; ui.serie = 0; clearTimeout(serieT); $('#overlay').classList.add('hidden'); setVelocidad(1); $('#jefe-barra').classList.add('hidden'); }

// ---------------------------------------------------------------- Auto-batalla y velocidad (se recuerdan en este dispositivo)
let autoActivo = false, velocidad = 1, serieT = null;
try { autoActivo = localStorage.getItem('os2-auto') === '1'; velocidad = localStorage.getItem('os2-vel') === '2' ? 2 : 1; } catch (e) { /* sin almacenamiento */ }
function marcarControles() {
  const v = ui.serie ? 2 : velocidad;
  $('#btn-auto').classList.toggle('on', !!ui.auto);
  $('#btn-vel').textContent = `×${v}`; $('#btn-vel').classList.toggle('on', v === 2);
}
// Barra del Jefe (Campaña): nombre, vida y estado de furia
function actualizarJefe() {
  const j = P.find(p => p.lado === 'rival' && vistas[p.uid]?.jefe), bar = $('#jefe-barra');
  if (!j) return bar.classList.add('hidden');
  const v = vistas[j.uid];
  bar.classList.remove('hidden'); bar.classList.toggle('furia', !!v.jefe.furia); bar.classList.toggle('muerto', !!v.muerto);
  bar.querySelector('.jb-nombre').textContent = `${ui.camp?.etapa === 20 || ui.horda?.rango === 'jefe' ? '👑' : '💀'} ${j.nombre}${v.jefe.furia ? ' · 🔥 FURIA' : ''}`;
  bar.querySelector('i').style.width = `${Math.max(0, v.hp / v.maxHp * 100)}%`;
}

function refrescarPanel() { renderPanel(por(ui.inspeccionado), vistas[ui.inspeccionado], ui); refrescarAccion(); }
function refrescarAccion() { renderAccion(por(ui.actual), vistas[ui.actual], ui); }
function inspeccionar(uid) { ui.inspeccionado = uid; refrescarPanel(); }
function aplicar(e) {
  if (!e.s) return;
  for (const [uid, v] of Object.entries(e.s)) { vistas[uid] = v; cartas[uid].aplicar(v); }
  actualizarJefe();
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
// Sonido del disparo (suena cuando sale el efecto visual del disparo, en lugar del sonido normal del movimiento):
// por el elemento del movimiento (elemento: 'hielo'…) o por lo que aplica (Quemadura = fuego, Congelación = hielo), también cuerpo a cuerpo;
// cualquier otro golpe a distancia suena a 'disparo'
const SONIDO_ELEMENTO = { fuego: 'fuego', hielo: 'disparoHielo' };
const SONIDO_DISPARO = { burn: 'fuego', freeze: 'disparoHielo' };
const sonidoDisparo = e => !e.golpea ? null
  : SONIDO_ELEMENTO[e.elemento] || (e.aplica || []).map(id => SONIDO_DISPARO[id]).find(Boolean) || (e.estilo === 'ranged' ? 'disparo' : null);
function sonidoDe(e) {
  switch (e.t) {
    case 'ronda': return 'ronda';
    case 'movimiento':
      if (e.categoria === 'over') sonar('over');
      if (sonidoDisparo(e)) return null;            // su sonido suena al salir el disparo (ver 'movimiento' en manejar)
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
    case 'nuevoLider': return 'lider';
    case 'invocacion': return e.rareza === 'Legendario' ? 'invocacionLegendaria' : 'invocacion';
    case 'invocacionAtaca': return 'lanzar';
    case 'transformacion': return 'transformacion';
    case 'revivir': return 'revivir';
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
    case 'nuevoLider':
      aplicar(e); FX.textoSobre(c(e.id), '👑 NUEVO LÍDER', '#fde047', 20, -125); shakeScene(8);
      banner(e.texto, { size: 40, color: '#fde68a', hold: 1.2 }); log(`👑 ${nombre(e.id)} surge como líder: ${e.nombre}`, 'sys');
      await wait(1500);
      break;
    case 'jefeFuria':
      aplicar(e); FX.textoSobre(c(e.id), '🔥 FURIA', '#f87171', 22, -125); shakeScene(10);
      banner(e.texto, { size: 30, color: '#fca5a5' }); log(`${nombre(e.id)} entra en FURIA`, 'fx');
      await wait(1300);
      break;
    case 'dot':
      aplicar(e); FX.dot(c(e.a), e.dano, e.tipo);
      log(`${nombre(e.a)} pierde ${Math.round(e.dano)} (${{ burn: 'Quemadura', poison: 'Veneno', bleed: 'Sangrado', hemo: 'Hemorragia', bomb: 'Bomba', solarBurn: 'Quemadura Solar', aguja: 'Agujas Escarlata' }[e.tipo]})`, 'dmg');
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
      const disparo = sonidoDisparo(e);
      if (e.estilo === 'melee' && objetivos[0] && objetivos[0] !== a) { if (disparo) sonar(disparo); await FX.embestir(a, objetivos[0]); embestida = a; }
      else {
        FX.lanzar(a, e.color);
        const lejos = objetivos.filter(t => t !== a);
        if (disparo && !lejos.length) sonar(disparo);
        if (lejos.length) { await wait(150); if (disparo) sonar(disparo); await Promise.all(lejos.map((t, i) => wait(i * 90).then(() => FX.proyectilA(a, t, e.color, e.estilo === 'support' ? .5 : .42)))); }
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
    case 'revivir':
      aplicar(e); log(`🐒 ${nombre(e.a)} vuelve a la vida${e.nombre ? ` (${e.nombre})` : ''}`, 'sys');
      await FX.revivir(c(e.a));
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
    case 'auraGelida':
      FX.textoSobre(c(e.a), '🧊 Aura Gélida', '#7dd3fc', 13, -125);
      log(`Aura Gélida de ${nombre(e.a)} contraataca a ${nombre(e.de)}`, 'fx');
      await wait(150);
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
    setHint(ui.auto ? `🤖 Auto: ${actor.nombre}` : `Turno de ${actor.nombre}: elige un movimiento${ui.vivo ? ' (25 s)' : ''}`);
    barra();
    if (ui.vivo) relojTurno(esta, ui.vivo.turno);            // en vivo: 25 s para elegir; si no, juega la IA por ti
    if (ui.auto) await jugarAuto(esta);
  } else {
    ui.miTurno = false;
    inspeccionar(actor.uid);
    setHint(ui.vivo ? `⏳ Turno de ${ui.arena.rival?.nombre || 'tu rival'}: ${actor.nombre}` : `Turno rival: ${actor.nombre}`);
    if (ui.vivo) {                                           // en vivo: la decisión llega del otro jugador
      const d = await ui.vivo.esperar(ui.vivo.turno);
      if (esta !== partida || !d) return;
      ui.vivo.turno++;
      return procesar(combate.actuar({ categoria: d.categoria, objetivo: swapUid(d.objetivo) }));
    }
    await wait(700);
    if (esta !== partida) return;
    if (ui.arena?.decisiones) {                               // la Defensa: IA con azar de semilla (el servidor la puede repetir)
      const d = elegirIA(combate, ui.arena.rnd); ui.arena.decisiones.push({ c: d.categoria, o: d.objetivo || null });
      return procesar(combate.actuar(d));
    }
    await procesar(combate.actuar(elegirIA(combate)));
  }
}

// En vivo: si el jugador no elige en 25 s, la IA juega su turno (y la decisión se envía igual)
function relojTurno(esta, n) {
  setTimeout(() => {
    if (esta !== partida || !ui.vivo || !ui.miTurno || ui.ocupado || ui.vivo.turno !== n) return;
    cancelarObjetivo(); const d = elegirIA(combate); ejecutar(d.categoria, d.objetivo);
  }, 25000);
}
// En vivo: el rival dejó de responder 60 s → ganas por abandono
function abandonoRival() {
  if (!ui.vivo || ui.fin) return;
  partida++;                                               // corta lo que esté esperando
  const esta = partida;
  ui.fin = { ganador: 'jugador', ronda: combate.ronda, abandono: true }; ui.ocupado = true;
  finDePartida(true, 700 + 2000);
  const personajes = combate.estadisticas().map(e => { const p = por(e.uid); return { ...e, nombre: p.nombre, imagen: p.imagen, emoji: p.emoji, color: p.color }; });
  botonesResultado(true);
  partida = esta;
  finArena({ gano: true, empate: false, limite: false, ronda: combate.ronda, duracionMs: Date.now() - inicioPartida, personajes }, ui.fin);
}

// Auto-batalla: la IA elige por el jugador (se puede apagar en cualquier momento)
async function jugarAuto(esta) {
  await wait(350);
  if (esta !== partida || !ui.auto || !ui.miTurno || ui.ocupado) return;
  const d = elegirIA(combate);
  return ejecutar(d.categoria, d.objetivo);
}

function terminar(fin) {
  ui.fin = fin; ui.miTurno = false; ui.actual = null; ui.ocupado = true; barra(); setHint('');
  if (ui.horda && fin.ganador === 'jugador') return oleadaGanada();          // Horda: la batalla sigue con otra oleada
  // la ventana de resultados aparece a los 0.7 s; la música del menú entra 2 s después de la ventana
  finDePartida(fin.ganador === 'empate' ? null : fin.ganador === 'jugador', 700 + 2000);
  const personajes = combate.estadisticas().map(e => {
    const p = por(e.uid), f = vistas[e.uid]?.forma;            // si terminó transformado, se muestra su forma
    return { ...e, nombre: f?.nombre || p.nombre, imagen: f?.imagen || p.imagen, emoji: f?.emoji || p.emoji, color: f?.color || p.color };
  });
  const esta = partida, gano = fin.ganador === 'jugador';
  const base = { gano, empate: fin.ganador === 'empate', limite: !!fin.limite, ronda: fin.ronda, duracionMs: Date.now() - inicioPartida, personajes };
  botonesResultado(gano);
  if (ui.horda) return void finHorda(base, false);
  if (ui.arena) return void finArena(base, fin);
  if (!ui.camp) return void setTimeout(() => esta === partida && mostrarResultados({ ...base, recompensas: fin.recompensas || [] }), 700);
  // Campaña: estrellas y cobro en el servidor; luego (si es una serie) la siguiente repetición
  const muertosAliados = P.filter(p => p.lado === 'jugador' && vistas[p.uid]?.muerto).length;
  Promise.all([cerrarBatalla({ campana: ui.camp, gano, muertosAliados, rondas: fin.ronda }), wait(700)]).then(([res]) => {
    if (esta !== partida) return;
    if (ui.serie > 1 && gano && !res.error) res.serie = { quedan: ui.serie - 1 };
    mostrarResultados({ ...base, recompensas: res.recompensas || [], campana: res });
    if (res.serie) programarRepeticion(esta);
  });
}

// ---------------------------------------------------------------- Horda: entre oleadas, retirarse y botín
const miles = n => Math.round(n).toLocaleString('es-MX');
async function cobrarOleada(h) {
  if (!h.partida) return null;
  try { return await D.hordaOleada(h.partida, h.n); }
  catch (e) {                                            // el servidor pide 10 s entre oleadas: espera y reintenta una vez
    if (!/rápido/i.test(e?.message || '')) throw e;
    await wait(10500); return D.hordaOleada(h.partida, h.n);
  }
}
async function oleadaGanada() {
  const h = ui.horda, esta = partida;
  let r = null, error = '';
  try { r = await cobrarOleada(h); } catch (e) { error = D.mensajeError(e); }
  if (esta !== partida) return;
  if (r) { h.botin.oro += r.oro; if (r.reliquia) h.botin.reliquias.push(r.reliquia); h.botin.fragmentos += r.fragmentos;
    h.botin.trofeos = (h.botin.trofeos || 0) + (r.trofeos || 0) + (r.hito?.trofeos || 0); if (r.hito?.epica) h.botin.reliquias.push(r.hito.epica); }
  h.prox = oleada(h.n + 1);
  const item = (img, txt, color = '#374151') => `<div class="hov-item" style="--rc:${color}">${img}${txt}</div>`;
  const rel = r?.reliquia && RELIQUIAS[r.reliquia.reliquia];
  const aviso = h.prox.rango === 'jefe' ? '⚠️ Siguiente: ¡JEFE!' : h.prox.rango === 'miniJefe' ? '⚠️ Siguiente: ¡MINI-JEFE!' : '';
  $('#horda-ov .hov-caja').innerHTML = `
    <h2>¡Oleada ${h.n} superada!</h2>
    <div class="hov-sub">Botín de esta oleada</div>
    <div class="hov-botin">
      ${r ? item('<div style="font-size:34px">🪙</div>', `+${miles(r.oro)} de oro`) : ''}
      ${rel ? item(`<img src="${rel.imagen}" alt="">`, `<span style="color:${RAREZAS[rel.rarity].color}">${rel.name}</span>`, RAREZAS[rel.rarity].color) : ''}
      ${r?.fragmentos ? item('<div style="font-size:34px">🔷</div>', `+${r.fragmentos} Fragmento(s) de Runa`) : ''}
      ${r?.trofeos ? item('<div style="font-size:34px">🏅</div>', `+${r.trofeos} Trofeo(s) de Orco`) : ''}
      ${r?.hito ? item('<div style="font-size:34px">🎉</div>', `<b>¡Primera vez en la oleada ${r.hito.oleada}!</b><br>+${r.hito.runas_portal} ${ICONO_RUNA_PORTAL} Runas de Portal${r.hito.vales ? ` · +${r.hito.vales} vale(s) de sobre` : ''} · +${r.hito.trofeos} Trofeos${r.hito.epica ? ` · Épica: ${RELIQUIAS[r.hito.epica.reliquia]?.name || ''}` : ''}${r.hito.hazana ? '<br>🏆 <b>Hazaña conseguida:</b> ya puedes forjar Legendarias' : ''}`, '#f59e0b') : ''}
      ${error ? `<div class="hov-sig">⚠️ ${error}</div>` : ''}
    </div>
    <div class="hov-total">Total: 🪙 ${miles(h.botin.oro)} · 💎 ${h.botin.reliquias.length} reliquia(s) · 🔷 ${h.botin.fragmentos} · 🏅 ${h.botin.trofeos || 0}</div>
    ${aviso ? `<div class="hov-sig">${aviso}</div>` : ''}
    <div class="hov-botones"><button id="hov-seguir" class="hd-btn">⚔️ Oleada ${h.n + 1}</button><button id="hov-retirar" class="hd-btn sec">🏳️ Retirarse</button></div>`;
  $('#horda-ov').classList.remove('hidden');
}
async function siguienteOleada() {
  const h = ui.horda;
  $('#horda-ov').classList.add('hidden');
  h.n++; const o = h.prox; h.rango = o.rango;
  for (const uid of Object.keys(cartas)) if (uid.startsWith('rival-')) {      // fuera la oleada anterior
    const c = cartas[uid]; matarTweens(c.c); c.c.parent?.removeChild(c.c); if (!c.c.destroyed) c.c.destroy({ children: true });
    delete cartas[uid]; delete vistas[uid];
  }
  const res = combate.siguienteOleada(defsOleada(o), o.opciones);
  P = combate.personajes;
  const nuevos = P.filter(p => p.uid.startsWith('rival-'));
  for (const p of nuevos) crearCarta(p);
  for (const p of P) { vistas[p.uid] = combate.vista(p); cartas[p.uid]?.aplicar(vistas[p.uid], true); }
  ui.fin = null; ui.ocupado = true;
  relayout(); entrarCartas(nuevos.map(p => cartas[p.uid]));
  refrescarPanel(); actualizarJefe();
  await wait(900);
  await anunciar();
  await procesar(res);
}
function cerrarHorda() {
  const h = ui.horda;
  if (!h || h.cerrada) return Promise.resolve(null);
  h.cerrada = true;
  return h.partida ? D.hordaTerminar(h.partida).catch(() => null) : Promise.resolve(null);
}
async function finHorda(base, retirado) {
  const h = ui.horda, esta = partida;
  $('#horda-ov').classList.add('hidden');
  const [res] = await Promise.all([cerrarHorda(), wait(700)]);
  if (esta !== partida) return;
  const recompensas = [{ tipo: 'oro', cantidad: h.botin.oro },
    ...h.botin.reliquias.map(f => { const c = RELIQUIAS[f.reliquia]; return { tipo: 'reliquia', cantidad: 1, rareza: c?.rarity, nombre: c?.name }; }),
    ...(h.botin.fragmentos ? [{ tipo: 'fragmento', cantidad: h.botin.fragmentos, nombre: 'Fragmentos de Runa' }] : [])];
  const superadas = retirado ? h.n : h.n - 1;
  mostrarResultados({ ...base, gano: retirado, recompensas });
  $('#ov-title').textContent = retirado ? '🏳️ Te retiraste' : '☠️ Tu equipo cayó';
  $('#ov-sub').textContent = `Oleadas superadas: ${superadas}${res?.record ? ` · Tu récord: ${res.record}` : ''} · Te llevas todo el botín`;
}
function retirarse() {
  const fin = ui.fin;
  finDePartida(true, 700 + 2000);
  const personajes = combate.estadisticas().map(e => { const p = por(e.uid); return { ...e, nombre: p.nombre, imagen: p.imagen, emoji: p.emoji, color: p.color }; });
  botonesResultado(true);
  finHorda({ gano: true, empate: false, limite: false, ronda: fin?.ronda || combate.ronda, duracionMs: Date.now() - inicioPartida, personajes }, true);
}
$('#horda-ov').addEventListener('click', e => {
  if (e.target.closest('#hov-seguir')) siguienteOleada();
  if (e.target.closest('#hov-retirar')) retirarse();
});

// ---------------------------------------------------------------- Arena: el servidor cobra el resultado (puntos y oro)
async function finArena(base, fin) {
  const a = ui.arena, esta = partida;
  if (a.vivo) return finVivo(base, fin);
  const gano = fin.ganador === 'jugador' && !fin.limite;              // contra una Defensa, el límite de rondas lo gana la Defensa
  let res = null, error = '';
  const cobrar = () => D.arenaResultado(a.combate, gano, a.decisiones);
  try {
    res = await cobrar();
    if (res?.pendiente) {                                              // verificación encendida: el servidor repite la batalla
      try { const sb = await supabase(); const v = await sb.functions.invoke('verificar-arena', { body: { combate: a.combate } });
        if (v.error) throw v.error; res = v.data; if (res?.error) throw new Error(res.error); }
      catch (e) { res = null; error = 'Tu resultado se está verificando; los puntos se sumarán en cuanto el servidor lo confirme.'; }
    }
  }
  catch (e) {                                                          // el servidor pide 15 s mínimos de combate
    if (/corto/i.test(e?.message || '')) { await wait(15500); try { res = await cobrar(); } catch (e2) { error = D.mensajeError(e2); } }
    else error = D.mensajeError(e);
  }
  if (esta !== partida) return;
  mostrarResultados({ ...base, gano, recompensas: res?.oro ? [{ tipo: 'oro', cantidad: res.oro }] : [] });
  $('#ov-title').textContent = res?.verificado === false ? '⚠️ Resultado no válido' : gano ? '🏆 Victoria' : fin.limite ? '🛡️ La Defensa resistió' : '💀 Derrota';
  $('#ov-sub').textContent = res ? `${res.delta >= 0 ? '+' : ''}${res.delta} puntos · ${res.puntos} puntos · ${res.liga}${res.diario ? ' · ataque diario' : ' · ataque extra (25%)'} · vs ${a.rival?.nombre || 'Defensa'}`
    : `⚠️ ${error || 'No se pudo guardar el resultado'}`;
}

// Arena en vivo: los dos jugadores reportan; si el otro no reporta (se fue), se acepta el tuyo a los 60 s
async function finVivo(base, fin) {
  const a = ui.arena, esta = partida, rel = ganadorRelativo(fin.ganador, a.soy);
  ui.vivo?.cerrar();
  let r = null, error = '';
  for (let i = 0; i < 4; i++) {
    try { r = await D.arenaVivoResultado(a.partida, rel); } catch (e) { error = D.mensajeError(e); break; }
    if (r.terminado) break;
    if (esta === partida) setHint('Esperando el resultado de tu rival…');
    await wait(25000);
  }
  if (esta !== partida) return;
  const gano = r?.ganador === a.soy;
  mostrarResultados({ ...base, gano, empate: fin.ganador === 'empate', recompensas: [] });
  $('#ov-title').textContent = r && !r.terminado ? '⏳ Resultado pendiente' : r?.ganador === 'anulada' ? '⚠️ Partida anulada'
    : fin.abandono ? '🏆 Victoria por abandono' : gano ? '🏆 Victoria' : fin.ganador === 'empate' ? 'Empate' : '💀 Derrota';
  if (r && !r.terminado) return void ($('#ov-sub').textContent = 'Tu rival todavía no confirma el resultado. Se guardará solo en cuanto el servidor lo acepte.');
  $('#ov-sub').textContent = r ? `${r.puntos} puntos · ${r.liga}${r.diario ? ' · ataque diario' : ' · ataque extra (25%)'} · en vivo vs ${a.rival?.nombre || 'rival'}`
    : `⚠️ ${error || 'No se pudo guardar el resultado'}`;
}

// Botones de la ventana de resultados: en Campaña son Siguiente etapa / Repetir / Cambiar equipo / Portal
function botonesResultado(gano) {
  const camp = ui.camp;
  const h = !!ui.horda, ar = !!ui.arena;
  $('#ov-revancha').classList.toggle('hidden', h || ar); $('#ov-equipo').classList.toggle('hidden', h || ar);
  $('#ov-siguiente').classList.toggle('hidden', !(camp && gano && siguienteEtapa(camp)));
  $('#ov-revancha').textContent = camp ? '🔁 Repetir' : '⚔️ Revancha';
  $('#ov-menu').textContent = camp ? '🌀 Portal' : h ? '🧟 Horda' : ar ? '🏟️ Arena' : '🏠 Menú';
}
// Serie de repeticiones: espera lo que pida el servidor entre victorias (90 s) y lanza la siguiente batalla en Auto ×2
function programarRepeticion(esta) {
  const camp = ui.camp, quedan = ui.serie - 1, eqJ = ultima.jugador.map(porId);
  const tick = () => {
    if (esta !== partida) return;
    const s = esperaRepeticion() + 2;
    const t = document.querySelector('#res-serie-t'); if (t) t.textContent = `Siguiente batalla en ${s} s · quedan ${quedan}`;
    serieT = setTimeout(s > 2 ? tick : () => { if (esta === partida) jugarEtapa(camp.dif, camp.etapa, eqJ, quedan); }, s > 2 ? 1000 : 2000);
  };
  tick();
}

// ---------------------------------------------------------------- entrada del jugador
function cancelarObjetivo() {
  ui.movSel = null; ui.objetivosValidos = null; ui.tipoObjetivo = null; ui.hayBloqueados = false;
  if (ui.miTurno) setHint(`Turno de ${nombre(ui.actual)}: elige un movimiento`);
  refrescarPanel();
}
async function ejecutar(categoria, objetivo) {
  ui.miTurno = false; ui.movSel = null; ui.objetivosValidos = null; ui.tipoObjetivo = null; ui.hayBloqueados = false;
  setHint(''); refrescarPanel();
  if (ui.vivo) { ui.vivo.enviar(ui.vivo.turno, categoria, objetivo); ui.vivo.turno++; }   // en vivo: la decisión viaja al otro jugador
  if (ui.arena?.decisiones) ui.arena.decisiones.push({ c: categoria, o: objetivo || null });
  await procesar(combate.actuar({ categoria, objetivo }));
}
function elegirMovimiento(cat) {
  if (!ui.miTurno || ui.ocupado) return;
  const op = ui.opciones.find(o => o.categoria === cat);
  if (!op?.disponible) return;
  const mov = (vistas[ui.actual]?.movs || por(ui.actual).movimientos).find(m => m.categoria === cat);
  if (mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') {
    ui.movSel = cat; ui.objetivosValidos = op.objetivos; ui.tipoObjetivo = mov.objetivo;
    const lado = mov.objetivo === 'enemigo' ? 'rival' : 'jugador';     // ¿hay cartas de ese lado que no se pueden elegir? (Provocación, Sigilo, Incitar)
    ui.hayBloqueados = P.some(x => x.lado === lado && !vistas[x.uid]?.muerto && !op.objetivos.includes(x.uid));
    const ignora = mov.ignoraProvocacion ? ' · ignora Provocación y Sigilo' : '';
    setHint(`${mov.nombre}: elige ${mov.objetivo === 'aliado' ? 'un aliado' : 'un enemigo'}${ignora} · ${document.body.classList.contains('movil') ? 'toca el movimiento otra vez para cancelar' : 'Esc para cancelar'}`);
    refrescarPanel();
  } else ejecutar(cat, null);
}
// Por qué una carta no se puede elegir como objetivo (se muestra al tocarla)
function motivoBloqueo(carta) {
  const tiene = (uid, id) => vistas[uid]?.estados.some(e => e.id === id);
  const validos = ui.objetivosValidos.map(nombre).join(' o ');
  if (ui.tipoObjetivo === 'enemigo' && tiene(ui.actual, 'incite')) return `🗣️ Incitado: solo puede atacar a ${validos}`;
  if (tiene(carta.p.uid, 'stealth')) return '👻 Sigilo: no se puede elegir';
  if (ui.objetivosValidos.some(u => tiene(u, 'taunt'))) return `🛡️ Provocación: debes atacar a ${validos}`;
  return `Solo puedes elegir a ${validos}`;
}
function tocarCarta(carta) {
  if (ui.movSel && ui.miTurno && ui.objetivosValidos?.includes(carta.p.uid)) { ejecutar(ui.movSel, carta.p.uid); return; }
  const lado = ui.tipoObjetivo === 'enemigo' ? 'rival' : 'jugador';
  if (ui.movSel && ui.miTurno && carta.p.lado === lado && !vistas[carta.p.uid]?.muerto) {   // carta bloqueada: avisa en vez de solo inspeccionar
    FX.sacudir(carta, 8);
    if (Date.now() - (carta.ultimoAviso || 0) > 1200) { carta.ultimoAviso = Date.now(); FX.aviso(carta, motivoBloqueo(carta)); }
    return;
  }
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
$('#ov-revancha').addEventListener('click', () => { clearTimeout(serieT); jugar(ultima.jugador.map(porId), ultima.rival.map(porId), ultima.rivalModo, ultima.opciones ? { ...ultima.opciones, serie: 0 } : null); });
$('#ov-equipo').addEventListener('click', () => {
  clearTimeout(serieT);
  const c = ultima.opciones?.campana;
  if (c) return elegirEquipoEtapa(c.dif, c.etapa);
  cargarSeleccion(ultima.jugador.map(porId), ultima.rival.map(porId), ultima.rivalModo); irA('equipo');
});
$('#ov-menu').addEventListener('click', () => { clearTimeout(serieT); irA(ultima.opciones?.campana ? 'campana' : ultima.opciones?.horda ? 'horda' : ultima.opciones?.arena ? 'arena' : 'menu'); });
$('#ov-siguiente').addEventListener('click', () => { clearTimeout(serieT); const c = ultima.opciones?.campana, e = c && siguienteEtapa(c); if (e) elegirEquipoEtapa(c.dif, e); });
$('#overlay').addEventListener('click', e => {
  const b = e.target.closest('#res-serie-stop'); if (!b) return;
  clearTimeout(serieT); ui.serie = 0; b.parentElement.textContent = '⏹ Serie detenida';
});
$('#btn-auto').addEventListener('click', () => {
  ui.auto = !ui.auto;
  if (!ui.serie) { autoActivo = ui.auto; try { localStorage.setItem('os2-auto', autoActivo ? '1' : '0'); } catch (e) { /* sin almacenamiento */ } }
  marcarControles();
  if (ui.auto && ui.miTurno && !ui.ocupado) { cancelarObjetivo(); jugarAuto(partida); }
});
$('#btn-vel').addEventListener('click', () => {
  if (ui.serie) return;
  velocidad = velocidad === 2 ? 1 : 2; setVelocidad(velocidad); marcarControles();
  try { localStorage.setItem('os2-vel', String(velocidad)); } catch (e) { /* sin almacenamiento */ }
});
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
window.__os2.elegir = cat => elegirMovimiento(cat);                 // pruebas: elegir movimiento y tocar una carta por uid
window.__os2.tocar = uid => cartas[uid] && tocarCarta(cartas[uid]);

iniciarGuia();
iniciarResultados();
iniciarAjustes();
iniciarCuenta();
iniciarColeccion();
// Clic de interfaz para todos los botones (los que tienen su propio sonido lo suman encima)
document.addEventListener('click', e => { if (e.target.closest('button:not([disabled]):not(.act.off)')) sonar('clic'); }, true);

// ---------------------------------------------------------------- inicio: menú, o directo a la partida si venimos de "Revancha"/"Jugar"
iniciarMenu({ jugar: (j, r) => jugar(j, r, document.querySelector('.eq-modo button.on')?.dataset.modo || 'azar'), salirDePartida, abrirCampana, abrirHorda, abrirArena });
iniciarCampana({ jugar: (j, r, opciones) => jugar(j, r, 'construir', opciones) });
iniciarHorda({ jugar: (j, r, opciones) => jugar(j, r, 'construir', opciones) });
iniciarArena({ jugar: (j, r, opciones) => jugar(j, r, 'construir', opciones) });
let pendiente = null;
try { pendiente = JSON.parse(sessionStorage.getItem('os2-partida') || 'null'); sessionStorage.removeItem('os2-partida'); } catch (e) { /* sin almacenamiento */ }
const eqs = pendiente && [pendiente.jugador.map(porId), pendiente.rival.map(porId)];
if (eqs && eqs.every(eq => eq.length === 5 && eq.every(Boolean))) {
  ultima = pendiente;
  irA('partida', { reemplazar: true });
  await presentarVS(...eqs);
  await iniciarPartida(...eqs);
} else irA('menu', { reemplazar: true });
