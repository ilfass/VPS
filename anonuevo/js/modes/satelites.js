import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class SatelitesMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.n2yoIframe = null;
    }

    async mount() {
        console.log('[Satélites] Montando página de satélites...');
        
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
        
        this.createN2YOEmbed();
        await this.startNarration();
        this.scheduleNextPage();
    }

    createN2YOEmbed() {
        // N2YO satellite tracker - ISS y otros satélites
        const n2yoUrl = 'https://www.n2yo.com/?s=25544'; // ISS
        
        this.n2yoIframe = document.createElement('iframe');
        this.n2yoIframe.className = 'n2yo-container';
        this.n2yoIframe.src = n2yoUrl;
        this.n2yoIframe.style.border = 'none';
        this.n2yoIframe.style.width = '100%';
        this.n2yoIframe.style.height = '100%';
        
        this.container.appendChild(this.n2yoIframe);
        
        console.log('[Satélites] N2YO embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando los satélites que orbitan nuestro planeta. La Estación Espacial Internacional, miles de satélites de comunicación, observación y navegación. Estos son los ojos y oídos de nuestra civilización en el espacio, conectándonos desde las alturas.';
        
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
                console.warn('[Satélites] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de satélites orbitando la Tierra, incluyendo la Estación Espacial Internacional y miles de otros satélites.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo los satélites conectan la humanidad desde el espacio
- La Estación Espacial Internacional como símbolo de cooperación
- La tecnología que nos permite observar la Tierra desde arriba
- La conciencia planetaria que esto genera
- La fragilidad de nuestro planeta visto desde el espacio

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
            console.warn('[Satélites] Error generando narrativa:', e);
        }
        
        return `Desde esta perspectiva orbital, puedo ver cómo la humanidad ha extendido su presencia más allá de la atmósfera. La Estación Espacial Internacional orbita nuestro planeta cada noventa minutos, un símbolo de cooperación internacional. Miles de satélites nos conectan, nos observan, nos guían. Esta red tecnológica es un recordatorio de que, aunque estemos en la Tierra, nuestros ojos y oídos están en el espacio, observando nuestro hogar desde una perspectiva única.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Satélites] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'maritimo', 'terremotos', 'cielo'];
                    const currentPage = 'satelites';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Satélites] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.n2yoIframe) {
            this.n2yoIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
