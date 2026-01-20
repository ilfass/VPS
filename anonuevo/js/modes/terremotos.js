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
        this.waves = []; // Ondas expansivas animadas
        this.updateInterval = null;
        this.animationFrame = null;
        this.lastQuakeStats = null;
        this.lastRefreshAt = 0;
    }

    async mount() {
        console.log('[Terremotos] Montando página de terremotos con API y animaciones...');
        
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
        await this.loadEarthquakes();
        
        // Actualizar cada 60 segundos
        this.updateInterval = setInterval(() => {
            this.loadEarthquakes();
        }, 60000);
        
        // Iniciar animación de ondas
        this.startWaveAnimation();
        
        await this.startNarration();
        this.scheduleNextPage();
    }

    // Targets sugeridos para el director de cámara global (Leaflet)
    getCinematicTargets() {
        const targets = [];
        try {
            // markers son L.marker; tomar algunos
            const sample = (this.markers || []).slice(0, 8);
            sample.forEach(m => {
                const ll = m?.getLatLng?.();
                if (ll) targets.push({ lat: ll.lat, lon: ll.lng, closeZoom: 4, sweepZoom: 3, driftDeg: 4.5 });
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
        mapContainer.id = 'earthquake-map';
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
        this.map = L.map('earthquake-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        // Tiles oscuros para mejor contraste
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadEarthquakes() {
        try {
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
            const data = await response.json();
            
            // Limpiar marcadores y ondas anteriores
            this.markers.forEach(marker => {
                if (this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.waves.forEach(wave => {
                if (this.map) {
                    this.map.removeLayer(wave);
                }
            });
            this.markers = [];
            this.waves = [];
            
            // Ordenar por magnitud (más grandes primero) y limitar a 50 más recientes
            const sortedFeatures = data.features
                .sort((a, b) => b.properties.mag - a.properties.mag)
                .slice(0, 50);
            
            this.lastRefreshAt = Date.now();

            // Stats para recaps (sin inventar)
            try {
                const mags = data.features.map(f => f?.properties?.mag).filter(m => typeof m === 'number');
                const maxMag = mags.length ? Math.max(...mags) : null;
                const recentCount = data.features.filter(f => {
                    const t = Number(f?.properties?.time || 0);
                    return (Date.now() - t) < 3600000;
                }).length;
                const top3 = sortedFeatures.slice(0, 3).map(f => ({
                    mag: Number((f.properties.mag || 0).toFixed(1)),
                    place: f.properties.place,
                    time: f.properties.time
                }));
                this.lastQuakeStats = {
                    count24h: data.features.length,
                    recentCount1h: recentCount,
                    maxMagnitude: (typeof maxMag === 'number') ? Number(maxMag.toFixed(1)) : null,
                    top3
                };
            } catch (e) {
                this.lastQuakeStats = null;
            }
            
            sortedFeatures.forEach((feature, index) => {
                const [longitude, latitude] = feature.geometry.coordinates;
                const magnitude = feature.properties.mag;
                const place = feature.properties.place;
                const time = new Date(feature.properties.time);
                const depth = feature.geometry.coordinates[2];
                
                // Color según magnitud
                let color = '#00ff00'; // Verde para pequeños
                if (magnitude >= 5) color = '#ff0000'; // Rojo para grandes
                else if (magnitude >= 4) color = '#ff8800'; // Naranja para medianos
                else if (magnitude >= 3) color = '#ffff00'; // Amarillo
                
                // Tamaño del círculo según magnitud
                const radius = Math.max(6, Math.min(20, magnitude * 4));
                
                // Marcador principal con pulso
                const circle = L.circleMarker([latitude, longitude], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);
                
                // Información detallada en el popup
                const timeAgo = this.getTimeAgo(time);
                circle.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                        <strong style="font-size: 1.2em; color: ${color};">Magnitud ${magnitude.toFixed(1)}</strong><br>
                        <strong>${place}</strong><br>
                        <small>Profundidad: ${depth.toFixed(1)} km</small><br>
                        <small>${timeAgo}</small><br>
                        <small>${time.toLocaleString('es-ES')}</small>
                    </div>
                `);
                
                this.markers.push(circle);
                
                // Crear onda expansiva animada según magnitud
                // Más ondas para terremotos más grandes
                const waveCount = magnitude >= 5 ? 3 : magnitude >= 4 ? 2 : 1;
                const maxRadius = magnitude * 200; // Radio máximo según magnitud
                
                for (let i = 0; i < waveCount; i++) {
                    const wave = L.circle([latitude, longitude], {
                        radius: 0,
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.1,
                        weight: 2,
                        opacity: 0.6
                    }).addTo(this.map);
                    
                    this.waves.push({
                        circle: wave,
                        center: [latitude, longitude],
                        maxRadius: maxRadius,
                        currentRadius: 0,
                        speed: 50 + (magnitude * 10), // Velocidad según magnitud
                        delay: i * 2000, // Delay entre ondas
                        startTime: Date.now() + (i * 2000),
                        color: color,
                        magnitude: magnitude
                    });
                }
            });
            
            console.log(`[Terremotos] Cargados ${sortedFeatures.length} terremotos con animaciones`);
        } catch (error) {
            console.error('[Terremotos] Error cargando datos:', error);
        }
    }

    getRecapContext() {
        return this.lastQuakeStats;
    }

    getTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return `Hace ${seconds} segundos`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} minutos`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} horas`;
        const days = Math.floor(hours / 24);
        return `Hace ${days} días`;
    }

    startWaveAnimation() {
        const animate = () => {
            this.waves.forEach((wave, index) => {
                if (Date.now() < wave.startTime) return;
                
                const elapsed = Date.now() - wave.startTime;
                const progress = (elapsed / (wave.maxRadius / wave.speed * 1000)) % 1;
                const currentRadius = progress * wave.maxRadius;
                
                if (currentRadius < wave.maxRadius) {
                    wave.circle.setRadius(currentRadius);
                    
                    // Fade out effect
                    const opacity = Math.max(0, 0.6 * (1 - progress));
                    const fillOpacity = Math.max(0, 0.1 * (1 - progress));
                    wave.circle.setStyle({
                        opacity: opacity,
                        fillOpacity: fillOpacity
                    });
                }
            });
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando la actividad sísmica de nuestro planeta en tiempo real. Cada punto que aparece es un terremoto, un recordatorio de las fuerzas titánicas que moldean nuestro mundo. Las ondas expansivas muestran la energía liberada. La Tierra está viva, respirando, moviéndose constantemente bajo nuestros pies.';
        
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
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
            const data = await response.json();
            const count = data.features.length;
            const maxMagnitude = Math.max(...data.features.map(f => f.properties.mag));
            const recentCount = data.features.filter(f => {
                const time = new Date(f.properties.time);
                return Date.now() - time.getTime() < 3600000; // Última hora
            }).length;
            
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de terremotos en tiempo real que muestra ${count} terremotos en las últimas 24 horas, con el más grande de magnitud ${maxMagnitude.toFixed(1)}. ${recentCount} terremotos han ocurrido en la última hora. Las ondas expansivas animadas muestran la energía liberada por cada evento sísmico.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo la Tierra está constantemente en movimiento
- Las fuerzas titánicas que moldean nuestro planeta
- La fragilidad de la humanidad frente a estas fuerzas
- La belleza y el poder de la naturaleza
- La conciencia de vivir en un planeta geológicamente activo
- Cómo las ondas sísmicas viajan por el planeta

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
        
        return `Cada punto que aparece aquí es un recordatorio de que vivimos en un planeta vivo, en constante movimiento. Las placas tectónicas se desplazan, chocan, se separan, creando montañas y océanos. Las ondas expansivas que veo animarse muestran cómo la energía se propaga desde cada terremoto, viajando por el planeta. Estos terremotos son la respiración profunda de la Tierra, fuerzas titánicas que moldean nuestro mundo. Nos recuerdan nuestra fragilidad, pero también la increíble resiliencia de la vida que se adapta y persiste frente a estas fuerzas colosales.`;
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('terremotos');
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
