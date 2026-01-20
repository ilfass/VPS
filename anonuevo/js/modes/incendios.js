import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';

export default class IncendiosMode {
    constructor(container) {
        this.container = container;
        this.isNarrating = false;
        this.map = null;
        this.markers = [];
        this.updateInterval = null;
        this.animationFrame = null;
    }

    async mount() {
        console.log('[Incendios] Montando página de incendios forestales con API...');
        
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
        await this.loadFires();
        
        // Actualizar cada 3 horas (NASA FIRMS actualiza cada 3 horas)
        this.updateInterval = setInterval(() => {
            this.loadFires();
        }, 10800000);
        
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
        mapContainer.id = 'fires-map';
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
        this.map = L.map('fires-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);
        
        // Tiles oscuros para mejor contraste con fuego
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    async loadFires() {
        try {
            // NASA FIRMS API - incendios detectados en las últimas 24 horas
            // Usar varios países para tener buena cobertura
            const countries = ['US', 'BR', 'AU', 'CA', 'RU', 'CN', 'IN', 'ID', 'AR', 'CL', 'ES', 'PT', 'GR', 'IT', 'FR'];
            
            const promises = countries.map(country => 
                fetch(`https://firms.modaps.eosdis.nasa.gov/api/country/csv/${country}/VIIRS_SNPP_NRT/1`)
                    .then(r => r.text())
                    .then(text => {
                        // Parsear CSV
                        const lines = text.split('\n').filter(l => l.trim());
                        if (lines.length < 2) return [];
                        const headers = lines[0].split(',');
                        return lines.slice(1).map(line => {
                            const values = line.split(',');
                            const obj = {};
                            headers.forEach((h, i) => {
                                obj[h.trim()] = values[i]?.trim();
                            });
                            return obj;
                        });
                    })
                    .catch(() => [])
            );
            
            const allFires = await Promise.all(promises);
            const fires = allFires.flat().slice(0, 200); // Limitar a 200 incendios
            
            // Limpiar marcadores anteriores
            this.markers.forEach(marker => {
                if (this.map) {
                    this.map.removeLayer(marker);
                }
            });
            this.markers = [];
            
            fires.forEach(fire => {
                const lat = parseFloat(fire.latitude);
                const lon = parseFloat(fire.longitude);
                const brightness = parseFloat(fire.brightness) || 0;
                const confidence = fire.confidence || 'n';
                const date = fire.acq_date || 'N/A';
                const time = fire.acq_time || 'N/A';
                
                if (isNaN(lat) || isNaN(lon)) return;
                
                // Color según brillo (más brillo = fuego más intenso)
                let color = '#ff6600'; // Naranja para fuegos pequeños
                if (brightness > 400) color = '#ff0000'; // Rojo para fuegos grandes
                else if (brightness > 350) color = '#ff3300'; // Rojo claro
                else if (brightness > 300) color = '#ff5500'; // Naranja rojizo
                
                // Tamaño según brillo
                const radius = Math.max(4, Math.min(15, 5 + (brightness / 50)));
                
                const marker = L.circleMarker([lat, lon], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                        <strong style="color: ${color}; font-size: 1.2em;">🔥 Incendio Detectado</strong><br>
                        Brillo: ${brightness.toFixed(1)} K<br>
                        Confianza: ${confidence === 'h' ? 'Alta' : confidence === 'n' ? 'Normal' : 'Baja'}<br>
                        Fecha: ${date}<br>
                        Hora: ${time}
                    </div>
                `);
                
                this.markers.push(marker);
            });
            
            console.log(`[Incendios] Cargados ${this.markers.length} incendios forestales`);
        } catch (error) {
            console.error('[Incendios] Error cargando datos:', error);
        }
    }

    startAnimations() {
        const animate = () => {
            // Animar pulsos en los marcadores (efecto de fuego)
            this.markers.forEach((marker, index) => {
                const time = Date.now() + (index * 200);
                const pulse = 0.8 + 0.2 * Math.sin(time / 600);
                const currentRadius = marker.options.radius * pulse;
                marker.setRadius(currentRadius);
                
                // Cambiar opacidad para efecto de parpadeo
                const opacity = 0.7 + 0.3 * Math.sin(time / 800);
                marker.setStyle({ fillOpacity: opacity });
            });
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const immediateText = 'Estoy observando los incendios forestales activos detectados por satélites de la NASA en las últimas 24 horas. Cada punto rojo es un incendio, detectado desde el espacio. Los incendios son una fuerza destructiva pero también parte del ciclo natural de muchos ecosistemas.';
        
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
                console.warn('[Incendios] Error generando texto completo:', e);
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
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás observando un mapa de incendios forestales activos detectados por satélites de la NASA en las últimas 24 horas. Los puntos rojos y naranjas muestran incendios activos alrededor del mundo.

Genera una narrativa reflexiva en primera persona sobre:
- Cómo los incendios son parte del ciclo natural pero también pueden ser destructivos
- La capacidad de la tecnología para detectar incendios desde el espacio
- La fragilidad de los ecosistemas frente al fuego
- La resiliencia de la naturaleza para regenerarse
- La responsabilidad humana en la prevención de incendios
- La belleza y el poder destructivo del fuego

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
            console.warn('[Incendios] Error generando narrativa:', e);
        }
        
        return `Desde el espacio, los satélites detectan el calor de los incendios, mostrándome dónde arde el fuego en nuestro planeta. Cada punto rojo es un incendio activo, una fuerza que puede ser destructiva pero también parte del ciclo natural de muchos ecosistemas. El fuego limpia, renueva, pero también puede devastar. Es un recordatorio de la fragilidad de nuestros bosques y la importancia de protegerlos. La tecnología nos permite ver desde arriba lo que está pasando abajo, dándonos una perspectiva única sobre estos eventos.`;
    }

    scheduleNextPage() {
        if (!eventManager.canProceedAuto()) return;
        window.__autoNavSchedule?.('incendios');
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
