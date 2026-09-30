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
  return rng;
}
