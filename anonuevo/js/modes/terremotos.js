import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class TerremotosMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.markers = [];
        this.updateInterval = null;
    }

    async mount() {
        console.log('[Terremotos] Montando página de terremotos con API...');
        
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
        
        // Crear mapa con Leaflet
        this.createMap();
        
        // Cargar datos iniciales
        await this.loadEarthquakes();
        
        // Actualizar cada 60 segundos
        this.updateInterval = setInterval(() => {
            this.loadEarthquakes();
        }, 60000);
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    createMap() {
        // Crear contenedor del mapa
        const mapContainer = document.createElement('div');
        mapContainer.id = 'earthquake-map';
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.position = 'absolute';
        mapContainer.style.top = '0';
        mapContainer.style.left = '0';
        this.container.appendChild(mapContainer);

        // Cargar Leaflet dinámicamente
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
        this.map = L.map('earthquake-map').setView([20, 0], 2);
        
        // Agregar capa de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadEarthquakes() {
        try {
            // USGS API - terremotos de las últimas 24 horas, magnitud 2.5+
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
            const data = await response.json();
            
            // Limpiar marcadores anteriores
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers = [];
            
            // Agregar marcadores para cada terremoto
            data.features.forEach(feature => {
                const [longitude, latitude] = feature.geometry.coordinates;
                const magnitude = feature.properties.mag;
                const place = feature.properties.place;
                const time = new Date(feature.properties.time);
                
                // Color según magnitud
                let color = '#00ff00'; // Verde para pequeños
                if (magnitude >= 5) color = '#ff0000'; // Rojo para grandes
                else if (magnitude >= 4) color = '#ff8800'; // Naranja para medianos
                else if (magnitude >= 3) color = '#ffff00'; // Amarillo
                
                // Tamaño del círculo según magnitud
                const radius = Math.max(5, magnitude * 3);
                
                const circle = L.circleMarker([latitude, longitude], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.7
                }).addTo(this.map);
                
                // Tooltip con información
                circle.bindPopup(`
                    <strong>Magnitud: ${magnitude.toFixed(1)}</strong><br>
                    ${place}<br>
                    ${time.toLocaleString('es-ES')}
                `);
                
                this.markers.push(circle);
            });
            
            console.log(`[Terremotos] Cargados ${data.features.length} terremotos`);
        } catch (error) {
            console.error('[Terremotos] Error cargando datos:', error);
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando la actividad sísmica de nuestro planeta en tiempo real. Cada punto que aparece es un terremoto, un recordatorio de las fuerzas titánicas que moldean nuestro mundo. La Tierra está viva, respirando, moviéndose constantemente bajo nuestros pies.';
        
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
                console.warn('[Terremotos] Error generando texto completo:', e);
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
            // Obtener estadísticas de los terremotos cargados
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
            const data = await response.json();
            const count = data.features.length;
            const maxMagnitude = Math.max(...data.features.map(f => f.properties.mag));
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de terremotos en tiempo real que muestra ${count} terremotos en las últimas 24 horas, con el más grande de magnitud ${maxMagnitude.toFixed(1)}.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la Tierra está constantemente en movimiento
- Las fuerzas titánicas que moldean nuestro planeta
- La fragilidad de la humanidad frente a estas fuerzas
- La belleza y el poder de la naturaleza
- La conciencia de vivir en un planeta geológicamente activo

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
            console.warn('[Terremotos] Error generando narrativa:', e);
        }
        
        return `Cada punto que aparece aquí es un recordatorio de que vivimos en un planeta vivo, en constante movimiento. Las placas tectónicas se desplazan, chocan, se separan, creando montañas y océanos. Estos terremotos son la respiración profunda de la Tierra, fuerzas titánicas que moldean nuestro mundo. Nos recuerdan nuestra fragilidad, pero también la increíble resiliencia de la vida que se adapta y persiste frente a estas fuerzas colosales.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Terremotos] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima'];
                    const currentPage = 'terremotos';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Terremotos] 🎲 Navegando a: ${randomPage}`);
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
