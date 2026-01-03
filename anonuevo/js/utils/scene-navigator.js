
import { choreographer, SCENES, TRANSITION_TYPES } from './choreographer.js';

export class SceneNavigator {
    constructor() {
        this.currentUrl = window.location.href;
        this.iframeContainer = null;
    }

    init(containerId) {
        // Crear contenedor para escenas externas (iframe o div dinámico)
        // En una SPA real, esto manejaría el router. Aquí simulamos con iframes o divs superpuestos.
        const container = document.getElementById(containerId);
        if (!container) return;

        this.iframeContainer = document.createElement('div');
        this.iframeContainer.id = 'scene-layer';
        this.iframeContainer.className = 'scene-layer hidden';
        this.iframeContainer.innerHTML = `<iframe id="scene-frame" src="about:blank" frameborder="0"></iframe>`;
        container.appendChild(this.iframeContainer);
    }

    /**
     * Navega a una escena específica aplicando la transición correspondiente
     * @param {string} targetScene - Constante de SCENES
     */
    navigateTo(targetScene) {
        const transition = choreographer.getTransition(choreographer.currentScene, targetScene, 'NAVIGATION');
        const config = choreographer.getTransitionConfig(transition);

        console.log(`[SceneNavigator] Navigating to ${targetScene} with transition ${transition}`);

        // 1. Ejecutar transición de SALIDA (Visual/Audio)
        this.executeTransitionEffect(config, 'OUT', () => {

            // 2. Cambiar URL / Contenido
            this.loadSceneContent(targetScene);
            choreographer.currentScene = targetScene;

            // 3. Ejecutar transición de ENTRADA
            this.executeTransitionEffect(config, 'IN');
        });
    }

    loadSceneContent(scene) {
        const frame = document.getElementById('scene-frame');
        const mapContainer = document.getElementById('d3-map-container'); // El mapa base

        if (scene === SCENES.LIVE_MAP) {
            // Mostrar mapa base, ocultar iframe
            if (this.iframeContainer) this.iframeContainer.classList.add('hidden');
            if (mapContainer) mapContainer.classList.remove('hidden-scene');
        } else {
            // Ocultar mapa base, mostrar iframe con URL correspondiente
            if (mapContainer) mapContainer.classList.add('hidden-scene');
            if (this.iframeContainer) this.iframeContainer.classList.remove('hidden');

            let url = '';
            switch (scene) {
                case SCENES.COVER: url = '/vivos/portada'; break; // Simulada
                case SCENES.COUNTRY_PAGE: url = '/vivos/pais/actual'; break;
                case SCENES.TRAVEL_DIARY: url = '/vivos/diario'; break;
                case SCENES.GLOBAL_INDEX: url = '/memoria/indice'; break;
                default: url = '/vivos/portada';
            }

            if (frame) frame.src = url;
        }
    }

    executeTransitionEffect(config, direction, callback) {
        // Simulación de efectos visuales (Fade, Zoom, Cut)
        // En una implementación real, esto manipularía clases CSS y volúmenes de audio
        const duration = direction === 'OUT' ? config.duration / 2 : config.duration / 2;

        console.log(`[SceneNavigator] Effect ${config.visual} (${direction}) - ${duration}ms`);

        // Simular espera de animación
        setTimeout(() => {
            if (callback) callback();
        }, 1000); // 1s fijo para demo
    }
}

export const sceneNavigator = new SceneNavigator();
