// Obi-Wan Kenobi: buff Soresu con cargas (+Armadura/+Bloqueo, se disipa y se roba entero), Especial (Escudo + HP máx. por carga),
// Over (+15% por carga sin gastarlas y Escudo al equipo igual al daño) y líder General Kenobi (al bloquear baja cooldowns).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, elegirIA, porId, azar, combate, estado } from './util.mjs';
import { EFECTOS } from '../js/motor/efectos.js';

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

test('Obi-Wan empieza con Contraataque y Provocación permanentes y sin Armadura ni Bloqueo base (salen del buff Soresu)', () => {
  const c = combate(OBI, RIVAL);
  const obi = c.personajes.find(p => p.id === 'obi-wan-kenobi');
  assert.ok(estado(obi, 'counter') && estado(obi, 'taunt'));
  const cargas = estado(obi, 'soresu')?.valor || 0;   // puede haber recibido golpes antes de su primer turno
  const s = c.stats(obi, { buffs: true });            // sin reliquias ni estrellas: solo su base + buffs
  assert.ok(Math.abs(s.block - cargas * .02) < 1e-9 && Math.abs(s.armor - cargas * .05) < 1e-9, `bloqueo ${s.block}, armadura ${s.armor}, ${cargas} cargas`);
});

test('Soresu: buff con cargas (máx. 10) que dan +5% Armadura y +2% Bloqueo cada una; el Over no las gasta y escuda al equipo', () => {
  let maxCargas = 0, overs = 0, gasto = 0, escudosOver = 0;
  const n = 30, ok = partidas(n, (e, c, obi) => {
    const s = estado(obi, 'soresu')?.valor || 0;
    maxCargas = Math.max(maxCargas, s);
    if (e.t === 'movimiento' && e.id === obi.uid && e.categoria === 'over') { overs++; c.__antes = s; }
    if (e.t === 'escudo' && e.de === obi.uid && c.__antes != null) escudosOver++;
    if (e.t === 'movimientoFin' && e.id === obi.uid && c.__antes != null) { if (s < c.__antes) gasto++; c.__antes = null; }
  });
  assert.equal(ok, n, 'todas las partidas terminan');
  assert.equal(maxCargas, 10, `máximo de cargas ${maxCargas}`);
  assert.ok(overs > 0 && escudosOver > 0, `overs ${overs}, escudos ${escudosOver}`);
  assert.equal(gasto, 0, 'el Over no gasta cargas');
  assert.equal(EFECTOS.soresu.tipo, 'buff');
});

test('Robar el buff Soresu se lleva todas sus cargas y su bono', () => {
  const g = porId('garou'), cosmico = { ...g, pasiva: g.transformacion.pasiva, transformacion: null, movimientos: g.transformacion.movimientos };
  let robado = false;
  for (let sem = 1; sem < 40 && !robado; sem++) {
    const c = combate([cosmico], ['obi-wan-kenobi'], { semilla: sem });
    const ga = c.personajes.find(p => p.lado === 'jugador'), obi = c.personajes.find(p => p.lado === 'rival');
    while (c.esperando?.id !== ga.uid && !c.fin) c.actuar(elegirIA(c, azar(sem)));
    if (c.fin) continue;
    obi.estados = obi.estados.filter(e => e.id !== 'soresu'); obi.estados.push({ id: 'soresu', valor: 6 });
    const antes = c.stats(ga, { buffs: true }).armor;
    c.actuar({ categoria: 'basico', objetivo: obi.uid });
    if (estado(obi, 'soresu')) continue;                 // bloqueó el golpe: otra semilla
    robado = true;
    const v = estado(ga, 'soresu')?.valor;                 // 6 + la carga que le dio el golpe antes del robo
    assert.equal(v, 7);
    assert.ok(Math.abs(c.stats(ga, { buffs: true }).armor - antes - v * .05) < 1e-9, 'el ladrón gana +5% de Armadura por carga');
  }
  assert.ok(robado, 'se pudo probar el robo');
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
