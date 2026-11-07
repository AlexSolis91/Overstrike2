import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-07, kit del usuario; sim: 59.0% contra equipos al azar). Anakin Skywalker, el Elegido (Star Wars). Daño: Asistir y Contraataque
// permanentes y responde a todo lo que el enemigo hace fuera de su turno, siempre con Djem So. Junta marcas de Héroe Caído
// (+1% a Daño, Prob. y Daño Crítico, Velocidad y Penetración cada una) y con 30 se transforma en Lord Vader, conservándolas.
// Lord Vader (forma permanente): Daño · Control con Miedo, Aturdimiento y la Orden 66.
// Lord Vader: forma permanente (al llegar a 30 marcas de Héroe Caído). Conserva las marcas y su bono; pierde Contraataque y Asistir.
const BONO_HEROE = { efecto: 'heroeCaido', bonos: { dmgPct: .01, critRate: .01, critDmg: .01, spdPct: .01, pen: .01 } };
const lordVader = {
  nombre: 'Lord Vader',
  rol: 'Daño', rolSecundario: 'Control',
  emoji: '🌑', color: '#dc2626', imagen: 'assets/transformaciones/lord-vader.webp',
  base: { hp: 720, dmg: 92, spd: 105 },
  extra: { armor: .20 },
  pasiva: {
    nombre: 'El Elegido Corrompido',
    desc: 'Conserva sus marcas de Héroe Caído y su bono. Cada vez que un enemigo recibe Aturdimiento o Miedo, baja 1 turno el cooldown de todos sus movimientos. Cada vez que recibe daño, si queda por debajo del 35% de su HP, consume 10 marcas de Héroe Caído (y su bono) y se cura 50% de su HP máx.',
    gatillo: 'alEnemigoRecibeEfecto', filtro: { efectos: ['stun', 'fear'] },
    accion: { tipo: 'reducirCooldown', cantidad: 1, a: 'propio' },
    tambien: [{
      gatillo: 'alRecibirDano', si: [{ propioHpMenor: .35 }, { propioCargasMin: { efecto: 'heroeCaido', min: 10 } }],
      accion: { tipo: 'multiple', a: 'propio', acciones: [
        { tipo: 'consumirCargas', efecto: 'heroeCaido', cantidad: 10, texto: '🌑 −10 Héroe Caído' },
        { tipo: 'curar', pct: .50, escala: 'hpMax' },
      ] },
    }],
    bonoPorCarga: BONO_HEROE,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Asalto Implacable', objetivo: 'enemigo', golpes: 2, estilo: 'melee', color: 0xef4444,
      pct: .95, cd: 0,
      desc: 'Ataca 2 veces a un enemigo (95% cada golpe). Cada golpe tiene 25% de probabilidad de aplicar Miedo (2 rondas). Si golpea a un objetivo con Miedo, lo convierte en Aturdimiento.',
      efectos: [
        { condicion: { objetivoTiene: 'fear' }, accion: { tipo: 'convertirEfecto', de: 'fear', en: 'stun' } },
        { accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .25 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Terror de la Legión 501', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      pct: 1.70, cd: 4,
      desc: 'Causa 170% a todos los enemigos con 50% de probabilidad de aplicar Miedo (2 rondas). Por cada Miedo que entra, gana 1 marca de Héroe Caído.',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50,
        alAcertar: { tipo: 'ganarCargas', efecto: 'heroeCaido', cantidad: 1, max: 9999, a: 'propio' } } }],
    },
    {
      categoria: 'over', nombre: 'Ejecución de la Orden 66', objetivo: 'enemigo', estilo: 'melee', color: 0x7f1d1d,
      pct: 3.00, cd: 6,
      desc: 'Causa 300% a un enemigo. Si lo elimina, gana 1 turno extra (máx. 2 por ronda) y Furia (2 rondas). Si sobrevive, le aplica Mega Aturdimiento.',
      efectos: [
        { cuando: 'final', condicion: { objetivoEliminado: true }, accion: { tipo: 'multiple', a: 'propio', acciones: [
          { tipo: 'turnoExtra', maxPorRonda: 2, clave: 'orden66' },
          { tipo: 'efecto', id: 'dmgUp', dur: 2 },
        ] } },
        { cuando: 'final', condicion: { objetivoVivo: true }, accion: { tipo: 'efecto', id: 'stun', mega: true } },
      ],
    },
  ],
};

export default {
  id: 'anakin-skywalker',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Anakin Skywalker',
  rol: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '⚔️', color: '#3b82f6', imagen: 'assets/personajes/anakin-skywalker.webp',
  base: { hp: 580, dmg: 84, spd: 122 },   // banda Asesino
  extra: { critRate: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),
  transformacion: lordVader,

  pasiva: {
    nombre: 'El Elegido',
    desc: 'Asistir y Contraataque permanentes. Cuando un enemigo usa una habilidad fuera de su turno (contraataques, asistencias, reacciones), Anakin le responde con Djem So. Cada marca de Héroe Caído le da +1% de Daño, +1 de Prob. Crítico, +1 de Daño Crítico, +1% de Velocidad y +1 de Penetración de escudo. Con 30 marcas se transforma en Lord Vader y las conserva.',
    efectosPermanentes: ['counter', 'assist'],
    respondeFueraDeTurno: { texto: '⚡ ¡El Elegido responde!' },
    bonoPorCarga: BONO_HEROE,
    transformarConCargas: { efecto: 'heroeCaido', cargas: 30, conserva: true },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Djem So', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: .55, cd: 0,
      desc: 'Causa 55% a un enemigo. Si el objetivo tiene algún debuff, Anakin gana 1 marca de Héroe Caído.',
      efectos: [{ condicion: { objetivoConDebuff: true }, accion: { tipo: 'ganarCargas', efecto: 'heroeCaido', cantidad: 1, max: 9999, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Explosión de Fuerza', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.80, cd: 3,
      desc: 'Causa 180% a todos los enemigos. Si asesta 3 o más golpes críticos, duplica sus marcas de Héroe Caído.',
      efectos: [{ cuando: 'final', condicion: { criticosMin: 3 }, accion: { tipo: 'duplicarCargas', efecto: 'heroeCaido', max: 9999, a: 'propio', texto: '🌑 ¡Héroe Caído ×2!' } }],
    },
    {
      categoria: 'over', nombre: 'Ira del Elegido', objetivo: 'enemigo', golpes: 5, estilo: 'melee', color: 0x2563eb,
      pct: 1.20, cd: 4,
      desc: 'Ataca 5 veces al objetivo (120% cada golpe). En cada golpe, Anakin gana 2 marcas de Héroe Caído por cada buff activo del objetivo.',
      efectos: [{ accion: { tipo: 'ganarCargas', efecto: 'heroeCaido', porBuffObjetivo: 2, max: 9999, a: 'propio' } }],
    },
  ],
};
