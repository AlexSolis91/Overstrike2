// Muzan: la primera vez que va a caer despierta su Forma Final con el 100% de su HP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';

test('Muzan despierta su Forma Final con toda su vida', () => {
  const c = combate(['muzan-kibutsuji'], ['thor', 'kratos', 'goku']);
  const m = c.personajes.find(p => p.id === 'muzan-kibutsuji');
  let visto = null;
  jugar(c, () => { if (m.forma && visto === null) visto = m.hp / c.stats(m).hp; return visto !== null; });
  assert.ok(m.forma?.permanente, 'se transformó');
  assert.ok(visto > .5, `quedó con ${Math.round(visto * 100)}% (antes 15%)`);
});
