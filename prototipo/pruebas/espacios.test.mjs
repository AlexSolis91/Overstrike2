// Espacios extra de reliquias: desde 2026-11-10 solo se abren con oro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('desbloquear_espacio vigente (el SQL más nuevo que la define) solo acepta oro', () => {
  const dir = new URL('../../docs/sql/', import.meta.url);
  const ultimo = readdirSync(dir).filter(f => /^\d+_.*\.sql$/.test(f)).sort()
    .filter(f => /function public\.desbloquear_espacio\(/.test(readFileSync(new URL(f, dir), 'utf8'))).pop();
  const sql = readFileSync(new URL(ultimo, dir), 'utf8');
  assert.match(sql, /p_con is distinct from 'oro'/, ultimo);
  assert.doesNotMatch(sql, /set copias = copias -/, ultimo);
});

test('la Colección ya no ofrece abrir espacios con copias', () => {
  const ui = readFileSync(new URL('../js/ui/coleccion.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /data-espacio="copias"/);
  assert.doesNotMatch(ui, /COSTO_ESPACIO\.copias/);
});
