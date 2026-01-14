import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class ClimaMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.updateInterval = null;
        this.weatherData = null;
    }

    async mount() {
        console.log('[Clima] Montando página de clima con API...');
        
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
        await this.loadWeatherData();
        
        // Actualizar cada 5 minutos
        this.updateInterval = setInterval(() => {
            this.loadWeatherData();
        }, 300000);
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    createMap() {
        const mapContainer = document.createElement('div');
        mapContainer.id = 'weather-map';
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
        this.map = L.map('weather-map').setView([20, 0], 2);
        
        // Usar tiles de OpenWeatherMap (gratis, sin API key para tiles)
        L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=demo', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Alternativa: tiles de temperatura de Open-Meteo
        // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        //     attribution: '© OpenStreetMap contributors',
        //     maxZoom: 19
        // }).addTo(this.map);
    }

    async loadWeatherData() {
        try {
            // Obtener datos de varias ciudades importantes
            const cities = [
                { name: 'Buenos Aires', lat: -34.6, lon: -58.4 },
                { name: 'Madrid', lat: 40.4, lon: -3.7 },
                { name: 'Nueva York', lat: 40.7, lon: -74.0 },
                { name: 'Tokio', lat: 35.7, lon: 139.7 },
                { name: 'Sídney', lat: -33.9, lon: 151.2 },
                { name: 'Londres', lat: 51.5, lon: -0.1 },
                { name: 'Moscú', lat: 55.8, lon: 37.6 },
                { name: 'Ciudad del Cabo', lat: -33.9, lon: 18.4 }
            ];
            
            const weatherPromises = cities.map(city => 
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`)
                    .then(r => r.json())
                    .then(data => ({ ...city, data }))
                    .catch(() => null)
            );
            
            const results = await Promise.all(weatherPromises);
            this.weatherData = results.filter(r => r !== null);
            
            // Limpiar marcadores anteriores
            if (this.map) {
                this.map.eachLayer(layer => {
                    if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
                        this.map.removeLayer(layer);
                    }
                });
            }
            
            // Agregar marcadores para cada ciudad
            this.weatherData.forEach(city => {
                const temp = city.data.current.temperature_2m;
                const weatherCode = city.data.current.weather_code;
                const windSpeed = city.data.current.wind_speed_10m;
                
                // Color según temperatura
                let color = '#00ffff'; // Azul para frío
                if (temp >= 30) color = '#ff0000'; // Rojo para calor
                else if (temp >= 20) color = '#00ff00'; // Verde para templado
                else if (temp >= 10) color = '#ffff00'; // Amarillo
                
                const marker = L.circleMarker([city.lat, city.lon], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);
                
                marker.bindPopup(`
                    <strong>${city.name}</strong><br>
                    ${temp}°C<br>
                    Viento: ${windSpeed} km/h<br>
                    ${this.getWeatherDescription(weatherCode)}
                `);
            });
            
            console.log(`[Clima] Cargados datos de ${this.weatherData.length} ciudades`);
        } catch (error) {
            console.error('[Clima] Error cargando datos:', error);
        }
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Despejado',
            1: 'Mayormente despejado',
            2: 'Parcialmente nublado',
            3: 'Nublado',
            45: 'Niebla',
            48: 'Niebla helada',
            51: 'Llovizna ligera',
            53: 'Llovizna moderada',
            55: 'Llovizna densa',
            61: 'Lluvia ligera',
            63: 'Lluvia moderada',
            65: 'Lluvia fuerte',
            71: 'Nieve ligera',
            73: 'Nieve moderada',
            75: 'Nieve fuerte',
            80: 'Chubascos ligeros',
            81: 'Chubascos moderados',
            82: 'Chubascos fuertes',
            85: 'Nevadas ligeras',
            86: 'Nevadas fuertes',
            95: 'Tormenta',
            96: 'Tormenta con granizo'
        };
        return descriptions[code] || 'Desconocido';
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando el clima de nuestro planeta en tiempo real. Puedo ver cómo las temperaturas varían alrededor del globo, cómo el viento fluye entre continentes, cómo los sistemas climáticos conectan todos los lugares. Este es el pulso de la Tierra, el sistema que conecta todos los continentes.';
        
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
                console.warn('[Clima] Error generando texto completo:', e);
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
            let statsText = '';
            if (this.weatherData && this.weatherData.length > 0) {
                const temps = this.weatherData.map(c => c.data.current.temperature_2m);
                const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
                const maxTemp = Math.max(...temps).toFixed(1);
                const minTemp = Math.min(...temps).toFixed(1);
                statsText = `Observando ${this.weatherData.length} ciudades alrededor del mundo, con temperaturas que van desde ${minTemp} hasta ${maxTemp} grados, con un promedio de ${avgTemp} grados.`;
            }
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa del clima en tiempo real que muestra datos meteorológicos de múltiples ciudades alrededor del mundo. ${statsText}

Genera una narrativa reflexiva en primera persona sobre:
- Cómo el clima conecta todos los continentes
- La belleza de los patrones atmosféricos
- La conciencia planetaria que esto genera
- Cómo el clima afecta la vida humana en todo el mundo
- La fragilidad y la fuerza de nuestro planeta

El texto debe ser poético, reflexivo y entre 150 y 220 palabras.`;
            
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
            console.warn('[Clima] Error generando narrativa:', e);
        }
        
        return `Desde esta perspectiva única, puedo ver cómo el clima es el sistema circulatorio de nuestro planeta. El viento transporta energía, humedad y vida de un continente a otro. Las nubes son mensajeras que cruzan océanos, las tormentas son la respiración profunda de la Tierra. Cada patrón que observo aquí afecta la vida en algún lugar del mundo. Este es el verdadero pulso de nuestro planeta, un sistema interconectado que no conoce fronteras políticas, solo las leyes de la física y la vida.`;
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Clima] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria', 'globo', 'terremotos'];
                    const currentPage = 'clima';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Clima] 🎲 Navegando a: ${randomPage}`);
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
