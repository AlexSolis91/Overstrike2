// Horda de Orcos (fichas aprobadas el 2026-10-18). Son enemigos: no se coleccionan y no llevan reliquias.
// Sus estadísticas son las de la oleada 1; la Horda las multiplica en cada oleada (ver js/datos/horda/horda.js).
const B = (id, nombre, rol, base, extra = {}) => ({
  id, nombre, rol, emoji: '👹', color: '#65a30d', imagen: `assets/horda/${id}.webp`, base, extra, slots: [], horda: 'orcos',
});
const golpe = (categoria, nombre, objetivo, pct, cd, desc, efectos = [], mas = {}) =>
  ({ categoria, nombre, objetivo, estilo: objetivo === 'propio' || objetivo === 'todosAliados' ? 'support' : 'melee', color: 0x84cc16, pct, escala: 'dano', cd, desc, efectos, ...mas });
const ef = (id, mas = {}) => ({ accion: { tipo: 'efecto', id, ...mas } });
const fin = accion => ({ cuando: 'final', accion });

export const ORCOS = {
  // ---------------------------------------------------------------- orcos normales
  orco: { ...B('orco', 'Orco', 'Daño', { hp: 520, dmg: 55, spd: 80 }),
    movimientos: [
      golpe('basico', 'Hachazo', 'enemigo', 1.00, 0, 'Causa 100%.'),
      golpe('especial', 'Golpe Brutal', 'enemigo', 1.60, 2, 'Causa 160% con 30% de probabilidad de Debilitar (2 rondas).', [ef('weaken', { dur: 2, prob: .30 })]),
      golpe('over', 'Furia Orca', 'enemigo', 2.20, 4, 'Causa 220%.'),
    ] },
  'arquero-orco': { ...B('arquero-orco', 'Arquero Orco', 'Daño', { hp: 440, dmg: 60, spd: 92 }),
    movimientos: [
      golpe('basico', 'Flechas', 'azar', .40, 0, '3 flechas de 40% a enemigos al azar.', [], { golpes: 3, estilo: 'ranged' }),
      golpe('especial', 'Flecha Ardiente', 'enemigo', 1.40, 2, 'Causa 140% y aplica Quemadura 5% (2 rondas).', [ef('burn', { valor: .05, dur: 2 })], { estilo: 'ranged' }),
      golpe('over', 'Lluvia de Flechas', 'azar', .45, 4, '6 flechas de 45% a enemigos al azar.', [], { golpes: 6, estilo: 'ranged' }),
    ] },
  'escudero-orco': { ...B('escudero-orco', 'Escudero Orco', 'Tanque', { hp: 700, dmg: 35, spd: 70 }, { armor: .20 }),
    movimientos: [
      golpe('basico', 'Empujón con Escudo', 'enemigo', .80, 0, 'Causa 80%.'),
      { categoria: 'especial', nombre: 'Muro de Escudos', objetivo: 'propio', estilo: 'support', color: 0x84cc16, cd: 3,
        desc: 'Gana Provocación (2 rondas) y un Escudo del 100% de su HP máx. (2 rondas).',
        efectos: [fin({ tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' }), fin({ tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'propio' })] },
      golpe('over', 'Embestida', 'enemigo', 1.50, 4, 'Causa 150% con 30% de probabilidad de Aturdir.', [ef('stun', { prob: .30 })]),
    ] },
  'chaman-orco': { ...B('chaman-orco', 'Chamán Orco', 'Support', { hp: 480, dmg: 40, spd: 85 }),
    movimientos: [
      golpe('basico', 'Rayo Verde', 'enemigo', .90, 0, 'Causa 90%.', [], { estilo: 'ranged' }),
      { categoria: 'especial', nombre: 'Bendición Ancestral', objetivo: 'propio', estilo: 'support', color: 0x4ade80, cd: 2,
        desc: 'Cura 20% del HP máx. al aliado más herido y le da Furia (2 rondas).',
        efectos: [fin({ tipo: 'curar', pct: .20, base: 'hpMaxObjetivo', a: 'aliadoMasHerido' }), fin({ tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'aliadoMasHerido' })] },
      { categoria: 'over', nombre: 'Ritual de Sanación', objetivo: 'propio', estilo: 'support', color: 0x4ade80, cd: 4,
        desc: 'Cura 15% del HP máx. a todos los aliados y les quita los debuffs.',
        efectos: [fin({ tipo: 'curar', pct: .15, base: 'hpMaxObjetivo', a: 'todosAliados' }), fin({ tipo: 'limpiar', a: 'todosAliados' })] },
    ] },
  'domador-de-lobos': { ...B('domador-de-lobos', 'Domador de Lobos', 'Invoker', { hp: 520, dmg: 50, spd: 82 }),
    movimientos: [
      golpe('basico', 'Lanzazo', 'enemigo', .90, 0, 'Causa 90%.'),
      { categoria: 'especial', nombre: 'Llamar al Lobo', objetivo: 'propio', estilo: 'support', color: 0x78716c, cd: 3, invocar: 'loboGuerra',
        desc: 'Invoca a un Lobo de Guerra (3 rondas).' },
      golpe('over', 'Jauría', 'todosEnemigos', 1.30, 4, 'Causa 130% a todos los enemigos y sus Lobos actúan de inmediato.',
        [fin({ tipo: 'potenciarInvocaciones', a: 'propio' })]),
    ] },
  'brujo-orco': { ...B('brujo-orco', 'Brujo Orco', 'Control', { hp: 470, dmg: 50, spd: 88 }),
    movimientos: [
      golpe('basico', 'Toque Pútrido', 'enemigo', .90, 0, 'Causa 90% y aplica Veneno.', [ef('poison')], { estilo: 'ranged' }),
      golpe('especial', 'Nube Tóxica', 'todosEnemigos', .60, 3, 'Causa 60% a todos con 50% de probabilidad de Veneno.', [ef('poison', { prob: .50 })], { estilo: 'ranged' }),
      golpe('over', 'Maldición', 'enemigo', 1.40, 4, 'Causa 140%, le quita todos sus buffs (Escudo incluido) y aplica Silencio (bloquea uno de sus movimientos, 2 rondas).', [{ accion: { tipo: 'disipar' } }, ef('silence', { dur: 2 })], { estilo: 'ranged' }),
    ] },
  'asesino-orco': { ...B('asesino-orco', 'Asesino Orco', 'Daño', { hp: 450, dmg: 70, spd: 100 }),
    movimientos: [
      golpe('basico', 'Doble Tajo', 'enemigo', .60, 0, '2 golpes de 60%, cada uno con 30% de probabilidad de Sangrado.', [ef('bleed', { prob: .30 })], { golpes: 2 }),
      { categoria: 'especial', nombre: 'Entre Sombras', objetivo: 'propio', estilo: 'support', color: 0x334155, cd: 3,
        desc: 'Gana Sigilo y Frenesí (2 rondas).',
        efectos: [fin({ tipo: 'efecto', id: 'stealth', dur: 2, a: 'propio' }), fin({ tipo: 'efecto', id: 'frenzy', dur: 2, a: 'propio' })] },
      golpe('over', 'Ejecución', 'enemigo', 2.20, 4, 'Causa 220%; crítico seguro si el objetivo tiene Sangrado.', [], { criticoSiObjetivoTiene: 'bleed' }),
    ] },
  'alto-orco': { ...B('alto-orco', 'Alto Orco', 'Daño', { hp: 620, dmg: 68, spd: 84 }),
    pasiva: { nombre: 'Sangre de Lava', desc: 'Tiene Aura de Fuego permanente: quien lo golpea puede quemarse.', efectosPermanentes: ['fireAura'] },
    movimientos: [
      golpe('basico', 'Hacha Ígnea', 'enemigo', 1.00, 0, 'Causa 100% con 40% de probabilidad de Quemadura 5% (2 rondas).', [ef('burn', { valor: .05, dur: 2, prob: .40 })]),
      golpe('especial', 'Golpe de Lava', 'enemigo', 1.70, 2, 'Causa 170% y aplica Quemadura 8% (2 rondas).', [ef('burn', { valor: .08, dur: 2 })]),
      golpe('over', 'Erupción', 'todosEnemigos', 1.50, 4, 'Causa 150% a todos con 50% de probabilidad de Quemadura 5% (2 rondas).', [ef('burn', { valor: .05, dur: 2, prob: .50 })], { estilo: 'ranged' }),
    ] },
  'portaestandarte-orco': { ...B('portaestandarte-orco', 'Portaestandarte Orco', 'Support', { hp: 600, dmg: 50, spd: 86 }),
    movimientos: [
      golpe('basico', 'Hachazo', 'enemigo', .90, 0, 'Causa 90%.'),
      { categoria: 'especial', nombre: 'Estandarte de Guerra', objetivo: 'propio', estilo: 'support', color: 0xdc2626, cd: 4,
        desc: 'Levanta una Zona (3 rondas): todos los orcos +15% Daño y +10% Velocidad.',
        efectos: [fin({ tipo: 'zona', dur: 3, a: 'propio', zona: { nombre: 'Estandarte de Guerra', icono: '🚩', desc: 'los orcos +15% Daño y +10% Velocidad', bono: { dmgPct: .15, spdPct: .10 } } })] },
      golpe('over', 'Tambores de Guerra', 'todosEnemigos', 1.20, 4, 'Causa 120% a todos y sus aliados ganan Celeridad (2 rondas).',
        [fin({ tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' })]),
    ] },

  // ---------------------------------------------------------------- mini-jefes
  'general-galek': { ...B('general-galek', 'General Galek', 'Daño', { hp: 1100, dmg: 75, spd: 88 }), rango: 'miniJefe',
    lider: { nombre: 'Comandante', desc: 'Todos los orcos ganan +20% de Armadura.', bonoStat: { armor: .20 } },
    movimientos: [
      golpe('basico', 'Dos Hachas', 'enemigo', .70, 0, '2 golpes de 70%.', [], { golpes: 2 }),
      { categoria: 'especial', nombre: 'Grito de Guerra', objetivo: 'propio', estilo: 'support', color: 0xa855f7, cd: 3,
        desc: 'Todos los aliados ganan Furia (2 rondas) y Galek gana Provocación (2 rondas).',
        efectos: [fin({ tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' }), fin({ tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' })] },
      golpe('over', 'Torbellino de Hachas', 'todosEnemigos', 1.50, 4, 'Causa 150% a todos con 50% de probabilidad de Sangrado.', [ef('bleed', { prob: .50 })]),
    ] },
  'general-torl-khan': { ...B('general-torl-khan', 'General Torl-khan', 'Tanque', { hp: 1300, dmg: 65, spd: 80 }), rango: 'miniJefe',
    lider: { nombre: 'Muralla de Pinchos', desc: 'Todos los orcos ganan +15% de Bloqueo.', bonoStat: { block: .15 } },
    movimientos: [
      golpe('basico', 'Mazazo', 'enemigo', 1.00, 0, 'Causa 100% con 25% de probabilidad de Aturdir.', [ef('stun', { prob: .25 })]),
      { categoria: 'especial', nombre: 'Escudo de Pinchos', objetivo: 'propio', estilo: 'support', color: 0xb91c1c, cd: 3,
        desc: 'Gana un Escudo del 100% de su HP máx. y Espejismo (2 rondas).',
        efectos: [fin({ tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'propio' }), fin({ tipo: 'efecto', id: 'mirror', dur: 2, a: 'propio' })] },
      golpe('over', 'Terremoto', 'todosEnemigos', 1.20, 4, 'Causa 120% a todos con 35% de probabilidad de Aturdir.', [ef('stun', { prob: .35 })]),
    ] },

  // ---------------------------------------------------------------- jefes
  'gul-dan': { ...B('gul-dan', "Gul'dan", 'Support', { hp: 1500, dmg: 80, spd: 90 }), rango: 'jefe',
    lider: { nombre: 'Pacto Vil', desc: 'Todos los orcos ganan +15% de Puntería y Resistencia.', bonoStat: { acc: .15, res: .15 } },
    pasiva: { nombre: 'Almas Atadas', desc: "Cada vez que cae un aliado, Gul'dan se cura 10% de su HP máx.",
      gatillo: 'alMorirAliado', accion: { tipo: 'curar', pct: .10, escala: 'hpMax', a: 'propio' } },
    movimientos: [
      golpe('basico', 'Descarga Vil', 'enemigo', 1.20, 0, 'Causa 120% y aplica Veneno.', [ef('poison')], { estilo: 'ranged', color: 0x3b82f6 }),
      { categoria: 'especial', nombre: 'Pacto de Sombras', objetivo: 'propio', estilo: 'support', color: 0x3b82f6, cd: 3,
        desc: 'Revive a 1 orco caído con 30% de su HP máx., cura 25% del HP máx. a todos los aliados y les quita los debuffs.',
        efectos: [fin({ tipo: 'reanimar', cantidad: 1, hp: .30 }), fin({ tipo: 'curar', pct: .25, base: 'hpMaxObjetivo', a: 'todosAliados' }), fin({ tipo: 'limpiar', a: 'todosAliados' })] },
      golpe('over', 'Lluvia Vil', 'todosEnemigos', 1.40, 4, 'Causa 140% a todos, les quita 1 buff al azar (puede ser el Escudo) y 50% de probabilidad de Silencio (2 rondas).', [{ accion: { tipo: 'disipar', cantidad: 1 } }, ef('silence', { dur: 2, prob: .50 })], { estilo: 'ranged', color: 0x3b82f6 }),
    ] },
  kargalgan: { ...B('kargalgan', 'Kargalgan', 'Support', { hp: 2000, dmg: 95, spd: 95 }), rango: 'jefe', color: '#dc2626',
    lider: { nombre: 'Señor de los Altos Orcos', desc: 'Todos los orcos ganan +20% de Daño.', bonoDano: .20 },
    pasiva: { nombre: 'Barrera de Sangre', desc: 'Al inicio de cada ronda da un Escudo del 25% de su HP máx. (1 ronda) a todos sus aliados (él incluido).',
      gatillo: 'alIniciarRonda', accion: { tipo: 'escudo', pct: .25, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
    movimientos: [
      golpe('basico', 'Bola de Fuego', 'enemigo', 1.30, 0, 'Causa 130% y aplica Quemadura 8% (2 rondas).', [ef('burn', { valor: .08, dur: 2 })], { estilo: 'ranged', color: 0xef4444 }),
      { categoria: 'especial', nombre: 'Sed de Sangre', objetivo: 'propio', estilo: 'support', color: 0xef4444, cd: 3,
        desc: 'Todos los aliados ganan Furia, Celeridad y Frenesí (2 rondas).',
        efectos: [fin({ tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' }), fin({ tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' }), fin({ tipo: 'efecto', id: 'frenzy', dur: 2, a: 'todosAliados' })] },
      golpe('over', 'Tormenta de Llamas', 'todosEnemigos', 1.60, 4, 'Causa 160% a todos, aplica Quemadura 8% (2 rondas) y 50% de probabilidad de Miedo (2 rondas).',
        [ef('burn', { valor: .08, dur: 2 }), ef('fear', { dur: 2, prob: .50 })], { estilo: 'ranged', color: 0xef4444 }),
    ] },
};

// Furia de los jefes (al bajar del 50% de HP); Kargalgan es por mucho el más fuerte
export const FURIA = {
  miniJefe: { hpExtra: .5, umbral: .5, dmgPct: .25, spdPct: .15 },
  jefe: { hpExtra: .75, umbral: .5, dmgPct: .25, spdPct: .15 },
  kargalgan: { hpExtra: 1, umbral: .5, dmgPct: .40, spdPct: .20 },
};
