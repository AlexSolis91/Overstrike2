// Genera docs/supabase/verificar-raid.ts: la Edge Function con TODO el motor adentro, en un solo archivo.
// Supabase no puede importar el motor desde github.io ni desde jsDelivr al publicar la función.
// Uso (desde la raíz del repositorio): node prototipo/herramientas/empaquetar_verificador.mjs [--prueba archivo.mjs]
// Hay que volver a generarla y publicarla cada vez que cambien las fichas de los campeones o del jefe.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const JS = resolve(AQUI, '../js');
const SALIDA = resolve(AQUI, '../../docs/supabase/verificar-raid.ts');
const ENTRADAS = ['motor/verificar.js', 'datos/cuenta.js'].map(f => resolve(JS, f));

const modulos = new Map();
const orden = [], visitando = new Set();
const id = f => relative(JS, f).replaceAll('\\', '/');

async function visitar(f) {
  if (modulos.has(f)) return;
  if (visitando.has(f)) throw new Error(`Importación circular: ${id(f)}`);
  visitando.add(f);
  let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (/\bimport\s*\(|import\.meta|\bdocument\.|\bwindow\./.test(s)) throw new Error(`${id(f)} no se puede empaquetar (DOM o import dinámico)`);
  const deps = [];
  const dep = esp => { const d = resolve(dirname(f), esp); deps.push(d); return d; };
  const lista = t => t.split(',').map(x => x.trim()).filter(Boolean).map(x => x.split(/\s+as\s+/));
  const pendientes = [];
  // import ... from: se vuelve una lectura del módulo ya evaluado
  s = s.replace(/^import\s+([\s\S]*?)\s+from\s+'([^']+)';?[ \t]*$/gm, (_, que, esp) => {
    const d = id(dep(esp));
    const r = `__m[${JSON.stringify(d)}]`;
    const salida = [];
    const def = que.match(/^([\w$]+)\s*(?:,|$)/);
    if (def) salida.push(`const ${def[1]} = ${r}.default;`);
    const est = que.match(/\*\s+as\s+([\w$]+)/);
    if (est) salida.push(`const ${est[1]} = ${r};`);
    const lla = que.match(/\{([\s\S]*)\}/);
    if (lla) salida.push(`const { ${lista(lla[1]).map(([a, b]) => b ? `${a}: ${b}` : a).join(', ')} } = ${r};`);
    return salida.join(' ');
  });
  // export { a, b } from: se reexporta al final
  s = s.replace(/^export\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';?[ \t]*$/gm, (_, que, esp) => {
    const d = id(dep(esp));
    for (const [a, b] of lista(que)) pendientes.push(`__e[${JSON.stringify(b || a)}] = __m[${JSON.stringify(d)}][${JSON.stringify(a)}];`);
    return '';
  });
  s = s.replace(/^export\s*\{([\s\S]*?)\};?[ \t]*$/gm, (_, que) => {
    for (const [a, b] of lista(que)) pendientes.push(`__e[${JSON.stringify(b || a)}] = ${a};`);
    return '';
  });
  const tieneDefault = /^export\s+default\s/m.test(s);
  s = s.replace(/^export\s+default\s+/m, '__e.default = ');
  s = s.replace(/^export\s+(const|let|var|function|async function|class)\s/gm, '$1 ');
  // Los nombres exportados los dice el propio módulo al cargarlo, así no hay que interpretar el código
  const reales = Object.keys(await import(pathToFileURL(f).href));
  const yaExplicitos = new Set(pendientes.map(p => p.match(/__e\["([^"]+)"\]/)[1]));
  for (const n of reales) if (n !== 'default' && !yaExplicitos.has(n)) pendientes.push(`__e[${JSON.stringify(n)}] = ${n};`);
  if (tieneDefault !== reales.includes('default') && !yaExplicitos.has('default')) throw new Error(`default dudoso en ${id(f)}`);
  for (const d of deps) await visitar(d);
  visitando.delete(f);
  modulos.set(f, { cuerpo: s, final: pendientes });
  orden.push(f);
}
for (const e of ENTRADAS) await visitar(e);

const paquete = orden.map(f => {
  const { cuerpo, final } = modulos.get(f);
  return `__m[${JSON.stringify(id(f))}] = (() => { const __e: any = {};\n${cuerpo}\n${final.join('\n')}\nreturn __e; })();`;
}).join('\n\n');

const encabezado = `// @ts-nocheck
// Edge Function "verificar-raid" (Supabase → Edge Functions → Deploy a new function → Via Editor → nombre: verificar-raid).
// ARCHIVO GENERADO por prototipo/herramientas/empaquetar_verificador.mjs: no editar a mano.
// Repite un ataque al Jefe de Raid con el MISMO motor del juego (viene incluido abajo) y cuenta el daño que sale de esa repetición.
// Si el ataque se jugó con otra versión del juego (fichas distintas), acepta el daño reportado, igual que la Arena.
// Las llaves SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo: no hay que escribir ninguna.
// Después de publicarla (y cada vez que cambien las fichas, generarla y publicarla otra vez), encender en el SQL Editor:
//   update public.raid_config set verificar = true;
`;
const servidor = `
const { repetirRaid } = __m["motor/verificar.js"];
const { VERSION } = __m["datos/cuenta.js"];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { ataque } = await req.json();
    const url = Deno.env.get('SUPABASE_URL');
    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await usuario.auth.getUser();
    if (!user) return json({ error: 'Inicia sesión primero' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: a } = await admin.from('raid_ataques').select('*').eq('id', ataque).single();
    if (!a || a.jugador !== user.id) return json({ error: 'No existe ese ataque' }, 404);
    if (a.estado !== 'pendiente') return json({ error: 'Ese ataque no espera verificación' }, 400);
    const r = a.version === VERSION ? repetirRaid(a) : { ok: true, dano: a.dano };
    const { data, error } = await admin.rpc('raid_resultado_verificado', { p_ataque: ataque, p_dano: r.ok ? r.dano : 0 });
    if (error) return json({ error: error.message }, 400);
    return json({ ...data, verificado: r.ok, motivo: r.motivo || '' });
  } catch (e) { return json({ error: String(e?.message || e) }, 500); }
});
`;
const base = `const __m: any = {};\n\n${paquete}\n`;
writeFileSync(SALIDA, `${encabezado}import { createClient } from 'npm:@supabase/supabase-js@2';\n\n${base}${servidor}`);
const i = process.argv.indexOf('--prueba');
if (i > 0) writeFileSync(process.argv[i + 1], `${base.replaceAll('const __e: any', 'const __e').replace('const __m: any', 'const __m')}\nexport const repetirRaid = __m["motor/verificar.js"].repetirRaid;\nexport const VERSION = __m["datos/cuenta.js"].VERSION;\nexport const repetirCombate = __m["motor/verificar.js"].repetirCombate;\n`);
console.log(`${orden.length} módulos · ${Math.round(readFileSync(SALIDA).length / 1024)} KB → ${relative(process.cwd(), SALIDA)}`);
