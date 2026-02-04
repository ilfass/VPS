
export const AVATAR_STATES = {
    HIDDEN: 'HIDDEN',               // Ausente (Mapa puro)
    HOST: 'HOST',                   // Plano General (Intro/Contexto)
    EXPLAINER: 'EXPLAINER',         // Plano Medio (Datos/Cultura)
    REFLECTIVE: 'REFLECTIVE'        // Primer Plano (Reflexión/Cierre)
};

export class CharacterDirector {
    constructor() {
        this.currentState = AVATAR_STATES.HIDDEN;
        this.mood = 'NEUTRAL'; // NEUTRAL, ENERGETIC, REFLECTIVE, TIRED
    }

    /**
     * Determina el estado del avatar basado en el contexto narrativo
     * @param {string} scene - Escena actual (del Choreographer)
     * @param {string} streamMode - Modo de stream (NARRATIVE, VISUAL, LOOP)
     * @param {string} narrativeType - Tipo de contenido (FACT, RECOMMENDATION, REFLECTION)
     */
    determineState(scene, streamMode, narrativeType) {
        // Regla: Ausencia deliberada en modos pasivos
        if (streamMode === 'LOOP' || streamMode === 'VISUAL_TRAVEL') {
            return AVATAR_STATES.HIDDEN;
        }

        // Regla: Primer Plano para Reflexiones
        if (narrativeType === 'REFLECTION') {
            return AVATAR_STATES.REFLECTIVE;
        }

        // Regla: Plano Medio para explicaciones culturales/recomendaciones
        if (narrativeType === 'RECOMMENDATION' || narrativeType === 'CULTURE') {
            return AVATAR_STATES.EXPLAINER;
        }

        // Regla: Host en Portada o Intro de País
        if (scene === 'COVER' || (scene === 'COUNTRY_PAGE' && narrativeType === 'INTRO')) {
            return AVATAR_STATES.HOST;
        }

        // Default: Oculto para dar protagonismo al mapa
        return AVATAR_STATES.HIDDEN;
    }

    getVoiceConfig(state) {
        switch (state) {
            case AVATAR_STATES.REFLECTIVE:
                return { rate: 0.85, pitch: 0.9, volume: 1.0 }; // Lento, grave, íntimo
            case AVATAR_STATES.EXPLAINER:
                return { rate: 1.0, pitch: 1.0, volume: 1.0 }; // Claro, normal
            case AVATAR_STATES.HOST:
                return { rate: 1.1, pitch: 1.05, volume: 1.1 }; // Enérgico, proyectado
            default:
                return { rate: 1.0, pitch: 1.0, volume: 1.0 };
        }
    }
}

export const characterDirector = new CharacterDirector();
