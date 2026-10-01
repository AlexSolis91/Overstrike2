import { espacios } from '../reliquias.js';

// Ficha oficial #5 (revisada el 2026-10-01). Tanque de escudos: todo escala con su HP.
export default {
  id: 'shaka',
  nombre: 'Shaka',
  rol: 'Tanque', rolSecundario: 'Support',
  emoji: '🪷', color: '#facc15', imagen: 'assets/personajes/shaka.webp',
  base: { hp: 730, dmg: 65, spd: 75 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Reencarnación de Buda',
    desc: 'Al inicio de cada ronda, da un Escudo del 12% del HP máx. de Shaka al aliado con menor % de HP.',
    alIniciarRonda: { tipo: 'escudo', pct: .12, escala: 'hpMax', a: 'aliadoMasHerido' },
  },
  pasiva: {
    nombre: 'Sangre de Atena',
    desc: 'Cada vez que Shaka o un aliado pierde Escudo, ese aliado se cura un 8% del HP máx. de Shaka (máximo 3 veces por ronda).',
    gatillo: 'alPerderEscudo', maxPorRonda: 3, soloSiCura: true,
    accion: { tipo: 'curar', pct: .08, escala: 'hpMax', a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Kahn', objetivo: 'propio', estilo: 'support', color: 0xfde68a, cd: 0,
      desc: 'Shaka se cura 5% de su HP máx. y da Protección (+30% Resistencia) o Regeneración (cura 10% HP máx.) por 1 ronda a 2 aliados al azar (puede incluirse y repetir).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .05, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', idAzar: ['protect', 'regen'], dur: 1, a: { aliadosAzar: 2 } } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Ohm', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 3,
      desc: '3 aliados al azar (pueden repetirse) reciben un Escudo del 15% del HP máx. de Shaka y Furia (+50% Daño) por 2 rondas.',
      efectos: [{ cuando: 'final', accion: { tipo: 'multiple', a: { aliadosAzar: 3 }, acciones: [
        { tipo: 'escudo', pct: .15, escala: 'hpMax' },
        { tipo: 'efecto', id: 'dmgUp', dur: 2 },
      ] } }],
    },
    {
      categoria: 'over', nombre: 'Tesoro del Cielo', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 2.80, escala: 'hp', cd: 5,
      desc: 'Causa 280% (escala por HP). Luego reparte al azar entre los enemigos daño por efecto igual al 20% de la suma de los Escudos de su equipo.',
      efectos: [{ cuando: 'final', accion: { tipo: 'danoRepartido', base: 'escudosEquipo', pct: .20, paquetes: 10, a: 'propio' } }],
    },
  ],
};
