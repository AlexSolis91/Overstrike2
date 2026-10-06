# Plan: cuentas, base de datos, tienda y panel de administrador

Lo necesario para lanzar la **beta** (jugadores con cuenta y progresión) y para que el administrador active o desactive
los sobres de la tienda. Hoy el juego es una página estática en GitHub Pages: todo pasa en el navegador de cada jugador
y no hay cuentas ni servidor.

## 1. Elegir el servidor (recomendado: Supabase)

| Opción | Ventajas | Desventajas |
|---|---|---|
| **Supabase** (recomendada) | Cuentas listas (correo, Google), base de datos PostgreSQL, permisos por fila, funciones en el servidor, plan gratuito amplio. Funciona con nuestra página estática (sin cambiar GitHub Pages) | Hay que aprender un poco de SQL |
| Firebase | Muy popular, cuentas listas | Base de datos de documentos (menos cómoda para inventarios y colecciones); reglas de seguridad más difíciles |
| Servidor propio | Control total | Hay que mantenerlo, pagarlo y protegerlo |

## 2. Cuentas de jugador
- Registro e inicio de sesión con **correo + contraseña** y **Google**.
- Al crear la cuenta: nombre de jugador, y la **pantalla de Starter Pack** (una sola vez).
- La sesión se queda guardada en el navegador.

## 3. Base de datos (tablas principales)

| Tabla | Qué guarda |
|---|---|
| `jugadores` | id (de la cuenta), nombre, **rol** (`jugador` / `admin`), fecha de alta, si ya eligió Starter Pack |
| `coleccion` | jugador, campeón, **copias**, **estrellas**, espacios de reliquias desbloqueados |
| `inventario` | jugador, oro, **fragmentos de Runa de Invocación**, runas, otros fragmentos, reliquias |
| `reliquias_jugador` | cada reliquia con sus tiradas y a qué campeón/espacio está equipada |
| `sobres_config` | id del sobre, **activo**, precio, temporada (fechas opcionales) |
| `aperturas` | registro de cada sobre abierto: jugador, sobre, campeones obtenidos, fecha (historial y control) |

**Permisos:** cada jugador solo puede leer y modificar **sus** filas; `sobres_config` solo la modifica un `admin`.

## 4. Abrir sobres en el SERVIDOR (muy importante)
Si el azar de un sobre se calcula en el navegador, un jugador con conocimientos podría hacer trampa: elegir qué campeones
le salen o darse copias. Por eso la apertura debe ser una **función del servidor**, que:
1. Verifica que el sobre esté **activo** y que el jugador pague el precio.
2. Tira el azar (la misma lógica de `abrirSobre` que ya está escrita en `js/datos/sobres.js`).
3. Guarda las copias en `coleccion` y registra la apertura.
4. Devuelve el resultado al juego, que solo lo muestra.

Lo mismo para el **Starter Pack** (una sola vez por cuenta), desfragmentar, combinar runas y el **Portal de Invocación**.

## 5. Panel de administrador
- Tu cuenta tendrá rol `admin` (se asigna una vez en la base de datos).
- En el menú aparecerá **"Administración"** solo para ti, con:
  - **Tienda:** una casilla por sobre (activo / inactivo), precio y temporada. Al guardar, cambia `sobres_config` y
    todos los jugadores ven la tienda actualizada.
  - (Más adelante) ver jugadores, dar recompensas, eventos.

## 6. Qué se queda en el navegador
- El **combate contra la IA** puede seguir en el navegador (como hoy).
- Para **Arena / Multijugador** contra otros jugadores, más adelante habrá que validar los resultados en el servidor
  para evitar trampas.

## 7. Orden sugerido de trabajo
1. Crear el proyecto de Supabase (lo creas tú con tu correo; me pasas la dirección y la llave pública, que sí se puede
   poner en la página. **Nunca** se comparte la llave secreta).
2. Cuentas: registro, inicio de sesión y perfil.
3. Tablas de colección e inventario; guardar la colección del jugador.
4. Pantalla de **Starter Pack** al crear la cuenta (apertura en el servidor).
5. **Tienda** con los sobres activos (apertura en el servidor).
6. **Panel de administrador** con las casillas de los sobres.
7. Copias: ascensión, desbloqueo de espacios, desfragmentar, runas y Portal de Invocación.
8. Beta cerrada con pocos jugadores para probar todo antes de abrir.

## 8. Costos
- Supabase: plan gratuito para empezar (suficiente para una beta pequeña). Si crece, el plan de pago empieza en unos
  25 USD al mes.
- GitHub Pages sigue siendo gratis para la página del juego.
