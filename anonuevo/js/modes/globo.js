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
        this.currentTheme = null;
        this.themeLocations = [];
        this.isNarrationComplete = false;
        this.cityInfoInterval = null;
        this.currentCity = null;
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
        
        // Iniciar con un tema histórico/cultural
        await this.startWithTheme();
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
        // Lista de ciudades importantes del mundo con coordenadas, timezones y lugares característicos
        this.worldCities = [
            { 
                name: 'Buenos Aires', 
                country: 'Argentina', 
                coordinates: [-58.3816, -34.6037],
                timezone: 'America/Argentina/Buenos_Aires',
                landmarks: [
                    { name: 'Obelisco', coordinates: [-58.3816, -34.6037] },
                    { name: 'Casa Rosada', coordinates: [-58.3890, -34.6083] },
                    { name: 'Teatro Colón', coordinates: [-58.3836, -34.6011] }
                ]
            },
            { 
                name: 'Río de Janeiro', 
                country: 'Brasil', 
                coordinates: [-43.1729, -22.9068],
                timezone: 'America/Sao_Paulo',
                landmarks: [
                    { name: 'Cristo Redentor', coordinates: [-43.2105, -22.9519] },
                    { name: 'Pan de Azúcar', coordinates: [-43.1547, -22.9484] },
                    { name: 'Copacabana', coordinates: [-43.1856, -22.9711] }
                ]
            },
            { 
                name: 'São Paulo', 
                country: 'Brasil', 
                coordinates: [-46.6333, -23.5505],
                timezone: 'America/Sao_Paulo',
                landmarks: [
                    { name: 'Avenida Paulista', coordinates: [-46.6566, -23.5614] },
                    { name: 'Catedral da Sé', coordinates: [-46.6339, -23.5505] }
                ]
            },
            { 
                name: 'Santiago', 
                country: 'Chile', 
                coordinates: [-70.6483, -33.4489],
                timezone: 'America/Santiago',
                landmarks: [
                    { name: 'Cerro San Cristóbal', coordinates: [-70.6389, -33.4247] },
                    { name: 'Palacio de La Moneda', coordinates: [-70.6506, -33.4432] }
                ]
            },
            { 
                name: 'Bogotá', 
                country: 'Colombia', 
                coordinates: [-74.0721, 4.7110],
                timezone: 'America/Bogota',
                landmarks: [
                    { name: 'Monserrate', coordinates: [-74.0556, 4.6056] },
                    { name: 'Plaza de Bolívar', coordinates: [-74.0758, 4.5981] }
                ]
            },
            { 
                name: 'Ciudad de México', 
                country: 'México', 
                coordinates: [-99.1332, 19.4326],
                timezone: 'America/Mexico_City',
                landmarks: [
                    { name: 'Zócalo', coordinates: [-99.1332, 19.4326] },
                    { name: 'Ángel de la Independencia', coordinates: [-99.1676, 19.4270] },
                    { name: 'Palacio de Bellas Artes', coordinates: [-99.1433, 19.4350] }
                ]
            },
            { 
                name: 'Lima', 
                country: 'Perú', 
                coordinates: [-77.0428, -12.0464],
                timezone: 'America/Lima',
                landmarks: [
                    { name: 'Plaza Mayor', coordinates: [-77.0319, -12.0464] },
                    { name: 'Miraflores', coordinates: [-77.0333, -12.1222] }
                ]
            },
            { 
                name: 'Nueva York', 
                country: 'Estados Unidos', 
                coordinates: [-74.0060, 40.7128],
                timezone: 'America/New_York',
                landmarks: [
                    { name: 'Estatua de la Libertad', coordinates: [-74.0445, 40.6892] },
                    { name: 'Empire State Building', coordinates: [-73.9857, 40.7484] },
                    { name: 'Times Square', coordinates: [-73.9851, 40.7580] },
                    { name: 'Central Park', coordinates: [-73.9654, 40.7829] }
                ]
            },
            { 
                name: 'Los Ángeles', 
                country: 'Estados Unidos', 
                coordinates: [-118.2437, 34.0522],
                timezone: 'America/Los_Angeles',
                landmarks: [
                    { name: 'Hollywood Sign', coordinates: [-118.2437, 34.1341] },
                    { name: 'Santa Monica Pier', coordinates: [-118.4962, 34.0089] }
                ]
            },
            { 
                name: 'Chicago', 
                country: 'Estados Unidos', 
                coordinates: [-87.6298, 41.8781],
                timezone: 'America/Chicago',
                landmarks: [
                    { name: 'Willis Tower', coordinates: [-87.6359, 41.8789] },
                    { name: 'Millennium Park', coordinates: [-87.6244, 41.8825] }
                ]
            },
            { 
                name: 'Toronto', 
                country: 'Canadá', 
                coordinates: [-79.3832, 43.6532],
                timezone: 'America/Toronto',
                landmarks: [
                    { name: 'CN Tower', coordinates: [-79.3871, 43.6426] },
                    { name: 'Casa Loma', coordinates: [-79.4094, 43.6781] }
                ]
            },
            { 
                name: 'Madrid', 
                country: 'España', 
                coordinates: [-3.7038, 40.4168],
                timezone: 'Europe/Madrid',
                landmarks: [
                    { name: 'Palacio Real', coordinates: [-3.7144, 40.4180] },
                    { name: 'Puerta del Sol', coordinates: [-3.7038, 40.4168] },
                    { name: 'Museo del Prado', coordinates: [-3.6944, 40.4142] }
                ]
            },
            { 
                name: 'Barcelona', 
                country: 'España', 
                coordinates: [2.1734, 41.3851],
                timezone: 'Europe/Madrid',
                landmarks: [
                    { name: 'Sagrada Familia', coordinates: [2.1744, 41.4036] },
                    { name: 'Park Güell', coordinates: [2.1527, 41.4145] },
                    { name: 'La Rambla', coordinates: [2.1700, 41.3809] }
                ]
            },
            { 
                name: 'París', 
                country: 'Francia', 
                coordinates: [2.3522, 48.8566],
                timezone: 'Europe/Paris',
                landmarks: [
                    { name: 'Torre Eiffel', coordinates: [2.2945, 48.8584] },
                    { name: 'Louvre', coordinates: [2.3376, 48.8606] },
                    { name: 'Arco del Triunfo', coordinates: [2.2950, 48.8738] },
                    { name: 'Notre-Dame', coordinates: [2.3499, 48.8530] }
                ]
            },
            { 
                name: 'Roma', 
                country: 'Italia', 
                coordinates: [12.4964, 41.9028],
                timezone: 'Europe/Rome',
                landmarks: [
                    { name: 'Coliseo', coordinates: [12.4922, 41.8902] },
                    { name: 'Fontana di Trevi', coordinates: [12.4833, 41.9009] },
                    { name: 'Vaticano', coordinates: [12.4534, 41.9029] }
                ]
            },
            { 
                name: 'Milán', 
                country: 'Italia', 
                coordinates: [9.1859, 45.4642],
                timezone: 'Europe/Rome',
                landmarks: [
                    { name: 'Duomo di Milano', coordinates: [9.1914, 45.4642] },
                    { name: 'Teatro alla Scala', coordinates: [9.1896, 45.4674] }
                ]
            },
            { 
                name: 'Londres', 
                country: 'Reino Unido', 
                coordinates: [-0.1278, 51.5074],
                timezone: 'Europe/London',
                landmarks: [
                    { name: 'Big Ben', coordinates: [-0.1246, 51.4994] },
                    { name: 'Tower Bridge', coordinates: [-0.0754, 51.5055] },
                    { name: 'London Eye', coordinates: [-0.1195, 51.5033] }
                ]
            },
            { 
                name: 'Berlín', 
                country: 'Alemania', 
                coordinates: [13.4050, 52.5200],
                timezone: 'Europe/Berlin',
                landmarks: [
                    { name: 'Puerta de Brandeburgo', coordinates: [13.3777, 52.5163] },
                    { name: 'Reichstag', coordinates: [13.3753, 52.5186] }
                ]
            },
            { 
                name: 'Ámsterdam', 
                country: 'Países Bajos', 
                coordinates: [4.9041, 52.3676],
                timezone: 'Europe/Amsterdam',
                landmarks: [
                    { name: 'Rijksmuseum', coordinates: [4.8852, 52.3600] },
                    { name: 'Casa de Ana Frank', coordinates: [4.8841, 52.3752] }
                ]
            },
            { 
                name: 'Varsovia', 
                country: 'Polonia', 
                coordinates: [21.0122, 52.2297],
                timezone: 'Europe/Warsaw',
                landmarks: [
                    { name: 'Palacio de la Cultura', coordinates: [21.0061, 52.2319] },
                    { name: 'Ciudad Vieja', coordinates: [21.0128, 52.2297] }
                ]
            },
            { 
                name: 'Tokio', 
                country: 'Japón', 
                coordinates: [139.6503, 35.6762],
                timezone: 'Asia/Tokyo',
                landmarks: [
                    { name: 'Torre de Tokio', coordinates: [139.7454, 35.6586] },
                    { name: 'Senso-ji', coordinates: [139.7947, 35.7148] },
                    { name: 'Shibuya', coordinates: [139.7003, 35.6598] }
                ]
            },
            { 
                name: 'Seúl', 
                country: 'Corea del Sur', 
                coordinates: [126.9780, 37.5665],
                timezone: 'Asia/Seoul',
                landmarks: [
                    { name: 'Gyeongbokgung', coordinates: [126.9770, 37.5796] },
                    { name: 'N Seoul Tower', coordinates: [126.9882, 37.5512] }
                ]
            },
            { 
                name: 'Pekín', 
                country: 'China', 
                coordinates: [116.4074, 39.9042],
                timezone: 'Asia/Shanghai',
                landmarks: [
                    { name: 'Ciudad Prohibida', coordinates: [116.3972, 39.9163] },
                    { name: 'Templo del Cielo', coordinates: [116.4074, 39.8823] }
                ]
            },
            { 
                name: 'Shanghái', 
                country: 'China', 
                coordinates: [121.4737, 31.2304],
                timezone: 'Asia/Shanghai',
                landmarks: [
                    { name: 'The Bund', coordinates: [121.4900, 31.2397] },
                    { name: 'Torre de la Perla', coordinates: [121.4996, 31.2397] }
                ]
            },
            { 
                name: 'Mumbai', 
                country: 'India', 
                coordinates: [72.8777, 19.0760],
                timezone: 'Asia/Kolkata',
                landmarks: [
                    { name: 'Gateway of India', coordinates: [72.8347, 18.9220] },
                    { name: 'Marine Drive', coordinates: [72.8267, 18.9444] }
                ]
            },
            { 
                name: 'Delhi', 
                country: 'India', 
                coordinates: [77.2090, 28.6139],
                timezone: 'Asia/Kolkata',
                landmarks: [
                    { name: 'Fuerte Rojo', coordinates: [77.2410, 28.6562] },
                    { name: 'Templo del Loto', coordinates: [77.2588, 28.5535] }
                ]
            },
            { 
                name: 'El Cairo', 
                country: 'Egipto', 
                coordinates: [31.2357, 30.0444],
                timezone: 'Africa/Cairo',
                landmarks: [
                    { name: 'Pirámides de Giza', coordinates: [31.1325, 29.9792] },
                    { name: 'Museo Egipcio', coordinates: [31.2336, 30.0478] }
                ]
            },
            { 
                name: 'Ciudad del Cabo', 
                country: 'Sudáfrica', 
                coordinates: [18.4241, -33.9249],
                timezone: 'Africa/Johannesburg',
                landmarks: [
                    { name: 'Table Mountain', coordinates: [18.4106, -33.9625] },
                    { name: 'Robben Island', coordinates: [18.3700, -33.8064] }
                ]
            },
            { 
                name: 'Sídney', 
                country: 'Australia', 
                coordinates: [151.2093, -33.8688],
                timezone: 'Australia/Sydney',
                landmarks: [
                    { name: 'Ópera de Sídney', coordinates: [151.2153, -33.8568] },
                    { name: 'Harbour Bridge', coordinates: [151.2108, -33.8523] }
                ]
            },
            { 
                name: 'Melbourne', 
                country: 'Australia', 
                coordinates: [144.9631, -37.8136],
                timezone: 'Australia/Melbourne',
                landmarks: [
                    { name: 'Federation Square', coordinates: [144.9631, -37.8183] },
                    { name: 'Royal Botanic Gardens', coordinates: [144.9800, -37.8300] }
                ]
            },
            { 
                name: 'Dubái', 
                country: 'Emiratos Árabes', 
                coordinates: [55.2708, 25.2048],
                timezone: 'Asia/Dubai',
                landmarks: [
                    { name: 'Burj Khalifa', coordinates: [55.2744, 25.1972] },
                    { name: 'Palm Jumeirah', coordinates: [55.1381, 25.1128] }
                ]
            },
            { 
                name: 'Singapur', 
                country: 'Singapur', 
                coordinates: [103.8198, 1.3521],
                timezone: 'Asia/Singapore',
                landmarks: [
                    { name: 'Marina Bay Sands', coordinates: [103.8588, 1.2833] },
                    { name: 'Gardens by the Bay', coordinates: [103.8650, 1.2816] }
                ]
            },
            { 
                name: 'Bangkok', 
                country: 'Tailandia', 
                coordinates: [100.5018, 13.7563],
                timezone: 'Asia/Bangkok',
                landmarks: [
                    { name: 'Gran Palacio', coordinates: [100.4926, 13.7500] },
                    { name: 'Wat Pho', coordinates: [100.4944, 13.7464] }
                ]
            },
            { 
                name: 'Estambul', 
                country: 'Turquía', 
                coordinates: [28.9784, 41.0082],
                timezone: 'Europe/Istanbul',
                landmarks: [
                    { name: 'Santa Sofía', coordinates: [28.9784, 41.0086] },
                    { name: 'Mezquita Azul', coordinates: [28.9769, 41.0054] }
                ]
            },
            { 
                name: 'Moscú', 
                country: 'Rusia', 
                coordinates: [37.6173, 55.7558],
                timezone: 'Europe/Moscow',
                landmarks: [
                    { name: 'Kremlin', coordinates: [37.6156, 55.7520] },
                    { name: 'Catedral de San Basilio', coordinates: [37.6231, 55.7525] }
                ]
            },
            { 
                name: 'San Petersburgo', 
                country: 'Rusia', 
                coordinates: [30.3159, 59.9343],
                timezone: 'Europe/Moscow',
                landmarks: [
                    { name: 'Hermitage', coordinates: [30.3144, 59.9396] },
                    { name: 'Catedral de San Isaac', coordinates: [30.3064, 59.9342] }
                ]
            }
        ];
        
        console.log(`[Globo] Cargadas ${this.worldCities.length} ciudades del mundo con lugares característicos`);
    }

    // Sistema de temas históricos/culturales
    getHistoricalThemes() {
        return [
            {
                id: 'imperio_romano',
                title: 'El Imperio Romano',
                description: 'El Imperio Romano y su influencia en Europa, África y Asia',
                narrative: 'El Imperio Romano fue una de las civilizaciones más influyentes de la historia. Se extendió desde las Islas Británicas hasta el norte de África, desde la Península Ibérica hasta Mesopotamia. Vamos a visitar los países y ciudades que fueron parte de este vasto imperio.',
                locations: [
                    { type: 'city', name: 'Roma', country: 'Italia' },
                    { type: 'city', name: 'Madrid', country: 'España' },
                    { type: 'city', name: 'París', country: 'Francia' },
                    { type: 'city', name: 'Londres', country: 'Reino Unido' },
                    { type: 'city', name: 'Estambul', country: 'Turquía' },
                    { type: 'city', name: 'El Cairo', country: 'Egipto' }
                ]
            },
            {
                id: 'pueblos_originarios_sudamerica',
                title: 'Pueblos Originarios de Sudamérica',
                description: 'Las culturas precolombinas y sus territorios',
                narrative: 'Antes de la llegada de los europeos, Sudamérica estaba habitada por diversas civilizaciones avanzadas. Los incas, los mayas, los aztecas y muchos otros pueblos desarrollaron sociedades complejas. Vamos a explorar los países donde estas culturas florecieron.',
                locations: [
                    { type: 'city', name: 'Lima', country: 'Perú' },
                    { type: 'city', name: 'Ciudad de México', country: 'México' },
                    { type: 'city', name: 'Bogotá', country: 'Colombia' },
                    { type: 'city', name: 'Santiago', country: 'Chile' },
                    { type: 'city', name: 'Buenos Aires', country: 'Argentina' }
                ]
            },
            {
                id: 'primera_guerra_mundial',
                title: 'Primera Guerra Mundial',
                description: 'Los países involucrados en el conflicto de 1914-1918',
                narrative: 'La Primera Guerra Mundial cambió el mundo para siempre. Involucró a más de 30 países y resultó en millones de muertes. Vamos a visitar las naciones que fueron protagonistas de este conflicto histórico.',
                locations: [
                    { type: 'city', name: 'Berlín', country: 'Alemania' },
                    { type: 'city', name: 'París', country: 'Francia' },
                    { type: 'city', name: 'Londres', country: 'Reino Unido' },
                    { type: 'city', name: 'Varsovia', country: 'Polonia' },
                    { type: 'city', name: 'Moscú', country: 'Rusia' },
                    { type: 'city', name: 'Estambul', country: 'Turquía' }
                ]
            },
            {
                id: 'mundiales_futbol',
                title: 'Historia de los Mundiales de Fútbol',
                description: 'Países que han sido sedes de la Copa del Mundo',
                narrative: 'La Copa del Mundo de Fútbol ha unido a naciones de todos los continentes. Desde Uruguay 1930 hasta las ediciones más recientes, cada mundial ha dejado su huella. Vamos a visitar los países que han sido anfitriones de este evento global.',
                locations: [
                    { type: 'city', name: 'Río de Janeiro', country: 'Brasil' },
                    { type: 'city', name: 'Moscú', country: 'Rusia' },
                    { type: 'city', name: 'Sídney', country: 'Australia' },
                    { type: 'city', name: 'Tokio', country: 'Japón' },
                    { type: 'city', name: 'Berlín', country: 'Alemania' },
                    { type: 'city', name: 'París', country: 'Francia' }
                ]
            },
            {
                id: 'rio_amazonas',
                title: 'El Río Amazonas',
                description: 'El río más largo del mundo y los países que atraviesa',
                narrative: 'El Amazonas es el río más caudaloso y uno de los más largos del mundo. Atraviesa varios países sudamericanos, siendo el corazón de la selva tropical más grande del planeta. Vamos a explorar las ciudades y países que este majestuoso río conecta.',
                locations: [
                    { type: 'city', name: 'Lima', country: 'Perú' },
                    { type: 'city', name: 'Bogotá', country: 'Colombia' },
                    { type: 'city', name: 'São Paulo', country: 'Brasil' },
                    { type: 'city', name: 'Río de Janeiro', country: 'Brasil' }
                ]
            }
        ];
    }

    async startWithTheme() {
        const themes = this.getHistoricalThemes();
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        this.currentTheme = randomTheme;
        
        console.log(`[Globo] Iniciando con tema: ${randomTheme.title}`);
        
        // Preparar ubicaciones del tema
        this.themeLocations = [];
        randomTheme.locations.forEach(loc => {
            if (loc.type === 'city') {
                const city = this.worldCities.find(c => 
                    c.name === loc.name && c.country === loc.country
                );
                if (city) {
                    this.themeLocations.push({
                        type: 'city',
                        name: city.name,
                        country: city.country,
                        coordinates: city.coordinates,
                        timezone: city.timezone,
                        landmarks: city.landmarks,
                        altitude: 500 // Zoom muy profundo para ver calles
                    });
                }
            }
        });
        
        // Agregar marcadores
        this.addThemeMarkers();
        
        // Narrar el tema antes de visitar las ubicaciones
        await this.narrateTheme(randomTheme);
        
        // Iniciar recorrido después de la narración
        this.startThemeTravel();
    }

    async narrateTheme(theme) {
        this.isNarrating = true;
        this.isNarrationComplete = false;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        avatarSubtitlesManager.setSubtitles(theme.narrative);
        
        audioManager.speak(theme.narrative, 'normal', () => {
            this.isNarrating = false;
            this.isNarrationComplete = true;
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
        });
    }

    addThemeMarkers() {
        if (!this.viewer) return;
        
        this.viewer.entities.removeAll();
        
        this.themeLocations.forEach(location => {
            const [longitude, latitude] = location.coordinates;
            
            // Marcador principal de la ciudad
            this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
                point: {
                    pixelSize: 15,
                    color: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                    text: `${location.name}, ${location.country}`,
                    font: '14pt Inter',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE
                }
            });
            
            // Marcadores de lugares característicos
            if (location.landmarks && location.landmarks.length > 0) {
                location.landmarks.forEach(landmark => {
                    this.viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(landmark.coordinates[0], landmark.coordinates[1]),
                        point: {
                            pixelSize: 10,
                            color: Cesium.Color.CYAN,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 1,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                        },
                        label: {
                            text: landmark.name,
                            font: '10pt Inter',
                            fillColor: Cesium.Color.CYAN,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 1,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE
                        }
                    });
                });
            }
        });
    }

    startThemeTravel() {
        if (this.themeLocations.length === 0) {
            console.log('[Globo] No hay ubicaciones del tema para recorrer');
            return;
        }
        
        if (!this.viewer || !this.viewer.camera) {
            console.warn('[Globo] Viewer no inicializado');
            return;
        }
        
        this.currentLocationIndex = 0;
        this.isExploringCity = false;
        
        // Esperar a que termine la narración del tema antes de empezar
        const checkNarration = setInterval(() => {
            if (this.isNarrationComplete) {
                clearInterval(checkNarration);
                setTimeout(() => {
                    this.travelToNextThemeLocation();
                }, 2000);
            }
        }, 500);
    }

    travelToNextThemeLocation() {
        if (!this.viewer || !this.viewer.camera) {
            return;
        }
        
        if (this.currentLocationIndex >= this.themeLocations.length) {
            // Reiniciar o cambiar de tema
            this.currentLocationIndex = 0;
            this.startWithTheme();
            return;
        }
        
        const location = this.themeLocations[this.currentLocationIndex];
        if (!location || !location.coordinates) {
            this.currentLocationIndex++;
            setTimeout(() => this.travelToNextThemeLocation(), 1000);
            return;
        }
        
        const [longitude, latitude] = location.coordinates;
        
        // Mostrar overlay de información
        this.showCityInfo(location);
        
        // Zoom muy profundo (500m para ver calles y casas)
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-80), // Muy vertical
                roll: 0.0
            },
            duration: 5.0,
            complete: () => {
                console.log(`[Globo] Visitando: ${location.name}, ${location.country}`);
                this.exploreCityDeep(location, () => {
                    this.currentLocationIndex++;
                    // Esperar a que termine la narración antes de avanzar
                    const checkComplete = setInterval(() => {
                        if (this.isNarrationComplete) {
                            clearInterval(checkComplete);
                            setTimeout(() => {
                                this.travelToNextThemeLocation();
                            }, 2000);
                        }
                    }, 500);
                });
            }
        });
    }

    showCityInfo(city) {
        const overlay = document.getElementById('cityInfoOverlay');
        if (!overlay) return;
        
        const cityNameEl = document.getElementById('cityName');
        const countryNameEl = document.getElementById('countryName');
        const localTimeEl = document.getElementById('localTime');
        
        if (cityNameEl) cityNameEl.textContent = city.name.toUpperCase();
        if (countryNameEl) countryNameEl.textContent = city.country;
        
        // Actualizar hora local
        if (city.timezone && localTimeEl) {
            this.updateLocalTime(city.timezone, localTimeEl);
            // Actualizar cada segundo
            if (this.cityInfoInterval) {
                clearInterval(this.cityInfoInterval);
            }
            this.cityInfoInterval = setInterval(() => {
                this.updateLocalTime(city.timezone, localTimeEl);
            }, 1000);
        }
        
        overlay.classList.add('visible');
        this.currentCity = city;
    }

    updateLocalTime(timezone, element) {
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('es-ES', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            element.textContent = formatter.format(now);
        } catch (e) {
            console.warn('[Globo] Error obteniendo hora local:', e);
        }
    }

    hideCityInfo() {
        const overlay = document.getElementById('cityInfoOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
        if (this.cityInfoInterval) {
            clearInterval(this.cityInfoInterval);
            this.cityInfoInterval = null;
        }
        this.currentCity = null;
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
        this.isExploringCity = false;
        
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
                    
                    // Si es una ciudad, explorarla en detalle
                    if (isCity) {
                        this.exploreCity(location, () => {
                            // Cuando termine la exploración, avanzar al siguiente
                            this.currentLocationIndex++;
                            // Esperar un poco antes de ir a la siguiente ubicación
                            setTimeout(() => {
                                travelToNextLocation();
                            }, 2000);
                        });
                    } else {
                        // Para países, solo esperar un poco y continuar
                        this.currentLocationIndex++;
                        setTimeout(() => {
                            travelToNextLocation();
                        }, 4000);
                    }
                }
            });
        };
        
        // Viajar a la primera ubicación después de 2 segundos
        setTimeout(() => {
            travelToNextLocation();
        }, 2000);
    }

    async exploreCityDeep(city, onComplete) {
        if (!this.viewer || !this.viewer.camera || this.isExploringCity) {
            if (onComplete) onComplete();
            return;
        }
        
        this.isExploringCity = true;
        const [longitude, latitude] = city.coordinates;
        
        console.log(`[Globo] Explorando profundamente: ${city.name}`);
        
        // Generar narración específica
        const cityNarrative = await this.generateCityNarrative(city);
        
        // Mostrar subtítulos y narrar
        avatarSubtitlesManager.setSubtitles(cityNarrative);
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        this.isNarrationComplete = false;
        
        // Narrar la ciudad - NO avanzar hasta que termine
        audioManager.speak(cityNarrative, 'normal', () => {
            this.isNarrationComplete = true;
            pacingEngine.endCurrentEvent();
            pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
            
            // Después de la narración, hacer recorrido horizontal
            this.horizontalCityTour(city, () => {
                this.isExploringCity = false;
                if (onComplete) onComplete();
            });
        });
    }

    horizontalCityTour(city, onComplete) {
        if (!this.viewer || !this.viewer.camera) {
            if (onComplete) onComplete();
            return;
        }
        
        const [longitude, latitude] = city.coordinates;
        
        // Visitar lugares característicos primero
        if (city.landmarks && city.landmarks.length > 0) {
            let landmarkIndex = 0;
            
            const visitLandmark = () => {
                if (landmarkIndex >= city.landmarks.length) {
                    // Después de visitar landmarks, hacer recorrido horizontal
                    this.doHorizontalTour(longitude, latitude, onComplete);
                    return;
                }
                
                const landmark = city.landmarks[landmarkIndex];
                this.viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                        landmark.coordinates[0], 
                        landmark.coordinates[1], 
                        300 // Zoom muy profundo en el landmark
                    ),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-85),
                        roll: 0.0
                    },
                    duration: 3.0,
                    complete: () => {
                        console.log(`[Globo] Visitando landmark: ${landmark.name}`);
                        landmarkIndex++;
                        setTimeout(() => {
                            visitLandmark();
                        }, 4000); // Permanecer 4 segundos en cada landmark
                    }
                });
            };
            
            visitLandmark();
        } else {
            this.doHorizontalTour(longitude, latitude, onComplete);
        }
    }

    doHorizontalTour(centerLon, centerLat, onComplete) {
        // Recorrido horizontal: mover la cámara en círculo alrededor de la ciudad
        const angles = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 puntos alrededor
        let angleIndex = 0;
        
        const moveToNextAngle = () => {
            if (angleIndex >= angles.length) {
                if (onComplete) onComplete();
                return;
            }
            
            const angle = angles[angleIndex];
            const rad = Cesium.Math.toRadians(angle);
            
            // Calcular posición en círculo (radio de ~2km)
            const radius = 0.02; // ~2km en grados
            const newLon = centerLon + radius * Math.cos(rad);
            const newLat = centerLat + radius * Math.sin(rad);
            
            this.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(newLon, newLat, 500),
                orientation: {
                    heading: Cesium.Math.toRadians(angle + 180), // Mirar hacia el centro
                    pitch: Cesium.Math.toRadians(-80),
                    roll: 0.0
                },
                duration: 3.0,
                complete: () => {
                    angleIndex++;
                    setTimeout(() => {
                        moveToNextAngle();
                    }, 3000); // Permanecer 3 segundos en cada ángulo
                }
            });
        };
        
        moveToNextAngle();
    }

    async generateCityNarrative(city) {
        try {
            const prompt = `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás haciendo zoom profundo y explorando la ciudad de ${city.name}, ${city.country}. 

Genera una narrativa en primera persona sobre esta ciudad. Incluye:
- Dónde está ubicada geográficamente
- Qué es conocida esta ciudad
- Su importancia cultural, histórica o económica
- Qué observas desde esta perspectiva aérea
- La sensación que te genera estar aquí

El texto debe ser natural, reflexivo y entre 80 y 120 palabras. Menciona explícitamente el nombre de la ciudad "${city.name}" y el país "${city.country}".`;
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 50) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Globo] Error generando narrativa de ciudad:', e);
        }
        
        // Fallback narrativa
        return `Estoy explorando ${city.name}, una ciudad importante de ${city.country}. Desde esta perspectiva aérea puedo observar su estructura urbana, sus calles, sus edificios. Cada ciudad tiene su propia personalidad, su propia historia. ${city.name} es parte de la red global de lugares donde la humanidad se expresa, crea y vive.`;
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
        if (this.cityInfoInterval) {
            clearInterval(this.cityInfoInterval);
        }
        this.hideCityInfo();
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
