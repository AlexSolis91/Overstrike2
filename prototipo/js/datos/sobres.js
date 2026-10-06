// Registro de SOBRES de la tienda (todavía sin pantalla ni cuentas). Cada campeón declara en su ficha
// `sobres: ['<id>', ...]` (puede estar en varios). Un sobre temático da 3 campeones: 1 o 2 (50/50) de su tema y el
// resto al azar entre TODOS los campeones. "Unbreakable Force" no tiene tema: los 3 salen de todos.
// `activo`: si los jugadores lo ven en la tienda. Hoy se cambia aquí; cuando existan cuentas y base de datos, este
// valor vivirá en el servidor y el administrador lo controlará con una casilla (sobres por temporada).
import { OFICIALES } from './personajes/index.js';

export const SOBRES = {
  bloodline:   { nombre: 'Bloodline Awakening', tema: 'Sangrado y robo de vida',          icono: '🩸', activo: true },
  phantom:     { nombre: 'Phantom of Chaos',    tema: 'Personajes sombríos y caóticos',   icono: '🌑', activo: true },
  sacred:      { nombre: 'Sacred Aegis',        tema: 'Divinos, sagrados y mitológicos',  icono: '✨', activo: true },
  unbreakable: { nombre: 'Unbreakable Force',   tema: null,                               icono: '💪', activo: true },   // de todo
};
export const CAMPEONES_POR_SOBRE = 3;

export const sobresActivos = () => Object.entries(SOBRES).filter(([, s]) => s.activo).map(([id]) => id);
// Campeones del tema de un sobre (los que lo declaran en su ficha)
export const campeonesDelSobre = id => OFICIALES.filter(p => (p.sobres || []).includes(id));

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
  const delTema = s.tema ? elegir(campeonesDelSobre(id), rng() < .5 ? 1 : 2) : [];
  return [...delTema, ...elegir(OFICIALES, CAMPEONES_POR_SOBRE - delTema.length, delTema)];
}
