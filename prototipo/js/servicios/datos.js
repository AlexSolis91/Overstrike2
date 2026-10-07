// Datos del jugador en el servidor: colección, inventario, sobres y todas las acciones (que valida el servidor).
import { supabase } from './supabase.js';

async function q(fn) {
  const sb = await supabase();
  const { data, error } = await fn(sb);
  if (error) throw error;
  return data;
}
const rpc = (nombre, args = {}) => q(sb => sb.rpc(nombre, args));

export const miColeccion = () => q(sb => sb.from('coleccion').select('campeon, copias, estrellas, espacios'));
export const miInventario = () => q(sb => sb.from('inventario').select('oro, frag_runa, frag_otros, runas').maybeSingle());
export const configSobres = () => q(sb => sb.from('sobres_config').select('id, activo, precio, desde, hasta').order('id'));

export const abrirStarter = id => rpc('abrir_starter', { p_starter: id });
export const abrirSobre = id => rpc('abrir_sobre', { p_sobre: id });
export const ascender = c => rpc('ascender', { p_campeon: c });
export const desbloquearEspacio = (c, con) => rpc('desbloquear_espacio', { p_campeon: c, p_con: con });
export const desfragmentar = (c, n) => rpc('desfragmentar', { p_campeon: c, p_cantidad: n });
export const combinarRuna = () => rpc('combinar_runa');
export const invocarPortal = c => rpc('invocar_portal', { p_campeon: c });

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
