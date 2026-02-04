
export const MONETIZATION_TYPES = {
    PASSIVE: 'PASSIVE',             // Afiliados, Donaciones (Anillo 1)
    EDITORIAL: 'EDITORIAL',         // Contenido Premium (Anillo 2)
    EMOTIONAL: 'EMOTIONAL'          // Apadrinamiento (Anillo 3)
};

export class ContentEngine {
    constructor() {
        this.derivativeQueue = [];
    }

    /**
     * Procesa una pieza de contenido narrativo para generar derivados
     * @param {object} narrative - { text, type, country, time }
     */
    processContent(narrative) {
        // Regla: Nada se genera una sola vez.
        // Un contenido fuerte -> mínimo 5 derivados

        // 1. Clip Corto (Si es reflexión)
        if (narrative.type === 'REFLECTION') {
            this.createDerivative(narrative, 'SHORT_CLIP');
            this.createDerivative(narrative, 'MICRO_ESSAY');
        }

        // 2. Entrada de Diario (Siempre)
        this.createDerivative(narrative, 'DIARY_ENTRY');

        // 3. Post Temático (Si es cultura/curiosidad)
        if (narrative.type === 'CULTURE' || narrative.type === 'CURIOSITIES') {
            this.createDerivative(narrative, 'SOCIAL_POST');
        }

        // 4. Newsletter Snippet (Para resumen semanal)
        this.createDerivative(narrative, 'NEWSLETTER_SNIPPET');
    }

    createDerivative(source, type) {
        const derivative = {
            sourceId: Date.now(), // Simulado
            type: type,
            content: source.text,
            metadata: {
                country: source.diaryEntry.country,
                originalType: source.type
            },
            status: 'PENDING_PUBLISH'
        };

        this.derivativeQueue.push(derivative);
        console.log(`[ContentEngine] Generated derivative: ${type} from ${source.type}`);
    }

    /**
     * Verifica si es ético/apropiado mostrar monetización en este momento
     * @param {string} narrativeType 
     */
    canMonetize(narrativeType) {
        // Regla innegociable: Nunca interrumpir una REFLEXIÓN para monetizar.
        if (narrativeType === 'REFLECTION') return false;

        // Regla: El stream es gratuito, la profundidad es paga.
        // En stream solo mostramos monetización pasiva o emocional muy sutil.
        return true;
    }

    getMonetizationOverlay(context) {
        if (!this.canMonetize(context.narrativeType)) return null;

        // Lógica simple de selección de overlay
        if (context.mode === 'LOOP') {
            return { type: MONETIZATION_TYPES.PASSIVE, text: "Acompañá el viaje: habilispro.com/apoyo" };
        }

        return null;
    }
}

export const contentEngine = new ContentEngine();
