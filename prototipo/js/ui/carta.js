// Carta de personaje en el campo. Se dibuja a partir de la ficha (estática) y de la "vista" que manda el motor.
import { G, CW, CH, EMOJI_FONT, canvasTex, rr, shade, txt, spawn, rand, pick } from './graficos.js';
import { IMG, TEX_INVOCACION, drawCover } from './imagenes.js';
import { INVOCACIONES } from '../datos/invocaciones.js';
const { PIXI, gsap } = window;

function textura(p) {
  return canvasTex(CW, CH, (g, w, h) => {
    const aliado = p.lado === 'jugador', lider = p.esLider;
    const f = g.createLinearGradient(0, 0, w, h);
    if (lider) [[0, '#fff6d0'], [.18, '#f7c948'], [.4, '#8a5a0c'], [.6, '#f7c948'], [.82, '#b7821f'], [1, '#fff0b3']].forEach(([o, c]) => f.addColorStop(o, c));
    else if (aliado) { f.addColorStop(0, '#f3d58a'); f.addColorStop(.5, '#9c7a35'); f.addColorStop(1, '#5e4515'); }
    else { f.addColorStop(0, '#ff9a9a'); f.addColorStop(.5, '#9b2f3d'); f.addColorStop(1, '#4a121b'); }
    rr(g, 0, 0, w, h, 12); g.fillStyle = f; g.fill();
    const b = lider ? 5 : 3;
    if (lider) {                                  // bisel: brillo exterior y sombra interior
      rr(g, 1, 1, w - 2, h - 2, 11.5); g.strokeStyle = 'rgba(255,251,230,.95)'; g.lineWidth = 1; g.stroke();
      rr(g, b - 1, b - 1, w - 2 * b + 2, h - 2 * b + 2, 9.5); g.strokeStyle = 'rgba(70,45,5,.95)'; g.lineWidth = 1.2; g.stroke();
    }
    const bgc = g.createLinearGradient(0, 0, 0, h);
    bgc.addColorStop(0, lider ? '#231d14' : '#1c2233'); bgc.addColorStop(1, '#0b0e16');
    rr(g, b, b, w - 2 * b, h - 2 * b, 9); g.fillStyle = bgc; g.fill();

    g.save(); rr(g, 9, 9, w - 18, 112, 8); g.clip();
    const ar = g.createRadialGradient(w / 2, 58, 6, w / 2, 58, 95);
    ar.addColorStop(0, p.color); ar.addColorStop(.55, shade(p.color, -.6)); ar.addColorStop(1, '#07090f');
    g.fillStyle = ar; g.fillRect(9, 9, w - 18, 112);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const img = IMG[p.imagen];
    if (img) drawCover(g, img, 9, 9, w - 18, 112, .5, .3);
    else {
      g.globalAlpha = .1; g.fillStyle = '#fff';
      for (let i = 0; i < 14; i++) {
        g.save(); g.translate(w / 2, 62); g.rotate(i * Math.PI / 7);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-7, -130); g.lineTo(7, -130); g.closePath(); g.fill(); g.restore();
      }
      g.globalAlpha = 1; g.font = `58px ${EMOJI_FONT}`;
      g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 14; g.fillText(p.emoji, w / 2, 64); g.shadowBlur = 0;
    }
    const vg = g.createLinearGradient(0, 80, 0, 121);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
    g.fillStyle = vg; g.fillRect(9, 80, w - 18, 41);
    g.restore();
    rr(g, 9, 9, w - 18, 112, 8); g.strokeStyle = 'rgba(255,230,170,.35)'; g.lineWidth = 1; g.stroke();

    const rb = g.createLinearGradient(0, 0, w, 0);
    rb.addColorStop(0, 'rgba(10,12,20,0)'); rb.addColorStop(.15, 'rgba(10,12,20,.96)');
    rb.addColorStop(.85, 'rgba(10,12,20,.96)'); rb.addColorStop(1, 'rgba(10,12,20,0)');
    g.fillStyle = rb; g.fillRect(4, 110, w - 8, 24);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = lider ? 'rgba(255,215,110,.95)' : aliado ? 'rgba(243,213,138,.6)' : 'rgba(255,138,138,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(16, 110.5); g.lineTo(w - 16, 110.5); g.moveTo(16, 133.5); g.lineTo(w - 16, 133.5); g.stroke();
    g.fillStyle = '#fff';
    let fs = 14;
    do { g.font = `700 ${fs}px Cinzel`; } while (g.measureText(p.nombre.toUpperCase()).width > w - 52 && --fs > 8);
    g.fillText(p.nombre.toUpperCase(), w / 2, 123);
    g.fillStyle = '#8e98ad'; g.font = '600 8px Inter'; g.fillText((p.rol || '').toUpperCase(), w / 2, 143);
    const pill = (x, fill, stroke) => { rr(g, x, 152, 58, 18, 9); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.stroke(); };
    pill(12, '#2a1a14', 'rgba(255,140,90,.55)'); pill(w - 70, '#141c2a', 'rgba(110,180,255,.55)');
    g.font = `10px ${EMOJI_FONT}`; g.fillText('⚔️', 23, 161.5); g.fillText('⚡', w - 59, 161.5);
    rr(g, 12, 178, w - 24, 14, 5); g.fillStyle = '#05070b'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
    if (lider) ornamentosLider(g, w, h);
  });
}

// Filigrana dorada en las cuatro esquinas + gema en la parte superior (solo la carta de líder)
function ornamentosLider(g, w, h) {
  const oro = g.createLinearGradient(0, 0, w, h);
  oro.addColorStop(0, '#fff3c4'); oro.addColorStop(.5, '#e0a82e'); oro.addColorStop(1, '#fff0b3');
  const esquina = (x, y, sx, sy) => {
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.strokeStyle = oro; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(3, 24); g.lineTo(3, 9); g.quadraticCurveTo(3, 3, 9, 3); g.lineTo(24, 3); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(8, 8, 18, 8); g.stroke();
    g.beginPath(); g.arc(24, 3, 1.8, 0, Math.PI * 2); g.arc(3, 24, 1.8, 0, Math.PI * 2); g.fillStyle = '#fff3c4'; g.fill();
    g.beginPath(); g.moveTo(6.5, 1.5); g.lineTo(11.5, 6.5); g.lineTo(6.5, 11.5); g.lineTo(1.5, 6.5); g.closePath();
    g.fillStyle = '#e11d48'; g.fill(); g.strokeStyle = '#fff3c4'; g.lineWidth = 1; g.stroke();
    g.restore();
  };
  esquina(2, 2, 1, 1); esquina(w - 2, 2, -1, 1); esquina(2, h - 2, 1, -1); esquina(w - 2, h - 2, -1, -1);
  // gema central superior con alas de filigrana
  const cx = w / 2;
  g.strokeStyle = oro; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx - 26, 3); g.quadraticCurveTo(cx - 12, 3, cx - 8, 8); g.moveTo(cx + 26, 3); g.quadraticCurveTo(cx + 12, 3, cx + 8, 8); g.stroke();
  g.beginPath(); g.moveTo(cx, 0.5); g.lineTo(cx + 8, 8); g.lineTo(cx, 15.5); g.lineTo(cx - 8, 8); g.closePath();
  const gema = g.createLinearGradient(cx - 8, 0, cx + 8, 16);
  gema.addColorStop(0, '#ffe4e6'); gema.addColorStop(.35, '#f43f5e'); gema.addColorStop(1, '#881337');
  g.fillStyle = gema; g.fill(); g.strokeStyle = '#fff3c4'; g.lineWidth = 1.3; g.stroke();
  g.beginPath(); g.moveTo(cx - 2.5, 5); g.lineTo(cx, 3); g.lineTo(cx + 1, 6); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
}

export class Carta {
  constructor(p, x, y, alTocar) {
    this.p = p; this.hx = x; this.hy = y; this.v = null;
    const c = this.c = new PIXI.Container();
    c.position.set(x, y); c.zIndex = 1;

    this.aura = new PIXI.Graphics(); c.addChild(this.aura);          // brillo de Over listo
    this.ring = new PIXI.Graphics(); c.addChild(this.ring);
    this.shadow = new PIXI.Graphics().roundRect(-CW / 2 + 4, -CH / 2 + 12, CW, CH, 14).fill({ color: 0x000000, alpha: .5 });
    this.shadow.filters = [new PIXI.BlurFilter({ strength: 10 })]; c.addChild(this.shadow);

    const body = this.body = new PIXI.Container(); c.addChild(body);
    this.face = new PIXI.Sprite(textura(p)); this.face.anchor.set(.5); this.face.scale.set(.5); body.addChild(this.face);
    this.hpG = new PIXI.Graphics(); body.addChild(this.hpG);
    this.hpText = txt('', { size: 9, weight: '900', stroke: 3 }); this.hpText.position.set(0, 80); body.addChild(this.hpText);
    this.dmgText = txt('', { size: 12, weight: '900', fill: '#ffd2b8', stroke: 3 }); this.dmgText.position.set(-28, 56); body.addChild(this.dmgText);
    this.spdText = txt('', { size: 12, weight: '900', fill: '#bfe0ff', stroke: 3 }); this.spdText.position.set(40, 56); body.addChild(this.spdText);
    this.shieldFx = new PIXI.Graphics(); body.addChild(this.shieldFx);
    this.shieldBadge = txt('', { size: 11, weight: '900', fill: '#a5f3fc', stroke: 4 }); this.shieldBadge.position.set(CW / 2 - 18, -CH / 2 + 2); body.addChild(this.shieldBadge);
    this.flashG = new PIXI.Graphics().roundRect(-CW / 2, -CH / 2, CW, CH, 12).fill(0xffffff);
    this.flashG.alpha = 0; this.flashG.blendMode = 'add'; body.addChild(this.flashG);
    this.cracks = new PIXI.Graphics(); body.addChild(this.cracks);
    this.summonRow = new PIXI.Container(); this.summonRow.position.set(-CW / 2 + 4, -CH / 2 + 8); body.addChild(this.summonRow);

    if (p.esLider) {                                                   // casilla de líder: resplandor dorado
      this.liderGlow = new PIXI.Graphics().roundRect(-CW / 2 - 3, -CH / 2 - 3, CW + 6, CH + 6, 14).stroke({ width: 7, color: 0xf7c948, alpha: .35 });
      this.liderGlow.filters = [new PIXI.BlurFilter({ strength: 6 })];
      c.addChildAt(this.liderGlow, c.getChildIndex(this.shadow) + 1);
      this.liderT = 0;
    }
    // Transformación: marco de energía del color de la forma + contador de turnos restantes
    this.formaG = new PIXI.Graphics(); this.formaG.visible = false;
    this.formaG.filters = [new PIXI.BlurFilter({ strength: 3 })];
    c.addChildAt(this.formaG, c.getChildIndex(this.shadow) + 1);
    this.formaBadge = new PIXI.Container(); this.formaBadge.position.set(CW / 2 + 2, -CH / 2 + 40); this.formaBadge.visible = false;
    c.addChild(this.formaBadge);
    this.formaKey = null;
    this.statusRow = new PIXI.Container(); this.statusRow.y = CH / 2;   // sobre el borde inferior de la carta
    c.addChild(this.statusRow);
    this.marker = txt('▼', { size: 22, fill: '#ffd36b', stroke: 4 }); this.marker.y = -CH / 2 - 20; this.marker.alpha = 0; c.addChild(this.marker);

    c.eventMode = 'static'; c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(-CW / 2, -CH / 2, CW, CH);
    c.on('pointerover', () => this.hover(true));
    c.on('pointerout', () => this.hover(false));
    c.on('pointermove', e => { if (!this.v?.muerto) this.body.rotation = Math.max(-1, Math.min(1, e.getLocalPosition(this.c).x / (CW / 2))) * .045; });
    c.on('pointertap', () => alTocar(this));

    this.disp = { hp: 0, lag: 0, sh: 0 };
    this.rk = '';
    G.cardLayer.addChild(c);
  }

  hover(on) {
    if (this.v?.muerto) on = false;
    if (this.c.zIndex < 20) this.c.zIndex = on ? 10 : 1;
    gsap.to(this.body, { y: on ? -14 : 0, duration: .2, ease: 'power2.out' });
    gsap.to(this.body.scale, { x: on ? 1.07 : 1, y: on ? 1.07 : 1, duration: .2, ease: 'power2.out' });
    if (!on) gsap.to(this.body, { rotation: 0, duration: .25 });
  }

  // Aplica una vista del motor (hp, escudo, estados, cooldowns, invocaciones…)
  aplicar(v, instantaneo = false) {
    const primera = !this.v;
    this.v = v;
    this.dmgText.text = Math.round(v.stats.dmg);
    this.dmgText.style.fill = v.estados.some(e => e.id === 'dmgUp') ? '#7dffa8' : '#ffd2b8';
    this.spdText.text = Math.round(v.stats.spd);
    const to = { hp: v.hp, sh: v.escudo };
    gsap.killTweensOf(this.disp);
    const up = () => this.dibujarHp();
    if (primera || instantaneo) { Object.assign(this.disp, { hp: to.hp, lag: to.hp, sh: to.sh }); up(); }
    else if (to.hp < this.disp.hp - .01) {
      this.disp.lag = Math.max(this.disp.lag, this.disp.hp);
      gsap.to(this.disp, { hp: to.hp, sh: to.sh, duration: .3, ease: 'power2.out', onUpdate: up });
      gsap.to(this.disp, { lag: to.hp, duration: .6, delay: .45, ease: 'power2.in', onUpdate: up });
    } else gsap.to(this.disp, { hp: to.hp, lag: to.hp, sh: to.sh, duration: .5, ease: 'power2.out', onUpdate: up });

    this.shieldFx.clear();
    if (v.escudo >= 1) {
      this.shieldFx.roundRect(-CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 16).fill({ color: 0x67e8f9, alpha: .06 }).stroke({ width: 2, color: 0x9ff3ff, alpha: .9 });
      this.shieldBadge.text = `🛡 ${Math.round(v.escudo)}`;
    } else this.shieldBadge.text = '';
    this.estados(); this.invocaciones();
    if (this.liderGlow) this.liderGlow.alpha = v.muerto ? 0 : 1;
    this.dibujarForma();
  }

  // Cambia la ilustración/nombre de la carta a la forma (o de vuelta a la base si forma = null)
  cambiarForma(forma) {
    const p = forma ? { ...this.p, nombre: forma.nombre, imagen: forma.imagen || '', emoji: forma.emoji || this.p.emoji, color: forma.color || this.p.color } : this.p;
    this.face.texture = textura(p);
    this.formaKey = null;
  }
  dibujarForma() {
    const f = this.v?.forma;
    const key = f && !this.v.muerto ? `${f.nombre}|${f.turnos}` : null;
    if (key === this.formaKey) return;
    this.formaKey = key;
    this.formaG.visible = this.formaBadge.visible = !!key;
    for (const ch of this.formaBadge.removeChildren()) ch.destroy({ children: true });
    this.formaG.clear();
    if (!key) return;
    const col = parseInt(f.color.slice(1), 16);
    this.formaCol = col;
    this.formaG.roundRect(-CW / 2 - 4, -CH / 2 - 4, CW + 8, CH + 8, 15).stroke({ width: 6, color: col, alpha: .9 });
    const g = new PIXI.Graphics().circle(0, 0, 14).fill({ color: 0x0b0f18, alpha: .95 }).stroke({ width: 2, color: col });
    const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(0, Math.min(1, f.turnos / f.total));
    g.moveTo(Math.cos(a0) * 18, Math.sin(a0) * 18).arc(0, 0, 18, a0, a1).stroke({ width: 3, color: 0xffd36b });
    this.formaBadge.addChild(g, txt(String(f.turnos), { size: 13, weight: '900', stroke: 3 }));
  }

  dibujarHp() {
    const d = this.disp, max = this.v.maxHp;
    const total = Math.max(max, d.hp + d.sh), w = 122, x0 = -61, y = 75, h = 10;
    const g = this.hpG.clear();
    const hpW = w * Math.max(0, d.hp) / total;
    if (d.lag > d.hp) g.rect(x0 + hpW, y, w * (d.lag - Math.max(0, d.hp)) / total, h).fill({ color: 0xffe1c2, alpha: .85 });
    const r = d.hp / max;
    if (hpW > 0) { g.rect(x0, y, hpW, h).fill(r > .5 ? 0x3ccf7a : r > .25 ? 0xf2c21b : 0xe23b3b); g.rect(x0, y, hpW, h * .4).fill({ color: 0xffffff, alpha: .2 }); }
    if (d.sh > 0) g.rect(x0 + hpW, y, w * d.sh / total, h).fill({ color: 0x67e8f9, alpha: .95 });
    this.hpText.text = `${Math.max(0, Math.round(d.hp))}${d.sh >= 1 ? '  +' + Math.round(d.sh) : ''}`;
  }

  estados() {
    for (const c of this.statusRow.removeChildren()) c.destroy({ children: true });
    const lista = this.v.estados;
    lista.forEach((st, i) => {
      const b = new PIXI.Container();
      b.x = (i - (lista.length - 1) / 2) * 27;
      b.addChild(new PIXI.Graphics().circle(0, 0, 12).fill({ color: 0x0b0f18, alpha: .95 }).stroke({ width: 2.5, color: st.tipo === 'debuff' ? 0xef4444 : 0x22c55e }));   // verde = buff, rojo = debuff
      b.addChild(txt(st.icono, { size: 12, stroke: 0, font: EMOJI_FONT }));
      if (st.n !== '' && st.n !== undefined) { const n = txt(String(st.n), { size: 9, weight: '900', stroke: 3 }); n.position.set(9, 8); b.addChild(n); }
      this.statusRow.addChild(b);
    });
  }

  invocaciones() {
    for (const c of this.summonRow.removeChildren()) c.destroy({ children: true });
    this.v.invocaciones.forEach((s, i) => {
      const def = INVOCACIONES[s.key];
      const m = new PIXI.Container(); m.y = i * 38;
      const glow = new PIXI.Sprite(G.dotTex); glow.anchor.set(.5); glow.tint = def.color; glow.blendMode = 'add'; glow.scale.set(.95); glow.alpha = .7;
      m.addChild(glow); m.glow = glow;
      const rare = { 'Común': 0x9ca3af, 'Raro': 0x4ade80, 'Especial': 0x60a5fa, 'Épico': 0xc084fc, 'Legendario': 0xfbbf24 }[def.rareza] ?? def.color;
      const g = new PIXI.Graphics().circle(0, 0, 16).fill({ color: 0x0b0f18, alpha: .95 }).stroke({ width: 2.5, color: rare });
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(0, Math.min(1, s.dur / def.dur));
      g.moveTo(Math.cos(a0) * 20, Math.sin(a0) * 20).arc(0, 0, 20, a0, a1).stroke({ width: 3, color: 0xffd36b });
      m.addChild(g);
      const tex = TEX_INVOCACION[s.key];
      if (tex) {
        const sp = new PIXI.Sprite(tex); sp.anchor.set(...(def.enfoque || [.5, .36])); sp.scale.set((def.enfoque ? 80 : 56) / tex.width);
        const mk = new PIXI.Graphics().circle(0, 0, 14.5).fill(0xffffff);
        sp.mask = mk; m.addChild(mk, sp);
      } else m.addChild(txt(def.emoji, { size: 17, stroke: 0, font: EMOJI_FONT }));
      this.summonRow.addChild(m);
    });
  }

  // Estado visual por cuadro: turno actual, objetivo válido, seleccionado, Over listo, DoTs activos
  tick(dt, T, ui) {
    const v = this.v;
    if (!v) return;
    if (v.muerto) {
      if (this.rk !== 'dead') { this.ring.clear(); this.aura.clear(); this.marker.alpha = 0; this.rk = 'dead'; }
      return;
    }
    const uid = this.p.uid;
    const cur = ui.actual === uid, targ = ui.objetivosValidos?.includes(uid), insp = ui.inspeccionado === uid;
    const overListo = (v.cds.over ?? 1) === 0;
    const key = `${cur}|${targ}|${insp}|${overListo}|${ui.tipoObjetivo}`;
    if (key !== this.rk) {
      this.rk = key;
      const g = this.ring.clear();
      const R = (p, wdt, color, alpha) => g.roundRect(-CW / 2 - p, -CH / 2 - p, CW + p * 2, CH + p * 2, 12 + p).stroke({ width: wdt, color, alpha });
      if (targ) { const col = ui.tipoObjetivo === 'aliado' ? 0x4ade80 : 0xff4d5e; R(9, 10, col, .25); R(5, 3, col, 1); }
      else if (cur) { R(10, 12, 0xffd36b, .22); R(5, 3, 0xffd36b, 1); }
      else if (insp) R(5, 2, 0xffffff, .75);
      const a = this.aura.clear();
      if (overListo) a.roundRect(-CW / 2 - 3, -CH / 2 - 3, CW + 6, CH + 6, 14).stroke({ width: 6, color: 0xfbbf24, alpha: .5 });
    }
    this.ring.alpha = (cur || targ) ? .6 + .4 * Math.sin(T * 6) : 1;
    if (overListo) this.aura.alpha = .35 + .35 * Math.sin(T * 3.2);
    this.marker.alpha = cur ? 1 : 0;
    this.marker.y = -CH / 2 - 22 + Math.sin(T * 5) * 4;
    if (v.escudo >= 1) this.shieldFx.alpha = .75 + .25 * Math.sin(T * 3);
    this.summonRow.children.forEach((m, i) => { if (m.glow) m.glow.alpha = .5 + .3 * Math.sin(T * 4 + i); });

    const { x, y } = this.c;
    if (this.liderGlow) {                          // líder: resplandor que respira + dos destellos que recorren el marco
      this.liderGlow.alpha = .7 + .3 * Math.sin(T * 1.6);
      const per = 2 * (CW + CH);
      this.liderT = (this.liderT + dt * 2.4) % per;
      for (const d of [this.liderT, (this.liderT + per / 2) % per]) {
        const [px, py] = d < CW ? [-CW / 2 + d, -CH / 2] : d < CW + CH ? [CW / 2, -CH / 2 + d - CW]
          : d < 2 * CW + CH ? [CW / 2 - (d - CW - CH), CH / 2] : [-CW / 2, CH / 2 - (d - 2 * CW - CH)];
        const k = this.body.scale.x;
        spawn({ x: x + px * k, y: y + this.body.y + py * k, color: pick([0xfff3c4, 0xf7c948, 0xffffff]), size: rand(.14, .24), life: 24, drag: .9, grow: -.6 });
      }
    }
    if (v.forma && this.formaCol !== undefined) {   // forma: marco que late y llamas/energía subiendo por los bordes
      this.formaG.alpha = .55 + .45 * Math.sin(T * 4);
      if (Math.random() < .6 * dt) {
        const lado = Math.random() < .5 ? -1 : 1, k = this.body.scale.x;
        spawn({ x: x + lado * (CW / 2 + rand(-3, 5)) * k, y: y + this.body.y + rand(-CH / 2, CH / 2) * k, vy: rand(-1.2, -2.6), vx: lado * rand(0, .5),
          color: pick([this.formaCol, 0xffd36b, 0xffffff]), size: rand(.14, .26), life: rand(26, 40), drag: .99, grow: -.7 });
      }
    }
    const tiene = id => v.estados.some(e => e.id === id);
    if (tiene('burn') && Math.random() < .35 * dt)
      spawn({ x: x + rand(-60, 60), y: y + rand(30, 95), vy: rand(-1.4, -2.8), vx: rand(-.3, .3), color: pick([0xff7a2a, 0xffb347, 0xff4500]), size: rand(.12, .24), life: rand(30, 50), drag: .99, grow: -.8 });
    if (tiene('poison') && Math.random() < .1 * dt)
      spawn({ x: x + rand(-55, 55), y: y + rand(20, 90), vy: rand(-.5, -1.1), vx: rand(-.2, .2), color: pick([0x7ee36b, 0xa6f78f]), size: rand(.25, .45), life: 60, tex: G.hardTex, blend: 'normal', alpha: .75, drag: .99, grow: .3 });
    const sangra = tiene('bleed') ? .06 : tiene('hemo') ? .16 : 0;
    if (sangra && Math.random() < sangra * dt)
      spawn({ x: x + rand(-60, 60), y: y + rand(-60, 60), vy: rand(0, .6), color: pick([0xd0002a, 0x9b0020]), size: rand(.25, .4), life: 50, g: .12, tex: G.hardTex, blend: 'normal', drag: .99, grow: -.3 });
    if (tiene('freeze') && Math.random() < .12 * dt)
      spawn({ x: x + rand(-65, 65), y: y + rand(-95, 95), vy: rand(-.2, .2), color: pick([0xbae6fd, 0xffffff]), size: rand(.1, .2), life: 50, drag: .99, grow: .2 });
  }
}
