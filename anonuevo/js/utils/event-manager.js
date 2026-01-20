import { audioManager, AUDIO_STATES } from './audio-manager.js';

class EventManager {
    constructor() {
        this.queue = [];
        this.autoMode = true;
        this.isProcessing = false;
        this.handlers = {};
        this.pollInterval = null;
        this.controlUrl = '/control-api';
        this.lastMusicCommand = null; // Para prevenir comandos duplicados
    }

    init() {
        console.log("🔌 EventManager Initialized");
        this.startPolling();
    }

    on(eventType, callback) {
        this.handlers[eventType] = callback;
    }

    emit(eventType, payload) {
        // Disparar evento localmente si hay handler
        if (this.handlers[eventType]) {
            this.handlers[eventType](payload);
        } else {
            console.warn(`[EventManager] No handler for event: ${eventType}`);
        }
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

                    // Verificar comandos de música con protección contra duplicados
                    if (data.music && data.music.command) {
                        // Solo emitir si no es el mismo comando que el anterior
                        if (!this.lastMusicCommand || this.lastMusicCommand !== data.music.command) {
                            console.log(`🎵 Music Command Received: ${data.music.command}`);
                            this.lastMusicCommand = data.music.command;
                            this.emit('music_command', { command: data.music.command });
                            // Limpiar después de un tiempo para permitir el mismo comando más tarde
                            setTimeout(() => {
                                this.lastMusicCommand = null;
                            }, 2000);
                        } else {
                            console.log(`🎵 Music Command Duplicate Ignored: ${data.music.command}`);
                        }
                    } else {
                        // Si no hay comando, limpiar el último comando
                        this.lastMusicCommand = null;
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
                case 'navigate':
                    // Evento de navegación desde panel de control (botones de Hojas Dinámicas)
                    // NO navegar si estamos en la página principal (index.html)
                    if (event.payload) {
                        const currentPath = window.location.pathname;
                        // Si estamos en la raíz o en index.html, no cambiar
                        if (currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html')) {
                            console.log(`[EventManager] Ignorando navegación desde página principal: ${event.payload}`);
                            return;
                        }
                        console.log(`[EventManager] Navegando a: ${event.payload}`);
                        window.location.href = event.payload;
                    }
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
                case 'recap_now':
                    if (this.handlers['recap_now']) this.handlers['recap_now']();
                    break;
                case 'bumper_now':
                    if (this.handlers['bumper_now']) this.handlers['bumper_now']();
                    break;
                case 'agenda_reset':
                    if (this.handlers['agenda_reset']) this.handlers['agenda_reset']();
                    break;
                case 'tv_toggles':
                    if (this.handlers['tv_toggles']) this.handlers['tv_toggles'](event.payload);
                    break;
                case 'ruta_play_toggle':
                    if (this.handlers['ruta_play_toggle']) this.handlers['ruta_play_toggle']();
                    break;
                case 'ruta_follow_toggle':
                    if (this.handlers['ruta_follow_toggle']) this.handlers['ruta_follow_toggle']();
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
