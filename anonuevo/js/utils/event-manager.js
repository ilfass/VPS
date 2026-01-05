import { audioManager, AUDIO_STATES } from './audio-manager.js';

class EventManager {
    constructor() {
        this.queue = [];
        this.autoMode = true;
        this.isProcessing = false;
        this.handlers = {};
        this.pollInterval = null;
        this.controlUrl = '/control-api';
    }

    init() {
        console.log("🔌 EventManager Initialized");
        this.startPolling();
    }

    on(eventType, callback) {
        this.handlers[eventType] = callback;
    }

    startPolling() {
        // Polling rápido para latencia baja en control manual
        this.pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.controlUrl}/poll`);
                if (response.ok) {
                    const data = await response.json();

                    // Sincronizar estado AutoMode
                    if (this.autoMode !== data.autoMode) {
                        this.autoMode = data.autoMode;
                        window.AUTO_MODE = this.autoMode; // Expose global flag
                        console.log(`🔄 Auto Mode Changed: ${this.autoMode}`);
                        // Disparar evento si hay handler
                        if (this.handlers['mode_change']) this.handlers['mode_change'](this.autoMode);
                    }

                    // Encolar eventos nuevos
                    if (data.events && data.events.length > 0) {
                        data.events.forEach(event => {
                            console.log(`📥 Event Received: ${event.type}`);
                            this.queue.push(event);
                        });
                        this.processQueue();
                    }
                }
            } catch (e) { }
        }, 1000);
    }

    // --- NUEVO: Reporte de Telemetría al Director ---
    async reportTelemetry(scene, country, day) {
        try {
            await fetch(`${this.controlUrl}/api/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scene: scene || 'UNKNOWN',
                    country: country || 'GLOBAL',
                    day: day || 0
                })
            });
        } catch (e) { }
    }

    processQueue() {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        const event = this.queue.shift();
        this.isProcessing = true;
        console.log(`▶️ Executing Event: ${event.type}`);

        try {
            switch (event.type) {
                case 'news':
                    if (this.handlers['news']) this.handlers['news']();
                    break;
                case 'country':
                    if (this.handlers['country']) this.handlers['country'](event.payload);
                    break;
                case 'scene_change':
                    if (this.handlers['scene_change']) this.handlers['scene_change'](event.payload);
                    break;
                case 'fact':
                    if (this.handlers['fact']) this.handlers['fact']();
                    break;
                case 'travel_to':
                    if (this.handlers['travel_to']) this.handlers['travel_to'](event.payload);
                    break;
                case 'media':
                    // Evento de media con url, mediaType y textToSpeak
                    if (this.handlers['media']) {
                        this.handlers['media']({
                            url: event.url,
                            mediaType: event.mediaType || 'image',
                            textToSpeak: event.textToSpeak
                        });
                    }
                    break;
                case 'auto_on':
                case 'auto_off':
                    // Ya manejado por el flag
                    break;
            }
        } catch (e) {
            console.error("Error processing event:", e);
        } finally {
            setTimeout(() => {
                this.isProcessing = false;
                this.processQueue();
            }, 500);
        }
    }

    canProceedAuto() {
        return this.autoMode;
    }
}

export const eventManager = new EventManager();
