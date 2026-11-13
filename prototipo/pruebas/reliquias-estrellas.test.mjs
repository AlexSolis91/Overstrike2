// Estrellas para equipar reliquias: Común 1★ … Legendaria 5★, iguales en el cliente y en el SQL 041.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RAREZAS, motivoNoEquipar } from '../js/datos/reliquias.js';

test('Cada rareza pide una estrella más (Común 1★ … Legendaria 5★)', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(RAREZAS).map(([k, v]) => [k, v.estrellas])),
    { 'Común': 1, 'Raro': 2, 'Especial': 3, 'Épico': 4, 'Legendario': 5 });
});

test('El SQL 041 usa la misma tabla que el cliente', () => {
  const sql = readFileSync(new URL('../../docs/sql/041_reliquias_estrellas.sql', import.meta.url), 'utf8');
  for (const [k, v] of Object.entries(RAREZAS)) if (k !== 'Legendario') assert.ok(sql.includes(`when '${k}' then ${v.estrellas}`), k);
  assert.ok(sql.includes(`else ${RAREZAS.Legendario.estrellas} end`));
});

test('Con 0★ no puede equipar ni una Común; con 2★ una Rara sí y una Especial no', () => {
  const rel = rarity => ({ uid: 'x', rarity, type: 'Espada', category: 'Arma' });
  assert.ok(motivoNoEquipar(rel('Común'), 'arma1', { estrellas: 0 }));
  assert.equal(motivoNoEquipar(rel('Común'), 'arma1', { estrellas: 1 }), null);
  assert.equal(motivoNoEquipar(rel('Raro'), 'arma1', { estrellas: 2 }), null);
  assert.match(motivoNoEquipar(rel('Especial'), 'arma1', { estrellas: 2 }), /3★/);
});
