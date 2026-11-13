// Horda: los jefes y mini jefes tienen un HP de referencia para el daño por % de HP (Bombas, DoT...). Los orcos normales no.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate } from './util.mjs';
import { oleada, defsOleada, refJefe } from '../js/datos/horda/horda.js';

test('Referencia del jefe: HP de ficha × oleada/20 (mínimo su ficha); los orcos normales no tienen', () => {
  assert.equal(refJefe(5), 1); assert.equal(refJefe(20), 1); assert.equal(refJefe(40), 2); assert.equal(refJefe(60), 3);
  assert.equal(oleada(7).opciones.hpRefJefe, undefined);
  const o = oleada(40);
  assert.equal(o.opciones.hpRefJefe, 2);
  const c = combate(['naruto'], defsOleada(o), { rival: o.opciones });
  const jefe = c.personajes.find(p => p.uid === 'rival-0');
  assert.equal(jefe.id, 'kargalgan');
  assert.equal(jefe.hpRef, 4000);
  assert.ok(c.stats(jefe).hp > 7000);                      // su vida real sigue siendo mucho mayor
  for (const p of c.personajes.filter(p => p.lado === 'rival' && p !== jefe)) assert.equal(p.hpRef, undefined);
});

test('Sin la opción (Arena, Campaña, Raid) nadie tiene HP de referencia', () => {
  const c = combate(['naruto'], ['thor']);
  for (const p of c.personajes) assert.equal(p.hpRef, undefined);
});
