// Lógica para la transición Post-Evento (cuando termina el Año Nuevo en todo el mundo)

const PostEvent = {
    init: function () {
        // Verificar estado cada minuto
        this.checkStatus();
        setInterval(() => this.checkStatus(), 60000);
    },

    checkStatus: function () {
        const now = new Date();
        const utcMonth = now.getUTCMonth();
        const utcDate = now.getUTCDate();
        const utcHours = now.getUTCHours();

        // El último lugar es Baker Island (UTC-12).
        // Su medianoche es el 1 de Enero a las 12:00 UTC.
        // Damos 2 horas de margen: 14:00 UTC del 1 de Enero.

        // Si es Enero (0), día 1, y hora >= 14:00 UTC
        // O si es Enero, día > 1
        // O si es Febrero... (ya pasó mucho)

        const isEventOver = (utcMonth === 0 && utcDate === 1 && utcHours >= 14) ||
            (utcMonth === 0 && utcDate > 1) ||
            (utcMonth > 0);

        if (isEventOver) {
            this.activatePostEventMode();
        }
    },

    activatePostEventMode: function () {
        if (document.body.classList.contains('post-event-mode')) return;

        document.body.classList.add('post-event-mode');
        console.log('🏁 Evento finalizado. Activando modo Post-Evento.');

        // 1. Cambiar UI Principal
        const infoHeader = document.querySelector('.info-header h1');
        if (infoHeader) infoHeader.textContent = '¡Bienvenido al 2026!';

        const statusText = document.getElementById('statusText');
        if (statusText) statusText.textContent = 'EVENTO FINALIZADO';

        // 2. Ocultar paneles irrelevantes
        const nextPanel = document.getElementById('nextCountryPanel');
        if (nextPanel) nextPanel.style.display = 'none';

        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) statsGrid.style.display = 'none';

        // 3. Mostrar Cuenta Regresiva para 2027
        this.show2027Countdown();

        // 4. Mensaje del Presentador
        if (typeof speakMessage === 'function') {
            speakMessage('El Año Nuevo ha llegado a todo el mundo. ¡Gracias por acompañarnos! Nos vemos en el 2027.');
        }
    },

    show2027Countdown: function () {
        // Reutilizar o crear contenedor
        let container = document.getElementById('countdown2027');
        if (!container) {
            container = document.createElement('div');
            container.id = 'countdown2027';
            container.className = 'countdown-2027-container';
            document.querySelector('.info-panel').appendChild(container);
        }

        container.innerHTML = `
            <h2>Cuenta Regresiva 2027</h2>
            <div id="timer2027" class="timer-2027">Cargando...</div>
        `;

        // Iniciar timer
        setInterval(this.update2027Timer, 1000);
        this.update2027Timer();
    },

    update2027Timer: function () {
        const timerEl = document.getElementById('timer2027');
        if (!timerEl) return;

        const now = new Date();
        const nextYear = now.getFullYear() + 1; // 2027 (si estamos en 2026)
        const target = new Date(Date.UTC(nextYear, 0, 1, 0, 0, 0)); // 1 Enero 2027 UTC

        const diff = target - now;

        if (diff <= 0) {
            timerEl.textContent = "¡FELIZ AÑO NUEVO!";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
};

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PostEvent.init(), 5000);
});
