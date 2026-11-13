// Padmé Amidala: básico cura y limpia (y devuelve el debuff), Orden de Fuego cura por buff disipado, Voz de la República
// mueve cooldowns y escuda, pasiva de Confusión por buff enemigo y líder Reina de Naboo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';

const PADME = ['padme-amidala', 'shaka', 'kratos', 'batman', 'goku'];
const RIVAL = ['thor', 'loki', 'naruto', 'meliodas', 'wukong'];
const yo = c => c.personajes.find(p => p.id === 'padme-amidala');
const turnoDe = (c, p) => jugar(c, cc => cc.esperando?.id === p.uid);

test('Solución Diplomática: cura 10% del HP de Padmé y el debuff limpiado pasa a un enemigo', () => {
  const c = combate(PADME, RIVAL, { semilla: 4 });
  const p = yo(c); turnoDe(c, p);
  const al = c.personajes.find(x => x.id === 'kratos');
  al.hp = 100; al.estados.push({ id: 'weaken', dur: 2, fuente: 'rival-0' });
  const r = c.actuar({ categoria: 'basico', objetivo: al.uid });
  assert.ok(!al.estados.some(e => e.id === 'weaken'), 'limpiado');
  assert.ok(Math.abs(al.hp - (100 + .10 * c.stats(p).hp)) < 1, `curó ${al.hp - 100}`);
  assert.ok(r.eventos.some(e => e.t === 'bonoVisible' && /Negociaciones/.test(e.texto)), 'intenta devolverlo');
});

test('Orden de Fuego: disipa y cura 5% del HP de Padmé por cada buff disipado', () => {
  const c = combate(PADME, RIVAL, { semilla: 4 });
  const p = yo(c); turnoDe(c, p);
  const enemigos = c.personajes.filter(x => x.lado !== p.lado);
  for (const e of enemigos) e.estados.push({ id: 'dmgUp', dur: 3, valor: .2, fuente: e.uid });
  const al = c.personajes.find(x => x.id === 'kratos'); al.hp = 100;
  const r = c.actuar({ categoria: 'especial', objetivo: enemigos[0].uid });
  const quitados = r.eventos.filter(e => e.t === 'disipar').reduce((s, e) => s + e.n, 0);
  assert.ok(quitados >= 1);
  assert.ok(Math.abs(al.hp - (100 + quitados * .05 * c.stats(p).hp)) < 1, `quitó ${quitados}, curó ${al.hp - 100}`);
});

test('Voz de la República: −2 cooldown aliados (no su Over), +2 al Especial y Over enemigos, Escudo 20%', () => {
  const c = combate(PADME, RIVAL, { semilla: 4 });
  const p = yo(c); turnoDe(c, p);
  p.cds.over = 0;
  const al = c.personajes.find(x => x.id === 'kratos'); al.cds.especial = 3;
  const en = c.personajes.find(x => x.id === 'naruto'); en.cds.especial = 0; en.cds.over = 1; en.cds.basico = 0;   // (Thor no: su pasiva baja sus cooldowns cuando un enemigo usa el Over)
  c.actuar({ categoria: 'over', objetivo: p.uid });
  assert.equal(al.cds.especial, 1);
  assert.equal(p.cds.over, 4, 'su Over queda con su cooldown completo');
  assert.equal(en.cds.especial, 2); assert.equal(en.cds.over, 3); assert.equal(en.cds.basico, 0);
  assert.ok(Math.abs(al.escudo - .20 * c.stats(p).hp) < 1, `escudo ${al.escudo}`);
});

test('Pasiva y líder: aparecen Confusiones en partidas completas', () => {
  let conf = 0;
  for (let s = 1; s <= 6; s++) {
    const c = combate(PADME, RIVAL, { semilla: s });
    jugar(c, (cc, r) => { conf += (r.eventos || []).filter(e => e.t === 'efecto' && e.id === 'confuse').length; return false; }, s);
  }
  assert.ok(conf > 0);
});
