// Generador aleatorio con semilla: la misma semilla produce la misma partida (necesario para el multijugador).
export function crearRng(semilla = Date.now()) {
  let a = semilla >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.elegir = arr => arr[Math.floor(rng() * arr.length)];
  // Mezcla determinista (Fisher-Yates) que devuelve una copia. NUNCA usar sort(() => rng() - .5): el resultado de ese
  // truco depende del motor de JavaScript (Chrome y el servidor ordenan distinto) y rompe la repetición de partidas.
  rng.barajar = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return rng;
}
