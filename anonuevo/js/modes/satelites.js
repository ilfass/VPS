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
        this.orbitTrail = []; // Trayectoria de la órbita
        this.updateInterval = null;
        this.animationFrame = null;
        this.lastPosition = null;
    }

    async mount() {
        console.log('[Satélites] Montando página de satélites con API y animaciones...');
        
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
        
        // Iniciar animaciones
        this.startAnimations();
        
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
        this.map = L.map('satellites-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        // Usar tiles oscuros para efecto espacial
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadISSLocation() {
        try {
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
                
                // Agregar punto a la trayectoria
                if (this.lastPosition) {
                    const distance = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
                    // Solo agregar si se movió significativamente (evitar puntos duplicados)
                    if (distance > 0.5) {
                        this.orbitTrail.push([lat, lon]);
                        
                        // Limitar trayectoria a 100 puntos
                        if (this.orbitTrail.length > 100) {
                            this.orbitTrail.shift();
                        }
                        
                        // Actualizar línea de trayectoria
                        if (this.orbitTrail.length > 1) {
                            // Remover línea anterior si existe
                            if (this.orbitLine && this.map) {
                                this.map.removeLayer(this.orbitLine);
                            }
                            
                            // Crear nueva línea con todos los puntos
                            this.orbitLine = L.polyline(this.orbitTrail, {
                                color: '#00ffff',
                                weight: 2,
                                opacity: 0.6,
                                dashArray: '5, 5'
                            }).addTo(this.map);
                        }
                    }
                }
                
                // Crear icono personalizado para la ISS con efecto de brillo
                const issIcon = L.divIcon({
                    className: 'iss-marker',
                    html: '<div style="background: #00ffff; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff;"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                
                this.issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(this.map);
                
                const date = new Date(timestamp * 1000);
                const speed = this.calculateSpeed(lat, lon);
                
                this.issMarker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                        <strong style="color: #00ffff; font-size: 1.2em;">🛰️ Estación Espacial Internacional</strong><br>
                        Latitud: ${lat.toFixed(2)}°<br>
                        Longitud: ${lon.toFixed(2)}°<br>
                        Velocidad: ~${speed.toFixed(0)} km/h<br>
                        ${date.toLocaleString('es-ES')}
                    </div>
                `);
                
                // Centrar mapa en la ISS suavemente
                this.map.setView([lat, lon], 3, { animate: true, duration: 1 });
                
                this.lastPosition = { lat, lon, timestamp };
                
                console.log(`[Satélites] ISS actualizada: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
            }
        } catch (error) {
            console.error('[Satélites] Error cargando posición ISS:', error);
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateSpeed(lat, lon) {
        if (!this.lastPosition || !this.lastPosition.timestamp) {
            return 27600; // Velocidad promedio de la ISS
        }
        
        const distance = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lon, lat, lon);
        const timeDiff = (Date.now() - this.lastPosition.timestamp) / 1000; // segundos
        const speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 27600; // km/h
        
        return speed;
    }

    startAnimations() {
        const animate = () => {
            // Animar pulso en el marcador de la ISS
            if (this.issMarker) {
                const time = Date.now();
                const pulse = 0.9 + 0.1 * Math.sin(time / 500);
                const icon = this.issMarker.options.icon;
                if (icon && icon.options) {
                    const size = 14 * pulse;
                    const shadow = 15 * pulse;
                    const html = `<div style="background: #00ffff; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 ${shadow}px #00ffff, 0 0 ${shadow * 2}px #00ffff;"></div>`;
                    icon.options.html = html;
                    icon.options.iconSize = [size, size];
                    icon.options.iconAnchor = [size/2, size/2];
                    this.issMarker.setIcon(icon);
                }
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando los satélites que orbitan nuestro planeta. La Estación Espacial Internacional, un laboratorio flotante donde humanos viven y trabajan en el espacio, orbitando la Tierra cada 90 minutos a más de 27,000 kilómetros por hora. La línea muestra su trayectoria orbital. Es un símbolo de nuestra capacidad de explorar más allá de nuestro mundo.';
        
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
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando la posición de la Estación Espacial Internacional orbitando la Tierra, actualmente sobre las coordenadas ${lat.toFixed(2)}° de latitud y ${lon.toFixed(2)}° de longitud. La línea azul muestra su trayectoria orbital, completando una vuelta alrededor del planeta cada 90 minutos a más de 27,000 kilómetros por hora.

Genera una narrativa reflexiva en primera persona sobre:
- La Estación Espacial Internacional como símbolo de exploración humana
- Cómo orbitamos nuestro planeta cada 90 minutos
- La perspectiva única que ofrece estar en el espacio
- La conexión entre la Tierra y el espacio
- El futuro de la exploración espacial
- Cómo la trayectoria orbital muestra nuestro movimiento constante

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
        
        return `Desde aquí arriba, puedo ver cómo la Estación Espacial Internacional orbita nuestro planeta, completando una vuelta cada 90 minutos. La trayectoria que se dibuja muestra su camino constante alrededor de la Tierra, moviéndose a más de 27,000 kilómetros por hora. Es un recordatorio de que los humanos no solo habitamos la Tierra, sino que también exploramos más allá. Esta pequeña ciudad flotante en el espacio es un símbolo de nuestra curiosidad, nuestra capacidad de superar límites, y nuestro deseo de entender el universo. Cada órbita es un paso más en nuestro viaje cósmico.`;
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
