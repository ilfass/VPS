# PROYECTO STREAMING: EL ENJAMBRE (THE SWARM)

## Filosofía Central
1.  **Cero Silencios (>8s):** El sistema tiene "horror vacui". Si no hay nada sonando, el ORQUESTADOR (IA) debe tomar la decisión ejecutiva de llenar el vacío inmediatamente (Diálogo, Música, Noticia, Dato Curioso).
2.  **Autonomía Radical (Minuto a Minuto):** El streaming es manejado íntegramente por IAs. Ellas deciden el flujo, el contenido y la interacción en tiempo real. No hay guiones predefinidos por humanos; hay "intenciones" que el enjambre interpreta y ejecuta momento a momento.
3.  **Presencia Visual (Avatares):** Las IAs no son voces en off; son entidades presentes. Deben tener una representación visual (Avatares) que mire al público y reaccione cuando hablan, creando una conexión emocional 'cara a cara'.
4.  **Hibridación Económica:** Usamos un "Router de IAs" para alternar entre modelos gratuitos/baratos (DeepSeek, Gemini Free, Qwen) sin perder calidad.
5.  **Arquitectura Limpia:**
    *   **Orchestrator (Cerebro):** Decide qué sigue minuto a minuto.
    *   **Swarm (Creatividad):** Genera los guiones y decisiones creativas.
    *   **StageManager (Cuerpo):** Muestra mapas, fotos, subs y Avatares.
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
