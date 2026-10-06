// Registro de STARTER PACKS (todavía sin pantalla: se usará al hacer el primer inicio de sesión, los sobres y packs).
// Cada campeón declara en su ficha `starter: '<id>'` si es EXCLUSIVO de un pack temático, o nada si es "libre".
// Un starter pack da 3 campeones de su tema + 2 al azar entre los libres y los de su propio tema
// (nunca exclusivos de otro pack).
import { OFICIALES } from './personajes/index.js';

export const STARTERS = {
  blazing:   { nombre: 'Blazing Legion',     tema: 'Quemadura',                  icono: '🔥', color: '#f97316' },
  frostborn: { nombre: 'Frostborn Vanguard', tema: 'Congelación y Mega Congelación', icono: '❄️', color: '#38bdf8' },
  noxious:   { nombre: 'Noxious Alliance',   tema: 'Veneno',                     icono: '🧪', color: '#22c55e' },
};

// Campeones exclusivos del pack (los de su tema)
export const exclusivosDe = id => OFICIALES.filter(p => p.starter === id);
// Campeones que pueden salir como "aleatorios" en ese pack: libres o de su propio tema, nunca de otro pack
export const elegiblesAleatorios = id => OFICIALES.filter(p => !p.starter || p.starter === id);

// Abre un Starter Pack (una sola vez por cuenta): 3 al azar de sus exclusivos + 2 al azar entre los elegibles
// (libres o de su tema; nunca exclusivos de otro pack). Sin repetir dentro del pack. Azar completo (decisión de diseño).
export function abrirStarter(id, rng = Math.random) {
  if (!STARTERS[id]) throw new Error(`Starter Pack desconocido: ${id}`);
  const elegir = (lista, n, sin = []) => {
    const pool = lista.filter(p => !sin.includes(p)), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  const tema = elegir(exclusivosDe(id), 3);
  return [...tema, ...elegir(elegiblesAleatorios(id), 5 - tema.length, tema)];
}
