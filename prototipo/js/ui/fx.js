// Animaciones de los eventos del combate sobre las cartas.
import { G, CW, CH, EMOJI_FONT, wait, rand, pick, cssHex, spawn, burst, txt, floatText, shakeScene, ringWave, slash, proyectil, banner } from './graficos.js';
import { TEX_INVOCACION } from './imagenes.js';
import { INVOCACIONES } from '../datos/invocaciones.js';
const { PIXI, gsap } = window;

const pos = carta => ({ x: carta.c.x, y: carta.c.y });

export function flash(carta, alpha = .7, tint = 0xffffff) {
  carta.flashG.tint = tint;
  gsap.killTweensOf(carta.flashG);
  gsap.fromTo(carta.flashG, { alpha }, { alpha: 0, duration: .35, ease: 'power2.out' });
}
export function sacudir(carta, a = 6) {
  gsap.killTweensOf(carta.body, 'x');
  gsap.fromTo(carta.body, { x: a }, { x: 0, duration: .45, ease: 'elastic.out(1,0.25)' });
}

export function golpe(carta, e) {
  const { x, y } = pos(carta);
  flash(carta, e.critico ? .9 : .6);
  sacudir(carta, e.critico ? 11 : 6);
  slash(x, y, e.color ?? 0xffffff);
  burst(x, y, { n: e.critico ? 28 : 14, colors: [0xffffff, e.color ?? 0xffffff], speed: e.critico ? 10 : 6.5, size: .26 });
  if (e.critico) { shakeScene(11); ringWave(x, y, 0xffd36b, { scale: 4 }); floatText(x, y - 58, '¡CRÍTICO!', { color: '#ffd36b', size: 20, rise: 30 }); }
  if (e.quiebre) { burst(x, y, { n: 26, colors: [0xbae6fd, 0xffffff, 0x7dd3fc], speed: 9, size: .3 }); floatText(x, y - 80, '¡QUIEBRE!', { color: '#bae6fd', size: 18, rise: 25 }); }
  if (e.dano >= .5) floatText(x + rand(-12, 12), y - 12, `-${Math.round(e.dano)}`, { color: e.critico ? '#ffde59' : '#ff6060', size: e.critico ? 44 : 32, pop: e.critico });
  if (e.escudo >= .5) { burst(x, y, { n: 10, colors: [0x67e8f9, 0xffffff], speed: 5 }); floatText(x + 48, y - 40, `🛡-${Math.round(e.escudo)}`, { color: '#8bf1ff', size: 18, font: 'Inter' }); }
}

export function danoEfecto(carta, e) {
  const { x, y } = pos(carta);
  const color = e.color ?? 0xc084fc;
  flash(carta, .4, color); sacudir(carta, 3);
  ringWave(x, y, color, { scale: 2.5, width: 3, dur: .35 });
  burst(x, y, { n: 10, colors: [color, 0xffffff], speed: 5, size: .22 });
  if (e.dano >= .5) floatText(x + rand(-16, 16), y + 4, `-${Math.round(e.dano)}`, { color: cssHex(color), size: 24 });
  if (e.escudo >= .5) floatText(x + 48, y - 30, `🛡-${Math.round(e.escudo)}`, { color: '#8bf1ff', size: 15, font: 'Inter' });
}

export async function robo(desde, hacia, e) {
  const a = pos(desde), b = pos(hacia);
  flash(desde, .4, 0xa21caf);
  floatText(a.x, a.y, `-${Math.round(e.cantidad)}`, { color: '#e879f9', size: 24 });
  for (let i = 0; i < 12; i++) {
    const s = new PIXI.Sprite(G.dotTex); s.anchor.set(.5); s.tint = pick([0xe879f9, 0xa21caf, 0xff4d8d]); s.blendMode = 'add'; s.scale.set(rand(.2, .35));
    s.position.set(a.x + rand(-30, 30), a.y + rand(-40, 40)); G.fxLayer.addChild(s);
    gsap.to(s, { x: b.x + rand(-20, 20), y: b.y + rand(-30, 30), duration: rand(.35, .55), delay: i * .02, ease: 'power2.in', onComplete: () => s.destroy() });
  }
  await wait(420);
}

export async function bloqueo(carta) {
  const { x, y } = pos(carta);
  const hexPts = r => { const p = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; p.push(Math.cos(a) * r, Math.sin(a) * r); } return p; };
  const g = new PIXI.Graphics();
  g.poly(hexPts(70)).fill({ color: 0x3b82f6, alpha: .22 }).stroke({ width: 4, color: 0x93c5fd });
  g.poly(hexPts(52)).stroke({ width: 2, color: 0xdbeafe, alpha: .7 });
  g.blendMode = 'add'; g.position.set(x, y); g.scale.set(.2); g.alpha = 0; G.fxLayer.addChild(g);
  gsap.to(g, { alpha: 1, duration: .1 });
  gsap.to(g.scale, { x: 1, y: 1, duration: .25, ease: 'back.out(2.5)' });
  burst(x, y, { n: 16, colors: [0x93c5fd, 0xffffff], speed: 7 });
  floatText(x, y - 20, 'BLOQUEO', { color: '#93c5fd', size: 26 });
  sacudir(carta, 4);
  await wait(420);
  gsap.to(g, { alpha: 0, duration: .25, onComplete: () => g.destroy() });
}

export function textoSobre(carta, texto, color = '#b9c2d3', size = 16, dy = 34) {
  const { x, y } = pos(carta);
  floatText(x, y + dy, texto, { color, size, font: 'Inter', rise: 30 });
}

export function curacion(carta, cantidad) {
  const { x, y } = pos(carta);
  flash(carta, .45, 0x44ff99);
  for (let i = 0; i < 26; i++) setTimeout(() => spawn({ x: x + rand(-65, 65), y: y + rand(20, 100), vy: rand(-1.8, -3.2), color: pick([0x6dff9e, 0xc8ffd9, 0x22c55e]), size: rand(.15, .3), life: 45, drag: .99 }), i * 18);
  for (let i = 0; i < 4; i++) {
    const c = txt('✚', { size: 18, fill: '#8dffb4', stroke: 3 });
    c.position.set(x + rand(-50, 50), y + rand(0, 60)); G.textLayer.addChild(c);
    gsap.to(c, { y: c.y - 70, alpha: 0, duration: 1, delay: i * .1, ease: 'power1.out', onComplete: () => c.destroy() });
  }
  if (cantidad >= .5) floatText(x, y - 12, `+${Math.round(cantidad)}`, { color: '#6dff9e', size: 30 });
}

export function escudo(carta, cantidad) {
  const { x, y } = pos(carta);
  const g = new PIXI.Graphics().roundRect(-CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 16).stroke({ width: 4, color: 0x9ff3ff });
  g.blendMode = 'add'; g.position.set(x, y); g.scale.set(1.35); g.alpha = 0; G.fxLayer.addChild(g);
  gsap.to(g, { alpha: 1, duration: .15 });
  gsap.to(g.scale, { x: 1, y: 1, duration: .35, ease: 'power2.out' });
  gsap.to(g, { alpha: 0, duration: .3, delay: .35, onComplete: () => g.destroy() });
  burst(x, y, { n: 18, colors: [0x67e8f9, 0xe0fbff], speed: 5, size: .22 });
  flash(carta, .35, 0x67e8f9);
  floatText(x, y - 12, `+${Math.round(cantidad)} 🛡`, { color: '#8bf1ff', size: 24, font: 'Inter' });
}

const COLORES = { burn: '#ffa04d', poison: '#9dff7a', bleed: '#ff5a78', hemo: '#ff1a3c', bomb: '#ffc466', dmgUp: '#7dffa8',
  stun: '#fde047', freeze: '#bae6fd', possess: '#d8b4fe', confuse: '#f0abfc', fear: '#cbd5e1',
  silence: '#c4b5fd', pierce: '#67e8f9', solarBurn: '#fde047', stealth: '#cbd5e1', blind: '#d1d5db', wear: '#fbbf24', plague: '#bef264', blackPlague: '#a3e635', weaken: '#fca5a5' };

export function efecto(carta, id, texto) {
  const { x, y } = pos(carta);
  if (id === 'burn') { for (let i = 0; i < 30; i++) spawn({ x: x + rand(-55, 55), y: y + rand(20, 90), vy: rand(-2, -5), vx: rand(-.6, .6), color: pick([0xff7a2a, 0xffd36b, 0xff3d00]), size: rand(.2, .4), life: rand(30, 50), drag: .98 }); flash(carta, .4, 0xff7a2a); }
  else if (id === 'poison') { for (let i = 0; i < 18; i++) spawn({ x: x + rand(-50, 50), y: y + rand(0, 80), vy: rand(-.8, -2), vx: rand(-.5, .5), color: pick([0x7ee36b, 0xb6ff9e, 0x3fae2a]), size: rand(.3, .6), life: 55, tex: G.hardTex, blend: 'normal', alpha: .85, drag: .98, grow: .4 }); flash(carta, .35, 0x7ee36b); }
  else if (id === 'bleed' || id === 'hemo') {
    const big = id === 'hemo';
    burst(x, y, { n: big ? 34 : 18, colors: [0xd0002a, 0x9b0020, 0xff3355], speed: big ? 8 : 5, size: .35, g: .3, drag: .97, tex: G.hardTex, blend: 'normal', grow: -.2, life: 45 });
    flash(carta, big ? .6 : .35, 0xff1a3c);
    if (big) { shakeScene(7); ringWave(x, y, 0xff1a3c, { scale: 4 }); }
  } else if (id === 'bomb') {
    const b = txt('💣', { size: 34, stroke: 0, font: EMOJI_FONT }); b.position.set(x, y - 120); G.textLayer.addChild(b);
    gsap.to(b, { y: y + 10, duration: .4, ease: 'bounce.out' });
    gsap.to(b, { alpha: 0, duration: .25, delay: .7, onComplete: () => b.destroy() });
  } else if (id === 'dmgUp') {
    flash(carta, .4, 0xffd36b);
    for (let i = 0; i < 5; i++) { const a = txt('▲', { size: 20, fill: '#7dffa8', stroke: 3 }); a.position.set(x + rand(-55, 55), y + rand(10, 70)); G.textLayer.addChild(a); gsap.to(a, { y: a.y - 80, alpha: 0, duration: .9, delay: i * .08, ease: 'power1.out', onComplete: () => a.destroy() }); }
  } else if (id === 'stun') {
    flash(carta, .5, 0xfde047);
    for (let i = 0; i < 5; i++) { const s = txt('★', { size: 18, fill: '#fde047', stroke: 3 }); G.textLayer.addChild(s); const a0 = i / 5 * Math.PI * 2; const o = { a: a0 };
      gsap.to(o, { a: a0 + Math.PI * 2, duration: 1.1, ease: 'none', onUpdate: () => s.position.set(x + Math.cos(o.a) * 42, y - CH / 2 - 6 + Math.sin(o.a) * 12), onComplete: () => s.destroy() }); }
  } else if (id === 'freeze') {
    flash(carta, .7, 0x7dd3fc); burst(x, y, { n: 24, colors: [0xbae6fd, 0xffffff, 0x7dd3fc], speed: 6, size: .25 }); ringWave(x, y, 0xbae6fd, { scale: 3 });
  } else if (id === 'possess') {
    flash(carta, .6, 0x7e22ce); for (let i = 0; i < 20; i++) spawn({ x: x + rand(-60, 60), y: y + rand(-80, 80), vy: rand(-1, -2.5), color: pick([0x7e22ce, 0xc084fc, 0x1e1b4b]), size: rand(.3, .5), life: 45 });
  } else if (id === 'confuse') {
    flash(carta, .4, 0xf0abfc); floatText(x, y - 90, '? ? ?', { color: '#f0abfc', size: 22, font: 'Inter', rise: 20 });
  } else if (id === 'fear') {
    flash(carta, .5, 0x334155); sacudir(carta, 8); burst(x, y, { n: 14, colors: [0x94a3b8, 0x1e293b], speed: 4, size: .4, blend: 'normal' });
  }
  floatText(x, y + 40, texto, { color: COLORES[id] || '#fff', size: id === 'hemo' ? 22 : 16, font: id === 'hemo' ? 'Cinzel' : 'Inter', rise: 34 });
}

export function dot(carta, dano, tipo) {
  const { x, y } = pos(carta);
  const cfg = { burn: ['#ffa04d', 0xff7a2a], poison: ['#9dff7a', 0x7ee36b], bleed: ['#ff5a78', 0xff3355], hemo: ['#ff1a3c', 0xd0002a], bomb: ['#ffb03b', 0xffb03b], solarBurn: ['#fde047', 0xfbbf24] }[tipo] || ['#fff', 0xffffff];
  flash(carta, .4, cfg[1]); sacudir(carta, 3);
  if (tipo === 'burn') for (let i = 0; i < 16; i++) spawn({ x: x + rand(-50, 50), y: y + rand(30, 90), vy: rand(-2, -4), color: pick([0xff7a2a, 0xffd36b]), size: rand(.2, .35), life: 40 });
  if (tipo === 'poison') for (let i = 0; i < 10; i++) spawn({ x: x + rand(-45, 45), y: y + rand(10, 80), vy: rand(-.8, -1.6), color: 0x7ee36b, size: rand(.3, .5), life: 50, tex: G.hardTex, blend: 'normal', alpha: .85, grow: .4 });
  if (tipo === 'bleed' || tipo === 'hemo') burst(x, y + 10, { n: 10, colors: [0xd0002a, 0xff3355], speed: 4, size: .3, g: .3, tex: G.hardTex, blend: 'normal', grow: -.2 });
  floatText(x + rand(-14, 14), y + 8, `-${Math.round(dano)}`, { color: cfg[0], size: tipo === 'bomb' ? 38 : 26, pop: tipo === 'bomb' });
}

export async function explosion(carta) {
  const { x, y } = pos(carta);
  const core = new PIXI.Sprite(G.dotTex); core.anchor.set(.5); core.tint = 0xffe2a0; core.blendMode = 'add'; core.position.set(x, y); core.scale.set(.5); G.fxLayer.addChild(core);
  gsap.to(core.scale, { x: 6, y: 6, duration: .35, ease: 'power2.out' });
  gsap.to(core, { alpha: 0, duration: .45, onComplete: () => core.destroy() });
  ringWave(x, y, 0xffb03b, { scale: 7, width: 8, dur: .6 });
  burst(x, y, { n: 50, colors: [0xffd36b, 0xff7a2a, 0xff3d00, 0xffffff], speed: 13, size: .38, life: 40 });
  for (let i = 0; i < 18; i++) spawn({ x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-2, 2), vy: rand(-2.5, -.5), color: pick([0x3a3f4a, 0x555b68]), size: rand(.6, 1.1), life: rand(50, 80), blend: 'normal', alpha: .55, drag: .97, grow: .8 });
  flash(carta, 1, 0xffc070); shakeScene(18);
  await wait(250);
}
export function salpicadura(carta, dano) {
  const { x, y } = pos(carta);
  burst(x, y, { n: 12, colors: [0xffb03b, 0xff7a2a], speed: 6, size: .28 });
  flash(carta, .45, 0xffb03b); sacudir(carta, 5);
  floatText(x, y - 5, `-${Math.round(dano)}`, { color: '#ffc466', size: 22 });
}

export async function muerte(carta) {
  const { x, y } = pos(carta);
  flash(carta, .9, 0xff2244);
  burst(x, y, { n: 26, colors: [0x2a2f3a, 0x555b68, 0xff2244], speed: 6, size: .5, blend: 'normal', grow: .5, life: 50 });
  const cm = new PIXI.ColorMatrixFilter(); cm.desaturate();
  carta.body.filters = [cm];
  const g = carta.cracks.clear();
  g.moveTo(-10, -100).lineTo(8, -40).lineTo(-12, 10).lineTo(14, 60).lineTo(-4, 100).stroke({ width: 2, color: 0x000000, alpha: .8 });
  g.moveTo(8, -40).lineTo(50, -20).moveTo(-12, 10).lineTo(-55, 30).stroke({ width: 1.5, color: 0x000000, alpha: .7 });
  gsap.to(carta.body.scale, { x: .94, y: .94, duration: .4 });
  gsap.to(carta.body, { alpha: .5, y: 0, rotation: 0, duration: .5 });
  const skull = txt('💀', { size: 40, stroke: 0, font: EMOJI_FONT }); skull.position.set(x, y - 10); skull.alpha = 0; G.textLayer.addChild(skull);
  gsap.to(skull, { alpha: 1, duration: .2 });
  gsap.to(skull, { y: y - 70, alpha: 0, duration: .8, delay: .45, onComplete: () => skull.destroy() });
  await wait(500);
}

export function limpieza(carta) {
  const { x, y } = pos(carta);
  flash(carta, .5, 0xe0f7ff);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; spawn({ x: x + Math.cos(a) * 80, y: y + Math.sin(a) * 110, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4 - .5, color: pick([0xffffff, 0xbdefff]), size: .22, life: 40 }); }
  floatText(x, y - 20, 'LIMPIEZA', { color: '#e0f7ff', size: 22 });
}
export function disipar(carta, n) {
  const { x, y } = pos(carta);
  burst(x, y, { n: 22, colors: [0xb57bff, 0xe9d5ff], speed: 7, size: .25 });
  ringWave(x, y, 0xb57bff, { scale: 3.5 });
  floatText(x, y - 20, n ? `DISIPADO ×${n}` : 'SIN EFECTO', { color: '#d8b4fe', size: 20 });
}

// ---------------------------------------------------------------- movimientos
export async function embestir(carta, objetivo) {
  const c = carta.c;
  c.zIndex = 20;
  const dx = objetivo.hx - carta.hx, dy = objetivo.hy - carta.hy;
  await gsap.to(c, { x: carta.hx - dx * .06, y: carta.hy - dy * .06, duration: .14, ease: 'power2.out' });
  await gsap.to(c, { x: carta.hx + dx * .62, y: carta.hy + dy * .62, rotation: dx > 0 ? .08 : -.08, duration: .15, ease: 'power3.in' });
}
export async function regresar(carta) {
  await gsap.to(carta.c, { x: carta.hx, y: carta.hy, rotation: 0, duration: .35, ease: 'power2.out' });
  carta.c.zIndex = 1;
}
export function lanzar(carta, color) {
  const { x, y } = pos(carta);
  gsap.fromTo(carta.body.scale, { x: 1.1, y: 1.1 }, { x: 1, y: 1, duration: .35, ease: 'back.out(2)' });
  ringWave(x, y, color, { scale: 3, width: 3, dur: .4 });
  burst(x, y, { n: 12, colors: [color, 0xffffff], speed: 4, size: .22 });
}
export const proyectilA = (desde, hasta, color, dur) => proyectil(pos(desde), pos(hasta), color, dur);

// ---------------------------------------------------------------- transformaciones
export async function transformacion(carta, colorCss, nombre, cambiar) {
  const col = parseInt(colorCss.slice(1), 16);
  const { x, y } = pos(carta);
  carta.c.zIndex = 20;
  // 1) carga: la carta se eleva, tiembla y absorbe energía
  gsap.to(carta.body.scale, { x: 1.14, y: 1.14, duration: .9, ease: 'power1.in' });
  gsap.to(carta.body, { y: -18, duration: .9, ease: 'power1.in' });
  const temblor = gsap.to(carta.body, { x: 3, duration: .05, repeat: 17, yoyo: true });
  for (let i = 0; i < 46; i++) setTimeout(() => {
    const a = rand(0, Math.PI * 2), r = rand(110, 170);
    spawn({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r / 16, vy: -Math.sin(a) * r / 16,
      color: pick([col, 0xffd36b, 0xffffff]), size: rand(.22, .38), life: 17, drag: 1, grow: -.3 });
  }, i * 18);
  ringWave(x, y, col, { r0: 120, scale: .15, width: 4, dur: .85 });
  await wait(900);
  temblor.kill(); carta.body.x = 0;
  // 2) explosión y giro
  flash(carta, 1, col); shakeScene(16);
  ringWave(x, y, col, { scale: 7, width: 8, dur: .7 }); ringWave(x, y, 0xffffff, { scale: 4, width: 4, dur: .5 });
  burst(x, y, { n: 60, colors: [col, 0xffd36b, 0xffffff], speed: 12, size: .38, life: 42 });
  await gsap.to(carta.body.scale, { x: 0, duration: .16, ease: 'power2.in' });
  cambiar();
  await gsap.to(carta.body.scale, { x: 1.14, duration: .24, ease: 'back.out(2)' });
  // 3) anuncio
  banner(nombre.toUpperCase(), { size: 46, color: colorCss, hold: .9 });
  await wait(250);
  gsap.to(carta.body, { y: 0, duration: .35, ease: 'power2.out' });
  await gsap.to(carta.body.scale, { x: 1, y: 1, duration: .35, ease: 'power2.out' });
  carta.c.zIndex = 1;
  await wait(650);
}
export async function revertir(carta, cambiar) {
  const { x, y } = pos(carta);
  for (let i = 0; i < 22; i++) spawn({ x: x + rand(-50, 50), y: y + rand(-70, 70), vx: rand(-1.5, 1.5), vy: rand(-2, -.5),
    color: pick([0x6b7280, 0x9ca3af, 0x374151]), size: rand(.6, 1.1), life: rand(40, 65), blend: 'normal', alpha: .6, drag: .97, grow: .8 });
  await gsap.to(carta.body.scale, { x: 0, duration: .18, ease: 'power2.in' });
  cambiar();
  await gsap.to(carta.body.scale, { x: 1, duration: .22, ease: 'back.out(2)' });
  await wait(250);
}

// ---------------------------------------------------------------- invocaciones
export function posMedallon(carta, i) { return { x: carta.c.x - CW / 2 + 4, y: carta.c.y - CH / 2 + 8 + i * 38 }; }
function spriteInvocacion(key, x, y, size) {
  const def = INVOCACIONES[key];
  const cont = new PIXI.Container(); cont.position.set(x, y);
  const glow = new PIXI.Sprite(G.dotTex); glow.anchor.set(.5); glow.tint = def.color; glow.blendMode = 'add'; glow.scale.set(size / 30); glow.alpha = .8;
  const tex = TEX_INVOCACION[key];
  if (tex) {
    const sp = new PIXI.Sprite(tex); sp.anchor.set(.5); sp.scale.set(size * (def.luminosa ? 2.9 : 2.3) / tex.width);
    if (def.luminosa) sp.blendMode = 'screen';      // el fondo negro desaparece y la figura brilla como un espíritu
    cont.addChild(glow, sp);
  }
  else cont.addChild(glow, txt(def.emoji, { size, stroke: 0, font: EMOJI_FONT }));
  G.fxLayer.addChild(cont);
  return cont;
}
export async function invocacion(carta, key, idx) {
  const def = INVOCACIONES[key];
  const { x, y } = pos(carta);
  ringWave(x, y, def.color, { scale: 5, width: 6, dur: .6 });
  burst(x, y, { n: 30, colors: [def.color, 0xffffff], speed: 8, size: .3 });
  shakeScene(6);
  const cont = spriteInvocacion(key, x, y, 96);
  cont.scale.set(.1); cont.alpha = 0;
  const dir = carta.p.lado === 'jugador' ? -1 : 1;
  floatText(x, y + dir * 150, def.nombre.toUpperCase(), { color: cssHex(def.color), size: 24, rise: 20, hold: .9 });
  gsap.to(cont, { alpha: 1, y: y + dir * 50, duration: .5, ease: 'power2.out' });
  await gsap.to(cont.scale, { x: 1.2, y: 1.2, duration: .5, ease: 'back.out(2)' });
  await wait(450);
  const p = posMedallon(carta, idx);
  gsap.to(cont, { x: p.x, y: p.y, duration: .4, ease: 'power2.in' });
  await gsap.to(cont.scale, { x: .18, y: .18, duration: .4, ease: 'power2.in' });
  cont.destroy({ children: true });
  burst(p.x, p.y, { n: 14, colors: [def.color, 0xffffff], speed: 4, size: .2 });
}
export async function invocacionSale(carta, key, idx, objetivo) {
  const def = INVOCACIONES[key];
  const p = posMedallon(carta, Math.max(0, idx));
  const cont = spriteInvocacion(key, p.x, p.y, 64);
  cont.scale.set(.25);
  await gsap.to(cont.scale, { x: 1, y: 1, duration: .2, ease: 'back.out(2)' });
  const lado = objetivo.p.lado === 'rival' ? 1 : -1;
  const tx = objetivo.c.x, ty = objetivo.c.y + lado * 80;
  await gsap.to(cont, { x: tx, y: ty, duration: .26, ease: 'power2.in', onUpdate: () => spawn({ x: cont.x, y: cont.y, color: def.color, size: rand(.25, .4), life: 18 }) });
  if (key === 'dragon') for (let i = 0; i < 22; i++) setTimeout(() => spawn({ x: tx + rand(-14, 14), y: ty - lado * 20, vx: rand(-1.5, 1.5), vy: -lado * rand(4, 8), color: pick([0xff7a2a, 0xffd36b, 0xff3d00]), size: rand(.3, .5), life: 24, drag: .97, grow: .6 }), i * 8);
  return { cont, p };
}
export async function invocacionPulso(carta, key, idx) {
  const def = INVOCACIONES[key];
  const p = posMedallon(carta, Math.max(0, idx));
  ringWave(p.x, p.y, def.color, { r0: 14, scale: 3, width: 3, dur: .45 });
  burst(p.x, p.y, { n: 12, colors: [def.color, 0xffffff], speed: 4, size: .22 });
  const s = spriteInvocacion(key, p.x, p.y, 54); s.scale.set(.3);
  gsap.to(s.scale, { x: 1, y: 1, duration: .25, ease: 'back.out(2)' });
  gsap.to(s, { alpha: 0, duration: .3, delay: .45, onComplete: () => s.destroy({ children: true }) });
  await wait(380);
}
export async function invocacionVuelve(s) {
  if (!s) return;
  await gsap.to(s.cont, { x: s.p.x, y: s.p.y, alpha: 0, duration: .28, ease: 'power2.out' });
  s.cont.destroy({ children: true });
}
export function invocacionSeVa(carta, key) {
  const def = INVOCACIONES[key];
  const p = posMedallon(carta, 0);
  burst(p.x, p.y, { n: 16, colors: [def.color, 0x9aa3b2], speed: 4, size: .25 });
}
