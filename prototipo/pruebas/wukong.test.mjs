// Wukong: al revivir (por cualquier medio) 30% de transformarse en Dark Wukong (daño ×3, Mega Aturdimiento a hasta 3
// enemigos sin Mega Aturdimiento). Dark Wukong dura hasta caer: al caer vuelve a ser Wukong y al revivir se tira de nuevo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCombate, elegirIA, porId, azar } from './util.mjs';

const WUKONG = ['wukong', 'shaka', 'satoru-gojo', 'kratos', 'batman'];
const RIVAL = ['anakin-skywalker', 'loki', 'goku', 'meliodas', 'madara-uchiha'];

test('Revive como Wukong o Dark Wukong (~30%); Dark: ×3, Mega Aturdimiento a ≤3 sin Mega, vuelve a Wukong al caer', () => {
  let revividas = 0, oscuras = 0, revertidas = 0;
  for (let g = 0; g < 60; g++) {
    const rnd = azar(g + 7);
    const c = crearCombate({ equipoJugador: WUKONG.map(porId), equipoRival: RIVAL.map(porId), semilla: g + 21 });
    const w = c.personajes.find(p => p.id === 'wukong');
    let r = c.iniciar(), q = 0;
    while (!r.fin && q++ < 4000) {
      const antesMuerto = w.muerto, antesForma = w.forma?.nombre;
      const megaAntes = new Set(c.personajes.filter(p => p.lado !== w.lado && p.estados.some(e => e.id === 'stun' && e.mega)).map(p => p.uid));
      r = c.actuar(elegirIA(c, rnd));
      const evs = r.eventos || [];
      if (antesMuerto && !w.muerto) {
        revividas++;
        const tr = evs.some(e => e.t === 'transformacion' && e.id === w.uid && e.nombre === 'Dark Wukong');
        if (tr) {
          oscuras++;
          assert.equal(w.forma?.nombre, 'Dark Wukong');
          assert.ok(w.forma.hastaMorir && !w.forma.permanente);
          assert.equal(w.pasiva.multiplicaDano, 3);
          assert.equal(w.cds.over, 4, 'el Over empieza con su cooldown completo');
          const nuevos = c.personajes.filter(p => p.lado !== w.lado && !p.muerto && !megaAntes.has(p.uid) && p.estados.some(e => e.id === 'stun' && e.mega));
          const vivosSinMega = c.personajes.filter(p => p.lado !== w.lado && !p.muerto && !megaAntes.has(p.uid)).length;
          const i = evs.findIndex(e => e.t === 'transformacion');
          const intentos = evs.slice(i).filter(e => (e.t === 'efecto' && e.texto === 'Mega Aturdimiento') || e.t === 'inmune').length;   // inmune: p. ej. Meliodas
          assert.ok(nuevos.length <= 3, `mega a ${nuevos.length}`);
          assert.ok(intentos >= Math.min(3, vivosSinMega), `intentos ${intentos}, vivos sin mega ${vivosSinMega}`);
        } else assert.ok(!w.forma);
      }
      if (!antesMuerto && w.muerto && antesForma === 'Dark Wukong') {
        revertidas++;
        assert.ok(!w.forma);
        assert.equal(w.pasiva.nombre, 'Wukong Invencible');
        assert.ok(!w.pasiva.multiplicaDano);
      }
    }
    assert.ok(r.fin, `partida ${g} termina`);
  }
  assert.ok(revividas >= 20, `revividas ${revividas}`);
  assert.ok(oscuras > 0 && oscuras < revividas, `oscuras ${oscuras}/${revividas}`);
  assert.ok(revertidas > 0, `revertidas ${revertidas}`);
});

test('multiplicaDano ×3: el mismo golpe causa el triple', () => {
  const primerGolpe = mult => {
    const rnd = azar(9);
    const c = crearCombate({ equipoJugador: WUKONG.map(porId), equipoRival: RIVAL.map(porId), semilla: 4 });
    const w = c.personajes.find(p => p.id === 'wukong');
    if (mult) w.pasiva = { ...w.pasiva, multiplicaDano: mult };
    let r = c.iniciar(), q = 0;
    while (!r.fin && q++ < 500) {
      r = c.actuar(elegirIA(c, rnd));
      const g = (r.eventos || []).find(e => e.t === 'golpe' && e.de === w.uid);
      if (g) return g.dano + g.escudo;
    }
  };
  const normal = primerGolpe(0), triple = primerGolpe(3);
  assert.ok(normal > 0);
  assert.ok(Math.abs(triple - normal * 3) <= 3, `${normal} → ${triple}`);
});
