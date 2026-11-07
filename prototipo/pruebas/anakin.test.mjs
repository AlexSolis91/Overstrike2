// Piezas de Anakin / Lord Vader: Contraataque, Asistir, respuesta fuera de turno (sin ciclos), marcas Héroe Caído y transformación.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, elegirIA, porId, azar } from './util.mjs';

function partidas(n, eqJ, eqR, alEvento) {
  let terminadas = 0;
  for (let g = 0; g < n; g++) {
    const rnd = azar(g + 3);
    const c = crearCombate({ equipoJugador: eqJ.map(porId), equipoRival: eqR.map(porId), semilla: g + 11 });
    let r = c.iniciar(), q = 0;
    while (!r.fin && q++ < 4000) { r = c.actuar(elegirIA(c, rnd)); for (const e of r.eventos || []) alEvento?.(e, c); }
    if (r.fin) terminadas++;
  }
  return terminadas;
}

test('Contraataque, Asistir y la respuesta fuera de turno se activan y nunca hacen un ciclo infinito', () => {
  const vistos = {};
  const n = 25, ok = partidas(n, ['anakin-skywalker', 'shaka', 'satoru-gojo', 'kratos', 'batman'], ['anakin-skywalker', 'loki', 'goku', 'meliodas', 'wukong'],
    e => { if (e.t === 'bonoVisible' && /Contraataque|Asistir|responde/.test(e.texto)) vistos[e.texto] = (vistos[e.texto] || 0) + 1; });
  assert.equal(ok, n, 'todas las partidas terminan');
  assert.ok(vistos['⚔️ Contraataque'] > 0 && vistos['🤝 Asistir'] > 0 && vistos['⚡ ¡El Elegido responde!'] > 0, JSON.stringify(vistos));
});

test('Al transformarse en Lord Vader conserva las marcas y su bono, y pierde Contraataque y Asistir', () => {
  let probado = false;
  partidas(80, ['anakin-skywalker', 'shaka', 'satoru-gojo', 'kratos', 'batman'], ['loki', 'goku', 'meliodas', 'wukong', 'naruto'], (e, c) => {
    if (probado || e.t !== 'transformacion') return;
    const v = c.personajes.find(p => p.uid === e.id && p.id === 'anakin-skywalker');
    if (!v) return;
    probado = true;
    const marcas = v.estados.find(x => x.id === 'heroeCaido')?.valor || 0;
    assert.ok(marcas >= 30, `conserva ${marcas} marcas`);
    assert.ok((v.permanente.pen || 0) >= marcas * .01 - 1e-9, 'conserva el bono de sus marcas');
    assert.ok(!v.estados.some(x => x.id === 'counter' || x.id === 'assist'), 'ya no tiene Contraataque ni Asistir');
  });
  assert.ok(probado, 'alguna partida llegó a la transformación');
});
