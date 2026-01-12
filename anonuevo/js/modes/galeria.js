import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';

export default class GaleriaMode {
    constructor(container) {
        this.container = container;
        this.mediaItems = [];
        this.isNarrating = false;
        this.currentLightbox = null;
    }

    async mount() {
        console.log('[Galería] Montando página de galería...');
        
        // Limpiar contenedor primero
        this.container.innerHTML = '';
        
        // Inicializar avatar INMEDIATAMENTE
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
        
        // Habilitar audio después de interacción
        const enableAudio = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Registrar handler para comandos de música
        eventManager.on('music_command', (musicState) => {
            console.log('[Galería] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Galería] Error iniciando música:', e));
                }
            }
        });
        
        // Cargar datos y empezar narración
        await this.loadMedia();
        this.renderGallery();
        await this.startNarration();
        
        // Si Dream Mode está ON, cambiar automáticamente después de un tiempo
        if (eventManager.canProceedAuto()) {
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas'];
                    const randomPage = pages[Math.floor(Math.random() * pages.length)];
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000);
        }
    }

    async loadMedia() {
        try {
            // Obtener lista de media disponible
            const res = await fetch('/control-api/api/media-list');
            if (res.ok) {
                const data = await res.json();
                this.mediaItems = (data.media || []).slice(0, 50); // Limitar a 50 para rendimiento
            }
            
            // También intentar obtener media de memorias de países
            const memoryRes = await fetch('/control-api/api/country-memory');
            if (memoryRes.ok) {
                const memoryData = await memoryRes.json();
                const memories = memoryData.memories || [];
                
                // Extraer URLs de media de las memorias
                memories.forEach(memory => {
                    try {
                        const memoryDetail = JSON.parse(JSON.stringify(memory));
                        if (memoryDetail.visits && Array.isArray(memoryDetail.visits)) {
                            memoryDetail.visits.forEach(visit => {
                                if (visit.multimedia && Array.isArray(visit.multimedia)) {
                                    visit.multimedia.forEach(media => {
                                        if (media.url && !this.mediaItems.find(m => m.url === media.url)) {
                                            this.mediaItems.push({
                                                url: media.url,
                                                type: media.type || 'image',
                                                country: COUNTRY_INFO[memory.countryId]?.name || memory.countryId,
                                                context: media.context || 'Viaje',
                                                timestamp: visit.timestamp || memory.lastVisit
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        // Ignorar errores de parsing
                    }
                });
            }
        } catch (e) {
            console.error('[Galería] Error cargando media:', e);
        }
    }

    renderGallery() {
        this.container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 2rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            overflow-y: auto;
        `;
        
        // Título
        const title = document.createElement('h1');
        title.textContent = 'Galería Multimedia';
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            text-align: center;
            background: linear-gradient(135deg, #4a9eff 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        `;
        wrapper.appendChild(title);
        
        // Contador
        const counter = document.createElement('div');
        counter.textContent = `${this.mediaItems.length} elemento${this.mediaItems.length !== 1 ? 's' : ''} en la galería`;
        counter.style.cssText = `
            text-align: center;
            color: #a0a0b0;
            margin-bottom: 2rem;
            font-size: 1.1rem;
        `;
        wrapper.appendChild(counter);
        
        // Grid de imágenes
        if (this.mediaItems.length > 0) {
            const grid = document.createElement('div');
            grid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1.5rem;
                max-width: 1600px;
                margin: 0 auto;
            `;
            
            this.mediaItems.forEach((item, index) => {
                const card = document.createElement('div');
                card.style.cssText = `
                    position: relative;
                    aspect-ratio: 16/9;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    background: rgba(26, 26, 36, 0.8);
                    border: 1px solid rgba(74, 158, 255, 0.2);
                    transition: transform 0.2s, border-color 0.2s;
                `;
                
                if (item.type === 'image' || !item.type) {
                    const img = document.createElement('img');
                    img.src = item.url;
                    img.style.cssText = `
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    `;
                    img.onerror = () => {
                        card.innerHTML = `
                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #a0a0b0;">
                                <div style="text-align: center; padding: 1rem;">
                                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🖼️</div>
                                    <div style="font-size: 0.9rem;">${item.country || 'Media'}</div>
                                </div>
                            </div>
                        `;
                    };
                    card.appendChild(img);
                } else {
                    card.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #a0a0b0;">
                            <div style="text-align: center;">
                                <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎬</div>
                                <div style="font-size: 0.9rem;">Video</div>
                            </div>
                        </div>
                    `;
                }
                
                // Overlay con info
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
                    padding: 1rem;
                    color: #fff;
                    font-size: 0.85rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                `;
                overlay.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${item.country || 'Viaje'}</div>
                    <div style="font-size: 0.75rem; color: #a0a0b0;">${item.context || ''}</div>
                `;
                
                card.onmouseenter = () => {
                    card.style.transform = 'scale(1.05)';
                    card.style.borderColor = 'rgba(74, 158, 255, 0.6)';
                    overlay.style.opacity = '1';
                };
                card.onmouseleave = () => {
                    card.style.transform = 'scale(1)';
                    card.style.borderColor = 'rgba(74, 158, 255, 0.2)';
                    overlay.style.opacity = '0';
                };
                
                card.onclick = () => this.openLightbox(item, index);
                
                card.appendChild(overlay);
                grid.appendChild(card);
            });
            
            wrapper.appendChild(grid);
        } else {
            const empty = document.createElement('div');
            empty.style.cssText = `
                text-align: center;
                padding: 4rem;
                color: #a0a0b0;
            `;
            empty.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem;">🖼️</div>
                <div style="font-size: 1.2rem;">La galería se llenará mientras exploramos el mundo</div>
            `;
            wrapper.appendChild(empty);
        }
        
        this.container.appendChild(wrapper);
    }

    openLightbox(item, index) {
        // Crear lightbox
        const lightbox = document.createElement('div');
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            position: relative;
        `;
        
        if (item.type === 'image' || !item.type) {
            const img = document.createElement('img');
            img.src = item.url;
            img.style.cssText = `
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 8px;
            `;
            content.appendChild(img);
        }
        
        const info = document.createElement('div');
        info.style.cssText = `
            position: absolute;
            bottom: -3rem;
            left: 50%;
            transform: translateX(-50%);
            color: #fff;
            text-align: center;
            font-family: 'Inter', sans-serif;
        `;
        info.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.5rem;">${item.country || 'Viaje'}</div>
            <div style="font-size: 0.9rem; color: #a0a0b0;">${item.context || ''}</div>
        `;
        content.appendChild(info);
        
        lightbox.appendChild(content);
        lightbox.onclick = () => {
            lightbox.remove();
            this.currentLightbox = null;
        };
        
        document.body.appendChild(lightbox);
        this.currentLightbox = lightbox;
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = `Esta es nuestra galería multimedia. Hemos recopilado ${this.mediaItems.length} elemento${this.mediaItems.length !== 1 ? 's' : ''} visual${this.mediaItems.length !== 1 ? 'es' : ''} durante el viaje. Cada imagen, cada video, cuenta una parte de esta historia que estamos construyendo.`;
        
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
                console.warn('[Galería] Error generando texto completo:', e);
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
            const prompt = `Genera un relato narrativo sobre la galería multimedia del viaje. 
            Hemos recopilado ${this.mediaItems.length} elementos visuales durante nuestras exploraciones.
            El relato debe ser reflexivo sobre cómo las imágenes capturan momentos, lugares y experiencias del viaje.
            Habla en primera persona como ilfass, el explorador digital.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Galería] Error generando narrativa:', e);
        }
        
        return `Cada imagen en esta galería es un fragmento de memoria, un momento capturado en nuestro viaje. 
        Juntas, estas imágenes forman un mosaico visual de las experiencias que hemos vivido, 
        los lugares que hemos explorado, y las historias que hemos descubierto.`;
    }

    unmount() {
        if (this.currentLightbox) {
            this.currentLightbox.remove();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
