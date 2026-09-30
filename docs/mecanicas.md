# Overstrike 2 — Registro de mecánicas

Referencia oficial de **todas** las piezas del juego. Cada mecánica existe **una sola vez** en el motor
(`prototipo/js/motor/`) y los personajes solo la combinan desde su ficha. Si una ficha necesita algo que no
está aquí, primero se define y se agrega a este registro; nunca se programa "solo para ese personaje".

---

## 1. Estadísticas

| Estadística | Base común (todos) | Notas |
|---|---|---|
| HP, Daño, Velocidad | De la ficha | HP 500–800 · Daño 40–90 · Velocidad 60–100 · regla **1 Daño ≈ 10 HP** |
| Prob. Crítico | 5% | |
| Daño Crítico | 50% | Crítico = daño × (1 + Daño Crítico) |
| Puntería | 50% | Probabilidad de aplicar debuffs a enemigos (− Resistencia). Los buffs no la usan |
| Resistencia | 0% | Se resta a la Puntería del rival |
| Armadura | 0% | Reduce el daño recibido · **tope 75%** |
| Bloqueo | 0% | Anula el movimiento completo (daño y efectos) · **tope 50%** |
| Daño DoT | 0% | Aumenta los DoT que aplica |
| Perforación | 0% | % del daño que ignora el Escudo |

- Estadística final = (base + suma de planos) × (1 + suma de %).
- La ficha indica solo lo que se **suma** a la base común.

**Rangos por rol:** Tanque 750–800 HP / 40–55 Daño · Luchador 650–750 / 60–75 · Asesino 500–600 / 75–90 ·
DoTer 550–650 / 45–60 · Soporte 550–650 / 40–55.

## 2. Movimientos

Cada personaje tiene exactamente **3 movimientos**, una **pasiva** y, opcionalmente, una **habilidad de líder**.

| Categoría | Cooldown | Empieza | Multiplicador sugerido |
|---|---|---|---|
| Básico | 0 | Listo | 80–110% |
| Especial | 2–3 | Listo | 130–180% (1 objetivo) · 60–90% (AOE) |
| Over | 4–5 | En espera: disponible desde la ronda 3 | 220–300% (1 objetivo) · 120–150% (AOE) |

- El cooldown baja 1 al **final de cada ronda** y se reinicia al usar el movimiento.
- **Escalado del daño:** primero se calcula el Daño base y luego se aplica el % del movimiento.
  - **Daño:** Daño.
  - **HP:** HP máx. ÷ 15.
  - **Velocidad:** Velocidad × 0.75.

  - **HP máx.** (solo curas/escudos "X% del HP máx."): HP máx.

  El mixto o repartido entre movimientos es lo normal para personajes que no son de Daño. Curas y escudos pueden usar las mismas fuentes.

**Objetivos:** `enemigo` · `aliado` · `todosEnemigos` · `todosAliados` · `propio`.
**Estilo visual:** `melee` (se lanza hacia el objetivo) · `ranged` (proyectil) · `support`.

## 3. Turnos y rondas

- **Orden:** cada personaje vivo actúa una vez por ronda, por Velocidad actual. El orden se recalcula después de cada acción.
- **Empates:** gana la Velocidad base; si persiste, se decide al azar.
- **DoT de turno** (Quemadura, Veneno): hacen daño al **inicio del turno** del afectado.
- **Final de la ronda:** bajan duraciones, contadores de Bomba y cooldowns.

## 4. Resolución de un golpe

1. **Bloqueo** (una tirada por objetivo y movimiento): si bloquea, no hay daño ni efectos.
2. Daño base × % del movimiento × (1 + bonos acumulados del movimiento).
3. **Crítico:** × (1 + Daño Crítico).
4. **Miedo** del atacante: × 0.75.
5. **Congelación** del objetivo: × 1.30, y se rompe el hielo.
6. **Armadura:** × (1 − Armadura).
7. **Reducciones** por categoría (p. ej. líder).
8. **Perforación:** esa parte va directo al HP; el resto golpea el Escudo, y lo que sobra del Escudo pasa al HP.
9. **Después del golpe:** se activa "al acertar crítico" y luego Sangrado/Hemorragia del objetivo.
10. **Efectos del movimiento:** se aplican si no fue bloqueado.

## 5. Categorías de daño

| Categoría | Ejemplos | Armadura / Escudo | ¿Se bloquea? | ¿Crítico? | ¿Cuenta como golpe? |
|---|---|---|---|---|---|
| **Golpe** | Movimientos de ataque, invocaciones | Sí | Sí | Sí | Sí |
| **DoT** | Quemadura, Veneno, Sangrado, Hemorragia, Bomba | No | No | No | No |
| **Efecto** | Tsukuyomi, Katon, daño adicional | Sí | No | No | No |
| **Robar HP** | Susanoo | No | No | No | No — y no le afectan las reducciones |

- El daño **por efecto** se calcula sobre el daño **final**.
- Las piezas de **reducción de daño** filtran por categoría (golpe / dot / efecto).

## 6. Buffs y debuffs

Solo existen **buffs** y **debuffs**. Cada uno lleva **etiquetas** internas para filtros.

- **Aplicación:**
  - Debuff a enemigo: `Puntería − Resistencia`.
  - **Buffs a aliados (incluido uno mismo): siempre se aplican (100%).**
- **Siempre se aplican (100%):** curaciones directas, **escudos**, limpiezas y buffs.
  - Escudo y Curación son conceptos **separados**, con etiquetas distintas.
- **Limpiar** (debuffs de aliados): nunca falla.
- **Disipar** (buffs de enemigos): una tirada `Puntería − Resistencia` **por cada buff**.
- Si se quitan menos de los que hay, se eligen **al azar**.

### DoT (etiqueta `DoT`)

| Debuff | Etiquetas | Cuándo hace daño | Regla |
|---|---|---|---|
| 🔥 Quemadura | DoT, Fuego | Inicio del turno | % HP máx. × (1 + Daño DoT). Una nueva deja la más fuerte + 10% de la más débil y reinicia la duración. Sin tope |
| 🧪 Veneno | DoT, Veneno | Inicio del turno | Hasta 5 acumulaciones independientes (valor provisional: 2% + 5% Daño DoT) |
| 🩸 Sangrado | DoT, Sangrado | Cada golpe recibido | 3% + 10% Daño DoT. No se acumula (se queda el más alto). Sin duración. Si ya sangraba y recibe otro: 30% de convertirse en Hemorragia |
| 🩸 Hemorragia | DoT, Sangrado | Cada golpe recibido **y** cada movimiento propio | Crece +1 punto por golpe recibido. Sin duración. Un Sangrado nuevo no le hace nada |
| 💣 Bomba | DoT, Explosivo | Al llegar a 0 su contador | Máx. 3. Salpica 25% a los aliados del objetivo. Si el portador muere, explota solo la salpicadura. Limpiar la desactiva |

### Control (etiqueta `Control`)

| Debuff | Efecto | Mega |
|---|---|---|
| 💫 Aturdimiento | Pierde su próximo turno | 2 turnos |
| 🧊 Congelación | Pierde su próximo turno; un golpe directo rompe el hielo con +30% de daño (los DoT no lo rompen) | 2 turnos; el primer golpe la baja a normal |
| 👁️ Posesión | En su turno ataca a un aliado suyo al azar con su Básico | 2 turnos |
| 🌀 Confusión | 50% de que un movimiento de un objetivo vaya a un personaje al azar (dura rondas) | — |
| 😱 Miedo | Actúa al final de la ronda y hace −25% de daño (dura rondas) | — |

- "Próximo turno" es literal: si aún no había actuado en la ronda, pierde ese mismo turno.
- No acumulan turnos: se queda el mayor.
- **Protección contra el bloqueo infinito:** al terminar de perder turnos por Aturdimiento, Congelación o Posesión, el personaje queda inmune a esos tres durante su siguiente turno.

### Buffs

| Buff | Etiquetas | Efecto |
|---|---|---|
| ⚔️ Furia | Estadística | +X% Daño (dura rondas) |
| 📣 Provocación | Provocación | Los enemigos deben dirigirle sus movimientos de **un objetivo** (incluidas invocaciones). No afecta AOE, objetivos al azar, movimientos a aliados, Confusión ni Posesión. Con varios, se elige entre ellos. Se puede Disipar |
| ✦ Invocación | Invocación | Ver sección 9 |

## 7. Acciones universales (lo que un movimiento o pasiva puede hacer)

| Acción | Parámetros | Descripción |
|---|---|---|
| `efecto` | id, valor, dur, mega, veces | Aplica un buff/debuff del registro (con su tirada) |
| `curar` | pct, escala | Curación directa (siempre se aplica) |
| `escudo` | pct, escala | Da Escudo (siempre se aplica) |
| `limpiar` | cantidad, etiqueta | Quita debuffs |
| `disipar` | cantidad, etiqueta | Quita buffs (tirada por buff) |
| `robarHP` | pct | Roba % del HP máx. y cura al ladrón |
| `danoEfecto` | fraccion | Daño por efecto = fracción del daño que activó la acción |
| `replicarDoT` | efecto, factor | Daño por efecto igual a factor × el DoT del objetivo, sobre el HP máx. de cada destino |
| `detonar` | — | Explota ya todas las Bombas del objetivo |
| `propagar` | efecto | Copia el DoT del objetivo principal (mismo valor y duración restante) a los destinos. Cada copia tira Puntería − Resistencia. Funciona aunque el objetivo muera y cuenta como aplicación |
| `escudo` con `base: 'danoCausado'` | pct | Escudo igual a un % del daño total causado por el movimiento |

**A quién (`a`):** `objetivo` · `propio` · `todosEnemigos` · `otrosEnemigos` · `todosAliados` · `sobrevivientes` · `{ azar: N }` (N enemigos al azar, pueden repetir).

## 8. Gatillos y condiciones

- **Cuándo se ejecuta un efecto del movimiento:**
  - `objetivo`: por cada objetivo, si no fue bloqueado (por defecto).
  - `critico`: cada vez que un golpe es crítico; en AOE puede activarse varias veces.
  - `final`: una vez al terminar el movimiento.
- **Gatillos de pasiva:**
  - `alAcertarCritico`.
  - `alDanoDoT`: cada vez que un DoT hace daño. Se puede filtrar por `tipo` y por lado (`en: 'enemigos'`).
- **Límite:** una pasiva puede declarar `maxPorRonda`.
- **Condiciones:**
  - `objetivoTiene: <efecto>`.
  - `algunGolpeadoTenia: <efecto>`: al menos un objetivo golpeado (no bloqueado) lo tenía.
- **Duraciones:** las fichas pueden decir "turnos", pero todo dura **rondas**.
- **Bonos acumulables:** `bonoPorSobreviviente` (+X% al movimiento por cada enemigo que sobrevive; permanente). Los temporales deben indicar su duración.

## 9. Invocaciones

- Son un **buff con etiqueta Invocación** del invocador. No ocupan espacio y no se les puede atacar.
- Se pueden **Disipar** y desaparecen si muere el invocador.
- Actúan solas **después del turno de su invocador**, a partir de su siguiente turno.
- Su daño sale de las estadísticas del invocador (`pct`, `escala`, `golpes`).
- **Máximo 1 invocación activa** por invocador (la nueva reemplaza a la anterior), salvo las que declaren `max` > 1 (Dragones: 3).
- `desatar`: todas las invocaciones de un tipo atacan a todos los enemigos y se retiran (Dracarys).

## 10. Líder

- La casilla de líder es la **primera de izquierda a derecha** y hay **un líder por equipo**.
- Solo funciona si el personaje de esa casilla tiene habilidad de líder. Termina si el líder muere.
- **Piezas de líder disponibles:**
  - `reduccion { categoria, pct }`: reduce el daño recibido por los aliados.
  - `alAplicar { efecto, stat, valor }`: cada vez que su equipo **acierta** ese debuff en un enemigo, un aliado al azar (puede ser el líder) gana un bono **permanente e invisible** a esa estadística. No es un buff y no se puede disipar.

## 11. Imágenes

- Van en `prototipo/assets/originales/<personajes|invocaciones|transformaciones|reliquias>/`.
- El nombre del archivo es el nombre de la ficha.
- Se optimizan con `python herramientas/optimizar_imagenes.py`.
