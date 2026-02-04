# PROYECTO STREAMING: EL ENJAMBRE (THE SWARM)

## Filosofía Central
1.  **Cero Silencios (>8s):** El sistema tiene "horror vacui". Si no hay nada sonando, el ORQUESTADOR debe inventar algo (Diálogo, Música, Noticia, Dato Curioso).
2.  **Autonomía de la IA:** Las IAs (Ilfass, Companion y el Director) deciden EL QUÉ y EL CÓMO. El código solo provee las herramientas (reproducir, mostrar).
3.  **Hibridación Económica:** Usamos un "Router de IAs" para alternar entre modelos gratuitos/baratos (DeepSeek, Gemini Free, Qwen) sin perder calidad.
4.  **Arquitectura Limpia:**
    *   **Orchestrator (Cerebro):** Decide qué sigue.
    *   **Swarm (Creatividad):** Genera los guiones.
    *   **StageManager (Cuerpo):** Muestra mapas, fotos, subs.
    *   **AudioManager (Voz):** Habla y pone música.

## Stack Tecnológico
- **Frontend:** Vanilla JS (ES Modules). D3.js para mapas.
- **Backend:** Node.js (Proxy ligero para APIs).
- **Voces:** EdgeTTS (Gratis, alta calidad).
- **Imágenes:** Pexels API + Generación (Pollinations/Flux Free).

## Roles
- **[ILFASS]:** Filósofo, Poeta, Observador Humano. (Voz: Ryan Multilingual).
- **[COMPANION]:** Técnica, Precisa, Curiosa. (Voz: Emma Multilingual).
- **[DIRECTOR]:** Invisible. Gestiona el ritmo y elige a qué API llamar.
