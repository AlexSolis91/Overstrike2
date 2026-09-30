// Registro universal de buffs y debuffs. Cada efecto existe UNA sola vez y todos los personajes lo usan igual.
// tipo: 'buff' | 'debuff'   ·   tags: etiquetas internas para filtros (limpiar solo DoT, inmune a Control, etc.)

export const EFECTOS = {
  // ---- DoT
  burn:    { nombre: 'Quemadura',   icono: '🔥', color: 0xff7a2a, tipo: 'debuff', tags: ['DoT', 'Fuego'] },
  poison:  { nombre: 'Veneno',      icono: '🧪', color: 0x7ee36b, tipo: 'debuff', tags: ['DoT', 'Veneno'] },
  bleed:   { nombre: 'Sangrado',    icono: '🩸', color: 0xff3355, tipo: 'debuff', tags: ['DoT', 'Sangrado'] },
  hemo:    { nombre: 'Hemorragia',  icono: '🩸', color: 0xffd36b, tipo: 'debuff', tags: ['DoT', 'Sangrado'] },
  bomb:    { nombre: 'Bomba',       icono: '💣', color: 0xffb03b, tipo: 'debuff', tags: ['DoT', 'Explosivo'] },
  // ---- Control
  stun:    { nombre: 'Aturdimiento', mega: 'Mega Aturdimiento', icono: '💫', color: 0xfacc15, tipo: 'debuff', tags: ['Control'] },
  freeze:  { nombre: 'Congelación',  mega: 'Mega Congelación',  icono: '🧊', color: 0x7dd3fc, tipo: 'debuff', tags: ['Control'] },
  possess: { nombre: 'Posesión',     mega: 'Mega Posesión',     icono: '👁️', color: 0xc084fc, tipo: 'debuff', tags: ['Control'] },
  confuse: { nombre: 'Confusión',    icono: '🌀', color: 0xf0abfc, tipo: 'debuff', tags: ['Control'] },
  fear:    { nombre: 'Miedo',        icono: '😱', color: 0x94a3b8, tipo: 'debuff', tags: ['Control'] },
  // ---- Buffs
  dmgUp:   { nombre: 'Furia',       icono: '⚔️', color: 0x4ade80, tipo: 'buff', tags: ['Estadística'] },
  summon:  { nombre: 'Invocación',  icono: '✦',  color: 0xffd36b, tipo: 'buff', tags: ['Invocación'] },
};

export const esDe = (estado, tag) => EFECTOS[estado.id].tags.includes(tag);
