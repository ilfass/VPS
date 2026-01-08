import { timeEngine } from '../utils/time.js';
import { scheduler } from '../utils/scheduler.js';
import { COUNTRY_INFO, REGION_COLORS, GLOBAL_FACTS } from '../data/country-info.js';
import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { newsProvider } from '../data/news-provider.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { narrativeEngine } from '../utils/narrative-engine.js';
import { streamManager, STREAM_MODES } from '../utils/stream-manager.js';
import { characterDirector } from '../utils/character-director.js';
import { contentEngine } from '../utils/content-engine.js';
import { systemOrchestrator } from '../utils/system-orchestrator.js';
import { sceneNavigator } from '../utils/scene-navigator.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { continuousNarrativeEngine } from '../utils/continuous-narrative-engine.js';
import { multimediaOrchestrator } from '../utils/multimedia-orchestrator.js';
import { countryMemoryManager } from '../utils/country-memory-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';

// TEMPLATES eliminados, ahora gestionados por narrativeEngine

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
        this.currentCountryId = null; // Track current country
        this.isNarrating = false; // Flag para prevenir zoom out durante narración
        this.isNarrating = false; // Flag para prevenir zoom out durante narración
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


                <!-- Estado del Sistema (Discreto) -->
                <div class="system-status" id="broadcast-info">SISTEMA ONLINE</div>

                <!-- Diario de Viaje (Nuevo) -->
                <div id="travel-diary" class="travel-diary hidden-bottom">
                    <div class="diary-header">📔 DIARIO DE VIAJE</div>
                    <div class="diary-content" id="diary-content">...</div>
                </div>
            </div>
        `;

        // 2. Inicializar D3
        this.initD3();

        // TELEMETRÍA INICIAL
        eventManager.reportTelemetry('MAPA', 'GLOBAL', 0);

        // ESCUCHA DE ORDENES DE DIRECCIÓN
        eventManager.on('scene_change', (scene) => {
            console.log("🎬 Mapa switching to:", scene);
            if (scene === 'mapa') window.location.reload();
            else if (scene === 'intro') window.location.href = '/';
            else if (scene === 'pais') {
                // Navegación inteligente a detalle de país
                const targetCode = this.currentCountryId ? `?code=${this.currentCountryId}` : '';
                window.location.href = `/vivos/pais/${targetCode}`;
            }
            else window.location.href = `/vivos/${scene}/`;
        });

        // Escuchar evento 'travel_to' (Director)
        eventManager.on('travel_to', (code) => {
            console.log(`[Mapa] Director ordered travel to: ${code}`);
            const countryData = COUNTRY_INFO[code];
            if (countryData) {
                // CORRECCIÓN: Pasar objeto completo como espera zoomToCountry
                this.zoomToCountry({ id: code, ...countryData });
            } else {
                console.warn(`[Mapa] Country code ${code} not found in database.`);
            }
        });

        // Escuchar evento 'media' (Deep Dive / Multimedia)
        // Escuchar evento 'media' (Deep Dive / Multimedia)
        eventManager.on('media', (data) => {
            console.log(`[Mapa] Media Event Received:`, data);
            this.showMediaOverlay(data.url, data.mediaType);

            // Narración IA si existe
            if (data.textToSpeak && window.audioManager) {
                console.log(`[Mapa] Narrating: ${data.textToSpeak}`);
                // Usar voz mas profunda o distinta si es posible, por ahora default
                window.audioManager.speak(data.textToSpeak, 'generic', true);
            }
        });

        // Escuchar evento 'glitch'
        eventManager.on('glitch', () => {
            console.log("[Mapa] Triggering Glitch Effect");
            const mapContainer = document.getElementById('d3-map-container');
            if (mapContainer) {
                mapContainer.style.filter = "invert(1) hue-rotate(180deg) blur(2px)";
                mapContainer.style.transform = "scale(1.02) skewX(2deg)";
                setTimeout(() => {
                    mapContainer.style.filter = "none";
                    mapContainer.style.transform = "none";
                }, 400); // 400ms glitch
            }
        });

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

            // 7. Programar Noticias Internacionales (cada 15 min)
            // Usamos un intervalo largo, pero verificamos estado antes de lanzar
            setInterval(() => this.triggerNewsEvent(), 15 * 60 * 1000);

            // Debug: Tecla 'N' para forzar noticias
            window.addEventListener('keydown', (e) => {
                if (e.key === 'n' || e.key === 'N') {
                    console.log("Forzando noticias manual...");
                    this.triggerNewsEvent();
                }
            });

            document.getElementById('broadcast-info').textContent = "SISTEMA ONLINE (NOTICIAS ACTIVO)";

            // 8. Inicializar Gestor de Eventos (Control Manual)
            eventManager.init();

            // Inicializar Navegador de Escenas
            sceneNavigator.init('broadcast-scene');

            // 9. Inicializar Orquestador del Sistema (Cerebro Central)
            systemOrchestrator.init();

            // 10. Inicializar Multimedia Orchestrator
            multimediaOrchestrator.init(this.container);

            // 11. Inicializar Avatar y Subtítulos
            avatarSubtitlesManager.init(this.container);

            // Registrar manejadores
            eventManager.on('news', () => this.triggerNewsEvent(true)); // true = forzado
            eventManager.on('mode_change', (mode) => {
                if (streamManager.setMode(mode)) {
                    // Actualizar UI o resetear ciclo si es necesario
                    console.log("Modo cambiado a:", mode);
                    // Forzar actualización inmediata del estado visual
                    const infoEl = document.getElementById('broadcast-info');
                    if (infoEl) infoEl.textContent = `MODO: ${mode}`;
                }
            });
            eventManager.on('country', (code) => {
                // Buscar país por ID (code)
                // Nota: COUNTRY_INFO usa claves string "032", etc.
                if (COUNTRY_INFO[code]) {
                    // Actualizar StreamManager con el nuevo país
                    streamManager.setCountry(code);
                    
                    // Cancelar cualquier viaje actual
                    if (this.travelTimeout) clearTimeout(this.travelTimeout);
                    this.resetZoom();

                    // Esperar un poco y hacer zoom
                    this.travelTimeout = setTimeout(() => {
                        // Asegurar el canal de audio para este evento manual (Forzar interrupción)
                        audioManager.cancel();
                        audioManager.releaseChannel();
                        audioManager.requestChannel(AUDIO_STATES.COUNTRY_NARRATION);

                        this.zoomToCountry({ id: code, ...COUNTRY_INFO[code] });
                        // NO programar zoom out automático - el relato controlará cuándo hacer zoom out
                        // El zoom out se hará cuando termine la narración en startContinuousNarrative
                    }, 1000);
                } else {
                    console.warn(`Country code ${code} not found`);
                }
            });

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
        // Inicializar estado del viaje
        streamManager.init();

        // Mostrar avatar inmediatamente al cargar
        avatarSubtitlesManager.show();

        // Iniciar música de fondo (asegurar que se inicie)
        if (!audioManager.musicLayer) {
            audioManager.init();
        }
        if (!audioManager.isMusicPlaying) {
            console.log('[Mapa] Iniciando música de fondo...');
            audioManager.startAmbience();
        } else {
            console.log('[Mapa] Música de fondo ya está reproduciéndose');
        }
        
        // Mostrar avatar y hablar sobre el proyecto AL CARGAR (siempre)
        // Esperar un momento para que todo esté inicializado
        setTimeout(async () => {
            // Esperar a que termine completamente la intro ANTES de hacer zoom
            await this.showMapIntro();
            
            // Después de que termine la intro, esperar un momento adicional antes de iniciar el ciclo de zoom
            // Esto asegura que el mapa permanezca en zoom out durante toda la intro general
            setTimeout(() => {
                // Solo iniciar ciclo de zoom si no hay noticias activas Y estamos en modo AUTO
                if (audioManager.currentState !== AUDIO_STATES.GLOBAL_NEWS && eventManager.canProceedAuto()) {
                    // Iniciar ciclo por defecto en VISUAL (esperando primera decisión)
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    // Esperar un poco más antes de hacer zoom in para asegurar que la intro terminó
                    setTimeout(() => this.cycleZoomIn(), 3000);
                }
            }, 2000); // Esperar 2 segundos adicionales después de que termine la intro
        }, 1000);
    }

    cycleZoomIn() {
        // Verificar modo AUTO
        if (!eventManager.canProceedAuto()) {
            // Si estamos en manual, reintentar en 5s por si vuelve a auto
            setTimeout(() => this.cycleZoomIn(), 5000);
            return;
        }

        // Verificar si podemos narrar país (esperar a que termine la intro si está hablando)
        if (!audioManager.requestChannel(AUDIO_STATES.COUNTRY_NARRATION)) {
            // Si está ocupado (intro o noticias), reintentar en 5s
            setTimeout(() => this.cycleZoomIn(), 5000);
            return;
        }
        
        // Asegurar que el avatar esté visible antes de hacer zoom
        if (!avatarSubtitlesManager.isVisible) {
            avatarSubtitlesManager.show();
        }

        // Obtener contexto del Stream Manager
        const context = streamManager.getCurrentContext();
        const timing = streamManager.getTimingConfig();

        let targetId = context.countryId;

        // Si no hay país asignado o el país no existe, elegir uno aleatorio de TODOS los países
        if (!targetId || !COUNTRY_INFO[targetId]) {
            console.warn(`Country ${targetId} not found or not set, picking random from all countries.`);
            const allCountryIds = Object.keys(COUNTRY_INFO);
            // Evitar repetir el último país visitado
            const recentVisits = streamManager.visitedCountries;
            const available = allCountryIds.filter(id => !recentVisits.has(id) || recentVisits.size >= allCountryIds.length - 1);
            
            if (available.length === 0) {
                // Si todos fueron visitados, resetear y elegir cualquiera
                streamManager.visitedCountries.clear();
                targetId = allCountryIds[Math.floor(Math.random() * allCountryIds.length)];
            } else {
                targetId = available[Math.floor(Math.random() * available.length)];
            }
            streamManager.setCountry(targetId);
        }

        const target = { id: targetId, ...COUNTRY_INFO[targetId] }; // Incluye timezone

        // Cancelar cualquier timeout anterior
        if (this.travelTimeout) {
            clearTimeout(this.travelTimeout);
            this.travelTimeout = null;
        }

        this.zoomToCountry(target);

        // NO establecer timeout automático - el zoom out se hará cuando termine el relato
        // El relato controlará cuándo hacer zoom out en su callback
    }

    cycleZoomOut() {
        // Verificar si hay una narración en curso - NO interrumpir
        if (this.isNarrating || audioManager.currentState === AUDIO_STATES.COUNTRY_NARRATION) {
            console.log('[Mapa] ⚠️ Zoom out cancelado: narración en curso');
            return;
        }

        this.resetZoom();
        const timing = streamManager.getTimingConfig();

        // Tiempo en vista global antes de volver a entrar
        // Ahora rotamos a un país diferente en cada ciclo (no forzamos 3 días)
        this.travelTimeout = setTimeout(() => {
            // Rotar a siguiente país antes del próximo zoom
            if (eventManager.canProceedAuto()) {
                streamManager.rotateToNextCountry();
            }
            this.cycleZoomIn();
        }, timing.globalViewDuration);
    }

    zoomToCountry(target) {
        if (!this.worldData) return;

        const feature = this.worldData.features.find(f => f.id === target.id);
        this.currentCountryId = target.id; // UPDATE STATE

        // TELEMETRÍA: Reportar visita al país
        eventManager.reportTelemetry('MAPA', target.id, target.visitDay || 1);

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
            const countryPath = this.gCountries.select(`#country-${target.id}`);
            countryPath.classed("active-country", true);
            
            // Crear efecto de onda expansiva en las fronteras
            this.createRippleEffect(feature, target.id);
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
                // Usar PacingEngine para decidir si hablamos o solo mostramos visual
                const context = streamManager.getCurrentContext();
                const timing = streamManager.getTimingConfig();

                // Decisión del Director de Ritmo
                const shouldSpeak = pacingEngine.shouldSpeak();

                if (!shouldSpeak) {
                    console.log("[MapaMode] PacingEngine: VISUAL ONLY (Silencio narrativo)");
                    // Asegurar que estamos registrando tiempo VISUAL
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);

                    // Si no hablamos, estamos 'active' en visual un rato y luego salimos
                    // Solo si no hay narración en curso
                    if (!this.isNarrating) {
                        this.travelTimeout = setTimeout(() => {
                            if (!this.isNarrating) {
                                this.cycleZoomOut();
                            }
                        }, timing.zoomDuration);
                    }
                    return;
                }

                // NUEVO SISTEMA: Relato Continuo con IA
                this.startContinuousNarrative(target, context, timing);
            });

        this.sunGroup.selectAll("circle").transition().duration(3000).attr("r", 15 / scale);
    }

    /**
     * Muestra la introducción del mapa con el avatar hablando sobre el proyecto
     * Genera el texto con IA y lo guarda en memoria
     */
    async showMapIntro() {
        // Asegurar que el mapa esté en zoom out (vista global)
        this.resetZoom(false); // No liberar audio aún
        
        // Mostrar avatar inmediatamente
        avatarSubtitlesManager.show();
        
        // Cargar presentaciones previas de la memoria
        let previousPresentations = [];
        let introText = null;
        let useMemory = false;
        
        try {
            const memoryRes = await fetch('/control-api/api/map-intro-memory');
            if (memoryRes.ok) {
                const memoryData = await memoryRes.json();
                previousPresentations = memoryData.presentations || [];
            }
        } catch (e) {
            console.warn('[Mapa] No se pudo cargar memoria de presentaciones:', e);
        }
        
        // Decisión aleatoria: 50% memoria mezclada, 50% IA nueva
        const hasMemory = previousPresentations.length > 0;
        const randomChoice = Math.random();
        
        if (hasMemory && randomChoice < 0.5) {
            // 50%: Usar memoria mezclada/variada
            useMemory = true;
            const recentPresentations = previousPresentations.slice(-3);
            const randomPresentation = recentPresentations[Math.floor(Math.random() * recentPresentations.length)];
            if (randomPresentation && randomPresentation.text) {
                introText = randomPresentation.text;
                console.log('[Mapa] 🎲 Usando presentación previa de memoria (decisión aleatoria)');
            }
        } else {
            // 50%: Generar nueva con IA
            useMemory = false;
            try {
                const prompt = this.buildIntroPrompt(previousPresentations);
                const response = await fetch('/control-api/api/generate-narrative', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    introText = data.narrative || null;
                    console.log('[Mapa] 🎲 Generando nueva intro con IA (decisión aleatoria)');
                }
            } catch (e) {
                console.warn('[Mapa] Error generando intro con IA:', e);
            }
        }
        
        // Si la opción elegida falló, intentar la otra
        if (!introText) {
            if (useMemory && hasMemory) {
                // Si memoria falló, intentar IA
                console.log('[Mapa] Memoria falló, intentando IA...');
                try {
                    const prompt = this.buildIntroPrompt(previousPresentations);
                    const response = await fetch('/control-api/api/generate-narrative', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        introText = data.narrative || null;
                    }
                } catch (e) {
                    console.warn('[Mapa] Error generando intro con IA:', e);
                }
            } else if (hasMemory) {
                // Si IA falló, intentar memoria
                console.log('[Mapa] IA falló, intentando memoria...');
                const recentPresentations = previousPresentations.slice(-3);
                const randomPresentation = recentPresentations[Math.floor(Math.random() * recentPresentations.length)];
                if (randomPresentation && randomPresentation.text) {
                    introText = randomPresentation.text;
                }
            }
        }
        
        // Solo usar fallback si TODO falla (IA y memoria)
        if (!introText) {
            console.warn('[Mapa] Usando fallback - todas las fuentes fallaron');
            introText = this.getFallbackIntro();
        }
        
        // Iniciar narración
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        // Generar nueva versión en paralelo para la próxima vez (mejorar memoria)
        // Solo si usamos memoria esta vez, generar nueva con IA para enriquecer
        const generateNewIntroPromise = (async () => {
            if (useMemory) {
                // Si usamos memoria, generar nueva con IA para guardar
                try {
                    const prompt = this.buildIntroPrompt(previousPresentations);
                    const response = await fetch('/control-api/api/generate-narrative', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        return data.narrative || null;
                    }
                } catch (e) {
                    console.warn('[Mapa] Error generando nueva intro con IA:', e);
                }
            }
            return null;
        })();
        
        // Mostrar contenido multimedia global (imagen del mundo, viaje, etc.)
        try {
            const mediaRes = await fetch('/control-api/api/media-list');
            if (mediaRes.ok) {
                const mediaList = await mediaRes.json();
                // Buscar media global o de cualquier país para mostrar en la intro
                const globalMedia = mediaList.filter(m => 
                    m.folder && (m.folder.toLowerCase().includes('global') || 
                                m.folder.toLowerCase().includes('world') ||
                                m.folder.toLowerCase().includes('viaje'))
                );
                
                if (globalMedia.length === 0 && mediaList.length > 0) {
                    // Si no hay media global, usar cualquier imagen disponible
                    const randomMedia = mediaList[Math.floor(Math.random() * mediaList.length)];
                    if (randomMedia) {
                        multimediaOrchestrator.showMediaOverlay({
                            type: randomMedia.type || 'image',
                            url: randomMedia.url,
                            context: 'Introducción al viaje',
                            trigger: 'start'
                        }, 1000);
                    }
                } else if (globalMedia.length > 0) {
                    const selectedMedia = globalMedia[Math.floor(Math.random() * globalMedia.length)];
                    multimediaOrchestrator.showMediaOverlay({
                        type: selectedMedia.type || 'image',
                        url: selectedMedia.url,
                        context: 'Introducción al viaje',
                        trigger: 'start'
                    }, 1000);
                }
            }
        } catch (e) {
            console.warn('[Mapa] Error cargando media para intro:', e);
        }
        
        // Actualizar subtítulos
        avatarSubtitlesManager.updateSubtitles(introText, 2.5);
        
        // Hablar con el texto (de memoria, IA o fallback)
        audioManager.speak(introText, 'normal', async () => {
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            
            // Intentar usar la versión mejorada si ya está lista (para guardar en memoria)
            const improvedIntro = await generateNewIntroPromise;
            if (improvedIntro && improvedIntro !== introText) {
                // Guardar la nueva versión para la próxima vez
                introText = improvedIntro;
            }
            
            avatarSubtitlesManager.setSubtitles(introText);
            
            // Guardar presentación en memoria
            try {
                await fetch('/control-api/api/map-intro-memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        timestamp: Date.now(),
                        text: introText,
                        presentationsCount: previousPresentations.length + 1
                    })
                });
                console.log('[Mapa] Presentación guardada en memoria');
            } catch (e) {
                console.warn('[Mapa] Error guardando presentación:', e);
            }
            
            // Ocultar multimedia después de la intro
            setTimeout(() => {
                multimediaOrchestrator.hideAllOverlays();
            }, 2000);
            
            // Si Dream Mode está ON, cambiar automáticamente a otra página después de la intro
            if (eventManager.canProceedAuto()) {
                console.log('[Mapa] Dream Mode ON: Cambiando automáticamente después de intro...');
                setTimeout(() => {
                    // Elegir página aleatoria (diario, estado-actual, reflexion)
                    const pages = ['diario', 'estado-actual', 'reflexion'];
                    const randomPage = pages[Math.floor(Math.random() * pages.length)];
                    console.log(`[Mapa] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }, 3000); // Esperar 3 segundos para que se vea el subtítulo completo
            } else {
                // Mantener avatar visible (no ocultar) si no es Dream Mode
                // El avatar permanecerá visible para los siguientes relatos
            }
        });
    }
    
    /**
     * Construye el prompt para generar la introducción con IA
     */
    buildIntroPrompt(previousPresentations) {
        let prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real. Estás a punto de comenzar una nueva sesión de "El Viaje de ilfass".

Genera una introducción en primera persona (como ilfass) que:
1. Explique quién eres y qué es este proyecto
2. Describa el viaje que estás a punto de realizar
3. Mencione qué significa documentar la existencia humana en tiempo real
4. Sea personal, reflexiva y evocadora
5. Tenga entre 150 y 250 palabras
6. Use primera persona: "Soy ilfass...", "Estoy aquí para...", "Este viaje representa..."
7. NO repitas la frase "el tiempo pasa" más de una vez, si es que la usas
8. Varía las expresiones temporales: usa "en este momento", "ahora", "en este instante", "en la actualidad", etc.`;

        if (previousPresentations.length > 0) {
            prompt += `\n\nYa has hecho ${previousPresentations.length} presentación(es) anterior(es). Evita repetir exactamente lo mismo. Varía el enfoque, pero mantén la esencia del proyecto.`;
            
            // Incluir las últimas 2 presentaciones como contexto
            const recentPresentations = previousPresentations.slice(-2);
            if (recentPresentations.length > 0) {
                prompt += `\n\nPresentaciones recientes:\n`;
                recentPresentations.forEach((p, i) => {
                    prompt += `${i + 1}. ${p.text.substring(0, 100)}...\n`;
                });
            }
        }

        return prompt;
    }
    
    /**
     * Texto de fallback si la IA falla
     */
    getFallbackIntro() {
        // Fallback variado sin frases repetitivas
        const fallbacks = [
            `Soy ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real. Este es "El Viaje de ilfass", un proyecto donde recorro países, culturas y lugares, generando una memoria viva de cada experiencia. Cada país que visito me deja una huella, y cada visita construye sobre las anteriores, creando una historia continua y en evolución. Acompáñame en este viaje mientras exploramos el mundo juntos.`,
            `Bienvenido a "El Viaje de ilfass". Soy ilfass, una inteligencia diseñada para documentar la existencia humana en tiempo real. A través de este proyecto, recorro naciones, culturas y lugares, creando una memoria viva de cada encuentro. Cada destino me transforma, y cada experiencia se suma a las anteriores, formando un relato continuo y en constante evolución. Únete a mí en esta exploración del mundo.`,
            `Estás conectado a ilfass, una inteligencia que navega por el planeta documentando la humanidad en tiempo real. Este es "El Viaje de ilfass", una expedición donde visito países, descubro culturas y archivo lugares, generando una memoria dinámica de cada momento. Cada lugar que conozco me enriquece, y cada visita se entrelaza con las anteriores, construyendo una narrativa continua y siempre cambiante. Acompáñame en esta aventura global.`
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    resetZoom(releaseAudio = true) {
        // Detener cualquier viaje automático pendiente
        if (this.travelTimeout) clearTimeout(this.travelTimeout);

        // Ocultar todos los recuadros multimedia
        multimediaOrchestrator.hideAllOverlays();
        
        // Ocultar avatar y subtítulos
        avatarSubtitlesManager.hide();

        this.gCountries.selectAll(".country").classed("active-country", false);
        this.gLabels.selectAll("text").transition().duration(1000).style("opacity", 0);

        // TELEMETRÍA: Vuelta a órbita
        eventManager.reportTelemetry('MAPA', 'GLOBAL', 0);
        this.currentCountryId = null; // RESET STATE

        // Ocultar Narrativa
        const narrativeEl = document.getElementById('zoom-narrative');
        if (narrativeEl) narrativeEl.classList.add('hidden');

        // TELEMETRÍA: Vuelta a órbita
        eventManager.reportTelemetry('MAPA', 'GLOBAL', 0);

        // Cancelar voz y ocultar cápsula lateral
        audioManager.cancel();
        if (releaseAudio) {
            audioManager.releaseChannel(); // Liberar estado solo si se solicita
        }

        this.gMap.transition()
            .duration(3000)
            .ease(d3.easeCubicInOut)
            .attr("transform", "translate(0,0)scale(1)")
            .on("end", () => {
                this.gCountries.selectAll("path").style("stroke-width", "0.5px");
            });

        this.sunGroup.selectAll("circle").transition().duration(3000).attr("r", 15);
    }


    async triggerNewsEvent(forced = false) {
        // Si es automático, verificar flag
        if (!forced && !eventManager.canProceedAuto()) return;

        console.log("Intentando lanzar evento de noticias...");
        const infoEl = document.getElementById('broadcast-info');

        // 1. Intentar tomar control exclusivo
        if (forced) {
            audioManager.cancel();
            audioManager.releaseChannel();
        }

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

        // 3. Resetear vista a Global (pero mantener el canal de audio ocupado)
        this.resetZoom(false);

        // 4. Mostrar info de noticia (sin cápsula)
        if (infoEl) infoEl.textContent = "ACTUALIDAD INTERNACIONAL";

        // 5. Narrar
        const intro = newsProvider.getRandomIntro();
        const fullText = `${intro} ${newsItem.title}. ${newsItem.summary}`;

        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        audioManager.speak(fullText, 'news', () => {
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);

            // Callback al terminar de hablar
            this.travelTimeout = setTimeout(() => {
                // Ocultar UI
                if (infoEl) infoEl.textContent = "SISTEMA ONLINE";

                // Liberar canal y retomar ciclo
                audioManager.releaseChannel();
                this.cycleZoomIn(); // Retomar viaje
            }, 3000); // Pausa de 3s
        });
    }

    // Método speak antiguo eliminado, usamos audioManager
    updateDiary(entry) {
        const diaryEl = document.getElementById('travel-diary');
        const contentEl = document.getElementById('diary-content');

        if (diaryEl && contentEl) {
            contentEl.innerHTML = `
                <strong>${entry.country}</strong> - ${entry.time}<br>
                <span style="font-size:0.9em; color: #cbd5e1;">${entry.topic}</span><br>
                <p style="margin-top:5px; font-style:italic;">"${entry.content}"</p>
            `;
            diaryEl.classList.remove('hidden-bottom');

            // Ocultar después de un tiempo
            setTimeout(() => {
                diaryEl.classList.add('hidden-bottom');
            }, 15000);
        }
    }

    createRippleEffect(feature, countryId) {
        // Crear grupo para efectos de onda si no existe
        if (!this.rippleGroup) {
            this.rippleGroup = this.gMap.append("g").attr("class", "ripple-effects");
        }
        
        // Limpiar ondas anteriores
        this.rippleGroup.selectAll(".country-ripple").remove();
        
        // Crear múltiples ondas expansivas
        const numRipples = 3;
        const rippleDuration = 2000;
        
        for (let i = 0; i < numRipples; i++) {
            const ripple = this.rippleGroup.append("path")
                .datum(feature)
                .attr("d", this.pathGenerator)
                .attr("class", "country-ripple")
                .style("fill", "none")
                .style("stroke", "#38bdf8")
                .style("stroke-width", "2px")
                .style("opacity", 0.9)
                .style("filter", "drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))");
            
            // Animar la onda expansiva usando stroke-width y opacity
            const startWidth = 2;
            const endWidth = 12;
            const startOpacity = 0.9;
            const endOpacity = 0;
            
            ripple
                .transition()
                .delay(i * (rippleDuration / numRipples))
                .duration(rippleDuration)
                .styleTween("stroke-width", function() {
                    return d3.interpolateNumber(startWidth, endWidth);
                })
                .styleTween("opacity", function() {
                    return d3.interpolateNumber(startOpacity, endOpacity);
                })
                .ease(d3.easeLinear)
                .on("end", function() {
                    d3.select(this).remove();
                });
        }
    }

    /**
     * Inicia el relato continuo para un país
     * @param {object} target - Información del país
     * @param {object} context - Contexto actual
     * @param {object} timing - Configuración de tiempos
     */
    async startContinuousNarrative(target, context, timing) {
        const visitStartTime = Date.now();
        
        try {
            console.log(`[Mapa] Iniciando relato continuo para ${target.name}...`);
            
            // Obtener dayId del estado editorial
            let dayId = 'Unknown';
            try {
                const statusRes = await fetch('/control-api/status');
                if (statusRes.ok) {
                    const status = await statusRes.json();
                    if (status.editorial && status.editorial.dayId) {
                        dayId = status.editorial.dayId;
                    }
                }
            } catch (e) {
                console.warn('[Mapa] No se pudo obtener dayId:', e);
            }
            
            // Agregar dayId al contexto
            const enrichedContext = { ...context, dayId };
            
            // 1. Generar relato continuo con IA
            const continuousNarrative = await continuousNarrativeEngine.generateContinuousNarrative(target, enrichedContext);
            
            console.log(`[Mapa] Relato generado (${continuousNarrative.narrative.length} caracteres)`);
            console.log(`[Mapa] Multimedia planificado: ${continuousNarrative.multimedia.length} items`);
            
            // 2. Preparar multimedia
            const multimediaItems = [];
            
            for (const mediaPlan of continuousNarrative.multimedia) {
                // Generar o buscar media según el plan
                let mediaUrl = null;
                
                if (mediaPlan.prompt) {
                    // Generar con IA
                    try {
                        const imageRes = await fetch('/control-api/api/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: mediaPlan.prompt })
                        });
                        
                        if (imageRes.ok) {
                            const imageData = await imageRes.json();
                            // El servidor devuelve { url: "...", filename: "..." } o { error: "..." }
                            if (imageData.url) {
                                mediaUrl = imageData.url;
                            } else if (imageData.filename) {
                                // Construir URL relativa desde el servidor
                                mediaUrl = `/media/AI_Generated/${imageData.filename}`;
                            }
                        }
                    } catch (e) {
                        console.warn(`[Mapa] Error generando imagen: ${e}`);
                    }
                }
                
                // Si no se generó, buscar media curado
                if (!mediaUrl) {
                    try {
                        const mediaRes = await fetch('/control-api/api/media-list');
                        if (mediaRes.ok) {
                            const mediaList = await mediaRes.json();
                            const countryMedia = mediaList.filter(m => {
                                const folder = (m.folder || "").toLowerCase();
                                const countryName = target.name.toLowerCase();
                                return folder.includes(countryName) || countryName.includes(folder);
                            });
                            
                            if (countryMedia.length > 0) {
                                const randomMedia = countryMedia[Math.floor(Math.random() * countryMedia.length)];
                                mediaUrl = randomMedia.url;
                            }
                        }
                    } catch (e) {
                        console.warn(`[Mapa] Error cargando media curado: ${e}`);
                    }
                }
                
                if (mediaUrl) {
                    multimediaItems.push({
                        type: mediaPlan.type || 'image',
                        url: mediaUrl,
                        context: mediaPlan.context,
                        trigger: mediaPlan.trigger || 'start'
                    });
                } else {
                    // Si no se generó imagen, usar media curado como fallback
                    console.log(`[Mapa] No se pudo generar imagen, usando media curado como fallback`);
                }
            }
            
            // 3. Determinar timing de multimedia basado en el relato
            const narrativeWords = continuousNarrative.narrative.split(' ');
            const totalWords = narrativeWords.length;
            const wordsPerSecond = 2.5; // Velocidad de narración
            const totalDuration = (totalWords / wordsPerSecond) * 1000;
            
            // 4. Mostrar multimedia según triggers
            multimediaItems.forEach((item, index) => {
                let delay = 0;
                if (item.trigger === 'start') delay = 1000;
                else if (item.trigger === 'mid') delay = totalDuration / 2;
                else if (item.trigger === 'reflection') delay = totalDuration * 0.7;
                
                multimediaOrchestrator.showMediaOverlay(item, delay);
            });
            
            // 5. Mostrar avatar y subtítulos
            avatarSubtitlesManager.show();
            
            // 6. Narrar el relato con subtítulos
            pacingEngine.startEvent(CONTENT_TYPES.VOICE);
            
            // Cancelar cualquier timeout de zoom out que pueda estar pendiente
            if (this.travelTimeout) {
                clearTimeout(this.travelTimeout);
                this.travelTimeout = null;
            }
            
            // Marcar que estamos narrando para prevenir zoom out
            this.isNarrating = true;
            
            // Preparar subtítulos sincronizados con la voz usando eventos boundary
            const cleanNarrative = continuousNarrative.narrative.replace(/[^\w\s.,;:!?áéíóúñüÁÉÍÓÚÑÜ]/g, '');
            const words = cleanNarrative.split(/\s+/).filter(w => w.trim().length > 0);
            let currentWordIndex = 0;
            const maxWordsPerLine = 10;
            const maxTotalWords = maxWordsPerLine * 2; // 2 líneas
            let displayedWords = [];
            
            // Función para actualizar subtítulos mostrando solo las últimas palabras
            const updateSubtitlesSync = () => {
                if (currentWordIndex < words.length) {
                    displayedWords.push(words[currentWordIndex]);
                    
                    // Si excede el máximo, eliminar la primera palabra
                    if (displayedWords.length > maxTotalWords) {
                        displayedWords.shift();
                    }
                    
                    // Mostrar solo las palabras actuales (no acumulativo)
                    const wordsToShow = displayedWords.join(' ');
                    avatarSubtitlesManager.setSubtitles(wordsToShow);
                    currentWordIndex++;
                }
            };
            
            // Limpiar subtítulos inicialmente
            avatarSubtitlesManager.clearSubtitles();
            
            // Crear utterance para sincronización (usar cleanNarrative ya declarado arriba)
            const utterance = new SpeechSynthesisUtterance(cleanNarrative);
            utterance.lang = 'es-ES';
            utterance.rate = 0.85;
            utterance.pitch = 0.95;
            utterance.volume = 1.0;
            
            // Seleccionar mejor voz
            const voices = window.speechSynthesis.getVoices();
            const bestVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Microsoft'))) || 
                            voices.find(v => v.lang.startsWith('es'));
            if (bestVoice) utterance.voice = bestVoice;
            
            // Sincronizar subtítulos con la voz usando eventos boundary
            utterance.onboundary = (event) => {
                if (event.name === 'word' || event.name === 'sentence') {
                    updateSubtitlesSync();
                }
            };
            
            utterance.onstart = () => {
                // Mostrar primera palabra inmediatamente
                if (words.length > 0) {
                    updateSubtitlesSync();
                }
            };
            
            // Bajar música antes de hablar (ducking)
            if (audioManager.isMusicPlaying) {
                audioManager.fadeAudio(audioManager.musicLayer, audioManager.musicLayer.volume, 0.05, 500);
            }
            
            // Hablar directamente con speechSynthesis para tener control completo de los eventos
            window.speechSynthesis.speak(utterance);
            
            // Esperar a que termine el speech
            const speechPromise = new Promise((resolve) => {
                utterance.onend = () => {
                    // Mostrar todas las palabras restantes al final
                    while (currentWordIndex < words.length) {
                        updateSubtitlesSync();
                    }
                    resolve();
                };
                
                utterance.onerror = () => {
                    resolve();
                };
            });
            
            await speechPromise;
            
            // Restaurar música después de hablar
            if (audioManager.isMusicPlaying) {
                audioManager.fadeAudio(audioManager.musicLayer, audioManager.musicLayer.volume, 0.3, 1000);
            }
            
            // Marcar que terminó la narración
            this.isNarrating = false;
            
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            
            // Mantener subtítulos visibles por 2 segundos antes de limpiar
            setTimeout(() => {
                avatarSubtitlesManager.clearSubtitles();
            }, 2000);
            
            // 7. Guardar visita en memoria
            const visitData = {
                visitId: `visit_${Date.now()}`,
                timestamp: visitStartTime,
                dayId: enrichedContext.dayId || 'Unknown',
                narrative: continuousNarrative.narrative,
                multimedia: multimediaItems.map(item => ({
                    type: item.type,
                    url: item.url,
                    context: item.context,
                    timestamp: visitStartTime
                })),
                reflections: continuousNarrative.reflections,
                dataPoints: continuousNarrative.dataPoints,
                emotionalNotes: continuousNarrative.emotionalNotes,
                isFirstVisit: continuousNarrative.isFirstVisit
            };
            
            await countryMemoryManager.saveVisit(target.id, visitData);
            console.log(`[Mapa] ✅ Visita guardada en memoria para ${target.name}`);
            
            // 8. Esperar un momento antes de ocultar y hacer zoom out
            setTimeout(() => {
                multimediaOrchestrator.hideAllOverlays();
                avatarSubtitlesManager.hide();
                // Solo hacer zoom out si no hay otra narración iniciándose
                if (!this.isNarrating) {
                    this.cycleZoomOut();
                }
            }, 3000); // 3 segundos para que se vea el subtítulo completo
            
            // 8. Actualizar diario con el relato
            this.updateDiary({
                country: target.name,
                time: new Date().toLocaleTimeString('es-ES'),
                topic: continuousNarrative.isFirstVisit ? 'Primera Visita' : 'Visita Subsecuente',
                content: continuousNarrative.narrative.substring(0, 200) + '...'
            });
            
            // 9. Info del país ya se muestra en los subtítulos del avatar
            
            // NO hacer zoom out automático - esperar a que termine el audio
            // El zoom out se hace en el callback de audioManager.speak
            if (this.travelTimeout) {
                clearTimeout(this.travelTimeout);
                this.travelTimeout = null;
            }
            
        } catch (e) {
            console.error(`[Mapa] Error en relato continuo:`, e);
            this.isNarrating = false;
            // Fallback a sistema anterior si falla
            multimediaOrchestrator.hideAllOverlays();
            avatarSubtitlesManager.hide();
            // Esperar un momento antes de hacer zoom out en caso de error
            setTimeout(() => {
                if (!this.isNarrating) {
                    this.cycleZoomOut();
                }
            }, 2000);
        }
    }

    async generateMultimediaContent(country, narrative, context) {
        try {
            console.log(`[Mapa] Generando contenido multimedia para ${country.name}...`);
            
            // Generar imagen con IA basada en el país y la narrativa
            const imagePrompt = `Paisaje representativo de ${country.name}, estilo cinematográfico, alta calidad, sin texto`;
            
            const imageRes = await fetch('/control-api/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: imagePrompt })
            });
            
            if (imageRes.ok) {
                const imageData = await imageRes.json();
                if (imageData.url) {
                    console.log(`[Mapa] Imagen generada: ${imageData.url}`);
                    
                    // Mostrar la imagen después de un breve delay (durante la narración)
                    setTimeout(() => {
                        this.showMediaOverlay(imageData.url, 'image');
                    }, 2000);
                }
            }
            
            // También buscar media curado del país si existe
            try {
                const mediaRes = await fetch('/control-api/api/media-list');
                if (mediaRes.ok) {
                    const mediaList = await mediaRes.json();
                    const countryMedia = mediaList.filter(m => {
                        const folder = (m.folder || "").toLowerCase();
                        const countryName = country.name.toLowerCase();
                        return folder.includes(countryName) || countryName.includes(folder);
                    });
                    
                    if (countryMedia.length > 0) {
                        // Seleccionar un media aleatorio del país
                        const randomMedia = countryMedia[Math.floor(Math.random() * countryMedia.length)];
                        console.log(`[Mapa] Mostrando media curado: ${randomMedia.name}`);
                        
                        // Mostrar después de la imagen generada
                        setTimeout(() => {
                            this.showMediaOverlay(randomMedia.url, randomMedia.type || 'image');
                        }, 8000);
                    }
                }
            } catch (e) {
                console.warn("[Mapa] Error cargando media curado:", e);
            }
            
        } catch (e) {
            console.error("[Mapa] Error generando contenido multimedia:", e);
        }
    }

    showMediaOverlay(url, type = 'image') {
        // Eliminar existente si hay
        const existing = document.getElementById('media-overlay-container');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'media-overlay-container';
        overlay.className = 'fade-in';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.9)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '500';
        overlay.style.cursor = 'pointer';

        // Cerrar al click
        overlay.onclick = () => overlay.remove();

        let content;
        if (type === 'video') {
            content = document.createElement('video');
            content.src = url;
            content.autoplay = true;
            content.controls = false; // Estilo cinemático
            content.style.maxWidth = '90%';
            content.style.maxHeight = '90%';
            content.style.borderRadius = '8px';
            content.style.boxShadow = '0 0 50px rgba(0,0,0,0.8)';
            content.onended = () => overlay.remove(); // Cerrar al terminar
        } else {
            content = document.createElement('img');
            content.src = url;
            content.style.maxWidth = '90%';
            content.style.maxHeight = '90%';
            content.style.borderRadius = '8px';
            content.style.boxShadow = '0 0 50px rgba(255,255,255,0.1)';
            content.style.objectFit = 'contain';
        }

        overlay.appendChild(content);
        this.container.appendChild(overlay);

        // Sonido de "Open Media" (opcional)
        // audioManager.playSound('ui_open');
    }

    unmount() {
        pacingEngine.endCurrentEvent(); // Cerrar tracking actual
        audioManager.cancel();
        if (this.unsubscribeTime) this.unsubscribeTime();
        if (this.travelTimeout) clearTimeout(this.travelTimeout);
        scheduler.clearTasks(); // Limpiar tareas del scheduler (cápsulas)
        this.container.innerHTML = '';
        this.svg = null;
    }
}
