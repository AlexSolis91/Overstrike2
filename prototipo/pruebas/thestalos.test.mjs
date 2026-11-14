// Thestalos: Escudo Sagrado (bloquea 2 golpes, no se acumula), HP máx. por enemigos quemados al ser atacado,
// Over que crece +20% por uso y quema a todos si el objetivo sobrevive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';

const TH = ['thestalos', 'shaka', 'kratos', 'batman', 'goku'];
const RIVAL = ['naruto', 'meliodas', 'vegeta', 'sasuke-uchiha', 'trunks'];
const yo = c => c.personajes.find(p => p.id === 'thestalos');

test('Escudo Sagrado: bloquea 2 golpes (sin daño) y vuelve a 2 si lo recibe otra vez', () => {
  const c = combate(TH, RIVAL, { semilla: 3 });
  const t = yo(c);
  jugar(c, cc => cc.esperando?.id === t.uid);
  t.cds.especial = 0; t.hp = 100;
  c.actuar({ categoria: 'especial', objetivo: t.uid });
  const e = t.estados.find(x => x.id === 'escudoSagrado');
  assert.equal(e?.valor, 2);
  assert.ok(Math.abs(t.hp - (100 + .5 * c.stats(t).hp)) < 1);
  e.valor = 1;
  t.cds.especial = 0;
  // vuelve a 2 (sin acumular): lo aplicamos de nuevo cuando le toque
  jugar(c, cc => cc.esperando?.id === t.uid || !t.estados.some(x => x.id === 'escudoSagrado'));
  if (c.esperando?.id === t.uid && t.estados.some(x => x.id === 'escudoSagrado')) {
    c.actuar({ categoria: 'especial', objetivo: t.uid });
    assert.equal(t.estados.filter(x => x.id === 'escudoSagrado').length, 1);
    assert.equal(t.estados.find(x => x.id === 'escudoSagrado').valor, 2);
  }
});

test('Un golpe contra Escudo Sagrado no hace daño y gasta 1', () => {
  const c = combate(['naruto'], ['thestalos'], { semilla: 1 });
  const t = c.personajes.find(p => p.id === 'thestalos'), n = c.personajes.find(p => p.id === 'naruto');
  jugar(c, cc => cc.esperando?.id === n.uid);
  t.estados.push({ id: 'escudoSagrado', valor: 2, fuente: t.uid });
  const hp = t.hp;
  c.actuar({ categoria: 'basico', objetivo: t.uid });
  assert.equal(t.hp, hp);
  assert.equal(t.estados.find(x => x.id === 'escudoSagrado')?.valor, 1);
});

test('Juicio del Astro Rey crece +20% por uso', () => {
  const c = combate(TH, RIVAL, { semilla: 3 });
  const t = yo(c);
  jugar(c, cc => cc.esperando?.id === t.uid);
  t.cds.over = 0;
  const obj = c.personajes.find(p => p.lado !== t.lado && !p.muerto);
  c.actuar({ categoria: 'over', objetivo: obj.uid });
  assert.ok(Math.abs((t.bonos.over || 0) - .20) < 1e-9);
});

test('Partidas completas: gana HP máx. por quemados y las partidas terminan', () => {
  let crecio = false;
  for (let s = 1; s <= 6; s++) {
    const c = combate(TH, ['kyo-kusanagi', 'natsu-dragneel', 'rengoku', 'antares', 'daenerys-targaryen'], { semilla: s });
    const t = yo(c);
    const r = jugar(c, () => { if ((t.permanente.hpPct || 0) > 0) crecio = true; return false; }, s);
    assert.ok(r.fin);
  }
  assert.ok(crecio);
});
