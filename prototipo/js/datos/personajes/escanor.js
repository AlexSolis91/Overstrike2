import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-27; Sacred Aegis; sim: 50.0% contra equipos al azar). Escanor, el León del Pecado del Orgullo
// (Nanatsu no Taizai): tanque que crece con cada daño que recibe (marcas The One: +HP máx.) hasta convertirse en The One
// (12 marcas): Provocación permanente, se cura con el daño de los enemigos con Quemadura Solar y sus movimientos se potencian.
// Sin habilidad de líder (no es líder en su historia).
export default {
  id: 'escanor',
  franquicia: 'Nanatsu no Taizai', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Escanor',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦁', color: '#f59e0b', imagen: 'assets/personajes/escanor.webp',
  base: { hp: 800, dmg: 55, spd: 85 },
  extra: { armor: .20 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'The One',
    desc: 'Cada vez que recibe daño de cualquier fuente gana 1 marca de The One (máx. 12); cada marca le da +10% de HP máx. (el HP actual sube lo mismo). Con 12 marcas gana Provocación permanente y, mientras la tenga, se cura el 50% del daño que le hacen los enemigos con Quemadura Solar.',
    cargasAlRecibirDano: { efecto: 'theOne', max: 12 },
    bonoPorCarga: { efecto: 'theOne', stat: 'hpPct', pct: .10 },
    alMaxCargas: { efecto: 'theOne', texto: '☀️ ¡THE ONE!', accion: { tipo: 'efecto', id: 'taunt', permanente: true, a: 'propio' } },
    curaAlRecibirDe: { efecto: 'solarBurn', siPropio: 'taunt', pct: .50, texto: '☀️ ¡Absorbe el daño!' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Sol Cruel', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: .85, cd: 0,
      desc: 'Causa 85%. Si el objetivo tiene Quemadura Solar, Escanor gana 1 marca de The One. Con 12 marcas golpea también a otro enemigo al azar (85%).',
      efectos: [
        { condicion: { objetivoTiene: 'solarBurn' }, accion: { tipo: 'ganarCargas', efecto: 'theOne', max: 12, a: 'propio' } },
        { cuando: 'final', condicion: { propioCargasMin: { efecto: 'theOne', min: 12 } }, accion: { tipo: 'golpeDirecto', nombre: 'Sol Cruel', pct: .85, a: 'otroEnemigoAzar' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Prominencia Loca', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfbbf24,
      pct: .9, cd: 2,
      desc: 'Causa 90% a todos los enemigos con 60% de probabilidad de aplicar Quemadura Solar (2 rondas). Con 12 marcas de The One, Escanor gana un turno extra.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60 } },
        { cuando: 'final', condicion: { propioCargasMin: { efecto: 'theOne', min: 12 } }, accion: { tipo: 'turnoExtra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Lanza Divina de Escanor', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: 2.4, cd: 4, sobrante: true,
      desc: 'Causa 240%. Si mata al objetivo, el daño sobrante pasa a otro enemigo al azar. Con 12 marcas de The One suma daño igual al 25% del HP máx. que ganó con sus marcas.',
      bonoPorHpGanado: { pct: .25, si: { propioCargasMin: { efecto: 'theOne', min: 12 } } },
    },
  ],
};
