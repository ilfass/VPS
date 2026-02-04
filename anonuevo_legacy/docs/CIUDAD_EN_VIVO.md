# 🏙️ Ciudad en vivo (streaming) — Tráfico + Transporte

## URL
- ` /vivos/ciudad/ `

## Selección de ciudad (query param)
- Londres (default): ` /vivos/ciudad/?city=london `
- Buenos Aires: ` /vivos/ciudad/?city=buenosaires `
- Madrid: ` /vivos/ciudad/?city=madrid `

## APIs (con keys gratuitas)

### 1) TomTom Traffic (tiles de flujo, “se ve en directo”)
- **Uso**: overlay de tráfico en el mapa (colores de flujo/congestión).
- **Key**: `TOMTOM_API_KEY`
- **Endpoint proxy** (interno): ` /control-api/api/city/tomtom/traffic/{z}/{x}/{y}.png?style=relative `

### 2) TfL (Londres) — estado de líneas
- **Uso**: panel lateral con estado de líneas (tube/dlr/overground/elizabeth).
- **Keys**: `TFL_APP_ID`, `TFL_APP_KEY`
- **Endpoint proxy** (interno): ` /control-api/api/city/tfl/status `

## Variables de entorno (servidor)
En el servidor, exportar o definir en `.env`:

```bash
TOMTOM_API_KEY=...
TFL_APP_ID=...
TFL_APP_KEY=...
```

Y levantar `docker compose` para que `anonuevo-control` las reciba (ver `docker-compose.yml`).

## Notas
- Sin keys, la hoja funciona en “modo demo”: mapa base + overlays animados, pero sin tráfico real ni TfL real.
- Con keys, el overlay de tráfico es altamente dinámico para streaming.

