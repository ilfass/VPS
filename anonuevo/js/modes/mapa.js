import { timeEngine } from '../utils/time.js';
import { WORLD_MAP_SVG } from '../data/world-map.js';

export default class MapaMode {
    constructor(container) {
        this.container = container;
        this.unsubscribe = null;
        this.nightPath = null;
        this.sunIcon = null;
        this.timeDisplay = null;
    }

    mount() {
        // 1. Inyectar estructura HTML
        this.container.innerHTML = `
            <div class="map-mode-container fade-in">
                <div class="map-wrapper">
                    ${WORLD_MAP_SVG}
                    
                    <!-- Capa de Noche (SVG Overlay) -->
                    <svg class="night-overlay" viewBox="0 0 2000 1000" preserveAspectRatio="none">
                        <path id="night-path" fill="rgba(0,0,0,0.6)" d="" />
                    </svg>
                    
                    <!-- Sol -->
                    <div id="sun-icon" class="sun-marker">☀️</div>
                </div>

                <div class="map-info-overlay">
                    <div class="map-title">MAPA MUNDIAL – DÍA Y NOCHE EN TIEMPO REAL</div>
                    <div class="map-time" id="map-time-display">00:00 UTC</div>
                </div>
            </div>
        `;

        // 2. Referencias al DOM
        this.nightPath = this.container.querySelector('#night-path');
        this.sunIcon = this.container.querySelector('#sun-icon');
        this.timeDisplay = this.container.querySelector('#map-time-display');

        // 3. Suscribirse al motor de tiempo
        this.unsubscribe = timeEngine.subscribe((now) => this.update(now));

        // 4. Actualización inicial inmediata
        this.update(new Date());
    }

    update(now) {
        if (!this.nightPath) return;

        // Actualizar reloj (Formato HH:MM)
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        this.timeDisplay.textContent = `${hours}:${minutes} UTC`;

        // Calcular posición del sol y sombra cada minuto (o cada tick para suavidad)
        // Para rendimiento, podríamos limitar esto, pero el cálculo es rápido.
        this.updateDayNightCycle(now);
    }

    updateDayNightCycle(date) {
        // 1. Calcular posición del sol
        // UTC 12:00 = Sol en 180° (Centro si el mapa va de 0 a 360, pero nuestro mapa es -180 a 180)
        // UTC 12:00 = Greenwich (0°) es mediodía.
        // El sol viaja 15° por hora hacia el Oeste.

        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const totalHours = hours + minutes / 60;

        // Longitud del sol: 
        // A las 12:00 UTC, el sol está en 0°.
        // A las 00:00 UTC, el sol está en 180°.
        // Formula: (12 - UTC) * 15
        let sunLon = (12 - totalHours) * 15;

        // Normalizar a -180 a 180
        if (sunLon > 180) sunLon -= 360;
        if (sunLon < -180) sunLon += 360;

        // Declinación solar (aproximada para las estaciones)
        // Varía de -23.44 (Invierno N) a +23.44 (Verano N)
        const dayOfYear = this.getDayOfYear(date);
        const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

        // 2. Actualizar icono del sol
        // Mapear Lon (-180 a 180) a X (0% a 100%)
        // Mapear Lat (Declinación) a Y (0% a 100%)
        const sunX = ((sunLon + 180) / 360) * 100;
        const sunY = ((90 - declination) / 180) * 100; // Invertido porque Y=0 es Norte

        this.sunIcon.style.left = `${sunX}%`;
        this.sunIcon.style.top = `${sunY}%`;

        // 3. Generar Path de la Noche (Terminador)
        const pathData = this.calculateTerminatorPath(sunLon, declination);
        this.nightPath.setAttribute('d', pathData);
    }

    calculateTerminatorPath(sunLon, sunDec) {
        // Generar puntos a lo largo de la longitud (-180 a 180)
        const points = [];
        const step = 5; // Grados por paso (menor = más suave)

        const rad = Math.PI / 180;
        const tanDec = Math.tan(sunDec * rad);

        for (let lon = -180; lon <= 180; lon += step) {
            // Ecuación del terminador: tan(lat) = -cos(lon - sunLon) / tan(dec)
            // Pero cuidado con la división por cero si dec es 0 (equinoccio)

            const deltaLon = (lon - sunLon) * rad;
            let lat;

            if (Math.abs(sunDec) < 0.1) {
                // Cerca del equinoccio, el terminador es casi vertical
                // cos(deltaLon) > 0 es día, < 0 es noche
                lat = (Math.cos(deltaLon) > 0) ? -90 : 90;
                // Esto es una simplificación drástica, mejor usar la fórmula general con protección
            }

            // Fórmula general:
            // El terminador es el círculo máximo perpendicular a la dirección del sol.
            // Para un sol en (sunLon, sunDec), el punto en longitud 'lon' tiene latitud 'lat' tal que:
            // sin(lat)sin(dec) + cos(lat)cos(dec)cos(lon-sunLon) = 0
            // tan(lat) = -1 / (tan(dec) * cos(lon-sunLon))  <-- Esta es incorrecta

            // Correcta: tan(lat) = -cos(lon - sunLon) / tan(dec)
            // Espera, esta fórmula da la latitud del terminador para una longitud dada.

            try {
                lat = Math.atan(-Math.cos(deltaLon) / tanDec) * 180 / Math.PI;
            } catch (e) {
                lat = 0;
            }

            // Mapear a coordenadas SVG (2000x1000)
            const x = ((lon + 180) / 360) * 2000;
            const y = ((90 - lat) / 180) * 1000;
            points.push(`${x},${y}`);
        }

        // Cerrar el polígono para cubrir la parte oscura
        // Si es verano en el norte (Dec > 0), el polo norte tiene luz, la noche está "abajo" del terminador?
        // No, depende de la hora.
        // Estrategia robusta: Cerrar por arriba o por abajo dependiendo de la declinación y si es "noche"

        // Simplificación visual:
        // El terminador es una onda. Necesitamos cerrar el path por la parte "oscura".
        // La parte oscura es opuesta al sol.

        // Vamos a cerrar el path recorriendo el borde inferior y superior
        // Si el sol está "arriba" (verano norte), la oscuridad está "abajo" en el antimeridiano? No.

        // Truco: Añadir puntos de cierre fijos que cubran todo el fondo, y usar 'fill-rule: evenodd' 
        // o simplemente cerrar hacia el lado opuesto al sol.

        // Si Dec > 0 (Verano Norte), el Polo Norte está iluminado. La sombra cubre el Polo Sur.
        // Entonces cerramos por Y=1000 (Sur).

        const closeY = sunDec > 0 ? 1000 : 0;

        return `M ${points[0]} L ${points.join(' L ')} L 2000,${closeY} L 0,${closeY} Z`;
    }

    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
        this.container.innerHTML = '';
    }
}
