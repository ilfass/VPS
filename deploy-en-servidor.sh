#!/bin/bash
# Script para ejecutar EN EL SERVIDOR para desplegar cambios de AdSense
# Copiar este script al servidor y ejecutarlo: bash deploy-en-servidor.sh

echo "🚀 ========================================="
echo "   DEPLOY ADSENSE EN SERVIDOR"
echo "🚀 ========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml no encontrado"
    echo "   Ejecuta este script desde /root/VPS"
    exit 1
fi

echo "📥 Paso 1: Actualizando código desde Git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Error al hacer git pull"
    exit 1
fi

echo "✅ Código actualizado"
echo ""

echo "🔍 Paso 2: Verificando cambios de AdSense..."
if grep -q "google-adsense-account" habilispro/index.html && \
   grep -q "google-adsense-account" habilispro-live/index.html && \
   grep -q "google-adsense-account" expodiario/index.html && \
   grep -q "google-adsense-account" descuentosen/app/layout.tsx; then
    echo "✅ Cambios de AdSense encontrados en los archivos"
else
    echo "⚠️  Advertencia: Algunos archivos pueden no tener la configuración de AdSense"
fi
echo ""

echo "🔨 Paso 3: Reconstruyendo y desplegando contenedores..."
echo "   Esto puede tardar varios minutos..."
echo ""

# Detener contenedores
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# Construir y desplegar
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

if [ $? -ne 0 ]; then
    echo "❌ Error al desplegar contenedores"
    exit 1
fi

echo ""
echo "⏳ Esperando a que los servicios se inicien..."
sleep 15

echo ""
echo "📊 Paso 4: Estado de los contenedores:"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo ""
echo "✅ ========================================="
echo "   DEPLOY COMPLETADO"
echo "✅ ========================================="
echo ""
echo "🌐 Sitios desplegados:"
echo "   - https://habilispro.com"
echo "   - https://descuentosen.com"
echo "   - https://expodiario.com"
echo ""
echo "🔍 Para verificar los cambios:"
echo "   1. Visita cada sitio web"
echo "   2. Abre el código fuente (Ctrl+U)"
echo "   3. Busca en <head>:"
echo "      - meta name=\"google-adsense-account\""
echo "      - script src=\"adsbygoogle.js\""
echo ""


