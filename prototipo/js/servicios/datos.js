// Datos del jugador en el servidor: colección, inventario, sobres y todas las acciones (que valida el servidor).
import { supabase } from './supabase.js';

async function q(fn) {
  const sb = await supabase();
  const { data, error } = await fn(sb);
  if (error) throw error;
  return data;
}
const rpc = (nombre, args = {}) => q(sb => sb.rpc(nombre, args));

// Las columnas nuevas llegan con los SQL 004 (vales_sobre) y 005 (rel_sobres, espacios_abiertos); sin ellos se lee lo que exista
async function conRespaldo(fn, completo, basico) {
  try { return await fn(completo); }
  catch (e) { if (!/column|does not exist|schema cache/i.test(e?.message || '')) throw e; return fn(basico); }
}
export const miColeccion = () => conRespaldo(c => q(sb => sb.from('coleccion').select(c)), 'campeon, copias, estrellas, espacios, espacios_abiertos', 'campeon, copias, estrellas, espacios');
export const miInventario = () => conRespaldo(c => q(sb => sb.from('inventario').select(c).maybeSingle()),
  'oro, frag_runa, frag_otros, runas, vales_sobre, rel_sobres, runas_portal, polvo_arcano, portal_dia, portal_compras', 'oro, frag_runa, frag_otros, runas');
export const configSobres = () => q(sb => sb.from('sobres_config').select('id, activo, precio, desde, hasta').order('id'));

export const abrirStarter = id => rpc('abrir_starter', { p_starter: id });
export const abrirSobre = id => rpc('abrir_sobre', { p_sobre: id });
export const ascender = c => rpc('ascender', { p_campeon: c });
export const desbloquearEspacio = (c, con, espacio) => rpc('desbloquear_espacio', { p_campeon: c, p_con: con, p_espacio: espacio });
export const desfragmentar = (c, n) => rpc('desfragmentar', { p_campeon: c, p_cantidad: n });
export const combinarRuna = () => rpc('combinar_runa');
export const invocarPortal = c => rpc('invocar_portal', { p_campeon: c });
export const abrirSobreVale = id => rpc('abrir_sobre_vale', { p_sobre: id });

// Reliquias (docs/sql/005_reliquias.sql): cada fila es una copia con sus valores sorteados por el servidor
export const misReliquias = () => conRespaldo(c => q(sb => sb.from('reliquias').select(c).order('obtenida', { ascending: false })),
  'id, reliquia, plana_stat, plana_valor, tiradas, campeon, espacio, obtenida, bloqueada', 'id, reliquia, plana_stat, plana_valor, tiradas, campeon, espacio, obtenida');
export const abrirSobreReliquias = () => rpc('abrir_sobre_reliquias');
export const equiparReliquia = (id, campeon, espacio) => rpc('equipar_reliquia', { p_reliquia: id, p_campeon: campeon, p_espacio: espacio });
export const desequiparReliquia = id => rpc('desequipar_reliquia', { p_reliquia: id });
// Polvo Arcano y fusión (docs/sql/006_horda.sql)
export const bloquearReliquia = (id, si) => rpc('bloquear_reliquia', { p_reliquia: id, p_bloquear: si });
export const descomponerReliquias = ids => rpc('descomponer_reliquias', { p_ids: ids });
export const mejorarReliquia = (id, linea) => rpc('mejorar_reliquia', { p_reliquia: id, p_linea: linea });
export const fusionarReliquias = ids => rpc('fusionar_reliquias', { p_ids: ids });
export const forjarLegendaria = (id, ids) => rpc('forjar_legendaria', { p_legendaria: id, p_ids: ids });   // docs/sql/007_recetas.sql

// Horda (docs/sql/006_horda.sql): entrar cuesta 1 Runa de Portal; el servidor cobra cada oleada y cierra la partida
export const hordaEntrar = horda => rpc('horda_entrar', { p_horda: horda });
export const hordaOleada = (partida, oleada) => rpc('horda_oleada', { p_partida: partida, p_oleada: oleada });
export const hordaTerminar = partida => rpc('horda_terminar', { p_partida: partida });
export const miRecordHorda = horda => q(sb => sb.from('horda_partidas').select('oleada').eq('horda', horda).order('oleada', { ascending: false }).limit(1));
export const comprarRunaPortal = () => rpc('comprar_runa_portal');

// Arena (docs/sql/008_arena.sql)
export const arenaEstado = () => rpc('arena_estado');
export const arenaGuardarEquipo = (tipo, equipo) => rpc('arena_guardar_equipo', { p_tipo: tipo, p_equipo: equipo });
export const arenaAtacar = ataque => rpc('arena_atacar', { p_ataque: ataque });
export const arenaResultado = (combate, gano) => rpc('arena_resultado', { p_combate: combate, p_gano: gano });
export const arenaRanking = liga => rpc('arena_ranking', { p_liga: liga || null });
export const arenaHistorial = () => rpc('arena_historial_defensa');

// Campaña: progreso (solo lectura) y cobrar una victoria (el servidor valida desbloqueo, tiempo entre repeticiones y paga)
export const miCampana = area => q(sb => sb.from('campana_progreso').select('dificultad, etapa, estrellas, victorias, ultima').eq('area', area));
export const campanaCompletar = (area, dificultad, etapa, estrellas) => rpc('campana_completar', { p_area: area, p_dificultad: dificultad, p_etapa: etapa, p_estrellas: estrellas });

// Administrador (el servidor rechaza si no lo es)
export async function adminGuardarSobre(id, cambios) {
  const filas = await q(sb => sb.from('sobres_config').update(cambios).eq('id', id).select());
  if (!filas?.length) throw new Error('El servidor no guardó el cambio (¿tu cuenta es administrador?).');   // RLS no da error: solo no cambia nada
  return filas[0];
}
export const adminDarOro = (nombre, oro) => rpc('admin_dar_oro', { p_nombre: nombre, p_oro: oro });
// Probabilidad de salida por campeón (nivel según su fuerza) y "solo en su sobre"
export const catalogoProbabilidades = () => q(sb => sb.from('campeones').select('id, nombre, nivel, solo_su_sobre').order('nombre'));
export const adminProbabilidad = (id, nivel, solo) => rpc('admin_probabilidad_campeon', { p_campeon: id, p_nivel: nivel, p_solo: solo });

// Mensajes del servidor → español
export function mensajeError(e) {
  const m = String(e?.message || e || '');
  if (/Failed to fetch|NetworkError|import/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (/JWT|not authenticated|Inicia sesión/i.test(m)) return 'Inicia sesión primero.';
  return m || 'Ocurrió un error. Intenta de nuevo.';
}
