// Pain (rediseño 2026-11-21): líder que limpia 3 debuffs del equipo por ronda y se cura 10% por cada uno; Caminos Humano
// (disipa todo al equipo enemigo) y Preta (quita 5% de HP máx. a los golpeados y Pain lo gana); Rinne Tensei revive a un
// aliado; Shinra Tensei (Over) con Mega Aturdimiento al 50%: quien no lo recibe provoca 30% de su HP máx. repartido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId, estado } from './util.mjs';

const pn = c => c.personajes.find(p => p.id === 'pain');
const listo = (c, p) => jugar(c, cc => cc.esperando?.id === p.uid);
const aguante = p => { p.base = { ...p.base, hp: 1e6 }; p.hp = 1e6; p.estados = p.estados.filter(e => e.permanente); p.extra = { ...p.extra, evasion: -1, block: -1, res: 0 }; };

test('Líder: al inicio de la ronda limpia 3 debuffs en total del equipo y Pain se cura 10% por cada uno', () => {
  const c = combate(['pain', 'kratos', 'batman'], ['aldebaran'], { semilla: 2 });
  const p = pn(c), [k, b] = ['kratos', 'batman'].map(id => c.personajes.find(x => x.id === id));
  for (const x of [k, b]) x.estados.push({ id: 'weaken', dur: 9, fuente: 'otro' }, { id: 'agotar', valor: .1, dur: 9, fuente: 'otro' });
  p.hp = 100;
  const ronda = c.ronda;
  const r = jugar(c, cc => cc.ronda > ronda);
  const ev = r.eventos, i = ev.findIndex(e => e.t === 'ronda');
  const despues = ev.slice(i);
  const limpios = despues.filter(e => e.t === 'limpieza' && e.de === p.uid).reduce((s, e) => s + e.n, 0);
  assert.equal(limpios, 3);
  const cura = despues.find(e => e.t === 'curacion' && e.de === p.uid && e.a === p.uid);
  assert.ok(cura && Math.abs(cura.cantidad - .30 * c.stats(p).hp) < 1, `cura ${cura?.cantidad}`);
  assert.equal([k, b].reduce((s, x) => s + x.estados.filter(e => ['weaken', 'agotar'].includes(e.id)).length, 0), 1);
});

test('Camino Humano: disipa todos los buffs del equipo enemigo al activarse', () => {
  const c = combate([{ ...porId('pain'), lider: null }], ['aldebaran', 'kratos'], { semilla: 3 });
  const p = pn(c), rivales = c.personajes.filter(x => x.lado === 'rival');
  for (const x of rivales) { aguante(x); x.extra = { ...x.extra, res: -9 }; }
  aguante(p); p.cicloIdx = 1;                                                     // el próximo turno entra en Humano
  listo(c, rivales[0]);
  for (const x of rivales) x.estados.push({ id: 'protect', dur: 9, fuente: x.uid }, { id: 'mirror', dur: 9, fuente: x.uid });
  listo(c, p);
  assert.equal(p.faseActiva.id, 'humano');
  for (const x of rivales) assert.equal(x.estados.filter(e => ['protect', 'mirror'].includes(e.id)).length, 0, x.id);
});

test('Camino Preta: quita 5% de HP máx. a todos los golpeados y Pain gana ese HP como HP máx. y se cura', () => {
  const c = combate([{ ...porId('pain'), lider: null }], ['aldebaran', 'kratos'], { semilla: 3 });
  const p = pn(c), rivales = c.personajes.filter(x => x.lado === 'rival');
  for (const x of rivales) aguante(x);
  aguante(p); p.cicloIdx = 3;                                         // el próximo turno entra en Preta
  listo(c, p);
  assert.equal(p.faseActiva.id, 'preta');
  const max0 = rivales.map(x => c.stats(x).hp), pMax0 = c.stats(p).hp;
  p.cds.over = 0;
  c.actuar({ categoria: 'over' });
  const quitado = rivales.reduce((s, x, i) => s + (max0[i] - c.stats(x).hp), 0);
  for (const [i, x] of rivales.entries()) assert.ok(c.stats(x).hp < max0[i] && x.permanente.hpPct <= -.05 + 1e-9, x.id);
  assert.ok(quitado > 0 && Math.abs(c.stats(p).hp - pMax0 - quitado) < 1, `${c.stats(p).hp - pMax0} vs ${quitado}`);
});

test('Camino Preta contra un jefe: no le baja el HP máx., le hace ese daño y Pain lo gana', () => {
  const c = combate([{ ...porId('pain'), lider: null }], ['aldebaran'], { semilla: 3 });
  const p = pn(c), j = c.personajes.find(x => x.lado === 'rival');
  aguante(j); j.jefe = true;
  p.cicloIdx = 3;
  listo(c, p);
  const max0 = c.stats(j).hp, pMax0 = c.stats(p).hp;
  const r = c.actuar({ categoria: 'basico', objetivo: j.uid });
  assert.equal(c.stats(j).hp, max0);
  const robo = r.eventos.find(e => e.t === 'robo' && e.de === p.uid);
  assert.ok(robo && Math.abs(c.stats(p).hp - pMax0 - robo.cantidad) < 1);
});

test('Rinne Tensei: revive a un aliado caído con 50%, limpia a Pain y le da Escudo Sagrado', () => {
  const c = combate([{ ...porId('pain'), lider: null }, 'kratos'], ['aldebaran'], { semilla: 3 });
  const p = pn(c), k = c.personajes.find(x => x.id === 'kratos');
  aguante(c.personajes.find(x => x.lado === 'rival'));
  listo(c, p);
  k.hp = 0; k.muerto = true;
  p.estados.push({ id: 'weaken', dur: 9, fuente: 'otro' }, { id: 'poison', valor: .01, dur: 9, fuente: 'otro' });
  p.cds.especial = 0;
  c.actuar({ categoria: 'especial' });
  assert.ok(!k.muerto && Math.abs(k.hp / c.stats(k).hp - .5) < .01, 'revivió con 50%');
  assert.ok(!estado(p, 'weaken') && !estado(p, 'poison'), 'sin debuffs');
  assert.ok(estado(p, 'escudoSagrado'), 'Escudo Sagrado');
});

test('Shinra Tensei: con Mega Aturdimiento seguro no hay daño extra; sin él cada enemigo provoca 30% de su HP repartido', () => {
  for (const prob of [1, 0]) {
    const def = { ...porId('pain'), lider: null, movimientos: porId('pain').movimientos.map(m => m.categoria === 'over'
      ? { ...m, efectos: [{ accion: { ...m.efectos[0].accion, prob } }] } : m) };
    const c = combate([def], ['aldebaran', 'kratos'], { semilla: 3 });
    const p = pn(c), rivales = c.personajes.filter(x => x.lado === 'rival');
    for (const x of rivales) { aguante(x); x.extra = { ...x.extra, res: -9 }; }
    aguante(p); p.cicloIdx = 0;                                                   // próximo Camino: Asura (no toca el resultado: solo cuenta el daño por efecto)
    listo(c, p);
    p.cds.over = 0;
    const r = c.actuar({ categoria: 'over' });
    const extra = r.eventos.filter(e => e.t === 'danoEfecto' && e.de === p.uid && e.color === 0xfde68a).reduce((s, e) => s + e.dano + e.escudo, 0);
    if (prob === 1) {
      for (const x of rivales) assert.ok(r.eventos.some(e => e.t === 'efecto' && e.a === x.uid && e.id === 'stun'), `${x.id} Mega Aturdido`);
      assert.equal(extra, 0);
    } else {
      const esperado = rivales.reduce((s, x) => s + .30 * 1e6, 0);
      assert.ok(extra > esperado * .5, `daño repartido ${extra} vs ~${esperado}`);
    }
  }
});
