import { espacios } from '../reliquias.js';

// Ficha oficial #30, rediseñada el 2026-10-12: Itachi deja de ser un personaje de velocidad (eso es de Minato) y pasa a ser el
// maestro del genjutsu. Clones de Cuervo (contador): cada uno absorbe un ataque enemigo contra él y los cuervos pueden asustar
// al atacante; gana clones al aplicar Control. Tsukuyomi (Mega Aturdimiento + Debilitar), Susanoo: Espada de Totsuka (sella el
// Over enemigo) y Espejo de Yata (Espejismo + Escudo). Sin Habilidad de Líder.
export default {
  id: 'itachi-uchiha',
  franquicia: 'Naruto', grupos: ['uchiha', 'akatsuki', 'konoha'],   // campaña: temas de las etapas
  nombre: 'Itachi Uchiha',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '🐦‍⬛', color: '#b91c1c', imagen: 'assets/personajes/itachi-uchiha.webp',
  base: { hp: 620, dmg: 60, spd: 105 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Mangekyō Sharingan',
    desc: 'Empieza con 2 Clones de Cuervo (máx. 3). Cada clon absorbe por completo un ataque enemigo contra Itachi (daño y efectos): era un genjutsu, y los cuervos tienen 40% de probabilidad de aplicar Miedo (2 rondas) al atacante. Gana 1 clon cada vez que le aplica Aturdimiento o Miedo a un enemigo.',
    clones: {
      efecto: 'cuervos', iniciales: 2, texto: '🐦‍⬛ ¡Era un genjutsu!',
      alAbsorber: { tipo: 'efecto', id: 'fear', dur: 2, prob: .40, a: 'objetivo' },
    },
    cargasAlAplicar: { efectos: ['stun', 'fear'], efecto: 'cuervos', max: 3 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Genjutsu de Cuervos', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0x7f1d1d,
      pct: .37, escala: 'dano', cd: 0,
      desc: '2 golpes de 37% con 30% de probabilidad de Miedo (actúa al final de la ronda y hace −25% de daño).',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Tsukuyomi', objetivo: 'enemigo', estilo: 'ranged', color: 0xdc2626,
      pct: .9, escala: 'dano', cd: 3,
      desc: 'Causa 90% y con 70% de probabilidad atrapa al enemigo en el Tsukuyomi: Mega Aturdimiento (pierde 2 turnos). Si cae, sale mentalmente destrozado: Debilitar (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .70 } },
        { condicion: { objetivoTiene: 'stun' }, accion: { tipo: 'efecto', id: 'weaken', dur: 2 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Susanoo', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 1.65, escala: 'dano', cd: 5,
      desc: 'La Espada de Totsuka causa 165% y sella el Over del objetivo (lo pone en su cooldown completo). El Espejo de Yata le da a Itachi Espejismo (2 rondas: devuelve el 30% del daño de cada golpe) y un Escudo del 200% de su HP máx. (2 rondas).',
      efectos: [
        { accion: { tipo: 'activarCooldown', categoria: 'over' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: 2.00, escala: 'hpMax', dur: 2, a: 'propio' } },
      ],
    },
  ],
};
