import { timeEngine } from '../utils/time.js';

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
                    <div class="overlay-info" id="broadcast-info">Cargando datos geográficos...</div>
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
            this.update(new Date()); // Primer render inmediato

            document.getElementById('broadcast-info').textContent = "SISTEMA ONLINE";
        } catch (error) {
            console.error("Error cargando mapa:", error);
            document.getElementById('broadcast-info').textContent = "ERROR DE DATOS";
        }
    }

    initD3() {
        const container = d3.select("#d3-map-container");

        // Limpiar
        container.selectAll("*").remove();

        this.svg = container.append("svg")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid cover")
            .style("width", "100%")
            .style("height", "100%");

        // Definir proyección (Equirectangular para llenar pantalla 16:9)
        // Ajustamos la escala y traslación para que cubra bien 1920x1080
        this.projection = d3.geoEquirectangular()
            .scale(300)
            .translate([this.width / 2, this.height / 2]);

        this.pathGenerator = d3.geoPath().projection(this.projection);

        // Grupo principal del mapa
        this.gMap = this.svg.append("g").attr("class", "world-map-group");

        // Capa de Océano (Esfera)
        this.gMap.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "ocean")
            .attr("d", this.pathGenerator)
            .attr("fill", "#0f172a");

        // Capa de Países (se llenará al cargar datos)
        this.gCountries = this.gMap.append("g").attr("class", "countries");

        // Capa de Noche (Sombra)
        this.nightPath = this.gMap.append("path")
            .attr("class", "night-overlay")
            .attr("fill", "rgba(0,0,0,0.6)")
            .style("mix-blend-mode", "multiply");

        // Sol (marcador simple)
        this.sunGroup = this.svg.append("g").attr("class", "sun-group");
        this.sunGroup.append("circle")
            .attr("r", 15)
            .attr("fill", "#fde047")
            .attr("filter", "drop-shadow(0 0 20px rgba(253, 224, 71, 0.8))");
    }

    async loadMapData() {
        if (this.worldData) return; // Ya cargado

        // Usamos topojson de world-atlas (110m es ligero y suficiente para full screen)
        const response = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
        if (!response.ok) throw new Error("Network response was not ok");

        const topology = await response.json();
        this.worldData = topojson.feature(topology, topology.objects.countries);
    }

    renderMap() {
        if (!this.worldData) return;

        // Renderizar países
        this.gCountries.selectAll("path")
            .data(this.worldData.features)
            .enter().append("path")
            .attr("d", this.pathGenerator)
            .attr("class", "country")
            .attr("fill", "#334155")
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 0.5);
    }

    update(now) {
        // Actualizar Reloj
        const clockEl = document.getElementById('broadcast-clock');
        if (clockEl) {
            const hours = String(now.getUTCHours()).padStart(2, '0');
            const minutes = String(now.getUTCMinutes()).padStart(2, '0');
            clockEl.textContent = `${hours}:${minutes} UTC`;
        }

        // Actualizar Ciclo Día/Noche
        this.updateDayNight(now);
    }

    updateDayNight(date) {
        if (!this.projection || !this.nightPath) return;

        // Calcular posición del sol
        // D3 espera coordenadas [lon, lat]
        // Lon: (12 - UTC) * 15
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const totalHours = hours + minutes / 60;

        let sunLon = (12 - totalHours) * 15;
        if (sunLon > 180) sunLon -= 360;
        if (sunLon < -180) sunLon += 360;

        // Declinación solar
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const sunLat = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

        // 1. Mover el icono del sol
        const sunPos = this.projection([sunLon, sunLat]);
        if (sunPos) {
            this.sunGroup.attr("transform", `translate(${sunPos[0]}, ${sunPos[1]})`);
        }

        // 2. Generar el círculo de noche
        // La noche es el círculo centrado en la antípoda del sol
        const antipodalLon = sunLon > 0 ? sunLon - 180 : sunLon + 180;
        const antipodalLat = -sunLat;

        const circle = d3.geoCircle()
            .center([antipodalLon, antipodalLat])
            .radius(90)(); // 90 grados de radio cubre medio mundo

        this.nightPath.attr("d", this.pathGenerator(circle));
    }

    unmount() {
        if (this.unsubscribeTime) this.unsubscribeTime();
        this.container.innerHTML = '';
        this.svg = null;
    }
}
