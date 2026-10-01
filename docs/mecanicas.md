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

- **Turno extra:** se juega de inmediato, después del movimiento que lo dio y de sus invocaciones. No procesa efectos de inicio de turno (DoT, Regeneración, Control) ni baja cooldowns. No hay límite de turnos extra (habrá mecánicas que reaccionen a ellos, p. ej. Anticipación).

- **Orden:** cada personaje vivo actúa una vez por ronda, por Velocidad actual. El orden se recalcula después de cada acción.
- **Empates:** gana la Velocidad base; si persiste, se decide al azar.
- **DoT de turno** (Quemadura, Veneno): hacen daño al **inicio del turno** del afectado.
- **Final de la ronda:** bajan duraciones, contadores de Bomba y cooldowns.
- **Regla general de duraciones:** si un efecto se aplica a alguien que **ya actuó** en la ronda (o que está actuando), su duración no baja al final de esa ronda. Así **"N rondas" = N turnos del afectado**. Por ejemplo, una Quemadura de 1 ronda siempre hace daño 1 vez.

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
  - Los **escudos no tienen duración ni tope**: se acumulan y duran hasta que los rompen.
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
| 🧊 Congelación | Dura 2 rondas y da −25% Velocidad todo ese tiempo. Crea **1 capa** de hielo: si llega a su turno con capas, pierde el turno (y el hielo desaparece, el debuff sigue). Cada **golpe** rompe 1 capa con +8% de daño; DoT, daño por efecto y golpes bloqueados no rompen capas, ni los golpes de un movimiento que aplica Congelación | Congelar a alguien congelado (tirada normal) = Mega: **2 capas**, −50% Velocidad, renueva 2 rondas. Congelar una Mega no hace nada |
| 🔇 Silencio | Bloquea al azar uno de sus movimientos que **no esté en cooldown** (dura rondas; al transformarse sigue bloqueada esa categoría). Si no tiene ningún movimiento usable, pierde el turno (con inmunidad anti-cadena). La Posesión gana: el poseído usa su Básico igual | — |
| 👁️ Posesión | En su turno ataca a un aliado suyo al azar con su Básico | 2 turnos |
| 🌀 Confusión | 50% de que un movimiento de un objetivo vaya a un personaje al azar (dura rondas) | — |
| 😱 Miedo | Actúa al final de la ronda y hace −25% de daño (dura rondas) | — |

- "Próximo turno" es literal: si aún no había actuado en la ronda, pierde ese mismo turno.
- No acumulan turnos: se queda el mayor.
- **Protección contra el bloqueo infinito:** al terminar de perder turnos por Aturdimiento, Congelación, Posesión o Silencio, el personaje queda inmune a esos cuatro durante su siguiente turno.

### Buffs

| Buff | Etiquetas | Efecto |
|---|---|---|
| ⚔️ Furia | Estadística | **+50% Daño** fijo (dura rondas). Valor universal en `reglas.js → BUFFS` |
| 🔰 Protección | Estadística | **+30% Resistencia** (dura rondas) |
| 💚 Regeneración | Curación | Cura **10% del HP máx.** del portador al inicio de su turno (dura rondas) |
| 🎯 Frenesí | Estadística | **+50% Prob. Crítico** (puntos: 5% → 55%) |
| 💨 Celeridad | Estadística | **+20% Velocidad** |
| 🩸 Sed de Sangre | Estadística | **+30% Daño Crítico** (puntos: 50% → 80%) |
| 👁 Agudeza | Estadística | **+50% Puntería** (puntos: 50% → 100%) |

### Debuffs de estadística

| Debuff | Etiquetas | Efecto |
|---|---|---|
| 🕶️ Ceguera | Estadística | **−50 puntos de Puntería** (50% → 0%). Solo afecta la aplicación de debuffs y Disipar (los golpes no fallan; para eso existe Bloqueo) |
| 🪓 Desgaste | Estadística | −5 puntos de Armadura al aplicarse y −5 más por cada golpe recibido (no bloqueado), hasta −25. Sin duración: dura hasta que lo limpien. Reaplicarlo no suma. La Armadura nunca baja de 0% |
| 🦠 Peste | Peste | No puede recibir **ninguna** curación (incluye robo de vida, Robar HP, Regeneración y pasivas). Sí recibe escudos. Peste sobre Peste = Peste Negra |
| ☠️ Peste Negra | Peste | Igual que Peste y además, al final de cada turno del portador (también si lo perdió), pierde **5% del HP máx. original** (piso: 25%). No es daño: el HP actual solo baja si queda por encima del nuevo máximo. La pérdida es **permanente** aunque se limpie (solo la recuperan futuras mecánicas de aumento de HP máx.) |
| 💔 Debilitar | Estadística | Recibe **+50% de daño** de golpes y daño por efecto, calculado **después** de la Armadura (no afecta DoT ni Robar HP) |
| ♨️ Aura de Fuego | Fuego | Cuando el portador recibe un **golpe** de un enemigo, le aplica al atacante Quemadura 5% (1 turno), con tirada de Puntería del portador |
| 📣 Provocación | Provocación | Los enemigos deben dirigirle sus movimientos de **un objetivo** (incluidas invocaciones). No afecta AOE, objetivos al azar, movimientos a aliados, Confusión ni Posesión. Con varios, se elige entre ellos. Se puede Disipar |
| ✦ Invocación | Invocación | Ver sección 9 |

## 7. Acciones universales (lo que un movimiento o pasiva puede hacer)

| Acción | Parámetros | Descripción |
|---|---|---|
| `efecto` | id, valor, dur, mega, veces | Aplica un buff/debuff del registro (con su tirada) |
| `curar` | pct, escala · o `base: 'hpMaxObjetivo'` · o `base: 'curacion'` | Curación directa (siempre se aplica). Puede ser % del HP máx. del objetivo o % de la curación que activó una pasiva |
| `bonoPermanente` | stat, pct, por | Bono permanente (p. ej. `hpPct` × Quemaduras en enemigos). Si sube el HP máx., el actual sube lo mismo |
| `activarDoT` | efecto | Hace el daño de un DoT al instante sin consumirlo (cuenta como daño DoT) |
| `extenderDuracion` | efecto, rondas | Suma rondas a un DoT activo |
| `transformar` | turnos | Transforma al personaje en su forma (ver sección 12) |
| `escudo` | pct, escala | Da Escudo (siempre se aplica) |
| `limpiar` | cantidad, etiqueta | Quita debuffs |
| `disipar` | cantidad, etiqueta | Quita buffs (tirada por buff) |
| `robarHP` | pct | Roba % del HP máx. y cura al ladrón |
| `danoEfecto` | fraccion | Daño por efecto = fracción del daño que activó la acción |
| `replicarDoT` | efecto, factor | Daño por efecto igual a factor × el DoT del objetivo, sobre el HP máx. de cada destino |
| `detonar` | — | Explota ya todas las Bombas del objetivo |
| `propagar` | efecto | Copia el DoT del objetivo principal (mismo valor y duración restante) a los destinos. Cada copia tira Puntería − Resistencia. Funciona aunque el objetivo muera y cuenta como aplicación |
| `escudo` con `base: 'danoCausado'` | pct | Escudo igual a un % del daño total causado por el movimiento |
| `efecto` con `idAzar: [ids]` | sinRepetir | Elige al azar uno de los efectos (por cada objetivo). Con `sinRepetir` no elige uno que el objetivo ya tenga activo |
| `turnoExtra` | — | El objetivo gana 1 turno extra (ver sección 3) |
| `bonoPermanente` con otra `stat` | stat, pct | P. ej. `critDmg` +5% por cada crítico (Teletransportación). Sin tope, se conserva entre formas |
| `multiple` | acciones | Aplica varias acciones a **los mismos** objetivos elegidos (p. ej. Escudo + Furia a 3 aliados al azar) |
| `danoRepartido` | base `'escudosEquipo'`, pct, paquetes | Total = pct × suma de los Escudos de todo el equipo del ejecutor (incluido él; no los consume). Se divide en N paquetes (10 por defecto) que caen al azar sobre enemigos → reparto desigual. Es daño por **efecto** (aplica Armadura y Escudo, sin bloqueo ni crítico) |

**Modificadores de un golpe (en la ficha del movimiento):**
- `critExtra`: suma puntos de Prob. Crítico solo a ese ataque.
- `criticoSiHpMin`: crítico garantizado si el objetivo tiene ese % de HP o más (se puede **bloquear**).
- `ignoraArmadura`: resta **puntos** de Armadura al objetivo (0.10 = 40% → 30%; 1 = la ignora toda).
- `bonoPorHpPerdido { cada, pct }`: +pct de daño por cada tramo completo de HP perdido del atacante.
- `objetivo: 'azar'` + `golpes: N`: cada golpe va a un enemigo al azar (puede repetir; ignora Provocación; si el elegido ya cayó, va a otro vivo).

**A quién (`a`):** `objetivo` · `propio` · `todosEnemigos` · `otrosEnemigos` · `todosAliados` · `aliadoMasHerido` · `sobrevivientes` · `{ azar: N }` (N enemigos al azar, pueden repetir) · `{ distintos: N }` (hasta N enemigos distintos) · `{ aliadosAzar: N }` (N aliados al azar; puede incluir al ejecutor y repetir).

## 8. Gatillos y condiciones

- **Cuándo se ejecuta un efecto del movimiento:**
  - `objetivo`: por cada objetivo, si no fue bloqueado (por defecto).
  - `critico`: cada vez que un golpe es crítico; en AOE puede activarse varias veces.
  - `final`: una vez al terminar el movimiento.
- **Gatillos de pasiva:**
  - `alAcertarCritico`.
  - `alDanoDoT`: cada vez que un DoT hace daño. Se puede filtrar por `tipo` y por lado (`en: 'enemigos'`).
  - `alCurarAliado`: cada vez que un aliado **que no sea el dueño de la pasiva** recibe una curación real (incluye robo de HP).
  - `alEliminar`: cuando el personaje **o sus invocaciones** eliminan a un enemigo (no cuentan muertes por DoT).
  - `alTransformarse`: al transformarse. Usa la pasiva que tenía **antes** de transformarse (p. ej. Sangre Sayajin al pasar a Super Sayajin 3).
  - `alPerderEscudo`: cada vez que el dueño o un aliado pierde Escudo por un golpe o daño por efecto (los DoT no tocan escudos). `objetivo` = quien lo perdió.
- **Robo de vida:** una pasiva puede declarar `roboVida: X`: cada golpe cura X × daño causado (incluye lo absorbido por escudos). Es curación normal.
- **Inmunidades:** una pasiva puede declarar `inmuneA` con ids o etiquetas de efectos (p. ej. Sun Jin Woo: Veneno).
- **Límite:** una pasiva puede declarar `maxPorRonda`. Con `soloSiCura: true`, una pasiva de curación no se activa ni gasta uso si ningún destino puede recibir curación (HP lleno).
- **Condiciones:**
  - `objetivoTiene: <efecto>`.
  - `algunGolpeadoTenia: <efecto>`: al menos un objetivo golpeado (no bloqueado) lo tenía.
- **Duraciones:** las fichas pueden decir "turnos", pero todo dura **rondas**.
- **Bonos acumulables:** `bonoPorSobreviviente` (+X% al movimiento por cada enemigo que sobrevive; permanente). Los temporales deben indicar su duración.

## 9. Invocaciones

- Son un **buff con etiqueta Invocación** del invocador. No ocupan espacio y no se les puede atacar.
- Se pueden **Disipar** y desaparecen si muere el invocador.
- Todo lo que hacen escala con las **estadísticas del invocador**.
- **Reglas generales (todos los invocadores):**
  - Máximo **3 activas**.
  - **Sin repetidas**: en invocaciones al azar se vuelve a tirar. Invocar un tipo ya activo lo renueva, salvo que su `max` permita varias (Dragones ×3).
  - Si ya hay 3, la nueva **reemplaza a la de menor duración restante**.
- **Cada invocación es un mini-personaje:**
  - `acciones`: lo que hace **cada turno**, automáticamente después del turno de su invocador, desde el turno siguiente a aparecer.
  - `alAparecer`: lo que hace **una vez** al ser invocada.
  - Una acción es un `golpe` (con `pct`, `golpes`, `efectos` y `elegir`: `menorHp` · `azar` · `todos` · `masFuerte`) o cualquier acción universal (curar, escudo, robarHP, efecto, limpiar…).
- **Rareza** (Común, Raro, Especial, Épico, Legendario): se ve en el color del borde de su medallón.
- **Invocar al azar** (`invocarAzar`): usa una tabla de pesos y puede filtrar por rareza.
- **Potenciar** (`potenciarInvocaciones`): todas actúan de inmediato con un multiplicador de potencia y, si se indica, renuevan su duración.
- `desatar`: todas las invocaciones de un tipo atacan a todos los enemigos y se retiran (Dracarys).

### Sombras de Sun Jin Woo (tabla `sombras`)
| Sombra | Rareza | Peso | Rol |
|---|---|---|---|
| Iron | Común | 26 | 25% a un enemigo al azar + Escudo 50% al aliado más herido |
| Igris | Común | 26 | 45% al enemigo con menos HP |
| Shadow Ming Byung | Raro | 18 | Cura 15% HP máx. al aliado más herido · al aparecer: limpia 1 debuff a cada aliado |
| Kaisel | Raro | 15 | Roba 5% HP máx. a 2 enemigos al azar (puede repetir) y cura al invocador |
| Beru | Épico | 9 | 2×30% + Sangrado o Veneno |
| Bellion | Épico | 5 | 35% al enemigo más fuerte · al aparecer: Aturdimiento a hasta 3 enemigos distintos |
| Kamish | Legendario | 1 | 50% a todos · al aparecer: 150% a todos + Miedo |

## 10. Líder

- La casilla de líder es la **primera de izquierda a derecha** y hay **un líder por equipo**.
- Solo funciona si el personaje de esa casilla tiene habilidad de líder. Termina si el líder muere.
- Las habilidades de líder que afectan a "los aliados" **incluyen al propio líder** (p. ej. Gakido protege también a Madara).
- **Piezas de líder disponibles:**
  - `reduccion { categoria, pct }`: reduce el daño recibido por los aliados.
  - `alIniciarRonda { acción }`: al empezar cada ronda ejecuta una acción universal (p. ej. Shaka: Escudo 12% de su HP máx. al aliado con menor % de HP).
  - `alAplicar { efecto, stat, valor }`: cada vez que su equipo **acierta** ese debuff en un enemigo, un aliado al azar (puede ser el líder) gana un bono **permanente e invisible** a esa estadística. No es un buff y no se puede disipar.

## 12. Transformaciones

- Un **estado** del personaje (no es buff): no se puede Disipar ni Limpiar.
- **Duración:** temporal (`turnos: N`, en turnos propios; el turno en que se transforma no cuenta y uno perdido por Control sí) o **permanente** (sin `turnos`: no vuelve atrás; la carta muestra ∞).
- **Cadenas:** una forma puede tener su propia `transformacion` (Goku → Super Sayajin → Super Sayajin 3).
- **Qué reemplaza la forma:** estadísticas base y extra (los bonos de la ficha anterior **no se suman**), los 3 movimientos y la pasiva.
- **Qué se conserva:** el % de vida, buffs, debuffs, escudos, invocaciones, bonos permanentes y la habilidad de **líder**. Los buffs, debuffs y bonos se aplican sobre las estadísticas base de la nueva forma.
- **Cooldowns:**
  - Los de la forma empiezan listos, salvo su Over, que empieza con su **cooldown completo**.
  - Los de la forma base siguen bajando durante la transformación.
- **Al terminar,** vuelve a la forma base.
- **Imagen:** va en `assets/originales/transformaciones/`, con el nombre de la forma.
- **Visual:**
  - Al transformarse: carga de energía, explosión, giro de la carta y el nombre de la forma en grande.
  - Mientras dura: marco que late en el color de la forma, partículas en los bordes y un contador de turnos.
  - Al revertir: giro entre humo.

## 11. Imágenes

- Van en `prototipo/assets/originales/<personajes|invocaciones|transformaciones|reliquias>/`.
- El nombre del archivo es el nombre de la ficha.
- Se optimizan con `python herramientas/optimizar_imagenes.py`.
- **Invocaciones con fondo negro u oscuro:** el fondo se conserva y la invocación lleva `luminosa: true`. Se dibuja en modo "pantalla": el negro se vuelve transparente y la figura brilla como un espíritu (p. ej. Shadow Ming Byung).
