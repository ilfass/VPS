
export const TRANSITION_TYPES = {
    OPENING: 'OPENING',             // Negro -> Portada
    EXPLORATION: 'EXPLORATION',     // Portada -> Mapa Vivo
    DEEP_DIVE: 'DEEP_DIVE',         // Mapa -> Página País
    PULSE: 'PULSE',                 // -> Diario de Viaje
    SCALE: 'SCALE',                 // País -> Índice Global
    REFLECTION: 'REFLECTION'        // -> Modo Reflexión
};

export const SCENES = {
    COVER: 'COVER',
    LIVE_MAP: 'LIVE_MAP',
    COUNTRY_PAGE: 'COUNTRY_PAGE',
    TRAVEL_DIARY: 'TRAVEL_DIARY',
    GLOBAL_INDEX: 'GLOBAL_INDEX'
};

export class EditorialChoreographer {
    constructor() {
        this.currentScene = SCENES.COVER;
        this.currentMood = 'NEUTRAL';
    }

    /**
     * Determina la transición adecuada basada en el cambio de estado
     * @param {string} fromScene 
     * @param {string} toScene 
     * @param {string} context (e.g., 'COUNTRY_END', 'STREAM_START')
     */
    getTransition(fromScene, toScene, context) {
        if (context === 'STREAM_START') return TRANSITION_TYPES.OPENING;
        if (fromScene === SCENES.COVER && toScene === SCENES.LIVE_MAP) return TRANSITION_TYPES.EXPLORATION;
        if (toScene === SCENES.COUNTRY_PAGE) return TRANSITION_TYPES.DEEP_DIVE;
        if (toScene === SCENES.TRAVEL_DIARY) return TRANSITION_TYPES.PULSE;
        if (context === 'COUNTRY_END' || toScene === SCENES.GLOBAL_INDEX) return TRANSITION_TYPES.SCALE;
        if (context === 'REFLECTION_MOMENT') return TRANSITION_TYPES.REFLECTION;

        return 'DEFAULT_FADE';
    }

    /**
     * Devuelve la configuración visual/audio para una transición
     */
    getTransitionConfig(transitionType) {
        switch (transitionType) {
            case TRANSITION_TYPES.OPENING:
                return { duration: 5000, audio: 'FADE_IN', visual: 'REVEAL' };
            case TRANSITION_TYPES.EXPLORATION:
                return { duration: 8000, audio: 'MAINTAIN', visual: 'ZOOM_IN_SLOW' };
            case TRANSITION_TYPES.DEEP_DIVE:
                return { duration: 3000, audio: 'LOWER_VOLUME', visual: 'FOCUS_CONTENT' };
            case TRANSITION_TYPES.REFLECTION:
                return { duration: 10000, audio: 'REFLECTIVE_THEME', visual: 'DESATURATE_SLOW' };
            default:
                return { duration: 2000, audio: 'CROSSFADE', visual: 'CUT' };
        }
    }
}

export const choreographer = new EditorialChoreographer();
