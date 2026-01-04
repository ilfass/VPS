#!/bin/bash
# Script para desplegar cambios de AdSense y verificar

echo "🚀 ========================================="
echo "   DEPLOY ADSense - Verificación y Despliegue"
echo "🚀 ========================================="
echo ""

# Verificar cambios locales primero
echo "🔍 Paso 1: Verificando cambios locales..."
bash verificar-deploy-adsense.sh

if [ $? -ne 0 ]; then
    echo "❌ Error en verificación local. Abortando."
    exit 1
fi

echo ""
echo "📤 Paso 2: Los cambios ya están en Git (push completado)"
echo "   Commit: $(git log -1 --oneline)"
echo ""

# Intentar webhook si está disponible
echo "🌐 Paso 3: Intentando deploy vía webhook..."
echo ""

# Intentar con diferentes URLs posibles
WEBHOOK_URLS=(
    "http://descuentosen.com:9000/deploy"
    "http://habilispro.com:9000/deploy"
    "http://localhost:9000/deploy"
)

WEBHOOK_SUCCESS=false
for url in "${WEBHOOK_URLS[@]}"; do
    echo "   Intentando: $url"
    if curl -s -X POST "$url" --max-time 5 > /dev/null 2>&1; then
        echo "   ✅ Webhook exitoso: $url"
        WEBHOOK_SUCCESS=true
        break
    else
        echo "   ❌ No disponible: $url"
    fi
done

if [ "$WEBHOOK_SUCCESS" = false ]; then
    echo ""
    echo "⚠️  Webhook no disponible. Debes desplegar manualmente."
    echo ""
    echo "📋 INSTRUCCIONES PARA DEPLOY MANUAL:"
    echo ""
    echo "1. Conéctate al servidor por SSH:"
    echo "   ssh usuario@servidor"
    echo ""
    echo "2. Ve al directorio del proyecto:"
    echo "   cd /root/VPS"
    echo ""
    echo "3. Ejecuta el script de deploy:"
    echo "   bash deploy-completo.sh"
    echo ""
    echo "   O el script simple:"
    echo "   bash deploy.sh"
    echo ""
fi

echo ""
echo "🔍 Paso 4: Verificación de cambios en sitios web (después del deploy)"
echo ""
echo "Para verificar que los cambios están aplicados, revisa el código fuente de:"
echo "  - https://habilispro.com (verificar <head> en código fuente)"
echo "  - https://habilispro-live.com (si existe)"
echo "  - https://expodiario.com (si existe)"
echo "  - https://descuentosen.com (verificar <head> en código fuente)"
echo ""
echo "Busca en el código fuente (Ctrl+U o clic derecho > Ver código fuente):"
echo "  - <meta name=\"google-adsense-account\" content=\"ca-pub-2913558400341127\">"
echo "  - <script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913558400341127\""
echo ""


