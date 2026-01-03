
import { streamManager } from './stream-manager.js';
import { narrativeEngine } from './narrative-engine.js';
import { characterDirector } from './character-director.js';
import { contentEngine } from './content-engine.js';
import { choreographer, SCENES } from './choreographer.js';
import { COUNTRY_INFO } from '../data/country-info.js';

export class SystemOrchestrator {
    constructor() {
        this.isRunning = false;
        this.currentCountry = null;
        this.currentScene = SCENES.COVER;
    }

    init() {
        console.log("[SystemOrchestrator] Initializing 'El Viaje de ilfass'...");
        streamManager.init();
        this.isRunning = true;
        this.runLoop();
    }

    runLoop() {
        if (!this.isRunning) return;

        // 1. Obtener Estado Global (StreamManager)
        const context = streamManager.getCurrentContext();
        // context: { mode, countryId, dayOfVisit, theme }

        // 2. Validar cambio de país/día
        if (this.currentCountry !== context.countryId) {
            this.handleCountryChange(context);
        }

        // 3. Determinar Escena Visual (Choreographer)
        // Por ahora simplificado: Si es modo NARRATIVE -> LIVE_MAP
        let targetScene = SCENES.LIVE_MAP;
        if (context.mode === 'LOOP') targetScene = SCENES.TRAVEL_DIARY;

        // Aquí se invocaría al VisualSceneManager para cambiar el DOM si targetScene != currentScene

        // 4. Generar Contenido (NarrativeEngine) - Esto se dispara por eventos en MapaMode, 
        // pero el orquestador podría forzar eventos periódicos si no hay actividad.

        // 5. Persistencia (LibroEngine - Simulado)
        // Se actualizaría el estado del libro basado en context.dayOfVisit

        // Loop de chequeo cada 10s (el ritmo real lo lleva el MapaMode)
        setTimeout(() => this.runLoop(), 10000);
    }

    handleCountryChange(context) {
        console.log(`[SystemOrchestrator] Country Change: ${this.currentCountry} -> ${context.countryId}`);
        this.currentCountry = context.countryId;

        // Disparar transición de "Exploración" o "Deep Dive"
        const transition = choreographer.getTransition(this.currentScene, SCENES.LIVE_MAP, 'COUNTRY_CHANGE');
        console.log(`[SystemOrchestrator] Executing Transition: ${transition}`);

        // Forzar Intro del Día
        // eventManager.emit('force_narrative', { type: 'INTRO' });
    }

    // API para Panel Editorial
    forceAction(action, payload) {
        console.log(`[SystemOrchestrator] Force Action: ${action}`, payload);
        if (action === 'FORCE_REFLECTION') {
            // Lógica para forzar reflexión inmediata
        }
    }
}

export const systemOrchestrator = new SystemOrchestrator();
