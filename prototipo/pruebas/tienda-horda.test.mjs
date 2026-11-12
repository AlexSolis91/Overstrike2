// Tienda de la Horda: desde 2026-11-11 Rara 100 · Especial 400 · Épica 1,500 y sin Comunes; el cliente y el SQL coinciden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('_precio_trofeos vigente: sin Comunes y precios iguales a los del cliente', () => {
  const dir = new URL('../../docs/sql/', import.meta.url);
  const ultimo = readdirSync(dir).filter(f => /^\d+_.*\.sql$/.test(f)).sort()
    .filter(f => /function public\._precio_trofeos\(/.test(readFileSync(new URL(f, dir), 'utf8'))).pop();
  const sql = readFileSync(new URL(ultimo, dir), 'utf8').split('function public._precio_trofeos(')[1].split('$$;')[0];
  const ui = readFileSync(new URL('../js/ui/horda.js', import.meta.url), 'utf8');
  const cliente = Object.fromEntries([...ui.match(/PRECIO_TROFEOS = \{([^}]*)\}/)[1].matchAll(/'([^']+)': (\d+)/g)].map(m => [m[1], +m[2]]));
  const servidor = Object.fromEntries([...sql.matchAll(/when '([^']+)' then (\d+)/g)].map(m => [m[1], +m[2]]));
  assert.deepEqual(cliente, { 'Raro': 100, 'Especial': 400, 'Épico': 1500 });
  assert.deepEqual(servidor, cliente, ultimo);
});
