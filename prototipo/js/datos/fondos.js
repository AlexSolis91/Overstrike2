// Registro de FONDOS ANIMADOS (videos). Hay un grupo por pantalla; al entrar a una pantalla se elige uno al azar de su
// grupo (sin repetir el anterior). Para agregar uno: copiar el video a assets/menu/ y agregar una línea en su grupo.
//   menu:   menú de inicio.
//   equipo: construcción de equipos y la presentación VS (el mismo video sigue sin cortarse; se apaga al entrar a la partida).
//   girar: 90 | -90 → para videos que vienen "de lado" (el contenido horizontal guardado en un cuadro vertical)
//   Los videos siempre suenan en silencio (la música sigue sonando).
export const FONDOS = {
  menu: [
    { archivo: 'assets/menu/fondo-1.mp4', girar: -90 },
  ],
  equipo: [
    { archivo: 'assets/menu/equipo-1.mp4', girar: -90 },
  ],
};
