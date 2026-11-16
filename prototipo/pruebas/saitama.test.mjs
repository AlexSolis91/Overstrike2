// Saitama: +200% contra Provocación, daño por % del HP máx. (con HP de referencia de jefes), +5% de Daño por golpe (50%),
// Golpe Serio con 50% del HP máx. si el objetivo tenía más del 80%, e inmunidad a debuffs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';

const sa = c => c.personajes.find(p => p.id === 'saitama');
const listo = (c, s) => jugar(c, cc => cc.esperando?.id === s.uid);
const limpio = (c, t) => { t.estados = t.estados.filter(e => !['shield', 'esquivar', 'escudoSagrado', 'aoeDodge'].includes(e.id)); t.escudo = 0; t.hp = c.stats(t).hp; };

test('Golpe Serio: +50% del HP máx. solo si el objetivo tenía más del 80%', () => {
  const dano = hpIni => {
    const c = combate(['saitama'], ['aldebaran'], { semilla: 5 });
    const s = sa(c), t = c.personajes.find(p => p.lado === 'rival');
    listo(c, s); s.cds.over = 0; limpio(c, t); t.hp = c.stats(t).hp * hpIni;
    const r = c.actuar({ categoria: 'over', objetivo: t.uid });
    return r.eventos.filter(e => e.a === t.uid && e.t === 'danoEfecto').length;
  };
  assert.ok(dano(1) >= 1);
  assert.equal(dano(.79), 0);
});

test('Daño por % usa el HP de referencia de los jefes', () => {
  const c = combate(['saitama'], ['aldebaran'], { semilla: 5 });
  const s = sa(c), t = c.personajes.find(p => p.lado === 'rival');
  listo(c, s); limpio(c, t);
  t.hpRef = 100;                                     // jefe con HP de referencia 100
  const r = c.actuar({ categoria: 'basico', objetivo: t.uid });
  const ef = r.eventos.filter(e => e.a === t.uid && e.t === 'danoEfecto').reduce((x, e) => x + (e.dano || 0), 0);
  assert.ok(ef > 0 && ef <= 10 + 1e-6, `daño por efecto ${ef}`);
});

test('+200% contra Provocación', () => {
  const golpe = conTaunt => {
    const c = combate(['saitama'], ['aldebaran'], { semilla: 7 });
    const s = sa(c), t = c.personajes.find(p => p.lado === 'rival');
    listo(c, s); limpio(c, t); t.estados = t.estados.filter(e => e.id !== 'taunt' && e.id !== 'megaTaunt');
    if (conTaunt) t.estados.push({ id: 'taunt', permanente: true });
    const r = c.actuar({ categoria: 'basico', objetivo: t.uid });
    return r.eventos.find(e => e.t === 'golpe' && e.a === t.uid);
  };
  const sin = golpe(false), con = golpe(true);
  assert.equal(sin.critico, con.critico);
  assert.ok(Math.abs(con.dano / sin.dano - 3) < .01, `${con.dano} / ${sin.dano}`);
});

test('Golpes Normales Consecutivos: +5% de Daño permanente por golpe acertado (50%)', () => {
  let total = 0;
  for (let k = 1; k <= 10; k++) {
    const c = combate(['saitama'], ['aldebaran'], { semilla: k });
    const s = sa(c), t = c.personajes.find(p => p.lado === 'rival');
    listo(c, s); s.cds.especial = 0; limpio(c, t); t.hp = 1e6;
    const antes = s.permanente.dmgPct || 0;
    c.actuar({ categoria: 'especial', objetivo: t.uid });
    const n = ((s.permanente.dmgPct || 0) - antes) / .05;
    assert.ok(Math.abs(n - Math.round(n)) < 1e-6 && n <= 10);
    total += n;
  }
  assert.ok(total > 25 && total < 75, `total ${total}`);
});

test('Inmune a debuffs y las partidas terminan', () => {
  for (let k = 1; k <= 4; k++) {
    const c = combate(['saitama', 'shaka', 'kratos', 'batman', 'goku'], ['naruto', 'meliodas', 'vegeta', 'sasuke-uchiha', 'trunks'], { semilla: k });
    const s = sa(c);
    let debuff = false;
    const r = jugar(c, () => { if (s.estados.some(e => ['stun', 'burn', 'poison', 'bleed', 'freeze', 'possess', 'fear', 'weaken'].includes(e.id))) debuff = true; return false; }, k);
    assert.ok(r.fin); assert.equal(debuff, false);
  }
});
