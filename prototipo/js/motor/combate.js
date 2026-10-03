// MOTOR DE COMBATE UNIVERSAL de Overstrike 2.
// - No sabe nada de la pantalla: aplica reglas y produce una lista de EVENTOS que la interfaz anima.
// - Ningún personaje tiene código propio: sus fichas solo combinan piezas (acciones, gatillos, condiciones, efectos).
// - Todo el azar pasa por un generador con semilla (misma semilla + mismas decisiones = misma partida).

import { BASE_COMUN, TOPES, ESCALADO, CD_INICIAL, CONTROL, DOT, BUFFS, DEBUFFS } from './reglas.js';
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

  // ================================================================ personajes
  function crearPersonaje(def, lado, pos) {
    const p = clonar(def);
    Object.assign(p, {
      uid: `${lado}-${pos}`, lado, pos, esLider: pos === 0 && !!def.lider,
      estados: [], escudo: 0, muerto: false, cds: {}, bonos: {}, desempate: rng(),
      inmune: false, recienLiberado: false,
      permanente: {},        // bonos permanentes e invisibles (p. ej. Armadura de un líder); no se disipan
      usosPasiva: 0,         // activaciones de la pasiva en la ronda actual (para "máximo X por ronda")
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
    for (const e of p.estados) {
      if (e.id === 'dmgUp') pct.dmg += e.valor;
      if (e.id === 'protect') sec.res += BUFFS.proteccion;
      if (e.id === 'frenzy') sec.critRate += BUFFS.frenesi;
      if (e.id === 'haste') pct.spd += BUFFS.celeridad;
      if (e.id === 'bloodlust') sec.critDmg += BUFFS.sedDeSangre;
      if (e.id === 'keen') sec.acc += BUFFS.agudeza;
      if (e.id === 'pierce') sec.pen += BUFFS.perforacion;
      if (e.id === 'blind') sec.acc -= DEBUFFS.ceguera;
      if (e.id === 'wear') sec.armor -= e.valor;
      if (e.id === 'freeze') pct.spd -= CONTROL.congelacionVel * (e.mega ? 2 : 1);
    }
    sec.armor = Math.max(0, sec.armor); sec.acc = Math.max(0, sec.acc);   // Armadura y Puntería nunca bajan de 0%
    for (const l of lideresDe(p)) {          // líder "bonoPorEfecto": +valor a una estadística por cada enemigo con ese efecto
      const b = l.lider?.bonoPorEfecto;
      if (b) sec[b.stat] = (sec[b.stat] || 0) + b.valor * enemigosDe(p).filter(x => get(x, b.efecto)).length;
    }
    for (const [k, v] of Object.entries(p.permanente || {})) {
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
        case 'taunt': texto = `Los enemigos deben atacarlo con sus movimientos de un objetivo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'pierce': texto = `+${Math.round(BUFFS.perforacion * 100)}% Penetración de escudo · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'solarBurn': texto = `Las curaciones le hacen daño (ignora Armadura y Escudo) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'aoeDodge': texto = `Esquiva los movimientos de área de los enemigos (daño y efectos) · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'stealth': texto = `Los enemigos no pueden elegirlo con ataques de un objetivo · se rompe al recibir daño · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'protect': texto = `+${Math.round(BUFFS.proteccion * 100)}% Resistencia · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'frenzy': texto = `+${Math.round(BUFFS.frenesi * 100)}% Prob. Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'haste': texto = `+${Math.round(BUFFS.celeridad * 100)}% Velocidad · ${e.dur} ronda(s)`; n = e.dur; break;
        case 'bloodlust': texto = `+${Math.round(BUFFS.sedDeSangre * 100)}% Daño Crítico · ${e.dur} ronda(s)`; n = e.dur; break;
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
      stats: stats(p), estados: vistaEstados(p), cds: { ...p.cds }, silenciado: get(p, 'silence')?.categoria || null, bonos: { ...p.bonos }, inmune: p.inmune,
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
  }

  function finRonda() {
    const explotan = [];
    for (const p of P) {
      if (p.muerto) continue;
      for (const c of CATEGORIAS) if (p.cds[c] > 0) p.cds[c]--;
      if (p.formaBase) for (const c of CATEGORIAS) if (p.formaBase.cds[c] > 0) p.formaBase.cds[c]--;
      for (const e of p.estados) {
        // Regla general: un efecto aplicado a alguien que YA actuó en esta ronda no pierde duración al final de ella
        const salta = e.nuevo; e.nuevo = false;
        if (salta) continue;
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
    if (get(p, 'regen')) curar(p, p, maxHp(p) * BUFFS.regeneracion);
    const q = get(p, 'burn');
    if (q) danoDoT(p, q.valor, 'burn');
    const v = todos(p, 'poison');
    if (v.length && !p.muerto) danoDoT(p, v.reduce((s, x) => s + x.valor, 0), 'poison');
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

  function opciones(p) {
    return p.movimientos.map(m => ({
      categoria: m.categoria,
      disponible: (p.cds[m.categoria] || 0) === 0 && get(p, 'silence')?.categoria !== m.categoria,
      cd: p.cds[m.categoria] || 0,
      objetivos: objetivosValidos(p, m).map(t => t.uid),
    }));
  }
  function objetivosValidos(p, m) {
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
  function recibioDano(t, cantidad) {
    const s = cantidad > 0 && !t.muerto && get(t, 'stealth');
    if (s) { quitar(t, s); emitir('sigiloRoto', { a: t.uid }, t); }
  }
  // Provocación: si algún candidato la tiene, los ataques de un solo objetivo solo pueden ir a ellos
  function conProvocacion(lista) {
    const prov = lista.filter(x => get(x, 'taunt'));
    return prov.length ? prov : lista;
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

  // Un GOLPE: Crítico -> (Miedo) -> (quiebre de Congelación) -> Armadura -> reducciones -> Penetración de escudo/Escudo
  function golpear(a, t, mov, ctx) {
    const sa = stats(a), st = stats(t);
    let d = baseDe(a, mov.escala) * mov.pct * (1 + (a.bonos[mov.categoria] || 0));
    if (mov.bonoPorHpPerdido) {      // +X% por cada tramo completo de HP perdido del atacante
      const tramos = Math.floor((1 - a.hp / maxHp(a)) / mov.bonoPorHpPerdido.cada + 1e-9);
      d *= 1 + Math.max(0, tramos) * mov.bonoPorHpPerdido.pct;
    }
    const bc = a.pasiva?.bonoContra;          // pasiva: +X% de daño a enemigos con un efecto (p. ej. Reptile contra envenenados)
    if (bc && get(t, bc.efecto)) d *= 1 + bc.pct;
    if (mov.bonoPorAcumulacion) {             // movimiento: +X% por cada acumulación de un efecto en el objetivo (con tope)
      const b = mov.bonoPorAcumulacion;
      d *= 1 + Math.min(todos(t, b.efecto).length, b.max ?? 99) * b.pct;
    }
    const garantizado = mov.criticoSiHpMin !== undefined && t.hp / maxHp(t) >= mov.criticoSiHpMin;
    const critico = ctx.forzarCritico || garantizado || rng() < sa.critRate + (mov.critExtra || 0);
    if (critico) d *= 1 + sa.critDmg;
    if (get(a, 'fear')) d *= CONTROL.miedoDano;
    let quiebre = false;
    const hielo = get(t, 'freeze');
    // 1 golpe = 1 capa rota (+8%). Un golpe de un movimiento que APLICA Congelación no rompe capas (ayuda a mantenerlas)
    if (hielo?.capas > 0 && !(mov.efectos || []).some(ef => ef.accion?.id === 'freeze')) {
      d *= 1 + CONTROL.quiebreCongelacion; quiebre = true; hielo.capas--;
    }
    d *= 1 - Math.min(Math.max(0, st.armor - (mov.ignoraArmadura || 0)), TOPES.armor);   // ignorar Armadura: resta puntos
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    d *= 1 - reduccion(t, 'golpe');
    const { aHp, aEsc } = repartir(t, d, sa.pen);
    if (ctx.acum) ctx.acum.dano += aHp + aEsc;
    const des = get(t, 'wear');                // Desgaste: cada golpe recibido (no bloqueado) quita 5 puntos más de Armadura
    if (des && des.valor < DEBUFFS.desgasteMax) des.valor = Math.min(DEBUFFS.desgasteMax, des.valor + DEBUFFS.desgaste);
    const robo = a.pasiva?.roboVida;          // robo de vida: % del daño causado (incluye lo absorbido por escudos)
    if (robo && !a.muerto && (get(a, 'solarBurn') || (a.hp < maxHp(a) && puedeCurarse(a)))) curar(a, a, (aHp + aEsc) * robo);
    emitir('golpe', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, critico, quiebre, color: mov.color, fuente: ctx.fuente, multi: (mov.golpes || 1) > 1 }, t);
    recibioDano(t, aHp + aEsc);
    pasivas(a, 'alGolpear', { objetivo: t });          // gatillo "cada vez que golpea" (filtro opcional: el objetivo tiene X)
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) morir(t, a);
    const aura = get(t, 'fireAura');
    if (aura && !t.muerto && !a.muerto && t.lado !== a.lado) {
      emitir('auraFuego', { a: t.uid, de: a.uid });
      intentarEfecto(t, a, { id: 'burn', valor: .05, dur: 1 });
    }
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
    if (get(t, 'weaken')) d *= 1 + DEBUFFS.debilitar;
    d *= 1 - reduccion(t, 'efecto');
    const { aHp, aEsc } = repartir(t, d, stats(a).pen);
    emitir('danoEfecto', { de: a.uid, a: t.uid, dano: aHp, escudo: aEsc, color }, t);
    recibioDano(t, aHp + aEsc);
    if (aEsc > 0) perdioEscudo(t);
    if (t.hp <= 0) morir(t, a);
  }

  // Gatillo "cuando un aliado (o uno mismo) pierde Escudo"
  function perdioEscudo(t) {
    for (const p of aliadosDe(t)) pasivas(p, 'alPerderEscudo', { objetivo: t });
  }

  // Daño DoT: % del HP máx.; ignora Armadura, Escudo y Bloqueo.
  function danoDoT(t, valor, tipo) {
    if (t.muerto) return;
    const d = valor * maxHp(t) * (1 - reduccion(t, 'dot'));
    t.hp -= d;
    emitir('dot', { a: t.uid, tipo, dano: d }, t);
    recibioDano(t, d);
    if (t.hp <= 0) morir(t);
    for (const p of P) pasivas(p, 'alDanoDoT', { objetivo: t, tipo, dano: d });
  }

  // Robar HP: ignora Armadura y Escudo, no le afectan reducciones; cura al ladrón (lo que exceda su HP máx. se pierde).
  function robarHP(a, t, pct) {
    if (t.muerto || a.muerto) return;
    const d = pct * maxHp(t);
    t.hp -= d;
    emitir('robo', { de: a.uid, a: t.uid, cantidad: d }, t);
    recibioDano(t, d);
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
    recibioDano(t, d);
    if (t.hp <= 0) morir(t);
  }

  function morir(t, asesino = null) {
    if (t.muerto) return;
    const bombas = todos(t, 'bomb');
    const invocaciones = todos(t, 'summon').length;
    t.muerto = true; t.hp = 0; t.escudo = 0; t.estados = [];
    emitir('muerte', { a: t.uid, invocaciones, lider: t.esLider && !!t.lider }, t);
    for (const b of bombas) explotarBomba(t, b, true);
    if (asesino && asesino.lado !== t.lado) pasivas(asesino, 'alEliminar', { objetivo: t });
  }

  function explotarBomba(t, b, soloSalpicadura) {
    const d = b.valor * maxHp(t);
    emitir('explosion', { a: t.uid, soloSalpicadura });
    if (!soloSalpicadura && !t.muerto) {
      const real = d * (1 - reduccion(t, 'dot'));
      t.hp -= real;
      emitir('dot', { a: t.uid, tipo: 'bomb', dano: real }, t);
      recibioDano(t, real);
      if (t.hp <= 0) morir(t);
    }
    for (const x of aliadosDe(t)) {
      if (x === t) continue;
      const s = d * DOT.salpicaduraBomba * (1 - reduccion(x, 'dot'));
      x.hp -= s;
      emitir('salpicadura', { a: x.uid, dano: s }, x);
      recibioDano(x, s);
      if (x.hp <= 0) morir(x);
    }
  }

  // ================================================================ efectos (buffs / debuffs)
  function intentarEfecto(a, t, acc) {
    const def = EFECTOS[acc.id];
    if (t.muerto) return;
    if (def.tipo === 'buff') { aplicarEfecto(a, t, acc); return; }       // los buffs a aliados siempre se aplican
    const sa = stats(a), st = stats(t);
    if (rng() >= sa.acc - st.res) { emitir('resistido', { a: t.uid, id: acc.id }); return; }
    aplicarEfecto(a, t, acc);
  }

  function aplicarEfecto(a, t, acc) {
    // Protección contra el bloqueo infinito: aplica a CUALQUIER vía (movimientos, pasivas, efectos garantizados)
    if (t.inmune && (CONTROL.pierdeTurno.includes(acc.id) || acc.id === 'silence')) { emitir('inmune', { a: t.uid }); return; }
    const inm = t.pasiva?.inmuneA;
    if (inm && (inm.includes(acc.id) || EFECTOS[acc.id].tags.some(tag => inm.includes(tag)))) { emitir('inmune', { a: t.uid, texto: `Inmune a ${EFECTOS[acc.id].nombre}` }); return; }
    const sa = stats(a);
    const def = EFECTOS[acc.id];
    let texto = def.nombre, id = acc.id;
    const antes = new Set(t.estados);
    switch (acc.id) {
      case 'burn': {
        const v = acc.valorFinal ?? DOT.quemadura(acc.valor ?? .10, sa.dot);   // valorFinal: copia exacta (Propagar)
        const e = get(t, 'burn');
        if (e) {
          const debil = v < e.valor;              // "débil" = menor % final que la Quemadura activa
          const f = Math.max(e.valor, v), d = Math.min(e.valor, v); e.valor = f + d * DOT.quemaduraSuma;
          if (!(debil && acc.noRenueva)) e.dur = Math.max(e.dur, acc.dur ?? 2);   // noRenueva: la débil no alarga la duración
        }
        else t.estados.push({ id: 'burn', valor: v, dur: acc.dur ?? 2 });
        texto = `🔥 Quemadura ${Math.round(get(t, 'burn').valor * 1000) / 10}%`;
        break;
      }
      case 'poison': {
        const v = DOT.veneno(sa.dot), pila = todos(t, 'poison');
        if (pila.length < DOT.maxVeneno) t.estados.push({ id: 'poison', valor: v, dur: acc.dur ?? DOT.durVeneno });
        else {
          const debil = pila.reduce((x, y) => (x.valor < y.valor || (x.valor === y.valor && x.dur < y.dur)) ? x : y);
          debil.valor = Math.max(debil.valor, v); debil.dur = acc.dur ?? DOT.durVeneno; debil.tocado = true;
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
      case 'freeze': {          // 1 capa (−25% Vel). Congelar a quien ya está congelado = Mega (2 capas, −50%). A una Mega no le hace nada
        const e = get(t, 'freeze'), dur = acc.dur ?? CONTROL.durCongelacion;
        if (e?.mega) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene Mega Congelación' }); return; }
        if (e) Object.assign(e, { mega: true, capas: 2, dur });
        else t.estados.push({ id: 'freeze', mega: !!acc.mega, capas: acc.mega ? 2 : 1, dur });
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
        t.estados.push({ id: 'wear', valor: DEBUFFS.desgaste });
        break;
      }
      case 'plague': {         // Peste sobre Peste = Peste Negra
        const p1 = get(t, 'plague'), p2 = get(t, 'blackPlague'), dur = acc.dur ?? 2;
        if (p2) { p2.dur = Math.max(p2.dur, dur); id = 'blackPlague'; texto = EFECTOS.blackPlague.nombre; break; }
        if (p1) { quitar(t, p1); t.estados.push({ id: 'blackPlague', dur: Math.max(p1.dur, dur) }); id = 'blackPlague'; texto = '☠️ ¡PESTE NEGRA!'; break; }
        t.estados.push({ id: 'plague', dur });
        break;
      }
      case 'stun': case 'possess': {
        const turnos = acc.mega ? 2 : 1, e = get(t, acc.id);
        if (e) { e.turnos = Math.max(e.turnos, turnos); e.mega = e.mega || !!acc.mega; }
        else t.estados.push({ id: acc.id, turnos, mega: !!acc.mega });
        texto = acc.mega ? def.mega : def.nombre;
        break;
      }
      case 'confuse': case 'fear': case 'dmgUp': case 'taunt': case 'fireAura': case 'protect': case 'regen':
      case 'frenzy': case 'haste': case 'bloodlust': case 'keen': case 'weaken': case 'blind': case 'stealth': case 'pierce': case 'solarBurn': case 'aoeDodge': {
        if (acc.id === 'stealth' && get(t, 'taunt')) { emitir('sinEfecto', { a: t.uid, texto: 'Con Provocación no puede tener Sigilo' }); return; }
        if (acc.id === 'taunt' && get(t, 'stealth')) { quitar(t, get(t, 'stealth')); emitir('sigiloRoto', { a: t.uid }, t); }
        if (acc.id === 'dmgUp') acc = { ...acc, valor: BUFFS.furia };      // Furia siempre +50%
        const e = get(t, acc.id);
        if (e) { e.dur = Math.max(e.dur, acc.dur ?? 2); if (acc.valor) e.valor = Math.max(e.valor || 0, acc.valor); }
        else t.estados.push({ id: acc.id, dur: acc.dur ?? 2, valor: acc.valor });
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
  }

  // Líder con pieza "alAplicar": cada vez que su equipo acierta ese debuff en un enemigo, un aliado al azar gana un bono permanente
  function liderAlAplicar(a, t, id) {
    for (const l of lideresDe(a)) {
      const reg = l.lider?.alAplicar;
      if (!reg || reg.efecto !== id) continue;
      const aliados = aliadosDe(l);
      if (!aliados.length) continue;
      const x = rng.elegir(aliados);
      x.permanente[reg.stat] = (x.permanente[reg.stat] || 0) + reg.valor;
      emitir('bonoOculto', { id: x.uid, texto: `+${Math.round(reg.valor * 100)}% Armadura`, lider: l.uid }, x);
    }
  }

  function limpiar(a, t, acc) {
    let deb = t.estados.filter(e => EFECTOS[e.id].tipo === 'debuff' && (!acc.etiqueta || esDe(e, acc.etiqueta)));
    if (acc.cantidad && deb.length > acc.cantidad) deb = [...deb].sort(() => rng() - .5).slice(0, acc.cantidad);
    t.estados = t.estados.filter(e => !deb.includes(e));
    emitir('limpieza', { de: a.uid, a: t.uid, n: deb.length }, t);
    return deb.length;
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
    if (spec === 'todosEnemigos') return ctx.esMovimiento ? sinEsquiva(enemigosDe(a)) : enemigosDe(a);
    if (spec === 'otrosAliados') return aliadosDe(a).filter(x => x !== a);
    if (spec.otrosAliadosAzar) return [...aliadosDe(a).filter(x => x !== a)].sort(() => rng() - .5).slice(0, spec.otrosAliadosAzar);
    if (spec.aliadoAzarSin) { const l = aliadosDe(a).filter(x => !get(x, spec.aliadoAzarSin)); return l.length ? [rng.elegir(l)] : []; }
    if (spec === 'otrosEnemigos') return enemigosDe(a).filter(x => x !== ctx.objetivo);
    if (spec === 'todosAliados') return aliadosDe(a);
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
            if (acc.prob !== undefined && rng() >= acc.prob) continue;     // prob: probabilidad de que el efecto se intente
            if (!acc.idAzar) { intentarEfecto(a, t, acc); continue; }
            const ids = acc.sinRepetir ? acc.idAzar.filter(id => !get(t, id)) : acc.idAzar;   // sinRepetir: no elige uno que ya tenga
            if (!ids.length) { emitir('sinEfecto', { a: t.uid, texto: 'Ya tiene todos' }); continue; }
            intentarEfecto(a, t, { ...acc, id: rng.elegir(ids) });
          }
          break;
        case 'curar': {
          const base = acc.base === 'hpMaxObjetivo' ? maxHp(t) : acc.base === 'curacion' ? (ctx.curacion || 0) : baseDe(a, acc.escala);
          curar(a, t, base * acc.pct);
          break;
        }
        case 'bonoPermanente': {       // p. ej. +5% HP máx. por cada Quemadura activa en enemigos (permanente, sube también el HP actual)
          const n = acc.por === 'quemadurasEnemigas' ? enemigosDe(a).filter(x => get(x, 'burn')).length : 1;
          if (!n) { emitir('sinEfecto', { a: t.uid, texto: 'Sin quemaduras enemigas' }); break; }
          const antes = maxHp(t);
          t.permanente[acc.stat] = (t.permanente[acc.stat] || 0) + acc.pct * n;
          t.hp += maxHp(t) - antes;
          emitir('bonoVisible', { a: t.uid, texto: `+${Math.round(acc.pct * n * 100)}% ${NOMBRE_STAT[acc.stat] || acc.stat}` }, t);
          break;
        }
        case 'activarDoT': {           // hace el daño de un DoT al instante sin consumirlo (cuenta como daño DoT)
          const l = todos(t, acc.efecto);           // todas las acumulaciones (p. ej. 5 Venenos)
          if (l.length) danoDoT(t, l.reduce((s, x) => s + x.valor, 0), acc.efecto);
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
        case 'invocarAzar': invocarAzar(t, acc.tabla, acc.rarezas); break;
        case 'potenciarInvocaciones': potenciarInvocaciones(t, acc.potencia || 1, acc.renovar); break;
        case 'escudo': {
          const c = (acc.base === 'danoCausado' ? (ctx.danoCausado || 0) : baseDe(a, acc.escala)) * acc.pct;
          if (c <= 0) break;
          t.escudo += c;
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
        case 'danoEfecto': danoEfecto(a, t, (ctx.dano || 0) * acc.fraccion, 0xc084fc); break;
        case 'replicarDoT': {
          const e = ctx.objetivo && get(ctx.objetivo, acc.efecto);
          if (e) danoEfecto(a, t, e.valor * acc.factor * maxHp(t), EFECTOS[acc.efecto].color);
          break;
        }
        case 'propagar': {     // copia el DoT del objetivo principal (mismo valor y duración restante); cada copia tira Puntería
          const src = ctx.estadoDe?.(acc.efecto);
          if (src) intentarEfecto(a, t, { id: acc.efecto, valorFinal: src.valor, dur: src.dur });
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
    if (pa.maxPorRonda && p.usosPasiva >= pa.maxPorRonda) return;
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
  function invocar(a, key) {
    const def = INVOCACIONES[key];
    const mismas = todos(a, 'summon').filter(e => e.key === key);
    if (mismas.length >= (def.max || 1)) {
      const vieja = mismas.reduce((x, y) => x.dur < y.dur ? x : y);
      vieja.dur = def.dur;
      emitir('invocacionRenueva', { de: a.uid, key }, a);
      return;
    }
    const activas = todos(a, 'summon');
    if (activas.length >= MAX_INVOCACIONES) {
      const sale = activas.reduce((x, y) => x.dur < y.dur ? x : y);
      a.estados = a.estados.filter(e => e !== sale);
      emitir('invocacionRetira', { de: a.uid, key: sale.key }, a);
    }
    const e = { id: 'summon', key, dur: def.dur, fresca: true };
    a.estados.push(e);
    emitir('invocacion', { de: a.uid, key, idx: todos(a, 'summon').length - 1, rareza: def.rareza }, a);
    for (const acc of def.alAparecer || []) accionInvocacion(a, e, acc, 1);
  }

  // Invocación aleatoria por pesos; nunca repite una que ya esté activa (si no se permiten varias de ese tipo)
  function invocarAzar(a, tabla, rarezas) {
    const activas = new Set(todos(a, 'summon').map(e => e.key));
    const pool = (TABLAS_INVOCACION[tabla] || []).filter(x => (!rarezas || rarezas.includes(INVOCACIONES[x.key].rareza))
      && (!activas.has(x.key) || (INVOCACIONES[x.key].max || 1) > 1));
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
  function potenciarInvocaciones(a, potencia, renovar) {
    const lista = todos(a, 'summon');
    if (!lista.length) { emitir('sinEfecto', { a: a.uid, texto: 'Sin invocaciones' }); return; }
    emitir('dominio', { id: a.uid, potencia }, a);
    for (const e of lista) {
      if (a.muerto || S.fin) break;
      actuarInvocacion(a, e, potencia);
      if (renovar) e.dur = INVOCACIONES[e.key].dur;
    }
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
    if (mov.pct) for (let i = 0; i < (mov.golpes || 1) && !t.muerto; i++) golpear(a, t, mov, ctx);
    if (t.muerto) return;
    for (const ef of mov.efectos || []) {
      if (ef.cuando && ef.cuando !== 'objetivo') continue;
      const c = { objetivo: t, atacante: a, hpObjetivoAntes };
      if (cumple(ef.condicion, c)) ejecutarAccion(a, ef.accion, c);
    }
  }

  function ejecutarMovimiento(a, mov, objetivo, ctx = {}) {
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

    const hm = get(a, 'hemo');                       // Hemorragia: pierde HP al ejecutar un movimiento
    if (hm) danoDoT(a, hm.valor, 'hemo');
    if (!ctx.forzado) a.cds[mov.categoria] = mov.cd || 0;

    if (!a.muerto) {
      const principal = objetivo || objetivos[0] || null;
      const invocacionesAntes = todos(a, 'summon').length;    // invocaciones activas al ejecutar el movimiento
      const previos = principal ? clonar(principal.estados) : [];    // para Propagar aunque el objetivo muera
      const c = { ...ctx, acum: { dano: 0, tenian: new Set() } };
      if (mov.invocar) invocar(a, mov.invocar);
      else if (mov.desatar) desatar(a, mov);
      else if (azar) for (let t of azar) {
        if (t.muerto) t = rng.elegir(enemigosDe(a));        // si el elegido ya cayó, el golpe va a otro enemigo vivo
        if (t) resolverSobreObjetivo(a, t, { ...mov, golpes: 1 }, c);
      }
      else for (const t of objetivos) resolverSobreObjetivo(a, t, mov, c);

      const sobrevivientes = [...new Set(objetivos)].filter(t => !t.muerto && t.lado !== a.lado);
      const final = {
        sobrevivientes, objetivo: principal, danoCausado: c.acum.dano, golpeadosTenian: c.acum.tenian, invocaciones: invocacionesAntes, esMovimiento: true,
        estadoDe: id => (principal && !principal.muerto && get(principal, id)) || previos.find(e => e.id === id),
      };
      for (const ef of mov.efectos || []) if (ef.cuando === 'final' && cumple(ef.condicion, final)) ejecutarAccion(a, ef.accion, final);
      if (mov.bonoPorSobreviviente && sobrevivientes.length) {
        a.bonos[mov.categoria] = (a.bonos[mov.categoria] || 0) + mov.bonoPorSobreviviente * sobrevivientes.length;
        emitir('bono', { id: a.uid, texto: `${mov.nombre} +${Math.round(a.bonos[mov.categoria] * 100)}%` }, a);
      }
    }
    emitir('movimientoFin', { id: a.uid, estilo: mov.estilo }, a);
    if (!ctx.forzado && !a.muerto) for (const p of enemigosDe(a)) pasivas(p, 'alUsarMovimientoEnemigo', { objetivo: a, categoria: mov.categoria });
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
        if (!mov || (a.cds[categoria] || 0) > 0 || get(a, 'silence')?.categoria === categoria) throw new Error('Movimiento no disponible');
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
