import { espacios } from '../reliquias.js';

// Ficha oficial #38 (2026-10-16). Ghost Rider, el Espíritu de Venganza (Marvel). Su fuego infernal no lo quema: es inmune a
// Quemadura y quien lo golpea arde (Aura de Fuego permanente). Castiga a los pecadores ya quemados (+daño contra ellos), los
// obliga a sentir su propia Quemadura con la Mirada de Penitencia (elige a quien quiera, aunque haya Provocación) y arrasa
// al equipo rival con su motocicleta infernal. Jinetes de las Llamas: rinde más junto a otros quemadores.
export default {
  id: 'ghost-rider',
  franquicia: 'Marvel', grupos: ['espectros', 'fuego'],   // campaña: temas de las etapas
  nombre: 'Ghost Rider',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  starter: 'blazing',
  emoji: '💀', color: '#f97316', imagen: 'assets/personajes/ghost-rider.webp',
  base: { hp: 740, dmg: 70, spd: 100 },
  extra: {},
  slots: espacios('lanzaFuego', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Juicio del Espíritu de Venganza',
    desc: 'Los aliados ganan +5% de Daño y, al golpear a un enemigo con Quemadura, +15% de Prob. Crítico y +15% de Daño Crítico.',
    bonoDano: .05,
    bonoCriticoContra: { efecto: 'burn', critRate: .15, critDmg: .15 },
  },
  pasiva: {
    nombre: 'Espíritu de Venganza',
    desc: 'Fuego del Infierno: inmune a Quemadura y con Aura de Fuego permanente (quien lo golpee puede quemarse). Sus golpes hacen +25% de daño a enemigos con Quemadura. Jinetes de las Llamas: por cada aliado que aplique Quemadura (máx. 4), todo su equipo gana +5% de Daño y +5% de Prob. Crítico mientras Ghost Rider viva.',
    inmuneA: ['burn'],
    efectosPermanentes: ['fireAura'],
    bonoContra: { efecto: 'burn', pct: .25 },
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .05, critRate: .05 } },   // Jinetes de las Llamas
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Cadena Infernal', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .70, escala: 'dano', cd: 0,
      salta: { veces: 1, pct: .45, texto: '⛓️ ¡Cadena!' },
      desc: 'Causa 70% y la cadena salta a otro enemigo al azar con 45%. 35% de probabilidad de Quemadura 8% (2 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .08, dur: 2, prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Mirada de Penitencia', objetivo: 'enemigo', estilo: 'ranged', color: 0xfb923c,
      pct: 1.15, escala: 'dano', cd: 3, ignoraProvocacion: true,
      desc: 'Elige a cualquier enemigo (ignora Provocación y Sigilo). Causa 115%: si tenía Quemadura, siente todo su dolor (la Quemadura hace su daño al instante, sin gastarse) y 60% de probabilidad de Miedo (2 rondas) que no se puede resistir.',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .60, irresistible: true } },
      ],
    },
    {
      categoria: 'over', nombre: 'Jinete del Infierno', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: .95, escala: 'dano', cd: 4,
      desc: 'Arrasa al equipo rival con su motocicleta infernal: 95% a todos los enemigos con 75% de probabilidad de Quemadura 12% (3 rondas) a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .12, dur: 3, prob: .75 } }],
    },
  ],
};
