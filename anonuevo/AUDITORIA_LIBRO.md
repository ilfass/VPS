# Auditoría del Libro — 2026-01-19T03:27:41.609Z

## VIVOS (Streaming)

Total hojas /vivos: **23** — OK: **16** — WARN: **7**

### Estado por hoja

| Hoja | Estado | Observaciones |
|---|---|---|
| `aereo` | **OK** | — |
| `aire` | **OK** | — |
| `cielo` | **WARN** | no está en MODES (js/main.js) |
| `ciudad` | **OK** | — |
| `clima` | **OK** | — |
| `continente` | **OK** | — |
| `curiosidades` | **OK** | — |
| `diario` | **OK** | — |
| `estadisticas` | **OK** | — |
| `estado-actual` | **WARN** | no está en MODES (js/main.js), falta js/modes/<modo>.js |
| `galeria` | **OK** | — |
| `globo` | **OK** | — |
| `incendios` | **OK** | — |
| `intro` | **WARN** | no está en MODES (js/main.js), falta js/modes/<modo>.js |
| `mapa` | **OK** | — |
| `maritimo` | **WARN** | no está en MODES (js/main.js) |
| `pais` | **WARN** | no está en MODES (js/main.js), falta js/modes/<modo>.js |
| `portada` | **WARN** | no está en MODES (js/main.js), falta js/modes/<modo>.js |
| `reflexion` | **WARN** | no está en MODES (js/main.js), falta js/modes/<modo>.js |
| `ruta` | **OK** | — |
| `satelites` | **OK** | — |
| `sol` | **OK** | — |
| `terremotos` | **OK** | — |

## MEMORIA (Archivo / Libro)

Estructura (resumen):

```
- indice/
- pais/
  - pais/argentina/
    - pais/argentina/dia-1/
    - pais/argentina/dia-2/
    - pais/argentina/dia-3/
    - pais/argentina/reflexion/
  - pais/template/
    - pais/template/dia-1/
    - pais/template/dia-2/
    - pais/template/dia-3/
    - pais/template/reflexion/
```

## Observación técnica

- La continuidad narrativa hoy depende de prompts por hoja; conviene centralizar guion y memoria en el backend (control-server).
