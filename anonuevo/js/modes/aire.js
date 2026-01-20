import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class AireMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.markers = [];
        this.updateInterval = null;
        this.animationFrame = null;
    }

    async mount() {
        console.log('[Aire] Montando página de calidad del aire con API...');
        
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
        await this.loadAirQuality();
        
        // Actualizar cada 2 minutos
        this.updateInterval = setInterval(() => {
            this.loadAirQuality();
        }, 120000);
        
        // Iniciar animaciones
        this.startAnimations();
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    // Targets sugeridos para el director de cámara global (Leaflet)
    getCinematicTargets() {
        const targets = [];
        try {
            const sample = (this.markers || []).slice(0, 10);
            sample.forEach(m => {
                const ll = m?.getLatLng?.();
                if (ll) targets.push({ lat: ll.lat, lon: ll.lng, closeZoom: 5, sweepZoom: 4, driftDeg: 3.5 });
            });
        } catch (e) { }
        try {
            const c = this.map?.getCenter?.();
            if (c) targets.push({ lat: c.lat, lon: c.lng, wideZoom: 2, medZoom: 3, driftDeg: 4.0 });
        } catch (e) { }
        return targets;
    }

    createMap() {
        const mapContainer = document.createElement('div');
        mapContainer.id = 'air-quality-map';
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
        this.map = L.map('air-quality-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadAirQuality() {
        try {
            // OpenAQ API - obtener datos de calidad del aire de ciudades principales
            // Usar varios países para tener buena cobertura
            const countries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'BR', 'AR', 'MX', 'CL', 'CO', 'PE', 'IN', 'CN', 'JP', 'AU'];
            
            const promises = countries.map(country => 
                fetch(`https://api.openaq.org/v2/latest?limit=10&page=1&country_id=${country}&order_by=lastUpdated&sort=desc`)
                    .then(r => r.json())
                    .then(data => data.results || [])
                    .catch(() => [])
            );
            
            const allResults = await Promise.all(promises);
            const locations = allResults.flat().slice(0, 100); // Limitar a 100 estaciones
            
            // Limpiar marcadores anteriores
            this.markers.forEach(marker => {
                if (this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.markers = [];
            
            locations.forEach(location => {
                if (!location.coordinates || !location.coordinates.latitude || !location.coordinates.longitude) return;
                
                const lat = location.coordinates.latitude;
                const lon = location.coordinates.longitude;
                const city = location.city || location.name || 'Desconocido';
                const country = location.country || 'N/A';
                
                // Obtener el AQI más reciente (PM2.5 o PM10)
                let aqi = null;
                let parameter = null;
                let value = null;
                
                if (location.measurements && location.measurements.length > 0) {
                    // Buscar PM2.5 primero, luego PM10
                    const pm25 = location.measurements.find(m => m.parameter === 'pm25');
                    const pm10 = location.measurements.find(m => m.parameter === 'pm10');
                    const measurement = pm25 || pm10;
                    
                    if (measurement) {
                        parameter = measurement.parameter;
                        value = measurement.value;
                        // Calcular AQI aproximado (simplificado)
                        if (parameter === 'pm25') {
                            aqi = this.pm25ToAQI(value);
                        } else if (parameter === 'pm10') {
                            aqi = this.pm10ToAQI(value);
                        }
                    }
                }
                
                if (!aqi) return; // Saltar si no hay datos válidos
                
                // Color según AQI
                let color = '#00ff00'; // Verde - Bueno
                if (aqi >= 300) color = '#800080'; // Morado - Peligroso
                else if (aqi >= 200) color = '#ff0000'; // Rojo - Muy insalubre
                else if (aqi >= 150) color = '#ff6600'; // Naranja - Insalubre
                else if (aqi >= 100) color = '#ffff00'; // Amarillo - Moderado
                else if (aqi >= 50) color = '#88ff00'; // Verde amarillento - Aceptable
                
                // Tamaño según AQI
                const radius = Math.max(6, Math.min(20, 8 + (aqi / 20)));
                
                const marker = L.circleMarker([lat, lon], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);
                
                const aqiLabel = this.getAQILabel(aqi);
                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                        <strong style="color: ${color}; font-size: 1.2em;">${city}</strong><br>
                        <strong>${country}</strong><br>
                        <strong style="font-size: 1.3em;">AQI: ${aqi}</strong> (${aqiLabel})<br>
                        ${parameter ? `${parameter.toUpperCase()}: ${value.toFixed(1)} µg/m³` : ''}
                    </div>
                `);
                
                this.markers.push(marker);
            });
            
            console.log(`[Aire] Cargados ${this.markers.length} estaciones de calidad del aire`);
        } catch (error) {
            console.error('[Aire] Error cargando datos:', error);
        }
    }

    pm25ToAQI(pm25) {
        // Conversión simplificada de PM2.5 a AQI
        if (pm25 <= 12) return Math.round((50 / 12) * pm25);
        if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12)) * (pm25 - 12) + 51);
        if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.4)) * (pm25 - 35.4) + 101);
        if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.4)) * (pm25 - 55.4) + 151);
        if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.4)) * (pm25 - 150.4) + 201);
        return Math.round(((400 - 301) / (350.4 - 250.4)) * (pm25 - 250.4) + 301);
    }

    pm10ToAQI(pm10) {
        // Conversión simplificada de PM10 a AQI
        if (pm10 <= 54) return Math.round((50 / 54) * pm10);
        if (pm10 <= 154) return Math.round(((100 - 51) / (154 - 54)) * (pm10 - 54) + 51);
        if (pm10 <= 254) return Math.round(((150 - 101) / (254 - 154)) * (pm10 - 154) + 101);
        if (pm10 <= 354) return Math.round(((200 - 151) / (354 - 254)) * (pm10 - 254) + 151);
        if (pm10 <= 424) return Math.round(((300 - 201) / (424 - 354)) * (pm10 - 354) + 201);
        return Math.round(((400 - 301) / (504 - 424)) * (pm10 - 424) + 301);
    }

    getAQILabel(aqi) {
        if (aqi <= 50) return 'Bueno';
        if (aqi <= 100) return 'Moderado';
        if (aqi <= 150) return 'Insalubre para grupos sensibles';
        if (aqi <= 200) return 'Insalubre';
        if (aqi <= 300) return 'Muy insalubre';
        return 'Peligroso';
    }

    startAnimations() {
        const animate = () => {
            // Animar pulsos en los marcadores
            this.markers.forEach((marker, index) => {
                const time = Date.now() + (index * 100);
                const pulse = 0.85 + 0.15 * Math.sin(time / 1000);
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
        
        const immediateText = 'Estoy observando la calidad del aire de nuestro planeta en tiempo real. Cada punto muestra una estación de monitoreo, los colores indican la calidad del aire: verde es bueno, amarillo moderado, naranja insalubre, rojo muy insalubre. El aire que respiramos conecta a toda la humanidad.';
        
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
                console.warn('[Aire] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de calidad del aire en tiempo real que muestra estaciones de monitoreo alrededor del mundo. Los colores indican la calidad del aire: verde es bueno, amarillo moderado, naranja insalubre, rojo muy insalubre.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo el aire que respiramos conecta a toda la humanidad
- La importancia de la calidad del aire para la vida
- Cómo la contaminación afecta a todos por igual
- La responsabilidad compartida de proteger nuestro aire
- La belleza de respirar aire limpio
- La conciencia planetaria que esto genera

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
            console.warn('[Aire] Error generando narrativa:', e);
        }
        
        return `El aire que respiramos es invisible pero esencial, conectando a todos los seres vivos del planeta. Cada punto que veo aquí representa una estación que monitorea la calidad de este recurso vital. Los colores me dicen una historia: verde donde el aire es limpio, rojo donde está contaminado. Es un recordatorio de que compartimos el mismo aire, que lo que afecta a uno puede afectar a todos. La calidad del aire no conoce fronteras, es un bien común que debemos proteger juntos.`;
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('aire');
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
