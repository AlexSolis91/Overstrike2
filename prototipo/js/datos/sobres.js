// Registro de SOBRES de la tienda (todavía sin pantalla ni cuentas). Cada campeón declara en su ficha
// `sobres: ['<id>', ...]` (puede estar en varios). Un sobre temático da 3 campeones SOLO de su tema (desde 2026-11-07,
// docs/sql/032_sobres_tematicos.sql): quien busca a un campeón va a su sobre. "Unbreakable Force" da 3 de TODOS los campeones.
// `activo`: si los jugadores lo ven en la tienda. Hoy se cambia aquí; cuando existan cuentas y base de datos, este
// valor vivirá en el servidor y el administrador lo controlará con una casilla (sobres por temporada).
import { OFICIALES } from './personajes/index.js';

export const SOBRES = {
  bloodline:   { nombre: 'Bloodline Awakening', tema: 'Sangrado y robo de vida',          icono: '🩸', color: '#dc2626', imagen: 'assets/sobres/bloodline.webp', activo: true },
  phantom:     { nombre: 'Phantom of Chaos',    tema: 'Personajes sombríos y caóticos',   icono: '🌑', color: '#8b5cf6', imagen: 'assets/sobres/phantom.webp', activo: true },
  sacred:      { nombre: 'Sacred Aegis',        tema: 'Divinos, sagrados y mitológicos',  icono: '✨', color: '#facc15', imagen: 'assets/sobres/sacred.webp', activo: true },
  flames:      { nombre: 'Lords of the Flames', tema: 'Quemadura',                        icono: '🔥', color: '#f97316', imagen: 'assets/sobres/flames.webp', activo: true },
  winter:      { nombre: 'Winter Storm',        tema: 'Congelación',                      icono: '❄️', color: '#38bdf8', imagen: 'assets/sobres/winter.webp', activo: true },
  toxic:       { nombre: 'Toxic Nightmare',     tema: 'Veneno',                           icono: '🧪', color: '#22c55e', imagen: 'assets/sobres/toxic.webp', activo: true },
  warriors:    { nombre: 'Legendary Warriors',  tema: 'Héroes y guerreros legendarios',   icono: '⚔️', color: '#84cc16', imagen: 'assets/sobres/warriors.webp', activo: true },
  unbreakable: { nombre: 'Unbreakable Force',   tema: null,                               icono: '💪', color: '#f97316', imagen: 'assets/sobres/unbreakable.webp?v=2', activo: true },   // de todo
  // Sobre de RELIQUIAS (no de campeones): 3 reliquias, garantías por calendario. Lo abre el servidor (abrir_sobre_reliquias).
  reliquias:   { nombre: 'Relics of Power',     tema: 'Reliquias', tipo: 'reliquias',     icono: '⚔️', color: '#a855f7', imagen: 'assets/sobres/reliquias.webp', activo: true },
};
export const CAMPEONES_POR_SOBRE = 3;

export const sobresActivos = () => Object.entries(SOBRES).filter(([, s]) => s.activo).map(([id]) => id);
// Campeones del tema de un sobre (los que lo declaran en su ficha)
export const campeonesDelSobre = id => id === 'unbreakable' ? OFICIALES : OFICIALES.filter(p => (p.sobres || []).includes(id));   // Unbreakable: todos

// Abre un sobre: devuelve los campeones obtenidos (pueden ser copias de los que ya tiene el jugador; dentro de un
// mismo sobre no se repite). rng: función 0..1 (Math.random por defecto; en el servidor será su propio azar).
export function abrirSobre(id, rng = Math.random) {
  const s = SOBRES[id];
  if (!s) throw new Error(`Sobre desconocido: ${id}`);
  const elegir = (lista, n, sin = []) => {
    const pool = lista.filter(p => !sin.includes(p)), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  return elegir(campeonesDelSobre(id), CAMPEONES_POR_SOBRE);   // los 3 de su tema (Unbreakable: de todos)
}
