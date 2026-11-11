// Tutorial: la batalla guiada contra los orcos perdidos se gana siempre, y los textos y el SQL del regalo coinciden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearCombate, elegirIA, azar } from './util.mjs';
import { OFICIALES } from '../js/datos/personajes/index.js';
import { RIVALES_TUTORIAL, SEMILLA_TUTORIAL, PREMIO_TUTORIAL, MINI, BIENVENIDA, MENU } from '../js/datos/tutorial.js';

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
