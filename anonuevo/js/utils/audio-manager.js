
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

        // Capas de Audio (Music Layers)
        this.musicLayer = null; // Elemento de Audio HTML5
        this.isMusicPlaying = false;

        // Lista de tracks de música ambiente (rotación automática)
        this.tracks = [
            'assets/audio/ambient_base.mp3',
            'assets/audio/ambient_base.mp3', // Por ahora el mismo, pero se pueden agregar más
        ];
        this.currentTrackIndex = 0;
    }

    init() {
        // Crear elemento de audio invisible para el fondo
        this.musicLayer = new Audio();
        this.musicLayer.loop = true;
        this.musicLayer.volume = 0.0; // Inicia en silencio y hace fade in

        // Cargar el primer track
        this.loadTrack(this.currentTrackIndex);

        // Cuando termine un track (si no está en loop), cargar el siguiente
        this.musicLayer.addEventListener('ended', () => {
            this.nextTrack();
        });

        // Autoplay policy puede bloquear esto hasta interacción del usuario
        // El botón "Iniciar Sistema" del index.html debería desbloquearlo
    }
    
    /**
     * Carga un track específico
     */
    loadTrack(index) {
        if (index >= 0 && index < this.tracks.length) {
            this.currentTrackIndex = index;
            if (this.musicLayer) {
                const wasPlaying = !this.musicLayer.paused;
                const currentVolume = this.musicLayer.volume;
                this.musicLayer.src = this.tracks[index];
                if (wasPlaying) {
                    this.musicLayer.play().catch(e => {
                        console.warn("[AudioManager] Error playing track:", e);
                    });
                }
            }
        }
    }
    
    /**
     * Cambia al siguiente track
     */
    nextTrack() {
        const nextIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadTrack(nextIndex);
    }

    /**
     * Inicia la música de fondo con Fade In
     */
    startAmbience() {
        if (!this.musicLayer) this.init();

        this.musicLayer.play().then(() => {
            this.isMusicPlaying = true;
            this.fadeAudio(this.musicLayer, 0.0, 0.3, 2000); // Subir a 30% volumen
        }).catch(e => {
            console.warn("[AudioManager] Autoplay blocked or track missing:", e);
        });
    }

    /**
     * Intenta tomar el control del audio (Prioridad de Voz).
     */
    requestChannel(newState) {
        if (this.currentState === AUDIO_STATES.GLOBAL_NEWS && newState !== AUDIO_STATES.GLOBAL_NEWS) return false;
        if (this.currentState === AUDIO_STATES.COUNTRY_NARRATION && newState === AUDIO_STATES.GLOBAL_NEWS) {
            this.cancel();
            this.currentState = newState;
            return true;
        }
        if (this.currentState === AUDIO_STATES.IDLE || this.currentState === newState) {
            if (this.currentState === newState) this.cancel();
            this.currentState = newState;
            return true;
        }
        return false;
    }

    releaseChannel() {
        this.currentState = AUDIO_STATES.IDLE;
        // Restaurar volumen de música al terminar voz
        if (this.isMusicPlaying) {
            this.fadeAudio(this.musicLayer, this.musicLayer.volume, 0.3, 1000); // Volver a nivel ambiente
        }
    }

    cancel() {
        if (this.synth) {
            if (this.currentUtterance) this.currentUtterance.wasCancelled = true;
            this.synth.cancel();
            this.currentUtterance = null;
        }
    }

    speak(text, priority = 'normal', onEndCallback = null) {
        if (!this.synth) return;

        this.cancel();

        // Limpiar texto: eliminar caracteres de escape, texto de debugging, etc.
        text = this.cleanText(text);

        // ** DUCKING **: Bajar música antes de hablar
        if (this.isMusicPlaying) {
            this.fadeAudio(this.musicLayer, this.musicLayer.volume, 0.05, 500); // Bajar a 5% rápido
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.wasCancelled = false;

        const voices = this.synth.getVoices().filter(v => v.lang.includes('es'));
        if (voices.length > 0) {
            if (priority === 'news') {
                utterance.voice = voices.length > 1 ? voices[1] : voices[0];
                utterance.pitch = 1.05;
            } else {
                utterance.voice = voices[0];
                utterance.pitch = 1.0;
            }
        }

        utterance.onend = () => {
            if (!utterance.wasCancelled && onEndCallback) onEndCallback();
            // El releaseChannel se encargará de subir la música de nuevo, pero a veces
            // el callback es quien maneja esa lógica superior.
            // Si nadie llama a releaseChannel pronto, podríamos forzar restore aquí,
            // pero mejor respetar el control externo.
        };

        this.currentUtterance = utterance;
        
        // Notificar que el avatar está hablando
        this.notifySpeaking(true);
        
        utterance.onend = () => {
            this.notifySpeaking(false);
            if (!utterance.wasCancelled && onEndCallback) onEndCallback();
        };
        
        utterance.onerror = () => {
            this.notifySpeaking(false);
        };
        
        this.synth.speak(utterance);
    }

    /**
     * Limpia el texto eliminando caracteres de escape, debugging, etc.
     */
    cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Eliminar caracteres de escape
        text = text.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\'/g, "'");
        
        // Eliminar texto de debugging (conteo de palabras, instrucciones, etc.)
        text = text.replace(/Let's count words:.*?words\./gi, '');
        text = text.replace(/Words:.*?words\./gi, '');
        text = text.replace(/\d+ words?\./gi, '');
        text = text.replace(/Good\. Meets \d+-\d+\./gi, '');
        text = text.replace(/We included.*?Should be fine\./gi, '');
        text = text.replace(/Meets \d+-\d+\./gi, '');
        text = text.replace(/Good\./gi, '');
        text = text.replace(/Use purely Spanish\./gi, '');
        text = text.replace(/Should be fine\./gi, '');
        
        // Eliminar patrones de debugging comunes
        text = text.replace(/\[.*?\]/g, ''); // [Debug info]
        text = text.replace(/\(.*?\)/g, ''); // (Debug info)
        text = text.replace(/\{.*?\}/g, ''); // {Debug info}
        
        // Limpiar espacios múltiples
        text = text.replace(/\s+/g, ' ').trim();
        
        // Eliminar texto que parece ser instrucciones de sistema
        const lines = text.split('.');
        text = lines.filter(line => {
            const lower = line.toLowerCase().trim();
            return !lower.includes('tool_calls') && 
                   !lower.includes('json') &&
                   !lower.startsWith('illones') &&
                   !lower.includes('count words') &&
                   !lower.includes('meets') &&
                   lower.length > 5; // Filtrar líneas muy cortas que suelen ser debugging
        }).join('. ').trim();
        
        return text;
    }

    /**
     * Notifica cuando el avatar está hablando (para animaciones)
     */
    notifySpeaking(isSpeaking) {
        const avatarElement = document.querySelector('.avatar-image');
        if (avatarElement) {
            if (isSpeaking) {
                avatarElement.classList.add('speaking');
            } else {
                avatarElement.classList.remove('speaking');
            }
        }
    }

    /**
     * Utilidad para hacer Fade de volumen
     */
    fadeAudio(audioEl, from, to, duration) {
        if (!audioEl) return;
        const steps = 20;
        const stepTime = duration / steps;
        const volStep = (to - from) / steps;
        let currentVol = from;
        let stepCount = 0;

        const interval = setInterval(() => {
            currentVol += volStep;
            // Clamping
            if (currentVol < 0) currentVol = 0;
            if (currentVol > 1) currentVol = 1;

            try {
                audioEl.volume = currentVol;
            } catch (e) { clearInterval(interval); }

            stepCount++;
            if (stepCount >= steps) {
                audioEl.volume = to;
                clearInterval(interval);
            }
        }, stepTime);
    }
}

export const audioManager = new AudioManager();
