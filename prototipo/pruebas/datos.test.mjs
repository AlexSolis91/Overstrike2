// Integridad de los datos: fichas completas, efectos que existen, imágenes que existen, sin ventanas del navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { OFICIALES } from '../js/datos/personajes/index.js';
import { EFECTOS } from '../js/motor/efectos.js';
import { COFRES_RAID } from '../js/datos/jefes/raid.js';
import { NOVEDADES } from '../js/datos/novedades.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

test('Campeones: ids únicos y fichas completas', () => {
  const ids = OFICIALES.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  for (const p of OFICIALES) {
    assert.ok(p.nombre && p.rol, `${p.id}: falta nombre o rol`);
    assert.notEqual(p.rol, p.rolSecundario, `${p.id}: rol y rol secundario iguales`);
    for (const k of ['hp', 'dmg', 'spd']) assert.ok(p.base?.[k] > 0, `${p.id}: base.${k}`);
    const cats = (p.movimientos || []).map(m => m.categoria);
    for (const c of ['basico', 'especial', 'over']) assert.ok(cats.includes(c), `${p.id}: falta movimiento ${c}`);
  }
});

// Busca en toda la ficha las acciones { tipo: 'efecto', id } y los inmuneA
function efectosUsados(obj, out = new Set()) {
  if (Array.isArray(obj)) obj.forEach(x => efectosUsados(x, out));
  else if (obj && typeof obj === 'object') {
    if (obj.tipo === 'efecto' && typeof obj.id === 'string') out.add(obj.id);
    for (const v of Object.values(obj)) efectosUsados(v, out);
  }
  return out;
}

test('Campeones: todos los efectos que aplican existen en el motor', () => {
  for (const p of OFICIALES) for (const id of efectosUsados(p)) assert.ok(EFECTOS[id], `${p.id}: efecto desconocido "${id}"`);
});

test('Imágenes: campeones y cofres apuntan a archivos que existen', () => {
  for (const p of OFICIALES) if (p.imagen) assert.ok(existsSync(join(RAIZ, p.imagen.split('?')[0])), `${p.id}: falta ${p.imagen}`);
  for (const c of COFRES_RAID) if (c.imagen) assert.ok(existsSync(join(RAIZ, c.imagen)), `falta ${c.imagen}`);
});

test('Novedades: la más reciente primero, ids únicos y tipos válidos', () => {
  const ids = NOVEDADES.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort().reverse(), ids, 'deben ir de la más reciente a la más vieja');
  for (const n of NOVEDADES) for (const c of n.cambios) assert.ok(['nuevo', 'cambio', 'mejora'].includes(c.tipo), `${n.id}: tipo "${c.tipo}"`);
});

test('Interfaz: nunca confirm()/alert()/prompt() del navegador (usar js/ui/dialogo.js)', () => {
  const malos = [];
  const recorrer = dir => {
    for (const f of readdirSync(dir)) {
      const ruta = join(dir, f);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (f.endsWith('.js') && f !== 'dialogo.js') {
        readFileSync(ruta, 'utf8').split('\n').forEach((l, i) => { if (/(^|[^\w.$])(confirm|alert|prompt)\(/.test(l) && !/^\s*\/\//.test(l)) malos.push(`${ruta.slice(RAIZ.length)}:${i + 1}`); });
      }
    }
  };
  recorrer(join(RAIZ, 'js'));
  assert.deepEqual(malos, []);
});

test('Motor: ninguna mezcla con sort(() => rng() - .5) (depende del motor de JavaScript y rompe la verificación del servidor)', () => {
  const malos = [];
  for (const f of readdirSync(join(RAIZ, 'js', 'motor'))) {
    readFileSync(join(RAIZ, 'js', 'motor', f), 'utf8').split('\n').forEach((l, i) => { if (/\.sort\(\s*\(\)\s*=>/.test(l) && !/^\s*\/\//.test(l)) malos.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(malos, [], 'usar rng.barajar(lista)');
});
