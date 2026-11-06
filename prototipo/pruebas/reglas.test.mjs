// Reglas clave del motor: Veneno escalonado, Congelación e inmunidades, Wukong, Puntería y repetición exacta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, rivalDe, estado, jugar, porId, EQUIPO } from './util.mjs';
import { DOT, probAplicar } from '../js/motor/reglas.js';
import { JEFES_RAID } from '../js/datos/jefes/raid.js';

const pctDeVista = (c, p, id) => parseFloat(c.vista(p).estados.find(e => e.id === id).texto);

test('Veneno: no se suma; el más alto ×1.5 por cada acumulación extra', () => {
  const c = combate(EQUIPO, ['goku']), t = rivalDe(c);
  assert.equal(DOT.multVeneno, 1.5);
  t.estados.push({ id: 'poison', valor: .02, dur: 3 });
  assert.equal(pctDeVista(c, t, 'poison'), 2);                       // 1 Veneno: 2%
  t.estados.push({ id: 'poison', valor: .02, dur: 3 });
  assert.equal(pctDeVista(c, t, 'poison'), 3);                       // 2: 2% × 1.5
  t.estados.push({ id: 'poison', valor: .04, dur: 3 });
  assert.equal(pctDeVista(c, t, 'poison'), 9);                       // 3: el más alto (4%) × 2.25
});

test('Veneno: tope de 10 acumulaciones, 12 si Orochimaru está en el equipo que lo aplica', () => {
  const c = combate(EQUIPO, ['goku']), t = rivalDe(c);
  for (let i = 0; i < 14; i++) c.probar(t.uid, 'poison');
  assert.equal(t.estados.filter(e => e.id === 'poison').length, 10);

  const c2 = combate(['orochimaru', 'shaka', 'thor', 'kratos', 'batman'], ['goku']), t2 = rivalDe(c2);
  for (let i = 0; i < 16; i++) c2.probar(t2.uid, 'poison');
  assert.equal(t2.estados.filter(e => e.id === 'poison').length, 12);
});

test('Congelación: normal crea hielo y baja 25% / 50% (Mega) la Velocidad', () => {
  const c = combate(EQUIPO, ['goku']), t = rivalDe(c), v0 = c.stats(t).spd;
  c.probar(t.uid, 'freeze');
  assert.ok(estado(t, 'freeze').capas > 0);
  assert.equal(c.stats(t).spd, v0 * .75);
  c.probar(t.uid, 'freeze');
  assert.ok(estado(t, 'freeze').mega);
  assert.equal(c.stats(t).spd, v0 * .5);
});

test('Congelación: a un inmune al Control le entra sin hielo (no pierde el turno, sí baja Velocidad)', () => {
  const goku = porId('goku'), soloControl = { ...goku, pasiva: { ...goku.pasiva, inmuneA: ['Control'] } };
  const c = combate(EQUIPO, [soloControl]), t = rivalDe(c), v0 = c.stats(t).spd;
  c.probar(t.uid, 'freeze');
  assert.equal(estado(t, 'freeze').capas, 0);
  assert.ok(estado(t, 'freeze').sinHielo);
  assert.equal(c.stats(t).spd, v0 * .75);
  c.probar(t.uid, 'freeze');
  assert.ok(estado(t, 'freeze').mega);
  assert.equal(estado(t, 'freeze').capas, 0);
});

test('Congelación: la protección contra el bloqueo infinito la deja entrar sin hielo; el Aturdimiento no', () => {
  const c = combate(EQUIPO, ['goku']), t = rivalDe(c);
  t.inmune = true; t.recienLiberado = true;
  c.probar(t.uid, 'stun');
  assert.equal(estado(t, 'stun'), undefined);
  c.probar(t.uid, 'freeze');
  assert.equal(estado(t, 'freeze').capas, 0);
});

test('Congelación: la inmunidad específica (Aokiji, Lich King jefe de Raid) y la de todos los debuffs la bloquean', () => {
  const goku = porId('goku');
  for (const def of [porId('aokiji'), JEFES_RAID['lich-king'], { ...goku, pasiva: { ...goku.pasiva, inmuneA: ['debuff'] } }]) {
    const c = combate(EQUIPO, [def]), t = rivalDe(c);
    c.probar(t.uid, 'freeze');
    assert.equal(estado(t, 'freeze'), undefined, def.id);
  }
});

test('Wukong: revive al final de la ronda siguiente, con todo su HP, sin límite de veces', () => {
  const c = combate(['wukong', 'shaka', 'aldebaran', 'yoda', 'doctor-doom'], ['goku', 'naruto', 'thor', 'kratos', 'batman'], { semilla: 5 });
  const w = c.personajes.find(p => p.id === 'wukong');
  const revivio = [];
  let rondaMuerte = 0, muertes = 0;
  jugar(c, (c2, r) => {
    for (const e of r.eventos || []) if (e.t === 'revivir' && e.a === w.uid) {
      revivio.push(c2.ronda);
      assert.equal(c2.ronda, rondaMuerte + 2, 'revive al cerrar la ronda siguiente a su muerte');
      assert.equal(Math.round(w.hp), Math.round(c2.stats(w).hp));
    }
    if (!w.muerto && muertes < 3 && c2.ronda > rondaMuerte + 1 && c2.esperando) {
      w.hp = 1; c2.probar(w.uid, 'crit');
      if (w.muerto) { muertes++; rondaMuerte = c2.ronda; }
    }
    return revivio.length >= 2;
  }, 1);
  assert.ok(revivio.length >= 2, `revivió ${revivio.length} veces`);
});

test('Puntería contra Resistencia: 100% si la iguala, −1% por punto de diferencia, mínimo 10%', () => {
  assert.equal(probAplicar(1.5, 1.5), 1);
  assert.equal(probAplicar(1, 1.5), .5);
  assert.equal(probAplicar(.5, 1.5), .1);
});

test('Repetición exacta: misma semilla y mismas decisiones = mismo resultado (base de la verificación del Raid)', () => {
  const partida = () => {
    const c = combate(EQUIPO, ['goku', 'loki', 'orochimaru', 'aokiji', 'wukong'], { semilla: 11 });
    const r = jugar(c, () => false, 7);
    return JSON.stringify({ fin: r.fin, est: c.estadisticas() });
  };
  assert.equal(partida(), partida());
});
