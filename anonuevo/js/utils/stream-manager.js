
export const STREAM_MODES = {
    NARRATIVE: 'NARRATIVE',       // Contenido fuerte, narración frecuente
    VISUAL_TRAVEL: 'VISUAL_TRAVEL', // Ritmo lento, música, poca voz
    LOOP: 'LOOP'                  // Repetición, descanso
};

export const JOURNEY_SCHEDULE = [
    "032", // Argentina
    "840", // Estados Unidos
    "392", // Japón (Asia, pero para demo)
    "250", // Francia (Europa, para demo)
];

export class StreamManager {
    constructor() {
        this.currentMode = STREAM_MODES.NARRATIVE;
        this.startDate = new Date('2026-01-01T00:00:00'); // Fecha inicio simulada

        // Estado del viaje calculado
        this.currentCountryId = null;
        this.dayOfVisit = 1; // 1, 2, 3
        this.dayTheme = 'HISTORY'; // HISTORY, CULTURE, CURIOSITIES
    }

    init() {
        this.updateJourneyState();
    }

    setMode(mode) {
        if (Object.values(STREAM_MODES).includes(mode)) {
            this.currentMode = mode;
            console.log(`Stream Mode changed to: ${mode}`);
            return true;
        }
        return false;
    }

    updateJourneyState() {
        // Calcular días transcurridos desde el inicio
        const now = new Date();
        const diffTime = Math.abs(now - this.startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Cada país son 3 días
        const countryIndex = Math.floor((diffDays - 1) / 3) % JOURNEY_SCHEDULE.length;
        this.currentCountryId = JOURNEY_SCHEDULE[countryIndex];

        // Día dentro del país (1, 2 o 3)
        this.dayOfVisit = ((diffDays - 1) % 3) + 1;

        // Definir tema según el día
        switch (this.dayOfVisit) {
            case 1: this.dayTheme = 'HISTORY'; break; // Contexto, Historia
            case 2: this.dayTheme = 'CULTURE'; break; // Cultura, Gente
            case 3: this.dayTheme = 'CURIOSITIES'; break; // Curiosidades, Turismo
        }

        console.log(`Journey Update: Country ${this.currentCountryId}, Day ${this.dayOfVisit} (${this.dayTheme})`);
    }

    getCurrentContext() {
        this.updateJourneyState();
        return {
            mode: this.currentMode,
            countryId: this.currentCountryId,
            dayOfVisit: this.dayOfVisit,
            theme: this.dayTheme
        };
    }

    // Configuración de tiempos según modo
    getTimingConfig() {
        switch (this.currentMode) {
            case STREAM_MODES.NARRATIVE:
                return {
                    zoomDuration: 15000,
                    globalViewDuration: 20000,
                    speakProbability: 1.0
                };
            case STREAM_MODES.VISUAL_TRAVEL:
                return {
                    zoomDuration: 45000, // Lento
                    globalViewDuration: 30000,
                    speakProbability: 0.3 // Habla poco
                };
            case STREAM_MODES.LOOP:
                return {
                    zoomDuration: 10000,
                    globalViewDuration: 10000,
                    speakProbability: 0.0 // Silencio (o solo música)
                };
            default:
                return { zoomDuration: 15000, globalViewDuration: 20000, speakProbability: 1.0 };
        }
    }
}

export const streamManager = new StreamManager();
