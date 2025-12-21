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

Frontend requiere:
- `BACKEND_URL` - URL del backend API
