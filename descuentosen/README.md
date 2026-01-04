# Descuentos En - Agregador de Ofertas

Sitio web agregador automático de ofertas y descuentos.

## Estructura del Proyecto

- `app/` - Frontend Next.js
- `backend/` - API Node.js/Express
- `admin/` - Panel de administración

## Servicios Docker

- `descuentosen` - Frontend Next.js (puerto 3000)
- `descuentosen-backend` - API Backend (puerto 3001)
- `descuentosen-mongo` - Base de datos MongoDB
- `descuentosen-admin` - Panel admin (puerto 80)

## Desarrollo Local

### Frontend
```bash
cd descuentosen
npm install
npm run dev
```

### Backend
```bash
cd descuentosen/backend
npm install
npm run dev
```

## Despliegue

```bash
docker-compose up -d --build
```

## Variables de Entorno

Backend requiere:
- `MONGODB_URI` - URI de conexión a MongoDB
- `PORT` - Puerto del servidor (default: 3001)
- `NODE_ENV` - Entorno (production/development)
- `GEMINI_API_KEY` - (Opcional) API Key de Google Gemini para extracción inteligente de ofertas. Si no se proporciona, se usará el método tradicional de scraping.

Frontend requiere:
- `BACKEND_URL` - URL del backend API

## Configuración de IA

El sistema utiliza IA (Google Gemini) para extraer información de ofertas de manera más precisa y robusta. Para habilitar esta funcionalidad:

1. Obtén una API Key de Google Gemini en https://makersuite.google.com/app/apikey
2. Configura la variable de entorno `GEMINI_API_KEY` en tu archivo `.env` o en `docker-compose.yml`
3. El sistema usará automáticamente IA cuando esté disponible, con fallback al método tradicional

**Nota:** Sin la API key, el sistema funcionará con el método tradicional de scraping basado en selectores CSS. La API key ya está configurada por defecto en `docker-compose.yml`.

