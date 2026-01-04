#!/bin/bash
# Script completo de despliegue para descuentosen.com
# Ejecutar en el VPS: bash deploy-completo.sh

set -e

echo "🚀 ========================================="
echo "   DESPLIEGUE DESCUENTOSEN.COM"
echo "🚀 ========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml no encontrado"
    echo "   Ejecuta este script desde el directorio /root/VPS"
    exit 1
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    exit 1
fi

# Verificar docker-compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: docker-compose no está disponible"
    exit 1
fi

echo "✅ Docker encontrado: $(docker --version)"
echo "✅ Docker Compose: $DOCKER_COMPOSE"
echo ""

# Actualizar código
echo "📥 Actualizando código desde Git..."
git pull origin main || {
    echo "⚠️  Advertencia: No se pudo hacer git pull (puede ser normal si ya está actualizado)"
}

echo ""
echo "🔨 Construyendo y desplegando contenedores..."
echo "   Esto puede tardar varios minutos en la primera ejecución..."
echo ""

# Detener contenedores existentes si hay errores
$DOCKER_COMPOSE down 2>/dev/null || true

# Construir y desplegar
$DOCKER_COMPOSE up -d --build

echo ""
echo "⏳ Esperando a que los servicios se inicien..."
sleep 15

echo ""
echo "📊 Estado de los contenedores:"
$DOCKER_COMPOSE ps

echo ""
echo "🔍 Verificando servicios..."

# Verificar frontend
if $DOCKER_COMPOSE ps | grep -q "descuentosen.*Up"; then
    echo "✅ Frontend (descuentosen) está corriendo"
else
    echo "❌ Frontend (descuentosen) NO está corriendo"
    echo "   Logs:"
    $DOCKER_COMPOSE logs --tail=10 descuentosen
fi

# Verificar backend
if $DOCKER_COMPOSE ps | grep -q "descuentosen-backend.*Up"; then
    echo "✅ Backend está corriendo"
else
    echo "❌ Backend NO está corriendo"
    echo "   Logs:"
    $DOCKER_COMPOSE logs --tail=10 descuentosen-backend
fi

# Verificar MongoDB
if $DOCKER_COMPOSE ps | grep -q "descuentosen-mongo.*Up"; then
    echo "✅ MongoDB está corriendo"
else
    echo "❌ MongoDB NO está corriendo"
fi

# Verificar nginx-proxy
if $DOCKER_COMPOSE ps | grep -q "nginx-proxy.*Up"; then
    echo "✅ Nginx Proxy está corriendo"
else
    echo "❌ Nginx Proxy NO está corriendo"
fi

echo ""
echo "📝 Últimos logs del frontend:"
$DOCKER_COMPOSE logs --tail=15 descuentosen 2>&1 | tail -15

echo ""
echo "📝 Últimos logs del backend:"
$DOCKER_COMPOSE logs --tail=15 descuentosen-backend 2>&1 | tail -15

echo ""
echo "=========================================="
echo "✅ DESPLIEGUE COMPLETADO"
echo "=========================================="
echo ""
echo "🌐 Sitio: https://descuentosen.com"
echo "🔧 Admin: https://descuentosen.com/admin"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  $DOCKER_COMPOSE logs -f descuentosen"
echo ""
echo "Para ver el estado:"
echo "  $DOCKER_COMPOSE ps"
echo ""





