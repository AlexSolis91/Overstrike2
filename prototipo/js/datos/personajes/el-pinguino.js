import { espacios } from '../reliquias.js';

// Ficha oficial #51 (2026-10-18, diseño "a tu criterio"). El Pingüino (Oswald Cobblepot): el Rey del Inframundo de Gótica,
// dueño del Iceberg Lounge y traficante de armas. Pelea con su arsenal de paraguas (ametralladora y lanzallamas) y su
// ejército de pingüinos con cohetes (Batman Returns). Quema al enemigo y arma a su equipo: más fuerte cuantos más aliados
// aplican Quemadura. Exclusivo de Blazing Legion. Sin habilidad de líder.
export default {
  id: 'el-pinguino',
  franquicia: 'DC', grupos: ['villanos-de-gotham'],   // campaña: Ciudad Gótica y Señores del Caos
  nombre: 'El Pingüino',
  rol: 'DoTer', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐧', color: '#475569', imagen: 'assets/personajes/el-pinguino.webp',
  base: { hp: 650, dmg: 60, spd: 92 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Traficante de Armas de Gótica',
    desc: 'Por cada otro aliado cuyos movimientos aplican Quemadura (máx. 4), todo su equipo gana +4% de Daño y +4% de Puntería mientras El Pingüino viva.',
    bonoPorAliadosQueAplican: { efecto: 'burn', max: 4, bono: { dmgPct: .07, hpPct: .03 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Paraguas Ametralladora', objetivo: 'enemigo', estilo: 'ranged', color: 0x94a3b8,
      pct: .40, escala: 'dano', cd: 0, golpes: 3,
      desc: '3 disparos de 40%, cada uno con 20% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .20 } }],
    },
    {
      categoria: 'especial', nombre: 'Paraguas Lanzallamas', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .75, escala: 'dano', cd: 3,
      desc: 'Una llamarada desde la punta del paraguas: 75% a todos los enemigos con 55% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .55 } }],
    },
    {
      categoria: 'over', nombre: 'Ejército de Pingüinos Cohete', objetivo: 'azar', golpes: 6, estilo: 'ranged', color: 0xfb923c,
      pct: .45, escala: 'dano', cd: 5,
      desc: 'Sus pingüinos con cohetes en la espalda caen sobre el campo: 6 explosiones de 45% a enemigos al azar, cada una con 30% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .30 } }],
    },
  ],
};
