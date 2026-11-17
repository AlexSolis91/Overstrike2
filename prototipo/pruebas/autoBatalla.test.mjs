// Auto-batalla de Arena (servidor): IA en los dos lados, y el resultado pasa la misma verificación que una batalla normal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { jugarCombateIA } from '../js/motor/autoBatalla.js';
import { repetirCombate } from '../js/motor/verificar.js';
import { RELIQUIAS, sortear } from '../js/datos/reliquias.js';
import { azar } from './util.mjs';

const fila = (semilla, conCuenta = true) => {
  const id = Object.keys(RELIQUIAS).find(k => RELIQUIAS[k].category === 'Arma' && RELIQUIAS[k].rarity === 'Épico');
  return {
    ataque: ['goku', 'garou', 'kratos', 'batman', 'loki'], defensa: ['milo', 'alexstrasza', 'he-man', 'sasori', 'madara-uchiha'], semilla,
    equipo_atk: { col: [{ campeon: 'goku', estrellas: 6, espacios_abiertos: [] }], reliquias: [{ id: 'r1', ...sortear(id, azar(semilla)), campeon: 'goku', espacio: 'arma1' }] },
    equipo_def: conCuenta ? { col: [{ campeon: 'milo', estrellas: 3 }], reliquias: [] } : null,
  };
};

test('Juega hasta el final y el resultado se verifica con repetirCombate (con y sin datos de la Defensa)', () => {
  for (const [semilla, cuenta] of [[11, true], [12, true], [13, false]]) {
    const c = fila(semilla, cuenta);
    const r = jugarCombateIA(c);
    assert.ok(r && r.decisiones.length > 5);
    const v = repetirCombate({ ...c, decisiones: r.decisiones, gano: r.gano });
    assert.ok(v.ok, `semilla ${semilla}: ${v.motivo}`);
  }
});

test('Misma fila → misma batalla (determinista)', () => {
  const a = jugarCombateIA(fila(21)), b = jugarCombateIA(fila(21));
  assert.deepEqual(a, b);
});

test('Campeón desconocido → null (se cancela el combate)', () => {
  assert.equal(jugarCombateIA({ ...fila(3), ataque: ['goku', 'no-existe', 'kratos', 'batman', 'loki'] }), null);
});
