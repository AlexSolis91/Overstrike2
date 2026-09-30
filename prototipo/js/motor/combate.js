// MOTOR DE COMBATE UNIVERSAL de Overstrike 2.
// - No sabe nada de la pantalla: aplica reglas y produce una lista de EVENTOS que la interfaz anima.
// - Ningún personaje tiene código propio: sus fichas solo combinan piezas (acciones, gatillos, condiciones, efectos).
// - Todo el azar pasa por un generador con semilla (misma semilla + mismas decisiones = misma partida).

import { BASE_COMUN, TOPES, ESCALADO, CD_INICIAL, CONTROL, DOT } from './reglas.js';
import { EFECTOS, esDe } from './efectos.js';
import { crearRng } from './rng.js';
import { RELIQUIAS } from '../datos/reliquias.js';
import { INVOCACIONES } from '../datos/invocaciones.js';

const CATEGORIAS = ['basico', 'especial', 'over'];
const clonar = o => JSON.parse(JSON.stringify(o));

export function crearCombate({ equipoJugador, equipoRival, semilla = Date.now() }) {
  const rng = crearRng(semilla);
  const P = [];
  const S = { ronda: 0, actuaron: new Set(), orden: [], actual: null, esperando: null, fin: null };
  let EV = [];

  // ================================================================ personajes
  function crearPersonaje(def, lado, pos) {
    const p = clonar(def);
    Object.assign(p, {
      uid: `${lado}-${pos}`, lado, pos, esLider: pos === 0 && !!def.lider,
      estados: [], escudo: 0, muerto: false, cds: {}, bonos: {}, desempate: rng(),
      inmune: false, recienLiberado: false,
    });
    for (const m of p.movimientos) p.cds[m.categoria] = CD_INICIAL[m.categoria] ?? 0;
    p.hp = stats(p).hp;
    return p;
  }

  function stats(p) {
    const b = p.base;
    const flat = { hp: 0, dmg: 0, spd: 0 }, pct = { hp: 0, dmg: 0, spd: 0 };
    const sec = { ...BASE_COMUN };
    for (const [k, v] of Object.entries(p.extra || {})) sec[k] = (sec[k] || 0) + v;
    for (const sl of p.slots || []) {
      const r = sl.relic && RELIQUIAS[sl.relic];
      if (!r) continue;
      flat[r.flat[0]] += r.flat[1];
      for (const [k, v] of r.rolls) {
        if (k.endsWith('Pct')) pct[k.slice(0, -3)] += v; else sec[k] += v;
      }
    }
    for (const e of p.estados) if (e.id === 'dmgUp') pct.dmg += e.valor;
    return {
      hp: (b.hp + flat.hp) * (1 + pct.hp),
      dmg: (b.dmg + flat.dmg) * (1 + pct.dmg),
      spd: (b.spd + flat.spd) * (1 + pct.spd),
      ...sec,
    };
  }
  const maxHp = p => stats(p).hp;
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
        case 'burn': texto = `${pctTxt(e.valor)} HP máx. al inicio del turno · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'bleed': texto = `${pctTxt(e.valor)} HP máx. por golpe recibido · hasta limpiarlo`; break;
        case 'hemo': texto = `${pctTxt(e.valor)} por golpe y por movimiento · +1 por golpe`; n = Math.round(e.valor * 100); break;
        case 'stun': case 'freeze': case 'possess':
          texto = e.id === 'possess' ? `Ataca a sus aliados · ${e.turnos} turno(s)` :
            e.id === 'freeze' ? `Pierde ${e.turnos} turno(s) · un golpe rompe el hielo (+30%)` : `Pierde ${e.turnos} turno(s)`;
          n = e.turnos; break;
        case 'confuse': texto = `50% de cambiar de objetivo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'fear': texto = `Actúa al final de la ronda · −25% de daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'dmgUp': texto = `+${Math.round(e.valor * 100)}% Daño · ${e.dur} ronda(s)`; n = e.dur; break;
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
      stats: stats(p), estados: vistaEstados(p), cds: { ...p.cds }, bonos: { ...p.bonos }, inmune: p.inmune,
      invocaciones: todos(p, 'summon').map(e => ({ key: e.key, dur: e.dur, fresca: !!e.fresca })),
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
    for (const p of P) p.desempate = rng();
    emitir('ronda', { n: S.ronda, orden: ordenActual() });
  }

  function finRonda() {
    const explotan = [];
    for (const p of P) {
      if (p.muerto) continue;
      for (const c of CATEGORIAS) if (p.cds[c] > 0) p.cds[c]--;
      for (const e of p.estados) {
        if (e.dur !== undefined) e.dur--;
        if (e.id === 'bomb') { e.contador--; if (e.contador <= 0) explotan.push([p, e]); }
      }
      todos(p, 'summon').filter(e => e.dur <= 0).forEach(e => emitir('invocacionExpira', { de: p.uid, key: e.key }));
      p.estados = p.estados.filter(e => (e.dur === undefined || e.dur > 0) && !(e.id === 'bomb' && e.contador <= 0));
    }
    for (const [p, b] of explotan) if (!p.muerto) explotarBomba(p, b, false);
    emitir('finRonda', {}, ...P);
  }

  function inicioTurno(p) {
    const q = get(p, 'burn');
    if (q) danoDoT(p, q.valor, 'burn');
    const v = todos(p, 'poison');
    if (v.length && !p.muerto) danoDoT(p, v.reduce((s, x) => s + x.valor, 0), 'poison');
  }

  // Devuelve true si el personaje no puede elegir su acción este turno (perdió el turno o está poseído)
  function procesarControl(p) {
    const c = p.estados.find(e => CONTROL.pierdeTurno.includes(e.id));
    if (!c) return false;
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
    S.actuaron.add(p); S.orden.push(p.uid);
    if (p.inmune && !p.recienLiberado) p.inmune = false;
    p.recienLiberado = false;
    for (const e of todos(p, 'summon')) e.fresca = false;
    S.actual = null;
  }

  function comprobarFin() {
    if (S.fin) return true;
    const gj = vivos('jugador').length, gr = vivos('rival').length;
    if (gj && gr) return false;
    S.fin = { ganador: gj ? 'jugador' : 'rival', ronda: S.ronda };
    emitir('fin', S.fin);
    return true;
  }

  function avanzar() {
    while (!comprobarFin()) {
      let n = S.ronda ? siguiente() : null;
      if (!n) {
        if (S.ronda) { finRonda(); if (comprobarFin()) return; }
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
      S.esperando = { id: n.uid, opciones: opciones(n) };
      return;
    }
  }

  function opciones(p) {
    return p.movimientos.map(m => ({
      categoria: m.categoria,
      disponible: (p.cds[m.categoria] || 0) === 0,
      cd: p.cds[m.categoria] || 0,
      objetivos: objetivosValidos(p, m).map(t => t.uid),
    }));
  }
  function objetivosValidos(p, m) {
    if (m.objetivo === 'enemigo') return enemigosDe(p);
    if (m.objetivo === 'aliado') return aliadosDe(p);
    return [];
  }

  // ================================================================ daño
  function reduccion(t, categoria) {
    let r = 0;
    for (const l of lideresDe(t)) if (l.lider?.reduccion?.categoria === categoria) r += l.lider.reduccion.pct;
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

  // Un GOLPE: Crítico -> (Miedo) -> (quiebre de Congelación) -> Armadura -> reducciones -> Perforación/Escudo
  function golpear(a, t, mov, ctx) {
    const sa = stats(a), st = stats(t);
    let d = baseDe(a, mov.escala) * mov.pct * (1 + (a.bonos[mov.categoria] || 0));
    const critico = ctx.forzarCritico || rng() < sa.critRate;
    if (critico) d *= 1 + sa.critDmg;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    let quiebre = false;
    const hielo = get(t, 'freeze');
    if (hielo) {
      d *= 1 + CONTROL.quiebreCongelacion; quiebre = true;
      if (hielo.mega) { hielo.mega = false; hielo.turnos = Math.min(hielo.turnos, 1); } else quitar(t, hielo);
    }
    d *= 1 - Math.min(st.armor, TOPES.armor);
    d *= 1 - reduccion(t, 'golpe');
    const { aHp, aEsc } = repartir(t, d, sa.pen);
    emitir('golpe', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, critico, quiebre, color: mov.color, fuente: ctx.fuente, multi: (mov.golpes || 1) > 1 }, t);
    if (t.hp <= 0) morir(t);
    if (critico) {
      const c = { objetivo: t, dano: aHp + aEsc };
      for (const ef of mov.efectos || []) if (ef.cuando === 'critico') ejecutarAccion(a, ef.accion, c);
      pasivas(a, 'alAcertarCritico', c);
    }
    if (!t.muerto) {
      const bl = get(t, 'bleed');
      if (bl) danoDoT(t, bl.valor, 'bleed');
      const hm = get(t, 'hemo');
      if (hm && !t.muerto) { danoDoT(t, hm.valor, 'hemo'); hm.valor += DOT.hemorragiaCrece; emitir('actualizar', {}, t); }
    }
  }

  // Daño por EFECTO: aplica Armadura y Escudo; no se bloquea, no es crítico y NO cuenta como golpe.
  function danoEfecto(a, t, cantidad, color) {
    if (t.muerto || cantidad <= 0) return;
    let d = cantidad;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    d *= 1 - Math.min(stats(t).armor, TOPES.armor);
    d *= 1 - reduccion(t, 'efecto');
    const { aHp, aEsc } = repartir(t, d, stats(a).pen);
    emitir('danoEfecto', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, color }, t);
    if (t.hp <= 0) morir(t);
  }

  // Daño DoT: % del HP máx.; ignora Armadura, Escudo y Bloqueo.
  function danoDoT(t, valor, tipo) {
    if (t.muerto) return;
    const d = valor * maxHp(t) * (1 - reduccion(t, 'dot'));
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo, dano: d }, t);
    if (t.hp <= 0) morir(t);
  }

  // Robar HP: ignora Armadura y Escudo, no le afectan reducciones; cura al ladrón (lo que exceda su HP máx. se pierde).
  function robarHP(a, t, pct) {
    if (t.muerto || a.muerto) return;
    const d = pct * maxHp(t);
    t.hp -= d;
    emitir('robo', { de: a.uid, a: t.uid, cantidad: d }, t);
    if (t.hp <= 0) morir(t);
    curar(a, a, d, true);
  }

  function curar(a, t, cantidad, silencioso = false) {
    if (t.muerto) return;
    const real = Math.max(0, Math.min(cantidad, maxHp(t) - t.hp));
    t.hp += real;
    emitir('curacion', { de: a.uid, a: t.uid, cantidad: real, robo: silencioso }, t);
  }

  function morir(t) {
    if (t.muerto) return;
    const bombas = todos(t, 'bomb');
    const invocaciones = todos(t, 'summon').length;
    t.muerto = true; t.hp = 0; t.escudo = 0; t.estados = [];
    emitir('muerte', { a: t.uid, invocaciones, lider: t.esLider && !!t.lider }, t);
    for (const b of bombas) explotarBomba(t, b, true);
  }

  function explotarBomba(t, b, soloSalpicadura) {
    const d = b.valor * maxHp(t);
    emitir('explosion', { a: t.uid, soloSalpicadura });
    if (!soloSalpicadura && !t.muerto) {
      const real = d * (1 - reduccion(t, 'dot'));
      t.hp -= real;
      emitir('dot', { a: t.uid, tipo: 'bomb', dano: real }, t);
      if (t.hp <= 0) morir(t);
    }
    for (const x of aliadosDe(t)) {
      if (x === t) continue;
      const s = d * DOT.salpicaduraBomba * (1 - reduccion(x, 'dot'));
      x.hp -= s;
      emitir('salpicadura', { a: x.uid, dano: s }, x);
      if (x.hp <= 0) morir(x);
    }
  }

  // ================================================================ efectos (buffs / debuffs)
  function intentarEfecto(a, t, acc) {
    const def = EFECTOS[acc.id];
    if (t.muerto) return;
    const sa = stats(a), st = stats(t);
    const prob = def.tipo === 'debuff' ? sa.acc - st.res : Math.min(sa.acc, 1);
    if (rng() >= prob) { emitir('resistido', { a: t.uid, id: acc.id }); return; }
    aplicarEfecto(a, t, acc);
  }

  function aplicarEfecto(a, t, acc) {
    // Protección contra el bloqueo infinito: aplica a CUALQUIER vía (movimientos, pasivas, efectos garantizados)
    if (t.inmune && CONTROL.pierdeTurno.includes(acc.id)) { emitir('inmune', { a: t.uid }); return; }
    const sa = stats(a);
    const def = EFECTOS[acc.id];
    let texto = def.nombre, id = acc.id;
    switch (acc.id) {
      case 'burn': {
        const v = DOT.quemadura(acc.valor ?? .10, sa.dot);
        const e = get(t, 'burn');
        if (e) { const f = Math.max(e.valor, v), d = Math.min(e.valor, v); e.valor = f + d * DOT.quemaduraSuma; e.dur = Math.max(e.dur, acc.dur ?? 2); }
        else t.estados.push({ id: 'burn', valor: v, dur: acc.dur ?? 2 });
        texto = `🔥 Quemadura ${Math.round(get(t, 'burn').valor * 1000) / 10}%`;
        break;
      }
      case 'poison': {
        const v = DOT.veneno(sa.dot), pila = todos(t, 'poison');
        if (pila.length < DOT.maxVeneno) t.estados.push({ id: 'poison', valor: v, dur: acc.dur ?? DOT.durVeneno });
        else {
          const debil = pila.reduce((x, y) => (x.valor < y.valor || (x.valor === y.valor && x.dur < y.dur)) ? x : y);
          debil.valor = Math.max(debil.valor, v); debil.dur = acc.dur ?? DOT.durVeneno;
        }
        texto = `🧪 Veneno ×${todos(t, 'poison').length}`;
        break;
      }
      case 'bleed': {
        if (get(t, 'hemo')) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Hemorragia' }); return; }
        const v = DOT.sangrado(sa.dot), e = get(t, 'bleed');
        if (e) {
          e.valor = Math.max(e.valor, v);
          if (rng() < DOT.hemorragiaProb) {
            quitar(t, e); t.estados.push({ id: 'hemo', valor: e.valor });
            id = 'hemo'; texto = '¡HEMORRAGIA!';
            break;
          }
        } else t.estados.push({ id: 'bleed', valor: v });
        texto = `🩸 Sangrado ${Math.round(get(t, 'bleed').valor * 1000) / 10}%`;
        break;
      }
      case 'bomb': {
        if (todos(t, 'bomb').length >= DOT.maxBombas) { emitir('sinEfecto', { a: t.uid, texto: 'Máximo de bombas' }); return; }
        t.estados.push({ id: 'bomb', valor: DOT.bomba(sa.dot), contador: acc.dur ?? DOT.contadorBomba });
        texto = `💣 Bomba (${acc.dur ?? DOT.contadorBomba})`;
        break;
      }
      case 'stun': case 'freeze': case 'possess': {
        const turnos = acc.mega ? 2 : 1, e = get(t, acc.id);
        if (e) { e.turnos = Math.max(e.turnos, turnos); e.mega = e.mega || !!acc.mega; }
        else t.estados.push({ id: acc.id, turnos, mega: !!acc.mega });
        texto = acc.mega ? def.mega : def.nombre;
        break;
      }
      case 'confuse': case 'fear': case 'dmgUp': {
        const e = get(t, acc.id);
        if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); if (acc.valor) e.valor = Math.max(e.valor || 0, acc.valor); }
        else t.estados.push({ id: acc.id, dur: acc.dur ?? 2, valor: acc.valor });
        if (acc.id === 'dmgUp') texto = `+${Math.round((acc.valor || 0) * 100)}% Daño`;
        break;
      }
    }
    emitir('efecto', { a: t.uid, id, texto }, t);
  }

  function limpiar(a, t, acc) {
    let deb = t.estados.filter(e => EFECTOS[e.id].tipo === 'debuff' && (!acc.etiqueta || esDe(e, acc.etiqueta)));
    if (acc.cantidad && deb.length > acc.cantidad) deb = [...deb].sort(() => rng() - .5).slice(0, acc.cantidad);
    t.estados = t.estados.filter(e => !deb.includes(e));
    emitir('limpieza', { de: a.uid, a: t.uid, n: deb.length }, t);
  }
  function disipar(a, t, acc) {
    const sa = stats(a), st = stats(t);
    let buf = t.estados.filter(e => EFECTOS[e.id].tipo === 'buff' && (!acc.etiqueta || esDe(e, acc.etiqueta)));
    if (acc.cantidad && buf.length > acc.cantidad) buf = [...buf].sort(() => rng() - .5).slice(0, acc.cantidad);
    let n = 0;
    for (const b of buf) if (rng() < sa.acc - st.res) { quitar(t, b); n++; }
    emitir('disipar', { de: a.uid, a: t.uid, n }, t);
  }

  // ================================================================ acciones universales
  function objetivosAccion(a, spec, ctx) {
    if (!spec || spec === 'objetivo') return ctx.objetivo ? [ctx.objetivo] : [];
    if (spec === 'propio') return [a];
    if (spec === 'todosEnemigos') return enemigosDe(a);
    if (spec === 'otrosEnemigos') return enemigosDe(a).filter(x => x !== ctx.objetivo);
    if (spec === 'todosAliados') return aliadosDe(a);
    if (spec === 'sobrevivientes') return (ctx.sobrevivientes || []).filter(x => !x.muerto);
    if (spec.azar) return Array.from({ length: spec.azar }, () => enemigosDe(a)).filter(l => l.length).map(l => rng.elegir(l));
    return [];
  }

  function ejecutarAccion(a, acc, ctx = {}) {
    for (const t of objetivosAccion(a, acc.a, ctx)) {
      if (t.muerto && acc.tipo !== 'curar') continue;
      switch (acc.tipo) {
        case 'efecto':
          for (let i = 0; i < (acc.veces || 1); i++) intentarEfecto(a, t, acc);
          break;
        case 'curar': curar(a, t, baseDe(a, acc.escala) * acc.pct); break;
        case 'escudo': {
          const c = baseDe(a, acc.escala) * acc.pct;
          t.escudo += c;
          emitir('escudo', { de: a.uid, a: t.uid, cantidad: c }, t);
          break;
        }
        case 'limpiar': limpiar(a, t, acc); break;
        case 'disipar': disipar(a, t, acc); break;
        case 'robarHP': robarHP(a, t, acc.pct); break;
        case 'danoEfecto': danoEfecto(a, t, (ctx.dano || 0) * acc.fraccion, 0xc084fc); break;
        case 'replicarDoT': {
          const e = ctx.objetivo && get(ctx.objetivo, acc.efecto);
          if (e) danoEfecto(a, t, e.valor * acc.factor * maxHp(t), EFECTOS[acc.efecto].color);
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

  function cumple(cond, ctx) {
    if (!cond) return true;
    if (cond.objetivoTiene) return !!(ctx.objetivo && get(ctx.objetivo, cond.objetivoTiene));
    return true;
  }

  // Gatillos de pasivas (una sola función para todos los personajes)
  function pasivas(p, gatillo, ctx) {
    if (p.muerto || !p.pasiva || p.pasiva.gatillo !== gatillo) return;
    emitir('pasiva', { id: p.uid, nombre: p.pasiva.nombre });
    ejecutarAccion(p, p.pasiva.accion, ctx);
  }

  // ================================================================ invocaciones
  function invocar(a, key) {
    const def = INVOCACIONES[key];
    const mismas = todos(a, 'summon').filter(e => e.key === key);
    if (def.max === 1) {
      for (const e of todos(a, 'summon')) emitir('invocacionRetira', { de: a.uid, key: e.key });
      a.estados = a.estados.filter(e => e.id !== 'summon');
    } else if (mismas.length >= def.max) {
      const vieja = mismas.reduce((x, y) => x.dur < y.dur ? x : y);
      vieja.dur = def.dur;
      emitir('invocacionRenueva', { de: a.uid, key }, a);
      return;
    } else {
      a.estados = a.estados.filter(e => e.id !== 'summon' || e.key === key);
    }
    a.estados.push({ id: 'summon', key, dur: def.dur, fresca: true });
    emitir('invocacion', { de: a.uid, key, idx: todos(a, 'summon').length - 1 }, a);
  }

  function ataqueInvocacion(a, e, t, pct) {
    const def = INVOCACIONES[e.key];
    emitir('invocacionAtaca', { de: a.uid, key: e.key, idx: todos(a, 'summon').indexOf(e), a: t.uid });
    resolverSobreObjetivo(a, t, { nombre: def.nombre, categoria: 'invocacion', pct, escala: def.escala, golpes: def.golpes,
      color: def.color, efectos: def.efectos }, { fuente: def.nombre });
    emitir('invocacionVuelve', { de: a.uid, key: e.key });
  }

  function actuanInvocaciones(a) {
    for (const e of todos(a, 'summon')) {
      if (e.fresca || a.muerto || S.fin) continue;
      const rivales = enemigosDe(a);
      if (!rivales.length) return;
      const def = INVOCACIONES[e.key];
      const t = def.elegir === 'menorHp' ? rivales.reduce((x, y) => x.hp / maxHp(x) < y.hp / maxHp(y) ? x : y) : rng.elegir(rivales);
      ataqueInvocacion(a, e, t, def.pct);
    }
  }

  function desatar(a, mov) {
    const lista = todos(a, 'summon').filter(e => e.key === mov.desatar);
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    for (const e of lista) for (const t of enemigosDe(a)) ataqueInvocacion(a, e, t, mov.pctInvocacion);
    a.estados = a.estados.filter(e => !lista.includes(e));
    emitir('invocacionRetira', { de: a.uid, key: mov.desatar }, a);
  }

  // ================================================================ movimientos
  function resolverSobreObjetivo(a, t, mov, ctx = {}) {
    if (t.muerto) return;
    const hostil = t.lado !== a.lado || ctx.forzado;
    if (hostil && rng() < Math.min(stats(t).block, TOPES.block)) { emitir('bloqueo', { de: a.uid, a: t.uid }); return; }
    if (mov.pct) for (let i = 0; i < (mov.golpes || 1) && !t.muerto; i++) golpear(a, t, mov, ctx);
    if (t.muerto) return;
    for (const ef of mov.efectos || []) {
      if (ef.cuando && ef.cuando !== 'objetivo') continue;
      if (cumple(ef.condicion, { objetivo: t })) ejecutarAccion(a, ef.accion, { objetivo: t });
    }
  }

  function ejecutarMovimiento(a, mov, objetivo, ctx = {}) {
    // Confusión: los movimientos de un solo objetivo pueden cambiar de objetivo
    if (!ctx.forzado && get(a, 'confuse') && (mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && rng() < CONTROL.confusionProb) {
      const nuevo = rng.elegir(P.filter(x => !x.muerto && x !== a));
      if (nuevo) { objetivo = nuevo; emitir('confundido', { id: a.uid, a: nuevo.uid }); }
    }
    const objetivos = mov.objetivo === 'todosEnemigos' ? enemigosDe(a)
      : mov.objetivo === 'todosAliados' ? aliadosDe(a)
        : mov.objetivo === 'propio' ? [a] : [objetivo].filter(Boolean);
    emitir('movimiento', { id: a.uid, categoria: mov.categoria, nombre: mov.nombre, estilo: mov.estilo, color: mov.color,
      objetivos: objetivos.map(t => t.uid), forzado: !!ctx.forzado });

    const hm = get(a, 'hemo');                       // Hemorragia: pierde HP al ejecutar un movimiento
    if (hm) danoDoT(a, hm.valor, 'hemo');
    if (!ctx.forzado) a.cds[mov.categoria] = mov.cd || 0;

    if (!a.muerto) {
      if (mov.invocar) invocar(a, mov.invocar);
      else if (mov.desatar) desatar(a, mov);
      else for (const t of objetivos) resolverSobreObjetivo(a, t, mov, ctx);

      const sobrevivientes = objetivos.filter(t => !t.muerto && t.lado !== a.lado);
      for (const ef of mov.efectos || []) if (ef.cuando === 'final') ejecutarAccion(a, ef.accion, { sobrevivientes });
      if (mov.bonoPorSobreviviente && sobrevivientes.length) {
        a.bonos[mov.categoria] = (a.bonos[mov.categoria] || 0) + mov.bonoPorSobreviviente * sobrevivientes.length;
        emitir('bono', { id: a.uid, texto: `${mov.nombre} +${Math.round(a.bonos[mov.categoria] * 100)}%` }, a);
      }
    }
    emitir('movimientoFin', { id: a.uid, estilo: mov.estilo }, a);
  }

  // ================================================================ API pública
  function ejecutar(fn) {
    EV = [];
    fn();
    return { eventos: EV, esperando: S.esperando, fin: S.fin };
  }

  equipoJugador.forEach((d, i) => P.push(crearPersonaje(d, 'jugador', i)));
  equipoRival.forEach((d, i) => P.push(crearPersonaje(d, 'rival', i)));

  return {
    personajes: P,
    vista,
    stats,
    get esperando() { return S.esperando; },
    get ronda() { return S.ronda; },
    iniciar: () => ejecutar(avanzar),

    // El jugador (o la IA) decide: categoría del movimiento + uid del objetivo (si aplica)
    actuar({ categoria, objetivo }) {
      return ejecutar(() => {
        const a = S.actual;
        if (!a || !S.esperando) throw new Error('No es momento de actuar');
        const mov = a.movimientos.find(m => m.categoria === categoria);
        if (!mov || (a.cds[categoria] || 0) > 0) throw new Error('Movimiento no disponible');
        const t = objetivo ? P.find(p => p.uid === objetivo) : null;
        if ((mov.objetivo === 'enemigo' || mov.objetivo === 'aliado') && !objetivosValidos(a, mov).includes(t)) throw new Error('Objetivo no válido');
        S.esperando = null;
        ejecutarMovimiento(a, mov, t);
        if (!a.muerto && !comprobarFin()) actuanInvocaciones(a);
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
