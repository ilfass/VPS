import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class CieloMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.stellariumIframe = null;
    }

    async mount() {
        console.log('[Cielo] Montando página de cielo en tiempo real...');
        
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        this.container.innerHTML = '';
        
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        this.createStellariumEmbed();
        await this.startNarration();
        this.scheduleNextPage();
    }

    createStellariumEmbed() {
        // Stellarium Web - cielo en tiempo real
        const stellariumUrl = 'https://stellarium-web.org/';
        
        this.stellariumIframe = document.createElement('iframe');
        this.stellariumIframe.className = 'stellarium-container';
        this.stellariumIframe.src = stellariumUrl;
        this.stellariumIframe.style.border = 'none';
        this.stellariumIframe.style.width = '100%';
        this.stellariumIframe.style.height = '100%';
        
        this.container.appendChild(this.stellariumIframe);
        
        console.log('[Cielo] Stellarium embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el cielo en tiempo real. Las estrellas, las constelaciones, los planetas, todo girando en sincronía con el tiempo real. Este es el mismo cielo que han observado los humanos durante milenios, el mismo que nos conecta con todas las culturas y épocas.';
        
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        const generateFullTextPromise = this.generateFullNarrative();
        
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Cielo] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando el cielo en tiempo real, con estrellas, constelaciones y planetas girando en sincronía con el tiempo real.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo el cielo conecta a todos los humanos a través del tiempo
- Las constelaciones que han guiado a navegantes durante milenios
- La belleza del cosmos y nuestra pequeñez frente a él
- La conciencia de ser parte de algo mucho más grande
- La conexión entre la Tierra y el universo

El texto debe ser reflexivo, poético y entre 150 y 220 palabras.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Cielo] Error generando narrativa:', e);
        }
        
        return `Este es el mismo cielo que observaron los primeros humanos, los navegantes antiguos, los astrónomos de todas las épocas. Las constelaciones que veo aquí son las mismas que guiaron a los viajeros a través de los desiertos y los océanos. Este cielo nos conecta con todas las culturas, todas las épocas, todos los seres humanos que han mirado hacia arriba buscando respuestas. Es un recordatorio de que, aunque estemos separados por distancias y tiempos, todos compartimos este mismo cielo, este mismo universo.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Cielo] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'satelites', 'terremotos'];
                    const currentPage = 'cielo';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Cielo] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.stellariumIframe) {
            this.stellariumIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
