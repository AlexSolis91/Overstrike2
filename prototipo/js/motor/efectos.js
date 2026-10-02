// Registro universal de buffs y debuffs. Cada efecto existe UNA sola vez y todos los personajes lo usan igual.
// tipo: 'buff' | 'debuff'   ·   tags: etiquetas internas para filtros (limpiar solo DoT, inmune a Control, etc.)

import { BUFFS, DEBUFFS, CONTROL, DOT } from './reglas.js';

const p = v => `${Math.round(v * 1000) / 10}%`;

// desc: explicación para el jugador (Guía de efectos). Los números salen de reglas.js.
export const EFECTOS = {
  // ---- DoT
  burn:    { nombre: 'Quemadura',   icono: '🔥', color: 0xff7a2a, tipo: 'debuff', tags: ['DoT', 'Fuego'],
    desc: `Al inicio de su turno pierde un % de su HP máx. (según quien la aplicó; sube con Daño DoT). Ignora Armadura y Escudo. Si recibe otra, se fusionan: queda la más fuerte + ${p(DOT.quemaduraSuma)} de la más débil.` },
  poison:  { nombre: 'Veneno',      icono: '🧪', color: 0x7ee36b, tipo: 'debuff', tags: ['DoT', 'Veneno'],
    desc: `Al inicio de su turno pierde ${p(DOT.veneno(0))} de su HP máx. por cada Veneno (sube con Daño DoT). Se acumulan hasta ${DOT.maxVeneno}; cada uno dura ${DOT.durVeneno} rondas. Ignora Armadura y Escudo.` },
  bleed:   { nombre: 'Sangrado',    icono: '🩸', color: 0xff3355, tipo: 'debuff', tags: ['DoT', 'Sangrado'],
    desc: `Cada golpe que recibe le quita además ${p(DOT.sangrado(0))} de su HP máx. (sube con Daño DoT). Dura hasta que lo limpien. Si recibe otro Sangrado, ${p(DOT.hemorragiaProb)} de convertirse en Hemorragia.` },
  hemo:    { nombre: 'Hemorragia',  icono: '🩸', color: 0xffd36b, tipo: 'debuff', tags: ['DoT', 'Sangrado'],
    desc: `Pierde HP con cada golpe que recibe y cada vez que usa un movimiento, y crece +${p(DOT.hemorragiaCrece)} con cada golpe. Dura hasta que la limpien.` },
  bomb:    { nombre: 'Bomba',       icono: '💣', color: 0xffb03b, tipo: 'debuff', tags: ['DoT', 'Explosivo'],
    desc: `Explota al terminar su cuenta regresiva (${DOT.contadorBomba} rondas): ${p(DOT.bomba(0))} de su HP máx. y ${p(DOT.salpicaduraBomba)} de eso a cada uno de sus aliados. Máximo ${DOT.maxBombas} a la vez.` },
  // ---- Control
  stun:    { nombre: 'Aturdimiento', mega: 'Mega Aturdimiento', icono: '💫', color: 0xfacc15, tipo: 'debuff', tags: ['Control'],
    desc: `Pierde su próximo turno. Mega Aturdimiento: 2 turnos.` },
  freeze:  { nombre: 'Congelación',  mega: 'Mega Congelación',  icono: '🧊', color: 0x7dd3fc, tipo: 'debuff', tags: ['Control'],
    desc: `Bloque de hielo de 1 capa y −${p(CONTROL.congelacionVel)} Velocidad (${CONTROL.durCongelacion} rondas). Si llega a su turno con hielo, lo pierde. Cada golpe rompe 1 capa (+${p(CONTROL.quiebreCongelacion)} de daño). Congelar a alguien congelado = Mega: 2 capas y −${p(CONTROL.congelacionVel * 2)} Velocidad.` },
  possess: { nombre: 'Posesión',     mega: 'Mega Posesión',     icono: '👁️', color: 0xc084fc, tipo: 'debuff', tags: ['Control'],
    desc: `En su turno ataca a un aliado suyo al azar con su Básico. Mega Posesión: 2 turnos.` },
  confuse: { nombre: 'Confusión',    icono: '🌀', color: 0xf0abfc, tipo: 'debuff', tags: ['Control'],
    desc: `${p(CONTROL.confusionProb)} de que sus movimientos de un objetivo vayan a un personaje al azar (aliado o enemigo).` },
  weaken:  { nombre: 'Debilitar',   icono: '💔', color: 0xf87171, tipo: 'debuff', tags: ['Estadística'],
    desc: `Recibe +${p(DEBUFFS.debilitar)} de daño de golpes y daño por efecto (después de la Armadura).` },
  silence: { nombre: 'Silencio',     icono: '🔇', color: 0xa78bfa, tipo: 'debuff', tags: ['Control'],
    desc: `Bloquea al azar uno de sus movimientos que esté listo. Si no le queda ninguno para usar, pierde el turno.` },
  blind:   { nombre: 'Ceguera',     icono: '🕶️', color: 0x9ca3af, tipo: 'debuff', tags: ['Estadística'],
    desc: `−${p(DEBUFFS.ceguera)} de Puntería: le cuesta mucho más aplicar debuffs y disipar.` },
  wear:    { nombre: 'Desgaste',    icono: '🪓', color: 0xd97706, tipo: 'debuff', tags: ['Estadística'],
    desc: `−${p(DEBUFFS.desgaste)} de Armadura, y −${p(DEBUFFS.desgaste)} más por cada golpe que recibe, hasta −${p(DEBUFFS.desgasteMax)}. Dura hasta que lo limpien.` },
  plague:  { nombre: 'Peste',       icono: '🦠', color: 0x84cc16, tipo: 'debuff', tags: ['Peste'],
    desc: `No puede recibir curaciones (sí escudos). Si recibe otra Peste, se convierte en Peste Negra.` },
  blackPlague: { nombre: 'Peste Negra', icono: '☠️', color: 0x3f6212, tipo: 'debuff', tags: ['Peste'],
    desc: `No puede recibir curaciones y al final de cada uno de sus turnos pierde ${p(DEBUFFS.pesteNegra)} de su HP máx. original (mínimo ${p(DEBUFFS.pesteNegraPiso)}). Esa pérdida es permanente aunque la limpien.` },
  solarBurn: { nombre: 'Quemadura Solar', icono: '☀️', color: 0xfbbf24, tipo: 'debuff', tags: ['Quemadura Solar'],
    desc: `Toda curación que recibe le hace daño por el monto completo, ignorando Armadura y Escudo.` },
  fear:    { nombre: 'Miedo',        icono: '😱', color: 0x94a3b8, tipo: 'debuff', tags: ['Control'],
    desc: `Actúa al final de la ronda y hace −${p(1 - CONTROL.miedoDano)} de daño.` },
  // ---- Buffs
  taunt:   { nombre: 'Provocación', icono: '📣', color: 0xf97316, tipo: 'buff', tags: ['Provocación'],
    desc: `Los enemigos deben atacarlo con sus movimientos de un solo objetivo. No afecta ataques de área ni al azar.` },
  fireAura: { nombre: 'Aura de Fuego', icono: '♨️', color: 0xff6a3d, tipo: 'buff', tags: ['Fuego'],
    desc: `Quien lo golpee recibe Quemadura 5% (1 turno).` },
  aoeDodge: { nombre: 'Esquiva Área', icono: '💨', color: 0x93c5fd, tipo: 'buff', tags: ['Esquiva'],
    desc: `No lo alcanzan los movimientos de área de los enemigos: ni su daño ni sus efectos.` },
  stealth: { nombre: 'Sigilo',      icono: '🌫️', color: 0x94a3b8, tipo: 'buff', tags: ['Sigilo'],
    desc: `Los enemigos no pueden elegirlo con ataques de un solo objetivo. Se rompe al recibir cualquier daño.` },
  pierce:  { nombre: 'Perforación', icono: '🗡️', color: 0x22d3ee, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.perforacion)} de Penetración de escudo: esa parte del daño pasa directo al HP aunque el objetivo tenga Escudo.` },
  protect: { nombre: 'Protección', icono: '🔰', color: 0x60a5fa, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.proteccion)} de Resistencia: resiste mejor los debuffs.` },
  regen:   { nombre: 'Regeneración', icono: '💚', color: 0x4ade80, tipo: 'buff', tags: ['Curación'],
    desc: `Al inicio de su turno se cura ${p(BUFFS.regeneracion)} de su HP máx.` },
  dmgUp:   { nombre: 'Furia',       icono: '⚔️', color: 0x4ade80, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.furia)} de Daño.` },
  frenzy:  { nombre: 'Frenesí',     icono: '🎯', color: 0xf43f5e, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.frenesi)} de Probabilidad de Crítico.` },
  haste:   { nombre: 'Celeridad',   icono: '💨', color: 0x38bdf8, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.celeridad)} de Velocidad.` },
  bloodlust: { nombre: 'Sed de Sangre', icono: '🩸', color: 0xdc2626, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.sedDeSangre)} de Daño Crítico.` },
  keen:    { nombre: 'Agudeza',     icono: '👁', color: 0xfacc15, tipo: 'buff', tags: ['Estadística'],
    desc: `+${p(BUFFS.agudeza)} de Puntería: sus debuffs entran con más facilidad.` },
  summon:  { nombre: 'Invocación',  icono: '✦',  color: 0xffd36b, tipo: 'buff', tags: ['Invocación'],
    desc: `Una criatura invocada que actúa después del turno de su invocador. Desaparece si muere el invocador o se acaba su duración. Se puede Disipar.` },
};

export const esDe = (estado, tag) => EFECTOS[estado.id].tags.includes(tag);
