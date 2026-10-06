// Genera docs/sql/catalogo.sql: la lista de campeones (con su Starter Pack y sus sobres) que necesita el SERVIDOR
// para abrir sobres y Starter Packs. Se vuelve a generar cada vez que agregamos o reclasificamos un campeón.
// Uso (desde la carpeta prototipo):  node herramientas/generar_catalogo.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const { OFICIALES } = await import(pathToFileURL(path.join(aqui, '../js/datos/personajes/index.js')).href);

const q = s => s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`;
const filas = OFICIALES.map(p => `  (${q(p.id)}, ${q(p.nombre)}, ${q(p.starter || null)}, array[${(p.sobres || []).map(q).join(', ')}]::text[], true)`);
const sql = `-- Catálogo de campeones para el servidor (GENERADO por herramientas/generar_catalogo.mjs, no editar a mano).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar las veces que haga falta.
insert into public.campeones (id, nombre, starter, sobres, activo) values
${filas.join(',\n')}
on conflict (id) do update set nombre = excluded.nombre, starter = excluded.starter, sobres = excluded.sobres, activo = excluded.activo;
-- ${OFICIALES.length} campeones
`;
writeFileSync(path.join(aqui, '../../docs/sql/catalogo.sql'), sql, 'utf8');
console.log(`docs/sql/catalogo.sql: ${OFICIALES.length} campeones`);
