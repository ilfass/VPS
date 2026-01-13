import { audioManager } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { COUNTRY_INFO } from '../data/country-info.js';

// Configurar el token de acceso de Cesium (necesario para tiles)
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMDBlYWE0MC04MjgwLTQ4ZjMtYjgyZi1iODg4MmJhNjYxODYiLCJpZCI6Mzc3ODk0LCJpYXQiOjE3NjgyNzg5NTZ9.cUUAuf8216MEHnjz2CTXhkWSRT0XCrq3lvC1n4o0eF8';

export default class GloboMode {
    constructor(container) {
        this.container = container;
        this.viewer = null;
        this.isNarrating = false;
        this.visitedCountries = [];
        this.currentCountryIndex = 0;
        this.travelInterval = null;
    }

    async mount() {
        console.log('[Globo] Montando globo 3D...');
        
        // Inicializar eventManager si no está inicializado
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        // Limpiar contenedor
        this.container.innerHTML = '';
        
        // Crear contenedor para Cesium
        const cesiumContainer = document.createElement('div');
        cesiumContainer.id = 'cesiumContainer';
        cesiumContainer.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0;';
        this.container.appendChild(cesiumContainer);
        
        // Inicializar avatar
        avatarSubtitlesManager.init(this.container);
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        // Inicializar audio
        if (!audioManager.musicLayer) {
            await audioManager.init();
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
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Registrar handler para comandos de música
        let lastMusicCommand = null;
        let lastMusicCommandTime = 0;
        
        eventManager.on('music_command', (musicState) => {
            const now = Date.now();
            if (lastMusicCommand === musicState.command && (now - lastMusicCommandTime) < 1000) {
                return;
            }
            lastMusicCommand = musicState.command;
            lastMusicCommandTime = now;
            
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
            }
        });
        
        // Inicializar Cesium
        await this.initCesium();
        
        // Cargar países visitados
        await this.loadVisitedCountries();
        
        // Iniciar narración y recorrido
        await this.startNarration();
        this.startAutoTravel();
    }

    async initCesium() {
        try {
            // Crear viewer sin terrain provider primero (se agregará después si está disponible)
            this.viewer = new Cesium.Viewer('cesiumContainer', {
                baseLayerPicker: false,
                vrButton: false,
                geocoder: false,
                homeButton: false,
                infoBox: false,
                sceneModePicker: false,
                selectionIndicator: false,
                timeline: false,
                navigationHelpButton: false,
                animation: false,
                fullscreenButton: false,
                shouldAnimate: true
            });
            
            // Intentar agregar terrain provider si está disponible
            try {
                if (Cesium.createWorldTerrain) {
                    this.viewer.terrainProvider = Cesium.createWorldTerrain();
                } else if (Cesium.createWorldTerrainAsync) {
                    this.viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
                } else {
                    // Usar terrain provider básico
                    this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
                }
            } catch (terrainError) {
                console.warn('[Globo] No se pudo cargar terrain provider, usando básico:', terrainError);
                this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            }
            
            // Configurar escena
            this.viewer.scene.globe.enableLighting = true;
            this.viewer.scene.globe.dynamicAtmosphereLighting = true;
            this.viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
            this.viewer.scene.skyAtmosphere.show = true;
            this.viewer.scene.globe.showWaterEffect = true;
            this.viewer.scene.globe.showGroundAtmosphere = true;
            
            // Configurar cámara inicial
            this.viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(0, 0, 15000000),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0.0
                }
            });
            
            console.log('[Globo] ✅ Cesium inicializado');
        } catch (e) {
            console.error('[Globo] Error inicializando Cesium:', e);
            // Fallback: mostrar mensaje de error
            this.container.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Inter', sans-serif; background: #0a0a0f;">
                    <div style="text-align: center; padding: 2rem;">
                        <h1 style="color: #4a9eff; margin-bottom: 1rem;">Error cargando globo 3D</h1>
                        <p style="color: #a0a0b0;">${e.message}</p>
                        <p style="color: #a0a0b0; margin-top: 1rem; font-size: 0.9rem;">Verifica que Cesium.js esté cargado correctamente.</p>
                    </div>
                </div>
            `;
            this.viewer = null;
        }
    }

    async loadVisitedCountries() {
        try {
            const res = await fetch('/control-api/api/country-memory');
            if (res.ok) {
                const data = await res.json();
                const memories = data.memories || [];
                
                this.visitedCountries = memories
                    .filter(m => m.countryId && COUNTRY_INFO[m.countryId])
                    .map(m => {
                        const countryInfo = COUNTRY_INFO[m.countryId];
                        return {
                            id: m.countryId,
                            name: countryInfo.name,
                            coordinates: this.getCountryCoordinates(m.countryId),
                            visits: m.totalVisits || 0,
                            lastVisit: m.lastVisit
                        };
                    })
                    .filter(c => c.coordinates) // Solo países con coordenadas válidas
                    .sort((a, b) => {
                        // Ordenar por última visita (más recientes primero)
                        if (a.lastVisit && b.lastVisit) {
                            return new Date(b.lastVisit) - new Date(a.lastVisit);
                        }
                        return b.visits - a.visits;
                    });
                
                console.log(`[Globo] Cargados ${this.visitedCountries.length} países visitados`);
                
                // Agregar marcadores en el globo
                this.addCountryMarkers();
            }
        } catch (e) {
            console.error('[Globo] Error cargando países:', e);
            this.visitedCountries = [];
        }
    }

    getCountryCoordinates(countryId) {
        // Coordenadas aproximadas de los países más comunes
        const coordinates = {
            '032': [-64.0, -34.0], // Argentina
            '076': [-47.0, -15.0], // Brasil
            '152': [-70.0, -35.0], // Chile
            '170': [-74.0, 4.0],   // Colombia
            '218': [-78.0, -2.0],  // Ecuador
            '484': [-102.0, 23.0], // México
            '604': [-75.0, -10.0], // Perú
            '840': [-95.0, 38.0],  // Estados Unidos
            '858': [-56.0, -33.0], // Uruguay
            '124': [-106.0, 56.0], // Canadá
            '724': [-3.0, 40.0],   // España
            '250': [2.0, 46.0],    // Francia
            '380': [12.0, 42.0],   // Italia
            '826': [-1.0, 52.0],   // Reino Unido
            '276': [10.0, 51.0],   // Alemania
            '528': [5.0, 52.0],    // Países Bajos
            '616': [19.0, 52.0]    // Polonia
        };
        
        return coordinates[countryId] || null;
    }

    addCountryMarkers() {
        if (!this.viewer) return;
        
        // Limpiar marcadores anteriores
        this.viewer.entities.removeAll();
        
        this.visitedCountries.forEach((country, index) => {
            const [longitude, latitude] = country.coordinates;
            
            // Agregar punto en el globo
            this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
                point: {
                    pixelSize: 15,
                    color: Cesium.Color.CYAN,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0)
                },
                label: {
                    text: country.name,
                    font: '14pt Inter',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -40),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0)
                }
            });
        });
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        const countriesCount = this.visitedCountries.length;
        const immediateText = `Estoy mostrando un globo 3D de nuestro planeta. Hemos visitado ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} diferentes en este viaje.`;
        
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
                console.warn('[Globo] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    this.scheduleNextPage();
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                this.scheduleNextPage();
            }
        }, updateSubtitles);
    }

    async generateFullNarrative() {
        try {
            const countriesList = this.visitedCountries.slice(0, 5).map(c => c.name).join(', ');
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás mostrando un globo 3D interactivo donde se visualizan los ${this.visitedCountries.length} países que has visitado: ${countriesList}${this.visitedCountries.length > 5 ? ' y otros' : ''}. Genera una narrativa reflexiva en primera persona sobre el viaje, la conexión entre los lugares visitados, y la belleza de nuestro planeta visto desde esta perspectiva. Entre 150 y 220 palabras.`;
            
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
            console.warn('[Globo] Error generando narrativa:', e);
        }
        
        return `Desde esta perspectiva única, puedo ver cómo nuestro planeta se conecta. Los ${this.visitedCountries.length} países que he visitado forman una red de experiencias y descubrimientos. Cada punto en este globo representa un momento de documentación, una historia humana preservada. La Tierra, vista así, es un recordatorio de la inmensidad de nuestro viaje y la interconexión de todas las culturas.`;
    }

    startAutoTravel() {
        if (this.visitedCountries.length === 0) {
            console.log('[Globo] No hay países visitados para recorrer');
            return;
        }
        
        if (!this.viewer || !this.viewer.camera) {
            console.warn('[Globo] Viewer no inicializado, no se puede iniciar recorrido automático');
            return;
        }
        
        this.currentCountryIndex = 0;
        
        // Función para viajar al siguiente país
        const travelToNextCountry = () => {
            if (!this.viewer || !this.viewer.camera) {
                console.warn('[Globo] Viewer no disponible para viajar');
                return;
            }
            
            if (this.currentCountryIndex >= this.visitedCountries.length) {
                this.currentCountryIndex = 0; // Reiniciar
            }
            
            const country = this.visitedCountries[this.currentCountryIndex];
            if (!country || !country.coordinates) {
                this.currentCountryIndex++;
                return;
            }
            
            const [longitude, latitude] = country.coordinates;
            
            // Animar cámara hacia el país
            this.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500000),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-45),
                    roll: 0.0
                },
                duration: 3.0,
                complete: () => {
                    // Mostrar información del país brevemente
                    console.log(`[Globo] Visitando: ${country.name}`);
                }
            });
            
            this.currentCountryIndex++;
        };
        
        // Viajar al primer país después de 2 segundos
        setTimeout(() => {
            travelToNextCountry();
            
            // Continuar viajando cada 8 segundos
            this.travelInterval = setInterval(() => {
                travelToNextCountry();
            }, 8000);
        }, 2000);
    }

    scheduleNextPage() {
        if (eventManager.canProceedAuto()) {
            console.log('[Globo] Dream Mode ON: Programando cambio de página...');
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'continente', 'ruta', 'estadisticas', 'galeria'];
                    const currentPage = 'globo';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Globo] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 2000 + Math.random() * 1000);
        }
    }

    unmount() {
        if (this.travelInterval) {
            clearInterval(this.travelInterval);
        }
        if (this.viewer) {
            this.viewer.destroy();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
