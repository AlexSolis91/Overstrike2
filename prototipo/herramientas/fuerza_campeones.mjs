// Fuerza de cada campeón (estadística del servidor): % de victorias en partidas 5 vs 5 al azar entre
// todo el roster (IA contra IA, equipo de la ficha). Escribe herramientas/fuerza.json; generar_catalogo.mjs lo lleva al
// servidor (columna campeones.fuerza). Volver a correrlo al agregar campeones (los que no estén quedan en 50).
// Uso (desde la carpeta prototipo):  node herramientas/fuerza_campeones.mjs [partidas=20000] [semilla=1]
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const imp = f => import(pathToFileURL(path.join(aqui, '../js', f)).href);
const { OFICIALES } = await imp('datos/personajes/index.js');
const { crearCombate } = await imp('motor/combate.js');
const { elegirIA } = await imp('motor/ia.js');

const N = Number(process.argv[2] || 20000);
let s = Number(process.argv[3] || 1);
const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ids = OFICIALES.map(p => p.id);
const jug = Object.fromEntries(ids.map(id => [id, 0])), gan = { ...jug };
const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const m = [...ids];
  for (let i = 0; i < 10; i++) { const j = i + Math.floor(rnd() * (m.length - i)); [m[i], m[j]] = [m[j], m[i]]; }
  const a = m.slice(0, 5), b = m.slice(5, 10);
  const c = crearCombate({ equipoJugador: a.map(id => OFICIALES.find(p => p.id === id)), equipoRival: b.map(id => OFICIALES.find(p => p.id === id)), semilla: Math.floor(rnd() * 2e9) });
  let r = c.iniciar(), q = 0;
  while (!r.fin && q++ < 3000) r = c.actuar(elegirIA(c, rnd));
  for (const id of [...a, ...b]) jug[id]++;
  const w = r.fin?.ganador === 'jugador' ? a : r.fin?.ganador === 'rival' ? b : [];
  for (const id of w) gan[id]++;
  if ((g + 1) % 2000 === 0) console.log(`${g + 1}/${N} · ${Math.round((Date.now() - t0) / 1000)} s`);
}
const fuerza = Object.fromEntries(ids.map(id => [id, Math.round(gan[id] / Math.max(1, jug[id]) * 1000) / 10]).sort((x, y) => y[1] - x[1]));
writeFileSync(path.join(aqui, 'fuerza.json'), JSON.stringify({ partidas: N, fecha: new Date().toISOString().slice(0, 10), fuerza }, null, 1) + '\n', 'utf8');
console.log(fuerza);
