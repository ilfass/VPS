import { timeEngine } from '../utils/time.js';

export default class ClockMode {
    constructor(container) {
        this.container = container;
        this.unsubscribe = null;
    }

    mount() {
        this.container.innerHTML = `
            <div class="clock-container fade-in">
                <div class="clock-time" id="clock-display">00:00:00</div>
                <div class="clock-date" id="date-display">Cargando fecha...</div>
            </div>
        `;

        this.timeEl = this.container.querySelector('#clock-display');
        this.dateEl = this.container.querySelector('#date-display');

        // Suscribirse al motor de tiempo
        this.unsubscribe = timeEngine.subscribe((now) => this.update(now));
    }

    update(now) {
        if (!this.timeEl) return;

        // Formato HH:MM:SS
        const timeStr = now.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Formato Fecha Completa
        const dateStr = now.toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.timeEl.textContent = timeStr;
        this.dateEl.textContent = dateStr;
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
        this.container.innerHTML = '';
    }
}
