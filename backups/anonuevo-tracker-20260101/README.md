# 🎆 Año Nuevo Global 2025 - Rastreador en Vivo

Sitio web para seguir el avance del Año Nuevo por el mundo en tiempo real, diseñado para transmisión en vivo en YouTube.

## ✨ Características

- **Mapa Global Interactivo**: Visualización de franjas horarias (UTC+14 a UTC-12) con iluminación automática cuando cada zona celebra el Año Nuevo
- **Cuenta Regresiva**: Muestra el tiempo restante hasta Año Nuevo en la zona local del espectador
- **Hora UTC**: Display en tiempo real de la hora UTC actual
- **Mensajes de Voz**: Mensajes automáticos cada 15 minutos leídos en voz en off
- **Efectos Visuales**: Fuegos artificiales y confeti animados
- **Chat en Vivo**: Integración con YouTube Live Chat (requiere configuración)
- **Audio de Fondo**: Soporte para música de fondo desde YouTube Studio

## 🚀 Configuración

### Audio de Fondo

Para agregar música de fondo desde YouTube Studio:

1. Ve a [YouTube Studio - Música](https://studio.youtube.com/channel/UCDg4eJJdvNAX2az-Bi7aBkA/music)
2. Descarga el audio que quieras usar
3. Colócalo en la carpeta `anonuevo/` como `background-audio.mp3`
4. O modifica `AUDIO_CONFIG.src` en `script.js` con la URL del audio

### YouTube Live Chat

Para conectar con el chat en vivo de YouTube:

1. **Crear proyecto en Google Cloud Console**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita la **YouTube Data API v3**

2. **Crear credenciales**:
   - Ve a "APIs y servicios" > "Credenciales"
   - Crea una "Clave de API"
   - Copia la clave API

3. **Obtener el Live Chat ID**:
   - Inicia una transmisión en vivo en YouTube
   - El `liveChatId` se obtiene automáticamente desde la API usando el `videoId`

4. **Configurar en el código**:
   ```javascript
   const YOUTUBE_CONFIG = {
       apiKey: 'TU_API_KEY_AQUI',
       videoId: 'ID_DEL_VIDEO_EN_VIVO',
       liveChatId: '', // Se obtiene automáticamente
       pollInterval: 5000
   };
   ```

   Edita estas variables en `script.js` (línea ~450)

## 📁 Estructura de Archivos

```
anonuevo/
├── index.html          # Página principal
├── styles.css          # Estilos
├── script.js           # Lógica principal
├── nginx.conf          # Configuración de Nginx
├── Dockerfile          # Imagen Docker
└── README.md           # Este archivo
```

## 🐳 Docker

El sitio está configurado para ejecutarse en Docker. Para construir y ejecutar:

```bash
docker build -t anonuevo ./anonuevo
docker run -p 8080:80 anonuevo
```

O usar docker-compose desde el directorio raíz:

```bash
docker compose up -d --build anonuevo
```

## 🌐 Acceso

Una vez desplegado, el sitio estará disponible en:
- `https://habilispro.com/anonuevo` (si está configurado en nginx-proxy)

## 🎨 Personalización

### Mensajes de Voz

Edita el array `VOICE_MESSAGES` en `script.js` (línea ~30) para cambiar los mensajes que se leen cada 15 minutos.

### Franjas Horarias

Las zonas horarias están definidas en el array `TIMEZONES` en `script.js` (línea ~10). Puedes agregar o modificar zonas según necesites.

### Efectos Visuales

Los efectos visuales (fuegos artificiales y confeti) se generan automáticamente. Puedes ajustar la frecuencia modificando los intervalos en `initializeVisualEffects()`.

## 📝 Notas

- El mapa de franjas horarias es una simplificación visual. Para una implementación más precisa, considera usar datos geográficos reales de zonas horarias.
- La integración con YouTube Live Chat requiere autenticación OAuth2 y una API Key válida.
- El audio de fondo requiere interacción del usuario para iniciar (política de los navegadores).

## 🔧 Desarrollo

Para desarrollo local sin Docker:

```bash
cd anonuevo
python3 -m http.server 8000
# O
npx serve .
```

Luego visita `http://localhost:8000`

## 📄 Licencia

Este proyecto es de uso personal para transmisiones en vivo.
