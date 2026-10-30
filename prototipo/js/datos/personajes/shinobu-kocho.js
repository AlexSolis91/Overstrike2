import { espacios } from '../reliquias.js';

// Ficha oficial #60 (2026-10-19, DoTer de Veneno y Support que se cura a sí misma; veneno propio persistente pedido en la
// ficha, el resto "a tu criterio"). Shinobu Kocho, la Pilar del Insecto (Kimetsu no Yaiba): sin fuerza para decapitar
// demonios, los mata con aguijones de veneno de glicinia. Durante años ingirió ese veneno hasta volver su propio cuerpo
// letal para Doma. Siempre está envenenada (Veneno propio que vuelve si se le acaba o se lo limpian); cada vez que ese
// veneno la daña se cura con su medicina, y mientras lo lleva en la sangre sus aguijones inyectan dosis garantizadas.
// Técnicas: Respiración del Insecto (Mushi no Kokyū). Sin habilidad de líder.
export default {
  id: 'shinobu-kocho',
  franquicia: 'Kimetsu no Yaiba', grupos: ['cazadores-de-demonios'],   // campaña: Cazadores
  nombre: 'Shinobu Kocho',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🦋', color: '#a855f7', imagen: 'assets/personajes/shinobu-kocho.webp',
  base: { hp: 550, dmg: 48, spd: 105 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Cuerpo de Glicinia',
    desc: 'Empieza envenenada con su propio veneno de glicinia; si se le termina o se lo limpian, vuelve a envenenarse al inicio de la ronda siguiente. Cada vez que su Veneno la daña, se cura 10% de su HP máx. (su medicina de la Finca Mariposa). Pilar del Insecto: todo su equipo hace +22% de daño a enemigos con Veneno.',
    efectoPropio: { id: 'poison' },
    gatillo: 'alDanoDoT', filtro: { tipo: 'poison', en: 'propio' },
    accion: { tipo: 'curar', pct: .10, base: 'hpMaxObjetivo', a: 'propio' },
    auraContra: { efecto: 'poison', pct: .22 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Danza de la Mariposa: Capricho', objetivo: 'enemigo', estilo: 'melee', color: 0xc084fc,
      pct: .50, escala: 'dano', cd: 0, golpes: 3,
      desc: 'Chō no Mai: Tawamure. 3 aguijones de 50%, cada uno con 30% de probabilidad de Veneno. Si Shinobu está envenenada, el último aguijón inyecta además 1 Veneno sin tirada.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .30 } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Danza de la Libélula: Hexágono de Ojo Compuesto', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: .35, escala: 'dano', cd: 3, golpes: 6,
      desc: 'Seirei no Mai: Fukugan Rokkaku. 6 aguijones de 35% al mismo enemigo, cada uno con 35% de probabilidad de Veneno. Luego se cura 17% de su HP máx.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .17, base: 'hpMaxObjetivo', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Danza de la Abeja: Picadura Verdadera', objetivo: 'enemigo', estilo: 'melee', color: 0xe9d5ff,
      pct: 2.10, escala: 'dano', cd: 5,
      desc: 'Hachi Kiba no Mai: Makoto Hayai. Un aguijón a velocidad imposible: 210%. Si Shinobu está envenenada, le inyecta 3 Venenos sin tirada y todos los Venenos del objetivo hacen su daño al instante.',
      efectos: [
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', condicion: { propioTiene: 'poison' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' } },
        { cuando: 'final', accion: { tipo: 'activarDoT', efecto: 'poison', a: 'objetivo' } },
      ],
    },
  ],
};
