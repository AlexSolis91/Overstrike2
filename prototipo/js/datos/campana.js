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
  // ---- etapas de sinergia: equipos fijos (preferidos) armados para que su combinación sea la amenaza
  sangre:       { nombre: 'Pacto de Sangre', temas: [], lider: 'carnage', preferidos: ['carnage', 'kratos', 'venom', 'milo', 'sasuke-uchiha'], relleno: [] },
  // ---- Área 2 · El Abismo: las combinaciones más peligrosas del roster
  infierno:     { nombre: 'Infierno', temas: [], lider: 'antares', preferidos: ['antares', 'natsu-dragneel', 'el-pinguino', 'kyo-kusanagi', 'daenerys-targaryen'], relleno: [] },
  venenoLetal:  { nombre: 'Veneno Letal', temas: [], lider: 'muzan-kibutsuji', preferidos: ['muzan-kibutsuji', 'poison-ivy', 'shinobu-kocho', 'the-joker', 'orochimaru'], relleno: [] },
  inviernoEterno: { nombre: 'Invierno Eterno', temas: [], lider: 'sillad', preferidos: ['sillad', 'tobirama', 'baruka', 'mr-freeze', 'aokiji'], relleno: [] },
  titanes:      { nombre: 'Titanes', temas: [], lider: 'gilgamesh', preferidos: ['gilgamesh', 'ozymandias', 'thor', 'baran', 'itachi-uchiha'], relleno: [] },
  hashira:      { nombre: 'Cazadores Legendarios', temas: [], lider: 'rengoku', preferidos: ['rengoku', 'shinobu-kocho', 'sun-jin-woo', 'minato', 'batman'], relleno: [] },
  sayajinLeg:   { nombre: 'Sayajin Legendarios', temas: [], preferidos: ['goku', 'vegeta', 'broly', 'gohan', 'trunks'], relleno: [] },
  hokages:      { nombre: 'Los Hokages', temas: [], lider: 'hashirama', preferidos: ['hashirama', 'tobirama', 'minato', 'naruto', 'gaara'], relleno: [] },
  akatsukiSup:  { nombre: 'Akatsuki Supremo', temas: [], lider: 'pain', preferidos: ['pain', 'itachi-uchiha', 'obito-uchiha', 'sasori', 'deidara'], relleno: [] },
  hemorragia:   { nombre: 'Sangre y Hemorragia', temas: [], lider: 'carnage', preferidos: ['carnage', 'kratos', 'venom', 'poison-ivy', 'rakan'], relleno: [] },
  santosOro:    { nombre: 'Santos de Oro', temas: [], lider: 'saga', preferidos: ['saga', 'shaka', 'camus', 'milo', 'aldebaran'], relleno: [] },
  crimen:       { nombre: 'Señores del Crimen', temas: [], lider: 'doctor-doom', preferidos: ['doctor-doom', 'the-joker', 'el-pinguino', 'poison-ivy', 'mr-freeze'], relleno: [] },
  panteon:      { nombre: 'Panteón', temas: [], lider: 'thor', preferidos: ['thor', 'loki', 'kratos', 'wukong', 'shaka'], relleno: [] },
  punosFuego:   { nombre: 'Puños de Fuego', temas: [], lider: 'scorpion', preferidos: ['scorpion', 'kyo-kusanagi', 'iori-yagami', 'natsu-dragneel', 'ghost-rider'], relleno: [] },
  kombat:       { nombre: 'Kombat Mortal', temas: [], lider: 'scorpion', preferidos: ['scorpion', 'sub-zero', 'reptile', 'ermac', 'the-joker'], relleno: [] },
  marvelDef:    { nombre: 'Marvel Definitivo', temas: [], lider: 'carnage', preferidos: ['carnage', 'venom', 'spider-man', 'loki', 'doctor-doom'], relleno: [] },
  norte:        { nombre: 'Guardianes del Norte', temas: [], lider: 'bjorn-ironside', preferidos: ['bjorn-ironside', 'lich-king', 'jaina-proudmoore', 'sub-zero', 'camus'], relleno: [] },
  furiaDragon:  { nombre: 'Furia de Dragón', temas: [], lider: 'daenerys-targaryen', preferidos: ['daenerys-targaryen', 'rhaenys-targaryen', 'alexstrasza', 'natsu-dragneel', 'antares'], relleno: [] },
  ojosUchiha:   { nombre: 'Ojos del Uchiha', temas: [], lider: 'madara-uchiha', preferidos: ['madara-uchiha', 'itachi-uchiha', 'sasuke-uchiha', 'obito-uchiha', 'orochimaru'], relleno: [] },
  reyesInm:     { nombre: 'Reyes Inmortales', temas: [], lider: 'gilgamesh', preferidos: ['gilgamesh', 'ozymandias', 'bjorn-ironside', 'lich-king', 'daenerys-targaryen'], relleno: [] },
  monarcasAbismo: { nombre: 'Los Monarcas del Abismo', temas: [], lider: 'antares', preferidos: ['antares', 'sun-jin-woo', 'rakan', 'sillad', 'baran'], relleno: [] },
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

// Área 1: el Portal · Área 2: el Abismo (se abre por dificultad al completar la etapa 20 del Portal; paga el doble).
// 20 etapas cada una, mini-jefe en la 10 y jefe final en la 20. (Orden y poder calibrados con simulación.)
export const AREAS = {
  portal: {
    nombre: 'El Portal', titulo: '🌀 El Portal',
    etapas: [   // orden por fuerza (simulación 2026-10-21, Exploradores fijo en la 1); poder calibrado para ~95% → ~40% de victorias en Normal
      { tema: 'exploradores', poder: 0.86 },   // 1
      { tema: 'gotica', poder: 1.1 },   // 2
      { tema: 'reyes', poder: 1.05 },   // 3
      { tema: 'caos', poder: 1.01 },   // 4
      { tema: 'marvel', poder: 1.1 },   // 5
      { tema: 'sangre', poder: 1.1 },   // 6
      { tema: 'uchiha', poder: 1.1 },   // 7
      { tema: 'akatsuki', poder: 1.12 },   // 8
      { tema: 'asgard', poder: 1.14 },   // 9
      { tema: 'eternia', poder: 1.08, jefe: true },   // 10
      { tema: 'monarcas', poder: 1.29 },   // 11
      { tema: 'mortal', poder: 1.14 },   // 12
      { tema: 'cazadores', poder: 1.19 },   // 13
      { tema: 'santos', poder: 1.21 },   // 14
      { tema: 'konoha', poder: 1.24 },   // 15
      { tema: 'sayajin', poder: 1.16 },   // 16
      { tema: 'fuego', poder: 1.11 },   // 17
      { tema: 'azeroth', poder: 1.01 },   // 18
      { tema: 'dragones', poder: 1.01 },   // 19
      { tema: 'hielo', poder: 0.97, jefe: true },   // 20
    ],
  },
  abismo: {
    nombre: 'El Abismo', titulo: '🕳️ El Abismo',
    etapas: [   // orden por fuerza (simulación 2026-10-21); poder calibrado para ~85% → ~30% de victorias en Normal
      { tema: 'reyesInm', poder: 1.17 },   // 1
      { tema: 'panteon', poder: 1.1 },   // 2
      { tema: 'crimen', poder: 1.14 },   // 3
      { tema: 'monarcasAbismo', poder: 1.14 },   // 4
      { tema: 'akatsukiSup', poder: 1.13 },   // 5
      { tema: 'hokages', poder: 1.1 },   // 6
      { tema: 'titanes', poder: 1.19 },   // 7
      { tema: 'ojosUchiha', poder: 1.25 },   // 8
      { tema: 'marvelDef', poder: 1.19 },   // 9
      { tema: 'kombat', poder: 1.1, jefe: true },   // 10
      { tema: 'inviernoEterno', poder: 1.19 },   // 11
      { tema: 'santosOro', poder: 1.19 },   // 12
      { tema: 'hashira', poder: 1.29 },   // 13
      { tema: 'sayajinLeg', poder: 1.19 },   // 14
      { tema: 'hemorragia', poder: 1.24 },   // 15
      { tema: 'punosFuego', poder: 1.14 },   // 16
      { tema: 'venenoLetal', poder: 1.14 },   // 17
      { tema: 'norte', poder: 1.1 },   // 18
      { tema: 'furiaDragon', poder: 1.1 },   // 19
      { tema: 'infierno', poder: 0.97, jefe: true },   // 20
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
