/**
 * Motor de Tiempo Centralizado
 * Evita múltiples intervalos y asegura consistencia.
 */
export class TimeEngine {
    constructor() {
        this.listeners = new Set();
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.scheduleNextTick();
    }

    scheduleNextTick() {
        if (!this.isRunning) return;

        const now = new Date();
        const delay = 1000 - now.getMilliseconds();

        // Usamos setTimeout recursivo en lugar de setInterval para corregir el drift
        this.intervalId = setTimeout(() => {
            this.tick();
            this.scheduleNextTick();
        }, delay);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) clearTimeout(this.intervalId);
    }

    tick() {
        const now = new Date();
        // Protección contra ejecuciones múltiples en el mismo segundo
        if (this.lastTick && now.getTime() - this.lastTick < 900) return;

        this.lastTick = now.getTime();
        this.listeners.forEach(callback => callback(now));
    }

    subscribe(callback) {
        this.listeners.add(callback);
        // Llamada inmediata para inicializar
        callback(new Date());
        return () => this.listeners.delete(callback);
    }
}

export const timeEngine = new TimeEngine();
