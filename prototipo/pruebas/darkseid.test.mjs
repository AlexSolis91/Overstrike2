// Darkseid: escala Daño+HP, Escudo antes de un ataque de área enemigo, Rayos Omega que rebotan, Posesión → Mega con bonos,
// y líder (buff al azar por ronda + absorbe el HP máx. de los aliados caídos).
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';
import { ESCALADO } from '../js/motor/reglas.js';

const DS = ['darkseid', 'shaka', 'kratos', 'batman', 'goku'];
const RIVAL = ['naruto', 'meliodas', 'vegeta', 'sasuke-uchiha', 'trunks'];
const BUFFS = ['frenzy', 'dmgUp', 'bloodlust', 'assist', 'counter', 'fortaleza', 'anticipar'];
const ds = (c, lado = 'jugador') => c.personajes.find(p => p.id === 'darkseid' && p.lado === lado);

test('Escala Daño y HP: 60% Daño + 40% HP ÷ 7.5', () => {
  assert.ok(Math.abs(ESCALADO.danoHp({ dmg: 100, hp: 700 }) * 1.8 - 175.2) < .01);
});

test('Líder: cada aliado empieza la ronda con uno de los 7 buffs', () => {
  const c = combate(DS, RIVAL, { semilla: 2 });
  for (const p of c.personajes.filter(x => x.lado === 'jugador'))
    assert.equal(p.estados.filter(e => BUFFS.includes(e.id) && !e.permanente).length >= 1, true, p.id);
});

test('Escudo ANTES del ataque de área enemigo', () => {
  const c = combate(['darkseid'], ['darkseid'], { semilla: 1 });
  const at = ds(c, 'jugador'), def = ds(c, 'rival');
  jugar(c, cc => cc.esperando?.id === at.uid);
  at.cds.over = 0;
  def.estados = def.estados.filter(e => e.id !== 'shield');
  const hp = def.hp;
  c.actuar({ categoria: 'over' });
  assert.equal(def.hp, hp);                                 // el Escudo (50% de 820) absorbió todo el ataque
  assert.ok(def.estados.some(e => e.id === 'shield'));
});

test('Rayos Omega rebotan si el objetivo queda con 30% o menos (o cae), sin repetir golpeados', () => {
  const c = combate(['darkseid'], ['batman', 'shaka', 'kratos'], { semilla: 4 });
  const d = ds(c);
  jugar(c, cc => cc.esperando?.id === d.uid);
  d.cds.especial = 0;
  const rivales = c.personajes.filter(p => p.lado === 'rival');
  for (const r of rivales) r.hp = c.stats(r).hp;
  rivales[0].hp = 1;
  const r = c.actuar({ categoria: 'especial', objetivo: rivales[0].uid });
  const golpeados = r.eventos.filter(e => e.t === 'golpe' && e.de === d.uid).map(e => e.a);
  assert.ok(golpeados.length >= 2, `golpeados ${golpeados}`);
  assert.equal(new Set(golpeados).size, golpeados.length);        // nunca repite a un golpeado
  // sin la condición (objetivo con HP alto) no rebota
  const c2 = combate(['darkseid'], ['batman', 'shaka', 'kratos'], { semilla: 4 });
  const d2 = ds(c2);
  jugar(c2, cc => cc.esperando?.id === d2.uid);
  d2.cds.especial = 0;
  const obj = c2.personajes.find(p => p.id === 'aldebaran') || c2.personajes.find(p => p.lado === 'rival');
  obj.hp = c2.stats(obj).hp * 10;
  const r2 = c2.actuar({ categoria: 'especial', objetivo: obj.uid });
  assert.equal(r2.eventos.filter(e => e.t === 'golpe' && e.de === d2.uid).length, 1);
});

test('Ecuación de la Anti-Vida: +15% por Posesión y +40% por Mega Posesión', () => {
  let megas = 0;
  for (let s = 1; s <= 30; s++) {
    const c = combate(['darkseid'], RIVAL, { semilla: s });
    const d = ds(c);
    jugar(c, cc => cc.esperando?.id === d.uid);
    d.cds.over = 0;
    const rivales = c.personajes.filter(p => p.lado === 'rival');
    for (const r of rivales) r.estados = r.estados.filter(e => e.id !== 'possess');
    const r = c.actuar({ categoria: 'over' });
    const entraron = r.eventos.filter(e => e.t === 'efecto' && e.texto === 'Posesión' && e.a?.startsWith('rival')).length;
    const mega = r.eventos.filter(e => e.t === 'bonoVisible' && /Mega Posesión/.test(e.texto || '')).length;
    megas += mega;
    const esperado = .15 * (entraron - mega) + .40 * mega;
    assert.ok(Math.abs((d.permanente.dmgPct || 0) - esperado) < 1e-9, `semilla ${s}`);
    assert.ok(Math.abs((d.permanente.hpPct || 0) - esperado) < 1e-9);
  }
  assert.ok(megas > 0);
});

test('Líder: al caer un aliado gana su HP máx.; las partidas terminan', () => {
  let gano = false;
  for (let s = 1; s <= 6; s++) {
    const c = combate(DS, RIVAL, { semilla: s });
    const d = ds(c);
    const r = jugar(c, () => { if ((d.permanente.hp || 0) > 0) gano = true; return false; }, s);
    assert.ok(r.fin);
  }
  assert.ok(gano);
});
