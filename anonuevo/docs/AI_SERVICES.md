# Servicios de IA Utilizados en "El Viaje de ilfass"

## Resumen
El sistema utiliza **7 servicios de IA diferentes** para generar contenido narrativo y visual.

---

## Servicios de IA para Texto (Narrativas)

### 1. **OpenAI GPT-4o**
- **Uso:** Generación de narrativas, relatos continuos, introducciones
- **Prioridad:** Nivel 1 (primera opción)
- **Modelo:** `gpt-4o`
- **Configuración:**
  - Temperature: 0.8
  - Max tokens: 800
  - Voz: Reflexiva, observacional, primera persona

### 2. **Grok (xAI) - grok-4-latest**
- **Uso:** Generación de narrativas, relatos continuos, introducciones
- **Prioridad:** Nivel 2 (fallback de OpenAI)
- **Modelo:** `grok-4-latest`
- **Configuración:**
  - Temperature: 0.8
  - Max tokens: 800
  - Voz: Reflexiva, observacional, primera persona

### 3. **Google Gemini 2.0 Flash**
- **Uso:** Generación de narrativas, relatos continuos, introducciones
- **Prioridad:** Nivel 3 (fallback de Grok)
- **Modelo:** `gemini-2.0-flash`
- **Configuración:** Voz reflexiva y observacional

### 4. **Hugging Face - Mistral-7B-Instruct-v0.2**
- **Uso:** Generación de narrativas (último recurso)
- **Prioridad:** Nivel 4 (fallback final)
- **Modelo:** `mistralai/Mistral-7B-Instruct-v0.2`
- **Configuración:** Fallback cuando todas las demás fallan

---

## Servicios de IA para Imágenes

### 5. **OpenAI DALL-E 3**
- **Uso:** Generación de imágenes para países, lugares, conceptos
- **Prioridad:** Nivel 1 (primera opción)
- **Modelo:** `dall-e-3`
- **Tamaño:** 1024x1024
- **Formato:** PNG

### 6. **Hugging Face - Stable Diffusion XL**
- **Uso:** Generación de imágenes (fallback de DALL-E)
- **Prioridad:** Nivel 2
- **Modelo:** `stabilityai/stable-diffusion-xl-base-1.0`
- **API:** Hugging Face Inference API

### 7. **Pollinations.ai**
- **Uso:** Generación de imágenes (último recurso)
- **Prioridad:** Nivel 3
- **Rate Limiting:** 2 segundos entre requests
- **Nota:** Tiene límites de rate (429) que se manejan con fallbacks

---

## Estrategia de Fallback

El sistema implementa una estrategia de fallback en cascada:

### Para Texto:
1. **OpenAI GPT-4o** → Si falla →
2. **Grok (xAI)** → Si falla →
3. **Gemini 2.0 Flash** → Si falla →
4. **Hugging Face Mistral** → Si falla →
5. **Texto placeholder** (fallback final)

### Para Imágenes:
1. **OpenAI DALL-E 3** → Si falla →
2. **Hugging Face Stable Diffusion** → Si falla →
3. **Pollinations.ai** → Si falla →
4. **Imagen placeholder** (fallback final)

---

## Configuración de Rate Limiting

- **Pollinations:** 2 segundos mínimo entre requests
- **Timeouts:** 30 segundos por servicio
- **Timeout total cliente:** 60 segundos

---

## Variables de Entorno Requeridas

```bash
OPENAI_API_KEY=sk-...
GROK_API_KEY=xai-...
GEMINI_API_KEY=...
HF_API_KEY=hf_...
```

---

## Uso por Funcionalidad

### Introducción del Mapa
- Prioriza: **Grok** → OpenAI → Gemini

### Relatos Continuos de Países
- Prioriza: **Grok** → OpenAI → Gemini → Hugging Face

### Generación de Imágenes
- Prioriza: **DALL-E 3** → Stable Diffusion → Pollinations

---

## Estadísticas de Uso

El sistema está diseñado para:
- **Alta disponibilidad:** Múltiples fallbacks garantizan que siempre se genere contenido
- **Diversidad:** Diferentes IAs aportan variedad al contenido
- **Resiliencia:** Si un servicio falla, el sistema continúa con el siguiente
