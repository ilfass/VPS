# 🎵 Instrucciones para Agregar Sonidos de Fondo

## Cómo Obtener los Audios de YouTube Studio

1. **Accede a YouTube Studio**:
   - Ve a: https://studio.youtube.com/channel/UCDg4eJJdvNAX2az-Bi7aBkA/music
   - O navega a: YouTube Studio > Biblioteca de Audio

2. **Descarga los Audios**:
   - Selecciona los audios que quieras usar
   - Descárgalos en formato MP3
   - Renómbralos como: `audio1.mp3`, `audio2.mp3`, `audio3.mp3`

3. **Coloca los Archivos**:
   - Copia los archivos MP3 a la carpeta `anonuevo/`
   - Los archivos deben estar en la misma carpeta que `index.html`

4. **Configuración Automática**:
   - El sitio detectará automáticamente los archivos si se llaman:
     - `audio1.mp3`
     - `audio2.mp3`
     - `audio3.mp3`

5. **Configuración Personalizada**:
   - Si quieres usar otros nombres o URLs, edita `AUDIO_CONFIG` en `script.js`:
   ```javascript
   const AUDIO_CONFIG = {
       tracks: [
           { id: 'backgroundAudio1', src: 'tu-audio-1.mp3', volume: 0.3, loop: true },
           { id: 'backgroundAudio2', src: 'tu-audio-2.mp3', volume: 0.2, loop: true },
           { id: 'backgroundAudio3', src: 'tu-audio-3.mp3', volume: 0.25, loop: true }
       ]
   };
   ```

## Notas

- Los audios se reproducirán en bucle automáticamente
- El volumen está configurado para no interferir con la transmisión
- Puedes ajustar el volumen de cada pista en la configuración (0.0 a 1.0)
- Los audios comenzarán a reproducirse después de la primera interacción del usuario (requerido por los navegadores)
