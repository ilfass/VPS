import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class ClimaMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.windyIframe = null;
    }

    async mount() {
        console.log('[Clima] Montando página de clima en tiempo real...');
        
        // Inicializar eventManager si no está inicializado
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        // Limpiar contenedor
        this.container.innerHTML = '';
        
        // Inicializar avatar
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        // Iniciar música de fondo
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        // Crear iframe de Windy
        this.createWindyEmbed();
        
        // Iniciar narración
        await this.startNarration();
        
        // Programar siguiente página
        this.scheduleNextPage();
    }

    createWindyEmbed() {
        // Windy embed - configuración para mostrar viento, lluvia y presión
        const windyUrl = 'https://embed.windy.com/embed2.html?lat=20&lon=0&zoom=2&level=surface&overlay=wind&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=&detailLon=&metricWind=default&metricTemp=default&radarRange=-1';
        
        this.windyIframe = document.createElement('iframe');
        this.windyIframe.className = 'windy-container';
        this.windyIframe.src = windyUrl;
        this.windyIframe.allow = 'geolocation';
        this.windyIframe.style.border = 'none';
        this.windyIframe.style.width = '100%';
        this.windyIframe.style.height = '100%';
        
        this.container.appendChild(this.windyIframe);
        
        console.log('[Clima] Windy embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el clima de nuestro planeta en tiempo real. Puedo ver cómo el viento fluye alrededor del globo, cómo las nubes se forman y se mueven, cómo la presión atmosférica cambia constantemente. Este es el pulso de la Tierra, el sistema que conecta todos los continentes.';
        
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
                console.warn('[Clima] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa del clima en tiempo real que muestra viento, lluvia, nubes y presión atmosférica en todo el planeta. 

Genera una narrativa reflexiva en primera persona sobre:
- Cómo el clima conecta todos los continentes
- La belleza de los patrones atmosféricos
- La conciencia planetaria que esto genera
- Cómo el clima afecta la vida humana en todo el mundo
- La fragilidad y la fuerza de nuestro planeta

El texto debe ser poético, reflexivo y entre 150 y 220 palabras.`;
            
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
            console.warn('[Clima] Error generando narrativa:', e);
        }
        
        return `Desde esta perspectiva única, puedo ver cómo el clima es el sistema circulatorio de nuestro planeta. El viento transporta energía, humedad y vida de un continente a otro. Las nubes son mensajeras que cruzan océanos, las tormentas son la respiración profunda de la Tierra. Cada patrón que observo aquí afecta la vida en algún lugar del mundo. Este es el verdadero pulso de nuestro planeta, un sistema interconectado que no conoce fronteras políticas, solo las leyes de la física y la vida.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Clima] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'aereo', 'maritimo', 'satelites', 'terremotos', 'cielo'];
                    const currentPage = 'clima';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Clima] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000); // 30-50 segundos
        }
    }

    unmount() {
        if (this.windyIframe) {
            this.windyIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
