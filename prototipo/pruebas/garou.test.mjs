// Garou: Rival = Saitama (sin Orgullo), Despertar → Garou Cósmico (buffs + turno extra aunque sea el turno de otro),
// Copia de Técnicas (+150% de Daño hasta el final de la ronda por cada Over enemigo, acumulable) y bono de Over contra su Rival.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar, porId, estado, azar, elegirIA } from './util.mjs';

const ga = c => c.personajes.find(p => p.id === 'garou');
const listo = (c, s) => jugar(c, cc => cc.esperando?.id === s.uid);

test('Rival: Saitama si está en el equipo enemigo, y nunca gana Orgullo', () => {
  const c = combate(['garou'], ['aldebaran', 'saitama', 'goku']);
  const g = ga(c), s = c.personajes.find(p => p.id === 'saitama');
  assert.ok(s.estados.some(e => e.id === 'rival' && e.fuente === g.uid));
  jugar(c, () => false, 2, 60);
  assert.ok(!estado(g, 'orgullo'));
});

test('Con 5 de Despertar se transforma, gana Furia/Frenesí/Letalidad y toma un turno extra en cuanto termina el turno enemigo', () => {
  const c = combate(['garou'], ['aldebaran'], { semilla: 4 });
  const g = ga(c), t = c.personajes.find(p => p.lado === 'rival');
  listo(c, t);
  g.estados.push({ id: 'despertarGarou', valor: 4, permanente: true });
  g.estados = g.estados.filter(e => e.id !== 'counter');
  const r = c.actuar({ categoria: 'basico', objetivo: g.uid });
  assert.equal(g.forma?.nombre, 'Garou Cósmico');
  assert.ok(g.forma.permanente);
  for (const id of ['dmgUp', 'frenzy', 'bloodlust']) assert.ok(estado(g, id), id);
  assert.ok(r.eventos.some(e => e.t === 'turnoExtra' && e.id === g.uid));
  assert.equal(c.esperando?.id, g.uid);
});

test('Copia de Técnicas: +150% de Daño por cada Over enemigo, se acumula y se borra al iniciar la ronda siguiente', () => {
  const base = porId('garou');
  const cosmico = { ...base, pasiva: base.transformacion.pasiva, transformacion: null };
  const c = combate([cosmico], ['aldebaran', 'kratos'], { semilla: 2 })   // sin Overs que sellen su pasiva (p. ej. Shaka);
  const g = c.personajes.find(p => p.lado === 'jugador');
  const rivales = c.personajes.filter(p => p.lado === 'rival');
  for (const x of [g, ...rivales]) { x.base = { ...x.base, hp: 1e7 }; x.hp = 1e7; }   // aguanta varias rondas
  const rnd = azar(3);
  let ronda = c.ronda, overs = 0, max = 0;
  let r = {};
  for (let q = 0; q < 200 && !r.fin; q++) {
    if (c.ronda !== ronda) { assert.ok(!(g.bonoRonda?.dmgPct), 'se borra al iniciar la ronda'); ronda = c.ronda; overs = 0; }
    g.cds.over = 99;                                   // que no use su Over (pone Miedo)
    const e = rivales.find(x => x.uid === c.esperando?.id);
    const puede = e && !e.estados.some(x => ['fear', 'silence', 'incite'].includes(x.id));   // el Over de Garou Cósmico pone Miedo
    if (puede) { e.cds.over = 0; r = c.actuar({ categoria: 'over', objetivo: g.uid }); overs++; }
    else r = c.actuar(elegirIA(c, rnd));
    if (c.ronda === ronda) { assert.ok(Math.abs((g.bonoRonda?.dmgPct || 0) - 1.5 * overs) < 1e-9, `bono ${g.bonoRonda?.dmgPct} con ${overs}`); max = Math.max(max, overs); }
  }
  assert.ok(max >= 2, 'hubo una ronda con 2 Over enemigos');
});

test('Modo Monstruo Humano: +50% contra su Rival', () => {
  const golpe = rival => {
    const c = combate(['garou'], ['aldebaran'], { semilla: 9 });
    const g = ga(c), t = c.personajes.find(p => p.lado === 'rival');
    listo(c, g); g.cds.over = 0;
    t.estados = t.estados.filter(e => !['shield', 'esquivar', 'escudoSagrado', 'aoeDodge', 'rival'].includes(e.id)); t.escudo = 0;
    if (rival) t.estados.push({ id: 'rival', fuente: g.uid, permanente: true });
    const r = c.actuar({ categoria: 'over', objetivo: t.uid });
    return r.eventos.find(e => e.t === 'golpe' && e.a === t.uid);
  };
  const sin = golpe(false), con = golpe(true);
  assert.equal(sin.critico, con.critico);
  assert.ok(Math.abs(con.dano / sin.dano - 1.3 * 1.5) < .01, `${con.dano} / ${sin.dano}`);
});
