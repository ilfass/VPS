/**
 * El Viaje de los Reyes Magos
 * Representación interactiva del viaje de Melchor, Gaspar y Baltasar
 */

// Ruta histórica aproximada de los Reyes Magos
const KINGS_ROUTE = [
    { name: "Persia (Oriente)", lat: 32.4279, lon: 53.6880, country: "Iran", description: "Inicio del viaje desde el Oriente" },
    { name: "Babilonia", lat: 32.5364, lon: 44.4208, country: "Iraq", description: "Pasando por las antiguas tierras de Babilonia" },
    { name: "Damasco", lat: 33.5138, lon: 36.2765, country: "Syria", description: "Cruzando Damasco, ciudad de comercio" },
    { name: "Jerusalén", lat: 31.7683, lon: 35.2137, country: "Israel", description: "Consultando al rey Herodes" },
    { name: "Belén", lat: 31.7054, lon: 35.2024, country: "Palestine", description: "Llegada al pesebre del Niño Jesús" }
];

const KINGS = {
    melchor: { name: "Melchor", gift: "Oro", color: "#fbbf24", icon: "👑" },
    gaspar: { name: "Gaspar", gift: "Incienso", color: "#3b82f6", icon: "👑" },
    baltasar: { name: "Baltasar", gift: "Mirra", color: "#10b981", icon: "👑" }
};

class ReyesMagosMap {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.currentStep = 0;
        this.projection = null;
        this.path = null;
        this.svg = null;
        this.routeLine = null;
        this.kingMarkers = [];
        
        this.init();
    }

    init() {
        // Inicializar música de fondo
        this.initMusic();
        
        // Crear SVG
        this.createSVG();
        
        // Cargar datos del mapa
        this.loadMapData();
        
        // Iniciar animación del viaje
        setTimeout(() => this.startJourney(), 2000);
    }

    initMusic() {
        const audio = document.getElementById('background-music');
        if (audio) {
            audio.volume = 0.3; // Volumen bajo para música de fondo
            audio.play().catch(e => {
                console.log('Audio requiere interacción del usuario:', e);
                // Mostrar mensaje para activar música
                document.addEventListener('click', () => {
                    audio.play();
                }, { once: true });
            });
        }
    }

    createSVG() {
        const container = d3.select('#map-container');
        container.selectAll('*').remove();

        this.svg = container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('background', 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%)');

        // Proyección del mapa
        this.projection = d3.geoMercator()
            .scale(150)
            .center([45, 30]) // Centrado en Medio Oriente
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Grupo para el mapa
        this.gMap = this.svg.append('g').attr('class', 'map-group');
        
        // Grupo para la ruta
        this.gRoute = this.svg.append('g').attr('class', 'route-group');
        
        // Grupo para los marcadores de los reyes
        this.gKings = this.svg.append('g').attr('class', 'kings-group');
    }

    async loadMapData() {
        try {
            // Cargar datos del mundo (usando TopoJSON simplificado)
            const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            
            // Convertir TopoJSON a GeoJSON
            const countries = topojson.feature(world, world.objects.countries);
            
            // Dibujar países
            this.gMap.selectAll('.country')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', this.path);

            // Dibujar estrellas en el fondo
            this.drawStars();
            
        } catch (error) {
            console.error('Error cargando datos del mapa:', error);
            // Fallback: dibujar ruta básica sin mapa detallado
            this.drawBasicRoute();
        }
    }

    drawStars() {
        const stars = this.svg.append('g').attr('class', 'stars');
        const starCount = 50;
        
        for (let i = 0; i < starCount; i++) {
            stars.append('circle')
                .attr('class', 'star')
                .attr('cx', Math.random() * this.width)
                .attr('cy', Math.random() * this.height)
                .attr('r', Math.random() * 2 + 1)
                .attr('fill', '#fff');
        }
    }

    drawBasicRoute() {
        // Si no se puede cargar el mapa, dibujar ruta básica
        const routePoints = KINGS_ROUTE.map(loc => this.projection([loc.lon, loc.lat]));
        
        const line = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveCardinal);
        
        this.gRoute.append('path')
            .datum(routePoints)
            .attr('class', 'route-line')
            .attr('d', line);
    }

    startJourney() {
        this.updateLocation(0);
        
        // Avanzar por la ruta cada 5 segundos
        const interval = setInterval(() => {
            this.currentStep++;
            if (this.currentStep >= KINGS_ROUTE.length) {
                clearInterval(interval);
                this.completeJourney();
            } else {
                this.updateLocation(this.currentStep);
            }
        }, 5000);
    }

    updateLocation(step) {
        const location = KINGS_ROUTE[step];
        
        // Actualizar texto de ubicación
        const locationEl = document.getElementById('current-location');
        if (!locationEl) {
            console.warn('No se encontró #current-location');
            return;
        }
        
        locationEl.textContent = location.description || location.name;
        
        // Actualizar marcadores en el mapa
        this.updateMapMarkers(location);
        
        // Actualizar países visitados
        this.updateVisitedCountries(step);
        
        // Resaltar rey activo (rotar entre los 3)
        const activeKing = Object.keys(KINGS)[step % 3];
        this.highlightKing(activeKing);
    }

    updateMapMarkers(location) {
        const [x, y] = this.projection([location.lon, location.lat]);
        
        // Limpiar marcadores anteriores
        this.gKings.selectAll('.king-marker').remove();
        
        // Dibujar marcador actual
        this.gKings.append('circle')
            .attr('class', 'king-marker')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 12)
            .attr('fill', '#fbbf24');
        
        // Dibujar ruta hasta aquí
        const routePoints = KINGS_ROUTE.slice(0, this.currentStep + 1)
            .map(loc => this.projection([loc.lon, loc.lat]));
        
        const line = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveCardinal);
        
        this.gRoute.selectAll('.route-line').remove();
        this.gRoute.append('path')
            .datum(routePoints)
            .attr('class', 'route-line')
            .attr('d', line);
        
        // Zoom suave al punto actual
        this.zoomToLocation(location);
    }

    zoomToLocation(location) {
        const [x, y] = this.projection([location.lon, location.lat]);
        const scale = 3;
        
        // Transformar solo el grupo del mapa, no todos los grupos
        this.gMap
            .transition()
            .duration(2000)
            .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
        
        // Ajustar ruta y marcadores también
        this.gRoute
            .transition()
            .duration(2000)
            .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
        
        this.gKings
            .transition()
            .duration(2000)
            .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
    }

    updateVisitedCountries(step) {
        // Marcar países visitados
        this.gMap.selectAll('.country')
            .classed('visited', false)
            .classed('current', false);
        
        // Marcar país actual
        const currentLocation = KINGS_ROUTE[step];
        this.gMap.selectAll('.country')
            .filter((d, i) => {
                // Simplificado: marcar países cercanos
                return true; // En una implementación real, verificaría el país específico
            })
            .classed('current', true);
    }

    highlightKing(kingName) {
        // Resaltar rey activo en la UI
        const kingCards = document.querySelectorAll('.king-card');
        if (kingCards.length === 0) {
            console.warn('No se encontraron elementos .king-card');
            return;
        }
        
        kingCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.king === kingName) {
                card.classList.add('active');
            }
        });
    }

    completeJourney() {
        const locationEl = document.getElementById('current-location');
        if (locationEl) {
            locationEl.textContent = "✨ Los Reyes Magos han llegado a Belén y adorado al Niño Jesús ✨";
        }
        
        // Efecto especial al finalizar
        this.gKings.selectAll('.king-marker')
            .transition()
            .duration(1000)
            .attr('r', 20)
            .style('opacity', 0.5)
            .transition()
            .duration(1000)
            .attr('r', 12)
            .style('opacity', 1);
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        
        this.projection
            .translate([this.width / 2, this.height / 2]);
        
        // Redibujar
        this.gMap.selectAll('.country').attr('d', this.path);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReyesMagos);
} else {
    // DOM ya está listo
    initReyesMagos();
}

function initReyesMagos() {
    // Verificar que los elementos necesarios existan
    const mapContainer = document.getElementById('map-container');
    const currentLocation = document.getElementById('current-location');
    
    if (!mapContainer) {
        console.error('Error: No se encontró #map-container');
        return;
    }
    
    if (!currentLocation) {
        console.error('Error: No se encontró #current-location');
        return;
    }
    
    try {
        const map = new ReyesMagosMap();
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => {
            if (map && typeof map.handleResize === 'function') {
                map.handleResize();
            }
        });
    } catch (error) {
        console.error('Error inicializando mapa de Reyes Magos:', error);
    }
}
