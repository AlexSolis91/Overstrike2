// Arena en vivo: las dos pantallas corren la misma batalla (misma semilla; el segundo jugador con "invertido") y solo
// viajan las decisiones por un canal de Supabase Realtime. Cada decisión lleva su número de turno. Latido cada 4 s:
// si el rival no da señales en 60 s, ganas por abandono.
import { supabase } from './supabase.js';

// El mismo personaje se llama "jugador-2" en una pantalla y "rival-2" en la otra
export const swapUid = u => !u ? u : u.startsWith('jugador-') ? 'rival-' + u.slice(8) : u.startsWith('rival-') ? 'jugador-' + u.slice(6) : u;
// Ganador en términos del servidor ('a' | 'b' | 'empate') desde mi pantalla
export const ganadorRelativo = (ganador, soy) => ganador === 'empate' ? 'empate' : ganador === 'jugador' ? soy : soy === 'a' ? 'b' : 'a';

export function conectarVivo(arena, { alAbandonar }) {
  const recibidas = new Map(), esperas = new Map();
  let visto = Date.now(), canal = null, latido = null, vigia = null, cerrado = false;
  const v = {
    turno: 0,
    enviar(n, categoria, objetivo) { canal?.send({ type: 'broadcast', event: 'mov', payload: { n, categoria, objetivo } }); },
    esperar(n) {
      if (recibidas.has(n)) return Promise.resolve(recibidas.get(n));
      return new Promise(r => esperas.set(n, r));
    },
    cerrar() {
      if (cerrado) return; cerrado = true;
      clearInterval(latido); clearInterval(vigia);
      for (const r of esperas.values()) r(null);
      if (canal) supabase().then(sb => sb.removeChannel(canal)).catch(() => null);
    },
  };
  // pruebas locales: window.__canalPrueba(nombre) puede dar un canal falso con la misma forma (on/subscribe/send)
  (window.__canalPrueba ? Promise.resolve({ channel: n => window.__canalPrueba(n), removeChannel() {} }) : supabase()).then(sb => {
    if (cerrado) return;
    canal = sb.channel(`arena-${arena.partida}`, { config: { broadcast: { self: false, ack: false } } });
    canal.on('broadcast', { event: 'mov' }, ({ payload }) => {
      visto = Date.now();
      recibidas.set(payload.n, payload);
      const r = esperas.get(payload.n); if (r) { esperas.delete(payload.n); r(payload); }
    });
    canal.on('broadcast', { event: 'hola' }, () => { visto = Date.now(); });
    canal.subscribe();
    latido = setInterval(() => canal.send({ type: 'broadcast', event: 'hola', payload: {} }), 4000);
    vigia = setInterval(() => { if (!cerrado && Date.now() - visto > 60000) { v.cerrar(); alAbandonar(); } }, 2000);
  });
  return v;
}
