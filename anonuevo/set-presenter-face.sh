#!/bin/bash

# Script para copiar la imagen del presentador
# Uso: ./set-presenter-face.sh /ruta/a/tu/imagen.jpg

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la ruta de la imagen"
    echo "Uso: ./set-presenter-face.sh /ruta/a/tu/imagen.jpg"
    exit 1
fi

SOURCE_IMAGE="$1"
TARGET_IMAGE="presenter-face.jpg"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: No se encontró el archivo: $SOURCE_IMAGE"
    exit 1
fi

# Copiar la imagen
cp "$SOURCE_IMAGE" "$TARGET_IMAGE"

# Verificar que se copió correctamente
if [ -f "$TARGET_IMAGE" ]; then
    echo "✅ Imagen copiada exitosamente como $TARGET_IMAGE"
    echo "📏 Tamaño: $(du -h "$TARGET_IMAGE" | cut -f1)"
    echo ""
    echo "🔄 Ahora necesitas hacer commit y deploy:"
    echo "   git add presenter-face.jpg"
    echo "   git commit -m 'Agregar foto del presentador'"
    echo "   git push origin main"
else
    echo "❌ Error al copiar la imagen"
    exit 1
fi
