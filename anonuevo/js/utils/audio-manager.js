export const AUDIO_STATES = {
    IDLE: 'IDLE',
    COUNTRY_NARRATION: 'COUNTRY_NARRATION',
    GLOBAL_NEWS: 'GLOBAL_NEWS'
};

export class AudioManager {
    constructor() {
        this.currentState = AUDIO_STATES.IDLE;
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
    }

    /**
     * Intenta tomar el control del audio.
     * @param {string} newState - El estado solicitado (COUNTRY_NARRATION o GLOBAL_NEWS)
     * @returns {boolean} - True si se otorgó el control, False si está ocupado por una prioridad mayor.
     */
    requestChannel(newState) {
        // Si ya estamos en noticias, nadie puede interrumpir (salvo otra noticia, teóricamente)
        if (this.currentState === AUDIO_STATES.GLOBAL_NEWS && newState !== AUDIO_STATES.GLOBAL_NEWS) {
            return false;
        }

        // Si estamos narrando país y llega noticia, interrumpimos
        if (this.currentState === AUDIO_STATES.COUNTRY_NARRATION && newState === AUDIO_STATES.GLOBAL_NEWS) {
            this.cancel();
            this.currentState = newState;
            return true;
        }

        // Si estamos IDLE, aceptamos cualquiera
        if (this.currentState === AUDIO_STATES.IDLE) {
            this.currentState = newState;
            return true;
        }

        // Si es el mismo estado, permitimos (ej: cambio de país rápido)
        if (this.currentState === newState) {
            this.cancel();
            return true;
        }

        return false;
    }

    releaseChannel() {
        this.currentState = AUDIO_STATES.IDLE;
    }

    cancel() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    speak(text, priority = 'normal', onEndCallback = null) {
        if (!this.synth) return;

        this.cancel(); // Asegurar silencio previo

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95; // Velocidad natural

        // Selección de voz basada en prioridad/contexto
        const voices = this.synth.getVoices().filter(v => v.lang.includes('es'));

        if (voices.length > 0) {
            if (priority === 'news') {
                // Voz de noticias: Preferiblemente femenina o diferente a la del mapa
                // Intentamos buscar una voz distinta a la primera (que suele ser la del mapa)
                utterance.voice = voices.length > 1 ? voices[1] : voices[0];
                utterance.pitch = 1.05; // Un poco más formal/aguda
            } else {
                // Voz de mapa (default)
                utterance.voice = voices[0];
                utterance.pitch = 1.0;
            }
        }

        utterance.onend = () => {
            if (onEndCallback) onEndCallback();
            // No liberamos automáticamente aquí porque a veces hay pausas intencionales,
            // el controlador debe llamar a releaseChannel() explícitamente cuando termine la "escena".
        };

        this.synth.speak(utterance);
    }
}

export const audioManager = new AudioManager();
