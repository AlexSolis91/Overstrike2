import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-03). Jon Snow, Rey en el Norte y heredero Targaryen (Game of Thrones). Comandante que prepara a su equipo para
// el crítico, aturde a los enemigos ya debilitados y hace que todos desaten su Over a la vez. Vuelve de la muerte una vez. Tiene habilidad de líder.
// Sim 2026-11-03: 56.9% vs azar; 76.1% como líder.
export default {
  id: 'jon-snow',
  franquicia: 'Game of Thrones', grupos: ['targaryen', 'reyes'],   // campaña: temas de las etapas
  nombre: 'Jon Snow',
  rol: 'Support', rolSecundario: 'Control',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐺', color: '#94a3b8', imagen: 'assets/personajes/jon-snow.webp',
  base: { hp: 640, dmg: 55, spd: 97 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Príncipe Prometido',
    desc: 'Cuando un enemigo usa una habilidad de área, cada aliado tiene 50% de probabilidad de ganar Esquiva Área (1 ronda) antes del ataque.',
    alEnemigoAoe: { prob: .50, id: 'aoeDodge', dur: 1 },
  },
  pasiva: {
    nombre: 'Legítimo Targaryen',
    desc: 'Si está muerto, al inicio de cada ronda tiene 50% de probabilidad de revivir con 60% de HP (solo una vez por partida). Al revivir, el cooldown del Over de todos los aliados baja a 0.',
    revivirRonda: { prob: .50, hp: .60, alRevivir: { tipo: 'reiniciarCooldowns', categorias: ['over'], a: 'todosAliados' } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Comandante de la Guardia de la Noche', objetivo: 'todosAliados', estilo: 'support', color: 0x94a3b8,
      cd: 0,
      desc: 'Todos los aliados ganan Frenesí y Letalidad (1 ronda).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'frenzy', dur: 1, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'bloodlust', dur: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Ejecución Bastarda', objetivo: 'todosEnemigos', estilo: 'melee', color: 0xcbd5e1,
      pct: 1.00, escala: 'dano', cd: 4,
      desc: 'Golpea a cada enemigo con 100%. Los que ya tenían un debuff tienen 50% de probabilidad de recibir Mega Aturdimiento.',
      efectos: [{ condicion: { objetivoTeniaDebuff: true }, accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .50 } }],
    },
    {
      categoria: 'over', nombre: 'El Rey del Norte', objetivo: 'propio', estilo: 'support', color: 0xe2e8f0,
      cd: 6,
      desc: 'Cada aliado con su Over disponible lo usa sobre objetivos al azar. Ese Over entra en cooldown.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ordenarBasico', categoria: 'over', otros: true, soloListo: true, gastaCooldown: true, texto: '👑 ¡El Rey del Norte!', a: 'propio' } }],
    },
  ],
};
