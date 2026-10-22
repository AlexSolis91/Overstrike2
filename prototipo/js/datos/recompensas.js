// Registro universal de RECOMPENSAS. Un modo de juego que dé premios le pasa a la pantalla de resultados una lista:
//   [{ tipo: 'oro', cantidad: 5967 }, { tipo: 'reliquia', cantidad: 1, rareza: 'Épico', nombre: 'Espada de Obsidiana' }, ...]
// y se muestran con su ícono, cantidad y el color de su rareza. Partida rápida no da recompensas; la Campaña sí (las paga el servidor).
export const TIPOS_RECOMPENSA = {
  oro:        { nombre: 'Oro',        icono: '🪙' },
  reliquia:   { nombre: 'Reliquia',   icono: '💎' },
  fragmento:  { nombre: 'Fragmento',  icono: '🔷' },
  llave:      { nombre: 'Llave',      icono: '🗝️' },
  runa:       { nombre: 'Runa',       icono: '🔮' },
  experiencia: { nombre: 'Experiencia', icono: '✨' },
  vale:       { nombre: 'Vale de sobre', icono: '🎟️' },
  cofre:      { nombre: 'Cofre de estrellas', icono: '🎁' },
  portal:     { nombre: 'Runa de Portal', icono: '🌀', imagen: 'assets/items/runaPortal.png' },
  polvo:      { nombre: 'Polvo Arcano', icono: '🧪' },
};

// Ícono de la Runa de Portal: SIEMPRE su imagen (nunca el emoji), en línea con el texto
export const ICONO_RUNA_PORTAL = '<img class="ico-runa" src="assets/items/runaPortal.png" alt="Runa de Portal" title="Runa de Portal">';

export const COLOR_RAREZA = {
  'Común': '#a3acb9', 'Raro': '#4ade80', 'Especial': '#60a5fa', 'Épico': '#c084fc', 'Legendario': '#fbbf24',
};
