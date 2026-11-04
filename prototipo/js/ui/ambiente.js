// Ambiente de un campo especial (Jefe de Raid): fondo propio, nieve que siempre cae y efectos de campo que acompañan a los ataques.
// Un movimiento pide su efecto con el campo `ambiente` de su ficha: 'ventisca', 'rayos' o 'furia'.
import { G, burst, shakeScene } from './graficos.js';

const { PIXI, gsap } = window;
const azar = (a, b) => a + Math.random() * (b - a);
let A = null;

export async function iniciarAmbiente({ fondo, nieve = true }) {
  terminarAmbiente();
  const stage = G.app.stage, tex = await PIXI.Assets.load(fondo);
  if (A) terminarAmbiente();
  const atras = new PIXI.Container(), frente = new PIXI.Container();
  frente.eventMode = 'none'; atras.eventMode = 'none';
  const img = new PIXI.Sprite(tex); img.anchor.set(.5);
  const velo = new PIXI.Graphics(), niebla = new PIXI.Graphics(), destello = new PIXI.Graphics();
  niebla.alpha = 0; destello.alpha = 0;
  atras.addChild(img, velo);
  stage.addChildAt(atras, 0); stage.addChild(frente);
  const n = !nieve ? 0 : document.body.classList.contains('movil') ? 70 : 170;
  const copos = Array.from({ length: n }, () => {
    const s = new PIXI.Sprite(G.dotTex); s.anchor.set(.5); s.tint = 0xe0f2fe;
    const c = { s, cerca: azar(.35, 1), fase: azar(0, 6.28) };
    s.position.set(azar(0, 2000), azar(0, 1200)); s.scale.set(.05 + c.cerca * .1); s.alpha = .3 + c.cerca * .5;
    frente.addChild(s);
    return c;
  });
  frente.addChild(niebla, destello);
  G.bgLayer.visible = false; G.ambLayer.visible = false;
  A = { atras, frente, img, velo, niebla, destello, copos, viento: 0, base: 0, w: 0, h: 0, T: 0 };
  A.tick = tk => {
    const w = G.app.screen.width, h = G.app.screen.height, dt = tk.deltaTime;
    if (w !== A.w || h !== A.h) {
      A.w = w; A.h = h;
      const k = Math.max(w / tex.width, h / tex.height);
      img.scale.set(k); img.position.set(w / 2, h / 2);
      velo.clear().rect(0, 0, w, h).fill({ color: 0x020617, alpha: .3 });
      niebla.clear().rect(0, 0, w, h).fill({ color: 0xdbeafe });
      destello.clear().rect(0, 0, w, h).fill({ color: 0xffffff });
    }
    A.T += dt / 60;
    const v = A.viento;
    for (const c of A.copos) {
      const s = c.s;
      s.y += (.55 + v * 13) * c.cerca * dt;
      s.x += (Math.sin(A.T * .8 + c.fase) * .3 - v * 15) * c.cerca * dt;
      s.rotation = v > .1 ? Math.atan2(1, -1.15) - Math.PI / 2 : 0;
      s.scale.set(.05 + c.cerca * .1, (.05 + c.cerca * .1) * (1 + v * 5));
      if (s.y > h + 20) { s.y = -20; s.x = azar(0, w * 1.4); }
      if (s.x < -30) { s.x = w + 20; s.y = azar(-20, h); }
      if (s.x > w + 40) s.x = -20;
    }
  };
  G.app.ticker.add(A.tick);
}

export function terminarAmbiente() {
  if (!A) return;
  const a = A; A = null;
  gsap.killTweensOf(a); gsap.killTweensOf(a.niebla); gsap.killTweensOf(a.destello);
  G.app.ticker.remove(a.tick);
  a.atras.destroy({ children: true }); a.frente.destroy({ children: true });
  G.bgLayer.visible = true; G.ambLayer.visible = true;
}

// La nieve se acelera hasta volverse tormenta y luego vuelve a la calma (o a la base, si ya empezó la furia)
function tormenta(fuerza, segundos, niebla = .16) {
  if (!A) return;
  gsap.killTweensOf(A); gsap.killTweensOf(A.niebla);
  const a = A;
  gsap.to(a, { viento: fuerza, duration: .45, ease: 'power2.in' });
  gsap.to(a.niebla, { alpha: niebla, duration: .45 });
  gsap.to(a, { viento: a.base, duration: 1.3, delay: segundos, ease: 'power2.out' });
  gsap.to(a.niebla, { alpha: a.base * .2, duration: 1.3, delay: segundos });
}
function destellar(alpha = .5, dur = .35) {
  if (!A) return;
  gsap.killTweensOf(A.destello);
  gsap.fromTo(A.destello, { alpha }, { alpha: 0, duration: dur, ease: 'power2.out' });
}

// Rayo de hielo quebrado entre dos puntos (coordenadas del tablero)
function rayo(desde, hasta, { grosor = 7, color = 0x7dd3fc, retardo = 0, capa = null, antesDe = null } = {}) {
  const puntos = [[desde.x, desde.y]], tramos = 9;
  const dx = hasta.x - desde.x, dy = hasta.y - desde.y, largo = Math.hypot(dx, dy) || 1, nx = -dy / largo, ny = dx / largo;
  for (let i = 1; i < tramos; i++) { const t = i / tramos, d = azar(-34, 34) * Math.sin(t * Math.PI); puntos.push([desde.x + dx * t + nx * d, desde.y + dy * t + ny * d]); }
  puntos.push([hasta.x, hasta.y]);
  const g = new PIXI.Graphics();
  const linea = (w, col, al) => { g.moveTo(...puntos[0]); for (const p of puntos.slice(1)) g.lineTo(...p); g.stroke({ width: w, color: col, alpha: al, cap: 'round', join: 'round' }); };
  linea(grosor * 2.6, color, .28); linea(grosor, color, .9); linea(grosor * .35, 0xffffff, 1);
  g.blendMode = 'add'; g.alpha = 0;
  if (capa) capa.addChildAt(g, capa.getChildIndex(antesDe)); else G.fxLayer.addChild(g);
  gsap.timeline({ delay: retardo, onComplete: () => { if (!g.destroyed) g.destroy(); } })
    .to(g, { alpha: 1, duration: .03 }).to(g, { alpha: .25, duration: .05 }).to(g, { alpha: 1, duration: .03 }).to(g, { alpha: 0, duration: .35, delay: .08 });
  if (!capa) gsap.delayedCall(retardo + .03, () => { if (A) burst(hasta.x, hasta.y, { n: 14, colors: [0xffffff, 0xbae6fd, color], speed: 8, size: .26, life: 26 }); });
}

// Efecto de un ataque. desde/objetivos son cartas. Devuelve cuánto conviene esperar antes del impacto (ms).
export function efectoAtaque(tipo, desde, objetivos) {
  if (!A || !tipo) return 0;
  const o = desde.c, ts = objetivos.map(t => t.c);
  if (tipo === 'ventisca') { tormenta(1, 2.4); return 450; }
  if (tipo === 'rayos') {
    destellar(.22, .25);
    for (const t of ts) { rayo(o, t, { grosor: 8 }); rayo(o, t, { grosor: 4, retardo: .1 }); }
    shakeScene(9);
    return 200;
  }
  if (tipo === 'furia') {
    tormenta(1.7, 3, .3);
    destellar(.7, .55);
    shakeScene(16);
    for (const [i, t] of ts.entries()) { rayo(o, t, { grosor: 10, color: 0x38bdf8, retardo: i * .07 }); rayo(o, t, { grosor: 5, retardo: .12 + i * .07 }); }
    gsap.delayedCall(.45, () => { if (A) { destellar(.35, .35); shakeScene(10); } });
    return 500;
  }
  return 0;
}

// Un campeón cae: su alma sube hacia Frostmourne
export function almaAlJefe(carta, jefe) {
  if (!A || !carta || !jefe) return;
  const s = new PIXI.Sprite(G.dotTex); s.anchor.set(.5); s.tint = 0x7dd3fc; s.blendMode = 'add'; s.scale.set(.5);
  s.position.set(carta.c.x, carta.c.y);
  G.fxLayer.addChild(s);
  gsap.to(s, { x: jefe.c.x, y: jefe.c.y + 40, duration: 1.1, ease: 'power1.in',
    onUpdate: () => { if (A && !s.destroyed) burst(s.x, s.y, { n: 1, colors: [0xbae6fd], speed: 1, size: .14, life: 18 }); },
    onComplete: () => { if (!s.destroyed) { burst(s.x, s.y, { n: 12, colors: [0xffffff, 0x7dd3fc], speed: 5, size: .22, life: 22 }); s.destroy(); } } });
}

// Una invocación con vuelo (Sindragosa) aparece en el centro de la pantalla y lanza rayos de hielo en todas direcciones
export async function vueloInvocacion(imagen, { fuerza = 1, segundos = 2 } = {}) {
  if (!A) return;
  const tex = await PIXI.Assets.load(imagen);
  if (!A) return;
  const w = A.w, h = A.h, frente = A.frente, niebla = A.niebla, s = new PIXI.Sprite(tex);
  const lado = Math.min(w * .78, h * .85) / tex.width;
  const cx = w / 2, cy = h * .44;
  s.anchor.set(.5); s.alpha = 0; s.eventMode = 'none'; s.scale.set(lado * .86); s.position.set(cx, cy);
  frente.addChildAt(s, frente.getChildIndex(niebla));          // delante de la nieve, detrás de la niebla y el destello
  tormenta(fuerza, segundos, .14);
  destellar(.2, .4);
  shakeScene(8);
  gsap.timeline({ onComplete: () => { if (!s.destroyed) s.destroy(); } })
    .to(s, { alpha: 1, duration: .25 }, 0)
    .to(s.scale, { x: lado, y: lado, duration: segundos, ease: 'power1.out' }, 0)
    .to(s, { alpha: 0, duration: .35 }, segundos - .35);
  // Los rayos salen de su pecho brillante, repartidos por todo el círculo para no amontonarse en un lado
  const origen = { x: cx - tex.width * lado * .03, y: cy + tex.height * lado * .02 };
  const n = document.body.classList.contains('movil') ? 12 : 18, alcance = Math.hypot(w, h) * .55;
  for (let i = 0; i < n; i++) {
    const ang = (i * 2.399963) % (Math.PI * 2);                // ángulo áureo: cada rayo cae lejos del anterior
    const largo = alcance * azar(.6, 1);
    rayo(origen, { x: origen.x + Math.cos(ang) * largo, y: origen.y + Math.sin(ang) * largo },
      { grosor: azar(4, 8), color: i % 3 ? 0x7dd3fc : 0x38bdf8, retardo: .15 + (segundos - .75) * i / n, capa: frente, antesDe: niebla });
  }
}
