import { eventManager } from './event-manager.js';
import { COUNTRY_INFO } from '../data/country-info.js';
import { streamManager } from './stream-manager.js';
import { choreographer, SCENES } from './choreographer.js';
import { sceneNavigator } from './scene-navigator.js';

export class SystemOrchestrator {
    constructor() {
        this.isRunning = false;
        this.currentCountry = null;
        this.currentScene = SCENES.COVER;
        this.lastRotation = Date.now();
        this.rotationInterval = 60000; // Rotar cada 60s en Auto Mode
    }

    init() {
        console.log("[SystemOrchestrator] Initializing 'El Viaje de ilfass'...");
        streamManager.init();
        this.isRunning = true;
        this.runLoop();
    }

    runLoop() {
        if (!this.isRunning) return;

        // 1. CHEQUEO DE AUTO-PILOTO
        // Usamos una propiedad directa o método del eventManager si existe, 
        // o asumimos un flag global si no. 
        // Vamos a usar eventManager.canProceedAuto() que ya existe en mapa.js pero aquí reviso la flag interna

        // Simulación de acceso a estado de Auto Mode
        // Nota: eventManager debería exponer isAutoMode. Si no lo hace, asumimos true o leemos del DOM.
        // Como parche rápido, leemos del sessionStorage o variable global window.AUTO_MODE

        // Mejor: Si no hay Auto, retornamos pero seguimos loopeando para cuando se active
        if (window.AUTO_MODE === false) { // Setado por index.html o event-manager
            setTimeout(() => this.runLoop(), 2000);
            return;
        }

        // 2. ROTACIÓN AUTOMÁTICA (Aleatoriedad Real)
        const now = Date.now();
        if (now - this.lastRotation > this.rotationInterval) {
            this.rotateCountry();
            this.lastRotation = now;
        }

        // 3. Persistencia y Escenas (Mantenemos lógica existente simplificada)
        setTimeout(() => this.runLoop(), 5000);
    }

    rotateCountry() {
        const countryCodes = Object.keys(COUNTRY_INFO);
        // Excluir actual
        const available = countryCodes.filter(c => c !== this.currentCountry);
        if (available.length > 0) {
            const nextCode = available[Math.floor(Math.random() * available.length)];
            console.log(`[AutoPilot] Rotating to random country: ${nextCode}`);
            eventManager.emit('country', nextCode);
            this.currentCountry = nextCode; // Actualizamos tracking local
        }
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
