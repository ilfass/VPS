
export const AUDIO_STATES = {
    IDLE: 'IDLE',
    COUNTRY_NARRATION: 'COUNTRY_NARRATION',
    GLOBAL_NEWS: 'GLOBAL_NEWS'
};

export class AudioManager {
    constructor() {
        this.currentState = AUDIO_STATES.IDLE;
        this.synth = window.speechSynthesis; // Fallback
        this.currentUtterance = null;
        this.currentAudio = null; // Para Edge TTS
        this.useEdgeTTS = true; // Usar Edge TTS por defecto

        // Capas de Audio (Music Layers)
        this.musicLayer = null; // Elemento de Audio HTML5
        this.isMusicPlaying = false;

        // Lista de tracks de música ambiente (rotación automática)
        // Usar rutas absolutas desde la raíz del servidor
        this.tracks = [
            '/assets/audio/ambient_base.mp3',
            '/assets/audio/ambient_base.mp3', // Por ahora el mismo, pero se pueden agregar más
        ];
        this.currentTrackIndex = 0;
    }

    init() {
        // Crear elemento de audio invisible para el fondo
        this.musicLayer = new Audio();
        this.musicLayer.loop = false; // NO loop para permitir rotación de tracks
        this.musicLayer.volume = 0.0; // Inicia en silencio y hace fade in

        // Cargar el primer track
        this.loadTrack(this.currentTrackIndex);

        // Cuando termine un track, cargar el siguiente
        this.musicLayer.addEventListener('ended', () => {
            console.log("[AudioManager] Track terminado, cambiando al siguiente...");
            this.nextTrack();
            // Reproducir el siguiente track automáticamente
            if (this.isMusicPlaying && this.musicLayer) {
                this.musicLayer.play().then(() => {
                    this.fadeAudio(this.musicLayer, 0.0, 0.3, 2000);
                }).catch(e => {
                    console.warn("[AudioManager] Error reproduciendo siguiente track:", e);
                });
            }
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
                console.log(`[AudioManager] 🎵 Cargando track ${index + 1}/${this.tracks.length}: ${this.tracks[index]}`);
                this.musicLayer.src = this.tracks[index];
                // Asegurar que no esté en loop para permitir rotación
                this.musicLayer.loop = false;
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
     * Pausa la música de fondo
     */
    pauseMusic() {
        if (this.musicLayer && !this.musicLayer.paused) {
            this.musicLayer.pause();
            this.isMusicPlaying = false;
            console.log("[AudioManager] ⏸️ Música pausada");
        }
    }
    
    /**
     * Reanuda la música de fondo
     */
    resumeMusic() {
        if (this.musicLayer && this.musicLayer.paused) {
            this.musicLayer.play().then(() => {
                this.isMusicPlaying = true;
                console.log("[AudioManager] ▶️ Música reanudada");
            }).catch(e => {
                console.warn("[AudioManager] ⚠️ Error reanudando música:", e);
            });
        }
    }
    
    /**
     * Alterna entre pausar y reanudar
     */
    toggleMusic() {
        if (this.musicLayer) {
            if (this.musicLayer.paused) {
                this.resumeMusic();
            } else {
                this.pauseMusic();
            }
        }
    }
    
    /**
     * Obtiene información del track actual
     */
    getCurrentTrackInfo() {
        return {
            index: this.currentTrackIndex,
            total: this.tracks.length,
            current: this.tracks[this.currentTrackIndex],
            isPlaying: this.isMusicPlaying && this.musicLayer && !this.musicLayer.paused
        };
    }

    /**
     * Inicia la música de fondo con Fade In
     * Requiere interacción del usuario para funcionar (política de autoplay)
     */
    startAmbience() {
        if (!this.musicLayer) this.init();

        console.log("[AudioManager] Intentando reproducir música:", this.musicLayer.src);
        
        // Intentar reproducir
        const playPromise = this.musicLayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isMusicPlaying = true;
                console.log("[AudioManager] ✅ Música iniciada correctamente");
                this.fadeAudio(this.musicLayer, 0.0, 0.3, 2000); // Subir a 30% volumen
            }).catch(e => {
                console.warn("[AudioManager] ⚠️ Autoplay blocked - requiere interacción del usuario:", e);
                console.warn("[AudioManager] Ruta del audio:", this.musicLayer.src);
                // El audio se iniciará automáticamente cuando el usuario interactúe con la página
                // Por ahora, solo loguear el error sin intentar de nuevo
            });
        }
    }
    
    /**
     * Intenta iniciar el audio después de interacción del usuario
     * Debe ser llamado después de un click o interacción
     */
    tryStartAfterInteraction() {
        if (!this.musicLayer) this.init();
        
        if (!this.isMusicPlaying) {
            this.musicLayer.play().then(() => {
                this.isMusicPlaying = true;
                console.log("[AudioManager] ✅ Música iniciada después de interacción");
                this.fadeAudio(this.musicLayer, 0.0, 0.3, 2000);
            }).catch(e => {
                console.error("[AudioManager] ❌ Error iniciando música después de interacción:", e);
            });
        }
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
        // Cancelar Edge TTS si está reproduciendo
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        // Cancelar Web Speech API si está hablando
        if (this.synth) {
            if (this.currentUtterance) this.currentUtterance.wasCancelled = true;
            this.synth.cancel();
            this.currentUtterance = null;
        }
        
        this.notifySpeaking(false);
    }

    async speak(text, priority = 'normal', onEndCallback = null, updateSubtitlesCallback = null) {
        this.cancel();

        // Limpiar texto: eliminar caracteres de escape, texto de debugging, etc.
        text = this.cleanText(text);
        
        if (!text || text.trim().length === 0) {
            console.warn("[AudioManager] ⚠️ Texto vacío, no se puede hablar");
            return;
        }

        console.log("[AudioManager] 🔊 Hablando:", text.substring(0, 50) + "...");
        
        // Guardar callback para actualizar subtítulos
        this.updateSubtitlesCallback = updateSubtitlesCallback;

        // ** DUCKING **: Bajar música antes de hablar
        if (this.isMusicPlaying) {
            this.fadeAudio(this.musicLayer, this.musicLayer.volume, 0.05, 500); // Bajar a 5% rápido
        }

        // Intentar usar Edge TTS primero (mejor calidad)
        if (this.useEdgeTTS) {
            try {
                const response = await fetch('/control-api/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        text: text,
                        voice: priority === 'news' ? 'es-ES-ElviraNeural' : 'es-ES-AlvaroNeural'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success && result.url) {
                        console.log("[AudioManager] ✅ Audio generado con Edge TTS:", result.url);
                        
                        // Crear elemento de audio para reproducir
                        const audio = new Audio(result.url);
                        audio.volume = 1.0;
                        this.currentAudio = audio;
                        
                        // Notificar que el avatar está hablando
                        this.notifySpeaking(true);
                        
                        // Sincronizar subtítulos con Edge TTS
                        // Dividir texto en palabras para actualización progresiva
                        const words = text.split(' ').filter(w => w.trim().length > 0);
                        let wordsShown = 0;
                        const maxWordsPerSubtitle = 16;
                        const msPerWord = 630; // Tiempo estimado por palabra
                        let subtitleInterval = null;
                        
                        audio.onplay = () => {
                            console.log("[AudioManager] ✅ Voz iniciada (Edge TTS)");
                            wordsShown = 0;
                            
                            // Mostrar primeras palabras inmediatamente
                            const initialWords = words.slice(0, maxWordsPerSubtitle).join(' ');
                            this.updateSubtitlesCallback?.(initialWords);
                            wordsShown = maxWordsPerSubtitle;
                            
                            // Actualizar subtítulos palabra por palabra
                            subtitleInterval = setInterval(() => {
                                if (wordsShown < words.length && !audio.paused) {
                                    const startIndex = Math.max(0, wordsShown - maxWordsPerSubtitle);
                                    const endIndex = Math.min(words.length, wordsShown + 1);
                                    const wordsToShow = words.slice(startIndex, endIndex).join(' ');
                                    
                                    if (wordsToShow.trim().length > 0) {
                                        this.updateSubtitlesCallback?.(wordsToShow);
                                    }
                                    wordsShown++;
                                } else if (wordsShown >= words.length) {
                                    if (subtitleInterval) {
                                        clearInterval(subtitleInterval);
                                        subtitleInterval = null;
                                    }
                                }
                            }, msPerWord);
                        };
                        
                        audio.onended = () => {
                            console.log("[AudioManager] ✅ Voz terminada (Edge TTS)");
                            if (subtitleInterval) {
                                clearInterval(subtitleInterval);
                                subtitleInterval = null;
                            }
                            this.notifySpeaking(false);
                            this.currentAudio = null;
                            this.updateSubtitlesCallback = null; // Limpiar callback
                            if (onEndCallback) onEndCallback();
                        };
                        
                        audio.onerror = (e) => {
                            console.error("[AudioManager] ❌ Error reproduciendo audio Edge TTS:", e);
                            if (subtitleInterval) {
                                clearInterval(subtitleInterval);
                                subtitleInterval = null;
                            }
                            this.notifySpeaking(false);
                            this.currentAudio = null;
                            this.updateSubtitlesCallback = null;
                            // Fallback a Web Speech API
                            this.speakWithFallback(text, priority, onEndCallback);
                        };
                        
                        // Reproducir audio
                        audio.play().catch(e => {
                            console.error("[AudioManager] ❌ Error iniciando audio:", e);
                            if (subtitleInterval) {
                                clearInterval(subtitleInterval);
                                subtitleInterval = null;
                            }
                            // Fallback a Web Speech API
                            this.speakWithFallback(text, priority, onEndCallback);
                        });
                        
                        return; // Éxito con Edge TTS
                    } else if (result.fallback) {
                        console.warn("[AudioManager] ⚠️ Edge TTS falló, usando fallback");
                        // Continuar con fallback
                    }
                } else {
                    console.warn("[AudioManager] ⚠️ Error en respuesta de Edge TTS, usando fallback");
                    // Continuar con fallback
                }
            } catch (e) {
                console.warn("[AudioManager] ⚠️ Error llamando a Edge TTS:", e);
                // Continuar con fallback
            }
        }

        // Fallback a Web Speech API si Edge TTS no está disponible o falló
        this.speakWithFallback(text, priority, onEndCallback);
    }

    speakWithFallback(text, priority = 'normal', onEndCallback = null) {
        if (!this.synth) {
            console.warn("[AudioManager] ⚠️ SpeechSynthesis no disponible");
            return;
        }

        // IMPORTANTE: Resumir y "calentar" SpeechSynthesis antes de hablar
        try {
            this.synth.cancel();
            this.synth.resume();
            const warmUp = new SpeechSynthesisUtterance('');
            warmUp.volume = 0;
            this.synth.speak(warmUp);
            this.synth.cancel();
        } catch (e) {
            console.warn("[AudioManager] ⚠️ No se pudo preparar SpeechSynthesis:", e);
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.volume = 1.0;
        utterance.wasCancelled = false;

        this.currentUtterance = utterance;
        this.notifySpeaking(true);
        
        utterance.onstart = () => {
            console.log("[AudioManager] ✅ Voz iniciada (Fallback Web Speech)");
        };
        
        utterance.onend = () => {
            console.log("[AudioManager] ✅ Voz terminada (Fallback Web Speech)");
            this.notifySpeaking(false);
            if (!utterance.wasCancelled && onEndCallback) onEndCallback();
        };
        
        utterance.onerror = (e) => {
            console.error("[AudioManager] ❌ Error en voz:", e.error, e);
            this.notifySpeaking(false);
        };
        
        // Seleccionar voz
        const getVoices = () => {
            const voices = this.synth.getVoices();
            if (voices.length > 0) {
                this.selectVoice(utterance, voices, priority);
                this.synth.speak(utterance);
            } else {
                setTimeout(() => {
                    const voicesRetry = this.synth.getVoices();
                    if (voicesRetry.length > 0) {
                        this.selectVoice(utterance, voicesRetry, priority);
                        this.synth.speak(utterance);
                    } else {
                        this.synth.speak(utterance);
                    }
                }, 100);
            }
        };

        getVoices();
        if (this.synth.onvoiceschanged !== null) {
            this.synth.onvoiceschanged = getVoices;
        }
    }
    
    selectVoice(utterance, voices, priority) {
        const spanishVoices = voices.filter(v => v.lang.includes('es'));
        if (spanishVoices.length > 0) {
            if (priority === 'news') {
                utterance.voice = spanishVoices.length > 1 ? spanishVoices[1] : spanishVoices[0];
                utterance.pitch = 1.05;
            } else {
                utterance.voice = spanishVoices[0];
                utterance.pitch = 1.0;
            }
            console.log("[AudioManager] ✅ Voz seleccionada:", utterance.voice.name);
        } else {
            console.warn("[AudioManager] ⚠️ No se encontraron voces en español, usando voz por defecto");
        }

        this.currentUtterance = utterance;
        
        // Notificar que el avatar está hablando
        this.notifySpeaking(true);
        
        utterance.onstart = () => {
            console.log("[AudioManager] ✅ Voz iniciada correctamente");
        };
        
        utterance.onend = () => {
            console.log("[AudioManager] ✅ Voz terminada");
            this.notifySpeaking(false);
            if (!utterance.wasCancelled && onEndCallback) onEndCallback();
        };
        
        utterance.onerror = (e) => {
            console.error("[AudioManager] ❌ Error en voz (selectVoice):", e.error, e);
            this.notifySpeaking(false);
        };
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
