import { audioManager, AUDIO_STATES } from './audio-manager.js';

class EventManager {
    constructor() {
        this.queue = [];
        this.autoMode = true;
        this.isProcessing = false;
        this.handlers = {};
        this.pollInterval = null;

        // URL del servidor de control (ajustar según entorno)
        // En producción, esto debería ser relativo o configurado
        this.controlUrl = 'https://vps.habilispro.com/control-api';
        // Nota: Necesitaremos configurar Nginx para redirigir /control-api al puerto 3005
    }

    init() {
        console.log("🔌 EventManager Initialized");
        this.startPolling();
    }

    on(eventType, callback) {
        this.handlers[eventType] = callback;
    }

    startPolling() {
        // Polling cada 2 segundos
        this.pollInterval = setInterval(async () => {
            try {
                // Usamos fetch al endpoint expuesto por Nginx
                // Si estamos en dev local, podría ser localhost:3005
                const response = await fetch('/control-api/poll');
                if (response.ok) {
                    const data = await response.json();

                    // Sincronizar estado
                    if (this.autoMode !== data.autoMode) {
                        this.autoMode = data.autoMode;
                        console.log(`🔄 Auto Mode Changed: ${this.autoMode}`);
                    }

                    // Encolar nuevos eventos
                    if (data.events && data.events.length > 0) {
                        data.events.forEach(event => {
                            console.log(`📥 Event Received: ${event.type}`);
                            this.queue.push(event);
                        });
                    }

                    // Intentar procesar
                    this.processQueue();
                }
            } catch (e) {
                // Silencioso para no saturar consola si falla
                // console.warn("Polling error:", e);
            }
        }, 2000);
    }

    processQueue() {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        // Verificar condiciones de seguridad para ejecutar
        // 1. No debe haber audio sonando (IDLE)
        // 2. No debe haber animaciones críticas (podemos chequear audioManager)

        // Eliminamos el bloqueo por estado de audio para permitir interrupciones (eventos manuales)
        // if (audioManager.currentState !== AUDIO_STATES.IDLE) { ... }

        // Tomar evento
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
                case 'fact':
                    if (this.handlers['fact']) this.handlers['fact']();
                    break;
                case 'auto_on':
                    // Ya se actualizó el flag, solo log
                    console.log("System is now AUTOMATIC");
                    break;
                case 'auto_off':
                    console.log("System is now MANUAL");
                    break;
            }
        } catch (e) {
            console.error("Error processing event:", e);
        } finally {
            // Pequeño delay para evitar ametralladora de eventos
            setTimeout(() => {
                this.isProcessing = false;
                this.processQueue(); // Intentar siguiente
            }, 1000);
        }
    }

    // Método para que el sistema consulte si puede proceder automáticamente
    canProceedAuto() {
        return this.autoMode;
    }
}

export const eventManager = new EventManager();
