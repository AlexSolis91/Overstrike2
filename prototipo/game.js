// Overstrike 2 — prototipo visual (PixiJS v8 + GSAP)
// Borrador: la lógica de combate es simplificada y los números son provisionales.
(async () => {
'use strict';

const W = 1280, H = 800, CW = 150, CH = 210;
const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// si la pestaña se congela un momento, las animaciones saltan al tiempo real en vez de quedarse atrás
gsap.ticker.lagSmoothing(0);
const EMOJI_FONT ='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

// ============================================================
//  PIXI
// ============================================================
const fieldEl = $('#field');
const app = new PIXI.Application();
await app.init({
  resizeTo: fieldEl, backgroundAlpha: 0, antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
});
fieldEl.prepend(app.canvas);
try {
  await Promise.all(['700 26px Cinzel', '900 26px Cinzel', '600 14px Inter', '800 14px Inter', '900 14px Inter']
    .map(f => document.fonts.load(f)));
} catch (e) { /* fuentes opcionales */ }

const world = new PIXI.Container();
const scene = new PIXI.Container();
const bgLayer = new PIXI.Container();
const ambLayer = new PIXI.Container();
const cardLayer = new PIXI.Container();
const fxLayer = new PIXI.Container();
const textLayer = new PIXI.Container();
cardLayer.sortableChildren = true;
app.stage.addChild(world);
world.addChild(scene);
scene.addChild(bgLayer, ambLayer, cardLayer, fxLayer, textLayer);

let lastW = 0, lastH = 0;
function layout() {
  const w = app.screen.width, h = app.screen.height;
  lastW = w; lastH = h;
  // reserva espacio arriba (orden de turnos) y abajo (barra de efectos y registro)
  const top = 52, bottom = window.innerWidth <= 900 ? 50 : 84, avail = Math.max(200, h - top - bottom);
  const s = Math.min(w / W, avail / H);
  world.scale.set(s);
  world.x = (w - W * s) / 2;
  world.y = top + (avail - H * s) / 2;
}
layout();

// ---------- texturas generadas ----------
function canvasTex(w, h, draw, res = 2) {
  const c = document.createElement('canvas');
  c.width = w * res; c.height = h * res;
  const g = c.getContext('2d');
  g.scale(res, res);
  draw(g, w, h);
  return PIXI.Texture.from(c);
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const dotTex = canvasTex(64, 64, g => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(.3, 'rgba(255,255,255,.65)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
}, 1);
const hardTex = canvasTex(16, 16, g => {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, Math.PI * 2); g.fill();
}, 2);

// ---------- fondo del campo ----------
function hexPath(g, cx, cy, s) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i + Math.PI / 6;
    const x = cx + s * Math.cos(a), y = cy + s * Math.sin(a);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
function zone(g, cy, [r, gg, b]) {
  const x = 150, w = W - 300, h = 290, y = cy - h / 2 + 10;
  const lg = g.createLinearGradient(0, y, 0, y + h);
  lg.addColorStop(0, `rgba(${r},${gg},${b},.10)`);
  lg.addColorStop(1, `rgba(${r},${gg},${b},.02)`);
  g.fillStyle = lg; rr(g, x, y, w, h, 22); g.fill();
  g.strokeStyle = `rgba(${r},${gg},${b},.28)`; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = `rgba(${r},${gg},${b},.7)`; g.lineWidth = 2;
  for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(px + dx * 26, py); g.lineTo(px, py); g.lineTo(px, py + dy * 26); g.stroke();
  }
}
const bgTex = canvasTex(W, H, g => {
  const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 820);
  gr.addColorStop(0, '#1b2233'); gr.addColorStop(.55, '#0e1320'); gr.addColorStop(1, '#05070c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,150,210,0.05)'; g.lineWidth = 1;
  const s = 28, sx = s * Math.sqrt(3);
  for (let row = 0, y = 0; y < H + s; row++, y += s * 1.5) {
    for (let x = -sx; x < W + sx; x += sx) { hexPath(g, x + (row % 2) * sx / 2, y, s); g.stroke(); }
  }
  zone(g, 215, [255, 80, 100]);
  zone(g, 585, [90, 160, 255]);
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
const bg = new PIXI.Sprite(bgTex); bg.scale.set(.5); bgLayer.addChild(bg);

// partículas ambientales
const motes = [];
for (let i = 0; i < 40; i++) {
  const s = new PIXI.Sprite(dotTex);
  s.anchor.set(.5); s.blendMode = 'add';
  s.tint = pick([0xffd79a, 0x9cc4ff, 0xffffff]);
  s.scale.set(rand(.05, .16)); s.alpha = rand(.08, .35);
  s.position.set(rand(0, W), rand(0, H));
  ambLayer.addChild(s);
  motes.push({ s, vy: rand(.1, .45), ph: rand(0, 6) });
}

// ============================================================
//  PARTÍCULAS Y TEXTOS FLOTANTES
// ============================================================
const parts = [];
function spawn(o) {
  const s = new PIXI.Sprite(o.tex || dotTex);
  s.anchor.set(.5);
  s.tint = o.color ?? 0xffffff;
  s.blendMode = o.blend || 'add';
  s.position.set(o.x, o.y);
  s.alpha = o.alpha ?? 1;
  const sc = o.size ?? .3;
  s.scale.set(sc);
  (o.layer || fxLayer).addChild(s);
  parts.push({ s, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag ?? .96, life: o.life || 40, max: o.life || 40, sc, grow: o.grow ?? -.6, a0: s.alpha });
}
function burst(x, y, { n = 14, colors = [0xffffff], speed = 6, size = .28, life = 34, g = 0, drag = .92, spread = 1, tex, blend, grow } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(speed * .35, speed);
    spawn({ x: x + rand(-8, 8) * spread, y: y + rand(-8, 8) * spread, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      color: pick(colors), size: rand(size * .6, size * 1.3), life: rand(life * .7, life * 1.2), g, drag, tex, blend, grow });
  }
}
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vx *= Math.pow(p.drag, dt);
    p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
    p.s.x += p.vx * dt; p.s.y += p.vy * dt;
    p.life -= dt;
    const t = Math.max(0, p.life / p.max);
    p.s.alpha = p.a0 * Math.min(1, t * 1.6);
    p.s.scale.set(Math.max(.01, p.sc * (1 + p.grow * (1 - t))));
    if (p.life <= 0) { p.s.destroy(); parts.splice(i, 1); }
  }
}

function txt(text, { size = 14, weight = '800', fill = '#ffffff', font = 'Inter', stroke = 4, strokeColor = '#05070b', shadow = false } = {}) {
  const t = new PIXI.Text({
    text,
    style: {
      fontFamily: font, fontSize: size, fontWeight: weight, fill,
      stroke: stroke ? { color: strokeColor, width: stroke, join: 'round' } : undefined,
      dropShadow: shadow ? { color: '#000000', alpha: .7, blur: 6, distance: 3, angle: Math.PI / 2 } : undefined,
    },
  });
  t.anchor.set(.5);
  return t;
}
function floatText(x, y, str, { color = '#ffffff', size = 28, pop = false, font = 'Cinzel', rise = 58, hold = .55 } = {}) {
  const t = txt(str, { size, weight: '900', fill: color, font, stroke: Math.max(4, size / 6), shadow: true });
  t.position.set(x, y);
  textLayer.addChild(t);
  t.scale.set(pop ? .3 : .6);
  gsap.to(t.scale, { x: 1, y: 1, duration: pop ? .35 : .2, ease: pop ? 'back.out(3)' : 'back.out(2)' });
  gsap.to(t, { y: y - rise, duration: 1.1, ease: 'power2.out' });
  gsap.to(t, { alpha: 0, duration: .4, delay: hold + .3, onComplete: () => t.destroy() });
}

function shakeScene(a = 8) {
  gsap.killTweensOf(scene);
  gsap.fromTo(scene, { x: rand(-a, a), y: rand(-a, a) * .7 }, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,0.25)' });
}

// ============================================================
//  REGLAS (versión simplificada para la demo)
// ============================================================
function stats(ch) {
  const b = ch.base;
  const flat = { hp: 0, dmg: 0, spd: 0 }, pct = { hp: 0, dmg: 0, spd: 0 };
  const sec = { critRate: 0, critDmg: 0, armor: 0, acc: 0, res: 0, block: 0, dot: 0, pen: 0 };
  for (const sl of ch.slots) {
    const r = sl.relic && RELICS[sl.relic];
    if (!r) continue;
    flat[r.flat[0]] += r.flat[1];
    for (const [k, v] of r.rolls) {
      if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] += v;
    }
  }
  for (const s of ch.statuses) if (s.id === 'dmgUp') pct.dmg += s.value;
  const out = {
    hp: (b.hp + flat.hp) * (1 + pct.hp),
    dmg: (b.dmg + flat.dmg) * (1 + pct.dmg),
    spd: (b.spd + flat.spd) * (1 + pct.spd),
  };
  for (const k in sec) out[k] = b[k] + sec[k];
  return out;
}
const maxHp = ch => stats(ch).hp;
const get = (ch, id) => ch.statuses.find(s => s.id === id);
const summonsOf = ch => ch.statuses.filter(s => s.id === 'summon');
const cssHex = n => '#' + n.toString(16).padStart(6, '0');
const all = id => (ch) => ch.statuses.filter(s => s.id === id);
const alive = side => chars.filter(c => c.side === side && !c.dead);
const foesOf = ch => alive(ch.side === 'ally' ? 'enemy' : 'ally');
const friendsOf = ch => alive(ch.side);

function makeChar(def, side, i) {
  const ch = JSON.parse(JSON.stringify(def));
  Object.assign(ch, { side, id: side + i, statuses: [], shield: 0, dead: false, tie: Math.random() });
  ch.hp = stats(ch).hp;
  return ch;
}

const chars = [];
ALLIES.forEach((d, i) => chars.push(makeChar(d, 'ally', i)));
ENEMIES.forEach((d, i) => chars.push(makeChar(d, 'enemy', i)));

const state = { round: 0, acted: new Set(), actedOrder: [], current: null, phase: 'init', move: null, inspected: null, busy: false, over: false };

// ============================================================
//  CARTAS
// ============================================================
function cardTexture(ch) {
  return canvasTex(CW, CH, (g, w, h) => {
    const ally = ch.side === 'ally';
    const f = g.createLinearGradient(0, 0, w, h);
    if (ally) { f.addColorStop(0, '#f3d58a'); f.addColorStop(.5, '#9c7a35'); f.addColorStop(1, '#5e4515'); }
    else { f.addColorStop(0, '#ff9a9a'); f.addColorStop(.5, '#9b2f3d'); f.addColorStop(1, '#4a121b'); }
    rr(g, 0, 0, w, h, 12); g.fillStyle = f; g.fill();
    const bgc = g.createLinearGradient(0, 0, 0, h);
    bgc.addColorStop(0, '#1c2233'); bgc.addColorStop(1, '#0b0e16');
    rr(g, 3, 3, w - 6, h - 6, 10); g.fillStyle = bgc; g.fill();

    // ilustración
    g.save(); rr(g, 9, 9, w - 18, 112, 8); g.clip();
    const ar = g.createRadialGradient(w / 2, 58, 6, w / 2, 58, 95);
    ar.addColorStop(0, ch.color); ar.addColorStop(.55, shade(ch.color, -.6)); ar.addColorStop(1, '#07090f');
    g.fillStyle = ar; g.fillRect(9, 9, w - 18, 112);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const img = IMG[ch.image];
    if (img) drawCover(g, img, 9, 9, w - 18, 112, .5, .3);
    else {
      g.globalAlpha = .1; g.fillStyle = '#fff';
      for (let i = 0; i < 14; i++) {
        g.save(); g.translate(w / 2, 62); g.rotate(i * Math.PI / 7);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-7, -130); g.lineTo(7, -130); g.closePath(); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
      g.font = `58px ${EMOJI_FONT}`;
      g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 14; g.fillText(ch.emoji, w / 2, 64); g.shadowBlur = 0;
    }
    const vg = g.createLinearGradient(0, 80, 0, 121);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
    g.fillStyle = vg; g.fillRect(9, 80, w - 18, 41);
    g.restore();
    rr(g, 9, 9, w - 18, 112, 8); g.strokeStyle = 'rgba(255,230,170,.35)'; g.lineWidth = 1; g.stroke();

    // nombre
    const rb = g.createLinearGradient(0, 0, w, 0);
    rb.addColorStop(0, 'rgba(10,12,20,0)'); rb.addColorStop(.15, 'rgba(10,12,20,.96)');
    rb.addColorStop(.85, 'rgba(10,12,20,.96)'); rb.addColorStop(1, 'rgba(10,12,20,0)');
    g.fillStyle = rb; g.fillRect(4, 110, w - 8, 24);
    g.textAlign = 'center'; g.textBaseline = 'middle';   // (el restore() de arriba lo reinicia)
    g.strokeStyle = ally ? 'rgba(243,213,138,.6)' : 'rgba(255,138,138,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(16, 110.5); g.lineTo(w - 16, 110.5); g.moveTo(16, 133.5); g.lineTo(w - 16, 133.5); g.stroke();
    g.fillStyle = '#fff';
    let fs = 14;
    do { g.font = `700 ${fs}px Cinzel`; } while (g.measureText(ch.name.toUpperCase()).width > w - 52 && --fs > 8);
    g.fillText(ch.name.toUpperCase(), w / 2, 123);
    g.fillStyle = '#8e98ad'; g.font = '600 8px Inter'; g.fillText(ch.role.toUpperCase(), w / 2, 143);

    // pastillas de Daño y Velocidad
    const pill = (x, fill, stroke) => { rr(g, x, 152, 58, 18, 9); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.stroke(); };
    pill(12, '#2a1a14', 'rgba(255,140,90,.55)');
    pill(w - 70, '#141c2a', 'rgba(110,180,255,.55)');
    g.font = `10px ${EMOJI_FONT}`; g.fillText('⚔️', 23, 161.5); g.fillText('⚡', w - 59, 161.5);

    // fondo de la barra de HP
    rr(g, 12, 178, w - 24, 14, 5); g.fillStyle = '#05070b'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
  });
}

class Card {
  constructor(ch, x, y) {
    this.ch = ch; ch.card = this; this.hx = x; this.hy = y;
    const c = this.c = new PIXI.Container();
    c.position.set(x, y); c.zIndex = 1;

    this.ring = new PIXI.Graphics(); c.addChild(this.ring);
    this.shadow = new PIXI.Graphics().roundRect(-CW / 2 + 4, -CH / 2 + 12, CW, CH, 14).fill({ color: 0x000000, alpha: .5 });
    this.shadow.filters = [new PIXI.BlurFilter({ strength: 10 })];
    c.addChild(this.shadow);

    const body = this.body = new PIXI.Container(); c.addChild(body);
    this.face = new PIXI.Sprite(cardTexture(ch)); this.face.anchor.set(.5); this.face.scale.set(.5);
    body.addChild(this.face);
    this.hpG = new PIXI.Graphics(); body.addChild(this.hpG);
    this.hpText = txt('', { size: 9, weight: '900', stroke: 3 }); this.hpText.position.set(0, 80); body.addChild(this.hpText);
    this.dmgText = txt('', { size: 12, weight: '900', fill: '#ffd2b8', stroke: 3 }); this.dmgText.position.set(-28, 56); body.addChild(this.dmgText);
    this.spdText = txt('', { size: 12, weight: '900', fill: '#bfe0ff', stroke: 3 }); this.spdText.position.set(40, 56); body.addChild(this.spdText);
    this.shieldFx = new PIXI.Graphics(); body.addChild(this.shieldFx);
    this.shieldBadge = txt('', { size: 11, weight: '900', fill: '#a5f3fc', stroke: 4 }); this.shieldBadge.position.set(CW / 2 - 18, -CH / 2 + 2); body.addChild(this.shieldBadge);
    this.flash = new PIXI.Graphics().roundRect(-CW / 2, -CH / 2, CW, CH, 12).fill(0xffffff);
    this.flash.alpha = 0; this.flash.blendMode = 'add'; body.addChild(this.flash);
    this.cracks = new PIXI.Graphics(); body.addChild(this.cracks);
    // medallones de invocación: pegados a la esquina de la carta, sin ocupar espacio en el campo
    this.summonRow = new PIXI.Container(); this.summonRow.position.set(-CW / 2 + 4, -CH / 2 + 8); body.addChild(this.summonRow);

    this.statusRow = new PIXI.Container(); this.statusRow.y = CH / 2 + 17; c.addChild(this.statusRow);
    this.marker = txt('▼', { size: 22, fill: '#ffd36b', stroke: 4 }); this.marker.y = -CH / 2 - 20; this.marker.alpha = 0; c.addChild(this.marker);

    c.eventMode = 'static'; c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(-CW / 2, -CH / 2, CW, CH);
    c.on('pointerover', () => this.hover(true));
    c.on('pointerout', () => this.hover(false));
    c.on('pointermove', e => this.tilt(e));
    c.on('pointertap', () => onCardTap(this));

    this.disp = { hp: ch.hp, lag: ch.hp, sh: 0 };
    this.rk = '';
    cardLayer.addChild(c);
    this.refresh();
    this.drawHp();
  }
  hover(on) {
    if (this.ch.dead) on = false;
    this.c.zIndex = on ? 10 : (this.c.zIndex >= 20 ? this.c.zIndex : 1);
    gsap.to(this.body, { y: on ? -14 : 0, duration: .2, ease: 'power2.out' });
    gsap.to(this.body.scale, { x: on ? 1.07 : 1, y: on ? 1.07 : 1, duration: .2, ease: 'power2.out' });
    if (!on) gsap.to(this.body, { rotation: 0, duration: .25 });
  }
  tilt(e) {
    if (this.ch.dead) return;
    const p = e.getLocalPosition(this.c);
    this.body.rotation = Math.max(-1, Math.min(1, p.x / (CW / 2))) * .045;
  }
  drawHp() {
    const s = stats(this.ch), max = s.hp, d = this.disp;
    const total = Math.max(max, d.hp + d.sh), w = 122, x0 = -61, y = 75, h = 10;
    const g = this.hpG.clear();
    const hpW = w * Math.max(0, d.hp) / total;
    if (d.lag > d.hp) g.rect(x0 + hpW, y, w * (d.lag - Math.max(0, d.hp)) / total, h).fill({ color: 0xffe1c2, alpha: .85 });
    const r = d.hp / max;
    if (hpW > 0) {
      g.rect(x0, y, hpW, h).fill(r > .5 ? 0x3ccf7a : r > .25 ? 0xf2c21b : 0xe23b3b);
      g.rect(x0, y, hpW, h * .4).fill({ color: 0xffffff, alpha: .2 });
    }
    if (d.sh > 0) g.rect(x0 + hpW, y, w * d.sh / total, h).fill({ color: 0x67e8f9, alpha: .95 });
    this.hpText.text = `${Math.max(0, Math.round(d.hp))}${d.sh >= 1 ? '  +' + Math.round(d.sh) : ''}`;
  }
  refresh() {
    const ch = this.ch, s = stats(ch);
    this.dmgText.text = Math.round(s.dmg);
    this.dmgText.style.fill = get(ch, 'dmgUp') ? '#7dffa8' : '#ffd2b8';
    this.spdText.text = Math.round(s.spd);
    // barras animadas
    gsap.killTweensOf(this.disp);
    const to = { hp: Math.max(0, ch.hp), sh: ch.shield };
    const up = () => this.drawHp();
    if (to.hp < this.disp.hp - .01) {
      this.disp.lag = Math.max(this.disp.lag, this.disp.hp);
      gsap.to(this.disp, { hp: to.hp, sh: to.sh, duration: .3, ease: 'power2.out', onUpdate: up });
      gsap.to(this.disp, { lag: to.hp, duration: .6, delay: .45, ease: 'power2.in', onUpdate: up });
    } else {
      gsap.to(this.disp, { hp: to.hp, lag: to.hp, sh: to.sh, duration: .5, ease: 'power2.out', onUpdate: up });
    }
    // burbuja de escudo
    this.shieldFx.clear();
    if (ch.shield >= 1) {
      this.shieldFx.roundRect(-CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 16).fill({ color: 0x67e8f9, alpha: .06 })
        .stroke({ width: 2, color: 0x9ff3ff, alpha: .9 });
      this.shieldBadge.text = `🛡 ${Math.round(ch.shield)}`;
    } else this.shieldBadge.text = '';
    this.buildStatus();
    this.buildSummons();
  }
  buildSummons() {
    for (const c of this.summonRow.removeChildren()) c.destroy({ children: true });
    summonsOf(this.ch).forEach((s, i) => {
      const def = SUMMONS[s.key];
      const m = new PIXI.Container(); m.y = i * 38;
      const glow = new PIXI.Sprite(dotTex); glow.anchor.set(.5); glow.tint = def.color; glow.blendMode = 'add'; glow.scale.set(.95); glow.alpha = .7;
      m.addChild(glow); m.glow = glow;
      const g = new PIXI.Graphics().circle(0, 0, 16).fill({ color: 0x0b0f18, alpha: .95 }).stroke({ width: 2, color: def.color });
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(0, Math.min(1, s.dur / def.dur));
      g.moveTo(Math.cos(a0) * 20, Math.sin(a0) * 20).arc(0, 0, 20, a0, a1).stroke({ width: 3, color: 0xffd36b });
      m.addChild(g);
      const tex = SUMMON_TEX[s.key];
      if (tex) {
        const sp = new PIXI.Sprite(tex);
        sp.anchor.set(.5, .36); sp.scale.set(56 / tex.width);   // acercamiento al torso/cabeza
        const mk = new PIXI.Graphics().circle(0, 0, 14.5).fill(0xffffff);
        sp.mask = mk;
        m.addChild(mk, sp);
      } else m.addChild(txt(def.emoji, { size: 17, stroke: 0, font: EMOJI_FONT }));
      this.summonRow.addChild(m);
    });
  }
  buildStatus() {
    for (const c of this.statusRow.removeChildren()) c.destroy({ children: true });
    const list = statusGroups(this.ch);
    list.forEach((st, i) => {
      const b = new PIXI.Container();
      b.x = (i - (list.length - 1) / 2) * 27;
      b.addChild(new PIXI.Graphics().circle(0, 0, 12).fill({ color: 0x0b0f18, alpha: .95 }).stroke({ width: 2, color: st.ring }));
      const ic = txt(st.icon, { size: 12, stroke: 0, font: EMOJI_FONT }); b.addChild(ic);
      if (st.n !== '') {
        const n = txt(String(st.n), { size: 9, weight: '900', stroke: 3 }); n.position.set(9, 8); b.addChild(n);
      }
      this.statusRow.addChild(b);
    });
  }
  tick(dt, T) {
    const ch = this.ch;
    if (ch.dead) { if (this.rk !== 'dead') { this.ring.clear(); this.marker.alpha = 0; this.rk = 'dead'; } return; }
    const cur = state.current === ch && !state.over;
    const targ = state.phase === 'choose-target' && state.move && validTarget(state.current, state.move, ch);
    const insp = state.inspected === ch;
    const key = `${cur}|${targ}|${insp}`;
    if (key !== this.rk) {
      this.rk = key;
      const g = this.ring.clear();
      const R = (p, wdt, color, alpha) => g.roundRect(-CW / 2 - p, -CH / 2 - p, CW + p * 2, CH + p * 2, 12 + p).stroke({ width: wdt, color, alpha });
      if (targ) {
        const col = state.move.target === 'ally' ? 0x4ade80 : 0xff4d5e;
        R(9, 10, col, .25); R(5, 3, col, 1);
      } else if (cur) {
        R(10, 12, 0xffd36b, .22); R(5, 3, 0xffd36b, 1);
      } else if (insp) {
        R(5, 2, 0xffffff, .75);
      }
    }
    this.ring.alpha = (cur || targ) ? .6 + .4 * Math.sin(T * 6) : 1;
    this.marker.alpha = cur ? 1 : 0;
    this.marker.y = -CH / 2 - 22 + Math.sin(T * 5) * 4;
    if (ch.shield >= 1) this.shieldFx.alpha = .75 + .25 * Math.sin(T * 3);
    this.summonRow.children.forEach((m, i) => { if (m.glow) m.glow.alpha = .5 + .3 * Math.sin(T * 4 + i); });

    // ambientación de DoTs activos
    const { x, y } = this.c;
    if (get(ch, 'burn') && Math.random() < .35 * dt)
      spawn({ x: x + rand(-60, 60), y: y + rand(30, 95), vy: rand(-1.4, -2.8), vx: rand(-.3, .3), color: pick([0xff7a2a, 0xffb347, 0xff4500]), size: rand(.12, .24), life: rand(30, 50), drag: .99, grow: -.8 });
    if (get(ch, 'poison') && Math.random() < .1 * dt)
      spawn({ x: x + rand(-55, 55), y: y + rand(20, 90), vy: rand(-.5, -1.1), vx: rand(-.2, .2), color: pick([0x7ee36b, 0xa6f78f]), size: rand(.25, .45), life: 60, tex: hardTex, blend: 'normal', alpha: .75, drag: .99, grow: .3 });
    const bleeding = get(ch, 'bleed') ? .06 : get(ch, 'hemo') ? .16 : 0;
    if (bleeding && Math.random() < bleeding * dt)
      spawn({ x: x + rand(-60, 60), y: y + rand(-60, 60), vy: rand(0, .6), color: pick([0xd0002a, 0x9b0020]), size: rand(.25, .4), life: 50, g: .12, tex: hardTex, blend: 'normal', drag: .99, grow: -.3 });
  }
}

function statusGroups(ch) {
  const out = [];
  const b = get(ch, 'burn'); if (b) out.push({ icon: '🔥', ring: 0xff7a2a, n: b.dur });
  const p = all('poison')(ch); if (p.length) out.push({ icon: '🧪', ring: 0x7ee36b, n: p.length });
  const bl = get(ch, 'bleed'); if (bl) out.push({ icon: '🩸', ring: 0xff3355, n: '' });
  const hm = get(ch, 'hemo'); if (hm) out.push({ icon: '🩸', ring: 0xffd36b, n: Math.round(hm.value * 100) });
  const bo = all('bomb')(ch); if (bo.length) out.push({ icon: '💣', ring: 0xffb03b, n: Math.min(...bo.map(x => x.counter)) });
  const up = get(ch, 'dmgUp'); if (up) out.push({ icon: '⚔️', ring: 0x4ade80, n: up.dur });
  return out;
}

// ============================================================
//  IMÁGENES: todas se descargan ANTES del combate (con reintentos); si alguna falla se usa el emoji
// ============================================================
const IMG = {};           // ruta -> HTMLImageElement | null
const SUMMON_TEX = {};    // clave de invocación -> PIXI.Texture
function loadImage(src, tries = 3) {
  return new Promise(resolve => {
    let n = 0;
    const attempt = () => {
      const im = new Image();
      let done = false;
      const finish = ok => {
        if (done) return; done = true; clearTimeout(timer);
        if (ok) resolve(im);
        else if (++n < tries) setTimeout(attempt, 400 * n);
        else resolve(null);
      };
      const timer = setTimeout(() => finish(false), 8000);
      im.onload = () => finish(true);
      im.onerror = () => finish(false);
      im.src = n ? `${src}?reintento=${n}` : src;
    };
    attempt();
  });
}
// Abierto con doble clic (file://) el navegador bloquea usar imágenes locales en el juego: se detecta y se usa emoji.
function usable(img) {
  if (!img) return false;
  try {
    const g = document.createElement('canvas').getContext('2d');
    g.drawImage(img, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1);
    return true;
  } catch (e) { return false; }
}
async function preloadImages() {
  const srcs = [...new Set([...ALLIES, ...ENEMIES, ...Object.values(SUMMONS)].map(d => d.image).filter(Boolean))];
  const bar = $('#loading-bar'), label = $('#loading-text');
  let done = 0;
  await Promise.all(srcs.map(async src => {
    const im = await loadImage(src);
    IMG[src] = usable(im) ? im : null;
    done++;
    if (bar) bar.style.width = `${done / srcs.length * 100}%`;
    if (label) label.textContent = `Cargando imágenes ${done}/${srcs.length}`;
  }));
  const fallidas = srcs.filter(s => !IMG[s]);
  if (fallidas.length) console.warn('Imágenes no disponibles (se usa emoji). Si abriste index.html con doble clic, usa el servidor local:', fallidas);
  for (const [key, def] of Object.entries(SUMMONS)) {
    const im = IMG[def.image];
    if (im) SUMMON_TEX[key] = canvasTex(im.naturalWidth, im.naturalHeight, g => g.drawImage(im, 0, 0), 1);
  }
  const ld = $('#loading');
  if (ld) { ld.classList.add('fade'); setTimeout(() => ld.remove(), 500); }
}
function drawCover(g, img, x, y, w, h, cx = .5, cy = .3) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.naturalWidth - sw) * cx, (img.naturalHeight - sh) * cy, sw, sh, x, y, w, h);
}
const imgHtml = (src, alt = '') => IMG[src] ? `<img src="${src}" alt="${alt}">` : '';

await preloadImages();

const cards = [];
const colX = i => W / 2 + (i - 2) * 178;
chars.filter(c => c.side === 'enemy').forEach((ch, i) => cards.push(new Card(ch, colX(i), 215)));
chars.filter(c => c.side === 'ally').forEach((ch, i) => cards.push(new Card(ch, colX(i), 585)));

// ============================================================
//  EFECTOS VISUALES
// ============================================================
function flash(card, alpha = .7, tint = 0xffffff) {
  card.flash.tint = tint;
  gsap.killTweensOf(card.flash);
  gsap.fromTo(card.flash, { alpha }, { alpha: 0, duration: .35, ease: 'power2.out' });
}
function shakeCard(card, a = 6) {
  gsap.killTweensOf(card.body, 'x');
  gsap.fromTo(card.body, { x: a }, { x: 0, duration: .45, ease: 'elastic.out(1,0.25)' });
}
function slash(x, y, color) {
  const g = new PIXI.Graphics();
  const ang = rand(-.9, -.5);
  g.moveTo(-95, 0).lineTo(95, 0).stroke({ width: 7, color, alpha: .9 });
  g.moveTo(-80, 0).lineTo(80, 0).stroke({ width: 2.5, color: 0xffffff, alpha: 1 });
  g.blendMode = 'add'; g.position.set(x, y); g.rotation = ang; g.scale.set(0, 1);
  fxLayer.addChild(g);
  gsap.to(g.scale, { x: 1, duration: .12, ease: 'power3.out' });
  gsap.to(g, { alpha: 0, duration: .3, delay: .1, onComplete: () => g.destroy() });
}
function ringWave(x, y, color, { r0 = 20, scale = 5, width = 5, dur = .5 } = {}) {
  const g = new PIXI.Graphics().circle(0, 0, r0).stroke({ width, color });
  g.blendMode = 'add'; g.position.set(x, y);
  fxLayer.addChild(g);
  gsap.to(g.scale, { x: scale, y: scale, duration: dur, ease: 'power2.out' });
  gsap.to(g, { alpha: 0, duration: dur, ease: 'power2.in', onComplete: () => g.destroy() });
}

function fxHit(t, dmg, shDmg, crit, color) {
  const card = t.card, { x, y } = card.c;
  flash(card, crit ? .9 : .6);
  shakeCard(card, crit ? 11 : 6);
  slash(x, y, color);
  burst(x, y, { n: crit ? 28 : 14, colors: [0xffffff, color], speed: crit ? 10 : 6.5, size: .26 });
  if (crit) {
    shakeScene(11);
    ringWave(x, y, 0xffd36b, { scale: 4 });
    floatText(x, y - 58, '¡CRÍTICO!', { color: '#ffd36b', size: 20, rise: 30 });
  }
  if (dmg >= .5) floatText(x + rand(-12, 12), y - 12, `-${Math.round(dmg)}`, { color: crit ? '#ffde59' : '#ff6060', size: crit ? 46 : 32, pop: crit });
  if (shDmg >= .5) {
    burst(x, y, { n: 10, colors: [0x67e8f9, 0xffffff], speed: 5 });
    floatText(x + 48, y - 40, `🛡-${Math.round(shDmg)}`, { color: '#8bf1ff', size: 18, font: 'Inter' });
  }
  card.refresh();
}
async function fxBlock(t) {
  const { x, y } = t.card.c;
  const g = new PIXI.Graphics();
  const hexPts = r => { const p = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; p.push(Math.cos(a) * r, Math.sin(a) * r); } return p; };
  g.poly(hexPts(70)).fill({ color: 0x3b82f6, alpha: .22 }).stroke({ width: 4, color: 0x93c5fd });
  g.poly(hexPts(52)).stroke({ width: 2, color: 0xdbeafe, alpha: .7 });
  g.blendMode = 'add'; g.position.set(x, y); g.scale.set(.2); g.alpha = 0;
  fxLayer.addChild(g);
  gsap.to(g, { alpha: 1, duration: .1 });
  gsap.to(g.scale, { x: 1, y: 1, duration: .25, ease: 'back.out(2.5)' });
  burst(x, y, { n: 16, colors: [0x93c5fd, 0xffffff], speed: 7 });
  floatText(x, y - 20, 'BLOQUEO', { color: '#93c5fd', size: 26 });
  shakeCard(t.card, 4);
  await wait(420);
  gsap.to(g, { alpha: 0, duration: .25, onComplete: () => g.destroy() });
}
function fxResist(t) {
  const { x, y } = t.card.c;
  floatText(x, y + 34, 'RESISTIDO', { color: '#b9c2d3', size: 16, font: 'Inter', rise: 30 });
  burst(x, y + 30, { n: 6, colors: [0xb9c2d3], speed: 3, size: .18 });
}
function fxHeal(t, amount) {
  const card = t.card, { x, y } = card.c;
  flash(card, .45, 0x44ff99);
  for (let i = 0; i < 26; i++) setTimeout(() => spawn({ x: x + rand(-65, 65), y: y + rand(20, 100), vy: rand(-1.8, -3.2), color: pick([0x6dff9e, 0xc8ffd9, 0x22c55e]), size: rand(.15, .3), life: 45, drag: .99 }), i * 18);
  for (let i = 0; i < 4; i++) {
    const c = txt('✚', { size: 18, fill: '#8dffb4', stroke: 3 });
    c.position.set(x + rand(-50, 50), y + rand(0, 60)); textLayer.addChild(c);
    gsap.to(c, { y: c.y - 70, alpha: 0, duration: 1, delay: i * .1, ease: 'power1.out', onComplete: () => c.destroy() });
  }
  floatText(x, y - 12, `+${Math.round(amount)}`, { color: '#6dff9e', size: 32 });
  card.refresh();
}
function fxShieldGain(t, amount) {
  const card = t.card, { x, y } = card.c;
  const g = new PIXI.Graphics().roundRect(-CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 16).stroke({ width: 4, color: 0x9ff3ff });
  g.blendMode = 'add'; g.position.set(x, y); g.scale.set(1.35); g.alpha = 0;
  fxLayer.addChild(g);
  gsap.to(g, { alpha: 1, duration: .15 });
  gsap.to(g.scale, { x: 1, y: 1, duration: .35, ease: 'power2.out' });
  gsap.to(g, { alpha: 0, duration: .3, delay: .35, onComplete: () => g.destroy() });
  burst(x, y, { n: 18, colors: [0x67e8f9, 0xe0fbff], speed: 5, size: .22 });
  flash(card, .35, 0x67e8f9);
  floatText(x, y - 12, `+${Math.round(amount)} 🛡`, { color: '#8bf1ff', size: 26, font: 'Inter' });
  card.refresh();
}
function fxApply(t, id, label) {
  const card = t.card, { x, y } = card.c;
  if (id === 'burn') {
    for (let i = 0; i < 30; i++) spawn({ x: x + rand(-55, 55), y: y + rand(20, 90), vy: rand(-2, -5), vx: rand(-.6, .6), color: pick([0xff7a2a, 0xffd36b, 0xff3d00]), size: rand(.2, .4), life: rand(30, 50), drag: .98 });
    flash(card, .4, 0xff7a2a);
  } else if (id === 'poison') {
    for (let i = 0; i < 18; i++) spawn({ x: x + rand(-50, 50), y: y + rand(0, 80), vy: rand(-.8, -2), vx: rand(-.5, .5), color: pick([0x7ee36b, 0xb6ff9e, 0x3fae2a]), size: rand(.3, .6), life: 55, tex: hardTex, blend: 'normal', alpha: .85, drag: .98, grow: .4 });
    flash(card, .35, 0x7ee36b);
  } else if (id === 'bleed' || id === 'hemo') {
    const big = id === 'hemo';
    burst(x, y, { n: big ? 34 : 18, colors: [0xd0002a, 0x9b0020, 0xff3355], speed: big ? 8 : 5, size: .35, g: .3, drag: .97, tex: hardTex, blend: 'normal', grow: -.2, life: 45 });
    flash(card, big ? .6 : .35, 0xff1a3c);
    if (big) { shakeScene(7); ringWave(x, y, 0xff1a3c, { scale: 4 }); }
  } else if (id === 'bomb') {
    const b = txt('💣', { size: 34, stroke: 0, font: EMOJI_FONT });
    b.position.set(x, y - 120); textLayer.addChild(b);
    gsap.to(b, { y: y + 10, duration: .4, ease: 'bounce.out' });
    gsap.to(b, { alpha: 0, duration: .25, delay: .7, onComplete: () => b.destroy() });
  } else if (id === 'dmgUp') {
    flash(card, .4, 0xffd36b);
    for (let i = 0; i < 5; i++) {
      const a = txt('▲', { size: 20, fill: '#7dffa8', stroke: 3 });
      a.position.set(x + rand(-55, 55), y + rand(10, 70)); textLayer.addChild(a);
      gsap.to(a, { y: a.y - 80, alpha: 0, duration: .9, delay: i * .08, ease: 'power1.out', onComplete: () => a.destroy() });
    }
  }
  const colors = { burn: '#ffa04d', poison: '#9dff7a', bleed: '#ff5a78', hemo: '#ff1a3c', bomb: '#ffc466', dmgUp: '#7dffa8' };
  floatText(x, y + 40, label, { color: colors[id] || '#fff', size: id === 'hemo' ? 22 : 16, font: id === 'hemo' ? 'Cinzel' : 'Inter', rise: 34 });
  card.refresh();
}
function fxDot(t, amount, kind) {
  const card = t.card, { x, y } = card.c;
  const cfg = {
    burn:   { color: '#ffa04d', tint: 0xff7a2a },
    poison: { color: '#9dff7a', tint: 0x7ee36b },
    bleed:  { color: '#ff5a78', tint: 0xff3355 },
    hemo:   { color: '#ff1a3c', tint: 0xd0002a },
  }[kind];
  flash(card, .4, cfg.tint);
  shakeCard(card, 3);
  if (kind === 'burn') for (let i = 0; i < 16; i++) spawn({ x: x + rand(-50, 50), y: y + rand(30, 90), vy: rand(-2, -4), color: pick([0xff7a2a, 0xffd36b]), size: rand(.2, .35), life: 40 });
  if (kind === 'poison') for (let i = 0; i < 10; i++) spawn({ x: x + rand(-45, 45), y: y + rand(10, 80), vy: rand(-.8, -1.6), color: 0x7ee36b, size: rand(.3, .5), life: 50, tex: hardTex, blend: 'normal', alpha: .85, grow: .4 });
  if (kind === 'bleed' || kind === 'hemo') burst(x, y + 10, { n: 10, colors: [0xd0002a, 0xff3355], speed: 4, size: .3, g: .3, tex: hardTex, blend: 'normal', grow: -.2 });
  floatText(x + rand(-14, 14), y + 8, `-${Math.round(amount)}`, { color: cfg.color, size: 26 });
  card.refresh();
}
async function fxExplosion(t) {
  const { x, y } = t.card.c;
  const core = new PIXI.Sprite(dotTex); core.anchor.set(.5); core.tint = 0xffe2a0; core.blendMode = 'add';
  core.position.set(x, y); core.scale.set(.5); fxLayer.addChild(core);
  gsap.to(core.scale, { x: 6, y: 6, duration: .35, ease: 'power2.out' });
  gsap.to(core, { alpha: 0, duration: .45, onComplete: () => core.destroy() });
  ringWave(x, y, 0xffb03b, { scale: 7, width: 8, dur: .6 });
  burst(x, y, { n: 50, colors: [0xffd36b, 0xff7a2a, 0xff3d00, 0xffffff], speed: 13, size: .38, life: 40 });
  for (let i = 0; i < 18; i++) spawn({ x: x + rand(-30, 30), y: y + rand(-30, 30), vx: rand(-2, 2), vy: rand(-2.5, -.5), color: pick([0x3a3f4a, 0x555b68]), size: rand(.6, 1.1), life: rand(50, 80), blend: 'normal', alpha: .55, drag: .97, grow: .8 });
  flash(t.card, 1, 0xffc070);
  shakeScene(18);
  await wait(250);
}
async function fxDeath(t) {
  const card = t.card, { x, y } = card.c;
  flash(card, .9, 0xff2244);
  burst(x, y, { n: 26, colors: [0x2a2f3a, 0x555b68, 0xff2244], speed: 6, size: .5, blend: 'normal', grow: .5, life: 50 });
  const cm = new PIXI.ColorMatrixFilter(); cm.desaturate();
  card.body.filters = [cm];
  const g = card.cracks.clear();
  g.moveTo(-10, -100).lineTo(8, -40).lineTo(-12, 10).lineTo(14, 60).lineTo(-4, 100).stroke({ width: 2, color: 0x000000, alpha: .8 });
  g.moveTo(8, -40).lineTo(50, -20).moveTo(-12, 10).lineTo(-55, 30).stroke({ width: 1.5, color: 0x000000, alpha: .7 });
  gsap.to(card.body.scale, { x: .94, y: .94, duration: .4 });
  gsap.to(card.body, { alpha: .5, y: 0, rotation: 0, duration: .5 });
  const skull = txt('💀', { size: 40, stroke: 0, font: EMOJI_FONT });
  skull.position.set(x, y - 10); skull.alpha = 0; textLayer.addChild(skull);
  gsap.to(skull, { alpha: 1, duration: .2 });
  gsap.to(skull, { y: y - 70, alpha: 0, duration: .8, delay: .45, onComplete: () => skull.destroy() });
  card.refresh();
  await wait(500);
}
function fxCleanse(t) {
  const card = t.card, { x, y } = card.c;
  flash(card, .5, 0xe0f7ff);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2;
    spawn({ x: x + Math.cos(a) * 80, y: y + Math.sin(a) * 110, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4 - .5, color: pick([0xffffff, 0xbdefff]), size: .22, life: 40 });
  }
  floatText(x, y - 20, 'LIMPIEZA', { color: '#e0f7ff', size: 22 });
  card.refresh();
}
function fxDispel(t, n) {
  const { x, y } = t.card.c;
  burst(x, y, { n: 22, colors: [0xb57bff, 0xe9d5ff], speed: 7, size: .25 });
  ringWave(x, y, 0xb57bff, { scale: 3.5 });
  floatText(x, y - 20, n ? `DISIPADO ×${n}` : 'SIN BUFFS', { color: '#d8b4fe', size: 20 });
  t.card.refresh();
}

// ---------- animaciones de ataque ----------
async function lungeTo(a, t) {
  const c = a.card.c, h = a.card;
  c.zIndex = 20;
  const dx = t.card.hx - h.hx, dy = t.card.hy - h.hy;
  await gsap.to(c, { x: h.hx - dx * .06, y: h.hy - dy * .06, duration: .14, ease: 'power2.out' });
  await gsap.to(c, { x: h.hx + dx * .62, y: h.hy + dy * .62, rotation: dx > 0 ? .08 : -.08, duration: .15, ease: 'power3.in' });
}
async function lungeBack(a) {
  const c = a.card.c;
  await gsap.to(c, { x: a.card.hx, y: a.card.hy, rotation: 0, duration: .35, ease: 'power2.out' });
  c.zIndex = 1;
}
function castPose(a, color) {
  const card = a.card, { x, y } = card.c;
  gsap.fromTo(card.body.scale, { x: 1.1, y: 1.1 }, { x: 1, y: 1, duration: .35, ease: 'back.out(2)' });
  ringWave(x, y, color, { scale: 3, width: 3, dur: .4 });
  burst(x, y, { n: 12, colors: [color, 0xffffff], speed: 4, size: .22 });
}
async function projectile(from, to, color, dur = .42) {
  const s = new PIXI.Sprite(dotTex); s.anchor.set(.5); s.tint = color; s.blendMode = 'add'; s.scale.set(.9);
  const core = new PIXI.Sprite(dotTex); core.anchor.set(.5); core.blendMode = 'add'; core.scale.set(.4);
  fxLayer.addChild(s, core);
  const p0 = { x: from.c.x, y: from.c.y }, p2 = { x: to.c.x, y: to.c.y };
  const p1 = { x: (p0.x + p2.x) / 2 + rand(-140, 140), y: (p0.y + p2.y) / 2 };
  const o = { t: 0 };
  await gsap.to(o, {
    t: 1, duration: dur, ease: 'power1.in',
    onUpdate() {
      const t = o.t, u = 1 - t;
      const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
      const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
      s.position.set(x, y); core.position.set(x, y);
      spawn({ x, y, color, size: rand(.2, .35), life: 18, vx: rand(-.6, .6), vy: rand(-.6, .6) });
    },
  });
  s.destroy(); core.destroy();
}
function roundBanner(text) {
  const t = txt(text, { size: 64, weight: '900', font: 'Cinzel', fill: '#f3d58a', stroke: 8, shadow: true });
  t.position.set(W / 2, H / 2); t.alpha = 0; t.scale.set(.6);
  textLayer.addChild(t);
  gsap.to(t, { alpha: 1, duration: .25 });
  gsap.to(t.scale, { x: 1, y: 1, duration: .4, ease: 'back.out(2)' });
  gsap.to(t, { alpha: 0, duration: .35, delay: .9, onComplete: () => t.destroy() });
}

// ---------- invocaciones ----------
function medPos(ch, i) {
  return { x: ch.card.c.x - CW / 2 + 4, y: ch.card.c.y - CH / 2 + 8 + i * 38 };
}
function summonSprite(def, x, y, size) {
  const cont = new PIXI.Container(); cont.position.set(x, y);
  const glow = new PIXI.Sprite(dotTex); glow.anchor.set(.5); glow.tint = def.color; glow.blendMode = 'add';
  glow.scale.set(size / 30); glow.alpha = .8;
  const key = Object.keys(SUMMONS).find(k => SUMMONS[k] === def);
  const tex = SUMMON_TEX[key];
  if (tex) {
    const sp = new PIXI.Sprite(tex); sp.anchor.set(.5);
    sp.scale.set(size * 2.3 / tex.width);
    cont.addChild(glow, sp);
  } else cont.addChild(glow, txt(def.emoji, { size, stroke: 0, font: EMOJI_FONT }));
  fxLayer.addChild(cont);
  return cont;
}
async function fxSummon(a, def, idx) {
  const { x, y } = a.card.c;
  ringWave(x, y, def.color, { scale: 5, width: 6, dur: .6 });
  burst(x, y, { n: 30, colors: [def.color, 0xffffff], speed: 8, size: .3 });
  shakeScene(6);
  const cont = summonSprite(def, x, y, 96);
  cont.scale.set(.1); cont.alpha = 0;
  const dir = a.side === 'ally' ? -1 : 1;
  floatText(x, y + dir * 150, def.name.toUpperCase(), { color: cssHex(def.color), size: 24, rise: 20, hold: .9 });
  gsap.to(cont, { alpha: 1, y: y + dir * 50, duration: .5, ease: 'power2.out' });
  await gsap.to(cont.scale, { x: 1.2, y: 1.2, duration: .5, ease: 'back.out(2)' });
  await wait(450);
  a.card.refresh();
  const p = medPos(a, idx);
  const m = a.card.summonRow.children[idx];
  if (m) m.alpha = 0;
  gsap.to(cont, { x: p.x, y: p.y, duration: .4, ease: 'power2.in' });
  await gsap.to(cont.scale, { x: .18, y: .18, duration: .4, ease: 'power2.in' });
  cont.destroy({ children: true });
  if (m) { m.alpha = 1; gsap.fromTo(m.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: .35, ease: 'back.out(3)' }); }
  burst(p.x, p.y, { n: 14, colors: [def.color, 0xffffff], speed: 4, size: .2 });
}
async function applySummon(a, key) {
  const def = SUMMONS[key];
  const same = summonsOf(a).filter(s => s.key === key);
  if (def.max === 1) {
    // regla general: 1 invocación activa por invocador (la nueva reemplaza a la anterior)
    for (const s of summonsOf(a)) log(`${SUMMONS[s.key].name} se retira`);
    a.statuses = a.statuses.filter(s => s.id !== 'summon');
    a.card.refresh();
  } else if (same.length >= def.max) {
    const oldest = same.reduce((x, y) => x.dur < y.dur ? x : y);
    oldest.dur = def.dur;
    log(`${def.name}: máximo ${def.max}, se renueva uno`, 'fx');
    a.card.refresh();
    return;
  }
  a.statuses.push({ id: 'summon', kind: 'buff', key, dur: def.dur, fresh: true });
  log(`${a.name} invoca: ${def.name}`, 'fx');
  await fxSummon(a, def, summonsOf(a).length - 1);
}
async function summonStrike(a, s, idx, t, mult) {
  const def = SUMMONS[s.key];
  const p = medPos(a, Math.max(0, idx));
  const cont = summonSprite(def, p.x, p.y, 64);
  cont.scale.set(.25);
  await gsap.to(cont.scale, { x: 1, y: 1, duration: .22, ease: 'back.out(2)' });
  const below = t.side === 'enemy' ? 1 : -1;       // se coloca del lado del centro del campo
  const tx = t.card.c.x, ty = t.card.c.y + below * 80;
  await gsap.to(cont, { x: tx, y: ty, duration: .28, ease: 'power2.in', onUpdate: () => spawn({ x: cont.x, y: cont.y, color: def.color, size: rand(.25, .4), life: 18 }) });
  if (s.key === 'dragon') {
    for (let i = 0; i < 26; i++) setTimeout(() => spawn({ x: tx + rand(-14, 14), y: ty - below * 20, vx: rand(-1.5, 1.5), vy: -below * rand(4, 8), color: pick([0xff7a2a, 0xffd36b, 0xff3d00]), size: rand(.3, .5), life: 26, drag: .97, grow: .6 }), i * 9);
    await wait(120);
  }
  await resolveOnTarget(a, t, { name: def.name, source: def.name, mult, hits: def.hits || 1, color: def.color, bleed: def.bleed, burn: def.burn, burnDur: 2 });
  await gsap.to(cont, { x: p.x, y: p.y, alpha: 0, duration: .3, ease: 'power2.out' });
  cont.destroy({ children: true });
}
// las invocaciones actúan solas justo después del turno de su invocador (desde el turno siguiente a ser invocadas)
async function summonsAct(a) {
  const list = summonsOf(a);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.fresh) { s.fresh = false; continue; }
    if (a.dead || state.over) return;
    const foes = foesOf(a);
    if (!foes.length) return;
    const def = SUMMONS[s.key];
    const t = def.pick === 'lowest' ? foes.reduce((x, y) => x.hp / maxHp(x) < y.hp / maxHp(y) ? x : y) : pick(foes);
    log(`${def.name} ataca a ${t.name}`, 'fx');
    await summonStrike(a, s, summonsOf(a).indexOf(s), t, def.mult);
  }
}
async function unleashSummons(a, m) {
  const list = summonsOf(a).filter(s => s.key === m.unleash);
  castPose(a, m.color);
  if (!list.length) { floatText(a.card.c.x, a.card.c.y, 'Sin invocaciones', { color: '#b9c2d3', size: 16, font: 'Inter' }); return; }
  roundBanner(m.name.toUpperCase());
  await wait(700);
  for (const s of list) {
    const foes = foesOf(a);
    if (!foes.length) break;
    const idx = summonsOf(a).indexOf(s);
    await Promise.all(foes.map((t, k) => wait(k * 70).then(() => summonStrike(a, s, idx, t, .4))));
  }
  a.statuses = a.statuses.filter(s => !list.includes(s));
  log(`Las invocaciones de ${a.name} se retiran`, 'fx');
  a.card.refresh();
}

// ============================================================
//  COMBATE
// ============================================================
function applyBurn(t, value, dur) {
  const b = get(t, 'burn');
  if (b) {
    const strong = Math.max(b.value, value), weak = Math.min(b.value, value);
    b.value = strong + weak * .1;
    b.dur = Math.max(b.dur, dur);
  } else t.statuses.push({ id: 'burn', kind: 'debuff', value, dur });
  fxApply(t, 'burn', `🔥 Quemadura ${pct(get(t, 'burn').value)}`);
  log(`${t.name} sufre Quemadura (${pct(get(t, 'burn').value)})`, 'fx');
}
function applyPoison(t, value) {
  const stacks = all('poison')(t);
  if (stacks.length < 5) t.statuses.push({ id: 'poison', kind: 'debuff', value, dur: 3 });
  else {
    const weakest = stacks.reduce((a, b) => (a.value < b.value || (a.value === b.value && a.dur < b.dur)) ? a : b);
    if (value > weakest.value) weakest.value = value;
    weakest.dur = 3;
  }
  fxApply(t, 'poison', `🧪 Veneno ×${all('poison')(t).length}`);
  log(`${t.name} recibe Veneno (${all('poison')(t).length} acum.)`, 'fx');
}
function applyBleed(t, value) {
  if (get(t, 'hemo')) { log(`${t.name} ya tiene Hemorragia: el Sangrado no tiene efecto`); return; }
  const b = get(t, 'bleed');
  if (b) {
    b.value = Math.max(b.value, value);
    if (Math.random() < .3) {
      t.statuses = t.statuses.filter(s => s !== b);
      t.statuses.push({ id: 'hemo', kind: 'debuff', value: b.value });
      fxApply(t, 'hemo', '¡HEMORRAGIA!');
      log(`¡El Sangrado de ${t.name} se convierte en Hemorragia (${pct(b.value)})!`, 'dmg');
      return;
    }
  } else t.statuses.push({ id: 'bleed', kind: 'debuff', value });
  fxApply(t, 'bleed', `🩸 Sangrado ${pct(get(t, 'bleed').value)}`);
  log(`${t.name} sangra (${pct(get(t, 'bleed').value)} por golpe)`, 'fx');
}
function applyBomb(t, value) {
  if (all('bomb')(t).length >= 3) { log(`${t.name} ya tiene 3 bombas`); return; }
  t.statuses.push({ id: 'bomb', kind: 'debuff', value, counter: 2 });
  fxApply(t, 'bomb', '💣 Bomba (2)');
  log(`${t.name} tiene una Bomba (explota en 2 rondas)`, 'fx');
}
function applyBuff(t, value, dur) {
  const b = get(t, 'dmgUp');
  if (b) { b.value = Math.max(b.value, value); b.dur = Math.max(b.dur, dur); }
  else t.statuses.push({ id: 'dmgUp', kind: 'buff', value, dur });
  fxApply(t, 'dmgUp', `+${Math.round(value * 100)}% Daño`);
}
const pct = v => `${(Math.round(v * 1000) / 10)}%`;

async function damage(t, amount) {
  t.hp -= amount;
  if (t.hp <= 0 && !t.dead) await kill(t);
}
async function dotHit(t, frac, kind) {
  if (t.dead) return;
  const amount = frac * maxHp(t);
  t.hp -= amount;
  fxDot(t, amount, kind);
  log(`${t.name} pierde ${Math.round(amount)} por ${EFFECTS[kind].name}`, 'dmg');
  await wait(300);
  if (t.hp <= 0 && !t.dead) await kill(t);
}
async function explodeBomb(t, bomb, splashOnly = false) {
  const amount = bomb.value * maxHp(t);
  await fxExplosion(t);
  if (!splashOnly) {
    t.hp -= amount;
    floatText(t.card.c.x, t.card.c.y - 10, `-${Math.round(amount)}`, { color: '#ffb03b', size: 40, pop: true });
    log(`💥 La Bomba explota sobre ${t.name}: -${Math.round(amount)}`, 'dmg');
    t.card.refresh();
  }
  const splash = amount * .25;
  for (const a of friendsOf(t)) {
    if (a === t) continue;
    a.hp -= splash;
    burst(a.card.c.x, a.card.c.y, { n: 12, colors: [0xffb03b, 0xff7a2a], speed: 6, size: .28 });
    flash(a.card, .45, 0xffb03b); shakeCard(a.card, 5);
    floatText(a.card.c.x, a.card.c.y - 5, `-${Math.round(splash)}`, { color: '#ffc466', size: 24 });
    a.card.refresh();
  }
  await wait(450);
  if (!splashOnly && t.hp <= 0 && !t.dead) await kill(t);
  for (const a of friendsOf(t)) if (a.hp <= 0 && !a.dead) await kill(a);
}
async function kill(t) {
  const bombs = all('bomb')(t);
  if (summonsOf(t).length) log(`Las invocaciones de ${t.name} desaparecen`);
  t.dead = true; t.hp = 0; t.shield = 0; t.statuses = [];
  log(`☠️ ${t.name} ha sido derrotado`, 'sys');
  await fxDeath(t);
  for (const b of bombs) await explodeBomb(t, b, true);
  renderOrder();
}

function validTarget(a, m, t) {
  if (!a || !m || !t || t.dead) return false;
  if (m.target === 'enemy') return t.side !== a.side;
  if (m.target === 'ally') return t.side === a.side;
  return false;
}
function resolveTargets(a, m, t) {
  if (m.target === 'allEnemies') return foesOf(a);
  if (m.target === 'allAllies') return friendsOf(a);
  if (m.target === 'self') return [a];
  return [t];
}

// Resuelve un movimiento sobre un objetivo: Bloqueo → golpes (Crítico → Armadura → Perforación/Escudo) → efectos
async function resolveOnTarget(a, t, m) {
  if (t.dead) return;
  const st = stats(a), ts = stats(t);
  const hostile = t.side !== a.side;
  if (hostile && Math.random() < Math.min(ts.block, .5)) {
    log(`${t.name} bloquea ${m.name}`, 'fx');
    await fxBlock(t);
    return;
  }
  if (m.mult) {
    const hits = m.hits || 1;
    for (let i = 0; i < hits && !t.dead; i++) {
      let d = st.dmg * m.mult;
      const crit = Math.random() < st.critRate;
      if (crit) d *= 1 + st.critDmg;
      d *= 1 - Math.min(ts.armor, .75);
      let toHp = d * Math.min(st.pen, 1), toSh = d - toHp, shDmg = 0;
      if (t.shield > 0) { shDmg = Math.min(t.shield, toSh); t.shield -= shDmg; toHp += toSh - shDmg; } else toHp += toSh;
      t.hp -= toHp;
      fxHit(t, toHp, shDmg, crit, m.color);
      log(`${m.source || a.name} → ${t.name}: -${Math.round(toHp)}${shDmg >= 1 ? ` (🛡 -${Math.round(shDmg)})` : ''}${crit ? ' ¡Crítico!' : ''}`, 'dmg');
      await wait(hits > 1 ? 240 : 160);
      if (t.hp <= 0) { await kill(t); break; }
      const bl = get(t, 'bleed');
      if (bl) await dotHit(t, bl.value, 'bleed');
      const hm = get(t, 'hemo');
      if (hm && !t.dead) { await dotHit(t, hm.value, 'hemo'); hm.value += .01; t.card.buildStatus(); }
      if (t.dead) break;
    }
  }
  if (t.dead) return;

  const tryDebuff = async fn => {
    if (Math.random() < st.acc - ts.res) fn(); else { fxResist(t); log(`${t.name} resiste el efecto`); }
    await wait(260);
  };
  if (m.burn) await tryDebuff(() => applyBurn(t, m.burn * (1 + st.dot), m.burnDur || 2));
  if (m.poison) for (let i = 0; i < m.poison; i++) await tryDebuff(() => applyPoison(t, .02 + .05 * st.dot));
  if (m.bleed) await tryDebuff(() => applyBleed(t, .03 + .10 * st.dot));
  if (m.bomb) await tryDebuff(() => applyBomb(t, .20 * (1 + st.dot)));
  if (m.detonate) {
    const bombs = all('bomb')(t);
    if (!bombs.length) log(`${t.name} no tiene bombas que detonar`);
    t.statuses = t.statuses.filter(s => s.id !== 'bomb');
    for (const b of bombs) { if (t.dead) break; await explodeBomb(t, b); }
  }
  if (m.dispel) {
    const buffs = t.statuses.filter(s => s.kind === 'buff');
    let n = 0;
    for (const b of buffs) if (Math.random() < st.acc - ts.res) { t.statuses = t.statuses.filter(s => s !== b); n++; }
    fxDispel(t, n);
    log(`${a.name} disipa ${n} buff(s) de ${t.name}`, 'fx');
    await wait(300);
  }
  if (m.cleanse) {
    const n = t.statuses.filter(s => s.kind === 'debuff').length;
    t.statuses = t.statuses.filter(s => s.kind !== 'debuff');
    fxCleanse(t);
    log(`${a.name} limpia ${n} debuff(s) de ${t.name}`, 'heal');
    await wait(350);
  }
  if (m.heal) {
    const amount = Math.min(st.dmg * m.heal, maxHp(t) - t.hp);
    t.hp += amount;
    fxHeal(t, amount);
    log(`${t.name} recupera ${Math.round(amount)} HP`, 'heal');
    await wait(350);
  }
  if (m.shield) {
    const amount = st.dmg * m.shield;
    t.shield += amount;
    fxShieldGain(t, amount);
    log(`${t.name} gana ${Math.round(amount)} de Escudo`, 'heal');
    await wait(300);
  }
  if (m.buff) {
    if (Math.random() < Math.min(st.acc, 1)) { applyBuff(t, m.buff.value, m.buff.dur); log(`${t.name} recibe +${Math.round(m.buff.value * 100)}% Daño`, 'heal'); }
    else { fxResist(t); log(`El buff falla sobre ${t.name}`); }
    await wait(200);
  }
}

async function performMove(a, m, target) {
  // Hemorragia: pierde HP al ejecutar un movimiento (aunque luego lo bloqueen)
  const hm = get(a, 'hemo');
  if (hm) { await dotHit(a, hm.value, 'hemo'); if (a.dead) return; }

  if (m.summon) { castPose(a, m.color); await wait(150); await applySummon(a, m.summon); return; }
  if (m.unleash) { await unleashSummons(a, m); return; }

  const targets = resolveTargets(a, m, target);
  if (m.style === 'melee') {
    await lungeTo(a, targets[0]);
    await resolveOnTarget(a, targets[0], m);
    await lungeBack(a);
  } else {
    castPose(a, m.color);
    await wait(180);
    await Promise.all(targets.map(async (t, i) => {
      await wait(i * 110);
      await projectile(a.card, t.card, m.color, m.style === 'support' ? .5 : .42);
      await resolveOnTarget(a, t, m);
    }));
  }
}

// ---------- turnos: orden dinámico por Velocidad ----------
function remainingSorted() {
  return chars.filter(c => !c.dead && !state.acted.has(c) && c !== state.current)
    .sort((x, y) => stats(y).spd - stats(x).spd || y.base.spd - x.base.spd || y.tie - x.tie);
}
function pickNext() {
  return chars.filter(c => !c.dead && !state.acted.has(c))
    .sort((x, y) => stats(y).spd - stats(x).spd || y.base.spd - x.base.spd || y.tie - x.tie)[0];
}
async function startRound() {
  state.round++;
  state.acted = new Set(); state.actedOrder = [];
  chars.forEach(c => { c.tie = Math.random(); });
  $('#round-label').textContent = `Ronda ${state.round}`;
  log(`— Ronda ${state.round} —`, 'sys');
  roundBanner(`RONDA ${state.round}`);
  await wait(1100);
}
async function endRound() {
  state.current = null; renderOrder();
  const exploding = [];
  for (const c of chars) {
    if (c.dead) continue;
    for (const s of c.statuses) {
      if (s.dur !== undefined) s.dur--;
      if (s.id === 'bomb') { s.counter--; if (s.counter <= 0) exploding.push([c, s]); }
    }
    summonsOf(c).forEach((s, i) => {
      if (s.dur > 0) return;
      const p = medPos(c, i);
      burst(p.x, p.y, { n: 16, colors: [SUMMONS[s.key].color, 0x9aa3b2], speed: 4, size: .25 });
      log(`${SUMMONS[s.key].name} de ${c.name} se desvanece`);
    });
    c.statuses = c.statuses.filter(s => (s.dur === undefined || s.dur > 0) && !(s.id === 'bomb' && s.counter <= 0));
    c.card.refresh();
  }
  for (const [c, b] of exploding) if (!c.dead) await explodeBomb(c, b);
  refreshAll();
}
async function tickTurnStart(c) {
  const b = get(c, 'burn');
  if (b) await dotHit(c, b.value, 'burn');
  const p = all('poison')(c);
  if (p.length && !c.dead) await dotHit(c, p.reduce((s, x) => s + x.value, 0), 'poison');
}
function checkEnd() {
  if (state.over) return true;
  const win = !alive('enemy').length, lose = !alive('ally').length;
  if (!win && !lose) return false;
  state.over = true; state.phase = 'over'; state.current = null;
  $('#ov-title').textContent = win ? 'Victoria' : 'Derrota';
  $('#ov-sub').textContent = `Combate terminado en la ronda ${state.round}`;
  setTimeout(() => $('#overlay').classList.remove('hidden'), 700);
  renderOrder(); updateToolbar();
  return true;
}
async function nextTurn() {
  if (checkEnd()) return;
  let n = pickNext();
  if (!n) {
    await endRound();
    if (checkEnd()) return;
    await startRound();
    n = pickNext();
    if (!n) return;
  }
  state.current = n;
  renderOrder();
  await tickTurnStart(n);
  if (checkEnd()) return;
  if (n.dead) { state.acted.add(n); state.actedOrder.push(n); return nextTurn(); }
  if (n.side === 'ally') {
    state.phase = 'choose-move';
    inspect(n);
    setHint(`Turno de ${n.name}: elige un movimiento`);
    updateToolbar();
  } else {
    state.phase = 'ai';
    inspect(n);
    setHint(`Turno rival: ${n.name}`);
    updateToolbar();
    await wait(750);
    const { move, target } = aiChoose(n);
    await execute(n, move, target);
  }
}
async function execute(a, m, target) {
  state.phase = 'anim'; state.move = null;
  setHint(''); updateToolbar(); renderPanel();
  log(`${a.name} usa ${m.name}`, 'sys');
  await performMove(a, m, target);
  if (!a.dead && !state.over && foesOf(a).length) await summonsAct(a);
  state.acted.add(a); state.actedOrder.push(a);
  refreshAll();
  await wait(350);
  nextTurn();
}
function aiChoose(a) {
  const foes = foesOf(a), friends = friendsOf(a);
  const opts = [];
  for (const m of a.moves) {
    let t = null;
    if (m.summon && summonsOf(a).filter(s => s.key === m.summon).length >= SUMMONS[m.summon].max) continue;
    if (m.unleash) {
      const n = summonsOf(a).filter(s => s.key === m.unleash).length;
      if (n < 2) continue;
      if (n >= 3) opts.push({ move: m, target: null }, { move: m, target: null });
    }
    if (m.target === 'enemy') {
      if (m.detonate) { const w = foes.filter(f => get(f, 'bomb')); if (!w.length) continue; t = pick(w); }
      else if (m.dispel) { const w = foes.filter(f => f.statuses.some(s => s.kind === 'buff')); if (!w.length) continue; t = pick(w); }
      else t = Math.random() < .4 ? foes.reduce((x, y) => x.hp < y.hp ? x : y) : pick(foes);
    } else if (m.target === 'ally') {
      if (m.cleanse) { const w = friends.filter(f => f.statuses.some(s => s.kind === 'debuff')); if (!w.length) continue; t = pick(w); }
      else if (m.heal) { t = friends.reduce((x, y) => x.hp / maxHp(x) < y.hp / maxHp(y) ? x : y); if (t.hp / maxHp(t) > .85) continue; }
      else t = pick(friends);
    }
    opts.push({ move: m, target: t });
  }
  return opts.length ? pick(opts) : { move: a.moves[0], target: pick(foes) };
}

// ============================================================
//  INTERFAZ (DOM)
// ============================================================
function setHint(t) { const h = $('#hint'); h.textContent = t; h.classList.toggle('hidden', !t); }
function log(html, cls = '') {
  const el = document.createElement('div');
  el.className = `log-line ${cls}`; el.textContent = html;
  const L = $('#log'); L.prepend(el);
  while (L.children.length > 30) L.lastChild.remove();
}
function refreshAll() { cards.forEach(c => c.refresh()); renderPanel(); renderOrder(); }

function renderOrder() {
  const chip = (c, cls) => `<div class="chip ${c.side} ${cls} ${c.dead ? 'dead' : ''}" title="${c.name} · Vel ${Math.round(stats(c).spd)}"><span>${imgHtml(c.image, c.name) || c.emoji}</span><small>${Math.round(stats(c).spd)}</small></div>`;
  let html = state.actedOrder.map(c => chip(c, 'done')).join('');
  if (state.current) html += chip(state.current, 'now');
  html += remainingSorted().map(c => chip(c, '')).join('');
  $('#order').innerHTML = html;
}

function inspect(ch) { state.inspected = ch; renderPanel(); }

function fmtStat(k, v) {
  if (k === 'hp' || k === 'dmg' || k === 'spd') return Math.round(v).toLocaleString('es-MX');
  return `${Math.round(v * 1000) / 10}%`;
}
function describeStatus(ch) {
  const out = [];
  const tags = id => EFFECTS[id].tags.map(t => `<span class="tag">${t}</span>`).join('');
  const row = (id, title, sub) => `<div class="eff ${EFFECTS[id].kind}"><span class="ei">${EFFECTS[id].icon}</span><div><b>${title}</b><small>${sub}</small></div><div class="tags">${tags(id)}</div></div>`;
  const b = get(ch, 'burn'); if (b) out.push(row('burn', 'Quemadura', `${pct(b.value)} HP máx. al inicio del turno · ${b.dur} ronda(s)`));
  const p = all('poison')(ch); if (p.length) out.push(row('poison', `Veneno ×${p.length}`, `${pct(p.reduce((s, x) => s + x.value, 0))} por turno · duraciones: ${p.map(x => x.dur).join(', ')}`));
  const bl = get(ch, 'bleed'); if (bl) out.push(row('bleed', 'Sangrado', `${pct(bl.value)} HP máx. por golpe recibido · hasta limpiarlo`));
  const hm = get(ch, 'hemo'); if (hm) out.push(row('hemo', 'Hemorragia', `${pct(hm.value)} por golpe y por movimiento · +1 por golpe`));
  all('bomb')(ch).forEach(x => out.push(row('bomb', 'Bomba', `Explota en ${x.counter} ronda(s) · ${pct(x.value)} HP máx. + 25% a sus aliados`)));
  const up = get(ch, 'dmgUp'); if (up) out.push(row('dmgUp', 'Furia', `+${Math.round(up.value * 100)}% Daño · ${up.dur} ronda(s)`));
  summonsOf(ch).forEach(s => {
    const d = SUMMONS[s.key];
    const what = `${d.hits > 1 ? d.hits + ' golpes de ' : ''}${Math.round(d.mult * 100)}% del Daño de ${ch.name}${d.bleed ? ' + Sangrado' : ''}${d.burn ? ` + Quemadura ${Math.round(d.burn * 100)}%` : ''}`;
    out.push(`<div class="eff buff"><span class="ei">${imgHtml(d.image, d.name) || d.emoji}</span><div><b>${d.name}</b><small>${what} · ${s.dur} ronda(s)${s.fresh ? ' · actúa desde su próximo turno' : ''}</small></div><div class="tags"><span class="tag">Invocación</span></div></div>`);
  });
  return out.length ? `<div class="effects">${out.join('')}</div>` : '<div class="none">Sin buffs ni debuffs</div>';
}
function renderPanel() {
  const ch = state.inspected, root = $('#panel-inner');
  if (!ch) { root.innerHTML = '<div class="p-empty">Selecciona una carta para ver su información</div>'; return; }
  const s = stats(ch), max = s.hp;
  const r = Math.max(0, ch.hp) / max, total = Math.max(max, ch.hp + ch.shield);
  const myTurn = state.current === ch && ch.side === 'ally' && (state.phase === 'choose-move' || state.phase === 'choose-target');

  const statRows = ['hp', 'spd', 'dmg', 'critRate', 'critDmg', 'armor', 'acc', 'res', 'block', 'dot', 'pen'].map(k => {
    const capped = (k === 'block' && s.block > .5) || (k === 'armor' && s.armor > .75);
    const up = k === 'dmg' && get(ch, 'dmgUp');
    const base = ch.base[k];
    return `<div class="stat" title="Base: ${fmtStat(k, base)}${capped ? ` · Tope: ${k === 'block' ? '50%' : '75%'}` : ''}">
      <span class="i">${STAT_META[k].icon}</span><span class="l">${STAT_META[k].label}</span>
      <span class="v ${up ? 'up' : ''} ${capped ? 'cap' : ''}">${fmtStat(k, s[k])}</span></div>`;
  }).join('');

  let unlockIdx = 0;
  const slotHtml = ch.slots.map((sl, i) => {
    const rel = sl.relic && RELICS[sl.relic];
    if (rel) return `<div class="slot has" data-slot="${i}" style="--rc:${RARITY[rel.rarity].color}">
      <div class="slot-label">${sl.label}</div><div class="slot-name">${rel.name}</div><div class="slot-sub">${rel.rarity} · ${rel.type}</div></div>`;
    if (sl.locked) {
      const cost = SLOT_COSTS[Math.min(unlockIdx++, 2)];
      return `<div class="slot locked"><div class="slot-label">${sl.label}</div><div class="slot-name">🔒 Bloqueado</div><div class="slot-sub">${cost} de Oro${sl.bow ? ' · por el Arco' : ''}</div></div>`;
    }
    return `<div class="slot empty"><div class="slot-label">${sl.label}</div><div class="slot-name">Vacío</div><div class="slot-sub">${sl.bow ? 'Desbloqueado por el Arco' : 'Disponible'}</div></div>`;
  }).join('');

  const tlabel = { enemy: 'Un enemigo', ally: 'Un aliado', allEnemies: 'Todos los enemigos', allAllies: 'Todos los aliados', self: 'Invocación' };
  const movesHtml = ch.moves.map((m, i) => `<div class="move ${myTurn && !ch.dead ? 'can' : ''} ${myTurn && state.move === m ? 'sel' : ''}" data-move="${i}">
      <div class="mv-top"><span class="mv-name">${m.name}</span><span class="mv-tag">${tlabel[m.target]}</span></div>
      <div class="mv-desc">${m.desc}</div></div>`).join('');

  root.innerHTML = `
    <div class="p-head ${ch.side}">
      <div class="p-portrait" style="--c:${ch.color}">${imgHtml(ch.image, ch.name) || ch.emoji}</div>
      <div><div class="p-name">${ch.name}</div><div class="p-role">${ch.role}</div>
        <span class="p-side ${ch.side}">${ch.side === 'ally' ? 'Tu equipo' : 'Rival'}</span></div>
      ${ch.dead ? '<div class="p-dead">Derrotado</div>' : ''}
    </div>
    <div class="p-hpbar">
      <div class="fill ${r > .5 ? '' : r > .25 ? 'mid' : 'low'}" style="width:${Math.max(0, ch.hp) / total * 100}%"></div>
      ${ch.shield >= 1 ? `<div class="shield" style="left:${Math.max(0, ch.hp) / total * 100}%;width:${ch.shield / total * 100}%"></div>` : ''}
      <span>${Math.max(0, Math.round(ch.hp))} / ${Math.round(max)}${ch.shield >= 1 ? ` · 🛡 ${Math.round(ch.shield)}` : ''}</span>
    </div>
    ${myTurn ? `<div class="turn-note">${state.phase === 'choose-target' ? `${state.move.name}: haz clic en un objetivo (Esc para cancelar)` : 'Tu turno: elige un movimiento'}</div>` : ''}
    <section><h3>Estadísticas</h3><div class="stats">${statRows}</div></section>
    <section><h3>Buffs y debuffs</h3>${describeStatus(ch)}</section>
    <section><h3>Reliquias</h3><div class="relics">${slotHtml}</div></section>
    <section><h3>Movimientos</h3><div class="moves">${movesHtml}</div></section>
    <div class="placeholder-note">Prototipo visual · personajes, reliquias y valores de ejemplo.</div>`;
}

// ---------- carta de reliquia ----------
function relicCard(rel) {
  const fmt = (k, v) => (k === 'hp' || k === 'dmg' || k === 'spd') ? `+${v}` : `+${Math.round(v * 1000) / 10}%`;
  const star = (v, max) => v >= max - 1e-9 ? '⭐' : '';
  const q = [rel.flat, ...rel.rolls].map(([, v, mn, mx]) => mx === mn ? 1 : (v - mn) / (mx - mn));
  const quality = Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100);
  const groups = [];
  for (const r of rel.rolls) {
    let g = groups.find(x => x.stat === r[0]);
    if (!g) groups.push(g = { stat: r[0], rolls: [] });
    g.rolls.push(r);
  }
  const lines = groups.map(g => {
    const total = g.rolls.reduce((s, r) => s + r[1], 0);
    const stars = g.rolls.map(r => star(r[1], r[3])).join('');
    const cls = g.rolls.length === 2 ? 'x2' : g.rolls.length >= 3 ? 'x3' : '';
    return `<div class="rc-line ${cls}"><span class="lbl">${STAT_META[g.stat].label}</span><b>${fmt(g.stat, total)}</b><span class="stars">${stars}</span></div>`;
  }).join('');
  const [fk, fv, , fmx] = rel.flat;
  return `<div class="rc" style="--rc:${RARITY[rel.rarity].color}">
    <div class="rc-head"><div class="rc-name">${rel.name}</div>
      <div class="rc-rarity">${rel.rarity}<span class="rc-q">Calidad ${quality}%</span></div></div>
    <div class="rc-type">${rel.category} · ${rel.type}</div>
    <div class="rc-line flat"><span class="lbl">${STAT_META[fk].label}</span><b>${fmt(fk, fv)}</b><span class="stars">${star(fv, fmx)}</span></div>
    ${lines ? `<div class="rc-sep"></div>${lines}` : ''}
    ${rel.passive ? `<div class="rc-passive"><b>Pasiva</b>${rel.passive}</div>` : ''}
  </div>`;
}
const pop = $('#relic-pop');
let popTimer = null, popPinned = false;
function showRelic(slotEl) {
  const ch = state.inspected; if (!ch) return;
  const rel = RELICS[ch.slots[+slotEl.dataset.slot].relic];
  pop.innerHTML = relicCard(rel);
  pop.classList.remove('hidden');
  const r = slotEl.getBoundingClientRect(), pw = 280;
  let left = r.right + 12, top = r.top - 10;
  if (left + pw > innerWidth - 8) left = Math.max(8, r.left - pw - 12);
  top = Math.min(top, innerHeight - pop.offsetHeight - 8);
  pop.style.left = `${left}px`; pop.style.top = `${Math.max(8, top)}px`;
}
function hideRelicSoon() { clearTimeout(popTimer); popTimer = setTimeout(() => { if (!popPinned) pop.classList.add('hidden'); }, 180); }
const panelEl = $('#panel-inner');
panelEl.addEventListener('mouseover', e => { const s = e.target.closest('.slot.has'); if (s) { clearTimeout(popTimer); popPinned = false; showRelic(s); } });
panelEl.addEventListener('mouseout', e => { if (e.target.closest('.slot.has')) hideRelicSoon(); });
pop.addEventListener('mouseenter', () => clearTimeout(popTimer));
pop.addEventListener('mouseleave', () => { popPinned = false; hideRelicSoon(); });
panelEl.addEventListener('click', e => {
  const s = e.target.closest('.slot.has');
  if (s) { popPinned = true; showRelic(s); return; }
  const mv = e.target.closest('.move.can');
  if (mv) chooseMove(state.current.moves[+mv.dataset.move]);
});
document.addEventListener('click', e => {
  if (popPinned && !e.target.closest('#relic-pop') && !e.target.closest('.slot.has')) { popPinned = false; pop.classList.add('hidden'); }
});

// ---------- entrada del jugador ----------
function chooseMove(m) {
  if (state.phase !== 'choose-move' && state.phase !== 'choose-target') return;
  if (state.busy) return;
  const a = state.current;
  if (m.target === 'allEnemies' || m.target === 'allAllies' || m.target === 'self') { execute(a, m, null); return; }
  state.move = m; state.phase = 'choose-target';
  setHint(`${m.name}: elige ${m.target === 'ally' ? 'un aliado' : 'un enemigo'} · Esc para cancelar`);
  renderPanel();
}
function onCardTap(card) {
  const ch = card.ch;
  if (state.phase === 'choose-target' && !state.busy && validTarget(state.current, state.move, ch)) {
    execute(state.current, state.move, ch);
    return;
  }
  inspect(ch);
}
addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.phase === 'choose-target') {
    state.phase = 'choose-move'; state.move = null;
    setHint(`Turno de ${state.current.name}: elige un movimiento`);
    inspect(state.current);
  }
});
$('#ov-restart').addEventListener('click', () => location.reload());

// ---------- barra "Probar efectos" ----------
function updateToolbar() {
  const idle = (state.phase === 'choose-move' || state.phase === 'choose-target') && !state.busy && !state.over;
  $('#toolbar').classList.toggle('disabled', !idle);
}
$('#toolbar').addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const t = state.inspected;
  if (!t || t.dead || state.busy || !(state.phase === 'choose-move' || state.phase === 'choose-target')) return;
  state.busy = true; updateToolbar();
  const fx = btn.dataset.fx, max = maxHp(t);
  if (fx === 'hit' || fx === 'crit') {
    const crit = fx === 'crit';
    let d = max * (crit ? .18 : .09);
    let toHp = d * .3, toSh = d - toHp, sh = 0;
    if (t.shield > 0) { sh = Math.min(t.shield, toSh); t.shield -= sh; toHp += toSh - sh; } else toHp += toSh;
    t.hp -= toHp;
    fxHit(t, toHp, sh, crit, 0xffd0a0);
    await wait(250);
    if (t.hp <= 0) await kill(t);
    else {
      const bl = get(t, 'bleed'); if (bl) await dotHit(t, bl.value, 'bleed');
      const hm = get(t, 'hemo'); if (hm && !t.dead) { await dotHit(t, hm.value, 'hemo'); hm.value += .01; }
    }
  } else if (fx === 'block') await fxBlock(t);
  else if (fx === 'heal') { const a = Math.min(max * .2, max - t.hp); t.hp += a; fxHeal(t, a); }
  else if (fx === 'shield') { const a = max * .2; t.shield += a; fxShieldGain(t, a); }
  else if (fx === 'burn') applyBurn(t, .135, 2);
  else if (fx === 'poison') applyPoison(t, .0375);
  else if (fx === 'bleed') applyBleed(t, .065);
  else if (fx === 'bomb') await explodeBomb(t, { value: .2 });
  else if (fx === 'buff') applyBuff(t, .25, 2);
  else if (fx === 'cleanse') { t.statuses = t.statuses.filter(s => s.kind !== 'debuff'); fxCleanse(t); }
  else if (fx === 'tick') {
    await tickTurnStart(t);
    if (!get(t, 'burn') && !get(t, 'poison')) floatText(t.card.c.x, t.card.c.y, 'Sin DoTs de turno', { color: '#b9c2d3', size: 16, font: 'Inter' });
  }
  await wait(250);
  state.busy = false;
  refreshAll(); updateToolbar();
  checkEnd();
});

// ============================================================
//  BUCLE
// ============================================================
let T = 0;
app.ticker.add(tk => {
  const dt = tk.deltaTime;
  T += dt / 60;
  if (app.screen.width !== lastW || app.screen.height !== lastH) layout();
  for (const m of motes) {
    m.s.y -= m.vy * dt; m.s.x += Math.sin(T + m.ph) * .15 * dt;
    if (m.s.y < -10) { m.s.y = H + 10; m.s.x = rand(0, W); }
  }
  updateParticles(dt);
  for (const c of cards) c.tick(dt, T);
});

// ============================================================
//  INICIO
// ============================================================
cards.forEach((card, i) => {
  const from = card.ch.side === 'ally' ? H + 200 : -200;
  card.c.y = from; card.c.alpha = 0;
  gsap.to(card.c, { y: card.hy, alpha: 1, duration: .6, delay: .15 + (i % 5) * .08 + (card.ch.side === 'ally' ? .2 : 0), ease: 'back.out(1.4)' });
});
inspect(chars[0]);
renderOrder();
await wait(1100);
await startRound();
nextTurn();
})();
