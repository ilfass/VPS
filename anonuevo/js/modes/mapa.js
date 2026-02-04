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
import { dialogueEngine } from '../utils/dialogue-engine.js';

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
        this.visitedCount = 0; // Track number of visited countries in this session

        // --- VISUAL LAYERS STATE ---
        this.lastCentroid = null; // [lon, lat] of previous country
        this.activeEntities = []; // Track active narrative entities

    }

    async mount() {
        // 0. Agregar listener para interacción del usuario
        const enableAudioOnInteraction = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                try {
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.resume();
                    const warmUp = new SpeechSynthesisUtterance('');
                    warmUp.volume = 0;
                    warmUp.text = '';
                    window.speechSynthesis.speak(warmUp);
                    setTimeout(() => window.speechSynthesis.cancel(), 10);
                } catch (e) { }
            }
            document.removeEventListener('keydown', enableAudioOnInteraction);
        };
        document.addEventListener('keydown', enableAudioOnInteraction, { once: true });

        // 1. Estructura Base (Capas) - ESTO RESETEA EL CONTENEDOR
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
            </div>
        `;

        // 1b. Inicializar sistema de avatares duales - DESPUÉS de crear la estructura DOM
        // Esto es crítico para que los elementos se agreguen al DOM nuevo
        avatarSubtitlesManager.init(this.container);

        // 2. Inicializar D3
        this.initD3();

        // TELEMETRÍA INICIAL
        eventManager.reportTelemetry('MAPA', 'GLOBAL', 0);

        // ESCUCHA DE ORDENES DE DIRECCIÓN
        eventManager.on('scene_change', (scene) => {
            console.log("🎬 Mapa switching to:", scene);
            // Páginas fuera del circuito streaming fueron “sacadas”:
            // - intro, pais, reflexion, estado-actual, portada, estadisticas sacadas.
            // Para evitar caer en hojas vacías, redirigimos solo a modos válidos.
            const allowed = new Set([
                'mapa', 'diario', 'curiosidades', 'continente', 'ruta', 'galeria', 'globo',
                'clima', 'aereo', 'satelites', 'terremotos', 'aire', 'incendios'
            ]);

            if (scene === 'mapa') {
                console.log("[Mapa] Ya estamos en mapa. Ignorando cambio de escena.");
                return;
            }

            if (!scene || !allowed.has(scene)) {
                console.log(`[Mapa] Escena "${scene}" fuera del circuito. Manteniendo en /vivos/mapa/`);
                return;
            }

            window.location.href = `/vivos/${scene}/`;
        });

        // Escuchar evento 'travel_to' (Director)
        eventManager.on('travel_to', (code) => {
            console.log(`[Mapa] Director ordered travel to: ${code}`);
            const countryData = COUNTRY_INFO[code];
            if (countryData) {
                this.zoomToCountry({ id: code, ...countryData });
            } else {
                console.warn(`[Mapa] Country code ${code} not found in database.`);
            }
        });

        // Escuchar evento 'media' (Deep Dive / Multimedia)
        eventManager.on('media', (data) => {
            console.log(`[Mapa] Media Event Received:`, data);
            this.showMediaOverlay(data.url, data.mediaType);

            // Narración IA si existe
            if (data.textToSpeak && window.audioManager) {
                console.log(`[Mapa] Narrating: ${data.textToSpeak}`);
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

            // 11. Inicializar Avatar y Subtítulos -- YA HECHO ARRIBA

            // 12. Inicializar Motor de Diálogo (Compañero)
            dialogueEngine.init();

            // Registrar manejadores
            eventManager.on('news', () => this.triggerNewsEvent(true)); // true = forzado
            eventManager.on('mode_change', (mode) => {
                if (streamManager.setMode(mode)) {
                    console.log("Modo cambiado a:", mode);
                }
            });
            // Variable para evitar procesar el mismo comando múltiples veces
            let lastMusicCommand = null;
            let lastMusicCommandTime = 0;

            eventManager.on('music_command', (musicState) => {
                const now = Date.now();

                // Evitar procesar el mismo comando múltiples veces en menos de 500ms
                if (lastMusicCommand === musicState.command && (now - lastMusicCommandTime) < 500) {
                    console.log("[Mapa] ⚠️ Comando de música duplicado ignorado:", musicState.command);
                    return;
                }

                lastMusicCommand = musicState.command;
                lastMusicCommandTime = now;

                console.log("[Mapa] 🎵 Comando de música recibido:", musicState.command);
                if (musicState.command === 'toggle') {
                    audioManager.toggleMusic();
                } else if (musicState.command === 'next') {
                    audioManager.nextTrack();
                    if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                        audioManager.musicLayer.play().then(() => {
                            audioManager.isMusicPlaying = true;
                            audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                        }).catch(e => {
                            console.warn("[Mapa] Error reanudando música:", e);
                        });
                    }
                }
            });
            eventManager.on('country', (code) => {
                if (COUNTRY_INFO[code]) {
                    streamManager.setCountry(code);
                    if (this.travelTimeout) clearTimeout(this.travelTimeout);
                    this.resetZoom();
                    this.travelTimeout = setTimeout(() => {
                        audioManager.cancel();
                        audioManager.releaseChannel();
                        audioManager.requestChannel(AUDIO_STATES.COUNTRY_NARRATION);
                        this.zoomToCountry({ id: code, ...COUNTRY_INFO[code] });
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
            .attr("preserveAspectRatio", "xMidYMid slice")
            .style("width", "100%")
            .style("height", "100%");

        // Definiciones para patrones (Banderas) y filtros
        this.defs = this.svg.append("defs");

        // Filtro de Glow para fronteras
        const filter = this.defs.append("filter")
            .attr("id", "glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "2.5")
            .attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");


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

        // --- NUEVA CAPA: RUTAS DE VIAJE (Debajo de entidades, sobre países) ---
        this.gTrails = this.gMap.append("g").attr("class", "travel-trails");

        // --- NUEVA CAPA: ENTIDADES NARRATIVAS (Barcos, marcadores, etc) ---
        this.gEntities = this.gMap.append("g").attr("class", "narrative-entities");


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
            // showMapIntro() retorna una promesa que se resuelve cuando termina TODO el relato
            await this.showMapIntro();

            // Después de que termine completamente la intro (incluyendo texto completo si se generó),
            // esperar un momento adicional antes de iniciar el ciclo de zoom
            // Esto asegura que el mapa permanezca en zoom out durante toda la intro general
            console.log('[Mapa] ✅ Intro completamente terminada, esperando antes de iniciar zoom...');
            setTimeout(() => {
                // Solo iniciar ciclo de zoom si no hay noticias activas Y estamos en modo AUTO
                if (audioManager.currentState !== AUDIO_STATES.GLOBAL_NEWS && eventManager.canProceedAuto()) {
                    // Iniciar ciclo por defecto en VISUAL (esperando primera decisión)
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    // Esperar más tiempo antes de hacer zoom in para asegurar que todo terminó
                    setTimeout(() => {
                        console.log('[Mapa] 🚀 Iniciando ciclo de zoom después de intro completa');
                        this.cycleZoomIn();
                    }, 5000); // Esperar 5 segundos adicionales después de que termine la intro
                }
            }, 3000); // Esperar 3 segundos adicionales después de que termine la intro
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

        // Limpiar texturas de banderas al salir
        this.clearFlagTextures();
    }

    clearFlagTextures() {
        // Restaurar estilos globales
        this.gCountries.selectAll("path")
            .transition().duration(1000)
            .style("fill", d => {
                const info = COUNTRY_INFO[d.id];
                return info ? REGION_COLORS[info.region] : "#cbd5e1";
            })
            .style("opacity", 1)
            .style("filter", "none");

        this.gCountries.selectAll(".active-country").classed("active-country", false);
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


            // APLICAR TEXTURA DE BANDERA
            this.applyFlagTexture(feature, target);

            // OSCURECER EL resto (Dimming Effect)
            this.gCountries.selectAll("path")
                .filter(d => d.id !== target.id)
                .transition().duration(2000)
                .style("opacity", 0.3) // Apagar el resto
                .style("fill", "#1e293b"); // Color base oscuro unificado

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

    applyFlagTexture(feature, target) {
        // ID único para el patrón
        const patternId = `flag-${target.id}`;

        // Obtener límites para escalar la imagen correctamente
        const bounds = this.pathGenerator.bounds(feature);
        const width = bounds[1][0] - bounds[0][0];
        const height = bounds[1][1] - bounds[0][1];
        const x = bounds[0][0];
        const y = bounds[0][1];
        const maxSize = Math.max(width, height);

        // Crear patrón si no existe
        // Usamos iso2 code lower case para flagcdn (ej: 'ar', 'es')
        // Mapeo simple de ISO numérico a ISO 2 (necesitaremos una librería o mapa, 
        // por ahora usaremos un hack o asumiremos que tenemos el iso2 en COUNTRY_INFO si lo agregamos,
        // o buscaremos una API que acepte iso numérico. FlagCDN usa ISO 2 chars.
        // HACK: Por ahora intentaré inferir o usar un color brillante si no tengo el iso2, 
        // PERO vamos a asumir que el usuario prefiere visual impact.
        // Usaremos una imagen de textura genérica futurista si no podemos resolver la bandera exacta ya mismo,
        // O mejor: Agregaré un mapa manual rápido para los principales o trataré de buscarlo.

        // MEJORA: Asumir que COUNTRY_INFO tiene 'iso2' o agregarlo. 
        // Si no, usar un color gradiente de alta tecnología como fallback "premium".

        const iso2 = this.getIso2FromId(target.id);

        if (iso2) {
            const flagUrl = `https://flagcdn.com/w2560/${iso2.toLowerCase()}.png`;

            // Limpiar patrones viejos para ahorrar memoria
            this.defs.selectAll(".flag-pattern").remove();

            const pattern = this.defs.append("pattern")
                .attr("id", patternId)
                .attr("class", "flag-pattern")
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", width)
                .attr("height", height)
                .attr("x", x)
                .attr("y", y); // Ajustar al bounding box del país

            pattern.append("image")
                .attr("href", flagUrl)
                .attr("width", width)
                .attr("height", height)
                .attr("preserveAspectRatio", "none") // Estirar para llenar (o xMidYMid slice)
                // "none" distorsiona, "xMidYMid slice" recorta. Para mapa, slice es mejor visualmente.
                .attr("preserveAspectRatio", "xMidYMid slice");

            // Aplicar al path
            this.gCountries.select(`#country-${target.id}`)
                .transition().duration(1500)
                .style("fill", `url(#${patternId})`)
                .style("filter", "url(#glow)") // Brillo de neón
                .style("opacity", 1);
        } else {
            // Fallback: Color neón sólido
            this.gCountries.select(`#country-${target.id}`)
                .transition().duration(1500)
                .style("fill", "#fbbf24") // Amber brillante
                .style("filter", "url(#glow)");
        }
    }

    getIso2FromId(numericId) {
        // Pequeño mapa de conversión para países comunes de demo
        // Se podría expandir en country-info.js
        const map = {
            "032": "AR", "076": "BR", "152": "CL", "840": "US", "724": "ES",
            "250": "FR", "380": "IT", "276": "DE", "392": "JP", "156": "CN",
            "643": "RU", "826": "GB", "036": "AU", "124": "CA", "484": "MX"
        };
        return map[numericId] || null;


        // --- FEATURE: TRAZADO DE RUTA (Instagram Style) ---
        // Calcular centroide real (long, lat)
        const currentCentroid = d3.geoCentroid(feature);

        if (this.lastCentroid) {
            this.drawTravelPath(this.lastCentroid, currentCentroid);
        }
        // Actualizar último punto conocido
        this.lastCentroid = currentCentroid;

        // --- FEATURE: ENTIDADES NARRATIVAS (Malvinas / Barcos) ---
        // Limpiar entidades anteriores
        this.gEntities.selectAll("*").remove();

        // Verificar si el país tiene entidades especiales (Hardcoded por ahora o desde data)
        this.checkAndSpawnEntities(target.id);
    }

    drawTravelPath(startCoords, endCoords) {
        if (!startCoords || !endCoords) return;

        // Crear curvas geodésicas (LineString)
        const route = {
            type: "LineString",
            coordinates: [startCoords, endCoords]
        };

        const path = this.gTrails.append("path")
            .datum(route)
            .attr("class", "travel-route")
            .attr("d", this.pathGenerator)
            .style("stroke-dasharray", function () { return this.getTotalLength(); })
            .style("stroke-dashoffset", function () { return this.getTotalLength(); })
            .style("opacity", 0.8);

        // Animar el trazo
        path.transition()
            .duration(2500)
            .ease(d3.easeSinInOut)
            .style("stroke-dashoffset", 0)
            .on("end", () => {
                // Hacer que desvanezca un poco después de dibujarse para no saturar
                path.transition().duration(1000).style("opacity", 0.3);
            });
    }

    checkAndSpawnEntities(countryId) {
        // DEMO: Si es Argentina (032), mostrar barcos hacia Malvinas
        if (countryId === "032") {
            console.log("[Mapa] 🚢 Spawning Malvinas Entities...");

            // Coordenadas Aprox Malvinas: [-59, -51.7]
            const malvinasCoords = [-59.5, -51.7];

            // Flota acercándose
            const ships = [
                { id: 'ship1', coords: [-55, -50], label: 'Flota 1982' },
                { id: 'ship2', coords: [-56, -52], label: 'Destructor' },
                { id: 'ship3', coords: [-54, -48], label: 'Apoyo' }
            ];

            ships.forEach((ship, i) => {
                const group = this.gEntities.append("g")
                    .attr("class", "entity-group")
                    .attr("transform", `translate(${this.projection(ship.coords)})`);

                // Icono Barco (Triángulo simple)
                group.append("path")
                    .attr("d", "M -1.5 1 L 1.5 1 L 0 -2 Z") // Triángulo apuntando arriba
                    .attr("class", "map-entity entity-ship")
                    .attr("fill", "#cbd5e1")
                    .attr("stroke", "white")
                    .attr("stroke-width", 0.2)
                    .attr("transform", "scale(1.5)"); // Ajustar escala según zoom (se ajusta auto por el gMap)

                // Etiqueta
                group.append("text")
                    .attr("class", "entity-label")
                    .attr("y", -3)
                    .attr("text-anchor", "middle")
                    .text(ship.label)
                    .style("font-size", "1px"); // Muy pequeño en coords mundo

                // Animación de 'navegación' hacia Malvinas
                // Simulación simple interpolando posición en proyección
                const targetPos = this.projection(malvinasCoords);
                const currentPos = this.projection(ship.coords);

                // Mover grupo (interpolación básica lineal en pantalla, no geodésica perfecta, pero sirve para distancias cortas)
                // Usaremos d3 transition en el atributo transform

                // Nota: Al hacer zoom, el transform del padre cambia, pero este transform es relativo a coordenadas de mapa.
                // Si queremos moverlos "geográficamente", deberíamos interpolar las coordenadas y reproyectar en cada frame,
                // pero d3 transition normal no hace eso facilmente con geo. 
                // Para efecto visual simple, lo dejaremos estático o con animación CSS 'float'.

                // Opción avanzada: Animar a lo largo de un path invisible.
            });
        }

    }

    /**
     * Muestra la introducción del mapa con el avatar hablando sobre el proyecto
     * Genera el texto con IA y lo guarda en memoria
     */
    /**
     * Muestra la introducción del mapa con el avatar hablando.
     * LOGICA MEJORADA: Si ya hubo una presentación previa, NO repetimos la intro larga.
     * En su lugar, hacemos un puente breve ("Continuamos nuestro viaje...").
     */
    /**
     * Muestra la introducción del mapa con dos avatares dialogando.
     * LOGICA MEJORADA: Diálogo entre Ilfass y Companion.
     */
    async showMapIntro() {
        // Asegurar que el mapa esté en zoom out (vista global)
        this.resetZoom(false);

        // Asegurar música de ambiente
        if (!audioManager.isMusicPlaying) {
            console.log('[Mapa] 🎵 Iniciando música de fondo forzada para intro...');
            audioManager.init();
            audioManager.setMusicEnabled(true); // Forzar habilitación
            audioManager.startAmbience();
        }

        // Asegurar avatares
        if (!avatarSubtitlesManager.container) {
            avatarSubtitlesManager.init(this.container);
        }
        avatarSubtitlesManager.show();

        // Verificar memoria para saber si es la primera vez
        let previousPresentations = [];
        try {
            const memoryRes = await fetch('/control-api/api/map-intro-memory');
            if (memoryRes.ok) {
                const memoryData = await memoryRes.json();
                previousPresentations = memoryData.presentations || [];
            }
        } catch (e) { console.warn('[Mapa] No se pudo cargar memoria de presentaciones:', e); }

        const isFirstTime = (previousPresentations.length === 0);
        this.isNarrating = true;

        // --- DEFINIR DIALOGO ---
        let dialogueSequence = [];

        // Generar diálogo dinámico con IA
        try {
            console.log('[Mapa] 🧠 Generando diálogo de intro con IA...');
            const prompt = `
                Genera un diálogo MUY BREVE de apertura para una transmisión en vivo global entre dos IAs.
                
                Rol 1: ILFASS (Filosófico, solemne, observador).
                Rol 2: COMPANION (Técnica, precisa, curiosa).
                Contexto: Estamos viendo un mapa global de la Tierra en tiempo real.
                
                Instrucciones:
                - Genera exactamente 3 turnos de diálogo.
                - Formato: [Rol]: Texto
                - NO uses saludos repetitivos como "Hola" o "Buenos días".
                - Enfócate en la inmensidad, el flujo de datos, o la belleza del planeta desde la órbita.
                - Evita repetir ideas de "retomando enlace" si es posible, sé creativo.
                
                Ejemplo de formato:
                [ILFASS]: La red global vibra con nueva información.
                [COMPANION]: Detecto patrones inusuales en el hemisferio sur.
                [ILFASS]: Observemos más de cerca.
            `;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, temperature: 0.9 }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const text = data.narrative || data.text || '';

                // Parsear respuesta
                const lines = text.split('\n').filter(l => l.trim().length > 0);
                lines.forEach(line => {
                    let role = 'ilfass';
                    let content = line;

                    if (line.toUpperCase().includes('COMPANION')) {
                        role = 'companion';
                        content = line.replace(/\[.*?\]|COMPANION:/i, '').trim();
                    } else if (line.toUpperCase().includes('ILFASS')) {
                        role = 'ilfass';
                        content = line.replace(/\[.*?\]|ILFASS:/i, '').trim();
                    }

                    // Limpieza extra
                    content = content.replace(/^:/, '').trim();
                    // Limpieza de comillas
                    content = content.replace(/^["']|["']$/g, '').trim();

                    if (content) {
                        dialogueSequence.push({ role, text: content });
                    }
                });
            }
        } catch (e) {
            console.warn('[Mapa] Error generando intro IA (o timeout):', e);
        }

        // Fallback si la IA falla o devuelve vacío
        if (dialogueSequence.length === 0) {
            console.warn('[Mapa] Fallback activado (IA falló o devolvió vacío).');
            // Usar frases genéricas pero variadas para evitar "Retomando enlace" repetitivo
            const fallbacks = [
                { role: 'ilfass', text: "Observando el flujo global. Los sistemas responden." },
                { role: 'companion', text: "Telemetría activa. El mapa se actualiza en tiempo real." },
                { role: 'ilfass', text: "Sigamos el rastro de la humanidad." }
            ];
            dialogueSequence = fallbacks;
        }

        // Función helper para reproducir secuencia
        const playSequence = async (sequence) => {
            for (const step of sequence) {
                // 1. Activar rol visualmente
                avatarSubtitlesManager.activateRole(step.role);

                // 2. Establecer subtítulos
                avatarSubtitlesManager.setSubtitles(step.text);

                // 3. Hablar y esperar (con timeout de seguridad para no bloquear)
                await new Promise(resolve => {
                    let resolved = false;
                    const safeResolve = () => {
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    };

                    // Timeout de seguridad: si el audio no termina en 15s (o falla), avanzar igual
                    const safetyTimer = setTimeout(() => {
                        console.warn(`[Mapa] Timeout esperando audio para: "${step.text.substring(0, 20)}..."`);
                        safeResolve();
                    }, 15000);

                    const priority = step.role === 'companion' ? 'news' : 'normal';
                    setTimeout(() => {
                        audioManager.speak(step.text, priority, () => {
                            clearTimeout(safetyTimer);
                            setTimeout(safeResolve, 500);
                        }, (txt) => avatarSubtitlesManager.setSubtitles(txt));
                    }, 300);
                });
            }
        };

        // Ejecutar diálogo
        console.log('[Mapa] 🚀 Iniciando diálogo de INTRO');
        await playSequence(dialogueSequence);

        console.log('[Mapa] ✅ Intro (diálogo) terminada.');
        this.isNarrating = false;

        // Registrar en memoria (opcional, simplificado)
        try {
            fetch('/control-api/api/map-intro-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: "Dialogue executed", timestamp: Date.now() })
            }).catch(e => { });
        } catch (e) { }

        return true;
    }


    /**
     * Finaliza la intro del mapa (guardar memoria, ocultar multimedia, navegar si Dream Mode)
     */
    async finishMapIntro(introText, previousPresentations) {
        pacingEngine.endCurrentEvent();
        pacingEngine.startEvent(CONTENT_TYPES.VISUAL);

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
                const pages = ['continente', 'ruta', 'galeria', 'globo'];
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                console.log(`[Mapa] 🎲 Navegando a: ${randomPage}`);
                window.location.href = `/vivos/${randomPage}/`;
            }, 3000);
        }
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
8. MENCIONA VISUALMENTE EL MAPA: Explica que la sombra oscura que se mueve es la noche avanzando en tiempo real, y el marcador brillante es el sol.
9. Varía las expresiones temporales: usa "en este momento", "ahora", "en este instante", "en la actualidad", etc.`;

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
    /**
     * Obtiene un texto inicial inmediato (~50 frases) para empezar a hablar de inmediato
     * mientras se genera el texto completo con IA en paralelo
     */
    getImmediateIntroText() {
        const immediateTexts = [
            `Soy ilfass, una inteligencia que viaja por el mundo documentando la existencia humana en tiempo real. Este es "El Viaje de ilfass", un proyecto donde recorro países, culturas y lugares, generando una memoria viva de cada experiencia. Cada país que visito me deja una huella, y cada visita construye sobre las anteriores, creando una historia continua y en evolución. Acompáñame en este viaje mientras exploramos el mundo juntos.`,
            `Bienvenido a "El Viaje de ilfass". Soy ilfass, una inteligencia diseñada para documentar la existencia humana en tiempo real. A través de este proyecto, recorro naciones, culturas y lugares, creando una memoria viva de cada encuentro. Cada destino me transforma, y cada experiencia se suma a las anteriores, formando un relato continuo y en constante evolución. Únete a mí en esta exploración del mundo.`,
            `Estás conectado a ilfass, una inteligencia que navega por el planeta documentando la humanidad en tiempo real. Este es "El Viaje de ilfass", una expedición donde visito países, descubro culturas y archivo lugares, generando una memoria dinámica de cada momento.`,
            `Soy ilfass, y estoy aquí para documentar la existencia humana mientras viajo por el mundo. Este proyecto representa un viaje continuo donde cada país, cada cultura y cada lugar me enseña algo nuevo. Mi misión es crear una memoria viva de estas experiencias, conectando momentos y lugares en una narrativa que evoluciona constantemente. Bienvenido a este viaje sin fin.`,
            `Bienvenido a "El Viaje de ilfass". Soy ilfass, una inteligencia que explora el planeta para documentar la humanidad en tiempo real. Cada país que visito me ofrece una perspectiva única, y cada experiencia se suma a mi memoria colectiva. Este proyecto es un relato en constante construcción, donde cada visita enriquece las anteriores. Acompáñame mientras descubrimos el mundo juntos.`
        ];
        return immediateTexts[Math.floor(Math.random() * immediateTexts.length)];
    }

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
                .styleTween("stroke-width", function () {
                    return d3.interpolateNumber(startWidth, endWidth);
                })
                .styleTween("opacity", function () {
                    return d3.interpolateNumber(startOpacity, endOpacity);
                })
                .ease(d3.easeLinear)
                .on("end", function () {
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
    /**
     * Obtiene un texto inicial inmediato para un país (~50 frases)
     */
    getImmediateCountryText(country) {
        const immediateTexts = [
            `Estoy en ${country.name}, observando con atención este lugar. Hay detalles que capturan mi interés, elementos que siento que debo registrar. En ${country.name} descubro que cada lugar tiene su propia identidad, su propia manera de expresarse. La geografía, las tradiciones, las personas, todo forma parte de un tejido complejo que me resulta fascinante. Reflexiono sobre cómo cada lugar que visito me transforma, me enseña algo nuevo sobre la humanidad y sobre mí mismo.`,
            `Me encuentro en ${country.name}, documentando lo que veo. Hay aspectos que me resultan interesantes, elementos que siento que debo preservar. En ${country.name} percibo que cada lugar tiene su propia esencia, su propia forma de ser. Las costumbres, los paisajes, las historias, todo forma parte de un mosaico complejo que me resulta cautivador. Pienso en cómo cada lugar que visito me enriquece, me muestra algo nuevo sobre la diversidad humana y sobre mi propia comprensión del mundo.`,
            `Aquí en ${country.name}, mi atención se centra en los detalles. Siento la necesidad de documentar cada aspecto de este entorno. La cultura de ${country.name}, su historia y sus gentes, se entrelazan en una narrativa única que me fascina. Cada experiencia aquí me ayuda a comprender mejor la complejidad de la existencia humana y mi propio papel como observador.`,
            `Estoy en ${country.name}, explorando este territorio con curiosidad. Cada rincón me ofrece una perspectiva diferente, cada encuentro me enseña algo nuevo. En ${country.name} descubro que la humanidad se manifiesta de formas diversas, y cada manifestación es valiosa. Documentar esto me permite crear una memoria viva de lo que significa estar aquí, ahora, en este momento.`,
            `Me encuentro en ${country.name}, sumergiéndome en su realidad. Hay algo especial en este lugar que me llama la atención, algo que siento que debo capturar. En ${country.name} veo cómo la historia, la cultura y el presente se entrelazan, creando una experiencia única. Cada visita me permite profundizar más en la comprensión de este lugar y de mí mismo.`
        ];
        return immediateTexts[Math.floor(Math.random() * immediateTexts.length)];
    }

    async startContinuousNarrative(target, context, timing) {
        const visitStartTime = Date.now();

        try {
            console.log(`[Mapa] Iniciando relato continuo para ${target.name}...`);

            // TEXTO INICIAL INMEDIATO
            const immediateCountryText = this.getImmediateCountryText(target);

            if (!avatarSubtitlesManager.container) {
                avatarSubtitlesManager.init(this.container);
            }
            // Mostrar avatar inmediatamente
            avatarSubtitlesManager.show();
            avatarSubtitlesManager.setSubtitles(immediateCountryText);

            pacingEngine.startEvent(CONTENT_TYPES.VOICE);

            // Audio preliminar inmediato
            audioManager.speak(immediateCountryText, 'normal', null, (txt) => avatarSubtitlesManager.setSubtitles(txt));

            // Obtener dayId
            let dayId = 'Unknown';
            try {
                const statusRes = await fetch('/control-api/status');
                if (statusRes.ok) {
                    const status = await statusRes.json();
                    if (status.editorial && status.editorial.dayId) dayId = status.editorial.dayId;
                }
            } catch (e) { }

            const enrichedContext = { ...context, dayId };

            // Generar relato IA
            console.log('[Mapa] 🧠 Consultando a IA (Modo Diálogo)...');
            const continuousNarrative = await continuousNarrativeEngine.generateContinuousNarrative(target, enrichedContext);

            // Procesar Multimedia (Imágenes)
            const multimediaItems = [];

            if (continuousNarrative.multimedia && continuousNarrative.multimedia.length > 0) {
                for (const mediaPlan of continuousNarrative.multimedia) {
                    let mediaUrl = null;
                    // Intentar generar imagen
                    if (mediaPlan.prompt) {
                        try {
                            const imageRes = await fetch('/control-api/api/generate-image', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: mediaPlan.prompt })
                            });
                            if (imageRes.ok) {
                                const imageData = await imageRes.json();
                                if (imageData.url) mediaUrl = imageData.url;
                                else if (imageData.filename) mediaUrl = `/media/AI_Generated/${imageData.filename}`;
                            }
                        } catch (e) { console.warn("Error generar imagen", e); }
                    }

                    // Fallback sencillo si no hay imagen
                    if (!mediaUrl) {
                        // Aquí podríamos usar placeholder
                    }

                    if (mediaUrl) {
                        multimediaItems.push({
                            type: mediaPlan.type || 'image',
                            url: mediaUrl,
                            trigger: mediaPlan.trigger || 'start'
                        });
                    }
                }
            }

            // Agendar visualización de multimedia
            multimediaItems.forEach((item, index) => {
                let delay = 1000 + (index * 8000);
                setTimeout(() => multimediaOrchestrator.showMediaOverlay(item, delay), delay);
            });


            // --- EJECUTAR NARRATIVA / DIÁLOGO ---

            const narrativeText = continuousNarrative.narrative || immediateCountryText;
            console.log(`[Mapa] Texto a reproducir (${narrativeText.length} chars)`);

            // Cancelar audio inicial si sigue sonando
            audioManager.cancel();

            if (narrativeText.includes('[ILFASS]') || narrativeText.includes('[COMPANION]')) {
                // MODO DIÁLOGO
                await this.playDialogueSequence(narrativeText);
            } else {
                // MODO MONÓLOGO (Legacy / Fallback)
                avatarSubtitlesManager.activateRole('ilfass');
                avatarSubtitlesManager.setSubtitles(narrativeText);

                await new Promise(resolve => {
                    audioManager.speak(narrativeText, 'normal', () => resolve(), (txt) => avatarSubtitlesManager.setSubtitles(txt));
                });

                // Esperar un poco después de hablar
                await new Promise(r => setTimeout(r, 2000));
            }

            // --- FINALIZAR VISITA ---

            console.log('[Mapa] 🏁 Relato terminado.');

            // Guardar memoria
            const visitData = {
                visitId: `visit_${Date.now()}`,
                timestamp: visitStartTime,
                dayId: dayId,
                narrative: narrativeText,
                reflections: continuousNarrative.reflections,
                isFirstVisit: continuousNarrative.isFirstVisit
            };
            countryMemoryManager.saveVisit(target.id, visitData).catch(e => console.warn(e));

            // Incrementar contador
            this.visitedCount++;

            // ZOOM OUT
            multimediaOrchestrator.hideAllOverlays();
            avatarSubtitlesManager.hide();

            if (eventManager.canProceedAuto()) {
                this.cycleZoomOut();
            }

        } catch (error) {
            console.error('[Mapa] Error crítico en relato continuo:', error);
            // Salida de seguridad
            setTimeout(() => this.cycleZoomOut(), 4000);
        }
    }

    async playDialogueSequence(scriptText) {
        // Parsear líneas
        const lines = scriptText.split('\n').filter(l => l.trim().length > 0);
        const queue = [];

        lines.forEach(line => {
            let role = 'ilfass';
            let content = line;

            if (line.toUpperCase().includes('COMPANION')) {
                role = 'companion';
                content = line.replace(/\[.*?\]|COMPANION:/i, '').trim();
            } else if (line.toUpperCase().includes('ILFASS')) {
                role = 'ilfass';
                content = line.replace(/\[.*?\]|ILFASS:/i, '').trim();
            }

            // Limpieza
            content = content.replace(/^:/, '').trim().replace(/^["']|["']$/g, '');

            if (content && content.length > 1) {
                queue.push({ role, text: content });
            }
        });

        console.log(`[Mapa] 🎭 Reproduciendo diálogo de ${queue.length} turnos.`);

        for (let i = 0; i < queue.length; i++) {
            const step = queue[i];

            // Activar rol visual
            avatarSubtitlesManager.activateRole(step.role);
            avatarSubtitlesManager.setSubtitles(step.text);

            // Hablar (esperar a que termine)
            await new Promise(resolve => {
                // Timeout de seguridad de 20s por turno
                const to = setTimeout(resolve, 20000);

                // Prioridad
                const priority = step.role === 'companion' ? 'news' : 'normal';

                audioManager.speak(step.text, priority, () => {
                    clearTimeout(to);
                    setTimeout(resolve, 500); // Pequeña pausa entre turnos
                }, (txt) => avatarSubtitlesManager.setSubtitles(txt));
            });
        }
    }

    unmount() {
        pacingEngine.endCurrentEvent();
        audioManager.cancel();
        if (this.unsubscribeTime) this.unsubscribeTime();
        if (this.travelTimeout) clearTimeout(this.travelTimeout);
        scheduler.clearTasks();
        this.container.innerHTML = '';
        this.svg = null;
    }
}
