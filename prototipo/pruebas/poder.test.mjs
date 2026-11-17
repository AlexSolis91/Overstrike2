// Poder de equipo (Arena): estadísticas finales con estrellas y reliquias, sin líder ni orden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { poderEquipo, poderDeStats, PESOS_PODER } from '../js/motor/poder.js';
import { RELIQUIAS, sortear } from '../js/datos/reliquias.js';
import { BASE_COMUN } from '../js/motor/reglas.js';
import { azar } from './util.mjs';

const EQ = ['goku', 'garou', 'kratos', 'batman', 'loki'];
const vacio = { col: [], reliquias: [] };

test('Fórmula: HP×0.5 + Daño×4 + Vel×2 + 400 por cada punto de secundaria sobre la base', () => {
  assert.equal(poderDeStats({ hp: 700, dmg: 75, spd: 118, ...BASE_COMUN }), 700 * .5 + 75 * 4 + 118 * 2);
  assert.equal(Math.round(poderDeStats({ hp: 0, dmg: 0, spd: 0, ...BASE_COMUN, critRate: BASE_COMUN.critRate + .10 })), Math.round(.10 * PESOS_PODER.secundaria));
});

test('Suma de los 5 campeones; no depende del orden (líder)', () => {
  const p = poderEquipo(EQ, vacio);
  assert.ok(p > 0);
  assert.equal(poderEquipo([...EQ].reverse(), vacio), p);
  assert.equal(EQ.reduce((t, id) => t + poderEquipo([id], vacio), 0) - p <= 5, true);   // redondeo por campeón
});

test('Sube con estrellas y con reliquias equipadas', () => {
  const base = poderEquipo(EQ, vacio);
  const estrellas = poderEquipo(EQ, { col: [{ campeon: 'goku', estrellas: 6 }], reliquias: [] });
  assert.ok(estrellas > base, `${estrellas} > ${base}`);
  const id = Object.keys(RELIQUIAS).find(k => RELIQUIAS[k].category === 'Arma' && RELIQUIAS[k].rarity !== 'Legendario');
  const fila = { id: 'r1', ...sortear(id, azar(4)), campeon: 'goku', espacio: 'arma1' };
  const conRel = poderEquipo(EQ, { col: [{ campeon: 'goku', estrellas: 0 }], reliquias: [fila] });
  assert.ok(conRel > base, `${conRel} > ${base}`);
});

test('Sin datos de cuenta (Defensa de práctica): usa el equipo de la ficha', () => {
  assert.ok(poderEquipo(EQ, null) > 0);
  assert.equal(poderEquipo([], null), 0);
});
