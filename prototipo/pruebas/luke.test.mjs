// Luke Skywalker: formas al inicio de su turno (elegida o automática), Bloqueo ×2 con tope, Esquivar, Mega Provocación,
// inmunidad con Provocación + Mega Provocación y líder Una Nueva Esperanza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, elegirIA, porId, azar, combate, estado, jugar } from './util.mjs';

const LUKE = ['luke-skywalker', 'shaka', 'satoru-gojo', 'kratos', 'batman'];
const RIVAL = ['anakin-skywalker', 'loki', 'goku', 'meliodas', 'wukong'];
const luke = c => c.personajes.find(p => p.id === 'luke-skywalker');

test('Bloqueo ×2 sin pasar del 50%', () => {
  const c = combate(LUKE, RIVAL);
  const l = luke(c);
  assert.ok(c.stats(l).block >= .30 - 1e-9 && c.stats(l).block <= .50 + 1e-9, `bloqueo ${c.stats(l).block}`);
  l.permanente.block = .40;
  assert.equal(c.stats(l).block, .50);
});

test('Al inicio de su turno pide forma; la elegida aplica sus buffs hasta el final de la ronda', () => {
  const c = combate(LUKE, RIVAL, { semilla: 5 });
  jugar(c, cc => cc.esperando?.id === luke(cc).uid);
  assert.deepEqual(c.esperando.formas, ['djemSo', 'soresu', 'ataru']);
  const l = luke(c);
  const r = c.actuar({ categoria: 'basico', objetivo: l.uid, forma: 'ataru' });
  assert.ok(r.eventos.some(e => e.t === 'bonoVisible' && e.texto === '🌀 Ataru'));
  assert.ok(!l.estados.some(e => e.id === 'bloodlust'));
});

test('Sin elegir (IA): forma automática; Esquivar, Mega Provocación, inmunidad y líder se activan; las partidas terminan', () => {
  const vistos = {};
  for (let g = 0; g < 25; g++) {
    const rnd = azar(g + 3);
    const c = crearCombate({ equipoJugador: LUKE.map(porId), equipoRival: RIVAL.map(porId), semilla: g + 11 });
    let r = c.iniciar(), q = 0;
    while (!r.fin && q++ < 4000) {
      r = c.actuar(elegirIA(c, rnd));
      for (const e of r.eventos || []) {
        if (e.t === 'bonoVisible' && /Djem So|Soresu|Ataru/.test(e.texto)) vistos.forma = (vistos.forma || 0) + 1;
        if (e.t === 'esquiva' && e.golpe) vistos.esquiva = (vistos.esquiva || 0) + 1;
        if (e.t === 'inmune' && e.a === luke(c).uid) vistos.inmune = (vistos.inmune || 0) + 1;
        if (e.t === 'bonoVisible' && e.texto === '+5% HP máx.') vistos.lider = (vistos.lider || 0) + 1;
      }
    }
    assert.ok(r.fin, `partida ${g} termina`);
  }
  for (const k of ['forma', 'esquiva', 'inmune', 'lider']) assert.ok(vistos[k] > 0, `${k}: ${JSON.stringify(vistos)}`);
});

test('Mega Provocación: los ataques de área enemigos solo alcanzan a Luke', () => {
  let probados = 0;
  for (let g = 0; g < 40; g++) {
    const rnd = azar(g + 3);
    const c = crearCombate({ equipoJugador: LUKE.map(porId), equipoRival: RIVAL.map(porId), semilla: g + 11 });
    let r = c.iniciar(), q = 0;
    const l = luke(c);
    while (!r.fin && q++ < 4000) {
      const actor = c.personajes.find(p => p.uid === c.esperando.id);
      const conMega = !l.muerto && l.estados.some(e => e.id === 'megaTaunt') && actor.lado === 'rival';
      r = c.actuar(elegirIA(c, rnd));
      if (!conMega) continue;
      const m = (r.eventos || []).find(e => e.t === 'movimiento' && e.id === actor.uid);
      const def = m && actor.movimientos.find(x => x.categoria === m.categoria);
      if (def?.objetivo === 'todosEnemigos') { assert.deepEqual(m.objetivos, [l.uid], `${actor.nombre}: ${def.nombre}`); probados++; }
    }
  }
  assert.ok(probados > 0, 'algún ataque de área contra Mega Provocación');
});
