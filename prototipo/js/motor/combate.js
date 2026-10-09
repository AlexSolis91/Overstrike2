// MOTOR DE COMBATE UNIVERSAL de Overstrike 2.
// - No sabe nada de la pantalla: aplica reglas y produce una lista de EVENTOS que la interfaz anima.
// - Ningún personaje tiene código propio: sus fichas solo combinan piezas (acciones, gatillos, condiciones, efectos).
// - Todo el azar pasa por un generador con semilla (misma semilla + mismas decisiones = misma partida).

import { BASE_COMUN, TOPES, ESCALADO, CD_INICIAL, LIMITE_RONDAS, CONTROL, DOT, BUFFS, DEBUFFS, PUNTERIA, probAplicar } from './reglas.js';
import { EFECTOS, esDe } from './efectos.js';
import { crearRng } from './rng.js';
import { RELIQUIAS } from '../datos/reliquias.js';
import { INVOCACIONES, TABLAS_INVOCACION } from '../datos/invocaciones.js';

const CATEGORIAS = ['basico', 'especial', 'over'];
const NOMBRE_CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };
const NOMBRE_STAT = { hpPct: 'HP máx.', critDmg: 'Daño Crítico', critRate: 'Prob. Crítico', armor: 'Armadura', res: 'Resistencia', acc: 'Puntería', pen: 'Penetración de escudo' };
const clonar = o => JSON.parse(JSON.stringify(o));

export function crearCombate({ equipoJugador, equipoRival, semilla = Date.now() }) {
  const rng = crearRng(semilla);
  const P = [];
  const S = { ronda: 0, actuaron: new Set(), orden: [], actual: null, esperando: null, fin: null };
  let EV = [];
  // Reacciones: lo que una pasiva hace en respuesta a la acción de otro (p. ej. Sub-Zero lanza Ice Blast cuando le rompen
  // el hielo a un enemigo) espera a que termine el movimiento en curso, para no mezclarse con él.
  const reacciones = [];
  let profundidad = 0;
  function procesarReacciones() {
    if (profundidad) return;
    while (reacciones.length) reacciones.shift()();
  }

  // ================================================================ personajes
  function crearPersonaje(def, lado, pos) {
    const p = clonar(def);
    Object.assign(p, {
      uid: `${lado}-${pos}`, lado, pos, esLider: pos === 0 && !!def.lider,
      estados: [], escudo: 0, muerto: false, cds: {}, bonos: {}, desempate: rng(),
      inmune: false, recienLiberado: false,
      permanente: {},        // bonos permanentes e invisibles (p. ej. Armadura de un líder); no se disipan
      usosPasiva: 0,         // activaciones de la pasiva en la ronda actual (para "máximo X por ronda")
      est: { dano: 0, escudo: 0, curacion: 0, recibido: 0, elim: 0 },   // estadísticas de la partida (pantalla de resultados)
      ultimoDanoDe: null,    // quién le hizo daño por última vez (para acreditar la eliminación)
    });
    for (const m of p.movimientos) {                     // conEquipo: el movimiento cambia si lleva cierto equipo (p. ej. 2 Espadas)
      if (m.conEquipo && tieneEquipo(p, m.conEquipo.equipo)) { Object.assign(m, m.conEquipo.cambios); m.equipoActivo = true; }
      p.cds[m.categoria] = CD_INICIAL[m.categoria] ?? 0;
    }
    // efectosPermanentes: la pasiva da ese efecto toda la partida (sin duración, no se disipa ni se roba)
    for (const id of def.pasiva?.efectosPermanentes || []) p.estados.push({ id, permanente: true });
    p.hp = stats(p).hp;
    return p;
  }

  // Equipo: cuenta las reliquias equipadas (espacios no bloqueados) por tipo (Espada, Lanza…) o categoría (Arma, Accesorio…)
  function tieneEquipo(p, { tipo, categoria, min = 1 }) {
    const n = (p.slots || []).filter(sl => !sl.locked && sl.relic && RELIQUIAS[sl.relic]
      && (!tipo || RELIQUIAS[sl.relic].type === tipo) && (!categoria || RELIQUIAS[sl.relic].category === categoria)).length;
    return n >= min;
  }

  // capas: qué sumar ({} = solo la base de su forma). Sin capas = todo. Sirve para el desglose del panel.
  const TODAS = { reliquias: true, buffs: true, debuffs: true, lider: true, permanente: true };
  function stats(p, capas = TODAS) {
    const b = p.base;
    const flat = { hp: 0, dmg: 0, spd: 0 }, pct = { hp: 0, dmg: 0, spd: 0 };
    const sec = { ...BASE_COMUN };
    for (const [k, v] of Object.entries(p.extra || {})) sec[k] = (sec[k] || 0) + v;
    if (capas.reliquias) for (const sl of p.slots || []) {
      const r = sl.relic && RELIQUIAS[sl.relic];
      if (!r) continue;
      flat[r.flat[0]] += r.flat[1];
      for (const [k, v] of r.rolls) {
        if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] += v;
      }
    }
    for (const e of p.estados) {
      if (!capas[EFECTOS[e.id]?.tipo === 'debuff' ? 'debuffs' : 'buffs']) continue;
      if (e.id === 'dmgUp') pct.dmg += e.valor;
      if (e.id === 'protect') sec.res += BUFFS.proteccion;
      if (e.id === 'frenzy') sec.critRate += BUFFS.frenesi;
      if (e.id === 'haste') pct.spd += BUFFS.celeridad;
      if (e.id === 'bloodlust') sec.critDmg += BUFFS.letalidad;
      if (e.id === 'keen') sec.acc += BUFFS.agudeza;
      if (e.id === 'pierce') sec.pen += BUFFS.perforacion;
      if (e.id === 'blind') sec.acc -= DEBUFFS.ceguera;
      if (e.id === 'wear') sec.armor -= e.valor;
      if (e.id === 'freeze') pct.spd -= CONTROL.congelacionVel * (e.mega ? 2 : 1);
    }
    sec.armor = Math.max(0, sec.armor);   // la Armadura nunca baja de 0% (la Puntería sí puede quedar negativa, p. ej. con Ceguera)
    if (capas.lider) for (const l of lideresDe(p)) {          // líder "bonoPorEfecto": +valor a una estadística por cada enemigo con ese efecto
      const b = l.lider?.bonoPorEfecto;
      if (b) sec[b.stat] = (sec[b.stat] || 0) + b.valor * enemigosDe(p).filter(x => get(x, b.efecto)).length;
      if (l.lider?.bonoDano) pct.dmg += l.lider.bonoDano;                                  // líder "bonoDano": +X% de Daño fijo
      for (const [k, v] of Object.entries(l.lider?.bonoStat || {})) {   // líder "bonoStat": p. ej. +15% Armadura o hpPct: +15% HP máx.
        if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
      }
      const ac = l.lider?.acumulaPorDoT;                                                   // líder "acumulaPorDoT": lo ganado hasta ahora
      if (ac && l.acumLider) sec[ac.stat] = (sec[ac.stat] || 0) + l.acumLider;
    }
    if (capas.permanente) for (const [k, v] of Object.entries(p.permanente || {})) {
      if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] = (sec[k] || 0) + v;
    }
    return {
      hp: (b.hp + flat.hp) * (1 + pct.hp),
      dmg: (b.dmg + flat.dmg) * (1 + pct.dmg),
      spd: (b.spd + flat.spd) * (1 + pct.spd),
      ...sec,
    };
  }
  const maxHp = p => stats(p).hp;
  // Desglose para el panel: cuánto suma o resta cada origen (se agregan por capas, en este orden)
  function desglose(p) {
    const orden = ['reliquias', 'buffs', 'debuffs', 'lider', 'permanente'], capas = {}, out = {};
    let antes = stats(p, capas);
    const base = antes;
    for (const c of orden) {
      capas[c] = true;
      const ahora = stats(p, capas);
      out[c] = Object.fromEntries(Object.keys(ahora).map(k => [k, ahora[k] - antes[k]]));
      antes = ahora;
    }
    return { base, ...out };
  }
  const get = (p, id) => p.estados.find(e => e.id === id);
  const todos = (p, id) => p.estados.filter(e => e.id === id);
  const vivos = lado => P.filter(p => p.lado === lado && !p.muerto);
  const enemigosDe = p => vivos(p.lado === 'jugador' ? 'rival' : 'jugador');
  const aliadosDe = p => vivos(p.lado);
  const lideresDe = p => P.filter(x => x.lado === p.lado && x.esLider && !x.muerto);
  const quitar = (p, e) => { p.estados = p.estados.filter(x => x !== e); };

  // ================================================================ vista (lo que la interfaz necesita)
  function vistaEstados(p) {
    const out = [];
    const grupo = (id, extra) => ({ id, icono: EFECTOS[id].icono, color: EFECTOS[id].color, tipo: EFECTOS[id].tipo, tags: EFECTOS[id].tags, ...extra });
    const pctTxt = v => `${Math.round(v * 1000) / 10}%`;
    for (const e of p.estados) {
      if (e.id === 'poison' || e.id === 'bomb' || e.id === 'summon') continue;
      const def = EFECTOS[e.id];
      const nombre = e.mega ? def.mega : def.nombre;
      let texto = '', n = '';
      switch (e.id) {
        case 'burn': texto = `${pctTxt(e.valor)} HP máx. al inicio del turno · ${e.dur} ronda(s)${e.inextinguible ? ' · Amaterasu: no se puede limpiar' : ''}`; n = e.dur; break;
        case 'bleed': texto = `${pctTxt(e.valor)} HP máx. por golpe recibido · hasta limpiarlo`; break;
        case 'hemo': texto = `${pctTxt(e.valor)} por golpe y por movimiento · +1 por golpe`; n = Math.round(e.valor * 100); break;
        case 'stun': case 'possess':
          texto = e.id === 'possess' ? `Ataca a sus aliados · ${e.turnos} turno(s)` : `Pierde ${e.turnos} turno(s)`;
          n = e.turnos; break;
        case 'freeze':
          texto = `${e.capas ? `${e.capas} capa(s) de hielo: pierde su turno si no las rompen (cada golpe rompe 1, +${Math.round(CONTROL.quiebreCongelacion * 100)}% daño)` : 'Hielo roto: puede actuar'} · −${Math.round(CONTROL.congelacionVel * (e.mega ? 200 : 100))}% Velocidad · ${e.dur} ronda(s)`;
          n = e.capas || e.dur; break;
        case 'silence': texto = `No puede usar su ${NOMBRE_CAT[e.categoria]} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'blind': texto = `−${Math.round(DEBUFFS.ceguera * 100)}% Puntería · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'wear': texto = `−${Math.round(e.valor * 100)}% Armadura · +${Math.round(DEBUFFS.desgaste * 100)}% por golpe recibido (máx. ${Math.round(DEBUFFS.desgasteMax * 100)}%) · hasta limpiarlo`; n = Math.round(e.valor * 100); break;
        case 'plague': texto = `No puede recibir curaciones · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'blackPlague': texto = `No puede recibir curaciones · pierde ${Math.round(DEBUFFS.pesteNegra * 100)}% del HP máx. al final de su turno · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'confuse': texto = `50% de cambiar de objetivo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'fear': texto = `Actúa al final de la ronda · −25% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'dmgUp': texto = `+${Math.round(e.valor * 100)}% Daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'taunt': texto = `Los enemigos deben atacarlo con sus movimientos de un objetivo · ${e.permanente ? 'permanente' : `${e.dur} ronda(s)`}`; n = e.permanente ? '∞' : e.dur; break;
        case 'frostAura': texto = `−${Math.round(BUFFS.auraGelida * 100)}% daño de golpes · ${Math.round(PUNTERIA.auraGelida * 100)}% de Congelar a quien lo golpee · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'mirror': texto = `Devuelve el ${Math.round(BUFFS.espejismo * 100)}% del daño de cada golpe recibido · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'blockBuffs': texto = `No puede recibir buffs nuevos · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'grayskull': texto = `${e.valor} de Poder de Grayskull (máx. 5): Golpe de Grayskull +15% por cada uno`; n = e.valor; break;
        case 'poderRobado': texto = `${e.valor} de Poder Robado (máx. 10): Poder de Grayskull +20% por cada uno`; n = e.valor; break;
        case 'orgullo': texto = `${e.valor} de Orgullo (máx. 5): Final Flash +15% por cada uno`; n = e.valor; break;
        case 'rival': texto = `Rival de ${porUid(e.fuente)?.nombre || 'Vegeta'}: recibe más daño de él`; break;
        case 'cargas': texto = `${e.valor} carga(s): su próximo movimiento que las consume hace más daño`; n = e.valor; break;
        case 'incite': texto = `Solo puede usar su Básico contra ${porUid(e.fuente)?.nombre || 'quien lo incitó'} · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'pierce': texto = `+${Math.round(BUFFS.perforacion * 100)}% Penetración de escudo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'solarBurn': texto = `Las curaciones le hacen daño (ignora Armadura y Escudo) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'aoeDodge': texto = `Esquiva los movimientos de área de los enemigos (daño y efectos) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'stealth': texto = `Los enemigos no pueden elegirlo con ataques de un objetivo · se rompe al recibir daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'protect': texto = `+${Math.round(BUFFS.proteccion * 100)}% Resistencia · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'frenzy': texto = `+${Math.round(BUFFS.frenesi * 100)}% Prob. Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'haste': texto = `+${Math.round(BUFFS.celeridad * 100)}% Velocidad · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'bloodlust': texto = `+${Math.round(BUFFS.letalidad * 100)}% Daño Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'keen': texto = `+${Math.round(BUFFS.agudeza * 100)}% Puntería · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'weaken': texto = `Recibe +${Math.round(DEBUFFS.debilitar * 100)}% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'regen': texto = `Cura ${Math.round(BUFFS.regeneracion * 100)}% del HP máx. al inicio de su turno · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'fireAura': texto = `Quema (5%, 1 turno) al enemigo que lo golpee · ${e.dur} ronda(s)`; n = e.dur; break;
      }
      out.push(grupo(e.id, { nombre, texto, n }));
    }
    const ven = todos(p, 'poison');
    if (ven.length) out.push(grupo('poison', { nombre: `Veneno ×${ven.length}`, n: ven.length,
      texto: `${pctTxt(ven.reduce((s, x) => s + x.valor, 0))} por turno · duraciones: ${ven.map(x => x.dur).join(', ')}` }));
    const bom = todos(p, 'bomb');
    if (bom.length) out.push(grupo('bomb', { nombre: bom.length > 1 ? `Bomba ×${bom.length}` : 'Bomba', n: Math.min(...bom.map(x => x.contador)),
      texto: `Explota en ${bom.map(x => x.contador).join(', ')} ronda(s) · ${pctTxt(bom[0].valor)} HP máx. + 25% a sus aliados` }));
    return out;
  }
  function vista(p) {
    return {
      hp: Math.max(0, p.hp), maxHp: maxHp(p), escudo: p.escudo, muerto: p.muerto, esLider: p.esLider,
      stats: stats(p), desglose: desglose(p), estados: vistaEstados(p), cds: { ...p.cds }, silenciado: get(p, 'silence')?.categoria || null, bonos: { ...p.bonos }, inmune: p.inmune,
      invocaciones: todos(p, 'summon').map(e => ({ key: e.key, dur: e.dur, fresca: !!e.fresca, max: INVOCACIONES[e.key].dur })),
      forma: p.forma ? { nombre: p.forma.nombre, imagen: p.forma.imagen, emoji: p.forma.emoji, color: p.forma.color, turnos: p.forma.turnos, total: p.forma.total, permanente: !!p.forma.permanente } : null,
      transformacion: p.transformacion ? { nombre: p.transformacion.nombre, pasiva: p.transformacion.pasiva?.nombre, movimientos: p.transformacion.movimientos.map(m => m.nombre) } : null,
      movs: p.movimientos, pasiva: p.pasiva,
    };
  }
  function emitir(t, datos = {}, ...afectados) {
    const e = { t, ...datos };
    if (afectados.length) { e.s = {}; for (const p of afectados) if (p) e.s[p.uid] = vista(p); }
    EV.push(e);
    return e;
  }
  const ordenActual = () => ({ hechos: [...S.orden], actual: S.actual?.uid || null, pendientes: pendientes().map(p => p.uid) });

  // ================================================================ turnos
  function comparar(a, b) {
    const fa = get(a, 'fear') ? 1 : 0, fb = get(b, 'fear') ? 1 : 0;   // Miedo: actúa al final de la ronda
    if (fa !== fb) return fa - fb;
    return stats(b).spd - stats(a).spd || b.base.spd - a.base.spd || b.desempate - a.desempate;
  }
  const pendientes = () => P.filter(p => !p.muerto && !S.actuaron.has(p) && p !== S.actual).sort(comparar);
  const siguiente = () => P.filter(p => !p.muerto && !S.actuaron.has(p)).sort(comparar)[0];

  function iniciarRonda() {
    S.ronda++;
    S.actuaron = new Set(); S.orden = [];
    for (const p of P) { p.desempate = rng(); p.usosPasiva = 0; }
    emitir('ronda', { n: S.ronda, orden: ordenActual() });
    for (const l of P.filter(x => x.esLider && !x.muerto && x.lider?.alIniciarRonda)) {
      emitir('liderActua', { id: l.uid, nombre: l.lider.nombre });
      ejecutarAccion(l, l.lider.alIniciarRonda, {});
    }
    for (const p of P) pasivas(p, 'alIniciarRonda', {});      // pasivas "al inicio de cada ronda" (p. ej. Modo Rikudo)
    procesarReacciones();
  }

  function finRonda() {
    const explotan = [], terminan = [];
    for (const p of P) {
      if (p.muerto) continue;
      for (const c of CATEGORIAS) if (p.cds[c] > 0) p.cds[c]--;
      if (p.formaBase) for (const c of CATEGORIAS) if (p.formaBase.cds[c] > 0) p.formaBase.cds[c]--;
      for (const e of p.estados) {
        // Regla general: un efecto aplicado a alguien que YA actuó en esta ronda no pierde duración al final de ella
        const salta = e.nuevo; e.nuevo = false;
        if (salta) continue;
        if (e.dur !== undefined) e.dur--;
        if (e.alTerminar && e.dur !== undefined && e.dur <= 0) terminan.push([p, e]);
        if (e.id === 'bomb') { e.contador--; if (e.contador <= 0) explotan.push([p, e]); }
      }
      todos(p, 'summon').filter(e => e.dur <= 0).forEach(e => emitir('invocacionExpira', { de: p.uid, key: e.key }));
      p.estados = p.estados.filter(e => (e.dur === undefined || e.dur > 0) && !(e.id === 'bomb' && e.contador <= 0));
    }
    for (const [p, b] of explotan) if (!p.muerto) explotarBomba(p, b, false);
    // "alTerminar": al expirar el efecto (no si lo disipan o limpian), su dueño ejecuta la acción (p. ej. Gran Cuerno de Aldebarán)
    for (const [p, e] of terminan) { const d = porUid(e.duenoTerminar) || p; if (!d.muerto && enemigosDe(d).length) ejecutarAccion(d, e.alTerminar, {}); }
    procesarReacciones();
    emitir('finRonda', {}, ...P);
  }

  function inicioTurno(p) {
    if (get(p, 'regen')) curar(p, p, maxHp(p) * BUFFS.regeneracion);
    const q = get(p, 'burn');
    if (q) danoDoT(p, q.valor, 'burn', fuentesDe([q]));
    const v = todos(p, 'poison');
    if (v.length && !p.muerto) danoDoT(p, v.reduce((s, x) => s + x.valor, 0), 'poison', fuentesDe(v));
  }

  // Devuelve true si el personaje no puede elegir su acción este turno (perdió el turno o está poseído)
  function procesarControl(p) {
    const c = p.estados.find(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0));
    if (!c) return false;
    if (c.id === 'freeze') {       // hielo sin romper: pierde el turno y el hielo desaparece (el debuff sigue: −Velocidad)
      c.capas = 0;
      emitir('pierdeTurno', { id: p.uid, motivo: 'freeze' }, p);
      p.inmune = true; p.recienLiberado = true;
      emitir('controlFin', { id: p.uid }, p);
      return true;
    }
    c.turnos--;
    if (c.id === 'possess') {
      emitir('poseido', { id: p.uid, mega: !!c.mega }, p);
      const victimas = aliadosDe(p).filter(x => x !== p);
      const basico = p.movimientos.find(m => m.categoria === 'basico');
      if (victimas.length && basico) ejecutarMovimiento(p, basico, rng.elegir(victimas), { forzado: true });
    } else {
      emitir('pierdeTurno', { id: p.uid, motivo: c.id }, p);
    }
    if (p.muerto) return true;
    if (c.turnos <= 0) {
      quitar(p, c);
      p.inmune = true; p.recienLiberado = true;       // protección contra el bloqueo infinito
      emitir('controlFin', { id: p.uid }, p);
    } else if (c.mega && c.turnos === 1) {
      c.mega = false;
      emitir('actualizar', {}, p);
    }
    return true;
  }

  function terminarTurno(p) {
    if (get(p, 'blackPlague') && !p.muerto) pesteNegra(p);
    S.actuaron.add(p); S.orden.push(p.uid);
    const dren = p.pasiva?.drenajePropio;                  // p. ej. Modo Barión: quema su propia vida (nunca baja de 1 HP)
    if (dren && !p.muerto) {
      const d = Math.min(p.hp - 1, dren * maxHp(p));
      if (d > 0) { p.hp -= d; emitir('danoEfecto', { de: p.uid, a: p.uid, dano: d, escudo: 0, color: 0xf97316 }, p); }
    }
    for (const x of P) if (x.muerto && x.reviveEn > 0 && --x.reviveEn === 0) revivir(x);
    if (p.inmune && !p.recienLiberado) p.inmune = false;
    p.recienLiberado = false;
    for (const e of todos(p, 'summon')) e.fresca = false;
    if (p.forma && !p.forma.permanente && !p.muerto) {   // la forma dura N turnos propios (el turno en que se transforma no cuenta)
      if (p.forma.recien) p.forma.recien = false;
      else if (--p.forma.turnos <= 0) revertir(p);
      else emitir('actualizar', {}, p);
    }
    S.actual = null;
  }

  // Peste Negra: reduce el HP máx. (5% del original, piso 25%). No es daño; el HP actual solo baja si queda por encima del nuevo máximo.
  // La pérdida es permanente (aunque se limpie) y se guarda como bono permanente negativo, así sigue en las transformaciones.
  function pesteNegra(p) {
    const perdido = p.pestePerdida || 0;
    const quita = Math.min(DEBUFFS.pesteNegra, 1 - DEBUFFS.pesteNegraPiso - perdido);
    if (quita <= 1e-9) return;
    p.pestePerdida = perdido + quita;
    p.permanente.hpPct = (p.permanente.hpPct || 0) - quita;
    p.hp = Math.min(p.hp, maxHp(p));
    emitir('bonoVisible', { a: p.uid, texto: `☠️ −${Math.round(quita * 100)}% HP máx.` }, p);
  }

  function comprobarFin() {
    if (S.fin) return true;
    const gj = vivos('jugador').length, gr = vivos('rival').length;
    if (gj && gr) return false;
    S.fin = { ganador: gj ? 'jugador' : 'rival', ronda: S.ronda };
    emitir('fin', S.fin);
    return true;
  }

  // Límite de rondas: gana quien tenga más personajes vivos; mismo número = empate
  function finPorLimite() {
    const gj = vivos('jugador').length, gr = vivos('rival').length;
    S.fin = { ganador: gj > gr ? 'jugador' : gr > gj ? 'rival' : 'empate', ronda: S.ronda, limite: true };
    emitir('fin', S.fin);
  }

  function avanzar() {
    while (!comprobarFin()) {
      let n = S.ronda ? siguiente() : null;
      if (!n) {
        if (S.ronda) { finRonda(); if (comprobarFin()) return; if (S.ronda >= LIMITE_RONDAS) { finPorLimite(); return; } }
        iniciarRonda();
        n = siguiente();
        if (!n) return;
      }
      S.actual = n;
      emitir('turno', { id: n.uid, orden: ordenActual() }, n);
      inicioTurno(n);
      if (comprobarFin()) return;
      if (n.muerto) { terminarTurno(n); continue; }
      if (procesarControl(n)) { terminarTurno(n); continue; }
      const ops = opciones(n);
      if (!ops.some(o => o.disponible)) {            // Silencio: lo único listo está bloqueado -> pierde el turno
        emitir('pierdeTurno', { id: n.uid, motivo: 'silence' }, n);
        n.inmune = true; n.recienLiberado = true;
        terminarTurno(n); continue;
      }
      pasivas(n, 'alIniciarTurno', { objetivo: n });
      if (comprobarFin()) return;
      S.esperando = { id: n.uid, opciones: opciones(n) };
      return;
    }
  }

  // Incitar: quien lo aplicó (si sigue vivo); mientras dure, solo puede usar el Básico y solo contra él
  const incitadoPor = p => { const e = get(p, 'incite'); const f = e && porUid(e.fuente); return f && !f.muerto && f.lado !== p.lado ? f : null; };
  function opciones(p) {
    const inc = incitadoPor(p);
    return p.movimientos.map(m => ({
      categoria: m.categoria,
      agotado: !!(m.unaVez && p.usados?.has(m.nombre)),     // unaVez: solo se puede usar una vez por partida
      disponible: (p.cds[m.categoria] || 0) === 0 && get(p, 'silence')?.categoria !== m.categoria && (!inc || m.categoria === 'basico')
        && !(m.unaVez && p.usados?.has(m.nombre)),
      cd: p.cds[m.categoria] || 0,
      objetivos: objetivosValidos(p, m).map(t => t.uid),
    }));
  }
  function objetivosValidos(p, m) {
    const inc = incitadoPor(p);
    if (inc && m.categoria === 'basico' && m.objetivo === 'enemigo') return [inc];
    if (m.objetivo === 'enemigo') return conSigilo(conProvocacion(enemigosDe(p)));
    if (m.objetivo === 'aliado') return aliadosDe(p);
    return [];
  }
  // Esquiva Área: los movimientos de "todos los enemigos" (daño y efectos) no lo alcanzan
  function sinEsquiva(lista) {
    const fuera = lista.filter(x => get(x, 'aoeDodge'));
    for (const x of fuera) emitir('esquiva', { a: x.uid });
    return lista.filter(x => !fuera.includes(x));
  }
  // Sigilo: no se puede elegir con ataques de un objetivo (si todos lo tienen, no cuenta)
  function conSigilo(lista) {
    const visibles = lista.filter(x => !get(x, 'stealth'));
    return visibles.length ? visibles : lista;
  }
  // cualquier daño que baje HP o Escudo rompe el Sigilo
  // fuente: quién causó el daño (personaje), o lista [[personaje, fracción], ...] si se reparte (p. ej. Venenos de varios)
  function recibioDano(t, cantidad, fuente = null) {
    const real = Math.max(0, cantidad - Math.max(0, -t.hp));        // sin el daño sobrante del golpe que mata
    t.est.recibido += real;
    const reparto = !fuente ? [] : Array.isArray(fuente) ? fuente : [[fuente, 1]];
    for (const [f, frac] of reparto) if (f && f.lado !== t.lado) f.est.dano += real * frac;
    const ultimo = reparto.filter(([f]) => f && f.lado !== t.lado).sort((x, y) => y[1] - x[1])[0];
    if (ultimo) t.ultimoDanoDe = ultimo[0];
    if (t.pasiva?.rival && cantidad > 0 && !t.muerto) revisarTransformacion(t);
    const s = cantidad > 0 && !t.muerto && get(t, 'stealth');
    if (s) { quitar(t, s); emitir('sigiloRoto', { a: t.uid }, t); }
  }
  const porUid = uid => uid && P.find(p => p.uid === uid);
  // tiene un Control que le quita turnos (aturdido, poseído o con hielo sin romper)
  const conControl = p => p.estados.some(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0));
  function ganarCargas(p, n, max, id = 'cargas') {          // id: tipo de carga ('cargas' = Furia Dorada, 'orgullo' = Orgullo Sayajin…)
    let e = get(p, id);
    if (!e) { e = { id, valor: 0 }; p.estados.push(e); }
    const antes = e.valor; e.valor = Math.min(max, e.valor + n);
    if (e.valor !== antes) emitir('actualizar', {}, p);
  }
  // ---------------------------------------------------------------- Rivalidad (pasiva "rival"): marca a un enemigo como su Rival
  // Rival = Goku si está en el equipo enemigo; si no, el enemigo con más Daño. Si el Rival muere, bono permanente y nuevo Rival.
  const tieneBuff = t => t.estados.some(e => EFECTOS[e.id]?.tipo === 'buff' && e.id !== 'summon');   // algún buff activo (sin contar invocaciones)
  const esRival = (v, t) => t.estados.some(e => e.id === 'rival' && e.fuente === v.uid);
  function elegirRival(v, avisar = true) {
    const l = enemigosDe(v);
    if (!l.length) return;
    const r = l.find(x => x.id === 'goku') || l.reduce((x, y) => stats(y).dmg > stats(x).dmg ? y : x);
    r.estados.push({ id: 'rival', fuente: v.uid, permanente: true });
    if (avisar) emitir('efecto', { a: r.uid, id: 'rival', texto: `👑 Nuevo Rival de ${v.nombre}` }, r);
  }
  function ganarOrgullo(p, n) {
    const rv = p.pasiva?.rival;
    if (!rv || p.muerto) return;
    ganarCargas(p, n, rv.max || 5, 'orgullo');
    revisarTransformacion(p);
  }
  // transformación automática: al llegar a N de Orgullo o al bajar de cierto % de HP (una vez; se hace al terminar la acción en curso)
  function revisarTransformacion(p) {
    const tc = p.pasiva?.rival?.transformar;
    if (!tc || p.forma || p.muerto || !p.transformacion || p.transformando) return;
    if ((get(p, 'orgullo')?.valor || 0) >= tc.cargas || p.hp / maxHp(p) < tc.hp) {
      p.transformando = true;
      reacciones.push(() => { p.transformando = false; if (!p.forma && !p.muerto) transformar(p); });
    }
  }
  function revivir(x) {
    if (!enemigosDe(x).length) return;               // la partida ya terminó
    Object.assign(x, { muerto: false, estados: [], escudo: 0, inmune: false, recienLiberado: false, reviveEn: 0 });
    for (const id of x.pasiva?.efectosPermanentes || []) x.estados.push({ id, permanente: true });
    x.hp = maxHp(x) * (x.pasiva?.revivir?.hp ?? 1);
    if (x.pasiva?.rival) elegirRival(x);
    emitir('revivir', { a: x.uid, nombre: x.pasiva?.revivir ? x.pasiva.nombre : '' }, x);
  }
  // reparto del daño de un DoT entre quienes lo aplicaron (cada acumulación recuerda su "fuente")
  const fuentesDe = estados => { const tot = estados.reduce((s, e) => s + (e.valor || 0), 0) || 1; return estados.map(e => [porUid(e.fuente), (e.valor || 0) / tot]); };
  // Provocación: si algún candidato la tiene, los ataques de un solo objetivo solo pueden ir a ellos
  function conProvocacion(lista) {
    const prov = lista.filter(x => get(x, 'taunt'));
    return prov.length ? prov : lista;
  }

  // ================================================================ daño
  function reduccion(t, categoria) {
    let r = 0;
    for (const l of lideresDe(t)) if (l.lider?.reduccion?.categoria === categoria) r += l.lider.reduccion.pct;
    for (const p of aliadosDe(t)) {                      // pasiva "reduccionAliados": todo su equipo recibe menos daño mientras no tenga X
      const ra = p.pasiva?.reduccionAliados;
      if (ra && !(ra.salvoSi && get(p, ra.salvoSi))) r += ra.pct;
    }
    if (categoria === 'golpe' && get(t, 'frostAura')) r += BUFFS.auraGelida;   // Aura Gélida
    const rp = t.pasiva?.reduccionPropia;                  // pasiva: reduce el daño que recibe él mismo (p. ej. Aldebarán)
    if (rp?.categoria === categoria) r += rp.pct;
    return Math.min(r, .9);
  }
  function repartir(t, d, pen) {
    let aHp = d * Math.min(pen, 1), aEsc = d - aHp;
    if (t.escudo > 0) { const abs = Math.min(t.escudo, aEsc); t.escudo -= abs; aHp += aEsc - abs; aEsc = abs; }
    else { aHp += aEsc; aEsc = 0; }
    t.hp -= aHp;
    return { aHp, aEsc };
  }
  const baseDe = (p, escala) => (ESCALADO[escala || 'dano'])(stats(p));

  // Un GOLPE: Crítico -> (Miedo) -> (quiebre de Congelación) -> Armadura -> reducciones -> Penetración de escudo/Escudo
  function golpear(a, t, mov, ctx) {
    const sa = stats(a), st = stats(t);
    let d = baseDe(a, mov.escala) * mov.pct * (1 + (a.bonos[mov.categoria] || 0));
    if (mov.bonoPorHpPerdido) {      // +X% por cada tramo completo de HP perdido del atacante
      const tramos = Math.floor((1 - a.hp / maxHp(a)) / mov.bonoPorHpPerdido.cada + 1e-9);
      d *= 1 + Math.max(0, tramos) * mov.bonoPorHpPerdido.pct;
    }
    if (ctx.cargas && mov.consumeCargas) d *= 1 + ctx.cargas * mov.consumeCargas.pct;   // cargas consumidas por este movimiento
    if (a.pasiva?.rival && esRival(a, t)) d *= 1 + a.pasiva.rival.bono;      // Rivalidad: más daño a su Rival
    if (mov.bonoContra && [].concat(mov.bonoContra.efecto).some(id => get(t, id))) d *= 1 + mov.bonoContra.pct;   // p. ej. Kirin contra quemados
    if (mov.bonoSiObjetivoMasHp && t.hp > a.hp) d *= 1 + mov.bonoSiObjetivoMasHp;   // p. ej. Asesino de Dioses
    if (mov.bonoPorEscudoPropio) d += a.escudo * mov.bonoPorEscudoPropio;   // + % de su propio Escudo (no lo gasta)
    const bb = a.pasiva?.bonoPorBuffsObjetivo;   // pasiva: +X% de daño por cada buff activo del objetivo (sin contar invocaciones), con tope
    if (bb && t.lado !== a.lado) d *= 1 + Math.min(t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && e.id !== 'summon').length * bb.pct, bb.max ?? 9);
    for (const l of lideresDe(a)) if (l.lider?.bonoContraConBuff && t.lado !== a.lado && tieneBuff(t)) d *= 1 + l.lider.bonoContraConBuff;   // líder: +X% a enemigos con buffs
    const bc = a.pasiva?.bonoContra;          // pasiva: +X% de daño a enemigos con un efecto (p. ej. Reptile contra envenenados)
    if (bc && [].concat(bc.efecto).some(id => get(t, id))) d *= 1 + bc.pct;
    if (mov.bonoPorDebuffs) {                // +pct por cada tipo distinto de debuff del objetivo (3 Venenos = 1 tipo)
      const tipos = new Set(t.estados.filter(e => EFECTOS[e.id]?.tipo === 'debuff').map(e => e.id));
      d *= 1 + tipos.size * mov.bonoPorDebuffs.pct;
    }
    if (mov.bonoPorAcumulacion) {             // movimiento: +X% por cada acumulación de un efecto en el objetivo (con tope)
      const b = mov.bonoPorAcumulacion;
      d *= 1 + Math.min(todos(t, b.efecto).length, b.max ?? 99) * b.pct;
    }
    const garantizado = mov.criticoSiHpMin !== undefined && t.hp / maxHp(t) >= mov.criticoSiHpMin;
    let probCrit = sa.critRate + (mov.critExtra || 0), danoCrit = sa.critDmg;
    if (mov.critExtraSi && ctx.teniaAntes?.has(mov.critExtraSi.teniaAntes)) probCrit += mov.critExtraSi.pct;   // +crítico si ya tenía X antes del movimiento
    for (const l of lideresDe(a)) {          // líder "bonoCriticoContra": +Prob. y +Daño Crítico al golpear a un enemigo con ese efecto
      const b = l.lider?.bonoCriticoContra;
      if (b && t.lado !== a.lado && get(t, b.efecto)) { probCrit += b.critRate || 0; danoCrit += b.critDmg || 0; }
    }
    const acc = a.pasiva?.acumulaCriticoContra;   // pasiva: cada golpe a un enemigo con X sube Prob. y Daño Crítico (permanente, con tope)
    if (acc && t.lado !== a.lado) {
      const e = get(t, acc.efecto);
      if (e) {
        const inc = e.mega && acc.valorMega != null ? acc.valorMega : acc.valor;
        let subio = 0;
        for (const k of ['critRate', 'critDmg']) {
          const antes = a.permanente[k] || 0, nuevo = Math.min(acc.tope, antes + inc);
          a.permanente[k] = nuevo; subio = Math.max(subio, nuevo - antes);
          if (k === 'critRate') probCrit += nuevo - antes; else danoCrit += nuevo - antes;
        }
        if (subio > 0) emitir('bonoVisible', { a: a.uid, texto: `+${Math.round(subio * 100)}% Prob. y Daño Crítico` }, a);
      }
    }
    const critico = !mov.sinCritico && (ctx.forzarCritico || garantizado || rng() < probCrit);   // sinCritico: este ataque no puede ser crítico
    if (critico && a.pasiva?.rival?.orgulloAlCritico) ganarOrgullo(a, 1);
    if (critico && t.pasiva?.rival?.orgulloAlRecibirCritico && t.lado !== a.lado) ganarOrgullo(t, 1);
    if (critico) d *= 1 + danoCrit;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    let quiebre = false;
    const hielo = get(t, 'freeze');
    // 1 golpe = 1 capa rota (+8%). Un golpe de un movimiento que APLICA Congelación no rompe capas (ayuda a mantenerlas)
    if (hielo?.capas > 0 && !(mov.efectos || []).some(ef => ef.accion?.id === 'freeze')) {
      d *= 1 + CONTROL.quiebreCongelacion; quiebre = true; hielo.capas--;
      if (hielo.mega && ctx.acum) ctx.acum.rompioMega = true;
    }
    let ignora = mov.ignoraArmadura || 0;
    if (mov.ignoraArmaduraSi && get(t, mov.ignoraArmaduraSi.efecto)) ignora += mov.ignoraArmaduraSi.puntos;   // solo si el objetivo tiene X
    d *= 1 - Math.min(Math.max(0, st.armor - ignora), TOPES.armor);   // ignorar Armadura: resta puntos
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    d *= 1 - reduccion(t, 'golpe');
    // pasiva "protector": un aliado de t recibe en su lugar un % del golpe (con su propia Armadura y reducciones)
    const prot = t.lado !== a.lado && aliadosDe(t).find(x => x !== t && x.pasiva?.protector && !conControl(x));
    if (prot && d > 0) {
      const pr = prot.pasiva.protector, parte = d * pr.pct;
      d -= parte;
      let d2 = parte * (1 - Math.min(stats(prot).armor, TOPES.armor)) * (1 - reduccion(prot, 'golpe'));
      const r2 = repartir(prot, d2, sa.pen);
      emitir('danoEfecto', { de: a.uid, a: prot.uid, dano: r2.aHp, escudo: r2.aEsc, color: 0xfacc15 }, prot);
      recibioDano(prot, r2.aHp + r2.aEsc, a);
      if (r2.aEsc > 0) perdioEscudo(prot);
      if (pr.cargas && !prot.muerto) ganarCargas(prot, 1, pr.cargas.max, pr.cargas.efecto);
      if (prot.hp <= 0) morir(prot, a);
    }
    const hpAntesGolpe = t.hp;
    const { aHp, aEsc } = repartir(t, d, sa.pen);
    if (ctx.acum) ctx.acum.dano += aHp + aEsc;
    const des = get(t, 'wear');                // Desgaste: cada golpe recibido (no bloqueado) quita 5 puntos más de Armadura
    if (des && des.valor < DEBUFFS.desgasteMax) des.valor = Math.min(DEBUFFS.desgasteMax, des.valor + DEBUFFS.desgaste);
    const robo = a.pasiva?.roboVida;          // robo de vida: % del daño causado (incluye lo absorbido por escudos)
    if (robo && !a.muerto && (get(a, 'solarBurn') || (a.hp < maxHp(a) && puedeCurarse(a)))) curar(a, a, (aHp + aEsc) * robo);
    emitir('golpe', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, critico, quiebre, color: mov.color, fuente: ctx.fuente, multi: (mov.golpes || 1) > 1 }, t);
    recibioDano(t, aHp + aEsc, a);
    // pasiva "cargasAlRecibirGolpe": cada golpe de un enemigo le da cargas (el doble si su Provocación lo indica); con Control no
    const cg = t.pasiva?.cargasAlRecibirGolpe;
    if (cg && !t.muerto && t.lado !== a.lado && !conControl(t)) ganarCargas(t, get(t, 'taunt')?.cargasX || 1, cg.max);
    pasivas(a, 'alGolpear', { objetivo: t });          // gatillo "cada vez que golpea" (filtro opcional: el objetivo tiene X)
    if (t.lado !== a.lado && aHp + aEsc > 0) pasivas(t, 'alRecibirGolpe', { atacante: a, recibido: aHp + aEsc });   // p. ej. Doom
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) {
      morir(t, a);
      // "sobrante": el daño que excedió al matar pasa a otro enemigo al azar (ya mitigado; sin crítico; una sola vez)
      const exceso = aHp - hpAntesGolpe, otros = mov.sobrante && t.muerto && t.lado !== a.lado ? enemigosDe(a) : [];
      if (exceso > 0 && otros.length && !a.muerto) {
        const d2 = rng.elegir(otros);
        emitir('golpeExtra', { id: a.uid, a: d2.uid });
        danoEfecto(a, d2, exceso, mov.color, { sinArmadura: true });
      }
    }
    if (get(t, 'mirror') && t.lado !== a.lado && !a.muerto && aHp + aEsc > 0)   // Espejismo: devuelve parte del golpe (daño por efecto, no es golpe)
      danoEfecto(t, a, (aHp + aEsc) * BUFFS.espejismo, 0x67e8f9);
    const aura = get(t, 'fireAura');
    if (aura && !t.muerto && !a.muerto && t.lado !== a.lado) {
      emitir('auraFuego', { a: t.uid, de: a.uid });
      intentarEfecto(t, a, { id: 'burn', valor: .05, dur: 1, prob: PUNTERIA.auraFuego });
    }
    if (get(t, 'frostAura') && !t.muerto && !a.muerto && t.lado !== a.lado) {
      emitir('auraGelida', { a: t.uid, de: a.uid });
      intentarEfecto(t, a, { id: 'freeze', prob: PUNTERIA.auraGelida });
    }
    if (critico) {
      const c = { objetivo: t, dano: aHp + aEsc };
      for (const ef of mov.efectos || []) if (ef.cuando === 'critico') ejecutarAccion(a, ef.accion, c);
      pasivas(a, 'alAcertarCritico', c);
    }
    if (!t.muerto) {
      const bl = get(t, 'bleed');
      if (bl) danoDoT(t, bl.valor, 'bleed', fuentesDe([bl]));
      const hm = get(t, 'hemo');
      if (hm && !t.muerto) { danoDoT(t, hm.valor, 'hemo', fuentesDe([hm])); hm.valor += DOT.hemorragiaCrece; emitir('actualizar', {}, t); }
    }
    // gatillo "al romperse una capa de hielo" de un ENEMIGO del dueño de la pasiva (solo por golpes)
    if (quiebre) for (const p of P) if (!p.muerto && p.lado !== t.lado && p.pasiva?.gatillo === 'alRomperCapa')
      reacciones.push(() => pasivas(p, 'alRomperCapa', { objetivo: t, rompio: a }));
    return critico;
  }

  // Daño por EFECTO: aplica Armadura y Escudo; no se bloquea, no es crítico y NO cuenta como golpe.
  function danoEfecto(a, t, cantidad, color, { sinArmadura = false } = {}) {
    if (t.muerto || cantidad <= 0) return;
    let d = cantidad;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    if (!sinArmadura) d *= 1 - Math.min(stats(t).armor, TOPES.armor);
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    d *= 1 - reduccion(t, 'efecto');
    const { aHp, aEsc } = repartir(t, d, stats(a).pen);
    emitir('danoEfecto', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, color }, t);
    recibioDano(t, aHp + aEsc, a);
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) morir(t, a);
  }

  // Gatillo "cuando un aliado (o uno mismo) pierde Escudo"
  function perdioEscudo(t) {
    for (const p of aliadosDe(t)) pasivas(p, 'alPerderEscudo', { objetivo: t });
  }

  // Daño DoT: % del HP máx.; ignora Armadura, Escudo y Bloqueo.
  function danoDoT(t, valor, tipo, fuente = null) {
    if (t.muerto) return;
    const d = valor * maxHp(t) * (1 - reduccion(t, 'dot'));
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo, dano: d }, t);
    recibioDano(t, d, fuente);
    if (t.hp <= 0) morir(t);
    for (const p of P) pasivas(p, 'alDanoDoT', { objetivo: t, tipo, dano: d });
    // líder "acumulaPorDoT": cada daño de ese DoT a un enemigo suma al bono del equipo (sin tope; se pierde si el líder muere)
    for (const l of P) { const ac = l.lider?.acumulaPorDoT;
      if (ac && l.esLider && !l.muerto && t.lado !== l.lado && ac.tipo === tipo) l.acumLider = (l.acumLider || 0) + ac.valor; }
  }

  // Robar HP: ignora Armadura y Escudo, no le afectan reducciones; cura al ladrón (lo que exceda su HP máx. se pierde).
  function robarHP(a, t, pct) {
    if (t.muerto || a.muerto) return;
    const d = pct * maxHp(t);
    t.hp -= d;
    emitir('robo', { de: a.uid, a: t.uid, cantidad: d }, t);
    recibioDano(t, d, a);
    if (t.hp <= 0) morir(t, a);
    curar(a, a, d, true);
  }

  const puedeCurarse = t => !get(t, 'plague') && !get(t, 'blackPlague') && !get(t, 'solarBurn');
  function curar(a, t, cantidad, silencioso = false) {
    if (t.muerto) return;
    if (get(t, 'solarBurn')) { danoSolar(t, cantidad); return; }      // Quemadura Solar: la curación hace daño (gana a la Peste)
    if (!puedeCurarse(t)) { emitir('sinEfecto', { a: t.uid, texto: '🦠 No puede curarse' }); return; }
    const real = Math.max(0, Math.min(cantidad, maxHp(t) - t.hp));
    t.hp += real;
    a.est.curacion += real;                                         // solo lo que realmente sanó
    emitir('curacion', { de: a.uid, a: t.uid, cantidad: real, robo: silencioso }, t);
    if (real > 0) for (const p of aliadosDe(t)) if (p !== t) pasivas(p, 'alCurarAliado', { objetivo: t, curacion: real });
  }

  // Quemadura Solar: el monto COMPLETO de la curación se vuelve daño. Ignora Armadura y Escudo, no se bloquea ni es crítico,
  // le afectan las reducciones de DoT y nadie recibe crédito si mata.
  function danoSolar(t, cantidad) {
    const d = cantidad * (1 - reduccion(t, 'dot'));
    if (d <= 0) return;
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo: 'solarBurn', dano: d }, t);
    recibioDano(t, d, fuentesDe([get(t, 'solarBurn')].filter(Boolean)));
    if (t.hp <= 0) morir(t);
  }

  function morir(t, asesino = null) {
    if (t.muerto) return;
    const ua = t.pasiva?.ultimoAliento;               // la primera vez que muere: queda con 1 HP (y puede transformarse)
    if (ua && !t.usoUltimoAliento) {
      t.usoUltimoAliento = true; t.hp = Math.max(1, (ua.hp || 0) * maxHp(t));   // hp: % de su HP máx. con el que queda (1 HP si no se indica)
      emitir('pasiva', { id: t.uid, nombre: t.pasiva.nombre });
      emitir('actualizar', {}, t);
      if (ua.transformar && t.transformacion && !t.forma) reacciones.push(() => { if (!t.muerto && !t.forma) transformar(t); });
      return;
    }
    const bombas = todos(t, 'bomb');
    const invocaciones = todos(t, 'summon').length;
    if (t.ultimoDanoDe && t.ultimoDanoDe.lado !== t.lado) t.ultimoDanoDe.est.elim++;   // la eliminación es de quien hizo el último daño
    const teniaAlMorir = new Set(t.estados.map(e => e.id));
    const rivalDe = P.filter(v => v.lado !== t.lado && !v.muerto && v.pasiva?.rival && esRival(v, t));
    t.muerto = true; t.hp = 0; t.escudo = 0; t.estados = [];
    emitir('muerte', { a: t.uid, invocaciones, lider: t.esLider && !!t.lider }, t);
    if (t.esLider && t.lider) for (const x of aliadosDe(t)) if (x.hp > maxHp(x)) { x.hp = maxHp(x); emitir('actualizar', {}, x); }
    const rv = t.pasiva?.revivir;                      // pasiva "revivir": vuelve tras N turnos (de cualquiera), una vez por partida
    if (rv && !t.revivio) { t.revivio = true; t.reviveEn = rv.turnos + (S.actual ? 1 : 0); emitir('extension', { a: t.uid, texto: `🐒 Revivirá en ${rv.turnos} turnos` }, t); }
    for (const b of bombas) explotarBomba(t, b, true);
    if (asesino && asesino.lado !== t.lado) pasivas(asesino, 'alEliminar', { objetivo: t });
    for (const v of rivalDe) {
      const b = v.pasiva.rival.alMorirRival || 0;
      if (b) { v.permanente.dmgPct = (v.permanente.dmgPct || 0) + b; emitir('bonoVisible', { a: v.uid, texto: `+${Math.round(b * 100)}% Daño permanente` }, v); }
      elegirRival(v);
    }
    for (const p of P.filter(x => x.lado !== t.lado && !x.muerto)) pasivas(p, 'alMorirEnemigo', { objetivo: t, teniaAlMorir });
  }

  function explotarBomba(t, b, soloSalpicadura) {
    const d = b.valor * maxHp(t);
    emitir('explosion', { a: t.uid, soloSalpicadura });
    if (!soloSalpicadura && !t.muerto) {
      const real = d * (1 - reduccion(t, 'dot'));
      t.hp -= real;
      emitir('dot', { a: t.uid, tipo: 'bomb', dano: real }, t);
      recibioDano(t, real, porUid(b.fuente));
      if (t.hp <= 0) morir(t);
    }
    for (const x of aliadosDe(t)) {
      if (x === t) continue;
      const s = d * DOT.salpicaduraBomba * (1 - reduccion(x, 'dot'));
      x.hp -= s;
      emitir('salpicadura', { a: x.uid, dano: s }, x);
      recibioDano(x, s, porUid(b.fuente));
      if (x.hp <= 0) morir(x);
    }
  }

  // ================================================================ efectos (buffs / debuffs)
  function intentarEfecto(a, t, acc) {
    const def = EFECTOS[acc.id];
    if (t.muerto) return;
    if (def.tipo === 'buff') { aplicarEfecto(a, t, acc); return; }       // los buffs a aliados siempre se aplican
    let prob = acc.prob;
    if (acc.probSiMasRapido != null && stats(t).spd > stats(a).spd) prob = acc.probSiMasRapido;
    if (acc.probSiConBuff != null && tieneBuff(t)) prob = acc.probSiConBuff;            // p. ej. ¡Te tengo!: 50% si tiene algún buff   // p. ej. Deep Freeze: 100% contra los más rápidos
    if (prob != null && rng() >= prob) return;                          // 1) probabilidad del movimiento (por defecto 100%): si falla, ni lo intenta
    const sa = stats(a), st = stats(t);                                  // 2) Puntería vs Resistencia
    const irresistible = acc.irresistible || (acc.irresistibleSi && get(t, acc.irresistibleSi));   // irresistible: siempre entra   // p. ej. Miedo de Loki contra envenenados
    if (!irresistible && rng() >= probAplicar(sa.acc, st.res)) { emitir('resistido', { a: t.uid, id: acc.id }); return; }
    aplicarEfecto(a, t, acc);
  }

  function aplicarEfecto(a, t, acc) {
    // Protección contra el bloqueo infinito: aplica a CUALQUIER vía (movimientos, pasivas, efectos garantizados)
    if (t.inmune && (CONTROL.pierdeTurno.includes(acc.id) || acc.id === 'silence')) { emitir('inmune', { a: t.uid }); return; }
    const inm = t.pasiva?.inmuneA;
    if (inm && (inm.includes(acc.id) || EFECTOS[acc.id].tags.some(tag => inm.includes(tag)))) { emitir('inmune', { a: t.uid, texto: `Inmune a ${EFECTOS[acc.id].nombre}` }); return; }
    const sa = stats(a);
    const def = EFECTOS[acc.id];
    if (def.tipo === 'buff' && get(t, 'blockBuffs')) { emitir('sinEfecto', { a: t.uid, texto: '🚫 Buffs bloqueados' }); return; }
    let texto = def.nombre, id = acc.id;
    const antes = new Set(t.estados);
    switch (acc.id) {
      case 'burn': {
        const v = acc.valorFinal ?? DOT.quemadura(acc.valor ?? .10, sa.dot);   // valorFinal: copia exacta (Propagar)
        const e = get(t, 'burn');
        if (e) {
          const debil = v < e.valor;              // "débil" = menor % final que la Quemadura activa
          if (!debil) e.fuente = a.uid;           // la Quemadura es de quien aplicó la más fuerte
          const f = Math.max(e.valor, v), d = Math.min(e.valor, v); e.valor = f + d * DOT.quemaduraSuma;
          if (!(debil && acc.noRenueva)) e.dur = Math.max(e.dur, acc.dur ?? 2);   // noRenueva: la débil no alarga la duración
          if (acc.inextinguible) e.inextinguible = true;
        }
        else t.estados.push({ id: 'burn', valor: v, dur: acc.dur ?? 2, fuente: a.uid, ...(acc.inextinguible ? { inextinguible: true } : {}) });
        texto = `${get(t, 'burn').inextinguible ? '⚫🔥 Amaterasu' : '🔥 Quemadura'} ${Math.round(get(t, 'burn').valor * 1000) / 10}%`;
        break;
      }
      case 'poison': {
        const v = acc.valorFinal ?? DOT.veneno(sa.dot), pila = todos(t, 'poison');
        if (pila.length < DOT.maxVeneno) t.estados.push({ id: 'poison', valor: v, dur: acc.dur ?? DOT.durVeneno, fuente: a.uid });
        else {
          const debil = pila.reduce((x, y) => (x.valor < y.valor || (x.valor === y.valor && x.dur < y.dur)) ? x : y);
          debil.valor = Math.max(debil.valor, v); debil.dur = acc.dur ?? DOT.durVeneno; debil.tocado = true; debil.fuente = a.uid;
        }
        texto = `🧪 Veneno ×${todos(t, 'poison').length}`;
        break;
      }
      case 'bleed': {
        if (get(t, 'hemo')) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Hemorragia' }); return; }
        const v = acc.valorFinal ?? DOT.sangrado(sa.dot), e = get(t, 'bleed');
        if (e) {
          e.valor = Math.max(e.valor, v);
          if (rng() < DOT.hemorragiaProb) {
            quitar(t, e); t.estados.push({ id: 'hemo', valor: e.valor, fuente: a.uid });
            id = 'hemo'; texto = '¡HEMORRAGIA!';
            break;
          }
        } else t.estados.push({ id: 'bleed', valor: v, fuente: a.uid });
        texto = `🩸 Sangrado ${Math.round(get(t, 'bleed').valor * 1000) / 10}%`;
        break;
      }
      case 'bomb': {
        if (todos(t, 'bomb').length >= DOT.maxBombas) { emitir('sinEfecto', { a: t.uid, texto: 'Máximo de bombas' }); return; }
        t.estados.push({ id: 'bomb', valor: acc.valorFinal ?? DOT.bomba(sa.dot), contador: acc.dur ?? DOT.contadorBomba, fuente: a.uid });
        texto = `💣 Bomba (${acc.dur ?? DOT.contadorBomba})`;
        break;
      }
      case 'hemo': {            // solo llega como copia (Propagar): reemplaza un Sangrado o mejora una Hemorragia
        const e = get(t, 'hemo');
        if (e) e.valor = Math.max(e.valor, acc.valorFinal ?? 0);
        else { const b = get(t, 'bleed'); if (b) quitar(t, b); t.estados.push({ id: 'hemo', valor: acc.valorFinal ?? DOT.sangrado(sa.dot), fuente: a.uid }); }
        texto = '¡HEMORRAGIA!';
        break;
      }
      case 'freeze': {          // 1 capa (−25% Vel). Congelar a quien ya está congelado = Mega (2 capas, −50%). A una Mega no le hace nada
        const e = get(t, 'freeze'), dur = acc.dur ?? CONTROL.durCongelacion;
        if (e?.mega) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Mega Congelación' }); return; }
        if (e) Object.assign(e, { mega: true, capas: 2, dur });
        else t.estados.push({ id: 'freeze', mega: !!acc.mega, capas: acc.capas ?? (acc.mega ? 2 : 1), dur });
        texto = get(t, 'freeze').mega ? def.mega : def.nombre;
        break;
      }
      case 'silence': {        // bloquea al azar uno de sus movimientos que NO esté en cooldown
        const e = get(t, 'silence');
        if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); texto = `🔇 ${NOMBRE_CAT[e.categoria]} silenciado`; break; }
        const listos = t.movimientos.filter(m => (t.cds[m.categoria] || 0) === 0);
        if (!listos.length) { emitir('sinEfecto', { a: t.uid, texto: 'Nada que silenciar' }); return; }
        const cat = rng.elegir(listos).categoria;
        t.estados.push({ id: 'silence', categoria: cat, dur: acc.dur ?? 2 });
        texto = `🔇 ${NOMBRE_CAT[cat]} silenciado`;
        break;
      }
      case 'wear': {           // sin duración: dura hasta que lo limpien
        if (get(t, 'wear')) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Desgaste' }); return; }
        t.estados.push({ id: 'wear', valor: acc.valorFinal ?? DEBUFFS.desgaste });
        break;
      }
      case 'plague': {         // Peste sobre Peste = Peste Negra
        const p1 = get(t, 'plague'), p2 = get(t, 'blackPlague'), dur = acc.dur ?? 2;
        if (p2) { p2.dur = Math.max(p2.dur, dur); id = 'blackPlague'; texto = EFECTOS.blackPlague.nombre; break; }
        if (p1) { quitar(t, p1); t.estados.push({ id: 'blackPlague', dur: Math.max(p1.dur, dur) }); id = 'blackPlague'; texto = '☠️ ¡PESTE NEGRA!'; break; }
        t.estados.push({ id: 'plague', dur });
        break;
      }
      case 'blackPlague': {    // solo llega como copia (Propagar)
        const p1 = get(t, 'plague'), p2 = get(t, 'blackPlague'), dur = acc.dur ?? 2;
        if (p2) { p2.dur = Math.max(p2.dur, dur); break; }
        if (p1) quitar(t, p1);
        t.estados.push({ id: 'blackPlague', dur });
        break;
      }
      case 'stun': case 'possess': {
        const turnos = acc.turnos ?? (acc.mega ? 2 : 1), e = get(t, acc.id);
        if (e) { e.turnos = Math.max(e.turnos, turnos); e.mega = e.mega || !!acc.mega; }
        else t.estados.push({ id: acc.id, turnos, mega: !!acc.mega });
        texto = acc.mega ? def.mega : def.nombre;
        break;
      }
      case 'confuse': case 'fear': case 'dmgUp': case 'taunt': case 'fireAura': case 'frostAura': case 'blockBuffs': case 'protect': case 'regen':
      case 'frenzy': case 'haste': case 'bloodlust': case 'keen': case 'weaken': case 'blind': case 'stealth': case 'pierce': case 'solarBurn': case 'aoeDodge': case 'incite': case 'mirror': {
        if (acc.id === 'stealth' && get(t, 'taunt')) { emitir('sinEfecto', { a: t.uid, texto: 'Con Provocación no puede tener Sigilo' }); return; }
        if (acc.id === 'taunt' && get(t, 'stealth')) { quitar(t, get(t, 'stealth')); emitir('sigiloRoto', { a: t.uid }, t); }
        if (acc.id === 'dmgUp') acc = { ...acc, valor: BUFFS.furia };      // Furia siempre +50%
        const e = get(t, acc.id);
        if (e?.permanente) { emitir('sinEfecto', { a: t.uid, texto: `Ya tiene ${def.nombre} permanente` }); return; }
        const extra = {};                     // alTerminar: acción al terminar el efecto por duración · cargasX: multiplica cargas ganadas
        if (acc.alTerminar) { extra.alTerminar = acc.alTerminar; extra.duenoTerminar = a.uid; }
        if (acc.cargasX) extra.cargasX = acc.cargasX;
        if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); if (acc.valor) e.valor = Math.max(e.valor || 0, acc.valor); if (acc.id === 'incite') e.fuente = a.uid; Object.assign(e, extra); }
        else t.estados.push({ id: acc.id, dur: acc.dur ?? 2, valor: acc.valor, fuente: a.uid, ...extra });
        if (acc.id === 'dmgUp') texto = `+${Math.round((acc.valor || 0) * 100)}% Daño`;
        break;
      }
    }
    if (S.actuaron.has(t) || S.actual === t) {       // ya actuó en esta ronda: la duración empieza a contar desde la siguiente
      const tocado = acc.id === 'poison' || acc.id === 'bomb' ? t.estados.filter(e => e.id === acc.id && (!antes.has(e) || e.tocado)) : [get(t, id)];
      for (const e of tocado) if (e) e.nuevo = true;
    }
    for (const e of t.estados) delete e.tocado;
    emitir('efecto', { a: t.uid, id, texto }, t);
    if (t.lado !== a.lado) liderAlAplicar(a, t, id);
    if (def.tipo === 'debuff' && a !== t) reacciones.push(() => pasivas(t, 'alRecibirDebuff', { atacante: a, efecto: id }));
    if (def.tipo === 'buff') for (const p of enemigosDe(t)) {      // pasiva "cargasPorBuffEnemigo": cada buff que recibe un enemigo le da 1 carga
      const cb = p.pasiva?.cargasPorBuffEnemigo;
      if (cb) ganarCargas(p, 1, cb.max, cb.efecto);
    }
  }

  // Líder con pieza "alAplicar": cada vez que su equipo acierta ese debuff en un enemigo, un aliado al azar gana un bono permanente
  function liderAlAplicar(a, t, id) {
    for (const l of lideresDe(a)) {
      const reg = l.lider?.alAplicar;
      if (!reg || reg.efecto !== id) continue;
      if (reg.accion) { ejecutarAccion(a, reg.accion, { objetivo: t }); continue; }
      const aliados = aliadosDe(l);
      if (!aliados.length) continue;
      const x = rng.elegir(aliados);
      x.permanente[reg.stat] = (x.permanente[reg.stat] || 0) + reg.valor;
      emitir('bonoOculto', { id: x.uid, texto: `+${Math.round(reg.valor * 100)}% Armadura`, lider: l.uid }, x);
    }
  }

  function limpiar(a, t, acc) {
    let deb = t.estados.filter(e => EFECTOS[e.id].tipo === 'debuff' && !e.inextinguible && (!acc.etiqueta || esDe(e, acc.etiqueta)));   // inextinguible: no se limpia
    if (acc.cantidad && deb.length > acc.cantidad) deb = [...deb].sort(() => rng() - .5).slice(0, acc.cantidad);
    t.estados = t.estados.filter(e => !deb.includes(e));
    emitir('limpieza', { de: a.uid, a: t.uid, n: deb.length }, t);
    return deb.length;
  }
  function disipar(a, t, acc) {
    const sa = stats(a), st = stats(t);
    let buf = t.estados.filter(e => EFECTOS[e.id].tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && (!acc.etiqueta || esDe(e, acc.etiqueta)));
    if (acc.cantidad && buf.length > acc.cantidad) buf = [...buf].sort(() => rng() - .5).slice(0, acc.cantidad);
    let n = 0;
    for (const b of buf) if (acc.sinTirada || rng() < probAplicar(sa.acc, st.res)) { quitar(t, b); n++; }   // sinTirada: quita sin tirar Puntería
    emitir('disipar', { de: a.uid, a: t.uid, n }, t);
  }

  // ================================================================ acciones universales
  function objetivosAccion(a, spec, ctx) {
    if (!spec || spec === 'objetivo') return ctx.objetivo ? [ctx.objetivo] : [];
    if (spec === 'propio') return [a];
    if (spec === 'ultimoAtacante') { const u = a.ultimoDanoDe; if (u && !u.muerto && u.lado !== a.lado) return [u]; const l = enemigosDe(a); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'atacante') return ctx.atacante && !ctx.atacante.muerto ? [ctx.atacante] : [];
    if (spec === 'todosEnemigos') return ctx.esMovimiento ? sinEsquiva(enemigosDe(a)) : enemigosDe(a);
    if (spec === 'otrosAliados') return aliadosDe(a).filter(x => x !== a);
    if (spec.otrosAliadosAzar) return [...aliadosDe(a).filter(x => x !== a)].sort(() => rng() - .5).slice(0, spec.otrosAliadosAzar);
    if (spec.aliadoAzarSin) { const l = aliadosDe(a).filter(x => !get(x, spec.aliadoAzarSin)); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'otrosEnemigos') return enemigosDe(a).filter(x => x !== ctx.objetivo);
    if (spec === 'otroEnemigoAzar') { const l = enemigosDe(a).filter(x => x !== ctx.objetivo); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'todosAliados') return aliadosDe(a);
    if (spec.enemigosCon) return enemigosDe(a).filter(x => x !== ctx.objetivo && [].concat(spec.enemigosCon).some(id => get(x, id)));
    if (spec.aliadosDistintos) return [...aliadosDe(a)].sort(() => rng() - .5).slice(0, spec.aliadosDistintos);
    if (spec === 'sobrevivientes') return (ctx.sobrevivientes || []).filter(x => !x.muerto);
    if (spec.aliadosAzar) return Array.from({ length: spec.aliadosAzar }, () => aliadosDe(a)).filter(l => l.length).map(l => rng.elegir(l));
    if (spec === 'aliadoMasHerido') { const l = aliadosDe(a); return l.length ? [l.reduce((x, y) => x.hp / maxHp(x) <= y.hp / maxHp(y) ? x : y)] : []; }
    if (spec.azarCon) {
      const { efecto, min = 1 } = spec.azarCon;
      let l = enemigosDe(a).filter(x => todos(x, efecto).length >= min);
      if (ctx.esMovimiento) l = l.filter(x => !get(x, 'aoeDodge'));
      return l.length ? [rng.elegir(l)] : [];
    }
    if (spec.azar) return Array.from({ length: spec.azar }, () => enemigosDe(a)).filter(l => l.length).map(l => rng.elegir(l));
    if (spec.distintos) return [...enemigosDe(a)].sort(() => rng() - .5).slice(0, spec.distintos);
    return [];
  }

  function ejecutarAccion(a, acc, ctx = {}) {
    for (const t of objetivosAccion(a, acc.a, ctx)) {
      if (t.muerto && acc.tipo !== 'curar') continue;
      switch (acc.tipo) {
        case 'efecto':
          for (let i = 0; i < (acc.veces || 1); i++) {
            if (!acc.idAzar) { intentarEfecto(a, t, acc); continue; }
            const ids = acc.sinRepetir ? acc.idAzar.filter(id => !get(t, id)) : acc.idAzar;   // sinRepetir: no elige uno que ya tenga
            if (!ids.length) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene todos' }); continue; }
            intentarEfecto(a, t, { ...acc, id: rng.elegir(ids) });
          }
          break;
        case 'curar': {
          const base = acc.base === 'hpMaxObjetivo' ? maxHp(t) : acc.base === 'curacion' ? (ctx.curacion || 0) : baseDe(a, acc.escala);
          const veces = acc.porCada ? (ctx[acc.porCada] || 0) : 1;     // porCada: 'eliminados' = una vez por cada enemigo eliminado
          if (veces > 0) curar(a, t, base * acc.pct * veces);
          break;
        }
        case 'bonoPermanente': {       // p. ej. +5% HP máx. por cada Quemadura activa en enemigos (permanente, sube también el HP actual)
          const n = acc.por === 'quemadurasEnemigas' ? enemigosDe(a).filter(x => get(x, 'burn')).length : 1;
          if (!n) { emitir('sinEfecto', { a: t.uid, texto: 'Sin quemaduras enemigas' }); break; }
          const antes = maxHp(t), actual = t.permanente[acc.stat] || 0;
          const suma = acc.tope != null ? Math.min(acc.pct * n, acc.tope - actual) : acc.pct * n;   // tope: máximo acumulado
          if (suma <= 1e-9) { emitir('sinEfecto', { a: t.uid, texto: `Máximo de ${NOMBRE_STAT[acc.stat] || acc.stat} alcanzado` }); break; }
          t.permanente[acc.stat] = actual + suma;
          t.hp += maxHp(t) - antes;
          emitir('bonoVisible', { a: t.uid, texto: `+${Math.round(suma * 100)}% ${NOMBRE_STAT[acc.stat] || acc.stat}` }, t);
          break;
        }
        case 'activarDoT': {           // hace el daño de un DoT al instante sin consumirlo (cuenta como daño DoT)
          const l = todos(t, acc.efecto);           // todas las acumulaciones (p. ej. 5 Venenos)
          if (l.length) danoDoT(t, l.reduce((s, x) => s + x.valor, 0), acc.efecto, a);
          break;
        }
        case 'extenderDuracion': {
          const e = get(t, acc.efecto);
          if (e) { e.dur += acc.rondas || 1; emitir('extension', { a: t.uid, texto: `🔥 +${acc.rondas || 1} ronda` }, t); }
          break;
        }
        case 'transformar': transformar(t, acc.turnos); break;
        case 'extenderInvocaciones': {      // +N turnos a todas sus invocaciones activas
          const l = todos(t, 'summon');
          if (!l.length) break;
          for (const e of l) e.dur += acc.turnos || 1;
          emitir('extension', { a: t.uid, texto: `✦ Invocaciones +${acc.turnos || 1} turno` }, t);
          break;
        }
        case 'reducirCooldown': {           // baja el cooldown de los movimientos indicados de su objetivo
          let n = 0;
          for (const c of acc.categorias || CATEGORIAS) if (t.cds[c] > 0) { t.cds[c] = Math.max(0, t.cds[c] - (acc.cantidad || 1)); n++; }
          if (n) emitir('extension', { a: t.uid, texto: `⏳ −${acc.cantidad || 1} cooldown` }, t);
          break;
        }
        case 'turnoExtra':
          t.turnosExtra = (t.turnosExtra || 0) + 1;
          emitir('turnoExtraGanado', { id: t.uid }, t);
          break;
        case 'multiple':      // aplica varias acciones a cada objetivo elegido (los mismos para todas)
          for (const sub of acc.acciones) ejecutarAccion(a, { ...sub, a: 'objetivo' }, { ...ctx, objetivo: t });
          break;
        case 'danoRepartido': {     // un total de daño por efecto repartido al azar (desigual) entre los enemigos
          const total = (acc.base === 'escudosEquipo' ? aliadosDe(a).reduce((s, x) => s + x.escudo, 0) : 0) * acc.pct;
          if (total < 1) { emitir('sinEfecto', { a: a.uid, texto: 'Sin escudos en el equipo' }); break; }
          const n = acc.paquetes || 10, porEnemigo = new Map();
          for (let i = 0; i < n; i++) { const e = rng.elegir(enemigosDe(a)); if (e) porEnemigo.set(e, (porEnemigo.get(e) || 0) + total / n); }
          for (const [e, d] of porEnemigo) danoEfecto(a, e, d, 0xfde68a);
          break;
        }
        case 'invocarAzar': invocarAzar(t, acc.tabla, acc.rarezas, acc.renueva); break;
        case 'potenciarInvocaciones': potenciarInvocaciones(t, acc.potencia || 1, acc.renovar, acc.veces || 1); break;
        case 'escudo': {
          const c = (acc.base === 'danoCausado' ? (ctx.danoCausado || 0) : acc.base === 'recibido' ? (ctx.recibido || 0) : baseDe(a, acc.escala)) * acc.pct;
          if (c <= 0) break;
          t.escudo += c;
          a.est.escudo += c;
          emitir('escudo', { de: a.uid, a: t.uid, cantidad: c }, t);
          break;
        }
        case 'limpiar': ctx.limpiados = (ctx.limpiados || 0) + limpiar(a, t, acc); break;
        case 'reiniciarCooldowns': {         // pone en 0 los cooldowns indicados del objetivo
          let n = 0;
          for (const c of acc.categorias || CATEGORIAS) if (t.cds[c] > 0) { t.cds[c] = 0; n++; }
          if (n) emitir('extension', { a: t.uid, texto: '⏳ Cooldowns reiniciados' }, t);
          break;
        }
        case 'golpesPorConteo': {            // un golpe a un enemigo al azar por cada unidad contada (p. ej. debuffs limpiados)
          const n = ctx[acc.conteo] || 0;
          for (let i = 0; i < n && !a.muerto; i++) {
            const e = rng.elegir(enemigosDe(a));
            if (!e) break;
            resolverSobreObjetivo(a, e, { nombre: acc.nombre || 'Golpe', categoria: acc.categoria || 'over', pct: acc.pct, escala: acc.escala || 'dano', color: acc.color }, {});
          }
          break;
        }
        case 'disipar': disipar(a, t, acc); break;
        case 'robarHP': robarHP(a, t, acc.pct); break;
        case 'ganarCargas': ganarCargas(t, acc.cantidad || 1, acc.max || 5, acc.efecto); break;   // p. ej. Espada del Poder
        case 'invocar': if (acc.prob == null || rng() < acc.prob) invocar(t, acc.key); break;   // p. ej. Clon de Sombra
        case 'reducirHpMax': {         // baja el HP máx. del objetivo para el resto de la partida (con tope); p. ej. Modo Barión
          const baja = Math.min(acc.pct, (acc.tope ?? 1) - (t.hpMaxReducido || 0));
          if (baja <= 1e-9) break;
          t.hpMaxReducido = (t.hpMaxReducido || 0) + baja;
          t.permanente.hpPct = (t.permanente.hpPct || 0) - baja;
          if (t.hp > maxHp(t)) t.hp = maxHp(t);
          emitir('bonoVisible', { a: t.uid, texto: `−${Math.round(baja * 100)}% HP máx.` }, t);
          break;
        }
        case 'hemorragia': {           // convierte el Sangrado del objetivo en Hemorragia (garantizado, sin tirada)
          const b = get(t, 'bleed');
          if (!b || get(t, 'hemo')) break;
          quitar(t, b); t.estados.push({ id: 'hemo', valor: b.valor, fuente: a.uid });
          emitir('efecto', { a: t.uid, id: 'hemo', texto: '¡HEMORRAGIA!' }, t);
          break;
        }
        case 'golpeDirecto':           // un golpe más a cada destino (p. ej. la Lanza de Draupnir explota sobre los que sangran)
          resolverSobreObjetivo(a, t, { nombre: acc.nombre || 'Golpe', categoria: 'efecto', pct: acc.pct, escala: acc.escala || 'dano', golpes: 1, color: acc.color }, {});
          break;
        case 'danoPorDebuffs': {       // p. ej. Apocalipsis: 10% del HP máx. por Congelación (o Mega) y por Posesión; ignora Armadura
          const n = acc.efectos.filter(id => ctx.teniaAntes?.has(id)).length;
          if (n) danoEfecto(a, t, n * acc.pct * maxHp(t), acc.color, { sinArmadura: true });
          break;
        }
        case 'transferirBuffs': {            // quita TODOS los buffs disipables del objetivo y se los da al aliado del ejecutor en su misma posición
          const lista = t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && e.id !== 'summon');
          if (!lista.length) break;
          const vivos = aliadosDe(a), para = vivos.find(x => x.pos === t.pos) || rng.elegir(vivos);   // si el de enfrente cayó: uno al azar
          if (!para) break;
          for (const e of lista) {
            quitar(t, e);
            const mio = get(para, e.id);
            if (mio) { if (!mio.permanente) mio.dur = Math.max(mio.dur ?? 0, e.dur ?? 0); if (e.valor) mio.valor = Math.max(mio.valor || 0, e.valor); }
            else para.estados.push({ ...e, nuevo: true, fuente: a.uid });
          }
          emitir('extension', { a: para.uid, texto: `🪄 +${lista.length} buff(s) de ${t.nombre}` }, para, t);
          break;
        }
        case 'activarCooldown': {            // pone el movimiento del objetivo en su cooldown COMPLETO (si era menor)
          if (acc.prob != null && rng() >= acc.prob) break;
          const m = t.movimientos.find(x => x.categoria === acc.categoria);
          if (!m || (t.cds[acc.categoria] || 0) >= (m.cd || 0)) break;
          t.cds[acc.categoria] = m.cd || 0;
          emitir('extension', { a: t.uid, texto: `⏳ ${NOMBRE_CAT[acc.categoria]} en cooldown (${m.cd})` }, t);
          break;
        }
        case 'robarBuffs': {                 // quita buffs al azar al objetivo y se los pasa al ejecutor (no invocaciones ni lo no disipable)
          const lista = t.estados.filter(e => EFECTOS[e.id]?.tipo === 'buff' && !EFECTOS[e.id].noDisipable && !e.permanente && e.id !== 'summon');
          for (const e of [...lista].sort(() => rng() - .5).slice(0, acc.cantidad || 1)) {
            quitar(t, e);
            const mio = get(a, e.id);
            if (mio) { mio.dur = Math.max(mio.dur ?? 0, e.dur ?? 0); if (e.valor) mio.valor = Math.max(mio.valor || 0, e.valor); }
            else a.estados.push({ ...e, nuevo: true, fuente: a.uid });
            emitir('extension', { a: a.uid, texto: `🪄 Roba ${EFECTOS[e.id].nombre}` }, a, t);
          }
          break;
        }
        case 'danoSegunEnemigos': {          // daño por efecto = suma de pct × HP máx. de cada enemigo con ese efecto (p. ej. Spear)
          const total = enemigosDe(a).filter(x => get(x, acc.efecto)).reduce((s, x) => s + maxHp(x) * acc.pct, 0);
          danoEfecto(a, t, total, 0xf59e0b);
          break;
        }
        case 'usarMovimiento': {            // usa uno de sus movimientos sobre el objetivo (funciona igual que el normal)
          const mov = a.movimientos.find(m => m.categoria === acc.categoria);
          const usar = d => { if (mov && !a.muerto && d && !d.muerto && get(a, 'silence')?.categoria !== acc.categoria) ejecutarMovimiento(a, mov, d, { reaccion: true, contraataque: !!acc.contraataque }); };
          // despues: espera a que termine el movimiento en curso; si su objetivo cayó, va a otro enemigo al azar
          if (acc.despues) reacciones.push(() => usar(t.muerto ? rng.elegir(enemigosDe(a)) : t));
          else usar(t);
          break;
        }
        case 'danoEfecto': danoEfecto(a, t, (ctx.dano || 0) * acc.fraccion, 0xc084fc); break;
        case 'replicarDoT': {
          const e = ctx.objetivo && get(ctx.objetivo, acc.efecto);
          if (e) danoEfecto(a, t, e.valor * acc.factor * maxHp(t), EFECTOS[acc.efecto].color);
          break;
        }
        case 'propagar': {     // copia un debuff del objetivo principal en su estado actual; cada copia tira Puntería
          // efecto: 'azar' = uno al azar entre los debuffs que el objetivo YA tenía antes del movimiento
          const id = acc.efecto !== 'azar' ? acc.efecto
            : (ctx._propagado ??= rng.elegir([...new Set((ctx.debuffsPrevios || []).map(e => e.id))]) || null);
          const src = id && ctx.estadoDe?.(id);
          if (src) intentarEfecto(a, t, copiaDe(src));
          break;
        }
        case 'detonar': {
          const bombas = todos(t, 'bomb');
          t.estados = t.estados.filter(e => e.id !== 'bomb');
          if (!bombas.length) emitir('sinEfecto', { a: t.uid, texto: 'Sin bombas' });
          for (const b of bombas) if (!t.muerto) explotarBomba(t, b, false);
          break;
        }
      }
    }
  }

  // Datos para aplicar una COPIA exacta de un debuff (Propagar): misma intensidad y duración restante
  function copiaDe(e) {
    const c = { id: e.id, valorFinal: e.valor, dur: e.dur };
    if (e.id === 'bomb') c.dur = e.contador;
    if (e.id === 'stun' || e.id === 'possess') { c.turnos = e.turnos; c.mega = e.mega; }
    if (e.id === 'freeze') { c.mega = e.mega; c.capas = e.capas || (e.mega ? 2 : 1); }
    return c;
  }

  function cumple(cond, ctx) {
    if (!cond) return true;
    if (cond.objetivoTiene) return !!(ctx.objetivo && get(ctx.objetivo, cond.objetivoTiene));
    if (cond.objetivoTeniaAntes) return [].concat(cond.objetivoTeniaAntes).some(id => ctx.teniaAntes?.has(id));
    if (cond.rompioMega) return !!ctx.rompioMega;
    if (cond.objetivoConBuff) return !!ctx.objetivo && tieneBuff(ctx.objetivo);
    if (cond.equipo) return !!ctx.ejecutor && tieneEquipo(ctx.ejecutor, cond.equipo);
    if (cond.enemigosCon) { const { efectos, min = 1 } = cond.enemigosCon; return !!ctx.ejecutor && enemigosDe(ctx.ejecutor).filter(x => [].concat(efectos).some(id => get(x, id))).length >= min; }      // algún golpe del movimiento rompió una capa de Mega Congelación
    if (cond.cargasConsumidasMin) return (ctx.cargas || 0) >= cond.cargasConsumidasMin;
    if (cond.objetivoEfectoDurMin) { const e = ctx.objetivo && get(ctx.objetivo, cond.objetivoEfectoDurMin.efecto); return !!e && (e.dur ?? 0) >= cond.objetivoEfectoDurMin.dur; }
    if (cond.algunGolpeadoTenia) return !!ctx.golpeadosTenian?.has(cond.algunGolpeadoTenia);
    if (cond.invocacionesMin) return (ctx.invocaciones || 0) >= cond.invocacionesMin;
    if (cond.objetivoEliminado) return !!ctx.objetivo?.muerto;
    if (cond.objetivoMasHpQueYo) return !!ctx.objetivo && !!ctx.atacante && (ctx.hpObjetivoAntes ?? ctx.objetivo.hp) > ctx.atacante.hp;
    if (cond.objetivoOverListo) {      // el objetivo tiene su Over listo para usar (sin cooldown ni Silencio)
      const t = ctx.objetivo;
      return !!t && t.movimientos.some(m => m.categoria === 'over') && !(t.cds.over > 0) && get(t, 'silence')?.categoria !== 'over';
    }
    return true;
  }

  // Gatillos de pasivas (una sola función para todos los personajes)
  function pasivas(p, gatillo, ctx, pa = p.pasiva) {
    if (p.muerto || !pa || pa.gatillo !== gatillo) return;
    if (pa.filtro?.tipo && pa.filtro.tipo !== ctx.tipo) return;
    if (pa.filtro?.en === 'enemigos' && (!ctx.objetivo || ctx.objetivo.lado === p.lado)) return;
    if (pa.filtro?.categorias && !pa.filtro.categorias.includes(ctx.categoria)) return;
    if (pa.filtro?.objetivoTiene && !(ctx.objetivo && get(ctx.objetivo, pa.filtro.objetivoTiene))) return;
    if (pa.filtro?.teniaAlMorir && !ctx.teniaAlMorir?.has(pa.filtro.teniaAlMorir)) return;
    if (pa.maxPorRonda && p.usosPasiva >= pa.maxPorRonda) return;
    if (pa.unaVezPorMovimiento) { if (p.movPasiva === movId) return; p.movPasiva = movId; }   // un solo intento por movimiento
    if (pa.prob != null && rng() >= pa.prob) return;      // probabilidad de la pasiva (si falla, no gasta el uso de la ronda)
    // soloSiCura: si nadie de los destinos puede recibir curación, no se activa ni gasta uso
    if (pa.soloSiCura && !objetivosAccion(p, pa.accion.a, ctx).some(t => !t.muerto && t.hp < maxHp(t) && puedeCurarse(t))) return;
    p.usosPasiva++;
    emitir('pasiva', { id: p.uid, nombre: pa.nombre });
    ejecutarAccion(p, pa.accion, ctx);
  }

  // ================================================================ transformaciones
  // La forma reemplaza estadísticas, movimientos y pasiva; conserva buffs, debuffs, escudos, invocaciones y el líder.
  // turnos = número -> temporal (vuelve a la forma base); sin turnos -> PERMANENTE. Una forma puede tener su propia
  // "transformacion" (cadena: Goku -> Super Saiyajin -> Super Saiyajin 3). Los buffs, debuffs y bonos permanentes se
  // conservan y se aplican sobre las estadísticas base de la nueva forma.
  function transformar(p, turnos) {
    const f = p.transformacion;
    if (!f || p.muerto || (p.forma && !p.forma.permanente)) return;
    const ratio = p.hp / maxHp(p), pasivaAntes = p.pasiva;
    if (!p.formaBase) p.formaBase = { base: p.base, extra: p.extra, pasiva: p.pasiva, movimientos: p.movimientos, cds: p.cds, transformacion: p.transformacion };
    p.base = f.base; p.extra = f.extra || {}; p.pasiva = f.pasiva || null; p.movimientos = clonar(f.movimientos);
    p.transformacion = f.transformacion || null;
    p.cds = { basico: 0, especial: 0, over: p.movimientos.find(m => m.categoria === 'over')?.cd || 0 };   // el Over empieza con su cooldown completo
    const permanente = !turnos;
    p.forma = { nombre: f.nombre, imagen: f.imagen, emoji: f.emoji, color: f.color, turnos: turnos || 0, total: turnos || 0, permanente, recien: true };
    if (permanente) p.formaBase = null;              // ya no hay vuelta atrás
    p.hp = ratio * maxHp(p);                          // se conserva el % de vida
    emitir('transformacion', { id: p.uid, nombre: f.nombre, color: f.color }, p);
    pasivas(p, 'alTransformarse', { objetivo: p }, pasivaAntes);   // usa la pasiva que tenía al transformarse
  }
  function revertir(p) {
    const ratio = p.hp / maxHp(p), b = p.formaBase;
    Object.assign(p, { base: b.base, extra: b.extra, pasiva: b.pasiva, movimientos: b.movimientos, cds: b.cds, transformacion: b.transformacion, forma: null, formaBase: null });
    p.hp = ratio * maxHp(p);
    emitir('transformacionFin', { id: p.uid }, p);
  }

  // ================================================================ invocaciones
  // Reglas generales: máximo 3 invocaciones activas por invocador; si está lleno, se reemplaza la de menor duración restante.
  // Un tipo ya activo se renueva (salvo que su "max" permita varias, como los Dragones de Ysera).
  const MAX_INVOCACIONES = 3;
  // Duración completa de una invocación con la regla general: si su invocador ya actuó (o está actuando) en esta ronda,
  // no pierde duración al final de ella. Así "dura N" = actúa N veces.
  function duracionCompleta(a, e) {
    e.dur = INVOCACIONES[e.key].dur;
    e.nuevo = S.actuaron.has(a) || S.actual === a;
  }

  function invocar(a, key) {
    const def = INVOCACIONES[key];
    const mismas = todos(a, 'summon').filter(e => e.key === key);
    if (mismas.length >= (def.max || 1)) {
      const vieja = mismas.reduce((x, y) => x.dur < y.dur ? x : y);
      duracionCompleta(a, vieja);
      emitir('invocacionRenueva', { de: a.uid, key }, a);
      return;
    }
    const activas = todos(a, 'summon');
    if (activas.length >= MAX_INVOCACIONES) {
      const sale = activas.reduce((x, y) => x.dur < y.dur ? x : y);
      a.estados = a.estados.filter(e => e !== sale);
      emitir('invocacionRetira', { de: a.uid, key: sale.key }, a);
    }
    const e = { id: 'summon', key, fresca: true };
    duracionCompleta(a, e);
    a.estados.push(e);
    emitir('invocacion', { de: a.uid, key, idx: todos(a, 'summon').length - 1, rareza: def.rareza }, a);
    for (const acc of def.alAparecer || []) accionInvocacion(a, e, acc, 1);
  }

  // Invocación aleatoria por pesos; nunca repite una que ya esté activa (si no se permiten varias de ese tipo)
  // renueva: si sale una invocación ya activa, se renueva en vez de volver a tirar (así se respetan los pesos de la tabla)
  function invocarAzar(a, tabla, rarezas, renueva = false) {
    const activas = new Set(todos(a, 'summon').map(e => e.key));
    const pool = (TABLAS_INVOCACION[tabla] || []).filter(x => (!rarezas || rarezas.includes(INVOCACIONES[x.key].rareza))
      && (renueva || !activas.has(x.key) || (INVOCACIONES[x.key].max || 1) > 1));
    if (!pool.length) { emitir('sinEfecto', { a: a.uid, texto: 'Todas sus invocaciones están activas' }); return; }
    let r = rng() * pool.reduce((s, x) => s + x.peso, 0);
    const elegido = pool.find(x => (r -= x.peso) < 0) || pool[pool.length - 1];
    invocar(a, elegido.key);
  }

  function elegirObjetivos(a, criterio) {
    const rivales = conProvocacion(enemigosDe(a));
    if (!rivales.length) return [];
    if (criterio === 'todos') return enemigosDe(a);
    if (criterio === 'menorHp') return [rivales.reduce((x, y) => x.hp / maxHp(x) < y.hp / maxHp(y) ? x : y)];
    if (criterio === 'masFuerte') return [rivales.reduce((x, y) => stats(x).dmg >= stats(y).dmg ? x : y)];
    return [rng.elegir(rivales)];
  }

  // Ejecuta UNA acción de una invocación. Los golpes usan las estadísticas del invocador; "potencia" multiplica los %.
  function accionInvocacion(a, e, acc, potencia, forzados) {
    if (a.muerto || S.fin) return;
    const def = INVOCACIONES[e.key];
    const idx = todos(a, 'summon').indexOf(e);
    if (acc.tipo === 'golpe') {
      for (const t of forzados || elegirObjetivos(a, acc.elegir)) {
        if (t.muerto) continue;
        emitir('invocacionAtaca', { de: a.uid, key: e.key, idx, a: t.uid });
        const extra = acc.golpeExtraSi && get(t, acc.golpeExtraSi) ? 1 : 0;   // p. ej. Drogon: 2.º golpe si tiene Quemadura
        resolverSobreObjetivo(a, t, { nombre: def.nombre, categoria: 'invocacion', pct: acc.pct * potencia, escala: acc.escala || 'dano',
          golpes: (acc.golpes || 1) + extra, color: def.color, efectos: acc.efectos }, { fuente: def.nombre });
        emitir('invocacionVuelve', { de: a.uid, key: e.key });
        procesarReacciones();
      }
      return;
    }
    emitir('invocacionActua', { de: a.uid, key: e.key, idx });
    ejecutarAccion(a, acc.pct ? { ...acc, pct: acc.pct * potencia } : acc, {});
  }

  function actuarInvocacion(a, e, potencia = 1) {
    for (const acc of INVOCACIONES[e.key].acciones || []) accionInvocacion(a, e, acc, potencia);
  }

  function actuanInvocaciones(a) {
    for (const e of todos(a, 'summon')) {
      if (e.fresca || a.muerto || S.fin) continue;
      if (!enemigosDe(a).length) return;
      actuarInvocacion(a, e);
    }
  }

  // Dominio del Monarca: todas actúan de inmediato con potencia extra y (opcional) renuevan su duración
  // veces: cuántas veces actúa cada invocación (en rondas: todas una vez, luego todas otra vez)
  function potenciarInvocaciones(a, potencia, renovar, veces = 1) {
    const lista = todos(a, 'summon');
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    emitir('dominio', { id: a.uid, potencia, veces }, a);
    for (let v = 0; v < veces; v++) for (const e of lista) {
      if (a.muerto || S.fin || !enemigosDe(a).length) break;
      actuarInvocacion(a, e, potencia);
    }
    if (renovar) for (const e of lista) duracionCompleta(a, e);
    emitir('actualizar', {}, a);
  }

  function desatar(a, mov) {
    const lista = todos(a, 'summon').filter(e => e.key === mov.desatar);
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    for (const e of lista) {
      const golpe = (INVOCACIONES[e.key].acciones || []).find(x => x.tipo === 'golpe') || {};
      accionInvocacion(a, e, { ...golpe, tipo: 'golpe', pct: mov.pctInvocacion }, 1, enemigosDe(a));
    }
    a.estados = a.estados.filter(e => !lista.includes(e));
    emitir('invocacionRetira', { de: a.uid, key: mov.desatar }, a);
  }

  // ================================================================ movimientos
  function resolverSobreObjetivo(a, t, mov, ctx = {}) {
    if (t.muerto) return;
    const hostil = t.lado !== a.lado || ctx.forzado;
    if (hostil && rng() < Math.min(stats(t).block, TOPES.block)) { emitir('bloqueo', { de: a.uid, a: t.uid }); return; }
    if (ctx.acum) for (const e of t.estados) ctx.acum.tenian.add(e.id);     // lo que tenía el objetivo al ser golpeado
    const hpObjetivoAntes = t.hp;
    const ctxGolpe = { ...ctx, teniaAntes: new Set(t.estados.map(e => e.id)) };   // lo que tenía ESTE objetivo antes del movimiento
    const efectosDelGolpe = () => {
      if (t.muerto) return;
      for (const ef of mov.efectos || []) {
        if (ef.cuando && ef.cuando !== 'objetivo') continue;
        const c = { objetivo: t, atacante: a, ejecutor: a, hpObjetivoAntes, cargas: ctx.cargas, teniaAntes: ctxGolpe.teniaAntes };
        if (cumple(ef.condicion, c)) ejecutarAccion(a, ef.accion, c);
      }
    };
    // cada golpe intenta sus efectos: 2 golpes al mismo objetivo = 2 tiradas
    let huboCritico = false;
    if (mov.pct) for (let i = 0; i < (mov.golpes || 1) && !t.muerto; i++) { huboCritico = golpear(a, t, mov, ctxGolpe) || huboCritico; efectosDelGolpe(); }
    else efectosDelGolpe();
    // pasiva "roboSiObjetivoTiene": roba % del HP máx. a quien ya tenía ese efecto al ser atacado (1 vez por movimiento y objetivo)
    const rb = a.pasiva?.roboSiObjetivoTiene;
    if (rb && mov.pct && !t.muerto && ctxGolpe.teniaAntes.has(rb.efecto) && t.lado !== a.lado && !(ctx.robados ||= new Set()).has(t)) {
      ctx.robados.add(t); robarHP(a, t, rb.pct);
    }
    // "golpeExtraContra": prob. de un golpe más (1 golpe) a OTRO enemigo con ese efecto; ese golpe no provoca otro
    const gx = mov.golpeExtraContra;
    if (gx && !a.muerto && rng() < gx.prob) {
      const l = enemigosDe(a).filter(x => x !== t && get(x, gx.efecto));
      if (l.length) { const d = rng.elegir(l); emitir('golpeExtra', { id: a.uid, a: d.uid }); resolverSobreObjetivo(a, d, { ...mov, golpes: 1, golpeExtraContra: null }, ctx); }
    }
    // "golpeExtraSiCritico": un golpe más (máximo uno) si alguno fue crítico; si el objetivo murió, va a un enemigo al azar
    if (mov.golpeExtraSiCritico && huboCritico && !a.muerto) {
      const destino = !t.muerto ? t : rng.elegir(enemigosDe(a));
      if (destino) { emitir('golpeExtra', { id: a.uid, a: destino.uid }); resolverSobreObjetivo(a, destino, { ...mov, golpes: 1, golpeExtraSiCritico: false }, ctx); }
    }
  }

  let movId = 0;                       // cuenta los movimientos ejecutados (pasivas "una vez por movimiento")
  function ejecutarMovimiento(a, mov, objetivo, ctx = {}) {
    movId++;
    profundidad++;
    moverse(a, mov, objetivo, ctx);
    profundidad--;
    procesarReacciones();
  }

  function moverse(a, mov, objetivo, ctx) {
    // Confusión: los movimientos de un solo objetivo pueden cambiar de objetivo
    if (!ctx.forzado && get(a, 'confuse') && (mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && rng() < CONTROL.confusionProb) {
      const nuevo = rng.elegir(P.filter(x => !x.muerto && x !== a));
      if (nuevo) { objetivo = nuevo; emitir('confundido', { id: a.uid, a: nuevo.uid }); }
    }
    // 'azar': cada golpe va a un enemigo al azar (puede repetir; ignora Provocación)
    const azar = mov.objetivo === 'azar' ? Array.from({ length: mov.golpes || 1 }, () => rng.elegir(enemigosDe(a))).filter(Boolean) : null;
    const objetivos = azar ? azar : mov.objetivo === 'todosEnemigos' ? sinEsquiva(enemigosDe(a))
      : mov.objetivo === 'todosAliados' ? aliadosDe(a)
        : mov.objetivo === 'propio' ? [a] : [objetivo].filter(Boolean);
    emitir('movimiento', { id: a.uid, categoria: mov.categoria, nombre: mov.nombre, estilo: mov.estilo, color: mov.color,
      objetivos: objetivos.map(t => t.uid), forzado: !!ctx.forzado });
    const atacanteTenia = new Set(a.estados.map(e => e.id));   // lo que tenía el atacante al empezar (para "atacado por un enemigo con X")

    if (mov.consumeCargas) {                          // consume todas sus cargas (de ese tipo): cada una suma daño a este movimiento
      const idc = mov.consumeCargas.efecto || 'cargas', e = get(a, idc);
      ctx = { ...ctx, cargas: e?.valor || 0 };
      if (e) { quitar(a, e); emitir('bono', { id: a.uid, texto: `${EFECTOS[idc].icono} ×${ctx.cargas} cargas` }, a); }
    }
    const hm = get(a, 'hemo');                       // Hemorragia: pierde HP al ejecutar un movimiento
    if (hm) danoDoT(a, hm.valor, 'hemo', fuentesDe([hm]));
    if (!ctx.forzado && !ctx.reaccion) a.cds[mov.categoria] = mov.cd || 0;
    if (mov.unaVez) (a.usados ||= new Set()).add(mov.nombre);

    if (!a.muerto) {
      const principal = objetivo || objetivos[0] || null;
      const invocacionesAntes = todos(a, 'summon').length;    // invocaciones activas al ejecutar el movimiento
      const vivosAlEmpezar = new Set(objetivos.filter(t => !t.muerto));
      const previos = principal ? clonar(principal.estados) : [];    // para Propagar aunque el objetivo muera
      const c = { ...ctx, acum: { dano: 0, tenian: new Set() } };
      if (mov.invocar) invocar(a, mov.invocar);
      else if (mov.desatar) desatar(a, mov);
      else if (azar) for (let t of azar) {
        if (t.muerto) t = rng.elegir(enemigosDe(a));        // si el elegido ya cayó, el golpe va a otro enemigo vivo
        if (t) resolverSobreObjetivo(a, t, { ...mov, golpes: 1 }, c);
      }
      else {
        for (const ef of mov.efectos || []) if (ef.cuando === 'antes')     // "antes": se aplican a cada objetivo ANTES de golpear
          for (const t of objetivos) if (!t.muerto) ejecutarAccion(a, ef.accion, { objetivo: t, ejecutor: a });
        for (const t of objetivos) resolverSobreObjetivo(a, t, mov, c);
      }

      const sobrevivientes = [...new Set(objetivos)].filter(t => !t.muerto && t.lado !== a.lado);
      const eliminados = [...new Set(objetivos)].filter(t => t.muerto && t.lado !== a.lado && vivosAlEmpezar.has(t)).length;
      const final = {
        ejecutor: a, sobrevivientes, eliminados, objetivo: principal, danoCausado: c.acum.dano, golpeadosTenian: c.acum.tenian, rompioMega: !!c.acum.rompioMega, invocaciones: invocacionesAntes, esMovimiento: true,
        estadoDe: id => (principal && !principal.muerto && get(principal, id)) || previos.find(e => e.id === id),
        debuffsPrevios: previos.filter(e => EFECTOS[e.id]?.tipo === 'debuff'),
      };
      for (const ef of mov.efectos || []) if (ef.cuando === 'final' && cumple(ef.condicion, final)) ejecutarAccion(a, ef.accion, final);
      if (mov.bonoPorSobreviviente && sobrevivientes.length) {
        a.bonos[mov.categoria] = (a.bonos[mov.categoria] || 0) + mov.bonoPorSobreviviente * sobrevivientes.length;
        emitir('bono', { id: a.uid, texto: `${mov.nombre} +${Math.round(a.bonos[mov.categoria] * 100)}%` }, a);
      }
    }
    emitir('movimientoFin', { id: a.uid, estilo: mov.estilo }, a);
    if (!ctx.contraataque && !ctx.forzado) for (const d of new Set(objetivos)) {
      if (d.lado === a.lado || d.muerto || d.pasiva?.gatillo !== 'alSerAtacado') continue;
      reacciones.push(() => {
        if (a.muerto || d.muerto) return;
        if (d.pasiva.filtro?.atacanteTiene && !atacanteTenia.has(d.pasiva.filtro.atacanteTiene)) return;   // ya lo tenía al atacar
        if (d.estados.some(e => CONTROL.pierdeTurno.includes(e.id) && (e.id !== 'freeze' || e.capas > 0))) return;   // con Control no contraataca
        pasivas(d, 'alSerAtacado', { objetivo: a, atacante: a });
      });
    }
    if (!ctx.forzado && !a.muerto) for (const p of enemigosDe(a)) pasivas(p, 'alUsarMovimientoEnemigo', { objetivo: a, categoria: mov.categoria });
    if (!ctx.forzado) for (const p of enemigosDe(a)) if (p.pasiva?.rival && esRival(p, a)) ganarOrgullo(p, 1);
  }

  // ================================================================ API pública
  function ejecutar(fn) {
    EV = [];
    fn();
    return { eventos: EV, esperando: S.esperando, fin: S.fin };
  }

  equipoJugador.forEach((d, i) => P.push(crearPersonaje(d, 'jugador', i)));
  equipoRival.forEach((d, i) => P.push(crearPersonaje(d, 'rival', i)));
  for (const p of P) if (p.pasiva?.rival) elegirRival(p, false);
  for (const p of P) p.hp = stats(p).hp;      // con todos creados: incluye bonos de líder al HP máx. (el líder se crea antes que su equipo)

  return {
    personajes: P,
    vista,
    stats,
    get esperando() { return S.esperando; },
    get ronda() { return S.ronda; },
    // Estadísticas de cada personaje en la partida (daño real causado, escudo otorgado, curación real, daño recibido, eliminaciones)
    estadisticas: () => P.map(p => ({ uid: p.uid, id: p.id, nombre: p.nombre, lado: p.lado, muerto: p.muerto, ...p.est,
      dano: Math.round(p.est.dano), escudo: Math.round(p.est.escudo), curacion: Math.round(p.est.curacion), recibido: Math.round(p.est.recibido) })),
    iniciar: () => ejecutar(avanzar),

    // El jugador (o la IA) decide: categoría del movimiento + uid del objetivo (si aplica)
    actuar({ categoria, objetivo }) {
      return ejecutar(() => {
        const a = S.actual;
        if (!a || !S.esperando) throw new Error('No es momento de actuar');
        const mov = a.movimientos.find(m => m.categoria === categoria);
        if (!mov || !opciones(a).find(o => o.categoria === categoria)?.disponible) throw new Error('Movimiento no disponible');
        const t = objetivo ? P.find(p => p.uid === objetivo) : null;
        if ((mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && !objetivosValidos(a, mov).includes(t)) throw new Error('Objetivo no válido');
        S.esperando = null;
        ejecutarMovimiento(a, mov, t);
        if (!a.muerto && !comprobarFin()) actuanInvocaciones(a);
        if (a.turnosExtra > 0 && !a.muerto && !comprobarFin() && opciones(a).some(o => o.disponible)) {   // turno extra: sin DoT, Regeneración ni control; no baja cooldowns
          a.turnosExtra--;
          emitir('turnoExtra', { id: a.uid }, a);
          S.esperando = { id: a.uid, opciones: opciones(a) };
          return;
        }
        a.turnosExtra = 0;
        terminarTurno(a);
        avanzar();
      });
    },

    // Barra de pruebas: aplica un efecto directamente sobre un personaje (solo durante el turno del jugador)
    probar(uid, tipo) {
      return ejecutar(() => {
        const t = P.find(p => p.uid === uid);
        if (!t || t.muerto || !S.esperando) return;
        const fuente = (t.lado === 'jugador' ? vivos('rival') : vivos('jugador'))[0] || t;
        const mov = { nombre: 'Prueba', categoria: 'prueba', pct: 1, escala: 'dano', color: 0xffd0a0 };
        switch (tipo) {
          case 'hit': golpear(fuente, t, mov, {}); break;
          case 'crit': golpear(fuente, t, mov, { forzarCritico: true }); break;
          case 'block': emitir('bloqueo', { de: fuente.uid, a: t.uid }); break;
          case 'heal': curar(t, t, maxHp(t) * .2); break;
          case 'shield': { const c = maxHp(t) * .2; t.escudo += c; emitir('escudo', { de: t.uid, a: t.uid, cantidad: c }, t); break; }
          case 'burn': aplicarEfecto(fuente, t, { id: 'burn', valor: .10, dur: 2 }); break;
          case 'poison': aplicarEfecto(fuente, t, { id: 'poison' }); break;
          case 'bleed': aplicarEfecto(fuente, t, { id: 'bleed' }); break;
          case 'bomb': explotarBomba(t, { valor: .2 }, false); break;
          case 'buff': aplicarEfecto(t, t, { id: 'dmgUp', valor: .25, dur: 2 }); break;
          case 'stun': aplicarEfecto(fuente, t, { id: 'stun' }); break;
          case 'freeze': aplicarEfecto(fuente, t, { id: 'freeze' }); break;
          case 'silence': aplicarEfecto(fuente, t, { id: 'silence', dur: 2 }); break;
          case 'blind': aplicarEfecto(fuente, t, { id: 'blind', dur: 2 }); break;
          case 'wear': aplicarEfecto(fuente, t, { id: 'wear' }); break;
          case 'plague': aplicarEfecto(fuente, t, { id: 'plague', dur: 2 }); break;
          case 'weaken': aplicarEfecto(fuente, t, { id: 'weaken', dur: 2 }); break;
          case 'pierce': aplicarEfecto(t, t, { id: 'pierce', dur: 2 }); break;
          case 'aoeDodge': aplicarEfecto(t, t, { id: 'aoeDodge', dur: 2 }); break;
          case 'solarBurn': aplicarEfecto(fuente, t, { id: 'solarBurn', dur: 2 }); break;
          case 'possess': aplicarEfecto(fuente, t, { id: 'possess' }); break;
          case 'confuse': aplicarEfecto(fuente, t, { id: 'confuse', dur: 2 }); break;
          case 'fear': aplicarEfecto(fuente, t, { id: 'fear', dur: 2 }); break;
          case 'cleanse': limpiar(t, t, {}); break;
          case 'tick': inicioTurno(t); break;
        }
        if (comprobarFin()) { S.esperando = null; return; }
        if (S.actual?.muerto) { S.esperando = null; terminarTurno(S.actual); avanzar(); return; }
        if (S.fin) S.esperando = null;
        else if (S.esperando) S.esperando = { id: S.esperando.id, opciones: opciones(P.find(p => p.uid === S.esperando.id)) };
      });
    },
  };
}
