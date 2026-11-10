// Obi-Wan Kenobi: cargas Soresu (+Armadura/+Bloqueo), Especial (Escudo + HP máx. por carga), Over (consume cargas y su bono,
// Mega Aturdimiento por cada 5) y líder General Kenobi (al bloquear baja cooldowns del equipo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, elegirIA, porId, azar, combate, estado } from './util.mjs';

const OBI = ['obi-wan-kenobi', 'shaka', 'satoru-gojo', 'kratos', 'batman'];
const RIVAL = ['anakin-skywalker', 'loki', 'goku', 'meliodas', 'wukong'];

function partidas(n, alEvento, antes) {
  let terminadas = 0;
  for (let g = 0; g < n; g++) {
    const rnd = azar(g + 3);
    const c = crearCombate({ equipoJugador: OBI.map(porId), equipoRival: RIVAL.map(porId), semilla: g + 11, lideres: true });
    let r = c.iniciar(), q = 0;
    const obi = c.personajes.find(p => p.id === 'obi-wan-kenobi');
    while (!r.fin && q++ < 4000) {
      antes?.(c, obi);
      r = c.actuar(elegirIA(c, rnd));
      for (const e of r.eventos || []) alEvento?.(e, c, obi);
    }
    if (r.fin) terminadas++;
  }
  return terminadas;
}

test('Obi-Wan empieza con Contraataque y Provocación permanentes, 15% de Bloqueo y +15% de Armadura', () => {
  const c = combate(OBI, RIVAL);
  const obi = c.personajes.find(p => p.id === 'obi-wan-kenobi');
  assert.ok(estado(obi, 'counter') && estado(obi, 'taunt'));
  const cargas = estado(obi, 'soresu')?.valor || 0;   // puede haber recibido golpes antes de su primer turno
  assert.ok(c.stats(obi).block - cargas * .01 >= .15 - 1e-9,   // + lo que den sus reliquias de prueba
     `bloqueo ${c.stats(obi).block} con ${cargas} cargas`);
});

test('Soresu: gana cargas al recibir golpes (máx. 10) con su bono; el Over las consume con su bono y aturde', () => {
  let maxCargas = 0, overConCargas = 0, megas = 0, bonoOk = true;
  const n = 30, ok = partidas(n, (e, c, obi) => {
    const s = estado(obi, 'soresu')?.valor || 0;
    maxCargas = Math.max(maxCargas, s);
    if (!obi.muerto && Math.abs((obi.permanente.block || 0) - s * .01) > 1e-9) bonoOk = false;
    if (e.t === 'movimiento' && e.id === obi.uid && e.categoria === 'over') overConCargas++;
    if (e.t === 'efecto' && e.texto === 'Mega Aturdimiento') megas++;
  });
  assert.equal(ok, n, 'todas las partidas terminan');
  assert.ok(maxCargas === 10, `máximo de cargas ${maxCargas}`);
  assert.ok(bonoOk, 'el bono de Bloqueo siempre corresponde a las cargas actuales');
  assert.ok(overConCargas > 0 && megas > 0, `overs ${overConCargas}, megas ${megas}`);
});

test('Especial: +2% de HP máx. por carga a los aliados (permanente, sin gastar cargas); líder: al bloquear baja cooldowns', () => {
  let s0 = 0, h0 = 0, especiales = 0, bloqueos = 0, bajas = 0, errores = [];
  partidas(40, (e, c, obi) => {
    const shaka = c.personajes.find(p => p.id === 'shaka');
    if (e.t === 'movimiento' && e.id === obi.uid && e.categoria === 'especial') especiales++;
    if (e.t === 'bloqueo' && e.a === obi.uid) bloqueos++;
    if (e.t === 'extension' && e.texto === '⏳ −2 cooldown') bajas++;
    if (e.t === 'movimiento' && e.id === obi.uid && e.categoria === 'especial') c.__esp = { s0, h0, shaka };
  }, (c, obi) => {
    if (c.__esp) {
      const { s0: s, h0: h, shaka } = c.__esp; c.__esp = null;
      if (!shaka.muerto && s > 0 && Math.abs((shaka.permanente.hpPct || 0) - h - .02 * s) > 1e-9) errores.push(`${s} cargas: ${h} → ${shaka.permanente.hpPct}`);
      if ((obi.estados.find(x => x.id === 'soresu')?.valor || 0) < s) errores.push('gastó cargas');
    }
    s0 = obi.estados.find(x => x.id === 'soresu')?.valor || 0;
    h0 = c.personajes.find(p => p.id === 'shaka').permanente.hpPct || 0;
  });
  assert.ok(especiales > 0 && bloqueos > 0 && bajas > 0, `especiales ${especiales}, bloqueos ${bloqueos}, bajas ${bajas}`);
  assert.deepEqual(errores.slice(0, 3), []);
});
