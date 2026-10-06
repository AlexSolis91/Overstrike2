// Cuenta del jugador: registro, inicio de sesión, perfil y cierre de sesión (Supabase).
// Por ahora la cuenta es OPCIONAL: se puede jugar sin ella. Más adelante guardará la colección y la progresión.
import { supabase } from '../servicios/supabase.js';

const $ = s => document.querySelector(s);
let perfil = null;                 // { nombre, rol } del jugador conectado
let modo = 'entrar';               // 'entrar' | 'crear'

export const perfilActual = () => perfil;
export const esAdmin = () => perfil?.rol === 'admin';

// Mensajes del servidor → español
function traducir(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de entrar (revisa tu bandeja y la carpeta de spam).';
  if (/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/at least 6|Password should/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/valid email|invalid format|Unable to validate email/i.test(m)) return 'Ese correo no es válido.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  if (/Database error saving new user/i.test(m)) return 'No se pudo crear el perfil (¿ese nombre ya existe?). Prueba otro nombre.';
  if (/Failed to fetch|NetworkError|import/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet.';
  return m || 'Ocurrió un error. Intenta de nuevo.';
}

function pintarBoton() {
  const b = $('#btn-cuenta');
  if (!b) return;
  b.textContent = perfil ? `👤 ${perfil.nombre}${perfil.rol === 'admin' ? ' · Admin' : ''}` : '👤 Iniciar sesión';
}

function pintar(mensaje = '', tipo = '') {
  const caja = $('#cuenta-cont');
  if (perfil) {
    caja.innerHTML = `
      <p class="cu-hola">Hola, <b>${perfil.nombre}</b>${perfil.rol === 'admin' ? ' <span class="cu-admin">Administrador</span>' : ''}</p>
      <p class="cu-nota">Tu cuenta guardará tu colección y tu progreso cuando activemos los sobres y la tienda.</p>
      <button id="cu-salir" class="eq-btn">Cerrar sesión</button>`;
  } else {
    const crear = modo === 'crear';
    caja.innerHTML = `
      <div class="cu-tabs"><button data-modo="entrar" class="${crear ? '' : 'on'}">Iniciar sesión</button><button data-modo="crear" class="${crear ? 'on' : ''}">Crear cuenta</button></div>
      <form id="cu-form" autocomplete="on">
        ${crear ? '<label>Nombre de jugador<input id="cu-nombre" maxlength="20" minlength="3" required placeholder="3 a 20 letras o números" autocomplete="nickname"></label>' : ''}
        <label>Correo<input id="cu-correo" type="email" required autocomplete="email"></label>
        <label>Contraseña<input id="cu-pass" type="password" minlength="6" required autocomplete="${crear ? 'new-password' : 'current-password'}"></label>
        <button type="submit" class="eq-listo">${crear ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      ${crear ? '' : '<button id="cu-olvide" class="cu-link">¿Olvidaste tu contraseña?</button>'}`;
  }
  if (mensaje) caja.insertAdjacentHTML('beforeend', `<p class="cu-msg ${tipo}">${mensaje}</p>`);
}

async function cargarPerfil(sesion) {
  if (!sesion) { perfil = null; pintarBoton(); return; }
  try {
    const sb = await supabase();
    const { data, error } = await sb.from('jugadores').select('nombre, rol').eq('id', sesion.user.id).single();
    perfil = error ? { nombre: sesion.user.email, rol: 'jugador' } : data;
  } catch { perfil = { nombre: sesion.user.email, rol: 'jugador' }; }
  pintarBoton();
}

async function enviar(e) {
  e.preventDefault();
  const correo = $('#cu-correo').value.trim(), pass = $('#cu-pass').value, nombre = $('#cu-nombre')?.value.trim();
  const btn = $('#cu-form button[type=submit]'); btn.disabled = true; btn.textContent = 'Un momento…';
  try {
    const sb = await supabase();
    if (modo === 'crear') {
      if (!/^[A-Za-z0-9_ ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$/.test(nombre)) throw new Error('El nombre debe tener de 3 a 20 letras, números, espacios o guiones bajos.');
      const { data: libre, error: e1 } = await sb.rpc('nombre_disponible', { p_nombre: nombre });
      if (e1) throw e1;
      if (!libre) throw new Error('Ese nombre ya está en uso. Elige otro.');
      const { data, error } = await sb.auth.signUp({ email: correo, password: pass, options: { data: { nombre }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) { modo = 'entrar'; return pintar('¡Cuenta creada! Te enviamos un correo para confirmarla. Después inicia sesión aquí.', 'ok'); }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: correo, password: pass });
      if (error) throw error;
    }
  } catch (err) { pintar(traducir(err), 'error'); }
}

export function iniciarCuenta() {
  $('#btn-cuenta')?.addEventListener('click', () => { pintar(); $('#cuenta').classList.remove('hidden'); });
  $('#cuenta').addEventListener('click', async e => {
    if (e.target.id === 'cuenta' || e.target.closest('#cuenta-x')) return $('#cuenta').classList.add('hidden');
    const tab = e.target.closest('.cu-tabs button'); if (tab) { modo = tab.dataset.modo; return pintar(); }
    if (e.target.closest('#cu-salir')) { (await supabase()).auth.signOut(); return; }
    if (e.target.closest('#cu-olvide')) {
      const correo = $('#cu-correo')?.value.trim();
      if (!correo) return pintar('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".', 'error');
      try { const { error } = await (await supabase()).auth.resetPasswordForEmail(correo, { redirectTo: location.origin + location.pathname }); if (error) throw error;
        pintar('Te enviamos un correo para cambiar tu contraseña.', 'ok'); } catch (err) { pintar(traducir(err), 'error'); }
    }
  });
  $('#cuenta').addEventListener('submit', e => { if (e.target.id === 'cu-form') enviar(e); });
  pintarBoton();
  // Sesión guardada y cambios de sesión (entrar / salir / confirmar correo)
  supabase().then(async sb => {
    sb.auth.onAuthStateChange((_ev, sesion) => { setTimeout(async () => { await cargarPerfil(sesion); if (!$('#cuenta').classList.contains('hidden')) pintar(); }, 0); });
    const { data } = await sb.auth.getSession();
    await cargarPerfil(data.session);
  }).catch(() => { /* sin conexión: se juega sin cuenta */ });
}
