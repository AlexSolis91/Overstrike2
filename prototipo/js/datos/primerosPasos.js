// Primeros pasos: objetivos para jugadores nuevos, con premios pequeños. El servidor revisa si se cumplieron y paga
// (docs/sql/040_tutorial_vale_primeros_pasos.sql). Los premios deben ser IGUALES a los de _pp_premio (lo revisa una prueba).
// ir: a dónde lleva el botón "Ir" (pantalla del juego o pestaña de la Tienda/Colección).
export const PRIMEROS_PASOS = [
  { clave: 'campana3', texto: 'Gana la etapa 3 de la Campaña (Normal)', premio: { oro: 10000 }, ir: 'campana' },
  { clave: 'reliquia', texto: 'Equipa una reliquia a un campeón', premio: { oro: 10000 }, ir: 'tc:coleccion' },
  { clave: 'ascender', texto: 'Asciende un campeón a 1★', premio: { oro: 15000 }, ir: 'tc:coleccion' },
  { clave: 'horda5', texto: 'Supera la oleada 5 de la Horda', premio: { runas_portal: 2 }, ir: 'horda' },
  { clave: 'raid', texto: 'Ataca al Jefe de Raid', premio: { oro: 10000 }, ir: 'raid' },
  { clave: 'arena', texto: 'Gana un combate en la Arena', premio: { oro: 15000 }, ir: 'arena' },
  { clave: 'campana10', texto: 'Gana la etapa 10 de la Campaña (Normal)', premio: { vales: 1 }, ir: 'campana' },
  { clave: 'todos', texto: '¡Completa todos los primeros pasos!', premio: { oro: 20000, vales: 1 }, final: true },
];
