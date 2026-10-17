// Genera docs/sql/catalogo.sql: la lista de campeones (con su Starter Pack y sus sobres) que necesita el SERVIDOR
// para abrir sobres y Starter Packs. Se vuelve a generar cada vez que agregamos o reclasificamos un campeón.
// Uso (desde la carpeta prototipo):  node herramientas/generar_catalogo.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const { OFICIALES } = await import(pathToFileURL(path.join(aqui, '../js/datos/personajes/index.js')).href);
const { RELIQUIAS, TIPOS, RANGOS } = await import(pathToFileURL(path.join(aqui, '../js/datos/reliquias.js')).href);

const q = s => s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`;
const filas = OFICIALES.map(p => `  (${q(p.id)}, ${q(p.nombre)}, ${q(p.starter || null)}, array[${(p.sobres || []).map(q).join(', ')}]::text[], true)`);
const rangos = [];
for (const [stat, porRareza] of Object.entries(RANGOS)) for (const [rareza, r] of Object.entries(porRareza)) if (r) rangos.push(`  (${q(rareza)}, ${q(stat)}, ${r[0]}, ${r[1]})`);
const sql = `-- Catálogo de campeones para el servidor (GENERADO por herramientas/generar_catalogo.mjs, no editar a mano).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar las veces que haga falta.
insert into public.campeones (id, nombre, starter, sobres, activo) values
${filas.join(',\n')}
on conflict (id) do update set nombre = excluded.nombre, starter = excluded.starter, sobres = excluded.sobres, activo = excluded.activo;
-- ${OFICIALES.length} campeones

-- ============================================================ RELIQUIAS (requiere docs/sql/005_reliquias.sql)
insert into public.reliquia_tipos (tipo, categoria, planas, pcts) values
${Object.entries(TIPOS).map(([t, d]) => `  (${q(t)}, ${q(d.categoria)}, array[${d.plana.map(q).join(', ')}]::text[], array[${d.pct.map(q).join(', ')}]::text[])`).join(',\n')}
on conflict (tipo) do update set categoria = excluded.categoria, planas = excluded.planas, pcts = excluded.pcts;

insert into public.reliquia_rangos (rareza, stat, minimo, maximo) values
${rangos.join(',\n')}
on conflict (rareza, stat) do update set minimo = excluded.minimo, maximo = excluded.maximo;

insert into public.reliquias_catalogo (id, nombre, rareza, tipo, en_sobre, solo_receta, activo) values
${Object.entries(RELIQUIAS).map(([id, r]) => `  (${q(id)}, ${q(r.name)}, ${q(r.rarity)}, ${q(r.type)}, ${!!r.enSobre}, ${!!r.soloReceta}, true)`).join(',\n')}
on conflict (id) do update set nombre = excluded.nombre, rareza = excluded.rareza, tipo = excluded.tipo,
  en_sobre = excluded.en_sobre, solo_receta = excluded.solo_receta, activo = excluded.activo;
-- ${Object.keys(RELIQUIAS).length} reliquias · ${Object.keys(TIPOS).length} tipos
`;
writeFileSync(path.join(aqui, '../../docs/sql/catalogo.sql'), sql, 'utf8');
console.log(`docs/sql/catalogo.sql: ${OFICIALES.length} campeones · ${Object.keys(RELIQUIAS).length} reliquias · ${Object.keys(TIPOS).length} tipos · ${rangos.length} rangos`);
