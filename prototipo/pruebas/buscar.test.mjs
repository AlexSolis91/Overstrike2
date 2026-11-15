// Buscador de campeones por nombre (Colección y selección de equipo)
import test from 'node:test';
import assert from 'node:assert/strict';
import { coincideNombre, normalizar } from '../js/ui/buscar.js';
import { OFICIALES } from '../js/datos/personajes/index.js';

const buscar = t => OFICIALES.filter(p => coincideNombre(p, t)).map(p => p.nombre);

test('sin acentos ni mayúsculas y con parte del nombre', () => {
  assert.equal(normalizar('  Pingüino ÉPICO '), 'pinguino epico');
  assert.ok(buscar('pinguino').includes('El Pingüino'));
  assert.ok(buscar('PADME').some(n => n.startsWith('Padmé')));
  assert.ok(buscar('lich').includes('Lich King'));
});
test('texto vacío muestra a todos', () => {
  assert.equal(buscar('').length, OFICIALES.length);
  assert.equal(buscar('   ').length, OFICIALES.length);
});
test('sin coincidencias', () => assert.equal(buscar('zzzz').length, 0));
