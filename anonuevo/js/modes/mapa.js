import { timeEngine } from '../utils/time.js';
import { scheduler } from '../utils/scheduler.js';
import { WORLD_MAP_SVG } from '../data/world-map.js';

const TICKER_MESSAGES = [
    "TRANSMISIÓN EN VIVO 24/7",
    "MONITOREO GLOBAL DE ZONAS HORARIAS",
    "SISTEMA AUTOMATIZADO DE SEGUIMIENTO SOLAR",
    "VISUALIZACIÓN EN TIEMPO REAL",
    "SUSCRÍBETE PARA MÁS CONTENIDO"
];

export default class MapaMode {
    constructor(container) {
        this.container = container;
        this.unsubscribeTime = null;
        this.tickerIndex = 0;

        // DOM Elements
        this.nightPath = null;
        this.sunIcon = null;
        this.clockEl = null;
        this.tickerEl = null;
    }

    mount() {
        // 1. Estructura HTML Profesional (Layout de Streaming)
        this.container.innerHTML = `
            <div class="stream-layout fade-in">
                <!-- Header Superior -->
                <header class="stream-header">
                    <div class="header-content">
                        <div class="brand-block">
                            <h1 class="stream-title">MONITOR GLOBAL</h1>
                            <div class="stream-subtitle">CICLO DÍA/NOCHE EN TIEMPO REAL</div>
                        </div>
                        <div class="clock-block">
                            <div class="stream-clock" id="header-clock">--:-- UTC</div>
                            <div class="clock-label">TIEMPO UNIVERSAL COORDINADO</div>
                        </div>
                    </div>
                </header>
                
                <!-- Escenario Principal (Mapa) -->
                <main class="stream-map-stage">
                    <div class="map-container zoom-effect">
                        ${WORLD_MAP_SVG}
                        
                        <!-- Capa de Noche -->
                        <svg class="night-overlay" viewBox="0 0 1009.6727 665.96301" preserveAspectRatio="xMidYMid meet">
                            <path id="night-path" fill="rgba(0,0,0,0.75)" d="" style="mix-blend-mode: multiply;" />
                        </svg>
                        
                        <!-- Sol -->
                        <div id="sun-icon" class="sun-marker">☀️</div>
                    </div>
                </main>

                <!-- Footer Ticker -->
                <footer class="stream-footer">
                    <div class="ticker-wrap">
                        <div class="ticker-item" id="ticker-text">INICIANDO SISTEMA...</div>
                    </div>
                </footer>
            </div>
        `;

        // 2. Referencias
        this.nightPath = this.container.querySelector('#night-path');
        this.sunIcon = this.container.querySelector('#sun-icon');
        this.clockEl = this.container.querySelector('#header-clock');
        this.tickerEl = this.container.querySelector('#ticker-text');

        // 3. Iniciar Lógica
        this.unsubscribeTime = timeEngine.subscribe((now) => this.update(now));

        // Configurar rotación del ticker
        this.updateTicker();
        scheduler.addTask('TickerRotation', 0.5, () => this.updateTicker()); // Cada 30 seg

        // Actualización inicial
        this.update(new Date());
    }

    update(now) {
        // Actualizar Reloj
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        if (this.clockEl) this.clockEl.textContent = `${hours}:${minutes} UTC`;

        // Actualizar Ciclo Solar
        if (this.nightPath) this.updateDayNightCycle(now);
    }

    updateTicker() {
        if (!this.tickerEl) return;

        // Efecto de "Typing" o Fade simple
        this.tickerEl.style.opacity = 0;

        setTimeout(() => {
            this.tickerEl.textContent = TICKER_MESSAGES[this.tickerIndex];
            this.tickerEl.style.opacity = 1;
            this.tickerIndex = (this.tickerIndex + 1) % TICKER_MESSAGES.length;
        }, 500);
    }

    updateDayNightCycle(date) {
        // Lógica de posición solar y terminador
        // Adaptada para el viewBox del nuevo SVG (aprox 1000x666)

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
        // Mapear coordenadas geográficas a coordenadas del SVG (1009 x 666)
        const width = 1009.6727;
        const height = 665.96301;

        const points = [];
        const step = 5;
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

        // Cerrar polígono (Sombra)
        const closeY = declination > 0 ? height : 0; // Si es verano norte, sombra en sur
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
