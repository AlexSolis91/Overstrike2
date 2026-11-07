// Sobres de campeones: los temáticos dan solo campeones de su tema; Unbreakable Force, de todos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SOBRES, abrirSobre, campeonesDelSobre } from '../js/datos/sobres.js';
import { OFICIALES } from '../js/datos/personajes/index.js';

test('Cada sobre temático da 3 campeones distintos y solo de su tema', () => {
  for (const id of Object.keys(SOBRES).filter(k => SOBRES[k].tipo !== 'reliquias' && k !== 'unbreakable')) {
    assert.ok(campeonesDelSobre(id).length >= 3, `${id} necesita al menos 3 campeones`);
    for (let i = 0; i < 200; i++) {
      const r = abrirSobre(id);
      assert.equal(new Set(r).size, 3);
      for (const p of r) assert.ok((p.sobres || []).includes(id), `${p.nombre} salió en ${id}`);
    }
  }
});

test('Unbreakable Force incluye a todos los campeones', () => {
  assert.equal(campeonesDelSobre('unbreakable').length, OFICIALES.length);
});
