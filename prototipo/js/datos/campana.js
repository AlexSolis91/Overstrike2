// MODO CAMPAÑA. Las etapas NO tienen equipos fijos: cada una es un TEMA (franquicia o grupo de la ficha de los campeones)
// y el juego arma el equipo enemigo con los campeones que existan. Cuando se agrega un campeón nuevo de ese tema, entra solo
// a la etapa y saca a los de "relleno" (que solo están mientras al tema le falten campeones).
//
// Tema: { nombre, temas: [franquicias o grupos], lider?: id preferido, preferidos?: [ids primero], relleno: [ids] }
// Etapa: { tema, poder } · poder = multiplicador de HP y Daño del rival (calibrado con simulación para que la curva suba pareja)
import { OFICIALES, porId } from './personajes/index.js';

export const TEMAS = {
  exploradores: { nombre: 'Exploradores del Portal', temas: [], preferidos: ['reptile', 'the-joker', 'rhaenys-targaryen', 'aldebaran', 'rengoku'], relleno: [] },
  sayajin:      { nombre: 'Guerreros Sayajin', temas: ['sayajin'], lider: 'goku', relleno: ['wukong', 'kratos', 'rengoku'] },
  konoha:       { nombre: 'Héroes de la Hoja', temas: ['konoha'], lider: 'minato', preferidos: ['naruto', 'sasuke-uchiha', 'minato'], relleno: ['rengoku', 'batman'] },
  akatsuki:     { nombre: 'Akatsuki', temas: ['akatsuki'], lider: 'pain', relleno: ['orochimaru', 'madara-uchiha'] },   // solo miembros reales; Orochimaru y Madara solo de relleno
  uchiha:       { nombre: 'El Clan Uchiha', temas: ['uchiha'], lider: 'madara-uchiha', relleno: ['orochimaru', 'pain'] },
  santos:       { nombre: 'Santos de Oro', temas: ['santos-de-oro'], lider: 'saga', relleno: ['thor'] },
  monarcas:     { nombre: 'Los Monarcas', temas: ['monarcas'], lider: 'antares', relleno: ['gilgamesh', 'itachi-uchiha', 'ozymandias'] },
  mortal:       { nombre: 'Torneo de Mortal Kombat', temas: ['Mortal Kombat'], lider: 'scorpion', relleno: ['the-joker', 'skeletor'] },
  asgard:       { nombre: 'Dioses de la Guerra', temas: ['dioses'], lider: 'thor', relleno: ['doctor-doom', 'he-man'] },
  azeroth:      { nombre: 'Héroes de Azeroth', temas: ['Warcraft'], lider: 'lich-king', relleno: ['camus', 'sub-zero'] },
  hielo:        { nombre: 'Frío Eterno', temas: ['hielo'], lider: 'sub-zero', relleno: ['shaka'] },
  dragones:     { nombre: 'Jinetes de Dragones', temas: ['dragones'], lider: 'daenerys-targaryen', relleno: ['rengoku'] },
  fuego:        { nombre: 'Legión de Fuego', temas: ['fuego', 'targaryen'], lider: 'rengoku', relleno: ['alexstrasza', 'antares'] },
  caos:         { nombre: 'Señores del Caos', temas: ['villanos', 'villanos-de-gotham'], lider: 'skeletor', relleno: ['loki', 'doctor-doom', 'orochimaru'] },
  reyes:        { nombre: 'Los Reyes', temas: ['reyes'], lider: 'gilgamesh', relleno: ['thor'] },
  eternia:      { nombre: 'Guerreros Legendarios', temas: ['guerreros', 'heroes-de-eternia'], lider: 'he-man', relleno: ['batman', 'rengoku'] },
  cazadores:    { nombre: 'Cazadores', temas: ['cazadores', 'cazadores-de-demonios', 'justicieros'], lider: 'sun-jin-woo', relleno: ['minato', 'jaina-proudmoore'] },
  marvel:       { nombre: 'Amenazas de Marvel', temas: ['Marvel'], lider: 'doctor-doom', relleno: ['skeletor', 'the-joker'] },
  gotica:       { nombre: 'Ciudad Gótica', temas: ['DC'], lider: 'batman', relleno: ['scorpion', 'reptile', 'rengoku'] },
  servants:     { nombre: 'Servants del Grial', temas: ['servants'], lider: 'gilgamesh', relleno: ['saga', 'thor', 'he-man'] },
};

// Arma el equipo enemigo de un tema con el roster actual (orden fijo: no cambia entre partidas, solo cuando sale un campeón nuevo)
export function equipoDeTema(id) {
  const t = TEMAS[id];
  const delTema = p => t.temas.includes(p.franquicia) || (p.grupos || []).some(g => t.temas.includes(g));
  const ids = [...(t.preferidos || []), ...OFICIALES.filter(delTema).map(p => p.id), ...t.relleno];
  const eq = [...new Set(ids)].map(porId).filter(Boolean).slice(0, 5);
  const li = eq.findIndex(p => p.id === t.lider);                    // el líder va primero (si no está, el primero con habilidad de líder)
  const i = li >= 0 ? li : eq.findIndex(p => p.lider);
  if (i > 0) eq.unshift(...eq.splice(i, 1));
  return eq;
}

// Dificultades: multiplican el poder de la etapa y cambian lo que lleva el rival. premio = multiplicador de recompensas.
export const DIFICULTADES = {
  normal:  { nombre: 'Normal',  mult: 1.0, premio: 1, rival: { sinReliquias: true, sinLider: true } },
  dificil: { nombre: 'Difícil', mult: 1.5, premio: 2, rival: { sinLider: true } },
  brutal:  { nombre: 'Brutal',  mult: 2.2, premio: 3, rival: { spdPct: .10 } },
};

// Área 1: el Portal. 20 etapas, mini-jefe en la 10 y jefe final en la 20. (Orden y poder calibrados con simulación.)
export const AREAS = {
  portal: {
    nombre: 'El Portal',
    etapas: [   // orden: del tema más débil al más fuerte (simulación); poder calibrado para ~95% → ~40% de victorias en Normal
      { tema: 'exploradores', poder: 1.51 },   // 1
      { tema: 'gotica', poder: 1.1 },   // 2
      { tema: 'fuego', poder: 1.1 },   // 3
      { tema: 'mortal', poder: 1.34 },   // 4
      { tema: 'sayajin', poder: 1.19 },   // 5
      { tema: 'cazadores', poder: 1.24 },   // 6
      { tema: 'eternia', poder: 0.9 },   // 7
      { tema: 'hielo', poder: 1.1 },   // 8
      { tema: 'azeroth', poder: 1.05 },   // 9
      { tema: 'akatsuki', poder: 0.86, jefe: true },   // 10
      { tema: 'dragones', poder: 0.93 },   // 11
      { tema: 'santos', poder: 1.13 },   // 12
      { tema: 'konoha', poder: 1.05 },   // 13
      { tema: 'marvel', poder: 1.0 },   // 14
      { tema: 'caos', poder: 1.23 },   // 15
      { tema: 'asgard', poder: 1.1 },   // 16
      { tema: 'reyes', poder: 0.99 },   // 17
      { tema: 'uchiha', poder: 1.24 },   // 18
      { tema: 'servants', poder: 0.7 },   // 19
      { tema: 'monarcas', poder: 1.14, jefe: true },   // 20
    ],
  },
};

// Recompensas (se cobran en el servidor; esto es para mostrarlas). Se multiplican por el "premio" de la dificultad.
export const RECOMPENSAS = {
  oroPrimera: 5000, oroRepetir: 1000,
  miniJefe: { frag_runa: 5 },                                       // etapa 10, primera vez
  jefe: { normal: { vales: 1 }, dificil: { vales: 1, runas: 1 }, brutal: { vales: 2, runas: 2 } },   // etapa 20, primera vez
  cofres: { 20: { oro: 10000 }, 40: { frag_runa: 5 }, 60: { normal: { vales: 1 }, dificil: { runas: 1 }, brutal: { runas: 4 } } },
};

// Estrellas: ganar · ganar sin perder aliados · ganar en 8 rondas o menos
export const RONDAS_3_ESTRELLAS = 8;
export function estrellas({ gano, muertosAliados, rondas }) {
  if (!gano) return 0;
  return 1 + (muertosAliados === 0 ? 1 : 0) + (rondas <= RONDAS_3_ESTRELLAS ? 1 : 0);
}
