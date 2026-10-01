// Escena PixiJS: fondo, partículas, textos flotantes y efectos visuales reutilizables.
const { PIXI, gsap } = window;

export const W = 1280, H = 800, CW = 150, CH = 210;
export const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const cssHex = n => '#' + n.toString(16).padStart(6, '0');

// si la pestaña se congela un momento, las animaciones saltan al tiempo real en vez de quedarse atrás
gsap.ticker.lagSmoothing(0);

export const G = {};

export async function iniciarEscena(contenedor) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: contenedor, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
  contenedor.prepend(app.canvas);
  try {
    await Promise.all(['700 26px Cinzel', '900 26px Cinzel', '600 14px Inter', '800 14px Inter', '900 14px Inter'].map(f => document.fonts.load(f)));
  } catch (e) { /* fuentes opcionales */ }

  const world = new PIXI.Container(), scene = new PIXI.Container();
  const bgLayer = new PIXI.Container(), ambLayer = new PIXI.Container(), cardLayer = new PIXI.Container();
  const fxLayer = new PIXI.Container(), textLayer = new PIXI.Container();
  cardLayer.sortableChildren = true;
  app.stage.addChild(world); world.addChild(scene);
  scene.addChild(bgLayer, ambLayer, cardLayer, fxLayer, textLayer);
  Object.assign(G, { app, world, scene, bgLayer, ambLayer, cardLayer, fxLayer, textLayer, T: 0, lastW: 0, lastH: 0 });

  G.dotTex = canvasTex(64, 64, g => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.65)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  }, 1);
  G.hardTex = canvasTex(16, 16, g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, Math.PI * 2); g.fill(); }, 2);

  const bg = new PIXI.Sprite(fondo()); bg.scale.set(.5); bgLayer.addChild(bg);
  G.motes = [];
  for (let i = 0; i < 40; i++) {
    const s = new PIXI.Sprite(G.dotTex);
    s.anchor.set(.5); s.blendMode = 'add'; s.tint = pick([0xffd79a, 0x9cc4ff, 0xffffff]);
    s.scale.set(rand(.05, .16)); s.alpha = rand(.08, .35); s.position.set(rand(0, W), rand(0, H));
    ambLayer.addChild(s);
    G.motes.push({ s, vy: rand(.1, .45), ph: rand(0, 6) });
  }
  layout();
  app.ticker.add(tk => {
    const dt = tk.deltaTime;
    G.T += dt / 60;
    if (app.screen.width !== G.lastW || app.screen.height !== G.lastH) layout();
    for (const m of G.motes) {
      m.s.y -= m.vy * dt; m.s.x += Math.sin(G.T + m.ph) * .15 * dt;
      if (m.s.y < -10) { m.s.y = H + 10; m.s.x = rand(0, W); }
    }
    actualizarParticulas(dt);
    for (const f of G.alTick || []) f(dt, G.T);
  });
  return G;
}

export function relayout() {            // tras cambiar de modo (celular/PC): ajusta el lienzo y la escala
  if (!G.app?.renderer) return;
  G.app.resize();
  G.lastW = -1;
}

function layout() {
  const { app, world } = G;
  const w = app.screen.width, h = app.screen.height;
  G.lastW = w; G.lastH = h;
  const cl = document.body.classList;
  if (cl.contains('movil')) {
    // Zona útil del tablero (cartas, iconos de estado e insignias); fuera de ella solo hay fondo
    const B = { x: 135, y: 50, w: 1010, h: 720 };
    const m = cl.contains('movil-h') ? { top: 38, bottom: 4, left: 4, right: 176 } : { top: 74, bottom: 80, left: 4, right: 4 };
    const aw = Math.max(100, w - m.left - m.right), ah = Math.max(100, h - m.top - m.bottom);
    const s = Math.min(aw / B.w, ah / B.h);
    world.scale.set(s);
    world.x = m.left + (aw - B.w * s) / 2 - B.x * s;
    world.y = m.top + (ah - B.h * s) / 2 - B.y * s;
    return;
  }
  const top = 52, bottom = 104, avail = Math.max(200, h - top - bottom);
  const s = Math.min(w / W, avail / H);
  world.scale.set(s);
  world.x = (w - W * s) / 2;
  world.y = top + (avail - H * s) / 2;
}

// ---------------------------------------------------------------- texturas
export function canvasTex(w, h, draw, res = 2) {
  const c = document.createElement('canvas');
  c.width = w * res; c.height = h * res;
  const g = c.getContext('2d');
  g.scale(res, res);
  draw(g, w, h);
  return PIXI.Texture.from(c);
}
export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function hexPath(g, cx, cy, s) {
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const x = cx + s * Math.cos(a), y = cy + s * Math.sin(a); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath();
}
function zona(g, cy, [r, gg, b]) {
  const x = 150, w = W - 300, h = 290, y = cy - h / 2 + 10;
  const lg = g.createLinearGradient(0, y, 0, y + h);
  lg.addColorStop(0, `rgba(${r},${gg},${b},.10)`); lg.addColorStop(1, `rgba(${r},${gg},${b},.02)`);
  g.fillStyle = lg; rr(g, x, y, w, h, 22); g.fill();
  g.strokeStyle = `rgba(${r},${gg},${b},.28)`; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = `rgba(${r},${gg},${b},.7)`; g.lineWidth = 2;
  for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(px + dx * 26, py); g.lineTo(px, py); g.lineTo(px, py + dy * 26); g.stroke();
  }
}
function fondo() {
  return canvasTex(W, H, g => {
    const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 820);
    gr.addColorStop(0, '#1b2233'); gr.addColorStop(.55, '#0e1320'); gr.addColorStop(1, '#05070c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,150,210,0.05)'; g.lineWidth = 1;
    const s = 28, sx = s * Math.sqrt(3);
    for (let row = 0, y = 0; y < H + s; row++, y += s * 1.5) for (let x = -sx; x < W + sx; x += sx) { hexPath(g, x + (row % 2) * sx / 2, y, s); g.stroke(); }
    zona(g, 215, [255, 80, 100]); zona(g, 585, [90, 160, 255]);
    const lg = g.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, 'rgba(255,210,120,0)'); lg.addColorStop(.5, 'rgba(255,210,120,.55)'); lg.addColorStop(1, 'rgba(255,210,120,0)');
    g.strokeStyle = lg; g.lineWidth = 2; g.beginPath(); g.moveTo(80, H / 2); g.lineTo(W - 80, H / 2); g.stroke();
    g.save(); g.translate(W / 2, H / 2);
    g.fillStyle = '#0b0f18'; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,210,120,.4)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.beginPath(); g.moveTo(0, -50); g.lineTo(0, i % 2 ? -53 : -56); g.stroke(); }
    g.fillStyle = 'rgba(255,215,140,.9)'; g.font = '900 24px Cinzel'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VS', 0, 2);
    g.restore();
    const v = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  });
}

// ---------------------------------------------------------------- partículas y textos
const parts = [];
export function spawn(o) {
  const s = new PIXI.Sprite(o.tex || G.dotTex);
  s.anchor.set(.5); s.tint = o.color ?? 0xffffff; s.blendMode = o.blend || 'add';
  s.position.set(o.x, o.y); s.alpha = o.alpha ?? 1;
  const sc = o.size ?? .3; s.scale.set(sc);
  (o.layer || G.fxLayer).addChild(s);
  parts.push({ s, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag ?? .96, life: o.life || 40, max: o.life || 40, sc, grow: o.grow ?? -.6, a0: s.alpha });
}
export function burst(x, y, { n = 14, colors = [0xffffff], speed = 6, size = .28, life = 34, g = 0, drag = .92, spread = 1, tex, blend, grow } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(speed * .35, speed);
    spawn({ x: x + rand(-8, 8) * spread, y: y + rand(-8, 8) * spread, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      color: pick(colors), size: rand(size * .6, size * 1.3), life: rand(life * .7, life * 1.2), g, drag, tex, blend, grow });
  }
}
function actualizarParticulas(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
    p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.life -= dt;
    const t = Math.max(0, p.life / p.max);
    p.s.alpha = p.a0 * Math.min(1, t * 1.6);
    p.s.scale.set(Math.max(.01, p.sc * (1 + p.grow * (1 - t))));
    if (p.life <= 0) { p.s.destroy(); parts.splice(i, 1); }
  }
}
export function txt(text, { size = 14, weight = '800', fill = '#ffffff', font = 'Inter', stroke = 4, strokeColor = '#05070b', shadow = false } = {}) {
  const t = new PIXI.Text({ text, style: {
    fontFamily: font, fontSize: size, fontWeight: weight, fill,
    stroke: stroke ? { color: strokeColor, width: stroke, join: 'round' } : undefined,
    dropShadow: shadow ? { color: '#000000', alpha: .7, blur: 6, distance: 3, angle: Math.PI / 2 } : undefined,
  } });
  t.anchor.set(.5);
  return t;
}
export function floatText(x, y, str, { color = '#ffffff', size = 28, pop = false, font = 'Cinzel', rise = 58, hold = .55 } = {}) {
  const t = txt(str, { size, weight: '900', fill: color, font, stroke: Math.max(4, size / 6), shadow: true });
  t.position.set(x, y); G.textLayer.addChild(t);
  t.scale.set(pop ? .3 : .6);
  gsap.to(t.scale, { x: 1, y: 1, duration: pop ? .35 : .2, ease: pop ? 'back.out(3)' : 'back.out(2)' });
  gsap.to(t, { y: y - rise, duration: 1.1, ease: 'power2.out' });
  gsap.to(t, { alpha: 0, duration: .4, delay: hold + .3, onComplete: () => t.destroy() });
}
export function shakeScene(a = 8) {
  gsap.killTweensOf(G.scene);
  gsap.fromTo(G.scene, { x: rand(-a, a), y: rand(-a, a) * .7 }, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,0.25)' });
}
export function ringWave(x, y, color, { r0 = 20, scale = 5, width = 5, dur = .5 } = {}) {
  const g = new PIXI.Graphics().circle(0, 0, r0).stroke({ width, color });
  g.blendMode = 'add'; g.position.set(x, y); G.fxLayer.addChild(g);
  gsap.to(g.scale, { x: scale, y: scale, duration: dur, ease: 'power2.out' });
  gsap.to(g, { alpha: 0, duration: dur, ease: 'power2.in', onComplete: () => g.destroy() });
}
export function slash(x, y, color) {
  const g = new PIXI.Graphics();
  g.moveTo(-95, 0).lineTo(95, 0).stroke({ width: 7, color, alpha: .9 });
  g.moveTo(-80, 0).lineTo(80, 0).stroke({ width: 2.5, color: 0xffffff, alpha: 1 });
  g.blendMode = 'add'; g.position.set(x, y); g.rotation = rand(-.9, -.5); g.scale.set(0, 1);
  G.fxLayer.addChild(g);
  gsap.to(g.scale, { x: 1, duration: .12, ease: 'power3.out' });
  gsap.to(g, { alpha: 0, duration: .3, delay: .1, onComplete: () => g.destroy() });
}
export function banner(text, { size = 64, color = '#f3d58a', hold = .9 } = {}) {
  const t = txt(text, { size, weight: '900', font: 'Cinzel', fill: color, stroke: 8, shadow: true });
  t.position.set(W / 2, H / 2); t.alpha = 0; t.scale.set(.6);
  G.textLayer.addChild(t);
  gsap.to(t, { alpha: 1, duration: .25 });
  gsap.to(t.scale, { x: 1, y: 1, duration: .4, ease: 'back.out(2)' });
  gsap.to(t, { alpha: 0, duration: .35, delay: hold, onComplete: () => t.destroy() });
}
export async function proyectil(desde, hasta, color, dur = .42) {
  const s = new PIXI.Sprite(G.dotTex); s.anchor.set(.5); s.tint = color; s.blendMode = 'add'; s.scale.set(.9);
  const core = new PIXI.Sprite(G.dotTex); core.anchor.set(.5); core.blendMode = 'add'; core.scale.set(.4);
  G.fxLayer.addChild(s, core);
  const p0 = { x: desde.x, y: desde.y }, p2 = { x: hasta.x, y: hasta.y };
  const p1 = { x: (p0.x + p2.x) / 2 + rand(-140, 140), y: (p0.y + p2.y) / 2 };
  const o = { t: 0 };
  await gsap.to(o, { t: 1, duration: dur, ease: 'power1.in', onUpdate() {
    const t = o.t, u = 1 - t;
    const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
    s.position.set(x, y); core.position.set(x, y);
    spawn({ x, y, color, size: rand(.2, .35), life: 18, vx: rand(-.6, .6), vy: rand(-.6, .6) });
  } });
  s.destroy(); core.destroy();
}
