import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class MaritimoMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.marinetrafficIframe = null;
    }

    async mount() {
        console.log('[Marítimo] Montando página de tráfico marítimo...');
        
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
        
        this.createMarineTrafficEmbed();
        await this.startNarration();
        this.scheduleNextPage();
    }

    createMarineTrafficEmbed() {
        // MarineTraffic embed - mapa público
        const marinetrafficUrl = 'https://www.marinetraffic.com/en/ais/home/centerx:0/centery:0/zoom:2';
        
        this.marinetrafficIframe = document.createElement('iframe');
        this.marinetrafficIframe.className = 'marinetraffic-container';
        this.marinetrafficIframe.src = marinetrafficUrl;
        this.marinetrafficIframe.style.border = 'none';
        this.marinetrafficIframe.style.width = '100%';
        this.marinetrafficIframe.style.height = '100%';
        
        this.container.appendChild(this.marinetrafficIframe);
        
        console.log('[Marítimo] MarineTraffic embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el tráfico marítimo global. Miles de barcos navegando por los océanos del mundo, transportando el noventa por ciento del comercio global. Este movimiento lento pero constante es el latido del comercio mundial, la red que alimenta nuestras civilizaciones.';
        
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
                console.warn('[Marítimo] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de tráfico marítimo en tiempo real que muestra miles de barcos navegando por los océanos.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo el transporte marítimo es la columna vertebral del comercio global
- El movimiento lento pero constante de los barcos
- La importancia de los océanos para la humanidad
- La red invisible de conexiones comerciales
- La belleza hipnótica de este movimiento constante

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
            console.warn('[Marítimo] Error generando narrativa:', e);
        }
        
        return `Cada punto que veo aquí es un barco, cada línea es una ruta comercial, cada movimiento es parte de la red que alimenta nuestras civilizaciones. El noventa por ciento del comercio mundial viaja por mar, en estos barcos que navegan lentamente pero constantemente. Es un movimiento hipnótico, casi meditativo, que nos recuerda que aunque vivamos en un mundo digital, la economía física sigue dependiendo de estos gigantes del mar.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Marítimo] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'satelites', 'terremotos'];
                    const currentPage = 'maritimo';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Marítimo] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.marinetrafficIframe) {
            this.marinetrafficIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
