// Lógica para la lista de países que ya celebraron
// Depende de COUNTRY_TIMEZONE_MAP definido en script.js

const CelebratedList = {
    init: function () {
        this.createDOM();
        this.updateList();
        // Actualizar cada minuto
        setInterval(() => this.updateList(), 60000);
    },

    createDOM: function () {
        if (document.getElementById('celebratedListContainer')) return;

        const container = document.createElement('div');
        container.id = 'celebratedListContainer';
        container.className = 'celebrated-list-container';

        container.innerHTML = `
            <div class="celebrated-list-label">YA RECIBIERON EL 2026</div>
            <div class="celebrated-ticker-wrapper">
                <div class="celebrated-ticker" id="celebratedTicker">
                    <!-- Items will be injected here -->
                </div>
            </div>
        `;

        document.body.appendChild(container);
    },

    updateList: function () {
        if (typeof COUNTRY_TIMEZONE_MAP === 'undefined') return;

        const ticker = document.getElementById('celebratedTicker');
        if (!ticker) return;

        const now = new Date();
        const currentYear = now.getFullYear(); // Probablemente 2026 en UTC

        // Encontrar países que ya pasaron la medianoche del 1 de enero
        const celebratedCountries = [];

        Object.entries(COUNTRY_TIMEZONE_MAP).forEach(([country, timezone]) => {
            try {
                const zoneDateString = now.toLocaleString('en-US', { timeZone: timezone });
                const zoneDate = new Date(zoneDateString);

                // Si ya es 1 de Enero (mes 0) y año > 2025 (o el año actual si estamos simulando)
                // Asumimos que si el año de la zona es mayor que el año "viejo" (2025), ya celebró.
                // Ojo: Si el servidor está en 2026, currentYear es 2026.
                // La lógica segura es: Si la fecha local es >= 1 Enero 00:00

                if (zoneDate.getMonth() === 0 && zoneDate.getDate() >= 1 && zoneDate.getHours() >= 0) {
                    celebratedCountries.push({
                        name: country.charAt(0).toUpperCase() + country.slice(1),
                        time: zoneDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    });
                }
            } catch (e) {
                // Ignore
            }
        });

        // Ordenar alfabéticamente o por hora (opcional)
        celebratedCountries.sort((a, b) => a.name.localeCompare(b.name));

        // Renderizar
        if (celebratedCountries.length > 0) {
            ticker.innerHTML = celebratedCountries.map(c => `
                <div class="celebrated-item">
                    <span class="flag">🎉</span>
                    <span class="name">${c.name}</span>
                    <span class="time">(${c.time})</span>
                </div>
            `).join('');

            // Ajustar velocidad de animación según longitud
            const duration = Math.max(20, celebratedCountries.length * 3);
            ticker.style.animationDuration = `${duration}s`;
        } else {
            ticker.innerHTML = '<div class="celebrated-item">Esperando el primer Año Nuevo...</div>';
        }
    }
};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco a que script.js cargue sus datos
    setTimeout(() => CelebratedList.init(), 2000);
});
