// IA simple: elige movimiento y objetivo usando solo lo que el motor ofrece (las mismas reglas que el jugador).
import { INVOCACIONES } from '../datos/invocaciones.js';

export function elegirIA(combate) {
  const esp = combate.esperando;
  const P = combate.personajes;
  const a = P.find(p => p.uid === esp.id);
  const por = uid => P.find(p => p.uid === uid);
  const ratio = p => p.hp / combate.stats(p).hp;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const invocaciones = key => a.estados.filter(e => e.id === 'summon' && (!key || e.key === key)).length;

  const planes = [];
  for (const op of esp.opciones) {
    if (!op.disponible) continue;
    const mov = a.movimientos.find(m => m.categoria === op.categoria);
    const acciones = (mov.efectos || []).map(e => e.accion.tipo);
    let objetivo = null;

    if (acciones.includes('potenciarInvocaciones') && invocaciones() < 2) continue;   // Dominio: vale la pena con 2+ sombras
    if (mov.invocar) {
      const def = INVOCACIONES[mov.invocar];
      if (invocaciones(mov.invocar) >= (def.max || 1) && invocaciones() >= 3) continue;
    } else if (mov.desatar) {
      if (invocaciones(mov.desatar) < 2) continue;
    } else if (mov.objetivo === 'enemigo') {
      const cands = op.objetivos.map(por);
      objetivo = Math.random() < .4 ? cands.reduce((x, y) => ratio(x) < ratio(y) ? x : y) : pick(cands);
    } else if (mov.objetivo === 'aliado') {
      const cands = op.objetivos.map(por);
      if (acciones.includes('limpiar')) {
        const con = cands.filter(p => p.estados.some(e => ['burn', 'poison', 'bleed', 'hemo', 'bomb', 'fear', 'confuse'].includes(e.id)));
        objetivo = con.length ? con.reduce((x, y) => ratio(x) < ratio(y) ? x : y) : null;
        if (!objetivo) continue;
      } else {
        const sanables = acciones.includes('curar') ? cands.filter(p => !p.estados.some(e => e.id === 'solarBurn')) : cands;   // Quemadura Solar: curarlo lo daña
        if (!sanables.length) continue;
        objetivo = sanables.reduce((x, y) => ratio(x) < ratio(y) ? x : y);
        if (acciones.includes('curar') && ratio(objetivo) > .85) continue;
      }
    } else if (mov.objetivo === 'todosAliados' && acciones.includes('curar') && !acciones.includes('efecto') && !acciones.includes('escudo')) {
      if (P.filter(p => p.lado === a.lado && !p.muerto).every(p => ratio(p) > .8)) continue;
    }
    planes.push({ categoria: op.categoria, objetivo: objetivo?.uid || null });
  }

  if (!planes.length) {                 // nada "ideal": usa el primer movimiento disponible con un objetivo válido
    const op = esp.opciones.find(o => o.disponible && (o.objetivos.length || !['enemigo', 'aliado'].includes(a.movimientos.find(m => m.categoria === o.categoria).objetivo)));
    return { categoria: op.categoria, objetivo: op.objetivos[0] || null };
  }
  const de = c => planes.find(p => p.categoria === c);
  if (de('over') && Math.random() < .75) return de('over');
  if (de('especial') && Math.random() < .7) return de('especial');
  return de('basico') || planes[0];
}
