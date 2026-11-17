// Tirion Fordring: Luz del Alba (cura el daño total), líder Cruzada Argenta (alCurar / alAtacarCon), pasiva a 20% de HP
// (alHpBajoPropio), Una Luz en la Oscuridad (ejecutar revividos + reanimar; si no hay a quién, cura) y alQuedarSolo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId, estado } from './util.mjs';

const ti = c => c.personajes.find(p => p.id === 'tirion-fordring');
const listo = (c, p) => jugar(c, cc => cc.esperando?.id === p.uid);
const limpio = t => { t.estados = t.estados.filter(e => !['shield', 'esquivar', 'escudoSagrado', 'aoeDodge'].includes(e.id)); t.escudo = 0; };

test('Luz del Alba: cada aliado se cura el daño TOTAL que causó el movimiento', () => {
  const c = combate(['tirion-fordring', 'goku'], ['aldebaran', 'kratos'], { semilla: 4 });
  const t = ti(c), g = c.personajes.find(p => p.id === 'goku');
  listo(c, t);
  for (const x of c.personajes.filter(p => p.lado === 'rival')) limpio(x);
  g.hp = 100;
  const r = c.actuar({ categoria: 'basico' });
  const total = r.eventos.filter(e => e.t === 'golpe' && c.personajes.find(p => p.uid === e.a)?.lado === 'rival').reduce((s, e) => s + e.dano + (e.escudo || 0), 0);
  const cura = r.eventos.find(e => e.t === 'curacion' && e.a === g.uid);
  assert.ok(total > 0 && Math.abs(cura.cantidad - total) < 1, `${cura?.cantidad} vs ${total}`);
});

test('Líder: las curaciones del equipo pueden dar Escudo Sagrado; atacar con Escudo Sagrado cura 20% del HP de Tirion', () => {
  const def = { ...porId('tirion-fordring'), lider: { ...porId('tirion-fordring').lider, alCurar: { prob: 1, efecto: 'escudoSagrado' } } };
  const c = combate([def, 'goku'], ['aldebaran'], { semilla: 6 });
  const t = ti(c), g = c.personajes.find(p => p.id === 'goku');
  listo(c, t);
  g.hp = 100; g.estados = g.estados.filter(e => e.id !== 'escudoSagrado');
  t.cds.especial = 0;
  c.actuar({ categoria: 'especial', objetivo: g.uid });
  assert.ok(estado(g, 'escudoSagrado'));
  listo(c, g);
  g.hp = 100;
  const r = c.actuar({ categoria: 'basico', objetivo: c.personajes.find(p => p.lado === 'rival').uid });
  const cura = r.eventos.find(e => e.t === 'curacion' && e.a === g.uid && e.de === t.uid);
  assert.ok(cura && Math.abs(cura.cantidad - c.stats(t).hp * .20) < 1, `cura ${cura?.cantidad}`);
});

test('Pasiva: a 20% de HP limpia sus debuffs y gana Escudo Sagrado, Protección y Fortaleza (una sola vez)', () => {
  const c = combate(['tirion-fordring', 'goku'], ['aldebaran'], { semilla: 3 });
  const t = ti(c), a = c.personajes.find(p => p.lado === 'rival');
  listo(c, a);
  t.estados.push({ id: 'weaken', dur: 3 }, { id: 'expuesto', dur: 3 });
  t.hp = c.stats(t).hp * .15;                                    // ya bajo: se revisa al terminar la acción en curso
  c.actuar({ categoria: 'basico', objetivo: c.personajes.find(p => p.id === 'goku').uid });
  assert.ok(!t.muerto, 'sobrevive');
  assert.ok(t.hp <= c.stats(t).hp * .2);
  for (const id of ['escudoSagrado', 'protect', 'fortaleza']) assert.ok(estado(t, id), id);
  assert.ok(!estado(t, 'weaken') && !estado(t, 'expuesto'));
});

test('Una Luz en la Oscuridad: ejecuta a un enemigo revivido (aunque sea inmortal) y revive a un aliado con 50%', () => {
  const c = combate(['tirion-fordring', 'goku'], ['aldebaran', 'kratos'], { semilla: 8 });
  const t = ti(c), g = c.personajes.find(p => p.id === 'goku'), k = c.personajes.find(p => p.id === 'kratos');
  listo(c, t);
  g.muerto = true; g.hp = 0;
  k.revivido = true; k.estados.push({ id: 'zona', dur: 3, zona: { inmortal: true } }); k.escudo = 9999;
  t.cds.over = 0;
  c.actuar({ categoria: 'over' });
  assert.ok(k.muerto, 'el revivido cae');
  assert.ok(!g.muerto && Math.abs(g.hp - c.stats(g).hp * .5) < 1, 'revive con 50%');
});

test('Una Luz en la Oscuridad sin nadie a quién revivir ni ejecutar: cura 20% del HP de Tirion a todo su equipo', () => {
  const c = combate(['tirion-fordring', 'goku'], ['aldebaran'], { semilla: 8 });
  const t = ti(c), g = c.personajes.find(p => p.id === 'goku');
  listo(c, t);
  g.hp = 50; t.cds.over = 0;
  const r = c.actuar({ categoria: 'over' });
  const cura = r.eventos.find(e => e.t === 'curacion' && e.a === g.uid);
  assert.ok(cura && Math.abs(cura.cantidad - c.stats(t).hp * .2) < 1);
});

test('Si caen todos sus aliados, ejecuta su Over 4 veces (sin cooldown) y los revive', () => {
  const c = combate(['tirion-fordring', 'goku', 'kratos', 'batman', 'loki'], ['aldebaran'], { semilla: 2 });
  const t = ti(c), a = c.personajes.find(p => p.lado === 'rival');
  listo(c, a);
  const ultimo = c.personajes.find(p => p.id === 'goku');
  for (const x of c.personajes.filter(p => p.lado === 'jugador' && p !== t && p !== ultimo)) { x.muerto = true; x.hp = 0; x.estados = []; }
  ultimo.estados = []; ultimo.escudo = 0; ultimo.hp = 1; ultimo.extra = { ...ultimo.extra, block: -1 };
  a.base = { ...a.base, dmg: 1e5 };
  const cdAntes = t.cds.over;
  c.actuar({ categoria: 'basico', objetivo: ultimo.uid });       // cae el último aliado: Tirion queda solo
  const vivos = c.personajes.filter(p => p.lado === 'jugador' && p !== t && !p.muerto).length;
  assert.equal(vivos, 4);
  assert.ok(t.cds.over <= cdAntes, 'no activa su cooldown (puede bajar si terminó la ronda)');
});
