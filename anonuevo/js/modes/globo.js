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
        this.worldCities = [];
        this.allLocations = []; // Combinación de países y ciudades
        this.currentLocationIndex = 0;
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
        
        // Cargar países visitados y ciudades del mundo
        await this.loadVisitedCountries();
        this.loadWorldCities();
        this.combineLocations();
        
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

    loadWorldCities() {
        // Lista de ciudades importantes del mundo con coordenadas
        this.worldCities = [
            { name: 'Buenos Aires', country: 'Argentina', coordinates: [-58.3816, -34.6037] },
            { name: 'Río de Janeiro', country: 'Brasil', coordinates: [-43.1729, -22.9068] },
            { name: 'São Paulo', country: 'Brasil', coordinates: [-46.6333, -23.5505] },
            { name: 'Santiago', country: 'Chile', coordinates: [-70.6483, -33.4489] },
            { name: 'Bogotá', country: 'Colombia', coordinates: [-74.0721, 4.7110] },
            { name: 'Ciudad de México', country: 'México', coordinates: [-99.1332, 19.4326] },
            { name: 'Lima', country: 'Perú', coordinates: [-77.0428, -12.0464] },
            { name: 'Nueva York', country: 'Estados Unidos', coordinates: [-74.0060, 40.7128] },
            { name: 'Los Ángeles', country: 'Estados Unidos', coordinates: [-118.2437, 34.0522] },
            { name: 'Chicago', country: 'Estados Unidos', coordinates: [-87.6298, 41.8781] },
            { name: 'Toronto', country: 'Canadá', coordinates: [-79.3832, 43.6532] },
            { name: 'Madrid', country: 'España', coordinates: [-3.7038, 40.4168] },
            { name: 'Barcelona', country: 'España', coordinates: [2.1734, 41.3851] },
            { name: 'París', country: 'Francia', coordinates: [2.3522, 48.8566] },
            { name: 'Roma', country: 'Italia', coordinates: [12.4964, 41.9028] },
            { name: 'Milán', country: 'Italia', coordinates: [9.1859, 45.4642] },
            { name: 'Londres', country: 'Reino Unido', coordinates: [-0.1278, 51.5074] },
            { name: 'Berlín', country: 'Alemania', coordinates: [13.4050, 52.5200] },
            { name: 'Ámsterdam', country: 'Países Bajos', coordinates: [4.9041, 52.3676] },
            { name: 'Varsovia', country: 'Polonia', coordinates: [21.0122, 52.2297] },
            { name: 'Tokio', country: 'Japón', coordinates: [139.6503, 35.6762] },
            { name: 'Seúl', country: 'Corea del Sur', coordinates: [126.9780, 37.5665] },
            { name: 'Pekín', country: 'China', coordinates: [116.4074, 39.9042] },
            { name: 'Shanghái', country: 'China', coordinates: [121.4737, 31.2304] },
            { name: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760] },
            { name: 'Delhi', country: 'India', coordinates: [77.2090, 28.6139] },
            { name: 'El Cairo', country: 'Egipto', coordinates: [31.2357, 30.0444] },
            { name: 'Ciudad del Cabo', country: 'Sudáfrica', coordinates: [18.4241, -33.9249] },
            { name: 'Sídney', country: 'Australia', coordinates: [151.2093, -33.8688] },
            { name: 'Melbourne', country: 'Australia', coordinates: [144.9631, -37.8136] },
            { name: 'Dubái', country: 'Emiratos Árabes', coordinates: [55.2708, 25.2048] },
            { name: 'Singapur', country: 'Singapur', coordinates: [103.8198, 1.3521] },
            { name: 'Bangkok', country: 'Tailandia', coordinates: [100.5018, 13.7563] },
            { name: 'Estambul', country: 'Turquía', coordinates: [28.9784, 41.0082] },
            { name: 'Moscú', country: 'Rusia', coordinates: [37.6173, 55.7558] },
            { name: 'San Petersburgo', country: 'Rusia', coordinates: [30.3159, 59.9343] }
        ];
        
        console.log(`[Globo] Cargadas ${this.worldCities.length} ciudades del mundo`);
    }

    combineLocations() {
        // Combinar países visitados y ciudades del mundo
        this.allLocations = [];
        
        // Agregar países visitados
        this.visitedCountries.forEach(country => {
            this.allLocations.push({
                type: 'country',
                name: country.name,
                coordinates: country.coordinates,
                altitude: 500000 // Altura para países
            });
        });
        
        // Agregar ciudades (mezcladas aleatoriamente)
        const shuffledCities = [...this.worldCities].sort(() => Math.random() - 0.5);
        shuffledCities.forEach(city => {
            this.allLocations.push({
                type: 'city',
                name: city.name,
                country: city.country,
                coordinates: city.coordinates,
                altitude: 5000 // Altura mucho más baja para ciudades (zoom profundo)
            });
        });
        
        // Mezclar todo aleatoriamente
        this.allLocations = this.allLocations.sort(() => Math.random() - 0.5);
        
        console.log(`[Globo] Total de ubicaciones: ${this.allLocations.length} (${this.visitedCountries.length} países + ${this.worldCities.length} ciudades)`);
    }

    addCountryMarkers() {
        if (!this.viewer) return;
        
        // Limpiar marcadores anteriores
        this.viewer.entities.removeAll();
        
        // Agregar marcadores para todas las ubicaciones
        this.allLocations.forEach((location, index) => {
            const [longitude, latitude] = location.coordinates;
            const isCity = location.type === 'city';
            
            // Colores diferentes para países y ciudades
            const pointColor = isCity ? Cesium.Color.YELLOW : Cesium.Color.CYAN;
            const labelText = isCity ? `${location.name}, ${location.country}` : location.name;
            
            // Agregar punto en el globo
            this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
                point: {
                    pixelSize: isCity ? 12 : 15,
                    color: pointColor,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0)
                },
                label: {
                    text: labelText,
                    font: isCity ? '12pt Inter' : '14pt Inter',
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
        const citiesCount = this.worldCities.length;
        const totalLocations = this.allLocations.length;
        const immediateText = `Estoy mostrando un globo 3D de nuestro planeta. Voy a recorrer ${totalLocations} ubicaciones diferentes, incluyendo ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} visitados y ${citiesCount} ciudades importantes de todo el mundo.`;
        
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
            const countriesList = this.visitedCountries.slice(0, 3).map(c => c.name).join(', ');
            const citiesSample = this.worldCities.slice(0, 3).map(c => c.name).join(', ');
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás mostrando un globo 3D interactivo donde recorrerás ${this.allLocations.length} ubicaciones: ${this.visitedCountries.length} países visitados como ${countriesList}, y ${this.worldCities.length} ciudades importantes del mundo como ${citiesSample}. Harás zoom profundo en cada ciudad para explorar los detalles urbanos. Genera una narrativa reflexiva en primera persona sobre este viaje global, la diversidad de culturas urbanas, y la belleza de nuestro planeta visto desde esta perspectiva única. Entre 150 y 220 palabras.`;
            
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
        
        return `Desde esta perspectiva única, voy a recorrer ${this.allLocations.length} ubicaciones alrededor del mundo. No solo países, sino también ciudades vibrantes donde la humanidad se expresa en toda su diversidad. Cada zoom profundo me permite explorar los detalles urbanos, las calles, los edificios, la vida que pulsa en cada rincón del planeta. Este viaje me muestra cómo nuestro mundo está interconectado, cómo cada ciudad tiene su propia identidad pero todas forman parte de la misma historia humana.`;
    }

    startAutoTravel() {
        if (this.allLocations.length === 0) {
            console.log('[Globo] No hay ubicaciones para recorrer');
            return;
        }
        
        if (!this.viewer || !this.viewer.camera) {
            console.warn('[Globo] Viewer no inicializado, no se puede iniciar recorrido automático');
            return;
        }
        
        this.currentLocationIndex = 0;
        
        // Función para viajar a la siguiente ubicación
        const travelToNextLocation = () => {
            if (!this.viewer || !this.viewer.camera) {
                console.warn('[Globo] Viewer no disponible para viajar');
                return;
            }
            
            if (this.currentLocationIndex >= this.allLocations.length) {
                this.currentLocationIndex = 0; // Reiniciar
            }
            
            const location = this.allLocations[this.currentLocationIndex];
            if (!location || !location.coordinates) {
                this.currentLocationIndex++;
                return;
            }
            
            const [longitude, latitude] = location.coordinates;
            const isCity = location.type === 'city';
            const altitude = location.altitude || (isCity ? 5000 : 500000);
            
            // Ángulo de cámara diferente para ciudades (más vertical) y países (más inclinado)
            const pitch = isCity ? Cesium.Math.toRadians(-75) : Cesium.Math.toRadians(-45);
            
            // Animar cámara hacia la ubicación con zoom profundo
            this.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: pitch,
                    roll: 0.0
                },
                duration: isCity ? 4.0 : 3.0, // Más tiempo para ciudades (zoom más profundo)
                complete: () => {
                    // Mostrar información de la ubicación
                    const locationName = isCity ? `${location.name}, ${location.country}` : location.name;
                    console.log(`[Globo] Visitando: ${locationName} (${isCity ? 'Ciudad' : 'País'})`);
                }
            });
            
            this.currentLocationIndex++;
        };
        
        // Viajar a la primera ubicación después de 2 segundos
        setTimeout(() => {
            travelToNextLocation();
            
            // Continuar viajando cada 6 segundos (más rápido para más ubicaciones)
            this.travelInterval = setInterval(() => {
                travelToNextLocation();
            }, 6000);
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
