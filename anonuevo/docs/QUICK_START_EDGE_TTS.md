# ⚡ QUICK START: Edge TTS

## Instalación Rápida (2 minutos)

```bash
# 1. Instalar edge-tts globalmente
npm install -g edge-tts

# 2. Verificar instalación
edge-tts --version

# 3. Probar generación
edge-tts --voice "es-ES-AlvaroNeural" --text "Hola, prueba" --write test.mp3

# 4. Reiniciar servidor
# El sistema automáticamente usará Edge TTS en lugar de Web Speech API
```

## ✅ Listo

El sistema ahora usará Edge TTS automáticamente. Si Edge TTS no está disponible, usará Web Speech API como fallback.

## 🎯 Voces Disponibles

- `es-ES-AlvaroNeural` - Masculina, natural (por defecto)
- `es-ES-ElviraNeural` - Femenina, clara
- `es-ES-ArnauNeural` - Masculina, joven
- `es-MX-DaliaNeural` - Femenina, mexicana

## 🔍 Verificar que Funciona

1. Abrir el mapa en el navegador
2. Abrir consola (F12)
3. Deberías ver: `[AudioManager] ✅ Audio generado con Edge TTS`
4. La voz debería sonar mucho mejor (no robótica)

---

**Si hay problemas:** Ver `INSTALACION_EDGE_TTS.md` para solución de problemas.
