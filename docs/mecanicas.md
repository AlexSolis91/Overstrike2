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
| Puntería | 50% | Para aplicar debuffs a enemigos, contra su Resistencia (ver **Tirada de Puntería**). Los buffs no la usan. Puede quedar negativa (Ceguera) |
| Resistencia | 50% | Defiende de los debuffs contra la Puntería del rival |
| Armadura | 0% | Reduce el daño recibido · **tope 75%** |
| Bloqueo | 0% | Anula el movimiento completo (daño y efectos) · **tope 50%** |
| Daño DoT | 0% | Aumenta los DoT que aplica |
| Penetración de escudo | 0% | % del daño que ignora el Escudo (tope 100%) |

- Estadística final = (base + suma de planos) × (1 + suma de %).
- La ficha indica solo lo que se **suma** a la base común.

**Rangos por rol:** Tanque 750–850 HP / 40–55 Daño · Luchador 650–750 / 60–75 · Asesino 500–600 / 75–90 ·
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
- **Límite de 20 rondas** (`LIMITE_RONDAS` en `reglas.js`): al terminar la ronda 20, gana el equipo con **más personajes vivos** (las invocaciones no cuentan). Mismo número = **Empate**. Evita partidas infinitas (p. ej. Shaka contra Shaka); en simulaciones 5 contra 5 llega al límite ~1% de las partidas.
- **Regla general de duraciones:** si un efecto se aplica a alguien que **ya actuó** en la ronda (o que está actuando), su duración no baja al final de esa ronda. Así **"N rondas" = N turnos del afectado**. Por ejemplo, una Quemadura de 1 ronda siempre hace daño 1 vez.

## 4. Resolución de un golpe

1. **Bloqueo** (una tirada por objetivo y movimiento): si bloquea, no hay daño ni efectos.
2. Daño base × % del movimiento × (1 + bonos acumulados del movimiento).
3. **Crítico:** × (1 + Daño Crítico).
4. **Miedo** del atacante: × 0.75.
5. **Congelación** del objetivo: × 1.30, y se rompe el hielo.
6. **Armadura:** × (1 − Armadura).
7. **Reducciones** por categoría (p. ej. líder).
8. **Penetración de escudo:** esa parte va directo al HP; el resto golpea el Escudo, y lo que sobra del Escudo pasa al HP.
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
  - Debuff a enemigo, en 2 filtros (estilo Raid):
    1. **Probabilidad del movimiento** (`prob` en la acción de la ficha; **100% si la ficha no la indica**). Si falla, no pasa nada (no se muestra "Resistido"). Guía para fichas: Básicos 10–30%, Especiales 30–60%, Overs 60–100%; cuanto más potente el debuff, más baja.
    2. **Tirada de Puntería**. Si la Puntería del atacante **≥** la Resistencia del objetivo, **entra siempre**. Si no, la probabilidad es `100% − (Resistencia − Puntería)`, con un **mínimo de 10%** (nadie es inmune solo por estadísticas). Si falla: "Resistido". Ej.: base contra base (50% vs 50%) = entra siempre (decide solo el % del movimiento); contra Protección (50% vs 80%) = 70%; con Ceguera contra base (0% vs 50%) = 50%.
  - `probSiMasRapido`: probabilidad distinta contra objetivos **más rápidos** que quien lo aplica (p. ej. Deep Freeze: 75%, o 100% contra los más rápidos que Sub-Zero).
  - **Cada golpe tira por separado:** en ataques a varios, una tirada por objetivo; en multi-golpe al mismo objetivo, una tirada por golpe (2 golpes = 2 tiradas).
  - Las copias de **Propagar** solo hacen el filtro 2.
  - `irresistibleSi: <efecto>`: si el objetivo tiene ese efecto, se salta el filtro 2 (no se puede resistir). P. ej. el Miedo de Loki contra envenenados.
  - **Buffs a aliados (incluido uno mismo): siempre se aplican (100%).**
- **Siempre se aplican (100%):** curaciones directas, **escudos**, limpiezas y buffs.
  - Escudo y Curación son conceptos **separados**, con etiquetas distintas.
  - Los **escudos no tienen duración ni tope**: se acumulan y duran hasta que los rompen.
- **Limpiar** (debuffs de aliados): nunca falla.
- **Disipar** (buffs de enemigos): una **Tirada de Puntería** **por cada buff**.
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
| ❄️ Congelación | Dura 2 rondas y da −25% Velocidad todo ese tiempo. Crea **1 capa** de hielo: si llega a su turno con capas, pierde el turno (y el hielo desaparece, el debuff sigue). Cada **golpe** rompe 1 capa con +8% de daño; DoT, daño por efecto y golpes bloqueados no rompen capas, ni los golpes de un movimiento que aplica Congelación | Congelar a alguien congelado (tirada normal) = Mega: **2 capas**, −50% Velocidad, renueva 2 rondas. Congelar una Mega no hace nada |
| 🔇 Silencio | Bloquea al azar uno de sus movimientos que **no esté en cooldown** (dura rondas; al transformarse sigue bloqueada esa categoría). Si no tiene ningún movimiento usable, pierde el turno (con inmunidad anti-cadena). La Posesión gana: el poseído usa su Básico igual | — |
| 👁️ Posesión | En su turno ataca a un aliado suyo al azar con su Básico | 2 turnos |
| 🌀 Confusión | 50% de que un movimiento de un objetivo vaya a un personaje al azar (dura rondas) | — |
| 😱 Miedo | Actúa al final de la ronda y hace −25% de daño (dura rondas) | — |
| 🗣️ Incitar | Solo puede usar su **Básico** y solo contra **quien lo incitó**, aunque tenga Sigilo o haya Provocación (dura rondas). Si quien lo incitó muere, vuelve a actuar normal. Si su Básico está silenciado, pierde el turno. No quita turnos (no activa la regla anti-bloqueo) | — |

- "Próximo turno" es literal: si aún no había actuado en la ronda, pierde ese mismo turno.
- No acumulan turnos: se queda el mayor.
- **Protección contra el bloqueo infinito:** al terminar de perder turnos por Aturdimiento, Congelación, Posesión o Silencio, el personaje queda inmune a esos cuatro durante su siguiente turno.

### Buffs

| Buff | Etiquetas | Efecto |
|---|---|---|
| ⚔️ Furia | Estadística | **+50% Daño** fijo (dura rondas). Valor universal en `reglas.js → BUFFS` |
| 🔰 Protección | Estadística | **+30% Resistencia** (dura rondas) |
| 💚 Regeneración | Curación | Cura **10% del HP máx.** del portador al inicio de su turno (dura rondas) |
| 👤 Sigilo | Sigilo | Los enemigos no pueden elegirlo con ataques de **un objetivo** (sí lo alcanzan AOE, golpes al azar e invocaciones). Si todos sus aliados lo tienen, no cuenta. Se rompe al recibir **cualquier** daño que baje HP o Escudo. No se puede aplicar a quien tiene Provocación, y recibir Provocación lo quita |
| 🗡️ Perforación | Estadística | **+50 puntos de Penetración de escudo** (0% → 50%; tope 100%) |
| 💢 Frenesí | Estadística | **+50% Prob. Crítico** (puntos: 5% → 55%) |
| ⚡ Celeridad | Estadística | **+20% Velocidad** |
| 🪓 Letalidad | Estadística | **+30% Daño Crítico** (puntos: 50% → 80%) |
| 🏹 Agudeza | Estadística | **+50% Puntería** (puntos: 50% → 100%; para superar Resistencias altas) |

### Debuffs de estadística

| Debuff | Etiquetas | Efecto |
|---|---|---|
| 🕶️ Ceguera | Estadística | **−50 puntos de Puntería** (50% → 0%; contra Resistencia base, entra la mitad de las veces). La Puntería puede quedar negativa. Solo afecta la aplicación de debuffs y Disipar (los golpes no fallan; para eso existe Bloqueo) |
| 💥 Desgaste | Estadística | −5 puntos de Armadura al aplicarse y −5 más por cada golpe recibido (no bloqueado), hasta −25. Sin duración: dura hasta que lo limpien. Reaplicarlo no suma. La Armadura nunca baja de 0% |
| 🦠 Peste | Peste | No puede recibir **ninguna** curación (incluye robo de vida, Robar HP, Regeneración y pasivas). Sí recibe escudos. Peste sobre Peste = Peste Negra |
| ☠️ Peste Negra | Peste | Igual que Peste y además, al final de cada turno del portador (también si lo perdió), pierde **5% del HP máx. original** (piso: 25%). No es daño: el HP actual solo baja si queda por encima del nuevo máximo. La pérdida es **permanente** aunque se limpie (solo la recuperan futuras mecánicas de aumento de HP máx.) |
| 🔆 Quemadura Solar | Quemadura Solar | Toda curación que reciba (movimientos, Regeneración, robo de vida, Robar HP, pasivas) se vuelve **daño por el monto completo**, aunque tenga el HP lleno. Ignora Armadura y Escudo, no se bloquea ni es crítico, le afectan las reducciones de DoT, rompe Sigilo y nadie recibe crédito si mata. Gana a la Peste. **No** cuenta como Quemadura. Las pasivas "solo si cura" no se activan sobre él y la IA no lo cura con curaciones de un objetivo. Se puede limpiar |
| 💔 Debilitar | Estadística | Recibe **+50% de daño** de golpes y daño por efecto, calculado **después** de la Armadura (no afecta DoT ni Robar HP) |
| 🎯 Expuesto | Estadística | Recibe **+25% de daño** de golpes y daño por efecto, después de la Armadura (como Debilitar, pero menor; se suman si tiene los dos). P. ej. Shinra Tensei: Pain queda Expuesto 1 ronda (aplicado con `irresistible` sobre sí mismo) |
| 🪞 Espejismo | Reflejo | Cada **golpe** que recibe de un enemigo le devuelve al atacante el **30%** del daño recibido (HP + Escudo), como **daño por efecto**: no es golpe (no rebota entre dos Espejismos ni activa Sangrado/contraataques), no es crítico ni se bloquea. El portador recibe el golpe completo. No refleja DoT ni daño por efecto. Se puede Disipar |
| 🧊 Aura Gélida | Hielo | El portador recibe **−20%** de daño de los **golpes** enemigos y, cuando lo golpean, tiene **50%** de probabilidad de aplicarle Congelación al atacante (con Tirada de Puntería del portador). Siempre dura 2 rondas. **Se puede disipar** |
| 📍 Aguja Escarlata | Aguja | (debuff, contador hasta 14) Cada aguja le quita **0.5%** del HP máx. al inicio de su turno y le hace recibir **+3%** de daño de Veneno, Sangrado y Hemorragia. Se clavan sin tirada (acción `clavarAgujas { n }`). Se puede limpiar. Un movimiento con `consumeAgujas { pct }` hace +pct por aguja del objetivo y las consume (Antares de Milo); la IA lo apunta al enemigo con más agujas |
| 🚫 Bloquear Buffs | Bloqueo | (debuff) No puede recibir buffs **nuevos** mientras dure. No afecta a los que ya tiene, a los permanentes ni a las cargas |
| ♨️ Aura de Fuego | Fuego | Cuando el portador recibe un **golpe** de un enemigo, tiene **50%** de probabilidad de aplicarle al atacante Quemadura 5% (1 turno), con Tirada de Puntería del portador |
| 🎯 Provocación | Provocación | Los enemigos deben dirigirle sus movimientos de **un objetivo** (incluidas invocaciones). No afecta AOE, objetivos al azar, movimientos a aliados, Confusión ni Posesión. Con varios, se elige entre ellos. Se puede Disipar |
| ✦ Invocación | Invocación | Ver sección 9 |

## 7. Acciones universales (lo que un movimiento o pasiva puede hacer)

| Acción | Parámetros | Descripción |
|---|---|---|
| `efecto` | id, valor, dur, mega, veces | Aplica un buff/debuff del registro (con su tirada) |
| `curar` | pct, escala · o `base: 'hpMaxObjetivo'` · o `base: 'curacion'` | Curación directa (siempre se aplica). Puede ser % del HP máx. del objetivo o % de la curación que activó una pasiva |
| `bonoPermanente` | stat, pct, por | Bono permanente (p. ej. `hpPct` × Quemaduras en enemigos). Si sube el HP máx., el actual sube lo mismo |
| `activarDoT` | efecto | Hace el daño de un DoT al instante sin consumirlo ni quitarle duración (cuenta como daño DoT). Con Veneno suma **todas** las acumulaciones |
| `extenderDuracion` | efecto, rondas | Suma rondas a un DoT activo |
| `transformar` | turnos | Transforma al personaje en su forma (ver sección 12) |
| `escudo` | pct, escala | Da Escudo (siempre se aplica) |
| `limpiar` | cantidad, etiqueta | Quita debuffs |
| `disipar` | cantidad, etiqueta | Quita buffs (tirada por buff) |
| `escudo` con `base: 'recibido'` | pct | Escudo = pct del daño del golpe que activó la pasiva `alRecibirGolpe` |
| `bonoPermanente` con `tope` | stat, pct, tope | Igual, pero sin pasar de `tope` acumulado (p. ej. Doom: +10% HP máx., hasta +50%) |
| `invocar` | key, prob | Invoca esa invocación concreta (con `prob` opcional). P. ej. Clon de Sombra de Naruto |
| `reducirHpMax` | pct, tope | Baja el HP máx. del objetivo para el resto de la partida (acumulable hasta `tope`); su HP actual no puede quedar por encima. P. ej. Fusión con Kurama: 5% por golpe, hasta −30% |
| `hemorragia` | — | Convierte el Sangrado del objetivo en Hemorragia (garantizado, sin tirada; conserva su %) |
| `golpeDirecto` | pct, nombre | Un golpe más (mismo cálculo que un golpe normal) a cada destino. Destino `a: { enemigosCon: [efectos] }` = enemigos con alguno de esos efectos, sin el objetivo principal (p. ej. Lanza de Draupnir) |
| `ganarCargas` | efecto, max, cantidad | Gana cargas de ese tipo (p. ej. Espada del Poder: 1 de Poder de Grayskull) |
| `robarHP` | pct | Roba % del HP máx. y cura al ladrón |
| `danoEfecto` | fraccion | Daño por efecto = fracción del daño que activó la acción |
| `replicarDoT` | efecto, factor | Daño por efecto igual a factor × el DoT del objetivo, sobre el HP máx. de cada destino |
| `detonar` | — | Explota ya todas las Bombas del objetivo |
| `usarMovimiento` + `despues: true` | categoria | Igual, pero **espera** a que termine el movimiento en curso; si su destino cayó, va a otro enemigo al azar. Destino `a: { distintos: N }` = N enemigos al azar distintos. P. ej. Anillo de Hielo: 2 Descargas de Escarcha |
| `usarMovimiento` | categoria | Usa uno de sus propios movimientos sobre el destino, igual que el normal (puede aplicar efectos, activa Hemorragia, etc.), pero **no** gasta su turno ni cambia su cooldown. P. ej. Absolute Zero de Sub-Zero: Ice Blast a un enemigo al azar |
| `propagar` | efecto | Copia un debuff del objetivo principal **en su estado actual** (intensidad, duración restante, acumulación, turnos, capas, reducción de Desgaste…) a los destinos. Cada copia hace su Tirada de Puntería y se apila con las reglas normales. Funciona aunque el objetivo muera. **Restricción:** si la ficha indica un debuff (`efecto: 'burn'`, como Purgatorio de Rengoku), solo propaga ese y, si el objetivo no lo tiene, no pasa nada. Sin restricción (`efecto: 'azar'`, como Bola de Fuerza de Reptile), elige uno al azar entre **cualquier** debuff que el objetivo **ya tenía antes** del movimiento. El Silencio copiado bloquea un movimiento al azar del nuevo objetivo |
| `escudo` con `base: 'danoCausado'` | pct | Escudo igual a un % del daño total causado por el movimiento |
| `efecto` con `idAzar: [ids]` | sinRepetir | Elige al azar uno de los efectos (por cada objetivo). Con `sinRepetir` no elige uno que el objetivo ya tenga activo |
| `extenderInvocaciones` | turnos | +N turnos de duración a todas las invocaciones activas del objetivo |
| `reducirCooldown` | cantidad, categorias | Baja el cooldown de esos movimientos del objetivo (p. ej. Viserion: Especial y Over de Daenerys) |
| `turnoExtra` | — | El objetivo gana 1 turno extra (ver sección 3) |
| `bonoPermanente` con otra `stat` | stat, pct | P. ej. `critDmg` +5% por cada crítico (Teletransportación). Sin tope, se conserva entre formas |
| `multiple` | acciones | Aplica varias acciones a **los mismos** objetivos elegidos (p. ej. Escudo + Furia a 3 aliados al azar) |
| `curar` + `porCada: 'eliminados'` | pct, escala | Cura una vez por cada enemigo eliminado por ese movimiento (p. ej. Explosión Divina: 20% del HP máx. de Thor por cada uno) |
| `disipar` + `sinTirada: true` | cantidad | Quita los buffs sin tirada de Puntería (sin `cantidad` = todos). P. ej. Poder de Grayskull |
| `transferirBuffs` | — | Quita **todos** los buffs disipables del objetivo (no invocaciones, no permanentes) y se los da al aliado del ejecutor en la **misma posición** (o a uno al azar si cayó). Sin tirada. P. ej. Voluntad de Hierro de Doom |
| `activarCooldown` | categoria, prob | Pone ese movimiento del objetivo en su cooldown **completo** (si era menor). Sin tirada de Puntería; `prob` opcional. P. ej. Voluntad de Hierro: 60% al Over |
| `robarBuffs` | cantidad | Quita buffs al azar al objetivo y se los pasa al ejecutor (no roba invocaciones ni lo no disipable). P. ej. Truco de la Serpiente de Loki |
| `danoPorDebuffs` | efectos, pct | Daño por efecto = pct × HP máx. del objetivo **por cada** efecto de la lista que tenía **antes** del movimiento (Mega Congelación cuenta como Congelación). **Ignora Armadura**; el Escudo sí absorbe. P. ej. Apocalipsis de Lich King: 10% por Congelación y 10% por Posesión (máx. 20%) |
| `danoSegunEnemigos` | efecto, pct | Daño por efecto al objetivo = suma de pct × HP máx. de **cada enemigo** con ese efecto (p. ej. Spear: 2% por cada enemigo quemado) |
| `danoRepartido` | base `'escudosEquipo'`, pct, paquetes | Total = pct × suma de los Escudos de todo el equipo del ejecutor (incluido él; no los consume). Se divide en N paquetes (10 por defecto) que caen al azar sobre enemigos → reparto desigual. Es daño por **efecto** (aplica Armadura y Escudo, sin bloqueo ni crítico) |

**Modificadores de un golpe (en la ficha del movimiento):**
- `critExtra`: suma puntos de Prob. Crítico solo a ese ataque.
- `bonoPorDebuffs { pct }`: +pct de daño contra cada objetivo por cada **tipo distinto** de debuff que tenga (3 Venenos cuentan como 1; sin tope). P. ej. Explosión Divina de Thor: +30%.
- `consumeCargas { pct, efecto }`: al usarlo consume **todas** las cargas de ese tipo (`efecto`: 'cargas' = Furia Dorada por defecto, 'orgullo' = Orgullo Sayajin); cada una suma +pct de daño a ese movimiento (p. ej. Gran Cuerno: +15% por carga; Final Flash: +15% por Orgullo). Condición para sus efectos: `cargasConsumidasMin: N`.
- **Según el equipo equipado** (`conEquipo { equipo: { tipo | categoria, min }, cambios }`): si el personaje lleva esas reliquias (cuenta los espacios **no bloqueados** por **tipo** — Espada, Arco, Lanza, Yelmo, Pechera, Botas, Anillo, Amuleto — o por **categoría** — Arma, Equipación, Accesorio), el movimiento cambia al empezar la partida (el equipo no cambia en batalla). P. ej. Espadas del Caos de Kratos: con 2 Espadas, 2 golpes de 60%. Mientras no exista el inventario de reliquias, cuenta el equipo de la ficha.
- `bonoContra { efecto | [efectos], pct }` (en un **movimiento**): +pct de daño de ese movimiento contra objetivos con ese efecto (p. ej. Kirin de Sasuke: +50% contra quemados).
- `bonoSiObjetivoMasHp`: +pct de daño si el objetivo tiene más HP actual que el atacante (p. ej. Asesino de Dioses de Kratos: +30%).
- `bonoPorEscudoPropio`: suma al golpe ese % del Escudo actual del atacante (no lo gasta; puede ser crítico). P. ej. Fervor Místico de Doom: 30%.
- `sinCritico`: ese ataque no puede ser crítico.
- `sobrante`: si el golpe mata al objetivo, el daño que sobró (ya mitigado) pasa a otro enemigo al azar como daño por efecto (una sola vez). P. ej. Bastón Prodigioso de Wukong.
- **Efectos `cuando: 'antes'`:** se aplican a cada objetivo **antes** de golpear (p. ej. Ahora Nos Ves: robar todos los buffs y después atacar).
- **Quemadura inextinguible** (`inextinguible: true` en la acción de Quemadura): **no se puede limpiar** (solo termina por duración). Si se fusiona con otra Quemadura, la fusionada queda inextinguible. Se muestra como ⚫🔥 Amaterasu. P. ej. Amaterasu de Sasuke.
- **Acción `efecto`:** `probSiConBuff` (otra probabilidad si el objetivo tiene algún buff, sin contar invocaciones) e `irresistible: true` (siempre entra: sin tirada de Puntería vs Resistencia).
- `golpeExtraContra { efecto, prob }`: prob de **un** golpe más (mismo %) a **otro** enemigo que tenga ese efecto (nunca al mismo objetivo; si no hay otro, nada). Ese golpe no provoca otro. P. ej. Descarga de Escarcha de Jaina: 20% contra otro congelado.
- `golpeExtraSiCritico`: si algún golpe fue crítico, **un** golpe más (máximo uno) al mismo objetivo; si murió, a un enemigo al azar (p. ej. Venganza Eterna de Scorpion).
- `critExtraSi { teniaAntes, pct }`: +pct de Prob. Crítico contra los objetivos que **ya tenían** ese efecto **antes** del movimiento (p. ej. Deep Freeze: +50% contra los ya congelados).
- `criticoSiHpMin`: crítico garantizado si el objetivo tiene ese % de HP o más (se puede **bloquear**).
- `ignoraArmadura`: resta **puntos** de Armadura al objetivo (0.10 = 40% → 30%; 1 = la ignora toda).
- Condición `objetivoEfectoDurMin { efecto, dur }`: el objetivo tiene ese efecto con `dur` rondas o más (p. ej. Llamarada de Meleys: aturde si la Quemadura dura 4+).
- `ignoraArmaduraSi { efecto, puntos }`: igual, pero solo contra objetivos que tienen ese efecto en el momento del golpe (p. ej. Ice Blast: 25 puntos contra congelados).
- `bonoPorAcumulacion { efecto, pct, max }`: +pct de daño por cada acumulación de ese efecto en el objetivo, hasta `max` acumulaciones (p. ej. Fatality de Reptile).
- `bonoPorHpPerdido { cada, pct }`: +pct de daño por cada tramo completo de HP perdido del atacante.
- `objetivo: 'azar'` + `golpes: N`: cada golpe va a un enemigo al azar (puede repetir; ignora Provocación; si el elegido ya cayó, va a otro vivo).

**A quién (`a`):** `objetivo` · `propio` · `todosEnemigos` · `otrosEnemigos` · `todosAliados` · `aliadoMasHerido` · `sobrevivientes` · `{ azar: N }` (N enemigos al azar, pueden repetir) · `{ distintos: N }` (hasta N enemigos distintos) · `otroEnemigoAzar` (un enemigo al azar distinto del objetivo principal) · `{ azarCon: { efecto, min } }` (un enemigo al azar con al menos `min` acumulaciones de ese efecto; respeta Esquiva Área en movimientos de área) · `{ aliadosAzar: N }` (N aliados al azar; puede incluir al ejecutor y repetir).

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
  - `alIniciarTurno`: al empezar su turno, **solo si de verdad actúa** (no si pierde el turno por Control o Silencio; tampoco en turnos extra). Va después del DoT de inicio de turno.
  - `alGolpear`: cada vez que el dueño golpea (no bloqueado). Filtro opcional `objetivoTiene: <efecto>` (p. ej. Reptile: Sigilo al golpear a un envenenado).
  - `alTransformarse`: al transformarse. Usa la pasiva que tenía **antes** de transformarse (p. ej. Sangre Sayajin al pasar a Super Sayajin 3).
  - `alPerderEscudo`: cada vez que el dueño o un aliado pierde Escudo por un golpe o daño por efecto (los DoT no tocan escudos). `objetivo` = quien lo perdió.
  - `alSerAtacado`: una vez por cada **movimiento** enemigo que lo tuvo de objetivo (incluye área). Filtro `atacanteTiene: <efecto>` (el atacante ya lo tenía **al empezar** su movimiento; no cuenta si lo recibe durante el ataque, p. ej. por Aura de Fuego). Con `usarMovimiento` + `contraataque: true` es un **contraataque**: va después del movimiento enemigo, **un contraataque no provoca otro**, y no contraataca si tiene un Control que le quita turnos. Destino `a: 'atacante'`.
  - **Al terminar un efecto:** un buff/debuff puede llevar `alTerminar: <acción>`: cuando **expira por duración** (no si lo disipan o limpian), quien lo aplicó ejecuta esa acción. Destino `a: 'ultimoAtacante'` = el último enemigo que le hizo daño (o uno al azar). Una Provocación puede llevar `cargasX: N` (mientras dure, cada golpe da N cargas). P. ej. Orgullo del Toro Dorado: al terminar su Provocación, Aldebarán lanza Gran Cuerno.
  - `alIniciarRonda`: al inicio de cada ronda (también para pasivas, no solo líderes). P. ej. Chakra de los Seis Caminos: Escudo al aliado más herido.
  - `alMorirEnemigo`: cuando muere **cualquier** enemigo (lo mate quien lo mate). Filtro `teniaAlMorir: <efecto>` = lo que tenía al morir. P. ej. Kratos: se cura 10% si muere un enemigo con Hemorragia.
  - `alRecibirGolpe`: cada **golpe** enemigo que le hace daño (incluye lo absorbido por Escudo). `ctx.recibido` = ese daño. P. ej. Soberano de Latveria de Doom (máx. 2 por ronda).
  - `alRecibirDebuff`: cada vez que **le entra** un debuff (después de pasar Puntería vs Resistencia) aplicado por otro: **una tirada por debuff** (un área con 2 debuffs = 2 tiradas). Lo resistido o sin efecto no cuenta. Se ejecuta como reacción, después de la acción en curso. P. ej. El Príncipe Caído de Lich King: 50% de Congelar a un enemigo al azar (esa Congelación también tira Puntería vs Resistencia).
  - `alRomperCapa`: cada vez que un **golpe** (de cualquiera) rompe una capa de Congelación o Mega Congelación de un **enemigo** del dueño. No cuenta el hielo que se derrite al perder el turno. `objetivo` = el congelado.
- **Daño contra un efecto:** una pasiva puede declarar `bonoContra { efecto | [efectos], pct }`: sus golpes hacen +pct a enemigos con ese efecto.
- **Crítico acumulable:** una pasiva puede declarar `acumulaCriticoContra { efecto, valor, valorMega, tope }`: cada golpe a un enemigo con ese efecto suma `valor` (o `valorMega` si es Mega) a Prob. Crítico **y** a Daño Crítico, **para toda la partida**, hasta `tope` cada uno. Se aplica ya en ese golpe. Cuenta el **debuff**, aunque el hielo esté roto. P. ej. Jaina: +5% / +10% con Mega, tope +50%.
- **Rivalidad** (pasiva `rival { bono, max, orgulloAlCritico, orgulloAlRecibirCritico, alMorirRival, transformar: { cargas, hp } }`): al empezar marca a un enemigo como **Rival 👑** (Goku si está en el equipo enemigo; si no, el de más Daño). La marca es de tipo **marca**: no es buff ni debuff (no se limpia, no se disipa, no cuenta para efectos que cuentan debuffs) y se ve con borde dorado. Le hace +`bono` de daño. Gana cargas de **Orgullo Sayajin ⚜️** (máx. `max`, no disipables) cuando su Rival usa un movimiento y con sus críticos (y, si lo indica, al recibir un crítico). Si el Rival muere: +`alMorirRival` de Daño permanente y elige otro Rival. Con `transformar`: se transforma **solo** (una vez) al llegar a esas cargas o al bajar de ese % de HP, al terminar la acción en curso. P. ej. Vegeta.
- **Último aliento** (pasiva `ultimoAliento { transformar, hp }`): la **primera** vez que moriría (por cualquier daño), queda con 1 HP (o `hp` × su HP máx.) y, con `transformar: true`, se transforma al terminar la acción en curso (si sigue vivo). P. ej. Nunca Me Rindo de Naruto.
- **Quema su propia vida** (`drenajePropio` en la pasiva): al final de cada turno propio pierde ese % de su HP máx., sin bajar de 1 HP. P. ej. Modo Barión: 3%.
- **Movimiento de una sola vez** (`unaVez: true`): después de usarlo queda bloqueado el resto de la partida (el panel muestra «✔ Ya usado»), aunque vuelva a esa forma. P. ej. Modo Barión.
- **Revivir** (pasiva `revivir { turnos, hp }`): al morir, vuelve a la vida **N turnos después** (cuentan los turnos de cualquier personaje; el turno en que muere no cuenta) con `hp` × su HP máx., sin buffs ni debuffs. **Una vez por partida**. Si su equipo cae entero antes, la partida termina igual. P. ej. Wukong Invencible: 3 turnos, 100% HP.
- **Velocidad** (pasivas, p. ej. Sharingan Mangekyō de Itachi):
  - Acción `robarVelocidad { pct, tope }`: quita ese % de Velocidad al objetivo y se lo suma al ejecutor, **para toda la partida**, hasta `tope` en total.
  - `danoPorVelocidad { pct, max }`: +pct de daño por cada punto de Velocidad que le saque al objetivo, hasta `max`.
  - `turnoExtraSiMasRapido: true`: si es el personaje **más rápido de todo el campo** al terminar su movimiento, gana 1 turno extra (una vez por ronda).
  - `seguroVsLentos: true`: sus debuffs siempre entran (sin tirada de Puntería) contra enemigos más lentos que él.
  - Movimiento `criticoSiMasRapido`: crítico seguro si el atacante es más rápido que el objetivo (p. ej. Espada de Totsuka).
- **Aura contra efectos** (pasiva `auraContra { efecto | [efectos], pct }`): **todo su equipo** (incluido él) hace +pct de daño a enemigos con esos efectos. P. ej. Saga: +40% contra confundidos o poseídos.
- **Cargas al aplicar** (pasiva `cargasAlAplicar { efectos, efecto, max }`): gana 1 carga cada vez que **le entra** a un enemigo alguno de esos debuffs. Con `transformarConCargas { efecto, cargas, turnos }` se transforma (temporal) al juntarlas, las consume y puede **repetirse** en la partida. P. ej. Dualidad de Géminis: 3 de Oscuridad 🌑 → Saga Oscuro 4 turnos.
- **Formas que comparten cooldowns** (`compartirCooldowns: true` en la forma): al transformarse no se reinician los cooldowns (siguen corriendo los mismos). P. ej. la Explosión de Galaxias de Saga.
- **Ciclo de fases** (pasiva `ciclo { efecto, fases: [...] }`, p. ej. los Seis Caminos de Pain): al inicio de cada turno en que **actúa** (no si pierde el turno) pasa a la siguiente fase, en orden fijo y empezando por la primera. La fase activa se ve en la carta como una marca (`camino`, tipo marca: no es buff, no se disipa) con el icono y nombre de la fase. Cada fase puede tener:
  - `alIniciar`: acción al activarse (p. ej. Deva: Espejismo; Animal: `invocarAzar`; Naraka: curar + limpiar).
  - `bonoDano`: +X de daño a sus golpes durante ese turno (no a sus invocaciones). P. ej. Asura +30%.
  - `alFinal`: acción al terminar su movimiento sobre el objetivo principal; en movimientos de área, sobre un enemigo golpeado al azar que siga vivo (p. ej. Humano: robar 1 buff; Preta: robar 5% HP).
  - Movimiento `recorreCiclo: true` (objetivo `azar`): el golpe *i* usa la fase *i* (su `bonoDano`, `alIniciar` y `alFinal` sobre ese objetivo) sin cambiar la fase activa. P. ej. Seis Caminos del Dolor.
- **Ignorar Provocación** (movimiento `ignoraProvocacion: true`): puede elegir a cualquier enemigo, aunque haya Provocación o Sigilo. P. ej. Bansho Ten'in de Pain.
- **Cooldown inicial propio** (`cdInicial` en un movimiento): con cuánto empieza la partida en vez del general (Over = 2). P. ej. Explosión de Galaxias: empieza en 6.
- **Protector** (pasiva `protector { pct, cargas: { efecto, max } }`): mientras no tenga un Control que le quite el turno, recibe **en lugar** de su aliado ese % de cada **golpe** enemigo (ya mitigado por el aliado; luego aplica su propia Armadura y reducciones; se ve como daño amarillo). Cada vez gana 1 carga de ese tipo. P. ej. Protector de Eternia de He-Man: 25%, Poder de Grayskull ⚡ (máx. 5).
- **Castigador de buffs** (pasiva): `cargasPorBuffEnemigo { efecto, max }` = cada buff que **recibe** un enemigo (por la vía normal; no los robados ni transferidos) le da 1 carga de ese tipo (p. ej. Poder Robado 💀 de Skeletor, máx. 10). `bonoPorBuffsObjetivo { pct, max }` = +pct de daño por cada buff activo del objetivo (sin contar invocaciones), hasta `max`.
- **Efectos permanentes:** una pasiva puede declarar `efectosPermanentes: [ids]`: el personaje empieza con ese efecto **toda la partida** (sin duración, se ve con ∞). No se puede disipar ni robar, y otra aplicación del mismo efecto no lo cambia. P. ej. Lich King: Provocación permanente.
- **Reducción para el equipo:** una pasiva puede declarar `reduccionAliados { pct, salvoSi }`: todo su equipo (incluido él) recibe −pct de **todo** el daño mientras viva y no tenga el efecto `salvoSi` (p. ej. Loki: −10% salvo con Desgaste).
- **Reducción propia:** una pasiva puede declarar `reduccionPropia { categoria, pct }`: reduce el daño de esa categoría que recibe **él mismo** (p. ej. Aldebarán: −15% de golpes). Se suma a la de líderes (tope 90%).
- **Cargas:** una pasiva puede declarar `cargasAlRecibirGolpe { max }`: cada golpe de un enemigo le da 1 carga (Furia Dorada 🐂, se ve en su carta con el número), hasta `max`. Con un Control que le quite turnos no gana cargas. Las cargas **no se pueden disipar** (`noDisipable`).
- **Robo contra un efecto:** una pasiva puede declarar `roboSiObjetivoTiene { efecto, pct }`: al atacar a un enemigo que **ya tenía** ese efecto, le roba pct de su HP máx. (una vez por movimiento y objetivo, aunque haya golpe extra).
- **Robo de vida:** una pasiva puede declarar `roboVida: X`: cada golpe cura X × daño causado (incluye lo absorbido por escudos). Es curación normal.
- **Inmunidades:** una pasiva puede declarar `inmuneA` con ids o etiquetas de efectos (p. ej. Sun Jin Woo: Veneno).
- **Reacciones:** si una pasiva responde a la acción de otro con un movimiento propio (`usarMovimiento`), espera a que termine el movimiento en curso (o el ataque de la invocación) y se ejecuta después.
- **Probabilidad de una pasiva:** `prob` (p. ej. 0.5): si falla, no se activa ni gasta su uso de la ronda. Con `unaVezPorMovimiento: true` solo se intenta una vez por movimiento aunque golpee varias veces (p. ej. Rhaenys).
- **Límite:** una pasiva puede declarar `maxPorRonda`. Con `soloSiCura: true`, una pasiva de curación no se activa ni gasta uso si ningún destino puede recibir curación (HP lleno).
- **Quemadura débil (`noRenueva`):** una Quemadura es *débil* si su % final (con el Daño DoT de quien la aplica) es **menor** que el de la Quemadura activa. Se fusiona igual (+10% de la débil), pero si la acción tiene `noRenueva`, **no alarga la duración**. Hoy solo la usa Rhaegal.
- **Condiciones:**
  - `objetivoTiene: <efecto>`.
  - `rompioMega: true` (en efectos `final`): algún golpe del movimiento rompió una capa de **Mega** Congelación. P. ej. Anillo de Hielo de Jaina.
  - `objetivoConBuff: true`: el objetivo tiene algún buff activo (sin contar invocaciones).
  - `equipo: { tipo | categoria, min }`: el ejecutor lleva esas reliquias (p. ej. Over de Kratos con Lanza).
  - `enemigosCon: { efectos, min }`: al menos `min` enemigos tienen alguno de esos efectos (p. ej. Furia Espartana: Letalidad si 2+ sangran).
  - `objetivoTeniaAntes: <efecto>` o `[efectos]`: el objetivo tenía ese efecto (o **alguno** de la lista) **antes** del movimiento. Importa con Congelación, porque el golpe rompe la capa. P. ej. Agonía de Escarcha: Posesión solo si ya estaba congelado.
  - `algunGolpeadoTenia: <efecto>`: al menos un objetivo golpeado (no bloqueado) lo tenía.
  - `objetivoEliminado`: el objetivo principal del movimiento murió (p. ej. turno extra de la Fatality).
  - `objetivoMasHpQueYo`: el objetivo tenía **más HP actual** que el atacante (se mide antes del golpe).
  - `invocacionesMin: N`: el ejecutor tenía al menos N invocaciones activas al usar el movimiento.
- **Duraciones:** las fichas pueden decir "turnos", pero todo dura **rondas**.
- **Bonos acumulables:** `bonoPorSobreviviente` (+X% al movimiento por cada enemigo que sobrevive; permanente). Los temporales deben indicar su duración.

## 9. Invocaciones

- Son un **buff con etiqueta Invocación** del invocador. No ocupan espacio y no se les puede atacar.
- Se pueden **Disipar** y desaparecen si muere el invocador.
- Todo lo que hacen escala con las **estadísticas del invocador**.
- **Reglas generales (todos los invocadores):**
  - Máximo **3 activas**.
  - **Sin repetidas**: en invocaciones al azar, si sale una ya activa se vuelve a tirar. Invocar un tipo ya activo lo renueva, salvo que su `max` permita varias (Dragones ×3).
  - **`renueva: true`** (en `invocarAzar`): si sale una ya activa, **se renueva** en vez de volver a tirar, para que se cumplan los pesos de la tabla. Lo usa Daenerys (Rhaegal 40%, Viserion 35%, Drogon 25%).
  - Si ya hay 3, la nueva **reemplaza a la de menor duración restante**.
  - **Duración = veces que actúa:** "dura N" = actúa **N veces**. Sigue la regla general de duraciones: si se invoca (o se renueva) cuando su invocador ya actuó o está actuando en la ronda, no pierde duración al final de esa ronda.
- **Cada invocación es un mini-personaje:**
  - `acciones`: lo que hace **cada turno**, automáticamente después del turno de su invocador, desde el turno siguiente a aparecer.
  - `alAparecer`: lo que hace **una vez** al ser invocada.
  - Una acción es un `golpe` (con `pct`, `golpes`, `efectos` y `elegir`: `menorHp` · `azar` · `todos` · `masFuerte`) o cualquier acción universal (curar, escudo, robarHP, efecto, limpiar…).
- **Rareza** (Común, Raro, Especial, Épico, Legendario): se ve en el color del borde de su medallón.
- **Invocar al azar** (`invocarAzar`): usa una tabla de pesos y puede filtrar por rareza.
- **Potenciar** (`potenciarInvocaciones`): todas actúan de inmediato (`veces`: cuántas veces, por defecto 1) con un multiplicador de `potencia` opcional y, si se indica, renuevan su duración al terminar. Dominio del Monarca: 2 veces al 100%.
- `desatar`: todas las invocaciones de un tipo atacan a todos los enemigos y se retiran (Dracarys).

### Sombras de Sun Jin Woo (tabla `sombras`)
| Sombra | Rareza | Peso | Dura | Rol |
|---|---|---|---|---|
| Iron | Común | 26 | 2 | 25% a un enemigo al azar + Escudo 50% al aliado más herido |
| Igris | Común | 26 | 2 | 45% al enemigo con menos HP |
| Shadow Ming Byung | Raro | 18 | 2 | Cura 15% HP máx. al aliado más herido · al aparecer: limpia 1 debuff a cada aliado |
| Kaisel | Raro | 15 | 2 | Roba 5% HP máx. a 2 enemigos al azar (puede repetir) y cura al invocador |
| Beru | Épico | 9 | 2 | 2×30% + Sangrado o Veneno |
| Bellion | Épico | 5 | 2 | 35% al enemigo más fuerte · al aparecer: Aturdimiento a hasta 3 enemigos distintos |
| Kamish | Legendario | 1 | 1 | 50% a todos · al aparecer: 150% a todos + Miedo |

### Criaturas del Camino Animal de Pain (tabla `animalesPain`)
| Criatura | Rareza | Peso | Dura | Rol |
|---|---|---|---|---|
| Ciempiés Gigante | Común | 22 | 2 | 40% a un enemigo al azar + 35% de Aturdir |
| Camaleón Gigante | Común | 22 | 2 | 45% al enemigo con menos HP · al aparecer: Pain gana Sigilo (2 rondas) |
| Buey Gigante | Raro | 18 | 2 | 70% al enemigo más fuerte |
| Rinoceronte Gigante | Raro | 16 | 2 | 30% a todos · al aparecer: Escudo 10% del HP máx. de Pain |
| Pájaro Taladro | Épico | 12 | 2 | 55% a un enemigo al azar + 40% de Debilitar (2 rondas) |
| Perro Cerbero | Épico | 10 | 2 | 35% a un enemigo al azar · 50% de dividirse cada turno (otro Perro, máx. 3) |

## 10. Líder

- La casilla de líder es la **primera de izquierda a derecha** y hay **un líder por equipo**.
- Solo funciona si el personaje de esa casilla tiene habilidad de líder. Termina si el líder muere.
- Las habilidades de líder que afectan a "los aliados" **incluyen al propio líder** (p. ej. Gakido protege también a Madara).
- **Piezas de líder disponibles:**
  - `reduccion { categoria, pct }`: reduce el daño recibido por los aliados.
  - `bonoPorEfecto { efecto, stat, valor }`: todo su equipo gana +valor a esa estadística por cada **enemigo** con ese efecto (p. ej. Daenerys: +4% Puntería por enemigo quemado).
  - `bonoDano`: los aliados ganan +X% de Daño (p. ej. Scorpion: +15%).
  - `bonoStat { stat: valor }`: los aliados ganan esos puntos fijos (p. ej. Thor: +15% Armadura).
  - `acumulaPorDoT { tipo, stat, valor }`: cada vez que un **enemigo** recibe daño de ese DoT, los aliados ganan +valor en esa estadística, **sin tope**. Se pierde si el líder muere (p. ej. Scorpion: +2% Daño Crítico por cada daño de Quemadura).
  - `bonoCriticoContra { efecto, critRate, critDmg }`: los aliados ganan esos puntos de Prob. y Daño Crítico al golpear a un enemigo con ese efecto (p. ej. Sub-Zero: +15%/+15% contra congelados).
  - `alIniciarRonda { acción }`: al empezar cada ronda ejecuta una acción universal (p. ej. Shaka: Escudo 12% de su HP máx. al aliado con menor % de HP).
  - `bonoDanoConEscudo: X`: los aliados que tengan Escudo hacen +X de daño (p. ej. Dios Emperador Doom: +15%, junto con +10% de HP máx.).
  - `bonoContraConBuff: X`: los aliados hacen +X de daño a enemigos con algún buff (p. ej. Señor de la Montaña de la Serpiente de Skeletor: +10%).
  - `alRecibirCritico { acción }`: cada vez que un aliado recibe un golpe crítico de un enemigo y sobrevive, el líder ejecuta la acción sobre ese aliado (p. ej. Conocer el Dolor de Pain: `bonoPermanente dmgPct .05, tope .25`).
  - `bonoStat` con `hpPct` (u otra estadística con `Pct`): % sobre la estadística base (p. ej. Dios Emperador Doom: +15% HP máx. a todo el equipo, incluido el líder). Si el líder muere, el bono se pierde y nadie queda con más HP que su nuevo máximo.
  - `alAplicar { efecto, accion }`: cada vez que su equipo **acierta** ese debuff en un enemigo (incluye pasar a Mega), **quien lo aplicó** ejecuta la acción sobre ese enemigo. P. ej. Carcelero de los Malditos de Lich King: robar 5% del HP máx. al congelado.
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
- **Fondo negro u oscuro:** se recorta como cualquier color liso y la figura queda sólida (p. ej. Viserion).
- **Espíritus** (opcional): si una invocación debe verse como un espíritu brillante, se agrega su nombre a `LUMINOSAS` en el optimizador (conserva el fondo negro) y lleva `luminosa: true` en su ficha: se dibuja en modo "pantalla", el negro desaparece y la figura brilla **translúcida**. Hoy ninguna lo usa.

## 13. Pantallas y construcción de equipos

- **Flujo:** Lobby → Construcción de equipo → presentación VS → Partida → Resultado (Revancha · Cambiar equipo · Menú). El botón "atrás" del navegador/celular vuelve entre pantallas; salir en plena partida la abandona (🏠 pide confirmación).
- **Lobby:** modos de juego. Activo: **Partida rápida** (contra la IA). Próximamente: Campaña, Multijugador, Hordas, Jefe de Clan, Arena.
- **Equipos:** siempre **5** personajes, sin repetir dentro del mismo equipo (sí se puede repetir entre tu equipo y el rival). La **primera casilla es el líder**; la pantalla muestra qué habilidad de líder quedará activa o avisa si no hay.
- **Rival:** *Aleatorio* (5 al azar entre los oficiales) o *Construir* (lo armas tú, útil para probar balance).
- **Galería:** solo personajes oficiales; los de prueba están ocultos. Filtros por rol. La "i" abre la ficha completa (estadísticas base sin reliquias, líder, pasiva, movimientos y transformaciones).
- **Registro de personajes:** `js/datos/personajes/index.js` (`OFICIALES`). Toda ficha oficial nueva se agrega ahí y aparece sola en la galería.
- **Técnica:** los menús son HTML (`js/ui/menu.js`, `menu.css`); la batalla sigue en Pixi. Una partida nueva después de otra **no recarga la página**: se limpia la anterior (cartas, efectos, textos, animaciones pendientes, registro y resultados). Así el audio sigue activo y no hay que volver a tocar la pantalla para que suene.
- **Fondos animados (videos):** una sola capa detrás de las pantallas, con un grupo de videos por pantalla en `js/datos/fondos.js`. Al entrar a una pantalla se elige uno al azar de su grupo (sin repetir el anterior); si el grupo no cambia, el video sigue sin reiniciarse. **menu:** menú de inicio. **equipo:** construcción de equipos y la presentación **VS** (también el VS de Revancha), con un velo más oscuro; se apaga al entrar a la partida. Siempre en silencio y con un velo oscuro para que se lea lo de encima. Para agregar uno: copiar el video (MP4) a `assets/menu/` y agregar su línea en el grupo. Si viene "de lado" (contenido horizontal en un cuadro vertical), se indica `girar: 90` o `-90` y el juego lo endereza. Si el navegador no lo deja arrancar solo, se reintenta al volver a la ventana o al primer toque.

## 14. Sonido

- **Registro universal:** `js/datos/sonidos.js`. Cada evento de la batalla y de la interfaz tiene un nombre (la lista completa está al inicio del archivo). Si el evento tiene **archivo**, suena; si no, queda en **silencio**. No hay sonidos sintetizados.
- **Efectos con archivo** (`assets/audio/sfx/`): botones (incluidos los movimientos disponibles), golpes (normal, crítico más fuerte y golpe al escudo más suave), Curación, **Escudo de HP** (no confundir con el futuro buff Escudo Sagrado), Quemadura, Veneno, Congelación (al aplicarse y al perder el turno congelado), **Over** (al ejecutarlo, junto con su banner), transformación e invocaciones (la Legendaria más fuerte).
- **Opciones por sonido:** `v` volumen, `dur` segundos máximos (con desvanecimiento), `var` variación de tono, `gap` tiempo mínimo entre repeticiones, `duck` baja la música mientras suena. Los archivos se precargan al primer toque.
- **Música** (`assets/audio/`): `menu.mp3` (lobby y equipos, en bucle) y `batalla-1/2/3.mp3` (uno al azar en cada partida, en bucle). La de batalla empieza **2 segundos después** de tocar Listo o Revancha. Al terminar la partida se va la de batalla y suena `victoria.mp3` o `derrota.mp3`; la del **menú** entra **2 segundos después de que aparece la ventana de resultados**, para que no se empalmen (el empate solo tiene la del menú). Si se da Revancha antes, la del menú ya no entra. Al empezar otra partida, Victoria/Derrota se cortan. Transición suave entre pistas.
- **Ajustes (🔊):** volumen de Música y de Efectos y Silenciar todo, guardados por dispositivo. Los navegadores solo dejan sonar después del primer toque del jugador.

## 15. Cinemática de Over

- Al ejecutar un **Over**, antes de que ocurra cualquier cosa: la pantalla se oscurece, la **carta del personaje** (con su HP, Daño y Velocidad actuales) vuela al centro y crece con un aura y rayos del color del Over, aparece "— OVER —" y el **nombre del movimiento**, y la carta regresa a su lugar.
- **Solo cuando la cinemática termina** ocurre el Over: transformaciones con su propia animación, golpes, efectos. El primer golpe del Over sacude la pantalla.
- Suena el sonido de Over y la música baja mientras dura.
- Los Overs **rivales** van un 25% más rápido. **Tocar la pantalla** la acelera. En ⚙️ Ajustes: **"Cinemática de Over rápida"** (el doble de rápida), guardado por dispositivo.


## 16. Pantalla de resultados

- Al terminar la partida aparece **Victoria**, **Derrota** (en rojo) o **Empate** (en gris), con la **ronda** final y la **duración** (y "Límite de rondas" si terminó así). El empate detiene la música sin pista propia por ahora.
- **Recompensas**: caja lista para futuros modos. Partida rápida no da premios y muestra "Esta partida no otorga recompensas". Un modo que dé premios pasa una lista `[{ tipo, cantidad, rareza?, nombre? }]` (tipos en `js/datos/recompensas.js`: oro, reliquia, fragmento, llave, runa, experiencia; color según rareza).
- Pestañas **Tu equipo / Rival**. Cada carta muestra, con barras animadas y números que suben contando:
  - ⚔️ **Daño**: daño real causado a enemigos (HP + Escudo), **sin el sobrante** del golpe que mata.
  - 🛡️ **Escudo**: Escudo de HP otorgado.
  - 💚 **Curación**: solo lo que realmente sanó (no cuenta la curación con HP lleno).
  - 🎯 **Daño recibido**.
  - ☠️ **Eliminaciones**: de quien hizo el último daño.
- **DoT** (Quemadura, Veneno, Sangrado, Hemorragia, Bomba, Quemadura Solar): el daño es de **quien lo aplicó**; si varios Venenos son de distintos personajes, se reparte. Si alguien **activa** (detona) un DoT, el daño es de quien lo activa. Lo copiado con **Propagar** es de quien propaga.
- **Invocaciones** suman al personaje que las invocó.
- El daño entre aliados (Confusión, Posesión) no cuenta como daño causado.
- **MVP** 👑 por equipo: Daño + Escudo + Curación + ½ Daño recibido + 150 por eliminación.

## 17. Starter Packs (clasificación de campeones)

Pantalla: al iniciar sesión por primera vez (ver sección 19).

- Cada campeón puede declarar en su ficha `starter: '<id>'`: es **exclusivo** de ese pack temático. Sin `starter`, es **libre**.
- Registro en `js/datos/starters.js`:
  - 🔥 **Blazing Legion** (`blazing`): Quemadura.
  - ❄️ **Frostborn Vanguard** (`frostborn`): Congelación y Mega Congelación.
  - 🧪 **Noxious Alliance** (`noxious`): Veneno.
- Un starter pack da **3 campeones de su tema** + **2 al azar** entre los libres y los de su propio tema. **Nunca** salen exclusivos de otro pack.
- Funciones listas: `exclusivosDe(id)` y `elegiblesAleatorios(id)`.
- Clasificación actual:
  - **Blazing:** Alexstrasza, Rhaenys Targaryen, Rengoku, Daenerys Targaryen, Scorpion.
  - **Frostborn:** Sub-Zero, Lich King, Jaina Proudmoore, Camus (4 exclusivos: el pack saca 3 al azar). ⚠️ Simulación 2026-10-09: Frostborn 67.7% contra equipos al azar; Blazing 33.5% y Noxious 39.0% (sus exclusivos son de los campeones más débiles). Revisar en el pase de balance antes de abrir el juego.
  - **Noxious:** The Joker, Reptile, Loki, Milo.
  - **Libres:** Goku, Sun Jin Woo, Shaka, Batman, Aldebarán, Thor, Madara Uchiha.
- Al crear un campeón nuevo se decide si es exclusivo de algún pack.

## 18. Sobres de la tienda

Registro en `js/datos/sobres.js` (nombre, tema, ícono y color). La apertura real la hace el servidor (`abrir_sobre`); la función local queda para pruebas.

- Cada campeón declara en su ficha `sobres: [...]`: puede estar en **varios**. Los campeones de los Starter Packs **también** están en sobres; el Starter Pack es un arranque único, no se compra.
- **Sobres actuales** (`activo: true/false` = si se ven en la tienda; por temporada):
  - 🩸 **Bloodline Awakening** (`bloodline`): Sangrado y robo de vida. Hoy: Madara, Scorpion, Kratos, Sasuke Uchiha, Milo.
  - 🌑 **Phantom of Chaos** (`phantom`): sombríos y caóticos según su historia. Hoy: Madara, Sun Jin Woo, Batman, The Joker, Reptile, Scorpion, Loki, Lich King, Doctor Doom, Skeletor, Saga, Itachi Uchiha.
  - ✨ **Sacred Aegis** (`sacred`): divinos, sagrados y mitológicos. Hoy: Alexstrasza, Shaka, Aldebarán, Thor, Loki, Kratos, Wukong.
  - 💪 **Unbreakable Force** (`unbreakable`): de todo, sin tema. **Goku, Vegeta, Naruto y He-Man salen solo aquí** (sin sobre temático + «Solo su sobre»).
  - Sin sobre temático por ahora (salen en Unbreakable Force y en los aleatorios): Daenerys, Rhaenys, Rengoku, Sub-Zero. Llegarán sobres de Quemadura, Congelación, etc.
- **Apertura** (`abrirSobre(id)`): 3 campeones, sin repetir dentro del mismo sobre. 1 o 2 (50/50) del tema y el resto al azar entre **todos** (a veces también caen del tema). Unbreakable: los 3 al azar entre todos.
- **Starter Pack** (`abrirStarter(id)` en `js/datos/starters.js`): 3 al azar de sus exclusivos + 2 al azar entre los elegibles, sin repetir.
- **Probabilidad de salida según la fuerza** (`docs/sql/003_probabilidades.sql`): cada campeón tiene un **nivel** invisible para el jugador que pesa en **todos** los sorteos (tema y relleno de sobres, Unbreakable Force y los campeones del Starter Pack). Se asigna según su % de victorias en la simulación:
  - Normal (peso 1): menos de 60% · Baja (0.75): 60–69% · Muy baja (0.5): 70–79% · Mínima (0.25): 80% o más.
  - Peso 0.5 = sale la mitad de veces que uno Normal en el mismo sorteo. Sin repetir dentro del mismo sobre (sorteo con pesos Efraimidis–Spirakis).
  - **Solo su sobre:** el campeón no sale de **relleno** en sobres temáticos ajenos (sí en el suyo, en Unbreakable Force y en el Portal).
  - El Portal no cambia: cualquier campeón cuesta 1 Runa.
  - Se cambian desde el panel de Administrador. Inicial (2026-10-07): Thor Muy baja, Doctor Doom Baja, Lich King Normal + Solo su sobre.
  - Las funciones locales `abrirSobre`/`abrirStarter` (pruebas) no usan pesos; la apertura real la hace el servidor.
- **Activar/desactivar sobres y precio:** en el servidor (`sobres_config`), con las casillas del panel de administrador. El `activo` del archivo ya no manda.

## 19. Cuenta: Starter Pack, Tienda, Colección y Portal

Solo con sesión iniciada. Todo cambio lo valida el **servidor** (funciones de `docs/sql/002_coleccion.sql`); la pantalla solo muestra y pide.

- **Starter Pack** (`js/ui/coleccion.js`): si la cuenta aún no eligió, al entrar al menú aparece *Elige tu Starter Pack* con los 3 packs. **Solo se muestra la imagen y el nombre** de cada sobre (sin tema, contenido ni cantidad): el jugador elige por el arte. Se elige **una sola vez**. Se puede cerrar ("más tarde"); Tienda y Colección lo vuelven a mostrar hasta elegir.
- **Botones del menú:** 🛒 Tienda y 📚 Colección (solo con sesión). Abren la misma ventana con 3 pestañas. Arriba siempre: 🪙 oro, 🔮 runas, 🧩 fragmentos de runa x/20 (con barra) y 💠 otros fragmentos.
- **Tienda:** los sobres activos (y dentro de sus fechas `desde`/`hasta`): solo imagen (o ícono), nombre y precio; sin tema ni contenido. Sin oro suficiente, el botón queda gris.
- **Colección:** los campeones (los que no tienes en gris). Cada carta: estrellas y copias (×N). Al tocar uno:
  - ⭐ **Ascender:** la estrella N cuesta N copias (máximo 5★). Cada estrella: +3% a sus estadísticas.
  - 💎 **Espacios de reliquias:** el 1.º, 2.º y 3.º cuestan 1 / 3 / 5 copias **o** 100,000 / 500,000 / 1,000,000 de oro.
  - 🧩 **Desfragmentar:** cada copia = 3 fragmentos (1 o 2 de Runa de Invocación, el resto de otros tipos). Pide confirmación.
- **Portal:** *Combinar* 20 fragmentos = 1 Runa. Elegir cualquier campeón y gastar 1 Runa para invocarlo (si ya lo tenía, suma copia).
- **Animación de apertura** (`js/ui/apertura.js`, la misma para sobres, Starter Pack y Portal): el sobre flota y brilla → al tocarlo (o a los 5 s) tiembla cada vez más → estalla en un destello con chispas → las cartas salen boca abajo → se voltean **una por una** con rayos de luz del color del campeón y la etiqueta **¡NUEVO!** o **+1 copia**. Tocar acelera la revelación. Botón *Continuar* al final.
- **Panel de administrador** (en 👤 Tu cuenta, solo rol admin): casilla de activo y precio de cada sobre (*Guardar sobres*) y *Dar oro* a un jugador por su nombre.
- **Al agregar un campeón nuevo:** declarar `starter` y `sobres` en su ficha, correr `node herramientas/generar_catalogo.mjs` (desde `prototipo`) y ejecutar `docs/sql/catalogo.sql` en Supabase. Sin ese paso el servidor no lo puede dar en sobres.
