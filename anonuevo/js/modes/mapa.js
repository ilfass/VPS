import { timeEngine } from '../utils/time.js';
import { scheduler } from '../utils/scheduler.js';

const TOUR_TARGETS = [
    { id: '032', name: 'Argentina' },
    { id: '076', name: 'Brasil' },
    { id: '840', name: 'Estados Unidos' },
    { id: '124', name: 'Canadá' },
    { id: '484', name: 'México' },
    { id: '156', name: 'China' },
    { id: '392', name: 'Japón' },
    { id: '356', name: 'India' },
    { id: '643', name: 'Rusia' },
    { id: '276', name: 'Alemania' },
    { id: '250', name: 'Francia' },
    { id: '380', name: 'Italia' },
    { id: '724', name: 'España' },
    { id: '826', name: 'Reino Unido' },
    { id: '036', name: 'Australia' },
    { id: '710', name: 'Sudáfrica' },
    { id: '818', name: 'Egipto' },
    { id: '792', name: 'Turquía' }
];

export default class MapaMode {
    constructor(container) {
        this.container = container;
        this.unsubscribeTime = null;
        this.width = 1920;
        this.height = 1080;

        // D3 selections
        this.svg = null;
        this.gMap = null;
        this.pathGenerator = null;
        this.projection = null;

        // Data
        this.worldData = null;
        this.currentZoom = d3.zoomIdentity;
    }

    async mount() {
        // 1. Estructura Base
        this.container.innerHTML = `
            <div class="broadcast-scene fade-in">
                <div class="broadcast-background"></div>
                <div id="d3-map-container" class="broadcast-map-container"></div>
                
                <!-- Overlay Informativo -->
                <div class="broadcast-overlay">
                    <div class="overlay-header">
                        <span class="live-badge">● EN VIVO</span>
                        <span class="overlay-title">MONITOR GLOBAL</span>
                    </div>
                    <div class="overlay-clock" id="broadcast-clock">--:--</div>
                    <div class="overlay-info" id="broadcast-info">Conectando satélite...</div>
                </div>
            </div>
        `;

        // 2. Inicializar D3
        this.initD3();

        // 3. Cargar Datos (GeoJSON)
        try {
            await this.loadMapData();
            this.renderMap();

            // 4. Iniciar Ciclo de Tiempo
            this.unsubscribeTime = timeEngine.subscribe((now) => this.update(now));
            this.update(new Date());

            // 5. Iniciar Viaje Automático
            this.startAutoTravel();

        } catch (error) {
            console.error("Error cargando mapa:", error);
            document.getElementById('broadcast-info').textContent = "ERROR DE DATOS";
        }
    }

    initD3() {
        const container = d3.select("#d3-map-container");
        container.selectAll("*").remove();

        this.svg = container.append("svg")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid cover")
            .style("width", "100%")
            .style("height", "100%");

        // Proyección inicial
        this.projection = d3.geoEquirectangular()
            .scale(300)
            .translate([this.width / 2, this.height / 2]);

        this.pathGenerator = d3.geoPath().projection(this.projection);

        // Grupo principal (el que vamos a transformar/zoomear)
        this.gMap = this.svg.append("g").attr("class", "world-map-group");

        // Océano
        this.gMap.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "ocean")
            .attr("d", this.pathGenerator);

        // Países
        this.gCountries = this.gMap.append("g").attr("class", "countries");

        // Noche
        this.nightPath = this.gMap.append("path")
            .attr("class", "night-overlay")
            .style("mix-blend-mode", "multiply");

        // Sol
        this.sunGroup = this.gMap.append("g").attr("class", "sun-group");
        this.sunGroup.append("circle")
            .attr("r", 10) // Más pequeño base
            .attr("class", "sun-circle")
            .attr("filter", "drop-shadow(0 0 20px rgba(253, 224, 71, 0.8))");
    }

    async loadMapData() {
        if (this.worldData) return;
        const response = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
        if (!response.ok) throw new Error("Network response was not ok");
        const topology = await response.json();
        this.worldData = topojson.feature(topology, topology.objects.countries);
    }

    renderMap() {
        if (!this.worldData) return;
        this.gCountries.selectAll("path")
            .data(this.worldData.features)
            .enter().append("path")
            .attr("d", this.pathGenerator)
            .attr("class", "country")
            .attr("id", d => `country-${d.id}`);
    }

    update(now) {
        const clockEl = document.getElementById('broadcast-clock');
        if (clockEl) {
            const hours = String(now.getUTCHours()).padStart(2, '0');
            const minutes = String(now.getUTCMinutes()).padStart(2, '0');
            clockEl.textContent = `${hours}:${minutes} UTC`;
        }
        this.updateDayNight(now);
    }

    updateDayNight(date) {
        if (!this.projection || !this.nightPath) return;

        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const totalHours = hours + minutes / 60;

        let sunLon = (12 - totalHours) * 15;
        if (sunLon > 180) sunLon -= 360;
        if (sunLon < -180) sunLon += 360;

        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const sunLat = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

        // Mover sol
        const sunPos = this.projection([sunLon, sunLat]);
        if (sunPos) {
            this.sunGroup.attr("transform", `translate(${sunPos[0]}, ${sunPos[1]})`);
            // Mantener tamaño del sol constante visualmente (invertir zoom)
            const k = d3.zoomTransform(this.svg.node()).k || 1;
            this.sunGroup.selectAll("circle").attr("r", 15 / k);
        }

        // Noche
        const antipodalLon = sunLon > 0 ? sunLon - 180 : sunLon + 180;
        const antipodalLat = -sunLat;
        const circle = d3.geoCircle().center([antipodalLon, antipodalLat]).radius(90)();
        this.nightPath.attr("d", this.pathGenerator(circle));
    }

    startAutoTravel() {
        // Viajar cada 20 segundos
        this.travelStep();
        scheduler.addTask('MapTravel', 0.33, () => this.travelStep()); // 0.33 min ~= 20 seg
    }

    travelStep() {
        // Elegir país aleatorio
        const target = TOUR_TARGETS[Math.floor(Math.random() * TOUR_TARGETS.length)];
        this.zoomToCountry(target);
    }

    zoomToCountry(target) {
        if (!this.worldData) return;

        // Encontrar feature
        const feature = this.worldData.features.find(f => f.id === target.id);

        // Actualizar Info
        const infoEl = document.getElementById('broadcast-info');
        if (infoEl) {
            infoEl.style.opacity = 0;
            setTimeout(() => {
                infoEl.textContent = `OBSERVANDO: ${target.name.toUpperCase()}`;
                infoEl.style.opacity = 1;
            }, 500);
        }

        // Resaltar país
        this.gCountries.selectAll(".country").classed("active-country", false);
        if (feature) {
            this.gCountries.select(`#country-${target.id}`).classed("active-country", true);
        } else {
            // Si no encuentra el país (por ID diferente), volver a vista global
            this.resetZoom();
            return;
        }

        // Calcular Zoom
        // Bounds en pixeles [[x0, y0], [x1, y1]]
        const bounds = this.pathGenerator.bounds(feature);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;

        // Escala: 0.6 del viewport / max dimension del país
        const scale = Math.max(1, Math.min(8, 0.6 / Math.max(dx / this.width, dy / this.height)));
        const translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];

        // Transición D3
        this.gMap.transition()
            .duration(3000) // 3 segundos de viaje
            .ease(d3.easeCubicInOut)
            .attr("transform", `translate(${translate})scale(${scale})`)
            .on("end", () => {
                // Ajustar stroke width para que no se vea gigante
                this.gCountries.selectAll("path").style("stroke-width", `${0.5 / scale}px`);
            });

        // Guardar estado para el sol
        // Nota: d3.zoomTransform no se actualiza automáticamente con transiciones manuales de attr transform
        // Hack visual para el sol:
        this.sunGroup.selectAll("circle").transition().duration(3000).attr("r", 15 / scale);
    }

    resetZoom() {
        this.gMap.transition()
            .duration(3000)
            .attr("transform", "translate(0,0)scale(1)");
        this.gCountries.selectAll("path").style("stroke-width", "0.5px");
        document.getElementById('broadcast-info').textContent = "VISTA GLOBAL";
    }

    unmount() {
        if (this.unsubscribeTime) this.unsubscribeTime();
        this.container.innerHTML = '';
        this.svg = null;
    }
}
