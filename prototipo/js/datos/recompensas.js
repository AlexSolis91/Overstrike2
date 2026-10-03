// Registro universal de RECOMPENSAS. Un modo de juego que dé premios le pasa a la pantalla de resultados una lista:
//   [{ tipo: 'oro', cantidad: 5967 }, { tipo: 'reliquia', cantidad: 1, rareza: 'Épico', nombre: 'Espada de Obsidiana' }, ...]
// y se muestran con su ícono, cantidad y el color de su rareza. Partida rápida todavía no da recompensas (lista vacía).
export const TIPOS_RECOMPENSA = {
  oro:        { nombre: 'Oro',        icono: '🪙' },
  reliquia:   { nombre: 'Reliquia',   icono: '💎' },
  fragmento:  { nombre: 'Fragmento',  icono: '🔷' },
  llave:      { nombre: 'Llave',      icono: '🗝️' },
  runa:       { nombre: 'Runa',       icono: '🔮' },
  experiencia: { nombre: 'Experiencia', icono: '✨' },
};

export const COLOR_RAREZA = {
  'Común': '#a3acb9', 'Raro': '#4ade80', 'Especial': '#60a5fa', 'Épico': '#c084fc', 'Legendario': '#fbbf24',
};
