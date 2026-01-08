# Uso Detallado de IAs en "El Viaje de ilfass"

## 📊 Resumen Ejecutivo

El sistema utiliza **7 servicios de IA** organizados en dos categorías:
- **4 IAs para Texto/Narrativas**
- **3 IAs para Imágenes**

---

## 🎯 IAs para Generación de Texto (Narrativas)

### 1. **Grok (xAI) - grok-4-latest** ⭐ PRIORIDAD 1
- **Modelo:** `grok-4-latest`
- **Cuándo se usa:**
  - ✅ **Introducción del mapa** (prioridad principal)
  - ✅ **Relatos continuos de países** (primera opción)
  - ✅ **Narrativas generales** (primera opción)
- **Timeout:** 30 segundos
- **Configuración:** Temperature 0.8, Max tokens 800

### 2. **OpenAI GPT-4o** ⭐ PRIORIDAD 2
- **Modelo:** `gpt-4o`
- **Cuándo se usa:**
  - ✅ **Fallback de Grok** (si Grok falla o timeout)
  - ✅ **Relatos continuos de países** (segunda opción)
  - ✅ **Introducciones** (segunda opción)
- **Timeout:** 30 segundos
- **Configuración:** Temperature 0.8, Max tokens 800

### 3. **Google Gemini 2.0 Flash** ⭐ PRIORIDAD 3
- **Modelo:** `gemini-2.0-flash`
- **Cuándo se usa:**
  - ✅ **Fallback de OpenAI** (si OpenAI falla o timeout)
  - ✅ **Relatos continuos de países** (tercera opción)
  - ✅ **Introducciones** (tercera opción)
- **Timeout:** 30 segundos

### 4. **Hugging Face - Mistral-7B-Instruct-v0.2** ⭐ PRIORIDAD 4
- **Modelo:** `mistralai/Mistral-7B-Instruct-v0.2`
- **Cuándo se usa:**
  - ✅ **Último recurso** (si todas las anteriores fallan)
  - ✅ **Fallback final** antes del placeholder
- **Timeout:** 30 segundos

---

## 🎨 IAs para Generación de Imágenes

### 5. **OpenAI DALL-E 3** ⭐ PRIORIDAD 1
- **Modelo:** `dall-e-3`
- **Cuándo se usa:**
  - ✅ **Imágenes para países** (primera opción)
  - ✅ **Imágenes para lugares/conceptos** (primera opción)
  - ✅ **Multimedia durante relatos** (primera opción)
  - ✅ **Curiosidades** (si no hay media disponible)
- **Tamaño:** 1024x1024
- **Formato:** PNG

### 6. **Hugging Face - Stable Diffusion XL** ⭐ PRIORIDAD 2
- **Modelo:** `stabilityai/stable-diffusion-xl-base-1.0`
- **Cuándo se usa:**
  - ✅ **Fallback de DALL-E** (si DALL-E falla)
  - ✅ **Imágenes para países** (segunda opción)
  - ✅ **Multimedia durante relatos** (segunda opción)

### 7. **Pollinations.ai** ⭐ PRIORIDAD 3
- **API:** `https://image.pollinations.ai/`
- **Cuándo se usa:**
  - ✅ **Último recurso** (si DALL-E y Stable Diffusion fallan)
  - ✅ **Imágenes gratuitas** (sin API key requerida)
- **Rate Limiting:** 2 segundos mínimo entre requests
- **Nota:** Puede devolver error 429 (rate limit) que se maneja automáticamente

---

## 🔄 Estrategia de Fallback en Cascada

### Para Texto/Narrativas:
```
1. Grok (xAI) 
   ↓ (si falla o timeout)
2. OpenAI GPT-4o
   ↓ (si falla o timeout)
3. Google Gemini 2.0 Flash
   ↓ (si falla o timeout)
4. Hugging Face Mistral
   ↓ (si falla)
5. Texto placeholder variado (fallback final)
```

### Para Imágenes:
```
1. OpenAI DALL-E 3
   ↓ (si falla)
2. Hugging Face Stable Diffusion XL
   ↓ (si falla)
3. Pollinations.ai
   ↓ (si falla o rate limit)
4. Imagen placeholder (fallback final)
```

---

## 📍 Momentos Específicos de Uso

### 1. **Al Cargar el Mapa (Intro General)**
- **IA de Texto:** Grok → OpenAI → Gemini → HF
- **Cuándo:** Inmediatamente al montar el mapa
- **Endpoint:** `/control-api/api/generate-narrative`
- **Prompt:** Genera introducción sobre el proyecto

### 2. **Al Hacer Zoom a un País**
- **IA de Texto:** Grok → OpenAI → Gemini → HF
- **IA de Imagen:** DALL-E → Stable Diffusion → Pollinations
- **Cuándo:** Cuando se hace zoom in a un país específico
- **Endpoints:** 
  - `/control-api/api/generate-narrative` (texto)
  - `/control-api/api/generate-image` (imágenes)
- **Prompt:** Genera relato continuo sobre el país con cultura, historia, comida, lugares, etc.

### 3. **Página de Curiosidades**
- **IA de Texto:** Grok → OpenAI → Gemini → HF
- **IA de Imagen:** DALL-E → Stable Diffusion → Pollinations
- **Cuándo:** Al mostrar cada curiosidad
- **Endpoints:**
  - `/control-api/api/generate-narrative` (narrativa sobre la curiosidad)
  - `/control-api/api/generate-image` (imagen del país si no hay media)

### 4. **Generación Manual desde Panel de Control**
- **IA de Texto:** Grok → OpenAI → Gemini → HF
- **IA de Imagen:** DALL-E → Stable Diffusion → Pollinations
- **Cuándo:** Cuando el director presiona "Generate Narrative" o "Generate Image"
- **Endpoints:** Mismos que arriba

---

## ⚙️ Configuración Técnica

### Timeouts
- **Por servicio:** 30 segundos
- **Timeout total cliente:** 60 segundos
- **Timeout relatos extensos:** 60 segundos

### Rate Limiting
- **Pollinations:** 2 segundos mínimo entre requests
- **Otros servicios:** Sin rate limiting específico (depende de cada API)

### Variables de Entorno Requeridas
```bash
OPENAI_API_KEY=sk-...      # Para GPT-4o y DALL-E 3
GROK_API_KEY=xai-...       # Para Grok
GEMINI_API_KEY=...         # Para Gemini 2.0 Flash
HF_API_KEY=hf_...          # Para Mistral y Stable Diffusion
# Pollinations no requiere API key
```

---

## 📈 Estadísticas de Uso

- **Alta disponibilidad:** Múltiples fallbacks garantizan contenido siempre
- **Diversidad:** Diferentes IAs aportan variedad al contenido
- **Resiliencia:** Si un servicio falla, el sistema continúa con el siguiente
- **Costo optimizado:** Prioriza servicios más económicos cuando es posible

---

## 🔍 Logs y Debugging

Los logs muestran qué IA se está usando:
- `🧠 Dreaming with Grok (xAI)...`
- `🎨 Intentando generar con DALL-E 3...`
- `🎨 Fallback to Pollinations...`
- `⚠️ Grok falló o timeout`
- `✨ Saved (DALL-E): filename.png`
