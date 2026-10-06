// Registro de STARTER PACKS (todavía sin pantalla: se usará al hacer el primer inicio de sesión, los sobres y packs).
// Cada campeón declara en su ficha `starter: '<id>'` si es EXCLUSIVO de un pack temático, o nada si es "libre".
// Un starter pack da 3 campeones de su tema + 2 al azar entre los libres y los de su propio tema
// (nunca exclusivos de otro pack).
import { OFICIALES } from './personajes/index.js';

export const STARTERS = {
  blazing:   { nombre: 'Blazing Legion',     tema: 'Quemadura',                  icono: '🔥' },
  frostborn: { nombre: 'Frostborn Vanguard', tema: 'Congelación y Mega Congelación', icono: '❄️' },
  noxious:   { nombre: 'Noxious Alliance',   tema: 'Veneno',                     icono: '🧪' },
};

// Campeones exclusivos del pack (los de su tema)
export const exclusivosDe = id => OFICIALES.filter(p => p.starter === id);
// Campeones que pueden salir como "aleatorios" en ese pack: libres o de su propio tema, nunca de otro pack
export const elegiblesAleatorios = id => OFICIALES.filter(p => !p.starter || p.starter === id);
