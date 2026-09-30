// Panel de información (DOM), orden de turnos, registro y carta de reliquia.
import { RELIQUIAS, RAREZAS, STAT_META, COSTOS_ESPACIO } from '../datos/reliquias.js';
import { INVOCACIONES } from '../datos/invocaciones.js';
import { ESCALADO } from '../motor/reglas.js';
import { imgHtml } from './imagenes.js';

const $ = s => document.querySelector(s);
const CAT = { basico: 'Básico', especial: 'Especial', over: 'Over' };
const OBJ = { enemigo: 'Un enemigo', aliado: 'Un aliado', todosEnemigos: 'Todos los enemigos', todosAliados: 'Todos los aliados', propio: 'Invocación' };
const ESC = { dano: 'Daño', hp: 'HP', vel: 'Velocidad' };

export function setHint(t) { const h = $('#hint'); h.textContent = t; h.classList.toggle('hidden', !t); }
let sinLeer = 0;
export function log(texto, cls = '') {
  const el = document.createElement('div');
  el.className = `log-line ${cls}`; el.textContent = texto;
  const L = $('#log'); L.prepend(el);
  while (L.children.length > 300) L.lastChild.remove();
  if ($('#log-panel').classList.contains('hidden')) {           // contador de eventos nuevos mientras está cerrado
    sinLeer++;
    const b = $('#log-badge'); b.textContent = sinLeer > 99 ? '99+' : sinLeer; b.classList.remove('hidden');
  }
}
export function logLeido() { sinLeer = 0; $('#log-badge').classList.add('hidden'); }

export function renderOrden(orden, personajes, vistas) {
  if (!orden) return;
  const por = uid => personajes.find(p => p.uid === uid);
  const chip = (uid, cls) => {
    const p = por(uid), v = vistas[uid];
    const spd = Math.round(v?.stats.spd ?? p.base.spd);
    return `<div class="chip ${p.lado === 'jugador' ? 'ally' : 'enemy'} ${cls} ${v?.muerto ? 'dead' : ''}" title="${p.nombre} · Vel ${spd}"><span>${imgHtml(p.imagen, p.nombre) || p.emoji}</span><small>${spd}</small></div>`;
  };
  $('#order').innerHTML = orden.hechos.map(u => chip(u, 'done')).join('') + (orden.actual ? chip(orden.actual, 'now') : '') + orden.pendientes.map(u => chip(u, '')).join('');
}

const fmt = (k, v) => (k === 'hp' || k === 'dmg' || k === 'spd') ? Math.round(v).toLocaleString('es-MX') : `${Math.round(v * 1000) / 10}%`;

export function renderPanel(p, v, ui) {
  const root = $('#panel-inner');
  if (!p || !v) { root.innerHTML = '<div class="p-empty">Selecciona una carta para ver su información</div>'; return; }
  const s = v.stats, max = v.maxHp;
  const r = v.hp / max, total = Math.max(max, v.hp + v.escudo);

  const statRows = ['hp', 'spd', 'dmg', 'critRate', 'critDmg', 'armor', 'acc', 'res', 'block', 'dot', 'pen'].map(k => {
    const capped = (k === 'block' && s.block > .5) || (k === 'armor' && s.armor > .75);
    const up = k === 'dmg' && v.estados.some(e => e.id === 'dmgUp');
    return `<div class="stat"${capped ? ` title="Tope: ${k === 'block' ? '50%' : '75%'}"` : ''}><span class="i">${STAT_META[k].icon}</span><span class="l">${STAT_META[k].label}</span>
      <span class="v ${up ? 'up' : ''} ${capped ? 'cap' : ''}">${fmt(k, k === 'hp' ? max : s[k])}</span></div>`;
  }).join('');

  const efectos = [
    ...v.estados.map(e => `<div class="eff ${e.tipo}"><span class="ei">${e.icono}</span><div><b>${e.nombre}</b><small>${e.texto}</small></div>
      <div class="tags">${e.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div></div>`),
    ...v.invocaciones.map(i => { const d = INVOCACIONES[i.key];
      return `<div class="eff buff"><span class="ei">${imgHtml(d.imagen, d.nombre) || d.emoji}</span><div><b>${d.nombre}</b><small>${d.golpes > 1 ? d.golpes + ' golpes de ' : ''}${Math.round(d.pct * 100)}% del ${ESC[d.escala || 'dano']} de ${p.nombre} · ${i.dur} ronda(s)${i.fresca ? ' · actúa desde su próximo turno' : ''}</small></div><div class="tags"><span class="tag">Invocación</span></div></div>`; }),
  ];

  let desbloqueo = 0;
  const slots = (p.slots || []).map((sl, i) => {
    const rel = sl.relic && RELIQUIAS[sl.relic];
    if (rel) return `<div class="slot has" data-slot="${i}" style="--rc:${RAREZAS[rel.rarity].color}"><div class="slot-label">${sl.label}</div><div class="slot-name">${rel.name}</div><div class="slot-sub">${rel.rarity} · ${rel.type}</div></div>`;
    if (sl.locked) return `<div class="slot locked"><div class="slot-label">${sl.label}</div><div class="slot-name">🔒 Bloqueado</div><div class="slot-sub">${COSTOS_ESPACIO[Math.min(desbloqueo++, 2)]} de Oro${sl.bow ? ' · por el Arco' : ''}</div></div>`;
    return `<div class="slot empty"><div class="slot-label">${sl.label}</div><div class="slot-name">Vacío</div><div class="slot-sub">${sl.bow ? 'Desbloqueado por el Arco' : 'Disponible'}</div></div>`;
  }).join('');

  const moves = p.movimientos.map(m => {
    const cd = v.cds[m.categoria] ?? 0;
    const extra = calculoTexto(m, v);
    return `<div class="move cat-${m.categoria}">
      <div class="mv-top"><span class="mv-cat">${CAT[m.categoria]}</span><span class="mv-name">${m.nombre}</span>
        <span class="mv-cd ${cd ? '' : 'ok'}">${cd ? `⏳ ${cd}` : 'Listo'}</span></div>
      <div class="mv-meta">${OBJ[m.objetivo] || ''}${m.cd ? ` · Cooldown ${m.cd}` : ''}</div>
      <div class="mv-desc">${m.desc || ''}</div>
      ${extra ? `<div class="mv-calc">${extra}</div>` : ''}</div>`;
  }).join('');

  root.innerHTML = `
    <div class="p-head ${p.lado === 'jugador' ? 'ally' : 'enemy'}">
      <div class="p-portrait" style="--c:${p.color}">${imgHtml(p.imagen, p.nombre) || p.emoji}</div>
      <div><div class="p-name">${p.nombre}</div><div class="p-role">${p.rol || ''}${p.prueba ? ' · de prueba' : ''}</div>
        <span class="p-side ${p.lado === 'jugador' ? 'ally' : 'enemy'}">${p.lado === 'jugador' ? 'Tu equipo' : 'Rival'}</span>
        ${p.esLider ? '<span class="p-side lider">👑 Líder</span>' : ''}</div>
      ${v.muerto ? '<div class="p-dead">Derrotado</div>' : ''}
    </div>
    <div class="p-hpbar">
      <div class="fill ${r > .5 ? '' : r > .25 ? 'mid' : 'low'}" style="width:${v.hp / total * 100}%"></div>
      ${v.escudo >= 1 ? `<div class="shield" style="left:${v.hp / total * 100}%;width:${v.escudo / total * 100}%"></div>` : ''}
      <span>${Math.round(v.hp)} / ${Math.round(max)}${v.escudo >= 1 ? ` · 🛡 ${Math.round(v.escudo)}` : ''}</span>
    </div>
    <section><h3>Estadísticas</h3><div class="stats">${statRows}</div></section>
    <section><h3>Reliquias</h3><div class="relics">${slots}</div></section>
    <section><h3>Buffs y debuffs</h3>${efectos.length ? `<div class="effects">${efectos.join('')}</div>` : '<div class="none">Sin buffs ni debuffs</div>'}</section>
    ${p.lider ? `<section><h3>Habilidad de líder</h3><div class="skill ${p.esLider ? '' : 'off'}"><b>${p.lider.nombre}</b><p>${p.lider.desc}</p>
      ${p.esLider ? '' : '<small>Inactiva: solo funciona en la casilla de líder</small>'}</div></section>` : ''}
    ${p.pasiva ? `<section><h3>Pasiva</h3><div class="skill"><b>${p.pasiva.nombre}</b><p>${p.pasiva.desc}</p></div></section>` : ''}
    <section><h3>Movimientos</h3><div class="moves">${moves}</div></section>
    ${p.prueba ? '<div class="placeholder-note">Personaje de prueba: no es oficial, solo sirve para probar el motor.</div>' : ''}`;
}

function calculoTexto(m, v) {
  const bono = v.bonos[m.categoria] || 0;
  const estimado = m.pct ? Math.round(ESCALADO[m.escala || 'dano'](v.stats) * m.pct * (1 + bono)) : null;
  return [
    estimado !== null ? `≈ <b>${estimado}</b> de daño${(m.golpes || 1) > 1 ? ` × ${m.golpes}` : ''} · escala por ${ESC[m.escala || 'dano']}` : '',
    bono ? `bono acumulado +${Math.round(bono * 100)}%` : '',
  ].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- barra de movimientos (abajo)
export function renderAccion(p, v, ui) {
  const bar = $('#actionbar');
  if (!p || !v || !ui.miTurno) {
    const texto = !p ? 'Esperando…' : p.lado === 'rival' ? `Turno rival: ${p.nombre}` : `${p.nombre} está actuando…`;
    bar.innerHTML = ui.fin ? '' : `<div class="act-espera">${texto}</div>`;
    return;
  }
  bar.innerHTML = p.movimientos.map(m => {
    const cd = v.cds[m.categoria] ?? 0;
    const calc = calculoTexto(m, v);
    return `<button class="act ${m.categoria} ${cd || ui.ocupado ? 'off' : ''} ${ui.movSel === m.categoria ? 'sel' : ''}" data-cat="${m.categoria}">
      <div class="act-top"><span class="act-cat">${CAT[m.categoria]}</span><span class="act-cd ${cd ? '' : 'ok'}">${cd ? '' : 'Listo'}</span></div>
      <div class="act-name">${m.nombre}</div>
      <div class="act-calc">${calc ? calc.split(' · ')[0] : OBJ[m.objetivo]}</div>
      ${cd ? `<div class="act-cdbig">⏳ ${cd}</div>` : ''}
      <div class="act-tip"><b>${m.nombre}</b>${OBJ[m.objetivo] || ''}${m.cd ? ` · Cooldown ${m.cd}` : ''}<br>${m.desc || ''}${calc ? `<br><span style="color:#fcd34d">${calc}</span>` : ''}</div>
    </button>`;
  }).join('');
}

// ---------------------------------------------------------------- carta de reliquia
export function cartaReliquia(rel) {
  const f = (k, v) => (k === 'hp' || k === 'dmg' || k === 'spd') ? `+${v}` : `+${Math.round(v * 1000) / 10}%`;
  const star = (v, mx) => v >= mx - 1e-9 ? '⭐' : '';
  const q = [rel.flat, ...rel.rolls].map(([, v, mn, mx]) => mx === mn ? 1 : (v - mn) / (mx - mn));
  const calidad = Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100);
  const grupos = [];
  for (const r of rel.rolls) { let g = grupos.find(x => x.stat === r[0]); if (!g) grupos.push(g = { stat: r[0], rolls: [] }); g.rolls.push(r); }
  const lineas = grupos.map(g => {
    const total = g.rolls.reduce((s, r) => s + r[1], 0);
    const cls = g.rolls.length === 2 ? 'x2' : g.rolls.length >= 3 ? 'x3' : '';
    return `<div class="rc-line ${cls}"><span class="lbl">${STAT_META[g.stat].label}</span><b>${f(g.stat, total)}</b><span class="stars">${g.rolls.map(r => star(r[1], r[3])).join('')}</span></div>`;
  }).join('');
  const [fk, fv, , fmx] = rel.flat;
  return `<div class="rc" style="--rc:${RAREZAS[rel.rarity].color}">
    <div class="rc-head"><div class="rc-name">${rel.name}</div><div class="rc-rarity">${rel.rarity}<span class="rc-q">Calidad ${calidad}%</span></div></div>
    <div class="rc-type">${rel.category} · ${rel.type}</div>
    <div class="rc-line flat"><span class="lbl">${STAT_META[fk].label}</span><b>${f(fk, fv)}</b><span class="stars">${star(fv, fmx)}</span></div>
    ${lineas ? `<div class="rc-sep"></div>${lineas}` : ''}
    ${rel.passive ? `<div class="rc-passive"><b>Pasiva</b>${rel.passive}</div>` : ''}</div>`;
}

export function activarReliquias(obtenerPersonaje) {
  const pop = $('#relic-pop'), panel = $('#panel-inner');
  let timer = null, fijo = false;
  const mostrar = el => {
    const p = obtenerPersonaje(); if (!p) return;
    pop.innerHTML = cartaReliquia(RELIQUIAS[p.slots[+el.dataset.slot].relic]);
    pop.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    let left = r.right + 12, top = r.top - 10;
    if (left + 280 > innerWidth - 8) left = Math.max(8, r.left - 292);
    top = Math.min(top, innerHeight - pop.offsetHeight - 8);
    pop.style.left = `${left}px`; pop.style.top = `${Math.max(8, top)}px`;
  };
  const ocultar = () => { clearTimeout(timer); timer = setTimeout(() => { if (!fijo) pop.classList.add('hidden'); }, 180); };
  panel.addEventListener('mouseover', e => { const s = e.target.closest('.slot.has'); if (s) { clearTimeout(timer); fijo = false; mostrar(s); } });
  panel.addEventListener('mouseout', e => { if (e.target.closest('.slot.has')) ocultar(); });
  pop.addEventListener('mouseenter', () => clearTimeout(timer));
  pop.addEventListener('mouseleave', () => { fijo = false; ocultar(); });
  panel.addEventListener('click', e => { const s = e.target.closest('.slot.has'); if (s) { fijo = true; mostrar(s); } });
  document.addEventListener('click', e => { if (fijo && !e.target.closest('#relic-pop') && !e.target.closest('.slot.has')) { fijo = false; pop.classList.add('hidden'); } });
}
