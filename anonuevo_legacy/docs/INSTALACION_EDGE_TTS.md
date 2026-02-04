# 🎤 INSTALACIÓN: EDGE TTS (Microsoft)
## Solución Gratuita de Text-to-Speech para CPU Básico

**Fecha:** 2026-01-11  
**Objetivo:** Reemplazar Web Speech API con Edge TTS para mejor calidad de voz

---

## ✅ VENTAJAS DE EDGE TTS

- ✅ **100% Gratuito** - Sin límites, sin costos
- ✅ **Funciona en CPU** - No requiere GPU
- ✅ **Muy Rápido** - Generación casi instantánea
- ✅ **Alta Calidad** - Suena mucho mejor que Web Speech API
- ✅ **Soporte Español** - Múltiples voces en español
- ✅ **Sin Instalación Pesada** - Solo requiere Node.js

---

## 📋 PREREQUISITOS

- Node.js 14 o superior
- npm (gestor de paquetes de Node.js)

---

## 🔧 INSTALACIÓN

### Paso 1: Instalar Edge TTS Globalmente

```bash
# En el servidor
npm install -g edge-tts

# O si prefieres instalarlo localmente en el proyecto
cd anonuevo
npm install edge-tts
```

### Paso 2: Verificar Instalación

```bash
# Verificar que edge-tts está instalado
edge-tts --version

# Listar voces disponibles en español
edge-tts --list-voices | grep es-
```

### Paso 3: Probar Generación de Audio

```bash
# Probar generación básica
edge-tts --voice "es-ES-AlvaroNeural" --text "Hola, esta es una prueba" --write test.mp3

# Debería generar un archivo test.mp3
```

---

## 🐳 INSTALACIÓN EN DOCKER

Si usas Docker, agregar al `Dockerfile`:

```dockerfile
# Instalar Node.js y edge-tts
RUN apk add --no-cache nodejs npm
RUN npm install -g edge-tts

# O si usas imagen con Node.js ya instalado:
RUN npm install -g edge-tts
```

---

## 🎯 VOCES DISPONIBLES EN ESPAÑOL

### Voces Recomendadas

**Masculinas:**
- `es-ES-AlvaroNeural` - **Recomendada** - Natural, adulta
- `es-ES-ArnauNeural` - Joven, energética
- `es-ES-DarioNeural` - Adulta, profesional
- `es-ES-EliasNeural` - Madura, reflexiva

**Femeninas:**
- `es-ES-ElviraNeural` - Natural, clara
- `es-MX-DaliaNeural` - Mexicana, cálida
- `es-AR-ElenaNeural` - Argentina, expresiva

**Por Defecto:** `es-ES-AlvaroNeural` (masculina, natural)

---

## ⚙️ CONFIGURACIÓN

### Cambiar Voz por Defecto

Editar `anonuevo/js/utils/audio-manager.js`:

```javascript
voice: priority === 'news' ? 'es-ES-ElviraNeural' : 'es-ES-AlvaroNeural'
```

### Deshabilitar Edge TTS (Usar Solo Fallback)

En `audio-manager.js`:

```javascript
this.useEdgeTTS = false; // Cambiar a false
```

---

## 🧪 PRUEBAS

### Prueba desde Terminal

```bash
cd anonuevo/scripts
echo '{"text":"Soy ilfass, y estoy aquí para documentar la existencia humana."}' | node edge-tts-service.js
```

### Prueba desde Navegador

Abrir consola del navegador y ejecutar:

```javascript
fetch('/control-api/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hola, esta es una prueba' })
})
.then(r => r.json())
.then(console.log);
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "edge-tts: command not found"

```bash
# Instalar globalmente
npm install -g edge-tts

# O verificar PATH de npm
npm config get prefix
```

### Error: "Error generando audio"

- Verificar que edge-tts está instalado: `edge-tts --version`
- Verificar permisos de escritura en `anonuevo/assets/audio/generated/`
- Verificar conexión a internet (primera vez puede descargar modelos)

### Audio no se reproduce

- Verificar que el archivo se generó: `ls -lh anonuevo/assets/audio/generated/`
- Verificar que Nginx sirve el directorio `/assets/audio/generated/`
- Verificar permisos del archivo

### Fallback a Web Speech API

Si Edge TTS falla, el sistema automáticamente usa Web Speech API como fallback. Esto es normal y esperado si:
- Edge TTS no está instalado
- Hay error en la generación
- El servidor no responde

---

## 📊 COMPARACIÓN

| Característica | Web Speech API | Edge TTS |
|----------------|----------------|----------|
| **Calidad** | ⚠️ Robótica | ✅ Natural |
| **Velocidad** | ✅ Instantánea | ✅ Muy Rápida |
| **Costo** | ✅ Gratis | ✅ Gratis |
| **CPU** | ✅ Ligero | ✅ Ligero |
| **Instalación** | ✅ Ninguna | ⚠️ Requiere npm |
| **Clonación** | ❌ No | ❌ No (pero mejor calidad) |

---

## ✅ VERIFICACIÓN FINAL

Una vez instalado, deberías poder:

1. ✅ Ejecutar `edge-tts --version` sin errores
2. ✅ Generar audio con `edge-tts --text "test" --write test.mp3`
3. ✅ El endpoint `/api/tts` responde correctamente
4. ✅ El audio suena natural (no robótico)

---

## 🚀 PRÓXIMOS PASOS

1. **Probar en el mapa** - Verificar que la voz suena mejor
2. **Ajustar velocidad** - Si es necesario, ajustar en el código
3. **Cambiar voz** - Probar diferentes voces y elegir la mejor
4. **Optimizar cache** - Los audios se cachean automáticamente

---

**Nota:** Edge TTS es una solución intermedia excelente. Cuando estés listo para clonar tu voz, podrás migrar a Coqui TTS/XTTS sin cambiar mucho código.
