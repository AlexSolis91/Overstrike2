// Bombas: máximo 2 a la vez por campeón y 5 por jefe; dentro de un mismo movimiento, a cada portador solo le pueden estallar
// tantas Bombas como ese máximo (la Sinfonía Estridente de Tengen ya no las encadena sin fin sobre el mismo enemigo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId } from './util.mjs';

const listo = (c, p) => jugar(c, cc => cc.esperando?.id === p.uid);
const bomba = fuente => ({ id: 'bomb', valor: .01, contador: 9, fuente });
const deidaraSegura = () => {
  const d = porId('deidara');
  return { ...d, movimientos: d.movimientos.map(m => m.categoria === 'especial' ? { ...m, pct: .01, efectos: [{ accion: { tipo: 'efecto', id: 'bomb', prob: 1, ignoraPunteria: true } }] } : m) };
};
const preparar = (r, jefe) => {
  r.base = { ...r.base, hp: 1e6 }; r.hp = 1e6; r.estados = []; r.extra = { ...r.extra, block: -1, evasion: -1, res: -5 };
  if (jefe) r.jefe = { furia: true, umbral: 0, dmgPct: 0, spdPct: 0 };
};

for (const [jefe, max] of [[false, 2], [true, 5]]) test(`Máximo de Bombas a la vez: ${max} ${jefe ? '(jefe)' : '(campeón)'}`, () => {
  const c = combate([deidaraSegura()], ['aldebaran'], { semilla: 5 });
  const d = c.personajes.find(p => p.id === 'deidara'), r = c.personajes.find(p => p.lado === 'rival');
  listo(c, d); preparar(r, jefe); d.base = { ...d.base, hp: 1e6 }; d.hp = 1e6;
  for (let i = 0; i < max - 1; i++) r.estados.push(bomba(d.uid));
  d.cds.especial = 0;
  c.actuar({ categoria: 'especial' });
  assert.equal(r.estados.filter(e => e.id === 'bomb').length, max, 'llega al máximo');
  listo(c, d); d.cds.especial = 0;
  c.actuar({ categoria: 'especial' });
  assert.equal(r.estados.filter(e => e.id === 'bomb').length, max, 'no pasa del máximo');
});

for (const [jefe, max] of [[false, 2], [true, 5]]) test(`Sinfonía Estridente: a cada enemigo le estallan como máximo ${max} Bombas por ataque ${jefe ? '(jefe)' : '(campeón)'}`, () => {
  const c = combate(['tengen'], ['aldebaran'], { semilla: 7 });
  const t = c.personajes.find(p => p.id === 'tengen'), r = c.personajes.find(p => p.lado === 'rival');
  listo(c, t); preparar(r, jefe);
  for (let i = 0; i < max; i++) r.estados.push(bomba(t.uid));
  t.cds.over = 0;
  const ev = c.actuar({ categoria: 'over' }).eventos;
  const estallidos = ev.filter(e => e.t === 'explosion' && e.a === r.uid).length;
  assert.equal(estallidos, max, `estallaron ${estallidos}`);
  assert.ok(r.estados.filter(e => e.id === 'bomb').length <= max);
});

test('Fuera de un movimiento (cuenta regresiva) no hay límite de estallidos', () => {
  const c = combate(['tengen'], ['aldebaran', 'kratos'], { semilla: 2 });
  const t = c.personajes.find(p => p.id === 'tengen'), r = c.personajes.find(p => p.id === 'aldebaran');
  preparar(r, false);
  r.estados.push({ ...bomba(t.uid), contador: 1 }, { ...bomba(t.uid), contador: 1 });
  const ronda = c.estado?.ronda;
  const r2 = jugar(c, (cc, rr) => rr.eventos?.some(e => e.t === 'explosion' && e.a === r.uid));
  assert.ok(r2.eventos.filter(e => e.t === 'explosion' && e.a === r.uid).length === 2, `ronda ${ronda}`);
});
