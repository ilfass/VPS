import { eventManager } from './event-manager.js?v=2';
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
        // La rotación ahora es manejada localmente por mapa.js para evitar conflictos
        // this.runLoop();
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

    async rotateCountry() {
        // 1. Intentar consumir de la Playlist (Cola del Director)
        try {
            // endpoint configurado en Nginx como /control-api/...
            // Asumimos que eventManager tiene la URL base o hardcodeamos '/control-api'
            // Usar el endpoint /poll en lugar de /event/queue/pop
            const res = await fetch('/control-api/poll', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                if (data.nextCountry) {
                    console.log(`[AutoPilot] 🎯 Following Director's Playlist: ${data.nextCountry}`);
                    eventManager.emit('country', data.nextCountry);
                    this.currentCountry = data.nextCountry;
                    return; // Éxito, no hacemos random
                }
            }
        } catch (e) { console.warn("Queue check failed, falling back to random", e); }

        // 2. Si no hay cola, rotación aleatoria estándar
        const countryCodes = Object.keys(COUNTRY_INFO);
        const available = countryCodes.filter(c => c !== this.currentCountry);
        if (available.length > 0) {
            const nextCode = available[Math.floor(Math.random() * available.length)];
            console.log(`[AutoPilot] 🎲 Rotating to random country: ${nextCode}`);
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
