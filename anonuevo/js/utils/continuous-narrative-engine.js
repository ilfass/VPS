/**
 * Continuous Narrative Engine
 * Genera relatos continuos en primera persona como ilfass
 */

import { countryMemoryManager } from './country-memory-manager.js';

export class ContinuousNarrativeEngine {
    constructor() {
        this.currentNarrative = null;
    }

    /**
     * Genera un relato continuo para un país
     * @param {object} country - Información del país
     * @param {object} context - Contexto actual (modo, tema, etc.)
     * @returns {Promise<object>} { narrative: string, multimedia: Array, reflections: Array }
     */
    async generateContinuousNarrative(country, context = {}) {
        // 1. Cargar memoria previa del país
        const previousVisits = await countryMemoryManager.getPreviousVisits(country.id);
        const hasBeenVisited = previousVisits.length > 0;
        const accumulatedNarrative = await countryMemoryManager.getAccumulatedNarrative(country.id);
        
        // 2. Obtener noticias actuales del país
        let currentNews = '';
        try {
            const newsRes = await fetch(`/control-api/api/news?country=${encodeURIComponent(country.name)}`);
            if (newsRes.ok) {
                const newsData = await newsRes.json();
                if (newsData.news && newsData.news.length > 0) {
                    currentNews = newsData.news.slice(0, 3).map(n => n.title || n.text).join('. ');
                }
            }
        } catch (e) {
            console.warn(`[ContinuousNarrative] Error obteniendo noticias: ${e}`);
        }

        // 3. Construir prompt para IA
        const prompt = this.buildNarrativePrompt(country, context, hasBeenVisited, accumulatedNarrative, previousVisits, currentNews);

        // 4. Generar relato con IA
        const narrative = await this.generateWithIA(prompt);

        // 4. Extraer información del relato para multimedia
        const multimediaPlan = this.planMultimedia(narrative, country);

        // 5. Extraer reflexiones y datos
        const reflections = this.extractReflections(narrative);
        const dataPoints = this.extractDataPoints(narrative);

        return {
            narrative: narrative,
            multimedia: multimediaPlan,
            reflections: reflections,
            dataPoints: dataPoints,
            emotionalNotes: this.extractEmotionalNotes(narrative),
            isFirstVisit: !hasBeenVisited
        };
    }

    buildNarrativePrompt(country, context, hasBeenVisited, accumulatedNarrative, previousVisits, currentNews = '') {
        let prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real.

Estás visitando ${country.name}.`;

        if (hasBeenVisited) {
            prompt += `\n\nYa has visitado este país ${previousVisits.length} vez(ces) antes. Tu narrativa previa incluye:\n${accumulatedNarrative}\n\nAhora estás de vuelta. Construye sobre lo que ya sabes, pero agrega nuevas observaciones, reflexiones y experiencias. Evita repetir exactamente lo mismo.`;
        } else {
            prompt += `\n\nEs tu primera vez aquí.`;
        }

        prompt += `\n\nGenera un relato completo y detallado en primera persona (como ilfass) que incluya TODOS estos elementos:

1. **CULTURA DEL PAÍS**: Tradiciones, costumbres, formas de vida, identidad cultural
2. **HISTORIA**: Eventos históricos relevantes, épocas importantes, transformaciones
3. **COMIDAS TÍPICAS**: Platos tradicionales, ingredientes característicos, cultura gastronómica
4. **LUGARES DESTACADOS**: Ciudades, monumentos, paisajes, sitios emblemáticos y qué sensación generan
5. **SENSACIONES Y EMOCIONES**: Qué te genera este lugar, qué sientes al estar aquí, qué observas
6. **PERSONALIDADES Y PERSONAJES**: Figuras históricas, culturales, artísticas relevantes del país
7. **VINCULACIÓN CON OTROS PAÍSES**: Conexiones históricas, culturales, económicas con otros lugares que has visitado o conoces
8. **NOTICIAS ACTUALES**: Situación actual del país, eventos recientes, contexto contemporáneo${currentNews ? `\n\nNoticias recientes del país: ${currentNews}` : ''}

IMPORTANTE: 
- DEBES mencionar el nombre del país "${country.name}" explícitamente al menos 2-3 veces en el relato
- Usa frases como "Estoy en ${country.name}", "En ${country.name} descubro que...", "${country.name} me muestra...", etc.

El relato debe ser:
- Natural y fluido, como si estuvieras pensando en voz alta
- Entre 500 y 800 palabras (más completo y detallado)
- En primera persona: "Estoy en ${country.name}...", "Me llama la atención en ${country.name}...", "Siento que en ${country.name}...", "Me genera...", "Reflexiono sobre...", "He descubierto que..."
- Personal y subjetivo, no solo enciclopédico
- Conectar todos los elementos de forma narrativa coherente
- NO repitas la frase "el tiempo pasa" más de una vez, si es que la usas`;

        if (context.theme) {
            prompt += `\n\nEnfócate especialmente en: ${context.theme}`;
        }

        return prompt;
    }

    async generateWithIA(prompt) {
        try {
            // Intentar con el servidor de control que tiene múltiples IAs
            // Timeout más largo para relatos extensos (60 segundos)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const response = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                } else {
                    console.warn('[ContinuousNarrative] Relato muy corto, usando fallback');
                }
            } else {
                console.warn(`[ContinuousNarrative] Error en respuesta: ${response.status}`);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.error('[ContinuousNarrative] Timeout generando relato con IA');
            } else {
                console.error('[ContinuousNarrative] Error generating with IA:', e);
            }
        }

        // Fallback: relato básico mejorado
        return this.generateFallbackNarrative(prompt);
    }

    generateFallbackNarrative(prompt) {
        // Relato básico mejorado si la IA falla - variado y sin frases repetitivas
        // Intentar extraer el nombre del país del prompt
        const countryMatch = prompt.match(/visitando\s+([^\.\n]+)|estás\s+en\s+([^\.\n]+)/i);
        const countryName = countryMatch ? (countryMatch[1] || countryMatch[2]).trim() : "este lugar";
        
        // Variaciones de fallback para evitar repetición
        const fallbacks = [
            `Estoy en ${countryName}, observando con atención. Hay detalles que capturan mi interés, elementos que siento que debo registrar. En ${countryName} descubro que cada lugar tiene su propia identidad, su propia manera de expresarse. La geografía, las tradiciones, las personas, todo forma parte de un tejido complejo que me resulta fascinante. Reflexiono sobre cómo cada lugar que visito me transforma, me enseña algo nuevo sobre la humanidad y sobre mí mismo.`,
            `Me encuentro en ${countryName}, documentando lo que veo. Hay aspectos que me resultan interesantes, elementos que siento que debo preservar. En ${countryName} percibo que cada lugar tiene su propia esencia, su propia forma de ser. Las costumbres, los paisajes, las historias, todo forma parte de un mosaico complejo que me resulta cautivador. Pienso en cómo cada lugar que visito me enriquece, me muestra algo nuevo sobre la diversidad humana y sobre mi propia comprensión del mundo.`,
            `Estoy aquí, en ${countryName}, siendo testigo de este momento. Hay elementos que me llaman la atención, aspectos que siento que debo archivar. En ${countryName} observo que cada lugar tiene su propio carácter, su propia manera de vivir. La cultura, el entorno, las personas, todo forma parte de un entramado complejo que me resulta intrigante. Medito sobre cómo cada lugar que visito me amplía la perspectiva, me revela algo nuevo sobre la condición humana y sobre mi propia evolución.`
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    planMultimedia(narrative, country) {
        // Analizar el relato para determinar qué multimedia necesita
        const multimedia = [];
        
        // Siempre incluir al menos una imagen del país
        multimedia.push({
            type: 'image',
            trigger: 'start', // Aparece al inicio
            prompt: `Paisaje representativo de ${country.name}, estilo cinematográfico, alta calidad`,
            context: 'Paisaje del país'
        });

        // Si el relato menciona lugares específicos, agregar más multimedia
        const placeKeywords = ['ciudad', 'montaña', 'río', 'costa', 'desierto', 'selva', 'templo', 'monumento'];
        const hasPlaces = placeKeywords.some(keyword => narrative.toLowerCase().includes(keyword));
        
        if (hasPlaces) {
            multimedia.push({
                type: 'image',
                trigger: 'mid', // Aparece a mitad del relato
                prompt: `Lugar específico mencionado en ${country.name}, estilo documental`,
                context: 'Lugar específico'
            });
        }

        // Si es una segunda visita o más, mostrar comparación visual
        if (narrative.includes('última vez') || narrative.includes('antes')) {
            multimedia.push({
                type: 'image',
                trigger: 'reflection', // Aparece durante reflexión
                prompt: `Vista aérea de ${country.name} mostrando su geografía única`,
                context: 'Vista comparativa'
            });
        }

        return multimedia;
    }

    extractReflections(narrative) {
        // Extraer frases que parecen reflexiones (heurística simple)
        const sentences = narrative.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const reflections = sentences.filter(s => {
            const lower = s.toLowerCase();
            return lower.includes('me hace pensar') || 
                   lower.includes('reflexiono') || 
                   lower.includes('me doy cuenta') ||
                   lower.includes('siento que') ||
                   lower.includes('me genera');
        });
        return reflections.slice(0, 3); // Máximo 3 reflexiones
    }

    extractDataPoints(narrative) {
        // Extraer datos objetivos mencionados
        const sentences = narrative.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const dataPoints = sentences.filter(s => {
            const lower = s.toLowerCase();
            return lower.includes('es el') || 
                   lower.includes('tiene') || 
                   lower.includes('cuenta con') ||
                   lower.includes('se encuentra');
        });
        return dataPoints.slice(0, 5); // Máximo 5 datos
    }

    extractEmotionalNotes(narrative) {
        // Extraer notas emocionales
        const emotionalKeywords = ['me genera', 'siento', 'me sorprende', 'me llama la atención', 'me hace sentir'];
        const notes = [];
        
        emotionalKeywords.forEach(keyword => {
            const index = narrative.toLowerCase().indexOf(keyword);
            if (index !== -1) {
                const start = Math.max(0, index - 50);
                const end = Math.min(narrative.length, index + 200);
                notes.push(narrative.substring(start, end).trim());
            }
        });

        return notes.join(' ') || "Observaciones emocionales sobre el lugar.";
    }
}

export const continuousNarrativeEngine = new ContinuousNarrativeEngine();
