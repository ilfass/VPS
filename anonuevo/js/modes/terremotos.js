import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class TerremotosMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.usgsIframe = null;
    }

    async mount() {
        console.log('[Terremotos] Montando página de terremotos...');
        
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
        
        this.createUSGSEmbed();
        await this.startNarration();
        this.scheduleNextPage();
    }

    createUSGSEmbed() {
        // USGS Earthquake Map - terremotos en tiempo casi real
        const usgsUrl = 'https://earthquake.usgs.gov/earthquakes/map/';
        
        this.usgsIframe = document.createElement('iframe');
        this.usgsIframe.className = 'usgs-container';
        this.usgsIframe.src = usgsUrl;
        this.usgsIframe.style.border = 'none';
        this.usgsIframe.style.width = '100%';
        this.usgsIframe.style.height = '100%';
        
        this.container.appendChild(this.usgsIframe);
        
        console.log('[Terremotos] USGS embed cargado');
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando la actividad sísmica de nuestro planeta en tiempo casi real. Cada punto que aparece es un terremoto, un recordatorio de las fuerzas titánicas que moldean nuestro mundo. La Tierra está viva, respirando, moviéndose constantemente bajo nuestros pies.';
        
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
                console.warn('[Terremotos] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de terremotos en tiempo casi real que muestra la actividad sísmica constante de nuestro planeta.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la Tierra está constantemente en movimiento
- Las fuerzas titánicas que moldean nuestro planeta
- La fragilidad de la humanidad frente a estas fuerzas
- La belleza y el poder de la naturaleza
- La conciencia de vivir en un planeta geológicamente activo

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
            console.warn('[Terremotos] Error generando narrativa:', e);
        }
        
        return `Cada punto que aparece aquí es un recordatorio de que vivimos en un planeta vivo, en constante movimiento. Las placas tectónicas se desplazan, chocan, se separan, creando montañas y océanos. Estos terremotos son la respiración profunda de la Tierra, fuerzas titánicas que moldean nuestro mundo. Nos recuerdan nuestra fragilidad, pero también la increíble resiliencia de la vida que se adapta y persiste frente a estas fuerzas colosales.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Terremotos] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'maritimo', 'satelites', 'cielo'];
                    const currentPage = 'terremotos';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Terremotos] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
        if (this.usgsIframe) {
            this.usgsIframe.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
