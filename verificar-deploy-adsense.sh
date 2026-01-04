#!/bin/bash
# Script para verificar y desplegar cambios de AdSense

echo "🔍 Verificando cambios de AdSense en archivos locales..."
echo ""

# Verificar que los archivos tienen la configuración de AdSense
echo "📋 Verificando archivos modificados:"

FILES_OK=0
FILES_ERROR=0

# Verificar habilispro
if grep -q "google-adsense-account" habilispro/index.html && grep -q "adsbygoogle.js" habilispro/index.html; then
    echo "✅ habilispro/index.html - OK"
    ((FILES_OK++))
else
    echo "❌ habilispro/index.html - FALTA configuración"
    ((FILES_ERROR++))
fi

# Verificar habilispro-live
if grep -q "google-adsense-account" habilispro-live/index.html && grep -q "adsbygoogle.js" habilispro-live/index.html; then
    echo "✅ habilispro-live/index.html - OK"
    ((FILES_OK++))
else
    echo "❌ habilispro-live/index.html - FALTA configuración"
    ((FILES_ERROR++))
fi

# Verificar expodiario
if grep -q "google-adsense-account" expodiario/index.html && grep -q "adsbygoogle.js" expodiario/index.html; then
    echo "✅ expodiario/index.html - OK"
    ((FILES_OK++))
else
    echo "❌ expodiario/index.html - FALTA configuración"
    ((FILES_ERROR++))
fi

# Verificar descuentosen
if grep -q "google-adsense-account" descuentosen/app/layout.tsx && grep -q "adsbygoogle.js" descuentosen/app/layout.tsx; then
    echo "✅ descuentosen/app/layout.tsx - OK"
    ((FILES_OK++))
else
    echo "❌ descuentosen/app/layout.tsx - FALTA configuración"
    ((FILES_ERROR++))
fi

echo ""
echo "📊 Resumen: $FILES_OK archivos OK, $FILES_ERROR archivos con errores"
echo ""

if [ $FILES_ERROR -eq 0 ]; then
    echo "✅ Todos los archivos tienen la configuración de AdSense correcta"
    echo ""
    echo "🚀 Para desplegar en el servidor, tienes dos opciones:"
    echo ""
    echo "1️⃣  Usar el webhook (si está configurado):"
    echo "   curl -X POST http://TU_SERVIDOR:9000/deploy"
    echo ""
    echo "2️⃣  Conectarse por SSH al servidor y ejecutar:"
    echo "   ssh usuario@servidor"
    echo "   cd /root/VPS"
    echo "   bash deploy-completo.sh"
    echo ""
    echo "3️⃣  O usar el script simple:"
    echo "   cd /root/VPS"
    echo "   bash deploy.sh"
    echo ""
else
    echo "❌ Hay archivos con errores. Revisa la configuración antes de desplegar."
    exit 1
fi


