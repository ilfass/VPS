import { timeEngine } from '../utils/time.js';
import { scheduler } from '../utils/scheduler.js';
import { COUNTRY_INFO, REGION_COLORS, GLOBAL_FACTS } from '../data/country-info.js';
import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { newsProvider } from '../data/news-provider.js';

const INTRO_TEMPLATES = [
    "Ahora estamos en {country}.",
    "Este es {country}.",
    "Viajamos a {country}.",
    "En este momento, en {country}...",
    "Mientras aquí transcurre el tiempo, en {country}...",
    "Así se vive el momento actual en {country}...",
    "Observando {country}."
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
        this.travelTimeout = null;
    }

    async mount() {
        // 1. Estructura Base (Capas)
        this.container.innerHTML = `
            <div class="broadcast-scene fade-in">
                <div class="broadcast-background"></div>
                <div id="d3-map-container" class="broadcast-map-container"></div>
                
                <!-- Capa 1: Overlay Global (Reloj UTC pequeño) -->
                <div class="broadcast-overlay-top-right">
                    <div class="mini-clock-label">TIEMPO UNIVERSAL (UTC)</div>
                    <div class="mini-clock" id="broadcast-clock">--:--</div>
                </div>

                <!-- Capa 2: Narrativa de Zoom (Centro-Abajo) -->
                <div id="zoom-narrative" class="zoom-narrative hidden">
                    <div class="narrative-country" id="narrative-country">PAÍS</div>
                    <div class="narrative-time" id="narrative-time">--:--</div>
                </div>

                <!-- Capa 3: Cápsulas Informativas (Lateral Izquierda) -->
                <div id="info-capsule" class="info-capsule hidden-left">
                    <div class="capsule-icon">ℹ</div>
                    <div class="capsule-content" id="capsule-text">...</div>
                </div>

                <!-- Capa 4: Datos del País (Lateral - Nuevo) -->
                <div id="country-info-capsule" class="info-capsule country-mode hidden-right">
                    <div class="capsule-icon">🌍</div>
                    <div class="capsule-content" id="country-capsule-text">...</div>
                </div>

                <!-- Capa 5: Noticias Internacionales (Lateral) -->
                <div id="news-capsule" class="info-capsule news-mode hidden-right">
                    <div class="capsule-icon">📰</div>
                    <div class="capsule-content" id="news-capsule-text">...</div>
                </div>

                <!-- Estado del Sistema (Discreto) -->
                <div class="system-status" id="broadcast-info">SISTEMA ONLINE</div>
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

            // 6. Programar Cápsulas Informativas (cada 2 min)
            scheduler.addTask('InfoCapsules', 2, () => this.showInfoCapsule());

            // 7. Programar Noticias Internacionales (cada 30 min)
            // Usamos un intervalo largo, pero verificamos estado antes de lanzar
            setInterval(() => this.triggerNewsEvent(), 60 * 1000); // TEST: 1 minuto

            // Debug: Tecla 'N' para forzar noticias
            window.addEventListener('keydown', (e) => {
                if (e.key === 'n' || e.key === 'N') {
                    console.log("Forzando noticias manual...");
                    this.triggerNewsEvent();
                }
            });

            document.getElementById('broadcast-info').textContent = "SISTEMA ONLINE (NOTICIAS ACTIVO)";

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

        // Grupo principal
        this.gMap = this.svg.append("g").attr("class", "world-map-group");

        // Océano
        this.gMap.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "ocean")
            .attr("d", this.pathGenerator);

        // Países
        this.gCountries = this.gMap.append("g").attr("class", "countries");

        // Nombres de Países (Labels)
        this.gLabels = this.gMap.append("g").attr("class", "country-labels");

        // Noche
        this.nightPath = this.gMap.append("path")
            .attr("class", "night-overlay")
            .style("mix-blend-mode", "multiply");

        // Sol
        this.sunGroup = this.gMap.append("g").attr("class", "sun-group");
        this.sunGroup.append("circle")
            .attr("r", 10)
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

        // Renderizar países con colores por región
        this.gCountries.selectAll("path")
            .data(this.worldData.features)
            .enter().append("path")
            .attr("d", this.pathGenerator)
            .attr("class", "country")
            .attr("id", d => `country-${d.id}`)
            .style("fill", d => {
                const info = COUNTRY_INFO[d.id];
                return info ? REGION_COLORS[info.region] : "#cbd5e1"; // Color por región o default
            });

        // Renderizar etiquetas (solo para países con info)
        this.gLabels.selectAll("text")
            .data(this.worldData.features.filter(d => COUNTRY_INFO[d.id]))
            .enter().append("text")
            .attr("class", "country-label")
            .attr("transform", d => {
                const centroid = this.pathGenerator.centroid(d);
                return `translate(${centroid[0]}, ${centroid[1]})`;
            })
            .attr("dy", "0.35em")
            .text(d => COUNTRY_INFO[d.id].name)
            .style("opacity", 0); // Ocultos por defecto, se muestran al hacer zoom
    }

    update(now) {
        // Reloj UTC Pequeño
        const clockEl = document.getElementById('broadcast-clock');
        if (clockEl) {
            const hours = String(now.getUTCHours()).padStart(2, '0');
            const minutes = String(now.getUTCMinutes()).padStart(2, '0');
            clockEl.textContent = `${hours}:${minutes}`;
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
        // Ciclo: Global (40s) -> País (15s)
        // Solo si no hay noticias activas
        if (audioManager.currentState !== AUDIO_STATES.GLOBAL_NEWS) {
            setTimeout(() => this.cycleZoomIn(), 5000);
        }
    }

    cycleZoomIn() {
        // Verificar si podemos narrar país
        if (!audioManager.requestChannel(AUDIO_STATES.COUNTRY_NARRATION)) {
            // Si está ocupado (noticias), reintentar en 5s
            setTimeout(() => this.cycleZoomIn(), 5000);
            return;
        }

        // Elegir país aleatorio de nuestra lista de info
        const availableIds = Object.keys(COUNTRY_INFO);
        const randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
        const target = { id: randomId, ...COUNTRY_INFO[randomId] }; // Incluye timezone

        this.zoomToCountry(target);

        // 15 segundos de zoom
        this.travelTimeout = setTimeout(() => {
            this.cycleZoomOut();
        }, 15000);
    }

    cycleZoomOut() {
        this.resetZoom();

        // 40 segundos de vista global
        this.travelTimeout = setTimeout(() => {
            this.cycleZoomIn();
        }, 25000);
    }

    zoomToCountry(target) {
        if (!this.worldData) return;

        const feature = this.worldData.features.find(f => f.id === target.id);

        // 1. Mostrar Narrativa de Zoom
        const narrativeEl = document.getElementById('zoom-narrative');
        const countryEl = document.getElementById('narrative-country');
        const timeEl = document.getElementById('narrative-time');

        if (narrativeEl && target.timezone) {
            // Calcular hora local
            try {
                const now = new Date();
                const localTime = new Intl.DateTimeFormat('es-ES', {
                    timeZone: target.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).format(now);

                // Calcular offset GMT (aprox)
                // Hack simple para mostrar GMT: comparar horas
                const utcHour = now.getUTCHours();
                const localHour = parseInt(localTime.split(':')[0]);
                let diff = localHour - utcHour;
                if (diff < -12) diff += 24;
                if (diff > 12) diff -= 24;
                const sign = diff >= 0 ? '+' : '';

                countryEl.textContent = `OBSERVANDO: ${target.name.toUpperCase()}`;
                timeEl.textContent = `HORA LOCAL: ${localTime} (GMT${sign}${diff})`;

                narrativeEl.classList.remove('hidden');
            } catch (e) {
                console.error("Error time", e);
            }
        }

        // Resaltar país
        this.gCountries.selectAll(".country").classed("active-country", false);
        if (feature) {
            this.gCountries.select(`#country-${target.id}`).classed("active-country", true);
        } else {
            this.cycleZoomOut();
            return;
        }

        // Calcular Zoom
        const bounds = this.pathGenerator.bounds(feature);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;

        const scale = Math.max(1, Math.min(8, 0.6 / Math.max(dx / this.width, dy / this.height)));
        const translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];

        // Transición D3
        this.gMap.transition()
            .duration(3000)
            .ease(d3.easeCubicInOut)
            .attr("transform", `translate(${translate})scale(${scale})`)
            .on("end", () => {
                this.gCountries.selectAll("path").style("stroke-width", `${0.5 / scale}px`);
                this.gCountries.select(`#country-${target.id}`).style("stroke-width", `${2 / scale}px`);

                // Mostrar etiquetas
                this.gLabels.selectAll("text").style("opacity", 0);
                // DISPARAR VOZ Y DATO (Después del zoom)
                const facts = target.facts || (target.fact ? [target.fact] : []);

                if (facts.length > 0) {
                    const randomFact = facts[Math.floor(Math.random() * facts.length)];

                    // Construir texto
                    // "Observando Japón. Son las 21:34 hora local. Es uno de los países..."

                    let timeStr = "";
                    try {
                        const now = new Date();
                        timeStr = new Intl.DateTimeFormat('es-ES', {
                            timeZone: target.timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }).format(now);
                    } catch (e) { timeStr = "--:--"; }



                    // Seleccionar plantilla de introducción aleatoria
                    const template = INTRO_TEMPLATES[Math.floor(Math.random() * INTRO_TEMPLATES.length)];
                    const intro = template.replace("{country}", target.name);

                    // Construir texto final: Intro + Hora + Dato
                    // Nota: El dato se lee tal cual viene del array facts
                    const speechText = `${intro} Son las ${timeStr} hora local. ${randomFact}`;

                    // Usar AudioManager
                    audioManager.speak(speechText, 'normal');
                    this.showCountryInfo(randomFact);
                }
            });

        this.sunGroup.selectAll("circle").transition().duration(3000).attr("r", 15 / scale);
    }

    resetZoom() {
        this.gCountries.selectAll(".country").classed("active-country", false);
        this.gLabels.selectAll("text").transition().duration(1000).style("opacity", 0);

        // Ocultar Narrativa
        const narrativeEl = document.getElementById('zoom-narrative');
        if (narrativeEl) narrativeEl.classList.add('hidden');

        // Cancelar voz y ocultar cápsula lateral
        audioManager.cancel();
        const capsuleEl = document.getElementById('country-info-capsule');
        if (capsuleEl) capsuleEl.classList.add('hidden-right');

        this.gMap.transition()
            .duration(3000)
            .ease(d3.easeCubicInOut)
            .attr("transform", "translate(0,0)scale(1)")
            .on("end", () => {
                this.gCountries.selectAll("path").style("stroke-width", "0.5px");
            });

        this.sunGroup.selectAll("circle").transition().duration(3000).attr("r", 15);
    }

    showInfoCapsule() {
        const capsuleEl = document.getElementById('info-capsule');
        const textEl = document.getElementById('capsule-text');

        if (!capsuleEl || !textEl) return;

        // Elegir dato aleatorio
        const fact = GLOBAL_FACTS[Math.floor(Math.random() * GLOBAL_FACTS.length)];
        textEl.textContent = fact;

        // Mostrar (Slide In)
        capsuleEl.classList.remove('hidden-left');

        // Leer dato general (Voz secundaria)
        // No bloqueamos el canal principal, es un dato corto
        audioManager.speak(fact, 'news'); // Usamos voz 'news' para variedad

        // Ocultar después de 10 segundos
        setTimeout(() => {
            capsuleEl.classList.add('hidden-left');
        }, 10000);
    }

    showCountryInfo(fact) {
        const capsuleEl = document.getElementById('country-info-capsule');
        const textEl = document.getElementById('country-capsule-text');

        if (!capsuleEl || !textEl) return;

        textEl.textContent = fact;
        capsuleEl.classList.remove('hidden-right');

        // Ocultar después de 12 segundos (duración max voz)
        setTimeout(() => {
            capsuleEl.classList.add('hidden-right');
        }, 12000);
    }

    async triggerNewsEvent() {
        console.log("Intentando lanzar evento de noticias...");
        const infoEl = document.getElementById('broadcast-info');

        // 1. Intentar tomar control exclusivo
        if (!audioManager.requestChannel(AUDIO_STATES.GLOBAL_NEWS)) {
            console.log("Canal ocupado, posponiendo noticias...");
            if (infoEl) infoEl.textContent = "NOTICIAS POSPUESTAS (CANAL OCUPADO)";
            setTimeout(() => { if (infoEl) infoEl.textContent = "SISTEMA ONLINE"; }, 2000);
            return;
        }

        if (infoEl) infoEl.textContent = "BUSCANDO NOTICIAS...";

        // 2. Obtener noticia
        const newsItem = await newsProvider.fetchNews();
        if (!newsItem) {
            console.log("No se encontraron noticias válidas.");
            if (infoEl) infoEl.textContent = "ERROR AL OBTENER NOTICIAS";
            audioManager.releaseChannel();
            return;
        }

        console.log("📰 BREAKING NEWS:", newsItem.title);

        // 3. Resetear vista a Global
        this.resetZoom();

        // 4. Mostrar UI de Noticia
        const capsuleEl = document.getElementById('news-capsule');
        const textEl = document.getElementById('news-capsule-text');
        // infoEl ya está declarado arriba

        if (capsuleEl && textEl) {
            textEl.innerHTML = `<strong>${newsItem.title}</strong><br><span style="font-size:0.9em">${newsItem.summary}</span>`;
            capsuleEl.classList.remove('hidden-right');

            if (infoEl) infoEl.textContent = "ACTUALIDAD INTERNACIONAL";
        }

        // 5. Narrar
        const intro = newsProvider.getRandomIntro();
        const fullText = `${intro} ${newsItem.title}. ${newsItem.summary}`;

        audioManager.speak(fullText, 'news', () => {
            // Callback al terminar de hablar
            setTimeout(() => {
                // Ocultar UI
                if (capsuleEl) capsuleEl.classList.add('hidden-right');
                if (infoEl) infoEl.textContent = "SISTEMA ONLINE";

                // Liberar canal y retomar ciclo
                audioManager.releaseChannel();
                this.cycleZoomIn(); // Retomar viaje
            }, 3000); // Pausa de 3s
        });
    }

    // Método speak antiguo eliminado, usamos audioManager
    unmount() {
        audioManager.cancel();
        if (this.unsubscribeTime) this.unsubscribeTime();
        if (this.travelTimeout) clearTimeout(this.travelTimeout);
        scheduler.clearTasks(); // Limpiar tareas del scheduler (cápsulas)
        this.container.innerHTML = '';
        this.svg = null;
    }
}
