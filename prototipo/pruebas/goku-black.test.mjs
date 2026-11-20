// Goku Black: Deidad Entre Mortales (5% al recibir daño: cooldowns a 0 + turno extra; Bombas +10% por cada 10% de HP que le
// falte), Lazo Divino (5 golpes entre hasta 3 enemigos; último golpe crítico → estallan ×2 solo SUS Bombas de ese ataque) y
// Guadaña Divina (2 Bombas + Sangrado seguros a Provocación, quita transformaciones —también permanentes— y Lazo automático).
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId, estado } from './util.mjs';

const bk = c => c.personajes.find(p => p.id === 'goku-black');
const listo = (c, p, cat) => jugar(c, cc => cc.esperando?.id === p.uid && (!cat || cc.esperando.opciones.find(o => o.categoria === cat)?.disponible));
const aguante = p => { p.base = { ...p.base, hp: 1e6 }; p.hp = 1e6; p.estados = p.estados.filter(e => e.permanente); p.extra = { ...p.extra, evasion: -1, block: -1 }; };

test('Lazo Divino: 5 golpes repartidos entre como máximo 3 enemigos distintos', () => {
  let vistos = 0;
  for (const s of [1, 2, 3, 4, 5, 6]) {
    const c = combate(['goku-black'], ['aldebaran', 'kratos', 'batman', 'loki', 'thor'], { semilla: s });
    const b = bk(c);
    jugar(c, (cc, r) => {
      const ev = r.eventos || [], i = ev.findIndex(e => e.t === 'movimiento' && e.id === b.uid && e.nombre === 'Lazo Divino');
      if (i < 0) return false;
      const fin = ev.findIndex((e, k) => k > i && e.t === 'movimientoFin');
      const golpes = ev.slice(i, fin < 0 ? undefined : fin).filter(e => e.t === 'golpe' && e.de === b.uid);
      assert.ok(new Set(golpes.map(e => e.a)).size <= 3, `semilla ${s}`);
      vistos++;
      return true;
    }, s, 400);
  }
  assert.ok(vistos >= 3, `Lazos vistos ${vistos}`);
});

test('Lazo Divino con último golpe crítico: estallan ×2 solo las Bombas que puso este ataque', () => {
  const def = { ...porId('goku-black'), extra: { critRate: 1 }, movimientos: porId('goku-black').movimientos.map(m => m.categoria === 'especial'
    ? { ...m, efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: 1, irresistible: true } }, m.efectos[1]] } : m) };
  const c = combate([def], ['aldebaran'], { semilla: 3 });
  const b = bk(c), r0 = c.personajes.find(p => p.lado === 'rival');
  listo(c, b); aguante(r0); b.hp = c.stats(b).hp;              // con todo su HP: sin bono por HP faltante
  const ajena = { id: 'bomb', valor: .2, contador: 9, fuente: 'otro', movId: -1 };
  r0.estados.push(ajena);
  b.cds.especial = 0;
  const r = c.actuar({ categoria: 'especial' });
  const exp = r.eventos.filter(e => e.t === 'dot' && e.tipo === 'bomb' && e.a === r0.uid);
  assert.ok(exp.length >= 1, 'estalla alguna');
  assert.ok(r0.estados.includes(ajena), 'la Bomba ajena se queda');
  const esperado = .2 * c.stats(r0).hp * 2;                    // una Bomba de Black (sin DoT ni HP perdido) ×2
  assert.ok(Math.abs(exp[0].dano - esperado) / esperado < .15, `${exp[0].dano} vs ${esperado}`);
});

test('Bombas: +10% de daño por cada 10% de HP que le falte, fijado al colocarlas', () => {
  const def = { ...porId('goku-black'), movimientos: porId('goku-black').movimientos.map(m => m.categoria === 'especial'
    ? { ...m, golpes: 1, efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: 1, irresistible: true } }] } : m) };
  const c = combate([def], ['aldebaran'], { semilla: 3 });
  const b = bk(c), r0 = c.personajes.find(p => p.lado === 'rival');
  listo(c, b); aguante(r0);
  b.hp = c.stats(b).hp * .55;                                  // le falta 45% → 4 tramos → +40%
  b.cds.especial = 0;
  c.actuar({ categoria: 'especial' });
  const bo = r0.estados.find(e => e.id === 'bomb');
  assert.ok(bo && Math.abs(bo.valor / (.2 * (1 + c.stats(b).dot)) - 1.4) < 1e-6, `valor ${bo?.valor}`);
});

test('Pasiva: al recibir daño puede poner sus cooldowns en 0 y ganar un turno extra', () => {
  const def = { ...porId('goku-black'), pasiva: { ...porId('goku-black').pasiva, prob: 1 } };
  const c = combate([def], ['aldebaran'], { semilla: 4 });
  const b = bk(c), a = c.personajes.find(p => p.lado === 'rival');
  listo(c, a);
  b.cds.especial = 2; b.cds.over = 3;
  const r = c.actuar({ categoria: 'basico', objetivo: b.uid });
  assert.equal(b.cds.especial, 0); assert.equal(b.cds.over, 0);
  assert.ok(r.eventos.some(e => e.t === 'turnoExtra' && e.id === b.uid) || c.esperando?.id === b.uid);
});

test('Guadaña Divina: 2 Bombas + Sangrado seguros a quien tiene (Mega) Provocación, y Lazo automático sin cooldown', () => {
  const c = combate(['goku-black'], ['tengen', 'aldebaran', 'kratos'], { semilla: 5 });
  const b = bk(c), d = c.personajes.find(p => p.id === 'tengen'), k = c.personajes.find(p => p.id === 'kratos');
  listo(c, b);
  for (const x of c.personajes.filter(p => p.lado === 'rival')) aguante(x);
  d.base = { ...d.base, res: 9 }; d.extra = { ...d.extra, res: 9 };
  k.estados.push({ id: 'bleed', valor: .01, fuente: 'otro' });
  b.cds.over = 0; b.cds.especial = 0;
  const r = c.actuar({ categoria: 'over' });
  assert.ok(d.estados.filter(e => e.id === 'bomb').length >= 2 || r.eventos.some(e => e.t === 'explosion' && e.a === d.uid), '2 Bombas en Tengen');
  assert.ok(estado(d, 'bleed'), 'Sangrado en Tengen');
  assert.ok(r.eventos.some(e => e.t === 'movimiento' && e.id === b.uid && e.nombre === 'Lazo Divino'), 'ejecutó Lazo Divino');
  assert.equal(b.cds.especial, 0, 'el Especial no entra en cooldown');
});

test('Guadaña Divina quita las transformaciones, también las permanentes, y pueden volver a transformarse', () => {
  const c = combate(['goku-black'], ['garou'], { semilla: 4 });
  const b = bk(c), g = c.personajes.find(p => p.id === 'garou');
  listo(c, b); aguante(b);
  g.estados.push({ id: 'despertarGarou', valor: 4, permanente: true });
  g.estados = g.estados.filter(e => e.id !== 'counter');
  c.actuar({ categoria: 'basico', objetivo: g.uid });
  assert.ok(g.forma?.permanente, 'Garou Cósmico (permanente)');
  listo(c, b); aguante(g);
  b.cds.over = 0;
  c.actuar({ categoria: 'over' });
  assert.equal(g.forma, null, 'vuelve a su forma original');
  assert.equal(g.pasiva.nombre, porId('garou').pasiva.nombre);
  assert.ok(g.transformacion, 'puede volver a transformarse');
});
