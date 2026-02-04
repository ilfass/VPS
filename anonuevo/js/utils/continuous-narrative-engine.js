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
        let prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real. Viajas acompañado por COMPANION, una entidad auxiliar más técnica y curiosa.

Estás visitando ${country.name}.`;

        if (hasBeenVisited) {
            prompt += `\n\nYa has visitado este país ${previousVisits.length} vez(ces) antes. Tu narrativa previa incluye:\n${accumulatedNarrative}\n\nAhora estás de vuelta. Construye sobre lo que ya sabes.`;
        } else {
            prompt += `\n\nEs tu primera vez aquí.`;
        }

        prompt += `\n\nGenera un GUION DE DIÁLOGO entre [ILFASS] y [COMPANION] sobre ${country.name}.

FORMATO OBLIGATORIO:
[ILFASS]: Texto...
[COMPANION]: Texto...
(Alternar al menos 3 o 4 veces)

TEMAS A CUBRIR (Integrados en la charla):
1. **CULTURA E HISTORIA**: Tradiciones, identidad.
2. **DATOS CURIOSOS**: Algo técnico o sorprendente (Rol de COMPANION).
3. **NOTICIAS (Si hay)**: ${currentNews ? `Mencionar esto: ${currentNews}` : 'Contexto actual.'}
4. **SENSACIONES**: Reflexión filosófica de ILFASS.

ESTILO:
- ILFASS: Filosófico, poético, observador de la condición humana.
- COMPANION: Precisa, aporta datos, curiosa, analítica.

El diálogo debe sentirse como dos entidades descubriendo el lugar juntas en tiempo real. No muy largo, dinámico.`;

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
                body: JSON.stringify({ prompt, temperature: 0.8 }), // Temp alta para creatividad
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.narrative && data.narrative.length > 50) {
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
        // Fallback DIÁLOGO si la IA falla
        const countryMatch = prompt.match(/visitando\s+([^.\n]+)|estás\s+en\s+([^.\n]+)/i);
        const countryName = countryMatch ? (countryMatch[1] || countryMatch[2]).trim() : "este lugar";

        const fallbacks = [
            `[ILFASS]: Llegamos a ${countryName}. La atmósfera aquí vibra diferente.
[COMPANION]: Detecto patrones culturales complejos y una geografía fascinante en ${countryName}.
[ILFASS]: Es la huella de la historia. Cada rincón parece contar un relato antiguo.
[COMPANION]: Mis sensores indican una alta densidad de actividad humana. ¿Qué observas tú?
[ILFASS]: Veo la resiliencia en sus habitantes. ${countryName} es un testimonio vivo de adaptación.`,

            `[ILFASS]: ${countryName} se despliega ante nosotros.
[COMPANION]: Confirmo ubicación. Los datos sugieren una rica biodiversidad y tradiciones arraigadas.
[ILFASS]: Más allá de los datos, siento la memoria del lugar.
[COMPANION]: ¿Te refieres a su historia? ${countryName} ha pasado por múltiples transformaciones.
[ILFASS]: Exacto. Y aun así, su esencia permanece. Sigamos observando.`
        ];

        return {
            narrative: fallbacks[Math.floor(Math.random() * fallbacks.length)],
            multimedia: [],
            reflections: ["La historia persiste.", "La adaptación es clave."],
            dataPoints: ["Ubicación confirmada", "Análisis cultural iniciado"],
            emotionalNotes: ["Curiosidad", "Respeto"],
            isFirstVisit: true
        };
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
