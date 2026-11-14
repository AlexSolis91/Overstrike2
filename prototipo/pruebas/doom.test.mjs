// Doctor Doom: escudo por cada golpe recibido (sin límite, 2 rondas), reserva oculta de lo que absorben los Escudos de su
// equipo y liberación en Castigo del Dios Emperador (un enemigo al azar, ignora Armadura).
import test from 'node:test';
import assert from 'node:assert/strict';
import { combate, jugar } from './util.mjs';

const DOOM = ['doctor-doom', 'shaka', 'kratos', 'batman', 'goku'];
const RIVAL = ['meliodas', 'naruto', 'thor', 'vegeta', 'sasuke-uchiha'];

test('La reserva suma lo que absorben los Escudos de cualquier aliado y el Over la libera', () => {
  const c = combate(DOOM, RIVAL, { semilla: 2 });
  const d = c.personajes.find(p => p.id === 'doctor-doom');
  let liberada = false, maxReserva = 0;
  jugar(c, (cc, r) => {
    maxReserva = Math.max(maxReserva, d.reservaEscudos || 0);
    if ((r.eventos || []).some(e => e.t === 'bonoVisible' && /Castigo del Dios Emperador/.test(e.texto))) liberada = true;
    return liberada;
  }, 2);
  assert.ok(maxReserva > 0, 'acumuló');
  assert.ok(liberada, 'liberó en el Over');
  assert.equal(d.reservaEscudos, 0);
});

test('Sin límite por ronda: cada golpe recibido da un Escudo de 2 rondas', () => {
  const c = combate(DOOM, RIVAL, { semilla: 2 });
  const d = c.personajes.find(p => p.id === 'doctor-doom');
  assert.equal(d.pasiva.maxPorRonda, undefined);
  assert.equal(d.pasiva.accion.dur, 2);
  assert.equal(d.movimientos.find(m => m.categoria === 'basico').bonoPorEscudoPropio, .30);
});
