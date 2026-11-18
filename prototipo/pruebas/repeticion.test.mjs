// Repetición vista por el defensor: su Defensa abajo (equipoJugador) con invertido y los uid de las decisiones cambiados de
// lado. Debe ser exactamente la misma batalla que la original (mismo ganador y mismo HP final de cada campeón).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate } from '../js/motor/combate.js';
import { porId } from '../js/datos/personajes/index.js';
import { cuentaDesdeServidor, conCuenta } from '../js/datos/cuenta.js';
import { jugarCombateIA } from '../js/motor/autoBatalla.js';
import { swapUid } from '../js/servicios/arenaVivo.js';

const fila = semilla => ({
  ataque: ['goku', 'garou', 'kratos', 'batman', 'loki'], defensa: ['tengen', 'superman', 'doctor-doom', 'obi-wan-kenobi', 'orochimaru'], semilla,
  equipo_atk: { col: [{ campeon: 'goku', estrellas: 6 }], reliquias: [] }, equipo_def: { col: [{ campeon: 'superman', estrellas: 4 }], reliquias: [] },
});

test('La repetición invertida (defensor abajo) reproduce la misma batalla', () => {
  for (const s of [3, 17, 41]) {
    const c = fila(s);
    const { decisiones, gano } = jugarCombateIA(c);
    const ca = cuentaDesdeServidor(c.equipo_atk), cd = cuentaDesdeServidor(c.equipo_def);
    const orig = crearCombate({ equipoJugador: c.ataque.map(porId).map(d => conCuenta(d, ca)), equipoRival: c.defensa.map(porId).map(d => conCuenta(d, cd)), semilla: s });
    const inv = crearCombate({ equipoJugador: c.defensa.map(porId).map(d => conCuenta(d, cd)), equipoRival: c.ataque.map(porId).map(d => conCuenta(d, ca)), semilla: s, invertido: true });
    let r1 = orig.iniciar(), r2 = inv.iniciar();
    for (const d of decisiones) {
      r1 = orig.actuar({ categoria: d.c, objetivo: d.o || null });
      r2 = inv.actuar({ categoria: d.c, objetivo: swapUid(d.o) || null });
    }
    assert.ok(r1.fin && r2.fin, 'las dos terminan');
    const ganoInv = r2.fin.ganador === 'rival' && !r2.fin.limite;
    assert.equal(ganoInv, gano, `semilla ${s}: mismo ganador`);
    for (const p of orig.personajes) {
      const q = inv.personajes.find(x => x.uid === swapUid(p.uid));
      assert.equal(Math.round(q.hp), Math.round(p.hp), `${p.nombre} mismo HP final`);
    }
  }
});
