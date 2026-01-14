# 📡 APIs Disponibles para Páginas Dinámicas

## ✅ APIs Públicas y Gratuitas (Sin API Key)

### 1. **USGS Earthquake API** ⭐ IMPLEMENTADA
- **URL:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`
- **Formato:** GeoJSON
- **Datos:** Terremotos de las últimas 24 horas, magnitud 2.5+
- **Límite:** Ninguno (pública)
- **Uso:** Página de terremotos con mapa Leaflet

### 2. **OpenSky Network API** ⭐ RECOMENDADA
- **URL:** `https://opensky-network.org/api/states/all`
- **Formato:** JSON
- **Datos:** Estados de vuelos en tiempo real
- **Límite:** Sin autenticación: 10 requests/minuto
- **Uso:** Página de tráfico aéreo
- **Nota:** Requiere autenticación para más requests

### 3. **ISS Location API** ⭐ RECOMENDADA
- **URL:** `http://api.open-notify.org/iss-now.json`
- **Formato:** JSON
- **Datos:** Posición actual de la ISS
- **Límite:** Ninguno (pública)
- **Uso:** Página de satélites/ISS

## 🔑 APIs con Plan Gratuito (Requieren API Key)

### 4. **OpenWeatherMap API**
- **Plan Gratuito:** 60 calls/minuto, 1,000,000 calls/mes
- **Datos:** Clima actual, pronóstico, mapas
- **Uso:** Página de clima
- **Registro:** https://openweathermap.org/api

### 5. **Open-Meteo API** ⭐ RECOMENDADA (Sin API Key)
- **URL:** `https://api.open-meteo.com/v1/forecast`
- **Formato:** JSON
- **Datos:** Clima, pronóstico, datos históricos
- **Límite:** Ninguno (pública)
- **Uso:** Página de clima (mejor que OpenWeatherMap)

## ❌ APIs que NO tienen versión gratuita pública

### 6. **MarineTraffic**
- Requiere API key de pago
- **Alternativa:** Eliminar página o usar datos simulados

### 7. **N2YO Satellite API**
- Requiere API key de pago
- **Alternativa:** Usar ISS Location API (gratuita)

### 8. **Stellarium**
- No tiene API pública
- **Alternativa:** Eliminar página o usar datos de posición de planetas de otras APIs

## 🎯 Plan de Implementación

1. ✅ **Terremotos** - USGS API (implementada)
2. ⏳ **Clima** - Open-Meteo API (sin API key)
3. ⏳ **Tráfico Aéreo** - OpenSky Network API
4. ⏳ **Satélites/ISS** - ISS Location API
5. ❌ **Tráfico Marítimo** - Eliminar (no hay API gratuita)
6. ❌ **Cielo/Stellarium** - Eliminar (no hay API pública)

## 📝 Notas

- Todas las APIs públicas tienen límites de rate, pero son suficientes para streaming
- Las visualizaciones se crearán con Leaflet.js para mapas
- Los datos se actualizarán cada 60 segundos para mantener dinamismo
- El avatar narrará sobre los datos en tiempo real
