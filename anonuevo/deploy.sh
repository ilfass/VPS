#!/bin/sh
# Ejecutar en el VPS (donde corre Docker), desde la raíz del repo VPS:
#   cd /ruta/al/VPS && sh anonuevo/deploy.sh

set -e
echo "Reconstruyendo imagen anonuevo..."
docker compose build anonuevo
echo "Reiniciando contenedor anonuevo..."
docker compose up -d anonuevo
echo "Listo. Entrá a la URL principal del sitio y recargá con Ctrl+Shift+R."
