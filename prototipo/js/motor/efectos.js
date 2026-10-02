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
  weaken:  { nombre: 'Debilitar',   icono: '💔', color: 0xf87171, tipo: 'debuff', tags: ['Estadística'] },
  silence: { nombre: 'Silencio',     icono: '🔇', color: 0xa78bfa, tipo: 'debuff', tags: ['Control'] },
  blind:   { nombre: 'Ceguera',     icono: '🕶️', color: 0x9ca3af, tipo: 'debuff', tags: ['Estadística'] },
  wear:    { nombre: 'Desgaste',    icono: '🪓', color: 0xd97706, tipo: 'debuff', tags: ['Estadística'] },
  plague:  { nombre: 'Peste',       icono: '🦠', color: 0x84cc16, tipo: 'debuff', tags: ['Peste'] },
  blackPlague: { nombre: 'Peste Negra', icono: '☠️', color: 0x3f6212, tipo: 'debuff', tags: ['Peste'] },
  solarBurn: { nombre: 'Quemadura Solar', icono: '☀️', color: 0xfbbf24, tipo: 'debuff', tags: ['Quemadura Solar'] },
  fear:    { nombre: 'Miedo',        icono: '😱', color: 0x94a3b8, tipo: 'debuff', tags: ['Control'] },
  // ---- Buffs
  taunt:   { nombre: 'Provocación', icono: '📣', color: 0xf97316, tipo: 'buff', tags: ['Provocación'] },
  fireAura: { nombre: 'Aura de Fuego', icono: '♨️', color: 0xff6a3d, tipo: 'buff', tags: ['Fuego'] },
  stealth: { nombre: 'Sigilo',      icono: '🌫️', color: 0x94a3b8, tipo: 'buff', tags: ['Sigilo'] },
  pierce:  { nombre: 'Perforación', icono: '🗡️', color: 0x22d3ee, tipo: 'buff', tags: ['Estadística'] },
  protect: { nombre: 'Protección', icono: '🔰', color: 0x60a5fa, tipo: 'buff', tags: ['Estadística'] },
  regen:   { nombre: 'Regeneración', icono: '💚', color: 0x4ade80, tipo: 'buff', tags: ['Curación'] },
  dmgUp:   { nombre: 'Furia',       icono: '⚔️', color: 0x4ade80, tipo: 'buff', tags: ['Estadística'] },
  frenzy:  { nombre: 'Frenesí',     icono: '🎯', color: 0xf43f5e, tipo: 'buff', tags: ['Estadística'] },
  haste:   { nombre: 'Celeridad',   icono: '💨', color: 0x38bdf8, tipo: 'buff', tags: ['Estadística'] },
  bloodlust: { nombre: 'Sed de Sangre', icono: '🩸', color: 0xdc2626, tipo: 'buff', tags: ['Estadística'] },
  keen:    { nombre: 'Agudeza',     icono: '👁', color: 0xfacc15, tipo: 'buff', tags: ['Estadística'] },
  summon:  { nombre: 'Invocación',  icono: '✦',  color: 0xffd36b, tipo: 'buff', tags: ['Invocación'] },
};

export const esDe = (estado, tag) => EFECTOS[estado.id].tags.includes(tag);
