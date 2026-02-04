/**
 * Multimedia Orchestrator
 * Coordina la aparición y desaparición de recuadros multimedia durante el relato
 */

export class MultimediaOrchestrator {
    constructor() {
        this.activeOverlays = [];
        this.container = null;
        this._stylesInjected = false;
    }

    init(container) {
        this.container = container;
        this.injectStylesOnce();
    }

    /**
     * Muestra un recuadro multimedia
     * @param {object} mediaItem - { type, url, context, trigger }
     * @param {number} delay - Delay en ms antes de mostrar
     */
    showMediaOverlay(mediaItem, delay = 0) {
        setTimeout(() => {
            const overlay = this.createOverlay(mediaItem);
            if (this.container) {
                this.container.appendChild(overlay);
                this.activeOverlays.push(overlay);

                // Animar entrada
                requestAnimationFrame(() => {
                    overlay.classList.add('visible');
                });

                // TTL opcional (para bumpers/clips cortos)
                const ttl = Number(mediaItem?.ttlMs || 0);
                if (ttl > 0) {
                    setTimeout(() => this.hideOverlay(overlay), ttl);
                }
            }
        }, delay);
    }

    /**
     * Crea un recuadro multimedia
     */
    createOverlay(mediaItem) {
        const overlay = document.createElement('div');
        overlay.className = 'multimedia-overlay';
        overlay.dataset.mediaType = mediaItem.type;

        let content;
        if (mediaItem.type === 'video') {
            content = document.createElement('video');
            content.src = mediaItem.url;
            content.autoplay = true;
            content.loop = true;
            content.muted = true;
            content.playsInline = true;
            content.controls = false;
            content.style.width = '100%';
            content.style.height = 'auto';
        } else if (mediaItem.type === 'audio') {
            content = document.createElement('audio');
            content.src = mediaItem.url;
            content.autoplay = true;
            content.loop = true;
            content.controls = true;
        } else {
            content = document.createElement('img');
            content.src = mediaItem.url;
            content.alt = mediaItem.context || '';
            // Importante: sin Ken Burns / sin zoom automático (mejor legibilidad)
            content.style.width = '100%';
            content.style.height = 'auto';
            content.style.transform = 'none';
            content.onerror = async () => {
                console.warn(`[MultimediaOrchestrator] Error cargando imagen: ${mediaItem.url}. Intentando Pexels fallback...`);

                // Intentar recuperar con Pexels
                try {
                    const { pexelsClient } = await import('./pexels-client.js');
                    const query = mediaItem.context || 'landscape';
                    const photos = await pexelsClient.searchPhotos(query, 1);
                    if (photos && photos.length > 0 && photos[0].src) {
                        console.log(`[MultimediaOrchestrator] ✅ Imagen recuperada de Pexels: ${query}`);
                        content.src = photos[0].src.landscape;
                        return; // Éxito, no ocultar
                    }
                } catch (e) {
                    console.warn("Pexels fallback failed", e);
                }

                overlay.style.display = 'none';
            };
        }

        // Contexto textual si existe
        if (mediaItem.context) {
            const contextDiv = document.createElement('div');
            contextDiv.className = 'multimedia-context';
            contextDiv.textContent = mediaItem.context;
            overlay.appendChild(contextDiv);
        }

        overlay.appendChild(content);
        return overlay;
    }

    injectStylesOnce() {
        if (this._stylesInjected) return;
        this._stylesInjected = true;
        // Sin estilos de Ken Burns / zoom.
    }

    /**
     * Oculta todos los recuadros multimedia
     */
    hideAllOverlays() {
        this.activeOverlays.forEach(overlay => {
            overlay.classList.add('hiding');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500); // Duración de animación de salida
        });
        this.activeOverlays = [];
    }

    /**
     * Oculta un overlay específico
     */
    hideOverlay(overlay) {
        overlay.classList.add('hiding');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            const index = this.activeOverlays.indexOf(overlay);
            if (index > -1) {
                this.activeOverlays.splice(index, 1);
            }
        }, 500);
    }
}

export const multimediaOrchestrator = new MultimediaOrchestrator();
