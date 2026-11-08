// Horda: Velocidad extra de los enemigos cada 3 oleadas; Iori y Scorpion con el buff Contraataque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, azar, estado } from './util.mjs';
import { oleada, defsOleada, velocidadExtra } from '../js/datos/horda/horda.js';
import { oleadaGuardada } from '../js/motor/hordaReanudar.js';

test('Velocidad de la Horda: +1 o +2 por enemigo cada 3 oleadas, acumulado', () => {
  const rng = azar(7);
  for (let n = 1; n <= 60; n++) {
    const k = Math.floor(n / 3);
    for (let i = 0; i < 20; i++) { const v = velocidadExtra(n, rng); assert.ok(v >= k && v <= 2 * k, `oleada ${n}: ${v}`); }
  }
  assert.equal(velocidadExtra(2, () => .99), 0);
  assert.equal(velocidadExtra(30, () => 0), 10);
  assert.equal(velocidadExtra(30, () => .99), 20);
});

test('La Velocidad extra es por enemigo y el motor la suma a su Velocidad base', () => {
  const o = oleada(30, undefined, azar(3));
  assert.equal(o.spd.length, 5);
  const c = combate(['naruto'], defsOleada(o), { rival: o.opciones });
  const sinExtra = combate(['naruto'], defsOleada(o), { rival: { ...o.opciones, spdPlano: undefined } });
  c.personajes.filter(p => p.lado === 'rival').forEach((p, i) => {
    const base = sinExtra.personajes.find(x => x.uid === p.uid);
    assert.ok(Math.abs(c.stats(p).spd - c.stats(base).spd) > 0, p.uid);
    assert.ok(o.spd[i] >= 10 && o.spd[i] <= 20);
  });
});

test('Continuar una partida usa la Velocidad guardada de cada oleada', () => {
  const g = { horda: 'orcos', olas: [['orco', 'orco', 'orco', 'orco', 'orco']], spd: [[1, 2, 3, 4, 5]] };
  assert.deepEqual(oleadaGuardada(g, 1).opciones.spdPlano, [1, 2, 3, 4, 5]);
});

test('Iori y Scorpion tienen el buff Contraataque permanente, sin condiciones', () => {
  for (const id of ['iori-yagami', 'scorpion']) {
    const c = combate([id], ['naruto']);
    const yo = c.personajes.find(p => p.lado === 'jugador');
    assert.ok(estado(yo, 'counter')?.permanente, id);
    assert.equal(yo.pasiva.gatillo, undefined, id);
  }
});
