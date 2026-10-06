// Cuenta del jugador: registro, inicio de sesión, perfil y cierre de sesión (Supabase).
// Por ahora la cuenta es OPCIONAL: se puede jugar sin ella. Más adelante guardará la colección y la progresión.
import { supabase } from '../servicios/supabase.js';
import { configSobres, adminGuardarSobre, adminDarOro, mensajeError } from '../servicios/datos.js';
import { SOBRES } from '../datos/sobres.js';

const $ = s => document.querySelector(s);
let perfil = null;                 // { nombre, rol, starter_elegido } del jugador conectado
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
      <p class="cu-nota">Tu colección, tu oro y tus sobres se guardan en tu cuenta.</p>
      <button id="cu-salir" class="eq-btn">Cerrar sesión</button>
      ${perfil.rol === 'admin' ? '<section id="cu-adm" class="cu-adm"><h3>🛠️ Administrador</h3><p class="cu-nota">Cargando…</p></section>' : ''}`;
    if (perfil.rol === 'admin') pintarAdmin();
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
    const { data, error } = await sb.from('jugadores').select('nombre, rol, starter_elegido').eq('id', sesion.user.id).single();
    perfil = error ? { nombre: sesion.user.email, rol: 'jugador', starter_elegido: null } : data;
  } catch { perfil = { nombre: sesion.user.email, rol: 'jugador', starter_elegido: null }; }
  pintarBoton();
}
// Avisa a las demás pantallas (Tienda, Colección, Starter Pack) que entró o salió alguien
const avisarSesion = () => dispatchEvent(new CustomEvent('cuenta:cambio', { detail: perfil }));

// ---------------------------------------------------------------- panel de administrador
// Sobres de la tienda (activar / desactivar y precio) y dar oro a un jugador. El servidor vuelve a verificar que eres admin.
async function pintarAdmin(msg = '', tipo = '') {
  const caja = $('#cu-adm');
  if (!caja) return;
  let cfg = [];
  try { cfg = await configSobres(); } catch (e) { msg = mensajeError(e); tipo = 'error'; }
  if (!$('#cu-adm')) return;
  caja.innerHTML = `<h3>🛠️ Administrador</h3>
    <p class="cu-nota">Sobres visibles en la tienda (por temporada):</p>
    ${cfg.map(c => { const s = SOBRES[c.id] || { nombre: c.id, icono: '🎁' };
      return `<div class="adm-sobre" data-id="${c.id}"><label><input type="checkbox" class="adm-activo" ${c.activo ? 'checked' : ''}> ${s.icono} ${s.nombre}</label>
        <input type="number" class="adm-precio" min="0" step="100" value="${c.precio}" title="Precio en oro"><span>oro</span></div>`; }).join('')}
    <button id="adm-guardar" class="eq-btn">Guardar sobres</button>
    <p class="cu-nota">Dar oro a un jugador:</p>
    <form id="adm-oro" class="adm-oro"><input id="adm-nombre" placeholder="Nombre del jugador" required><input id="adm-cant" type="number" min="1" step="1" value="10000" required title="Oro a dar"><button class="eq-btn">Dar</button></form>
    ${msg ? `<p class="cu-msg ${tipo}">${msg}</p>` : ''}`;
}
async function guardarSobres() {
  const btn = $('#adm-guardar'); btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    for (const fila of document.querySelectorAll('.adm-sobre')) {
      const precio = Math.max(0, Math.floor(Number(fila.querySelector('.adm-precio').value) || 0));
      await adminGuardarSobre(fila.dataset.id, { activo: fila.querySelector('.adm-activo').checked, precio });
    }
    pintarAdmin('Sobres guardados. Los jugadores los verán al abrir la tienda.', 'ok');
  } catch (e) { pintarAdmin(mensajeError(e), 'error'); }
}
async function darOro(e) {
  e.preventDefault();
  const nombre = $('#adm-nombre').value.trim(), oro = Math.floor(Number($('#adm-cant').value));
  try { const total = await adminDarOro(nombre, oro); pintarAdmin(`Listo: ${nombre} ahora tiene ${Number(total).toLocaleString('es-MX')} de oro.`, 'ok'); dispatchEvent(new Event('inventario:cambio')); }
  catch (err) { pintarAdmin(mensajeError(err), 'error'); }
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
    if (e.target.closest('#adm-guardar')) return guardarSobres();
    if (e.target.closest('#cu-olvide')) {
      const correo = $('#cu-correo')?.value.trim();
      if (!correo) return pintar('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".', 'error');
      try { const { error } = await (await supabase()).auth.resetPasswordForEmail(correo, { redirectTo: location.origin + location.pathname }); if (error) throw error;
        pintar('Te enviamos un correo para cambiar tu contraseña.', 'ok'); } catch (err) { pintar(traducir(err), 'error'); }
    }
  });
  $('#cuenta').addEventListener('submit', e => { if (e.target.id === 'cu-form') enviar(e); else if (e.target.id === 'adm-oro') darOro(e); });
  pintarBoton();
  // Sesión guardada y cambios de sesión (entrar / salir / confirmar correo)
  supabase().then(async sb => {
    let ultimoId;   // onAuthStateChange también avisa al renovar el token: solo reaccionamos si cambió el jugador
    sb.auth.onAuthStateChange((_ev, sesion) => { setTimeout(async () => {
      const id = sesion?.user.id ?? null;
      if (id === ultimoId) return;
      ultimoId = id;
      await cargarPerfil(sesion); avisarSesion();
      if (!$('#cuenta').classList.contains('hidden')) pintar();
    }, 0); });
  }).catch(() => { /* sin conexión: se juega sin cuenta */ });
}
