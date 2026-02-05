# Desplegar cambios de anonuevo (VPS)

Los archivos estáticos (index.html, css/, js/) **no** están montados por volumen: se copian al **build** de la imagen. Para ver cambios (intro, estética, etc.) hay que **reconstruir y reiniciar**.

## En el VPS (donde corre Docker)

```bash
cd /ruta/al/VPS   # o donde esté tu repo

# 1. Actualizar código (si los cambios están en git)
git pull

# 2. Reconstruir la imagen de anonuevo
docker compose build anonuevo

# 3. Levantar de nuevo el contenedor
docker compose up -d anonuevo
```

## Qué URL abre la intro

- **Con intro y streaming:** la raíz del sitio anonuevo → `https://tudominio.com/` o `https://tudominio.com/index.html`
- **Sin intro:** `/testing_lab.html` es otra página (laboratorio de pruebas); no usa index.html ni la intro.

Si entrás por la **raíz** (o `/index.html`) y seguís sin ver la intro, fuerza recarga sin caché: **Ctrl+Shift+R** (o Cmd+Shift+R en Mac).

**Importante:** La intro solo existe en `index.html`. Si tu dominio redirige a `/streaming/`, abrí explícitamente la raíz (ej. `https://tudominio.com/`) para verla antes de ir al streaming.
