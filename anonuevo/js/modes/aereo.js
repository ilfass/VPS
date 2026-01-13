import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class AereoMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.flightradarIframe = null;
    }

    async mount() {
        console.log('[Aéreo] Montando página de tráfico aéreo...');
        
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
        
        this.createFlightradarEmbed();
        await this.startNarration();
        this.scheduleNextPage();
    }

    createFlightradarEmbed() {
        // Flightradar24 embed - vista básica pública
        const flightradarUrl = 'https://www.flightradar24.com/simple_index=0';
        
        this.flightradarIframe = document.createElement('iframe');
        this.flightradarIframe.className = 'flightradar-container';
        this.flightradarIframe.src = flightradarUrl;
        this.flightradarIframe.style.border = 'none';
        this.flightradarIframe.style.width = '100%';
        this.flightradarIframe.style.height = '100%';
        
        this.container.appendChild(this.flightradarIframe);
        
        console.log('[Aéreo] Flightradar24 embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el tráfico aéreo global en tiempo real. Miles de aviones volando simultáneamente alrededor del mundo, conectando continentes, transportando personas, mercancías y esperanzas. Este es el pulso de la humanidad, la red invisible que nos une.';
        
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
                console.warn('[Aéreo] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de tráfico aéreo en tiempo real que muestra miles de aviones volando simultáneamente alrededor del mundo.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la aviación conecta la humanidad
- La red invisible de conexiones aéreas
- El movimiento constante de personas y mercancías
- La tecnología que hace posible esto
- La conciencia de un mundo interconectado

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
            console.warn('[Aéreo] Error generando narrativa:', e);
        }
        
        return `Cada punto que veo aquí es un avión, cada línea es una ruta, cada movimiento es una historia. Millones de personas volando simultáneamente, cruzando océanos y continentes en horas. Esta red aérea es el sistema circulatorio de nuestra civilización global, conectando culturas, economías y familias. Es un recordatorio constante de que, aunque estemos separados por distancias, estamos más conectados que nunca.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Aéreo] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'maritimo', 'satelites', 'terremotos', 'cielo'];
                    const currentPage = 'aereo';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Aéreo] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.flightradarIframe) {
            this.flightradarIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
