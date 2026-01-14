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
        this.updateInterval = null;
    }

    async mount() {
        console.log('[Aéreo] Montando página de tráfico aéreo con API...');
        
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
        
        await this.startNarration();
        this.scheduleNextPage();
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
        this.map = L.map('flights-map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadFlights() {
        try {
            // OpenSky Network API - estados de vuelos en tiempo real
            const response = await fetch('https://opensky-network.org/api/states/all');
            const data = await response.json();
            
            if (!data.states || data.states.length === 0) {
                console.warn('[Aéreo] No hay datos de vuelos disponibles');
                return;
            }
            
            // Limpiar marcadores anteriores
            this.markers.forEach(marker => {
                if (this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.markers = [];
            
            // Limitar a 500 vuelos para rendimiento
            const flights = data.states.slice(0, 500);
            
            flights.forEach(state => {
                // Formato: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, ...]
                const [icao24, callsign, originCountry, , , lon, lat, altitude, velocity, heading] = state;
                
                if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;
                
                // Color según velocidad
                let color = '#00ff00'; // Verde para vuelos lentos
                if (velocity > 800) color = '#ff0000'; // Rojo para vuelos rápidos
                else if (velocity > 600) color = '#ff8800'; // Naranja
                else if (velocity > 400) color = '#ffff00'; // Amarillo
                
                const marker = L.circleMarker([lat, lon], {
                    radius: 4,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                }).addTo(this.map);
                
                const callsignText = callsign ? callsign.trim() : 'N/A';
                const altitudeText = altitude ? `${Math.round(altitude)}m` : 'N/A';
                const velocityText = velocity ? `${Math.round(velocity * 3.6)} km/h` : 'N/A';
                
                marker.bindPopup(`
                    <strong>${callsignText}</strong><br>
                    País: ${originCountry || 'N/A'}<br>
                    Altitud: ${altitudeText}<br>
                    Velocidad: ${velocityText}
                `);
                
                this.markers.push(marker);
            });
            
            console.log(`[Aéreo] Cargados ${flights.length} vuelos`);
        } catch (error) {
            console.error('[Aéreo] Error cargando vuelos:', error);
            // Fallback: mostrar mensaje
            if (this.map) {
                L.popup()
                    .setLatLng([20, 0])
                    .setContent('Error cargando datos de vuelos. Intentando de nuevo...')
                    .openOn(this.map);
            }
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el tráfico aéreo global en tiempo real. Miles de aviones volando simultáneamente alrededor del mundo, conectando continentes, transportando personas, mercancías y esperanzas. Este es el pulso de la humanidad, la red invisible que nos une.';
        
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
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de tráfico aéreo en tiempo real que muestra ${flightCount} aviones volando simultáneamente alrededor del mundo.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la aviación conecta la humanidad
- La red invisible de conexiones aéreas
- El movimiento constante de personas y mercancías
- La tecnología que hace posible esto
- La conciencia de un mundo interconectado

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
        
        return `Cada punto que veo aquí es un avión, cada línea es una ruta, cada movimiento es una historia. Millones de personas volando simultáneamente, cruzando océanos y continentes en horas. Esta red aérea es el sistema circulatorio de nuestra civilización global, conectando culturas, economías y familias. Es un recordatorio constante de que, aunque estemos separados por distancias, estamos más conectados que nunca.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Aéreo] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'terremotos', 'satelites'];
                    const currentPage = 'aereo';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Aéreo] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000 + Math.random() * 20000);
        }
    }

    unmount() {
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
