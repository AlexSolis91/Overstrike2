# Balance de la beta (2026-10-21)

Todos los campeones oficiales con sus estadísticas base dentro de la banda de su rol (ver `docs/mecanicas.md` §1),
ajustados con simulación en dos pasadas para quedar cerca de 50% **con y sin equipo**:

1. Sin reliquias de la cuenta (equipo de ejemplo): 31 rondas de hasta 12,000 partidas 5 vs 5 al azar entre todo el roster.
2. Mitad de las partidas con equipo de ejemplo y mitad con **6 reliquias Épicas al azar y 5 estrellas** (8 rondas).

En partidas al azar el promedio del roster es siempre 50%: lo que decide es la estrategia, la sinergia y el equipamiento.
Los equipos temáticos de los Starters ganan ~64–68% contra equipos al azar.

- **Base:** HP / Daño / Velocidad (antes → ahora). Las transformaciones cambian en la misma proporción.
- **Movimientos:** cambio total en el % de daño de sus movimientos (también curaciones y escudos, con sus textos).
- **Extra:** estadísticas secundarias que cambiaron (no tienen banda).
- **Victorias:** contra equipos al azar, sin equipo de cuenta (12,000 partidas) y con 6 Épicas y 5★ (10,000 partidas).
  Kratos y Gilgamesh dependen mucho del equipo (Kratos gana con sus 2 Espadas; Gilgamesh escala con la Prob. Crítico);
  en promedio quedan cerca de 50%.
- Ajustes manuales: Reptile pasa a Asesino/DoTer (su kit es de asesino; Veneno 30→50%, +40% contra envenenados); Muzan:
  Forma Final con 15% de HP (antes 30%) y cura 5% por enemigo envenenado (antes 8%).
- Legendarias (simulado con un portador en un equipo de Épicas): Escudo Hyliano y Frostmourne ~63%, Mithril ~61%,
  Anillo del Tiempo ~60%, Shadowmourne ~55% (antes hasta 70%). Ver `docs/mecanicas.md` §21.

| Campeón | Banda | Antes | Ahora | Movimientos | Extra | Sin equipo | 6 Épicas 5★ |
|---|---|---|---|---|---|---|---|
| Madara Uchiha | Luchador | 660 / 85 / 90 | **730 / 73 / 99** | +59% |  | 45.0% | 55.5% |
| Rengoku | Tanque | 750 / 50 / 72 | **850 / 55 / 97** | +87% | Armadura 0→20%, Resistencia 0→10% | 52.6% | 47.1% |
| Alexstrasza | Soporte | 600 / 40 / 82 | **650 / 55 / 99** | −NaN% | Resistencia 0→15%, Armadura 0→10% | 49.9% | 44.2% |
| Sun Jin Woo | Invoker | 960 / 118 / 104 | **570 / 57 / 105** | — |  | 48.8% | 51.2% |
| Shaka | Tanque | 730 / 65 / 75 | **850 / 55 / 97** | +100% | Armadura 0→25%, Resistencia 0→15% | 50.5% | 46.8% |
| Goku | Asesino | 620 / 85 / 92 | **600 / 90 / 111** | +60% |  | 52.3% | 48.0% |
| Vegeta | Asesino | 640 / 88 / 94 | **600 / 90 / 113** | +69% |  | 51.6% | 49.2% |
| Batman | Control | 600 / 45 / 78 | **700 / 65 / 97** | +121% | Puntería 0→25%, Armadura 0→5% | 47.4% | 44.2% |
| The Joker | DoTer | 540 / 50 / 90 | **650 / 60 / 106** | +60% |  | 47.0% | 54.0% |
| Reptile | Asesino | 620 / 80 / 98 | **600 / 90 / 119** | +83% | Prob. Crítico 5→15%, Puntería 0→25% | 49.4% | 47.5% |
| Sub-Zero | Control | 620 / 55 / 79 | **700 / 65 / 94** | +11% |  | 51.4% | 48.7% |
| Scorpion | Luchador | 715 / 84 / 77 | **750 / 75 / 92** | +59% | Armadura 0→10%, Prob. Crítico 0→10% | 52.1% | 52.0% |
| Aldebarán | Tanque | 810 / 45 / 70 | **850 / 55 / 97** | +82% | Armadura 15→50%, Resistencia 0→10% | 52.1% | 48.6% |
| Rhaenys Targaryen | Asesino | 620 / 85 / 82 | **600 / 90 / 99** | +59% | Prob. Crítico 0→15% | 47.2% | 50.3% |
| Thor | Luchador | 690 / 86 / 91 | **650 / 60 / 81** | −41% |  | 49.9% | 48.7% |
| Loki | Tanque | 760 / 50 / 92 | **850 / 55 / 101** | — |  | 51.2% | 46.9% |
| Lich King | Tanque | 800 / 40 / 62 | **850 / 55 / 97** | +82% | Armadura 0→20%, Resistencia 0→20% | 48.7% | 49.2% |
| Jaina Proudmoore | Asesino | 600 / 90 / 80 | **540 / 81 / 88** | +49% |  | 43.7% | 49.7% |
| Doctor Doom | Soporte | 650 / 54 / 90 | **630 / 50 / 87** | — |  | 54.5% | 47.7% |
| Kratos | Luchador | 700 / 85 / 86 | **750 / 75 / 95** | +12% |  | 54.9% | 41.8% |
| Daenerys Targaryen | Invoker | 500 / 85 / 77 | **700 / 70 / 88** | +25% |  | 48.3% | 53.2% |
| Wukong | Asesino | 640 / 90 / 96 | **520 / 78 / 86** | −15% |  | 52.2% | 48.9% |
| Naruto | Luchador | 650 / 86 / 92 | **750 / 75 / 111** | +59% |  | 51.4% | 49.5% |
| Sasuke Uchiha | Asesino | 620 / 88 / 95 | **530 / 80 / 87** | −16% |  | 50.5% | 50.0% |
| Skeletor | Control | 680 / 86 / 90 | **670 / 62 / 99** | +33% |  | 48.7% | 51.2% |
| He-Man | Tanque | 850 / 70 / 82 | **750 / 40 / 80** | −9% |  | 50.3% | 49.9% |
| Saga | Control | 720 / 88 / 95 | **640 / 53 / 86** | −10% |  | 50.1% | 52.3% |
| Camus | Control | 660 / 78 / 94 | **700 / 65 / 113** | +5% |  | 53.1% | 48.3% |
| Milo | DoTer | 640 / 78 / 96 | **550 / 45 / 84** | −40% |  | 51.7% | 49.3% |
| Itachi Uchiha | Control | 680 / 88 / 96 | **600 / 50 / 80** | — |  | 49.3% | 52.6% |
| Pain | Luchador | 740 / 92 / 96 | **740 / 74 / 106** | — |  | 48.9% | 50.8% |
| Gilgamesh | Luchador | 690 / 92 / 93 | **650 / 60 / 80** | −32% |  | 44.9% | 58.8% |
| Ozymandias | Luchador | 700 / 88 / 90 | **650 / 60 / 80** | −47% |  | 46.5% | 52.5% |
| Minato Namikaze | Luchador | 700 / 94 / 110 | **750 / 74 / 103** | — |  | 55.2% | 45.7% |
| Antares | DoTer | 680 / 86 / 88 | **630 / 58 / 87** | — |  | 49.5% | 49.6% |
| Baran | Luchador | 740 / 100 / 96 | **650 / 63 / 94** | — |  | 48.9% | 53.3% |
| Orochimaru | DoTer | 660 / 84 / 92 | **550 / 45 / 84** | — |  | 46.6% | 52.7% |
| Ghost Rider | Luchador | 690 / 74 / 84 | **730 / 67 / 80** | −23% |  | 53.4% | 49.7% |
| Venom | Luchador | 780 / 78 / 78 | **750 / 75 / 89** | — |  | 52.8% | 51.9% |
| Spider-Man | Control | 640 / 74 / 96 | **600 / 59 / 93** | — |  | 49.2% | 51.3% |
| Carnage | Luchador | 650 / 84 / 90 | **730 / 75 / 94** | — |  | 49.1% | 50.4% |
| Gaara | Tanque | 820 / 48 / 70 | **800 / 43 / 80** | −22% |  | 51.7% | 49.5% |
| Sasori | Invoker | 690 / 76 / 82 | **700 / 70 / 84** | — |  | 55.3% | 43.6% |
| Obito Uchiha | Control | 680 / 76 / 88 | **690 / 65 / 89** | — |  | 48.2% | 48.2% |
| Deidara | DoTer | 600 / 62 / 86 | **550 / 45 / 80** | −10% |  | 50.6% | 50.9% |
| Broly | Tanque | 960 / 90 / 86 | **840 / 54 / 95** | — |  | 45.8% | 51.5% |
| Gohan | Soporte | 760 / 78 / 96 | **610 / 52 / 95** | — |  | 48.8% | 46.4% |
| Trunks | Luchador | 720 / 90 / 98 | **660 / 69 / 99** | — |  | 49.9% | 48.2% |
| Hashirama Senju | Tanque | 900 / 84 / 90 | **780 / 42 / 80** | −20% |  | 50.4% | 49.9% |
| Tobirama Senju | Control | 840 / 96 / 102 | **680 / 63 / 112** | +31% |  | 48.6% | 55.9% |
| El Pingüino | DoTer | 720 / 80 / 92 | **650 / 60 / 95** | — |  | 49.2% | 51.6% |
| Natsu Dragneel | DoTer | 580 / 53 / 92 | **550 / 45 / 80** | −34% |  | 50.3% | 50.2% |
| Kyo Kusanagi | DoTer | 640 / 62 / 96 | **550 / 45 / 86** | — |  | 48.3% | 49.4% |
| Iori Yagami | Luchador | 740 / 78 / 94 | **650 / 60 / 89** | — |  | 46.9% | 47.2% |
| Sillad | Control | 640 / 54 / 90 | **660 / 55 / 81** | −28% |  | 54.3% | 50.7% |
| Rakan | Luchador | 720 / 74 / 100 | **650 / 60 / 89** | −21% |  | 49.8% | 50.4% |
| Muzan Kibutsuji | DoTer | 560 / 44 / 90 | **550 / 45 / 80** | −45% |  | 49.9% | 51.4% |
| Poison Ivy | DoTer | 820 / 96 / 100 | **610 / 56 / 111** | +52% |  | 46.5% | 54.0% |
| Ermac | DoTer | 680 / 64 / 92 | **550 / 45 / 80** | −15% |  | 49.4% | 51.7% |
| Shinobu Kocho | DoTer | 780 / 90 / 106 | **650 / 60 / 118** | +17% |  | 50.6% | 50.2% |
| Mr. Freeze | Tanque | 780 / 57 / 82 | **750 / 40 / 80** | −47% |  | 49.9% | 51.1% |
| Baruka | Control | 680 / 76 / 116 | **680 / 65 / 117** | — |  | 50.0% | 50.7% |
| Bjorn Ironside | Tanque | 840 / 54 / 82 | **780 / 41 / 80** | −5% |  | 52.9% | 49.3% |
| Aokiji | Control | 900 / 96 / 96 | **700 / 65 / 108** | +27% |  | 52.3% | 55.6% |
