
export const CONTENT_TYPES = {
    VOICE: 'VOICE',
    VISUAL: 'VISUAL',   // Música + Imagen/Video, sin voz
    SILENCE: 'SILENCE'  // Pausa contemplativa
};

export class PacingEngine {
    constructor() {
        this.history = [];
        this.windowSize = 10 * 60 * 1000; // Ventana de 10 minutos para cálculo

        // Metas por defecto (se pueden ajustar por modo)
        this.targets = {
            [CONTENT_TYPES.VOICE]: 0.35,   // 35% (Rango 30-40%)
            [CONTENT_TYPES.VISUAL]: 0.45,  // 45% (Rango 40-50%)
            [CONTENT_TYPES.SILENCE]: 0.20  // 20% (Rango 10-20%)
        };

        this.currentEvent = null;
    }

    /**
     * Registra el inicio de un evento
     * @param {string} type - Tipo de contenido (VOICE, VISUAL, SILENCE)
     */
    startEvent(type) {
        if (this.currentEvent) {
            this.endCurrentEvent();
        }
        this.currentEvent = {
            type,
            startTime: Date.now()
        };
        // Limpieza periódica del historial
        this.pruneHistory();
    }

    /**
     * Finaliza el evento actual y lo guarda en el historial
     */
    endCurrentEvent() {
        if (!this.currentEvent) return;

        const now = Date.now();
        const duration = now - this.currentEvent.startTime;

        this.history.push({
            type: this.currentEvent.type,
            startTime: this.currentEvent.startTime,
            endTime: now,
            duration: duration
        });

        this.currentEvent = null;
    }

    /**
     * Calcula la distribución actual de tiempo en la ventana definida
     */
    getCurrentDistribution() {
        const now = Date.now();
        const windowStart = now - this.windowSize;

        let totals = {
            [CONTENT_TYPES.VOICE]: 0,
            [CONTENT_TYPES.VISUAL]: 0,
            [CONTENT_TYPES.SILENCE]: 0
        };
        let totalTime = 0;

        // Sumar eventos históricos dentro de la ventana
        this.history.forEach(evt => {
            if (evt.endTime < windowStart) return; // Evento muy viejo

            // Si el evento empezó antes de la ventana, recortamos
            const effectiveStart = Math.max(evt.startTime, windowStart);
            const duration = evt.endTime - effectiveStart;

            if (totals[evt.type] !== undefined) {
                totals[evt.type] += duration;
                totalTime += duration;
            }
        });

        // Sumar evento en curso si existe
        if (this.currentEvent) {
            const effectiveStart = Math.max(this.currentEvent.startTime, windowStart);
            const currentDuration = now - effectiveStart;
            if (totals[this.currentEvent.type] !== undefined) {
                totals[this.currentEvent.type] += currentDuration;
                totalTime += currentDuration;
            }
        }

        // Evitar división por cero
        if (totalTime === 0) return { ...this.targets }; // Retornar targets ideales si no hay data

        return {
            [CONTENT_TYPES.VOICE]: totals[CONTENT_TYPES.VOICE] / totalTime,
            [CONTENT_TYPES.VISUAL]: totals[CONTENT_TYPES.VISUAL] / totalTime,
            [CONTENT_TYPES.SILENCE]: totals[CONTENT_TYPES.SILENCE] / totalTime
        };
    }

    /**
     * Decide si deberíamos hablar ahora basado en el déficit/superávit
     * @param {Object} mode - Objeto de configuración del modo actual (opcional)
     * @returns {boolean}
     */
    shouldSpeak(modeConfig) {
        // Actualizar targets si el modo cambia (opcional, por ahora usamos defaults)
        // Ejemplo: Si el modo es "VISUAL_TRAVEL", quizás bajamos el target de VOICE

        const current = this.getCurrentDistribution();

        const voiceDeficit = this.targets[CONTENT_TYPES.VOICE] - current[CONTENT_TYPES.VOICE];

        // Lógica de decisión probabilística ponderada
        // Si hay déficit positivo (tenemos menos voz de la deseada), la probabilidad sube
        // Si hay superávit (hablamos demasiado), la probabilidad baja drasticamente

        let baseProbability = 0.5; // Neutral

        if (voiceDeficit > 0.1) {
            // Déficit crítico (>10% por debajo): Casi seguro hablar
            baseProbability = 0.95;
        } else if (voiceDeficit > 0) {
            // Déficit leve: Alta probabilidad
            baseProbability = 0.75;
        } else if (voiceDeficit < -0.1) {
            // Exceso crítico (>10% por encima): Silencio casi asegurado
            baseProbability = 0.05;
        } else {
            // Estamos en rango: Probabilidad moderada
            baseProbability = 0.4;
        }

        // Factor de aleatoriedad para no ser puramente determinista
        // pero muy sesgado por la necesidad del sistema
        const decision = Math.random() < baseProbability;

        console.log(`[PacingEngine] Voice: ${(current.VOICE * 100).toFixed(1)}% (Target: 35%). Decision: ${decision ? 'SPEAK' : 'SKIP'}`);

        return decision;
    }

    /**
     * Limpia eventos más viejos que la ventana
     */
    pruneHistory() {
        const threshold = Date.now() - this.windowSize;
        // Mantenemos solo eventos que terminaron después del umbral
        // o que empezaron antes pero terminaron después
        this.history = this.history.filter(evt => evt.endTime > threshold);
    }
}

export const pacingEngine = new PacingEngine();
