// Blast: Al rescate (gatillo alAliadoHpBajo), turno extra por Especial/Over enemigo (máx. 3 por ronda), Cubos de Dios y su
// Over, y Agujero Dimensional (pasiva redirigirOver).
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId, estado } from './util.mjs';

const bl = c => c.personajes.find(p => p.id === 'blast');

test('Al rescate: la primera vez que un aliado baja de 30% recibe Escudo (50% del HP máx. de Blast) y Blast gana 1 Cubo; solo una vez por aliado', () => {
  const c = combate(['blast', 'goku'], ['aldebaran'], { semilla: 5 });
  const b = bl(c), g = c.personajes.find(p => p.id === 'goku');
  const t = c.personajes.find(p => p.lado === 'rival');
  jugar(c, cc => cc.esperando?.id === t.uid);
  const cubos = estado(b, 'cubosDios')?.valor || 0;
  g.hp = c.stats(g).hp * .25;                                   // queda bajo antes de que el rival actúe
  c.actuar({ categoria: 'basico', objetivo: b.uid });
  assert.ok(Math.abs(g.escudo - c.stats(b).hp * .5) < 1, `escudo ${g.escudo}`);
  assert.ok((estado(b, 'cubosDios')?.valor || 0) >= cubos + 1, 'gana 1 Cubo');
  g.escudo = 0; g.hp = c.stats(g).hp * .2;                     // vuelve a bajar: ya no lo rescata
  jugar(c, cc => cc.esperando?.id === t.uid, 3, 50);
  g.escudo = 0;
  c.actuar({ categoria: 'basico', objetivo: b.uid });
  assert.equal(g.escudo, 0, 'no repite el rescate con el mismo aliado');
});

test('Gana 1 turno extra por cada Especial u Over enemigo (máx. 3 por ronda)', () => {
  const c = combate(['blast'], ['aldebaran', 'kratos', 'goku', 'shaka'], { semilla: 3 });
  const b = bl(c);
  for (const x of c.personajes) { x.base = { ...x.base, hp: 1e7 }; x.hp = 1e7; }
  b.cds.over = 99; b.cds.especial = 99;
  let ganados = 0, ronda = c.ronda, r = {};
  for (let q = 0; q < 40 && c.ronda === ronda; q++) {
    const e = c.personajes.find(x => x.uid === c.esperando?.id);
    if (e.lado === 'rival') { e.cds.especial = 0; r = c.actuar({ categoria: 'especial', objetivo: b.uid }); }
    else r = c.actuar({ categoria: 'basico', objetivo: c.personajes.find(x => x.lado === 'rival').uid });
    ganados += r.eventos.filter(ev => ev.t === 'turnoExtraGanado' && ev.id === b.uid).length;
  }
  assert.equal(ganados, 3);
});

test('Colapso Gravitacional consume los Cubos: +35% de daño por cada uno', () => {
  const golpe = cubos => {
    const c = combate(['blast'], ['aldebaran'], { semilla: 9 });
    const b = bl(c), t = c.personajes.find(p => p.lado === 'rival');
    jugar(c, cc => cc.esperando?.id === b.uid);
    b.cds.over = 0; b.estados = b.estados.filter(e => e.id !== 'cubosDios');
    if (cubos) b.estados.push({ id: 'cubosDios', valor: cubos, permanente: true });
    t.estados = t.estados.filter(e => !['shield', 'esquivar', 'escudoSagrado', 'aoeDodge'].includes(e.id)); t.escudo = 0;
    const r = c.actuar({ categoria: 'over' });
    assert.ok(!estado(b, 'cubosDios'));
    return r.eventos.find(e => e.t === 'golpe' && e.a === t.uid);
  };
  const sin = golpe(0), con = golpe(4);
  assert.equal(sin.critico, con.critico);
  assert.ok(Math.abs(con.dano / sin.dano - 2.4) < .02, `${con.dano} / ${sin.dano}`);
});

test('Agujero Dimensional: un Over de un objetivo contra su equipo puede caer sobre un enemigo (máx. 1 por ronda)', () => {
  const def = { ...porId('blast'), pasiva: { ...porId('blast').pasiva, redirigirOver: { prob: 1, maxPorRonda: 1, texto: 'Portal' } } };
  const c = combate([def, 'goku'], ['kratos', 'aldebaran'], { semilla: 2 });
  const g = c.personajes.find(p => p.id === 'goku');
  for (const x of c.personajes) { x.base = { ...x.base, hp: 1e7 }; x.hp = 1e7; }
  const k = c.personajes.find(p => p.id === 'kratos');
  jugar(c, cc => cc.esperando?.id === k.uid);
  k.cds.over = 0;
  const hpG = g.hp;
  const r = c.actuar({ categoria: 'over', objetivo: g.uid });
  assert.equal(g.hp, hpG, 'el aliado no recibe el Over');
  assert.ok(r.eventos.some(e => e.t === 'golpe' && c.personajes.find(p => p.uid === e.a)?.lado === 'rival'), 'el Over golpea a un enemigo');
});
