// Registro de personajes. Cada ficha oficial nueva se agrega aquí y aparece sola en la construcción de equipos.
import madara from './madara-uchiha.js';
import rengoku from './rengoku.js';
import alexstrasza from './alexstrasza.js';
import sunJinWoo from './sun-jin-woo.js';
import shaka from './shaka.js';
import goku from './goku.js';
import daenerys from './daenerys-targaryen.js';
import batman from './batman.js';
import joker from './the-joker.js';

export const OFICIALES = [madara, rengoku, alexstrasza, sunJinWoo, shaka, goku, daenerys, batman, joker];
export const porId = id => OFICIALES.find(p => p.id === id);
