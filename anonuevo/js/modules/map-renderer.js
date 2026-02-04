
export class MapRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.globe = null;
        this.countries = null;
        this.timer = null;
    }

    async init() {
        // Cargar dependencias externas si no existen
        if (!window.d3) await this.loadScript('https://d3js.org/d3.v7.min.js');
        if (!window.topojson) await this.loadScript('https://unpkg.com/topojson@3'); // Necesario para world-atlas

        this.setupCanvas();

        try {
            await this.loadWorldData();
            this.render();
            // Iniciar rotación suave por defecto
            this.startAutoRotation();

            console.log("[MapRenderer] Globo 3D inicializado.");
        } catch (e) {
            console.error("[MapRenderer] Error al cargar datos del mundo:", e);
        }

        // Resize handle
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            if (this.svg) {
                this.svg.attr("width", this.width).attr("height", this.height);
                this.projection.translate([this.width / 2, this.height / 2]);
                this.svg.selectAll("path").attr("d", this.path);
            }
        });
    }

    setupCanvas() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '';

        this.svg = d3.select(`#${this.containerId}`)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("background", "#050510"); // Espacio profundo

        // Proyección Ortográfica (Globo)
        this.projection = d3.geoOrthographic()
            .scale(Math.min(this.width, this.height) / 2.5)
            .translate([this.width / 2, this.height / 2])
            .clipAngle(90);

        this.path = d3.geoPath().projection(this.projection);

        // Esfera (Océano)
        this.svg.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "water")
            .attr("d", this.path)
            .style("fill", "#0a1128")
            .style("opacity", 0.6);

        // Graticula (Líneas de lat/lon)
        const graticule = d3.geoGraticule();
        this.svg.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", this.path)
            .style("fill", "none")
            .style("stroke", "#ffffff")
            .style("stroke-width", "0.1px")
            .style("stroke-opacity", 0.2);
    }

    async loadWorldData() {
        // Usar unpkg es seguro para prototipos, idealmente descargaríamos esto.
        const world = await d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
        this.countries = topojson.feature(world, world.objects.countries).features;
    }

    render() {
        // Países
        this.globe = this.svg.selectAll(".country")
            .data(this.countries)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", this.path)
            .style("fill", "#1a2a3a")
            .style("stroke", "#40bcd8")
            .style("stroke-width", "0.5px")
            .on("mouseover", function () {
                d3.select(this).style("fill", "#40bcd8").style("stroke", "#fff");
            })
            .on("mouseout", function () {
                d3.select(this).style("fill", "#1a2a3a").style("stroke", "#40bcd8");
            });
    }

    startAutoRotation() {
        if (this.timer) this.timer.stop();
        this.timer = d3.timer((elapsed) => {
            const rotate = this.projection.rotate();
            const k = 0.05; // Velocidad de rotación
            this.projection.rotate([rotate[0] + k, rotate[1]]);
            this.svg.selectAll("path").attr("d", this.path);
        });
    }

    // API para que el Orquestador mueva el mapa
    rotateTo(lat, lon) {
        // Transición suave usando d3.transition
        const currentRotate = this.projection.rotate();
        const targetRotate = [-lon, -lat];

        // Detener rotación automática temporalmente
        if (this.timer) this.timer.stop();

        const r = d3.interpolate(currentRotate, targetRotate);

        d3.transition()
            .duration(2000)
            .tween("rotate", () => (t) => {
                this.projection.rotate(r(t));
                this.svg.selectAll("path").attr("d", this.path);
            })
            .on("end", () => {
                // Reanudar rotación lenta o quedarse quieto
                // this.startAutoRotation(); 
            });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

export const mapRenderer = new MapRenderer('main-stage');
