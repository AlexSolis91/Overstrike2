// Jefe de Raid: Resistencia por dificultad, furia por ronda, cofres.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, rivalDe, EQUIPO } from './util.mjs';
import { JEFES_RAID, DIFICULTADES_RAID, opcionesRaid, furiaAcumulada, COFRES_RAID, nombreCofre } from '../js/datos/jefes/raid.js';

test('Resistencia de Lich King: 50 / 75 / 100 / 125 / 150% de Fácil a Pesadilla', () => {
  const esperada = { facil: .5, normal: .75, dificil: 1, brutal: 1.25, pesadilla: 1.5 };
  for (const dif of Object.keys(DIFICULTADES_RAID)) {
    const c = combate(EQUIPO, [JEFES_RAID['lich-king']], { rival: opcionesRaid(dif, 5e8, 5e8) });
    assert.equal(Math.round(c.stats(rivalDe(c)).res * 100) / 100, esperada[dif], dif);
  }
});

test('Furia del jefe: +25% en la ronda 5, +75% en la 10, +625% en la 30 y +100% por ronda después', () => {
  const r = n => Math.round(furiaAcumulada(n) * 100);
  assert.equal(r(5), 25);
  assert.equal(r(10), 75);
  assert.equal(r(15), 150);
  assert.equal(r(20), 250);
  assert.equal(r(25), 375);
  assert.equal(r(30), 625);
  assert.equal(r(31), 725);
});

test('Lich King es inmune al Control y a la Congelación', () => {
  const inm = JEFES_RAID['lich-king'].pasiva.inmuneA;
  assert.ok(inm.includes('Control') && inm.includes('freeze'));
});

test('Cofres: 4 con nombre, en orden', () => {
  assert.deepEqual(COFRES_RAID.map(c => c.nombre), ['Cofre de Madera', 'Cofre de Plata', 'Cofre de Oro', 'Cofre Arcano']);
  assert.equal(nombreCofre(1), 'Cofre de Madera');
});
