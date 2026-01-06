
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
        
        // Estado del viaje - ahora dinámico, no basado en días calendario
        this.currentCountryId = null;
        this.lastCountryChange = Date.now();
        this.visitedCountries = new Set(); // Para evitar repeticiones inmediatas
        
        // Temas disponibles (ya no forzamos días 1,2,3)
        this.availableThemes = ['HISTORY', 'CULTURE', 'CURIOSITIES'];
        this.currentTheme = 'HISTORY';
    }

    init() {
        // Inicializar con un país aleatorio si no hay uno asignado
        if (!this.currentCountryId) {
            this.pickRandomCountry();
        }
    }

    setMode(mode) {
        if (Object.values(STREAM_MODES).includes(mode)) {
            this.currentMode = mode;
            console.log(`Stream Mode changed to: ${mode}`);
            return true;
        }
        return false;
    }

    // Cambiar a un país específico (usado por el director o auto-rotación)
    setCountry(countryId, theme = null) {
        this.currentCountryId = countryId;
        this.lastCountryChange = Date.now();
        this.visitedCountries.add(countryId);
        
        // Si se especifica un tema, usarlo; si no, elegir aleatorio
        if (theme && this.availableThemes.includes(theme)) {
            this.currentTheme = theme;
        } else {
            this.currentTheme = this.availableThemes[Math.floor(Math.random() * this.availableThemes.length)];
        }
        
        console.log(`Country changed to: ${countryId}, Theme: ${this.currentTheme}`);
    }

    // Elegir un país aleatorio (evitando el actual y recientes)
    pickRandomCountry() {
        const available = JOURNEY_SCHEDULE.filter(id => id !== this.currentCountryId);
        if (available.length === 0) {
            // Si solo hay un país, resetear visited
            this.visitedCountries.clear();
            this.currentCountryId = JOURNEY_SCHEDULE[0];
        } else {
            const randomIndex = Math.floor(Math.random() * available.length);
            this.setCountry(available[randomIndex]);
        }
    }

    // Rotar a siguiente país (usado por auto-pilot)
    rotateToNextCountry() {
        const currentIndex = JOURNEY_SCHEDULE.indexOf(this.currentCountryId);
        if (currentIndex === -1) {
            // Si no está en el schedule, elegir aleatorio
            this.pickRandomCountry();
        } else {
            // Ir al siguiente en el schedule, o al primero si es el último
            const nextIndex = (currentIndex + 1) % JOURNEY_SCHEDULE.length;
            this.setCountry(JOURNEY_SCHEDULE[nextIndex]);
        }
    }

    getCurrentContext() {
        // Si no hay país asignado, elegir uno
        if (!this.currentCountryId) {
            this.pickRandomCountry();
        }
        
        return {
            mode: this.currentMode,
            countryId: this.currentCountryId,
            dayOfVisit: 1, // Mantener compatibilidad pero ya no se usa para lógica de 3 días
            theme: this.currentTheme
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
