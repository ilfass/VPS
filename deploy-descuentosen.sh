#!/bin/bash
# Script de despliegue para descuentosen.com
# Ejecutar en el VPS: bash deploy-descuentosen.sh

set -e

echo "🚀 Iniciando despliegue de descuentosen.com..."

# Ir al directorio del proyecto
cd /root/VPS || cd /home/fabian/Documentos/VPN/VPS

echo "📥 Actualizando código desde Git..."
git pull origin main

echo "🔨 Construyendo y desplegando contenedores..."
docker-compose up -d --build

echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

echo "📊 Estado de los contenedores:"
docker-compose ps

echo "📝 Logs recientes del frontend:"
docker-compose logs --tail=20 descuentosen

echo "📝 Logs recientes del backend:"
docker-compose logs --tail=20 descuentosen-backend

echo ""
echo "✅ Despliegue completado!"
echo "🌐 Sitio disponible en: https://descuentosen.com"
echo "🔧 Admin disponible en: https://descuentosen.com/admin"
