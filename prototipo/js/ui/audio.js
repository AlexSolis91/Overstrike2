// Reproductor de audio: efectos (registro SONIDOS, sintetizados o archivo) y música en bucle con transiciones.
// Los navegadores solo dejan sonar una página después de que el jugador toca algo: el audio se activa con el primer toque.
import { SONIDOS, MUSICA } from '../datos/sonidos.js';

const AJ = { musica: .5, efectos: .8, mudo: false };
try { Object.assign(AJ, JSON.parse(localStorage.getItem('os2-audio') || '{}')); } catch (e) { /* sin almacenamiento */ }
const guardar = () => { try { localStorage.setItem('os2-audio', JSON.stringify(AJ)); } catch (e) { /* sin almacenamiento */ } };

let ctx = null, master, busMusica, busEfectos, ruidoBuf = null;
let deseada = null;                  // pista que debería sonar (se inicia al desbloquear el audio)
const pistas = {};                   // nombre -> { el, gain, ok }
let actual = null;
const ultimo = {};                   // nombre de sonido -> último momento (para "gap")
let voces = 0;
const buffers = {};                  // archivo -> AudioBuffer (efectos con archivo real)

function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  busMusica = ctx.createGain(); busMusica.connect(master);
  busEfectos = ctx.createGain(); busEfectos.connect(master);
  aplicarVolumenes();
  const n = ctx.sampleRate;                         // 1 s de ruido blanco reutilizable
  ruidoBuf = ctx.createBuffer(1, n, n);
  const d = ruidoBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  for (const s of Object.values(SONIDOS)) if (s.archivo) cargarArchivo(s.archivo);   // precarga los efectos con archivo
  if (deseada) musica(deseada);
}
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, iniciar, { capture: true, passive: true });

function aplicarVolumenes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(AJ.mudo ? 0 : 1, t, .05);
  busMusica.gain.setTargetAtTime(AJ.musica * .7, t, .05);
  busEfectos.gain.setTargetAtTime(AJ.efectos, t, .05);
}
export const ajustes = () => ({ ...AJ });
export function ajustar(cambios) { Object.assign(AJ, cambios); guardar(); aplicarVolumenes(); }

// ---------------------------------------------------------------- efectos
function capa(c, destino, t0, varTono) {
  const t = t0 + (c.t || 0), d = c.d || .1, v = c.v ?? .1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + Math.min(.01, d / 4));
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
  g.connect(destino);
  const [f0, f1] = (c.f || [440, 440]).map(f => Math.max(20, f * varTono));
  let fuente;
  if (c.o === 'ruido') {
    fuente = ctx.createBufferSource(); fuente.buffer = ruidoBuf; fuente.loop = true;
    const filtro = ctx.createBiquadFilter(); filtro.type = c.filtro || 'lowpass'; filtro.Q.value = c.q ?? .7;
    filtro.frequency.setValueAtTime(f0, t); filtro.frequency.exponentialRampToValueAtTime(f1, t + d);
    fuente.connect(filtro); filtro.connect(g);
  } else {
    fuente = ctx.createOscillator(); fuente.type = c.forma || 'sine';
    fuente.frequency.setValueAtTime(f0, t); fuente.frequency.exponentialRampToValueAtTime(f1, t + d);
    fuente.connect(g);
  }
  fuente.start(t); fuente.stop(t + d + .05);
  return t + d;
}
export function sonar(nombre) {
  const s = SONIDOS[nombre];
  if (!s || !ctx || ctx.state !== 'running' || AJ.mudo || AJ.efectos <= 0) return;
  const ahora = performance.now();
  if (ahora - (ultimo[nombre] || 0) < (s.gap ?? 25)) return;      // no repetir el mismo sonido encimado
  if (voces > 10) return;                                          // límite de sonidos simultáneos
  ultimo[nombre] = ahora;
  if (s.duck) agacharMusica(s.duck);
  if (s.archivo && buffers[s.archivo] !== 'fallo') {      // efecto con archivo real (nunca usa el sintetizado salvo que el archivo falle)
    const buf = buffers[s.archivo];
    if (!buf) { if (!(s.archivo in buffers)) cargarArchivo(s.archivo); return; }   // aún cargando: se omite esta vez
    const src = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    src.buffer = buf; src.playbackRate.value = 1 + (Math.random() * 2 - 1) * (s.var || 0);
    g.gain.value = s.v ?? 1;
    const d = Math.min(s.dur || buf.duration, buf.duration);   // dur: corta el archivo a esos segundos con un desvanecimiento
    if (d < buf.duration) { g.gain.setValueAtTime(s.v ?? 1, t + Math.max(0, d - .15)); g.gain.linearRampToValueAtTime(0, t + d); }
    src.connect(g); g.connect(busEfectos); src.start(t, 0, d + .02);
    voces++; src.onended = () => voces--; return;
  }
  const varTono = 1 + (Math.random() * 2 - 1) * (s.var || 0);
  const t0 = ctx.currentTime + .005;
  let fin = t0;
  for (const c of s.capas) fin = Math.max(fin, capa(c, busEfectos, t0, varTono));
  voces++; setTimeout(() => voces--, (fin - t0) * 1000 + 60);
}
async function cargarArchivo(src) {
  if (src in buffers) return;
  buffers[src] = null;                                        // null = cargando
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(r.status);
    buffers[src] = await ctx.decodeAudioData(await r.arrayBuffer());
  } catch (e) { buffers[src] = 'fallo'; console.warn('No se pudo cargar el sonido', src); }   // usa el sintetizado
}

// ---------------------------------------------------------------- música
// Una lista de pistas (temas de partida) = una al azar por partida
let elegidaBatalla = null;
const rutaDe = nombre => {
  const r = MUSICA[nombre];
  if (!Array.isArray(r)) return r;
  if (!r.length) return null;
  return elegidaBatalla ??= r[Math.floor(Math.random() * r.length)];
};
function pista(nombre) {
  if (pistas[nombre]) return pistas[nombre];
  const el = new Audio(); el.src = rutaDe(nombre); el.loop = nombre === 'menu' || nombre === 'batalla'; el.preload = 'auto'; el.crossOrigin = 'anonymous';
  const p = pistas[nombre] = { el, gain: ctx.createGain(), ok: true };
  p.gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(p.gain); p.gain.connect(busMusica);   // por Web Audio: el volumen funciona también en iPhone
  el.addEventListener('error', () => { p.ok = false; });
  return p;
}
function desvanecer(p, a, seg) {
  const t = ctx.currentTime;
  p.gain.gain.cancelScheduledValues(t); p.gain.gain.setValueAtTime(p.gain.gain.value, t); p.gain.gain.linearRampToValueAtTime(a, t + seg);
}
// Cambia la música de fondo ('menu' | 'batalla' | null para silencio), con transición suave
export function musica(nombre) {
  deseada = nombre;
  if (!ctx || ctx.state !== 'running') return;
  if (actual && actual.nombre === nombre) return;
  if (actual) { const viejo = actual.p; desvanecer(viejo, 0, 1); setTimeout(() => { if (actual?.p !== viejo) viejo.el.pause(); }, 1100); }
  actual = null;
  if (!nombre || !rutaDe(nombre)) return;
  const p = pista(nombre);
  if (!p.ok) return;
  p.el.currentTime = 0;
  p.el.play().then(() => desvanecer(p, 1, 1.2)).catch(() => { /* el navegador aún no deja: sonará al próximo toque */ });
  actual = { nombre, p };
}
// Fin de partida: corta la música de batalla y toca Victoria/Derrota (archivo si existe; si no, la versión sintetizada)
export function finDePartida(gano) {
  musica(null);
  const nombre = gano ? 'victoria' : 'derrota';
  if (!ctx) return;
  const p = pista(nombre);
  let hecho = false;
  const sintetizado = () => { if (!hecho) { hecho = true; sonar(nombre); } };
  if (!p.ok) return sintetizado();
  p.el.currentTime = 0;
  p.el.play().then(() => { hecho = true; desvanecer(p, 1, .05); }).catch(sintetizado);
  setTimeout(() => { if (!p.ok) sintetizado(); }, 400);          // archivo inexistente: usa el sintetizado
}
function agacharMusica(seg) {
  if (!ctx || !actual) return;
  const g = busMusica.gain, t = ctx.currentTime, base = AJ.musica * .7;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(base * .35, t + .08); g.setValueAtTime(base * .35, t + seg); g.linearRampToValueAtTime(base, t + seg + .6);
}

// ---------------------------------------------------------------- panel de ajustes
export function iniciarAjustes() {
  const $ = s => document.querySelector(s);
  const pintar = () => {
    $('#aj-musica').value = Math.round(AJ.musica * 100); $('#aj-efectos').value = Math.round(AJ.efectos * 100); $('#aj-mudo').checked = AJ.mudo;
    $('#aj-musica-v').textContent = `${Math.round(AJ.musica * 100)}%`; $('#aj-efectos-v').textContent = `${Math.round(AJ.efectos * 100)}%`;
    for (const b of document.querySelectorAll('[data-abre-ajustes]')) b.textContent = AJ.mudo ? '🔇' : '🔊';
  };
  for (const b of document.querySelectorAll('[data-abre-ajustes]')) b.addEventListener('click', () => { pintar(); $('#ajustes').classList.remove('hidden'); sonar('abrir'); });
  $('#ajustes').addEventListener('click', e => { if (e.target.id === 'ajustes' || e.target.closest('#aj-x')) { $('#ajustes').classList.add('hidden'); sonar('cerrar'); } });
  $('#aj-musica').addEventListener('input', e => { ajustar({ musica: e.target.value / 100 }); pintar(); });
  $('#aj-efectos').addEventListener('input', e => { ajustar({ efectos: e.target.value / 100 }); pintar(); });
  $('#aj-efectos').addEventListener('change', () => sonar('golpe'));
  $('#aj-mudo').addEventListener('change', e => { ajustar({ mudo: e.target.checked }); pintar(); });
  $('#aj-probar').addEventListener('click', () => { const lista = ['golpe', 'critico', 'curacion', 'buff', 'debuff', 'over']; lista.forEach((n, i) => setTimeout(() => sonar(n), i * 450)); });
  pintar();
}
export const ajustesAbiertos = () => !document.querySelector('#ajustes').classList.contains('hidden');
export const cerrarAjustes = () => document.querySelector('#ajustes').classList.add('hidden');
