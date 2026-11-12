// Tutorial: la batalla guiada contra los orcos perdidos se gana siempre, y los textos y el SQL del regalo coinciden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearCombate, elegirIA, azar } from './util.mjs';
import { OFICIALES } from '../js/datos/personajes/index.js';
import { RIVALES_TUTORIAL, SEMILLA_TUTORIAL, PREMIO_TUTORIAL, MINI, BIENVENIDA, MENU, BATALLA_TURNO, DESPEDIDA, COMPRA_TIENDA } from '../js/datos/tutorial.js';
import { PRIMEROS_PASOS } from '../js/datos/primerosPasos.js';

test('La batalla del tutorial se gana con cualquier equipo de 5 (IA, semilla fija)', () => {
  const lista = OFICIALES.filter(p => !p.id.startsWith('de-prueba'));
  for (let g = 0; g < 60; g++) {
    const rnd = azar(g + 1), eq = [];
    while (eq.length < 5) { const p = lista[Math.floor(rnd() * lista.length)]; if (!eq.includes(p)) eq.push(p); }
    const c = crearCombate({ equipoJugador: eq, equipoRival: RIVALES_TUTORIAL, semilla: SEMILLA_TUTORIAL });
    let r = c.iniciar(), q = 0;
    while (!r.fin && q++ < 2000) r = c.actuar(elegirIA(c, rnd));
    assert.equal(r.fin?.ganador, 'jugador', `equipo ${eq.map(p => p.id).join(', ')}`);
  }
});

test('El regalo del tutorial del cliente es el mismo que entrega el SQL', () => {
  const sql = readFileSync(new URL('../../docs/sql/038_tutorial.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes(`oro = oro + ${PREMIO_TUTORIAL.oro},`));
  assert.ok(sql.includes(`runas_portal = runas_portal + ${PREMIO_TUTORIAL.runasPortal} `));
});

test('Todos los pasos tienen texto', () => {
  for (const p of [...BIENVENIDA, ...MENU, ...Object.values(MINI).flat()]) assert.ok(typeof p.texto === 'string' && p.texto.length > 10);
});

test('Primeros pasos: los premios y las claves del cliente son los mismos que en el SQL', () => {
  const sql = readFileSync(new URL('../../docs/sql/040_tutorial_vale_primeros_pasos.sql', import.meta.url), 'utf8');
  for (const p of PRIMEROS_PASOS) {
    assert.ok(sql.includes(`when '${p.clave}' then '${JSON.stringify(p.premio)}'::jsonb`), `premio de ${p.clave}`);
    assert.ok(sql.includes(`when '${p.clave}' then exists`) || p.clave === 'todos', `revisión de ${p.clave}`);
  }
  const orden = sql.match(/unnest\(array\[([^\]]+)\]\)/)[1].match(/'([a-z0-9]+)'/g).map(x => x.slice(1, -1));
  assert.deepEqual(orden, PRIMEROS_PASOS.map(p => p.clave));
});

test('Los pasos que piden tocar un botón tienen foco (y los que abren algo, qué esperar)', () => {
  for (const p of [...BATALLA_TURNO, ...COMPRA_TIENDA, ...DESPEDIDA, ...Object.values(MINI).flat()]) {
    if (p.clic) assert.ok(p.foco, p.texto);
    if (p.esperar) assert.ok(p.clic, p.texto);
  }
});
