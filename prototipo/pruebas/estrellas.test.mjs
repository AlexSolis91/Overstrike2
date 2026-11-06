// Estrellas de la cuenta: solo HP, Daño y Velocidad. 1★–5★ +3% cada una; moradas (6–10) +5% cada una.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, porId } from './util.mjs';
import { bonoEstrellas } from '../js/motor/reglas.js';

const conEstrellas = n => {
  const c = crearCombate({ equipoJugador: [{ ...porId('goku'), estrellas: n }], equipoRival: [porId('naruto')], semilla: 1 });
  const p = c.personajes[0];
  return { base: c.stats(p, {}), est: c.stats(p, { estrellas: true }) };
};
const r = x => Math.round(x * 1000) / 1000;

test('Bono de estrellas: 5★ +15%, 2 moradas +25%, 5 moradas +40%', () => {
  assert.equal(r(bonoEstrellas(0)), 0);
  assert.equal(r(bonoEstrellas(5)), .15);
  assert.equal(r(bonoEstrellas(7)), .25);
  assert.equal(r(bonoEstrellas(10)), .40);
});

test('Las estrellas suben HP, Daño y Velocidad y nada más', () => {
  for (const n of [5, 10]) {
    const { base, est } = conEstrellas(n), b = 1 + bonoEstrellas(n);
    for (const k of ['hp', 'dmg', 'spd']) assert.equal(r(est[k]), r(base[k] * b), `${n} estrellas: ${k}`);
    for (const k of ['critRate', 'critDmg', 'acc', 'res', 'armor', 'block', 'dot', 'pen']) assert.equal(est[k], base[k], `${n} estrellas no deben tocar ${k}`);
  }
});
