// Copia en este dispositivo de la partida de Horda en curso (se escribe en cada decisión; al servidor va al terminar cada oleada).
const CLAVE = 'os2-horda-partida';

export function guardarLocal(g) { try { localStorage.setItem(CLAVE, JSON.stringify(g)); } catch { /* sin almacenamiento */ } }
export function leerLocal(partida) {
  try { const g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return g?.partida === partida ? g : null; } catch { return null; }
}
export function borrarLocal(partida) {
  try { if (JSON.parse(localStorage.getItem(CLAVE) || 'null')?.partida === partida) localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}
