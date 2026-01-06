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

El relato debe ser:
- Natural y fluido, como si estuvieras pensando en voz alta
- Entre 500 y 800 palabras (más completo y detallado)
- En primera persona: "Estoy en...", "Me llama la atención...", "Siento que...", "Me genera...", "Reflexiono sobre...", "He descubierto que..."
- Personal y subjetivo, no solo enciclopédico
- Conectar todos los elementos de forma narrativa coherente`;

        if (context.theme) {
            prompt += `\n\nEnfócate especialmente en: ${context.theme}`;
        }

        return prompt;
    }

    async generateWithIA(prompt) {
        try {
            // Intentar con el servidor de control que tiene múltiples IAs
            const response = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (response.ok) {
                const data = await response.json();
                return data.narrative || prompt; // Fallback si falla
            }
        } catch (e) {
            console.error('[ContinuousNarrative] Error generating with IA:', e);
        }

        // Fallback: relato básico
        return this.generateFallbackNarrative(prompt);
    }

    generateFallbackNarrative(prompt) {
        // Relato básico si la IA falla
        return "Estoy observando este lugar. Hay algo que me llama la atención, algo que siento que debo documentar. El tiempo pasa diferente aquí, o tal vez soy yo quien percibe el tiempo de manera distinta.";
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
