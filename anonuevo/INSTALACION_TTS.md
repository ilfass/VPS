# 🎤 GUÍA DE INSTALACIÓN: COQUI TTS / XTTS

## Instalación del Sistema de Clonación de Voz

---

## 📋 PREREQUISITOS

- Python 3.8 o superior
- pip (gestor de paquetes de Python)
- Espacio en disco: ~2GB (para el modelo)

---

## 🔧 INSTALACIÓN

### Paso 1: Instalar Coqui TTS

```bash
# En el servidor o máquina local
pip install TTS

# O si usas Docker, agregar al Dockerfile:
# RUN pip install TTS
```

### Paso 2: Verificar Instalación

```bash
python3 -c "from TTS.api import TTS; print('✅ TTS instalado correctamente')"
```

### Paso 3: Preparar Muestra de Voz

1. **Grabar tu voz:**
   - Duración: 10-30 segundos
   - Formato: WAV
   - Calidad: 16kHz, mono
   - Sin ruido de fondo

2. **Guardar el archivo:**
   ```bash
   # Crear directorio si no existe
   mkdir -p anonuevo/assets/voice
   
   # Copiar tu grabación
   cp tu_grabacion.wav anonuevo/assets/voice/voice_sample.wav
   ```

3. **Verificar que el archivo existe:**
   ```bash
   ls -lh anonuevo/assets/voice/voice_sample.wav
   ```

### Paso 4: Probar el Servicio

```bash
# Probar generación de audio
cd anonuevo/scripts
python3 tts-service.py "Hola, esta es una prueba de mi voz clonada"

# Debería generar un archivo en: anonuevo/assets/audio/generated/
```

---

## 🐳 INSTALACIÓN EN DOCKER

Si usas Docker, agregar al `Dockerfile`:

```dockerfile
# Instalar Python y TTS
RUN apk add --no-cache python3 py3-pip
RUN pip3 install TTS

# Copiar script de TTS
COPY scripts/tts-service.py /usr/local/bin/tts-service.py
RUN chmod +x /usr/local/bin/tts-service.py

# Crear directorios necesarios
RUN mkdir -p /usr/share/nginx/html/assets/voice
RUN mkdir -p /usr/share/nginx/html/assets/audio/generated
```

---

## ⚙️ CONFIGURACIÓN

### Variables de Entorno (Opcional)

```bash
# Ruta de la muestra de voz
export TTS_VOICE_SAMPLE="/path/to/voice_sample.wav"

# Directorio de salida
export TTS_OUTPUT_DIR="/path/to/output"
```

### Ajustar Parámetros de Voz

Editar `scripts/tts-service.py` para ajustar:
- Velocidad de habla
- Tono
- Énfasis

---

## 🧪 PRUEBAS

### Prueba Básica

```bash
echo '{"text":"Soy ilfass, y estoy aquí para documentar la existencia humana."}' | python3 anonuevo/scripts/tts-service.py
```

### Prueba desde Node.js

```javascript
const { exec } = require('child_process');
const text = "Hola, esta es una prueba";

exec(`echo '{"text":"${text}"}' | python3 tts-service.py`, (error, stdout) => {
    const result = JSON.parse(stdout);
    console.log(result);
});
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "TTS no instalado"
```bash
pip install TTS
```

### Error: "Muestra de voz no encontrada"
- Verificar que `anonuevo/assets/voice/voice_sample.wav` existe
- Verificar permisos del archivo

### Error: "Modelo no se puede cargar"
- Verificar conexión a internet (primera vez descarga el modelo)
- Verificar espacio en disco
- Probar: `python3 -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"`

### Generación muy lenta
- Primera generación siempre es más lenta (carga modelo)
- Usar GPU si está disponible
- Considerar cache de audios generados

---

## 📝 NOTAS

- **Primera ejecución:** Descargará el modelo (~1.5GB) - puede tardar varios minutos
- **Generación:** Primera vez ~10-15 segundos, siguientes ~3-5 segundos
- **Calidad:** Mejor con GPU, pero funciona en CPU
- **Idioma:** El modelo soporta múltiples idiomas, configurado para español

---

## ✅ VERIFICACIÓN FINAL

Una vez instalado, deberías poder:

1. ✅ Ejecutar `python3 tts-service.py "test"` sin errores
2. ✅ Ver archivo generado en `anonuevo/assets/audio/generated/`
3. ✅ El audio suena con tu voz clonada

---

**Siguiente Paso:** Integrar con `control-server.js` y `audio-manager.js`
