# 📋 URLs de las Hojas Dinámicas

## Hojas Dinámicas - Visualizaciones en Tiempo Real

### 1. 🌍 Clima en Tiempo Real
**URL:** `/vivos/clima/`  
**URL Completa:** `https://tu-dominio.com/vivos/clima/`  
**Descripción:** Visualización de clima global con Windy (viento, lluvia, nubes, presión)

### 2. ✈️ Tráfico Aéreo
**URL:** `/vivos/aereo/`  
**URL Completa:** `https://tu-dominio.com/vivos/aereo/`  
**Descripción:** Mapa de tráfico aéreo global con Flightradar24 (aviones en tiempo real)

### 3. 🚢 Tráfico Marítimo
**URL:** `/vivos/maritimo/`  
**URL Completa:** `https://tu-dominio.com/vivos/maritimo/`  
**Descripción:** Mapa de tráfico marítimo con MarineTraffic (barcos navegando)

### 4. 🛰️ Satélites
**URL:** `/vivos/satelites/`  
**URL Completa:** `https://tu-dominio.com/vivos/satelites/`  
**Descripción:** Rastreador de satélites con N2YO (ISS y otros satélites orbitando)

### 5. 🌐 Terremotos
**URL:** `/vivos/terremotos/`  
**URL Completa:** `https://tu-dominio.com/vivos/terremotos/`  
**Descripción:** Mapa de terremotos en tiempo casi real con USGS

### 6. ✨ Cielo en Tiempo Real
**URL:** `/vivos/cielo/`  
**URL Completa:** `https://tu-dominio.com/vivos/cielo/`  
**Descripción:** Cielo estrellado en tiempo real con Stellarium Web

## Otras Hojas Dinámicas

### 7. 🌍 Globo 3D
**URL:** `/vivos/globo/`  
**URL Completa:** `https://tu-dominio.com/vivos/globo/`  
**Descripción:** Globo 3D interactivo con Cesium.js y temas históricos

### 8. 📊 Estadísticas
**URL:** `/vivos/estadisticas/`  
**URL Completa:** `https://tu-dominio.com/vivos/estadisticas/`  
**Descripción:** Dashboard con estadísticas del viaje

### 9. 🎬 Galería
**URL:** `/vivos/galeria/`  
**URL Completa:** `https://tu-dominio.com/vivos/galeria/`  
**Descripción:** Galería multimedia del viaje

### 10. 🗺️ Ruta
**URL:** `/vivos/ruta/`  
**URL Completa:** `https://tu-dominio.com/vivos/ruta/`  
**Descripción:** Mapa de la ruta del viaje

### 11. 🌐 Continente
**URL:** `/vivos/continente/`  
**URL Completa:** `https://tu-dominio.com/vivos/continente/`  
**Descripción:** Vista panorámica de continentes

### 12. 📔 Diario
**URL:** `/vivos/diario/`  
**URL Completa:** `https://tu-dominio.com/vivos/diario/`  
**Descripción:** Diario de viaje dinámico

## Nota sobre Navegación

Los botones del panel de control usan `navigateToPage()` que:
1. Envía mensaje via BroadcastChannel (si la página de streaming está abierta)
2. Envía evento al servidor (para sincronización)
3. Si necesitas abrir directamente, usa las URLs completas arriba

Para abrir manualmente, simplemente navega a: `https://tu-dominio.com/vivos/[nombre-pagina]/`
