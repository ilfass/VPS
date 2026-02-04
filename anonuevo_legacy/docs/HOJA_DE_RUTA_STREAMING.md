# Hoja de ruta del streaming (sin blancos / sin silencio)

Objetivo: que el stream tenga **continuidad visual** (sin pantallas muertas) y **continuidad sonora** (ambiente + voz + recaps + “pulso” del mundo) con un hilo narrativo.

## Qué abrir primero (orden real)

1) **Entrar a** `https://habilispro.com/`
- Esta página actúa como **Acto Cero** (intro). Si no tocás nada, arranca sola en ~3.5s para evitar quedarse trabada.
- Cuando el sistema detecta **AutoMode ON**, inicia el **Show Runner** y entra al circuito.

2) **En paralelo abrir el panel** `https://habilispro.com/control.html`
- Ahí encendés/forzás el guion si querés control manual.

3) **OBS**
- Usá como fuente de navegador la pestaña que quedó en `/vivos/*` (idealmente `mapa`).

## Modo recomendado: Show Runner 60’ (loop infinito)

Mientras AutoMode esté ON, el Show Runner mantiene 5 bloques de 12’ y reinicia.

### Bloques (12’ cada uno)

- **0:00–12:00 APERTURA** → `mapa`
  - 0:03–0:05 Recap automático
  - 0:06 Pulso del mundo (news/trends/culture/all)
  - 0:10 Bumper corto (10–20s)
  - 0:11:30 Cambio al próximo bloque

- **12:00–24:00 URBANO** → `clima`
  - Recap + Pulso (news+trends+culture) + Bumper + Cambio

- **24:00–36:00 RUTAS** → `aereo`
  - Recap + Pulso (security) + Bumper + Cambio

- **36:00–48:00 ESPACIO** → `satelites`
  - Recap + Pulso (scitech) + Bumper + Cambio

- **48:00–60:00 MEMORIA** → `diario`
  - Recap + Pulso (culture+news) + Bumper + Cambio → vuelve a APERTURA

## Regla anti‑silencio (cómo se logra)

- **Ambiente**: música/ambience siempre que el navegador lo permita.
- **Recaps**: cada bloque dispara recap alrededor del minuto 3.
- **Pulso del mundo**: cada bloque dispara un “pulso” alrededor del minuto 6 (tópico según bloque).
- **Bumpers**: alrededor del minuto 10 (video overlay corto).
- **Transición**: lower‑third + SFX + cambio al siguiente modo.

## Controles mínimos desde el panel

En `control.html`:

- **START SHOW**: enciende AutoMode y arranca Show Runner.
- **STOP**: detiene Show Runner (vuelve a control manual).
- **NEXT BLOQUE**: fuerza salto al siguiente bloque.
- **RECAP NOW / BUMPER NOW**: para “llenar” si sentís que falta ritmo.

## Páginas fuera del streaming

Se removieron del circuito `/vivos/` y quedaron en `/desusos/`:
- `/desusos/reflexion/`
- `/desusos/pais/`
- `/desusos/estado-actual/`

