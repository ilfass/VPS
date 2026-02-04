import { uiManager } from './ui-manager.js';

class AudioManager {
    constructor() {
        this.isSpeaking = false;
        this.isPlayingMusic = false;

        // Playlist de música ambiente
        this.playlist = [
            'By Myself - The Grey Room _ Clark Sims.mp3',
            'Claim To Fame - The Grey Room _ Clark Sims.mp3',
            'Down The Rabbit Hole - The Grey Room _ Density & Time.mp3',
            'Drifting at 432 Hz - Unicorn Heads.mp3',
            'Josef Suk, Serenade, Op 6 - A Far Cry.mp3',
            'Resolution Or Reflection - The Grey Room _ Clark Sims.mp3',
            'TRAVELATOR - Density & Time.mp3'
        ];

        this.bgMusic = new Audio();
        this.bgMusic.loop = false; // No loop, para permitir cambio de canción
        this.bgMusic.volume = 0.2;

        // Auto-DJ: Siguiente canción al terminar
        this.bgMusic.addEventListener('ended', () => {
            console.log("[AudioDJ] Track terminado. Pinchando siguiente...");
            this.playRandomTrack();
        });
    }

    async init() {
        console.log("[AudioManager] Iniciando motores de audio...");
        this.playRandomTrack();
    }

    async playRandomTrack() {
        try {
            // Seleccionar track aleatorio
            const track = this.playlist[Math.floor(Math.random() * this.playlist.length)];
            const path = `assets/audio/music/${track}`;

            console.log(`[AudioDJ] 💿 Reproduciendo: ${track}`);

            this.bgMusic.src = path;
            await this.bgMusic.play();
            this.isPlayingMusic = true;
        } catch (e) {
            console.warn("[AudioManager] Autoplay bloqueado. Esperando interacción.");
            document.addEventListener('click', () => {
                this.bgMusic.play().then(() => {
                    this.isPlayingMusic = true;
                    console.log("[AudioManager] Música iniciada post-click.");
                });
            }, { once: true });
        }
    }

    async speak(text, role = 'ILFASS') {
        if (!text) return;

        this.isSpeaking = true;

        // Selección de voz basada en rol
        const voice = role === 'ILFASS' ? 'es-ES-AlvaroNeural' : 'es-ES-ElviraNeural';

        try {
            console.log(`[AudioManager] Generando TTS para ${role}: "${text.substring(0, 20)}..."`);

            const res = await fetch('/control-api/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice })
            });

            if (!res.ok) throw new Error("TTS API Failed");

            const data = await res.json();
            const audioUrl = data.url;

            return new Promise((resolve) => {
                const audio = new Audio(audioUrl);
                audio.volume = 1.0;

                // Ducking: Bajar volumen música
                this.fadeMusic(0.05);

                audio.onplay = () => {
                    uiManager.showSubtitle(text, role);
                };

                audio.onended = () => {
                    this.isSpeaking = false;
                    this.fadeMusic(0.2); // Restaurar música
                    resolve();
                };

                audio.onerror = () => {
                    console.error("[AudioManager] Error playback");
                    this.isSpeaking = false;
                    resolve();
                };

                audio.play();
            });

        } catch (e) {
            console.error("[AudioManager] TTS Falló, usando simulación:", e);
            // Simular lectura silenciosa para no romper el flujo
            uiManager.showSubtitle(text, role);
            await new Promise(r => setTimeout(r, text.length * 70)); // ~70ms por caracter
            uiManager.showSubtitle(null);
            this.isSpeaking = false;
        }
    }

    fadeMusic(targetVol) {
        // Simple fade
        this.bgMusic.volume = targetVol;
    }
}

export const audioManager = new AudioManager();
