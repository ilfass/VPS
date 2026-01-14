import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class SatelitesMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.issMarker = null;
        this.updateInterval = null;
    }

    async mount() {
        console.log('[Satélites] Montando página de satélites con API...');
        
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
        await this.loadISSLocation();
        
        // Actualizar cada 5 segundos (ISS se mueve rápido)
        this.updateInterval = setInterval(() => {
            this.loadISSLocation();
        }, 5000);
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    createMap() {
        const mapContainer = document.createElement('div');
        mapContainer.id = 'satellites-map';
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
        this.map = L.map('satellites-map').setView([20, 0], 2);
        
        // Usar tiles oscuros para efecto espacial
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadISSLocation() {
        try {
            // ISS Location API - posición actual de la Estación Espacial Internacional
            const response = await fetch('http://api.open-notify.org/iss-now.json');
            const data = await response.json();
            
            if (data.iss_position) {
                const lat = parseFloat(data.iss_position.latitude);
                const lon = parseFloat(data.iss_position.longitude);
                const timestamp = data.timestamp;
                
                // Remover marcador anterior
                if (this.issMarker && this.map) {
                    this.map.removeLayer(this.issMarker);
                }
                
                // Crear icono personalizado para la ISS
                const issIcon = L.divIcon({
                    className: 'iss-marker',
                    html: '<div style="background: #00ffff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px #00ffff;"></div>',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                
                this.issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(this.map);
                
                const date = new Date(timestamp * 1000);
                this.issMarker.bindPopup(`
                    <strong>Estación Espacial Internacional</strong><br>
                    Latitud: ${lat.toFixed(2)}°<br>
                    Longitud: ${lon.toFixed(2)}°<br>
                    ${date.toLocaleString('es-ES')}
                `);
                
                // Centrar mapa en la ISS
                this.map.setView([lat, lon], 3);
                
                console.log(`[Satélites] ISS actualizada: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
            }
        } catch (error) {
            console.error('[Satélites] Error cargando posición ISS:', error);
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando los satélites que orbitan nuestro planeta. La Estación Espacial Internacional, un laboratorio flotante donde humanos viven y trabajan en el espacio, orbitando la Tierra cada 90 minutos. Es un símbolo de nuestra capacidad de explorar más allá de nuestro mundo.';
        
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
                console.warn('[Satélites] Error generando texto completo:', e);
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
            const response = await fetch('http://api.open-notify.org/iss-now.json');
            const data = await response.json();
            const lat = data.iss_position ? parseFloat(data.iss_position.latitude) : 0;
            const lon = data.iss_position ? parseFloat(data.iss_position.longitude) : 0;
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando la posición de la Estación Espacial Internacional orbitando la Tierra, actualmente sobre las coordenadas ${lat.toFixed(2)}° de latitud y ${lon.toFixed(2)}° de longitud.

Genera una narrativa reflexiva en primera persona sobre:
- La Estación Espacial Internacional como símbolo de exploración humana
- Cómo orbitamos nuestro planeta cada 90 minutos
- La perspectiva única que ofrece estar en el espacio
- La conexión entre la Tierra y el espacio
- El futuro de la exploración espacial

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
            console.warn('[Satélites] Error generando narrativa:', e);
        }
        
        return `Desde aquí arriba, puedo ver cómo la Estación Espacial Internacional orbita nuestro planeta, completando una vuelta cada 90 minutos. Es un recordatorio de que los humanos no solo habitamos la Tierra, sino que también exploramos más allá. Esta pequeña ciudad flotante en el espacio es un símbolo de nuestra curiosidad, nuestra capacidad de superar límites, y nuestro deseo de entender el universo. Cada órbita es un paso más en nuestro viaje cósmico.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Satélites] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'clima', 'aereo', 'terremotos'];
                    const currentPage = 'satelites';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Satélites] 🎲 Navegando a: ${randomPage}`);
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
