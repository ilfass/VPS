import { timeEngine } from '../utils/time.js';
import { WORLD_MAP_SVG } from '../data/world-map.js';

export default class MapaMode {
    constructor(container) {
        this.container = container;
        this.unsubscribeTime = null;

        // DOM Elements
        this.nightPath = null;
        this.sunIcon = null;
        this.clockEl = null;
        this.dateEl = null;
    }

    mount() {
        // 1. Estructura Fullscreen Broadcast (Sin layout web)
        this.container.innerHTML = `
            <div class="broadcast-scene fade-in">
                <!-- Capa de Fondo (Océano) -->
                <div class="broadcast-background"></div>

                <!-- Mapa Principal -->
                <div class="broadcast-map-container zoom-pan-effect">
                    ${WORLD_MAP_SVG}
                    
                    <!-- Capa de Noche -->
                    <svg class="night-overlay" viewBox="0 0 1009.6727 665.96301" preserveAspectRatio="xMidYMid slice">
                        <path id="night-path" fill="rgba(0,0,0,0.65)" d="" style="mix-blend-mode: multiply;" />
                    </svg>
                    
                    <!-- Sol -->
                    <div id="sun-icon" class="sun-marker">☀️</div>
                </div>

                <!-- Overlay Informativo (Discreto, esquina inferior izquierda) -->
                <div class="broadcast-overlay">
                    <div class="overlay-header">
                        <span class="live-badge">● EN VIVO</span>
                        <span class="overlay-title">MONITOR GLOBAL</span>
                    </div>
                    <div class="overlay-clock" id="broadcast-clock">--:--</div>
                    <div class="overlay-date" id="broadcast-date">Cargando fecha...</div>
                </div>
            </div>
        `;

        // 2. Referencias
        this.nightPath = this.container.querySelector('#night-path');
        this.sunIcon = this.container.querySelector('#sun-icon');
        this.clockEl = this.container.querySelector('#broadcast-clock');
        this.dateEl = this.container.querySelector('#broadcast-date');

        // 3. Iniciar Lógica
        this.unsubscribeTime = timeEngine.subscribe((now) => this.update(now));

        // Actualización inicial
        this.update(new Date());
    }

    update(now) {
        // Actualizar Reloj (HH:MM:SS opcional, prefiero HH:MM para limpieza)
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        if (this.clockEl) this.clockEl.textContent = `${hours}:${minutes} UTC`;

        // Actualizar Fecha
        if (this.dateEl) {
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
            // Capitalizar primera letra
            const dateStr = now.toLocaleDateString('es-ES', dateOptions);
            this.dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        }

        // Actualizar Ciclo Solar
        if (this.nightPath) this.updateDayNightCycle(now);
    }

    updateDayNightCycle(date) {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const totalHours = hours + minutes / 60;

        // Longitud del sol (-180 a 180)
        let sunLon = (12 - totalHours) * 15;
        if (sunLon > 180) sunLon -= 360;
        if (sunLon < -180) sunLon += 360;

        // Declinación
        const dayOfYear = this.getDayOfYear(date);
        const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

        // Posición del Sol (CSS %)
        const sunX = ((sunLon + 180) / 360) * 100;
        const sunY = ((90 - declination) / 180) * 100;

        if (this.sunIcon) {
            this.sunIcon.style.left = `${sunX}%`;
            this.sunIcon.style.top = `${sunY}%`;
        }

        // Path del Terminador
        const width = 1009.6727;
        const height = 665.96301;

        const points = [];
        const step = 2; // Más suave
        const rad = Math.PI / 180;
        const tanDec = Math.tan(declination * rad);

        for (let lon = -180; lon <= 180; lon += step) {
            const deltaLon = (lon - sunLon) * rad;
            let lat;
            try {
                lat = Math.atan(-Math.cos(deltaLon) / tanDec) * 180 / Math.PI;
            } catch (e) { lat = 0; }

            const x = ((lon + 180) / 360) * width;
            const y = ((90 - lat) / 180) * height;
            points.push(`${x},${y}`);
        }

        // Cerrar polígono
        const closeY = declination > 0 ? height : 0;
        const pathData = `M ${points[0]} L ${points.join(' L ')} L ${width},${closeY} L 0,${closeY} Z`;

        this.nightPath.setAttribute('d', pathData);
    }

    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    unmount() {
        if (this.unsubscribeTime) this.unsubscribeTime();
        this.container.innerHTML = '';
    }
}
