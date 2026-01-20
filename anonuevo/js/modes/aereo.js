import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class AereoMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.markers = [];
        this.trails = []; // Trayectorias de vuelos
        this.flightData = new Map(); // Almacenar datos anteriores para calcular trayectorias
        this.updateInterval = null;
        this.animationFrame = null;
        this.lastRefreshAt = 0;
    }

    async mount() {
        console.log('[Aéreo] Montando página de tráfico aéreo con API y animaciones...');
        
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        this.container.innerHTML = '';
        
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        this.createMap();
        await this.loadFlights();
        
        // Actualizar cada 30 segundos (límite de OpenSky: 10 req/min sin auth)
        this.updateInterval = setInterval(() => {
            this.loadFlights();
        }, 30000);
        
        // Iniciar animaciones
        this.startAnimations();
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    // Targets sugeridos para el director de cámara global (Leaflet)
    getCinematicTargets() {
        // Intentar usar algunos vuelos para “tomas” más dinámicas
        const targets = [];
        try {
            if (this.flightData && this.flightData.size) {
                let i = 0;
                for (const v of this.flightData.values()) {
                    if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon)) {
                        targets.push({ lat: v.lat, lon: v.lon, closeZoom: 5, sweepZoom: 4, driftDeg: 2.8 });
                        i++;
                        if (i >= 6) break;
                    }
                }
            }
        } catch (e) { }
        // Fallback: centro del mapa
        try {
            const c = this.map?.getCenter?.();
            if (c) targets.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 4.0 });
        } catch (e) { }
        return targets;
    }

    createMap() {
        const mapContainer = document.createElement('div');
        mapContainer.id = 'flights-map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.position = 'absolute';
        mapContainer.style.top = '0';
        mapContainer.style.left = '0';
        this.container.appendChild(mapContainer);

        if (!window.L) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                this.initMap();
            };
            document.body.appendChild(script);
        } else {
            this.initMap();
        }
    }

    initMap() {
        this.map = L.map('flights-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        // Tiles oscuros para mejor contraste con puntos de vuelo
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadFlights() {
        try {
            const response = await fetch('https://opensky-network.org/api/states/all');
            const data = await response.json();
            
            if (!data.states || data.states.length === 0) {
                console.warn('[Aéreo] No hay datos de vuelos disponibles');
                return;
            }
            
            // Limpiar marcadores y trayectorias anteriores
            this.markers.forEach(marker => {
                if (this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.trails.forEach(trail => {
                if (this.map) {
                    this.map.removeLayer(trail);
                }
            });
            
            const newMarkers = [];
            const newTrails = [];
            const newFlightData = new Map();
            
            // Limitar a 300 vuelos para mejor rendimiento y visualización
            const flights = data.states.slice(0, 300);
            this.lastRefreshAt = Date.now();
            
            flights.forEach(state => {
                const [icao24, callsign, originCountry, , , lon, lat, altitude, velocity, heading, verticalRate] = state;
                
                if (!lat || !lon || isNaN(lat) || isNaN(lon) || !icao24) return;
                
                // Obtener datos anteriores para calcular trayectoria
                const previousData = this.flightData.get(icao24);
                
                // Color según velocidad y altitud
                let color = '#00ff00'; // Verde para vuelos lentos/bajos
                if (velocity > 800 || (altitude && altitude > 10000)) {
                    color = '#ff0000'; // Rojo para vuelos rápidos/altos
                } else if (velocity > 600 || (altitude && altitude > 8000)) {
                    color = '#ff8800'; // Naranja
                } else if (velocity > 400 || (altitude && altitude > 5000)) {
                    color = '#ffff00'; // Amarillo
                }
                
                // Tamaño según altitud
                const radius = altitude ? Math.max(3, Math.min(8, 4 + (altitude / 5000))) : 4;
                
                // Crear marcador con dirección
                const marker = L.circleMarker([lat, lon], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);
                
                // Agregar trayectoria si hay datos anteriores
                if (previousData && previousData.lat && previousData.lon) {
                    const distance = this.calculateDistance(previousData.lat, previousData.lon, lat, lon);
                    // Solo mostrar trayectoria si el vuelo se movió significativamente
                    if (distance > 0.1) {
                        const trail = L.polyline(
                            [[previousData.lat, previousData.lon], [lat, lon]],
                            {
                                color: color,
                                weight: 1,
                                opacity: 0.4,
                                dashArray: '3, 3'
                            }
                        ).addTo(this.map);
                        newTrails.push(trail);
                    }
                }
                
                const callsignText = callsign ? callsign.trim() : icao24.substring(0, 6);
                const altitudeText = altitude ? `${Math.round(altitude)}m` : 'N/A';
                const velocityText = velocity ? `${Math.round(velocity * 3.6)} km/h` : 'N/A';
                const verticalRateText = verticalRate ? (verticalRate > 0 ? `↑${Math.round(verticalRate)}` : `↓${Math.abs(Math.round(verticalRate))}`) : '';
                
                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
                        <strong style="color: ${color};">✈️ ${callsignText}</strong><br>
                        País: ${originCountry || 'N/A'}<br>
                        Altitud: ${altitudeText} ${verticalRateText}<br>
                        Velocidad: ${velocityText}<br>
                        ${heading ? `Rumbo: ${Math.round(heading)}°` : ''}
                    </div>
                `);
                
                newMarkers.push(marker);
                
                // Guardar datos actuales para próxima actualización
                newFlightData.set(icao24, { lat, lon, altitude, velocity, heading, timestamp: Date.now() });
            });
            
            // Limpiar datos antiguos (más de 2 minutos)
            const now = Date.now();
            this.flightData.forEach((data, icao24) => {
                if (now - data.timestamp > 120000) {
                    this.flightData.delete(icao24);
                }
            });
            
            // Actualizar con nuevos datos
            newFlightData.forEach((data, icao24) => {
                this.flightData.set(icao24, data);
            });
            
            this.markers = newMarkers;
            this.trails = newTrails;
            
            console.log(`[Aéreo] Cargados ${flights.length} vuelos con trayectorias`);
        } catch (error) {
            console.error('[Aéreo] Error cargando vuelos:', error);
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    startAnimations() {
        const animate = () => {
            // Animar pulsos en los marcadores
            this.markers.forEach((marker, index) => {
                const time = Date.now() + (index * 50);
                const pulse = 0.85 + 0.15 * Math.sin(time / 800);
                const currentRadius = marker.options.radius * pulse;
                marker.setRadius(currentRadius);
            });
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el tráfico aéreo global en tiempo real. Miles de aviones volando simultáneamente alrededor del mundo, conectando continentes, transportando personas, mercancías y esperanzas. Las líneas muestran las trayectorias de los vuelos. Este es el pulso de la humanidad, la red invisible que nos une.';
        
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        const generateFullTextPromise = this.generateFullNarrative();
        
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Aéreo] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const response = await fetch('https://opensky-network.org/api/states/all');
            const data = await response.json();
            const flightCount = data.states ? data.states.length : 0;
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de tráfico aéreo en tiempo real que muestra ${flightCount} aviones volando simultáneamente alrededor del mundo. Las líneas muestran las trayectorias de los vuelos, los colores indican velocidad y altitud.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la aviación conecta la humanidad
- La red invisible de conexiones aéreas
- El movimiento constante de personas y mercancías
- La tecnología que hace posible esto
- La conciencia de un mundo interconectado
- Cómo cada línea es una historia de conexión

El texto debe ser reflexivo, poético y entre 150 y 220 palabras.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Aéreo] Error generando narrativa:', e);
        }
        
        return `Cada punto que veo aquí es un avión, cada línea es una ruta, cada movimiento es una historia. Millones de personas volando simultáneamente, cruzando océanos y continentes en horas. Las trayectorias que se dibujan muestran el flujo constante de conexiones humanas. Esta red aérea es el sistema circulatorio de nuestra civilización global, conectando culturas, economías y familias. Es un recordatorio constante de que, aunque estemos separados por distancias, estamos más conectados que nunca.`;
    }

    // Contexto para recaps (ranking/dato sorpresa)
    getRecapContext() {
        try {
            if (!this.flightData || this.flightData.size === 0) return null;
            const vals = Array.from(this.flightData.values())
                .filter(v => v && Number.isFinite(v.velocity) || Number.isFinite(v.altitude));

            const count = this.flightData.size;
            const speeds = vals
                .filter(v => Number.isFinite(v.velocity))
                .map(v => v.velocity * 3.6); // km/h
            const alts = vals
                .filter(v => Number.isFinite(v.altitude))
                .map(v => v.altitude); // m

            const topSpeed = [...vals]
                .filter(v => Number.isFinite(v.velocity))
                .sort((a, b) => (b.velocity || 0) - (a.velocity || 0))
                .slice(0, 3)
                .map(v => ({ speedKmh: Math.round(v.velocity * 3.6), lat: v.lat, lon: v.lon }));

            const topAlt = [...vals]
                .filter(v => Number.isFinite(v.altitude))
                .sort((a, b) => (b.altitude || 0) - (a.altitude || 0))
                .slice(0, 3)
                .map(v => ({ altitudeM: Math.round(v.altitude), lat: v.lat, lon: v.lon }));

            const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
            const maxSpeed = speeds.length ? Math.max(...speeds) : null;
            const maxAlt = alts.length ? Math.max(...alts) : null;

            return {
                flightsTracked: count,
                avgSpeedKmh: avgSpeed ? Number(avgSpeed.toFixed(0)) : null,
                maxSpeedKmh: maxSpeed ? Number(maxSpeed.toFixed(0)) : null,
                maxAltitudeM: maxAlt ? Number(maxAlt.toFixed(0)) : null,
                top3Fastest: topSpeed,
                top3Highest: topAlt
            };
        } catch (e) {
            return null;
        }
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('aereo');
    }

    unmount() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.map) {
            this.map.remove();
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
