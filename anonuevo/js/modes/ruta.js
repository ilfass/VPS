import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';
// D3 se carga globalmente desde el HTML

export default class RutaMode {
    constructor(container) {
        this.container = container;
        this.visitedCountries = [];
        this.routePath = [];
        this.isNarrating = false;
        this.svg = null;
        this.projection = null;
        this.pathGenerator = null;
    }

    async mount() {
        console.log('[Ruta] Montando página de ruta del viaje...');
        
        // Inicializar avatar
        avatarSubtitlesManager.init(this.container);
        avatarSubtitlesManager.show();
        
        // Iniciar música de fondo
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        // Habilitar audio después de interacción
        const enableAudio = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Cargar datos y empezar narración
        await this.loadRouteData();
        this.renderMap();
        await this.startNarration();
        
        // Si Dream Mode está ON, cambiar automáticamente después de un tiempo
        if (eventManager.canProceedAuto()) {
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente'];
                    const randomPage = pages[Math.floor(Math.random() * pages.length)];
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 30000);
        }
    }

    async loadRouteData() {
        try {
            const res = await fetch('/control-api/api/country-memory');
            if (res.ok) {
                const data = await res.json();
                const memories = data.memories || [];
                
                // Ordenar por última visita (más reciente primero, luego por primera visita)
                const sorted = memories
                    .filter(m => COUNTRY_INFO[m.countryId])
                    .sort((a, b) => {
                        const dateA = a.lastVisit ? new Date(a.lastVisit) : new Date(0);
                        const dateB = b.lastVisit ? new Date(b.lastVisit) : new Date(0);
                        return dateB - dateA;
                    });
                
                this.visitedCountries = sorted.map(m => ({
                    id: m.countryId,
                    info: COUNTRY_INFO[m.countryId],
                    visits: m.totalVisits || 0,
                    lastVisit: m.lastVisit
                }));
            }
        } catch (e) {
            console.error('[Ruta] Error cargando datos:', e);
        }
    }

    renderMap() {
        // Limpiar contenedor
        this.container.innerHTML = '';
        
        const width = this.container.clientWidth || 1920;
        const height = this.container.clientHeight || 1080;
        
        // Crear SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%)');
        
        // Proyección del mapa
        this.projection = d3.geoMercator()
            .scale(150)
            .center([0, 20])
            .translate([width / 2, height / 2]);
        
        this.pathGenerator = d3.geoPath().projection(this.projection);
        
        // Cargar datos del mundo
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
            // Verificar que topojson esté disponible (se carga globalmente desde HTML)
            if (typeof window.topojson === 'undefined' && typeof topojson === 'undefined') {
                console.error('[Ruta] topojson no está disponible, usando fallback simple');
                this.renderStats();
                // Renderizar países visitados sin mapa completo
                this.renderSimpleRoute();
                return;
            }
            
            const topojsonLib = window.topojson || topojson;
            const countries = topojsonLib.feature(world, world.objects.countries);
            
            // Dibujar países
            this.svg.selectAll('.country')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', this.pathGenerator)
                .attr('fill', d => {
                    const countryId = this.getCountryIdFromFeature(d);
                    const visited = this.visitedCountries.find(c => c.id === countryId);
                    return visited ? 'rgba(74, 158, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                })
                .attr('stroke', d => {
                    const countryId = this.getCountryIdFromFeature(d);
                    const visited = this.visitedCountries.find(c => c.id === countryId);
                    return visited ? '#4a9eff' : 'rgba(255, 255, 255, 0.2)';
                })
                .attr('stroke-width', d => {
                    const countryId = this.getCountryIdFromFeature(d);
                    const visited = this.visitedCountries.find(c => c.id === countryId);
                    return visited ? 2 : 0.5;
                });
            
            // Dibujar ruta (línea que conecta países visitados)
            if (this.visitedCountries.length > 1) {
                const routePoints = this.visitedCountries.map(c => {
                    if (c.info && c.info.coords) {
                        return this.projection([c.info.coords.lng, c.info.coords.lat]);
                    }
                    return null;
                }).filter(p => p !== null);
                
                if (routePoints.length > 1) {
                    const line = d3.line()
                        .x(d => d[0])
                        .y(d => d[1])
                        .curve(d3.curveCardinal);
                    
                    this.svg.append('path')
                        .datum(routePoints)
                        .attr('d', line)
                        .attr('fill', 'none')
                        .attr('stroke', '#4a9eff')
                        .attr('stroke-width', 3)
                        .attr('stroke-dasharray', '5,5')
                        .attr('opacity', 0.6);
                }
                
                // Dibujar puntos de países visitados
                this.visitedCountries.forEach((country, index) => {
                    if (country.info && country.info.coords) {
                        const [x, y] = this.projection([country.info.coords.lng, country.info.coords.lat]);
                        
                        this.svg.append('circle')
                            .attr('cx', x)
                            .attr('cy', y)
                            .attr('r', 8)
                            .attr('fill', '#4a9eff')
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 2)
                            .style('cursor', 'pointer')
                            .on('mouseenter', function() {
                                d3.select(this).attr('r', 12);
                            })
                            .on('mouseleave', function() {
                                d3.select(this).attr('r', 8);
                            });
                        
                        // Número de orden
                        this.svg.append('text')
                            .attr('x', x)
                            .attr('y', y - 15)
                            .attr('text-anchor', 'middle')
                            .attr('fill', '#fff')
                            .attr('font-size', '12px')
                            .attr('font-weight', 'bold')
                            .text(index + 1);
                    }
                });
            }
            
            // Estadísticas en overlay
            this.renderStats();
        }).catch(e => {
            console.error('[Ruta] Error cargando mapa:', e);
            this.renderStats();
        });
    }

    getCountryIdFromFeature(feature) {
        // Mapeo básico de nombres a IDs (simplificado)
        const nameMap = {
            'Argentina': '032', 'Brazil': '076', 'Chile': '152', 'Colombia': '170',
            'Ecuador': '218', 'Mexico': '484', 'Peru': '604', 'United States of America': '840',
            'Uruguay': '858', 'Canada': '124', 'Spain': '724', 'France': '250',
            'Italy': '380', 'United Kingdom': '826', 'Germany': '276', 'Netherlands': '528',
            'Poland': '616'
        };
        return nameMap[feature.properties.NAME] || null;
    }

    renderSimpleRoute() {
        // Renderizar lista simple de países si no se puede cargar el mapa
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            padding: 2rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;
        
        const title = document.createElement('h1');
        title.textContent = 'Ruta del Viaje';
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, #4a9eff 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        `;
        wrapper.appendChild(title);
        
        if (this.visitedCountries.length > 0) {
            const list = document.createElement('div');
            list.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                max-width: 1200px;
                width: 100%;
            `;
            
            this.visitedCountries.forEach((country, index) => {
                const card = document.createElement('div');
                card.style.cssText = `
                    background: rgba(26, 26, 36, 0.8);
                    border: 1px solid rgba(74, 158, 255, 0.3);
                    border-radius: 8px;
                    padding: 1rem;
                    text-align: center;
                `;
                card.innerHTML = `
                    <div style="font-size: 1.5rem; font-weight: 600; color: #4a9eff; margin-bottom: 0.5rem;">${index + 1}</div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${country.info?.name || country.id}</div>
                    <div style="font-size: 0.85rem; color: #a0a0b0;">${country.visits} visita${country.visits !== 1 ? 's' : ''}</div>
                `;
                list.appendChild(card);
            });
            
            wrapper.appendChild(list);
        }
        
        this.renderStats();
        this.container.appendChild(wrapper);
    }

    renderStats() {
        const stats = document.createElement('div');
        stats.style.cssText = `
            position: absolute;
            top: 2rem;
            right: 2rem;
            background: rgba(26, 26, 36, 0.9);
            border: 1px solid rgba(74, 158, 255, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            min-width: 250px;
            z-index: 1000;
        `;
        
        stats.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; font-size: 1.2rem; color: #4a9eff;">Ruta del Viaje</h3>
            <div style="font-size: 2rem; font-weight: 800; color: #4a9eff; margin-bottom: 0.5rem;">${this.visitedCountries.length}</div>
            <div style="font-size: 0.9rem; color: #a0a0b0; margin-bottom: 1rem;">Países Visitados</div>
            <div style="font-size: 1.5rem; font-weight: 600; color: #a855f7; margin-bottom: 0.5rem;">${this.visitedCountries.reduce((sum, c) => sum + c.visits, 0)}</div>
            <div style="font-size: 0.9rem; color: #a0a0b0;">Total de Visitas</div>
        `;
        
        this.container.appendChild(stats);
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const countriesCount = this.visitedCountries.length;
        const totalVisits = this.visitedCountries.reduce((sum, c) => sum + c.visits, 0);
        
        // Texto inicial inmediato
        const immediateText = `Esta es la ruta que hemos recorrido hasta ahora. Hemos visitado ${countriesCount} país${countriesCount !== 1 ? 'es' : ''}, con un total de ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}. Cada punto en el mapa representa un lugar donde hemos aprendido algo nuevo sobre nuestro mundo.`;
        
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
                console.warn('[Ruta] Error generando texto completo:', e);
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
            const countriesList = this.visitedCountries.slice(0, 10).map(c => c.info.name).join(', ');
            const prompt = `Genera un relato narrativo sobre la ruta del viaje. 
            Hemos visitado ${this.visitedCountries.length} países: ${countriesList}${this.visitedCountries.length > 10 ? ' y más' : ''}.
            El relato debe ser reflexivo sobre el camino recorrido, las conexiones entre lugares, y la experiencia del viaje.
            Habla en primera persona como ilfass, el explorador digital.`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                return data.narrative || null;
            }
        } catch (e) {
            console.warn('[Ruta] Error generando narrativa:', e);
        }
        
        return `Cada línea en el mapa representa un paso en este viaje. 
        Cada país visitado nos ha enseñado algo único sobre la humanidad y nuestro planeta. 
        El camino continúa, y con cada nuevo lugar descubrimos más sobre este mundo que exploramos.`;
    }

    unmount() {
        if (this.svg) {
            this.svg.remove();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
