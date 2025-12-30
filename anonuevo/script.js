// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const TIMEZONES = [
    { offset: 14, name: 'UTC+14', region: 'Line Islands' },
    { offset: 13, name: 'UTC+13', region: 'Tonga, Samoa' },
    { offset: 12, name: 'UTC+12', region: 'New Zealand, Fiji' },
    { offset: 11, name: 'UTC+11', region: 'Vanuatu, Solomon Islands' },
    { offset: 10, name: 'UTC+10', region: 'Australia (Sydney)' },
    { offset: 9, name: 'UTC+9', region: 'Japan, South Korea' },
    { offset: 8, name: 'UTC+8', region: 'China, Singapore' },
    { offset: 7, name: 'UTC+7', region: 'Thailand, Vietnam' },
    { offset: 6, name: 'UTC+6', region: 'Bangladesh, Kazakhstan' },
    { offset: 5, name: 'UTC+5', region: 'Pakistan, India (Mumbai)' },
    { offset: 4, name: 'UTC+4', region: 'UAE, Mauritius' },
    { offset: 3, name: 'UTC+3', region: 'Moscow, Turkey' },
    { offset: 2, name: 'UTC+2', region: 'South Africa, Egypt' },
    { offset: 1, name: 'UTC+1', region: 'Central Europe' },
    { offset: 0, name: 'UTC', region: 'London, Lisbon' },
    { offset: -1, name: 'UTC-1', region: 'Cape Verde' },
    { offset: -2, name: 'UTC-2', region: 'Mid-Atlantic' },
    { offset: -3, name: 'UTC-3', region: 'Brazil (São Paulo)' },
    { offset: -4, name: 'UTC-4', region: 'Venezuela, Bolivia' },
    { offset: -5, name: 'UTC-5', region: 'US East, Colombia' },
    { offset: -6, name: 'UTC-6', region: 'US Central, Mexico' },
    { offset: -7, name: 'UTC-7', region: 'US Mountain' },
    { offset: -8, name: 'UTC-8', region: 'US Pacific, LA' },
    { offset: -9, name: 'UTC-9', region: 'Alaska' },
    { offset: -10, name: 'UTC-10', region: 'Hawaii' },
    { offset: -11, name: 'UTC-11', region: 'Samoa (US)' },
    { offset: -12, name: 'UTC-12', region: 'Baker Island' }
];

// Mensajes para voz en off (cada 15 minutos)
const VOICE_MESSAGES = [
    "¡Bienvenidos al rastreador global del Año Nuevo! Estamos siguiendo el avance de las celebraciones alrededor del mundo.",
    "El Año Nuevo ya ha llegado a las primeras zonas horarias. ¡Qué emocionante ver cómo se extiende la celebración!",
    "Mientras esperamos, recuerden que cada zona horaria tiene su momento especial. ¡Disfruten de esta experiencia única!",
    "El tiempo avanza inexorablemente hacia el Año Nuevo. Cada segundo nos acerca más a ese momento mágico.",
    "Desde las islas del Pacífico hasta las costas de América, el Año Nuevo se extiende por todo el planeta.",
    "¡Qué hermoso es ver cómo diferentes culturas celebran este momento especial de manera única!",
    "El mundo está conectado en este momento. Todos esperamos juntos el inicio de un nuevo año lleno de esperanza.",
    "Cada franja horaria que celebra es un recordatorio de que el tiempo es relativo, pero la celebración es universal.",
    "Mientras algunas zonas ya están celebrando, otras esperan con ansias su turno. ¡La magia del tiempo global!",
    "El Año Nuevo es un momento de reflexión, de nuevos comienzos, de esperanza renovada para todos.",
    "Desde el este hacia el oeste, la celebración avanza como una ola de alegría alrededor del mundo.",
    "¡Qué privilegio poder presenciar este momento histórico en tiempo real! El Año Nuevo global en acción.",
    "Cada minuto que pasa es un minuto menos para el Año Nuevo en tu zona. ¡El momento se acerca!",
    "Las celebraciones ya han comenzado en algunas partes del mundo. ¡Pronto será tu turno!",
    "El tiempo es el recurso más valioso. Usémoslo sabiamente en este nuevo año que se acerca.",
    "¡Gracias por acompañarnos en esta transmisión especial del Año Nuevo Global 2025!"
];

// Estado de la aplicación
const state = {
    currentYear: new Date().getFullYear() + 1, // Año Nuevo que estamos esperando
    lastVoiceMessage: null,
    lastVoiceTime: null,
    chatMessages: [],
    celebratedZones: new Set(),
    currentZone: null,
    nextZone: null,
    visualEffectsActive: false,
    backgroundAudio: null,
    youtubeChat: null,
    userTimezone: null,
    userTimezoneOffset: null,
    globeScene: null,
    globeCamera: null,
    globeRenderer: null,
    globeMesh: null,
    celebrationLights: [],
    sunLight: null,
    userLocation: null,
    userLatitude: null,
    userLongitude: null,
    viewersCount: 1234,
    countriesCount: 47,
    dynamicMessages: [],
    lastMessageChange: null,
    lastHourlyBanner: null,
    currentMessageIndex: 0,
    sunLight: null
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎆 Inicializando Año Nuevo Global 2025');
    
    // Detectar zona horaria del usuario
    detectUserTimezone();
    
    // Inicializar Mapbox primero (planisferio principal)
    initializeMapbox();
    
    // Inicializar globo terráqueo 3D (respaldo si Mapbox falla)
    initializeGlobe();
    
    initializeWorldMap();
    initializeTimeDisplay();
    initializeCountdown();
    initializeVoiceSystem();
    initializeVisualEffects();
    initializeBackgroundAudio();
    setupMouthSync(); // Configurar sincronización de boca
    animatePresenterAvatar(); // Inicializar animación facial con IA
    initializeAIPresenter();
    initializeDynamicFeatures();
    initializeUserLocation();
    
    // Actualizar cada segundo
    setInterval(updateAll, 1000);
    
    // Verificar mensajes de voz cada minuto
    setInterval(checkVoiceMessage, 60000);
    
    // Actualizar mapa cada 5 segundos
    setInterval(updateWorldMap, 5000);
    
    // Animar globo continuamente
    animateGlobe();
    
    console.log('✅ Inicialización completada');
});

// ============================================
// DETECCIÓN DE ZONA HORARIA DEL USUARIO
// ============================================

function detectUserTimezone() {
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60; // Offset en horas
    state.userTimezoneOffset = offset;
    
    // Obtener nombre de la zona horaria
    const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    state.userTimezone = timezoneName;
    
    // Formatear offset como UTC±X
    const offsetStr = offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
    
    // Actualizar display
    const timezoneEl = document.getElementById('userTimezone');
    if (timezoneEl) {
        timezoneEl.textContent = `${offsetStr} - ${timezoneName}`;
    }
    
    console.log(`📍 Zona horaria detectada: ${offsetStr} (${timezoneName})`);
}

// ============================================
// MAPBOX PLANISFERIO
// ============================================

function initializeMapbox() {
    // Configuración de Mapbox
    // Nota: En producción, usa tu propia API key de Mapbox
    // Puedes obtener una gratis en https://account.mapbox.com/
    mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    
    const mapContainer = document.getElementById('mapboxGlobe');
    if (!mapContainer) {
        console.warn('⚠️ Contenedor de Mapbox no encontrado');
        return;
    }
    
    try {
        // Crear mapa de Mapbox con vista de globo
        state.mapboxMap = new mapboxgl.Map({
            container: 'mapboxGlobe',
            style: 'mapbox://styles/mapbox/dark-v11', // Estilo oscuro
            projection: 'globe', // Proyección de globo 3D
            center: [state.userLongitude || -65, state.userLatitude || -35], // Centrar en Argentina por defecto
            zoom: 1.5,
            pitch: 0,
            bearing: 0
        });
        
        // Cuando el mapa esté cargado
        state.mapboxMap.on('load', () => {
            console.log('✅ Mapbox cargado');
            
            // Configurar iluminación para mostrar día/noche
            state.mapboxMap.setConfigProperty('light', 'anchor', 'viewport');
            
            // Centrar en ubicación del usuario si está disponible
            if (state.userLongitude && state.userLatitude) {
                state.mapboxMap.flyTo({
                    center: [state.userLongitude, state.userLatitude],
                    zoom: 2,
                    duration: 2000
                });
            }
            
            // Actualizar rotación del globo basada en hora UTC
            updateMapboxRotation();
            setInterval(updateMapboxRotation, 1000);
        });
        
        // Manejar errores
        state.mapboxMap.on('error', (e) => {
            console.warn('⚠️ Error de Mapbox, usando globo 3D como respaldo:', e);
        });
        
    } catch (error) {
        console.warn('⚠️ No se pudo inicializar Mapbox, usando globo 3D:', error);
    }
}

function updateMapboxRotation() {
    if (!state.mapboxMap) return;
    
    // Calcular rotación basada en hora UTC
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();
    
    // Rotar el globo para mostrar la hora actual
    // La Tierra rota 15 grados por hora
    const rotationDegrees = (hours * 15) + (minutes * 0.25) + (seconds * 0.0041667);
    
    // Ajustar bearing para rotar el globo
    state.mapboxMap.setBearing(rotationDegrees);
    
    // Actualizar iluminación para día/noche
    const sunPosition = calculateSunPosition();
    if (sunPosition) {
        state.mapboxMap.setConfigProperty('light', 'position', sunPosition);
    }
}

function calculateSunPosition() {
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    
    // Calcular posición del sol (simplificado)
    const sunLongitude = (hours * 15 + minutes * 0.25) - 180;
    const sunLatitude = 0; // El sol está en el ecuador
    
    return [sunLongitude, sunLatitude, 100];
}

// ============================================
// GLOBO TERRÁQUEO 3D (RESPALDO)
// ============================================

function initializeGlobe() {
    const canvas = document.getElementById('globeCanvas');
    if (!canvas) return;
    
    // Crear escena
    state.globeScene = new THREE.Scene();
    state.globeScene.background = null; // Transparente para ver el fondo
    
    // Crear cámara
    const width = window.innerWidth;
    const height = window.innerHeight;
    state.globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    state.globeCamera.position.set(0, 0, 2.5);
    
    // Crear renderer
    state.globeRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    state.globeRenderer.setSize(width, height);
    state.globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.globeRenderer.shadowMap.enabled = true;
    state.globeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Crear geometría de esfera (globo) - más detalle
    const geometry = new THREE.SphereGeometry(1, 128, 64);
    
    // Cargar textura de la Tierra
    const textureLoader = new THREE.TextureLoader();
    
    // Crear material con textura realista y mejor contraste para día/noche
    // Primero crear material básico para que el globo se vea inmediatamente
    const material = new THREE.MeshPhongMaterial({
        color: 0x4a90e2, // Azul océano por defecto
        shininess: 10,
        specular: 0x333333,
        emissive: 0x001122,
        transparent: false
    });
    
    // Crear malla del globo INMEDIATAMENTE (antes de cargar textura)
    state.globeMesh = new THREE.Mesh(geometry, material);
    state.globeMesh.receiveShadow = true;
    state.globeMesh.castShadow = true;
    state.globeScene.add(state.globeMesh);
    
    // Cargar textura de la Tierra de alta calidad con países visibles
    // Usar múltiples fuentes de textura para mejor compatibilidad
    const textureUrls = [
        'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
        'https://raw.githubusercontent.com/publiclab/mapknitter/master/public/images/earth.jpg',
        'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
    ];
    
    let textureIndex = 0;
    
    function tryLoadTexture(index) {
        if (index >= textureUrls.length) {
            console.warn('⚠️ No se pudo cargar ninguna textura, usando material procedural');
            createProceduralEarth();
            return;
        }
        
        const earthTexture = textureLoader.load(
            textureUrls[index],
            // onLoad callback
            (texture) => {
                console.log(`✅ Textura de la Tierra cargada (fuente ${index + 1})`);
                material.map = texture;
                material.needsUpdate = true;
            },
            // onProgress callback (opcional)
            undefined,
            // onError callback
            (err) => {
                console.warn(`⚠️ Textura ${index + 1} falló, intentando siguiente...`);
                tryLoadTexture(index + 1);
            }
        );
    }
    
    tryLoadTexture(0);
    
    // Dibujar husos horarios en el globo
    drawTimezonesOnGlobe();
    
    // Agregar atmósfera (esfera exterior semitransparente)
    const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    state.globeScene.add(atmosphere);
    
    // Agregar estrellas de fondo
    createStars();
    
    // Iluminación principal (simula el sol) - posición inicial basada en hora UTC
    const now = new Date();
    const hours = now.getUTCHours();
    const sunLongitude = (hours * 15) - 180; // Sol en el lado opuesto al meridiano actual
    const sunLongitudeRad = (sunLongitude * Math.PI) / 180;
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(
        Math.sin(sunLongitudeRad) * 5,
        2,
        Math.cos(sunLongitudeRad) * 5
    );
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -2;
    sunLight.shadow.camera.right = 2;
    sunLight.shadow.camera.top = 2;
    sunLight.shadow.camera.bottom = -2;
    state.globeScene.add(sunLight);
    state.sunLight = sunLight; // Guardar referencia
    
    // Luz ambiental muy suave (solo para el lado oscuro)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.15);
    state.globeScene.add(ambientLight);
    
    // Agregar luz adicional para el lado oscuro (más oscuro)
    const darkSideLight = new THREE.DirectionalLight(0x000033, 0.1);
    darkSideLight.position.set(-sunLight.position.x, -sunLight.position.y, -sunLight.position.z);
    state.globeScene.add(darkSideLight);
    
    // Crear material para el lado oscuro (más oscuro)
    const darkMaterial = new THREE.MeshBasicMaterial({
        color: 0x000033,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    
    // Agregar esfera oscura para el lado de noche
    const darkSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.001, 64, 64),
        darkMaterial
    );
    state.globeScene.add(darkSphere);
    
    // Agregar puntos de luz dorados para zonas que celebran
    state.celebrationLights = [];
    
    // Manejar resize
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        state.globeCamera.aspect = width / height;
        state.globeCamera.updateProjectionMatrix();
        state.globeRenderer.setSize(width, height);
    });
    
    // Iniciar animación inmediatamente
    animateGlobe();
    
    console.log('🌍 Globo terráqueo 3D inicializado');
}

function createProceduralEarth() {
    // Material procedural mejorado si no se puede cargar la textura
    if (state.globeMesh) {
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a90e2, // Azul océano
            emissive: 0x001122,
            shininess: 30,
            specular: 0x222222,
            transparent: false
        });
        state.globeMesh.material = material;
    }
}

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.8
    });
    
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    state.globeScene.add(stars);
}

function drawTimezonesOnGlobe() {
    if (!state.globeScene) return;
    
    // Dibujar meridianos de husos horarios en el globo
    // Cada 15 grados (360° / 24 = 15°)
    for (let lon = -180; lon <= 180; lon += 15) {
        const longitude = lon * (Math.PI / 180); // Convertir a radianes
        
        // Crear línea de meridiano
        const points = [];
        for (let lat = -90; lat <= 90; lat += 5) {
            const latitude = lat * (Math.PI / 180);
            const radius = 1.01; // Ligeramente fuera del globo
            
            // Convertir coordenadas esféricas a cartesianas
            const x = radius * Math.cos(latitude) * Math.sin(longitude);
            const y = radius * Math.sin(latitude);
            const z = radius * Math.cos(latitude) * Math.cos(longitude);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            linewidth: 1
        });
        const line = new THREE.Line(geometry, material);
        state.globeScene.add(line);
    }
}

function animateGlobe() {
    if (!state.globeMesh || !state.globeRenderer || !state.globeScene || !state.globeCamera) {
        console.warn('⚠️ Globo no inicializado completamente');
        return;
    }
    
    // Calcular rotación real de la Tierra
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();
    
    // Calcular rotación basada en la hora UTC real
    // La Tierra rota 15 grados por hora UTC
    const rotationDegrees = (hours * 15) + (minutes * 0.25) + (seconds * 0.0041667);
    const rotationRadians = (rotationDegrees * Math.PI) / 180;
    
    // Si tenemos la ubicación del usuario, mantener el globo centrado en su posición
    if (state.userLongitude !== null && state.userLongitudeRad !== undefined) {
        // Rotar el globo para mantener la ubicación del usuario centrada
        // Compensar la rotación de la Tierra
        state.globeMesh.rotation.y = -state.userLongitudeRad + rotationRadians;
        
        // Mantener la cámara centrada en el usuario
        if (state.globeCamera && state.userLatitudeRad !== undefined) {
            const cameraDistance = 2.8;
            const cameraHeight = Math.sin(state.userLatitudeRad) * 0.5;
            const cameraX = Math.sin(state.userLongitudeRad) * cameraDistance * 0.5;
            const cameraZ = Math.cos(state.userLongitudeRad) * cameraDistance;
            state.globeCamera.position.set(cameraX, cameraHeight, cameraZ);
            state.globeCamera.lookAt(0, 0, 0);
        }
    } else {
        // Rotación normal sin centrar en usuario
        state.globeMesh.rotation.y = rotationRadians;
    }
    
    // Calcular posición del sol para día/noche
    const sunLongitude = (hours * 15 + minutes * 0.25) - 180;
    const sunLongitudeRad = (sunLongitude * Math.PI) / 180;
    
    // Actualizar posición de la luz del sol
    if (state.globeScene.children) {
        state.globeScene.children.forEach(child => {
            if (child.type === 'DirectionalLight' && child.castShadow) {
                const sunX = Math.sin(sunLongitudeRad) * 5;
                const sunZ = Math.cos(sunLongitudeRad) * 5;
                child.position.set(sunX, 2, sunZ);
                child.lookAt(0, 0, 0);
            }
        });
    }
    
    // Actualizar luces de celebración
    updateCelebrationLights();
    
    // Renderizar
    state.globeRenderer.render(state.globeScene, state.globeCamera);
    
    requestAnimationFrame(animateGlobe);
}

function updateCelebrationLights() {
    // Agregar puntos de luz dorados en zonas que ya celebraron
    if (!state.celebratedZones || state.celebratedZones.size === 0) return;
    
    // Limpiar luces antiguas si hay demasiadas
    if (state.celebrationLights && state.celebrationLights.length > 20) {
        state.celebrationLights.forEach(light => {
            state.globeScene.remove(light);
        });
        state.celebrationLights = [];
    }
    
    // Agregar nuevas luces ocasionalmente
    if (Math.random() > 0.95 && state.celebratedZones.size > 0) {
        const light = new THREE.PointLight(0xffd700, 2, 3);
        const angle = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        light.position.set(
            Math.sin(phi) * Math.cos(angle) * 1.1,
            Math.cos(phi) * 1.1,
            Math.sin(phi) * Math.sin(angle) * 1.1
        );
        state.globeScene.add(light);
        state.celebrationLights.push(light);
        
        // Remover la luz después de 3 segundos
        setTimeout(() => {
            state.globeScene.remove(light);
            const index = state.celebrationLights.indexOf(light);
            if (index > -1) {
                state.celebrationLights.splice(index, 1);
            }
        }, 3000);
    }
}

// ============================================
// MAPA MUNDIAL Y FRANJAS HORARIAS
// ============================================

function initializeWorldMap() {
    const svg = document.querySelector('.world-map');
    if (!svg) return;
    
    // Limpiar SVG pero mantener defs
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) {
        svg.appendChild(defs);
    } else {
        // Recrear defs si no existen
        const newDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const dayPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        dayPattern.setAttribute('id', 'dayPattern');
        dayPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        dayPattern.setAttribute('width', '100');
        dayPattern.setAttribute('height', '100');
        const dayRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        dayRect.setAttribute('width', '100');
        dayRect.setAttribute('height', '100');
        dayRect.setAttribute('fill', 'rgba(135, 206, 235, 0.1)');
        dayPattern.appendChild(dayRect);
        newDefs.appendChild(dayPattern);
        
        const nightPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        nightPattern.setAttribute('id', 'nightPattern');
        nightPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        nightPattern.setAttribute('width', '100');
        nightPattern.setAttribute('height', '100');
        const nightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        nightRect.setAttribute('width', '100');
        nightRect.setAttribute('height', '100');
        nightRect.setAttribute('fill', 'rgba(0, 0, 50, 0.3)');
        nightPattern.appendChild(nightRect);
        newDefs.appendChild(nightPattern);
        svg.appendChild(newDefs);
    }
    
    // Dibujar fondo del mapa (océanos)
    const ocean = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ocean.setAttribute('x', '0');
    ocean.setAttribute('y', '0');
    ocean.setAttribute('width', '1440');
    ocean.setAttribute('height', '720');
    ocean.setAttribute('fill', 'rgba(30, 60, 120, 0.3)');
    svg.appendChild(ocean);
    
    // Dibujar husos horarios basados en meridianos reales
    // Cada huso horario tiene 15 grados de ancho (360° / 24 = 15°)
    const totalZones = 24;
    const degreesPerZone = 360 / totalZones;
    
    // Crear husos horarios basados en meridianos
    for (let i = 0; i < totalZones; i++) {
        // Calcular offset UTC (UTC+12 a UTC-11, centrado en UTC+0)
        let offset = 12 - i;
        if (offset > 12) offset = offset - 24;
        
        // Calcular posición del meridiano central del huso
        const meridian = offset * 15; // Cada huso está centrado en múltiplos de 15°
        
        // Convertir longitud a posición X en el mapa (proyección equirectangular)
        const x = ((meridian + 180) / 360) * 1440;
        const width = (degreesPerZone / 360) * 1440;
        
        // Crear zona horaria con mejor visibilidad
        const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        zone.setAttribute('class', 'timezone-zone');
        zone.setAttribute('data-offset', offset);
        zone.setAttribute('data-name', `UTC${offset >= 0 ? '+' : ''}${offset}`);
        zone.setAttribute('x', x - width / 2);
        zone.setAttribute('y', '0');
        zone.setAttribute('width', width);
        zone.setAttribute('height', '720');
        zone.setAttribute('fill', 'rgba(50, 50, 80, 0.4)');
        zone.setAttribute('stroke', 'rgba(150, 150, 200, 0.5)');
        zone.setAttribute('stroke-width', '1');
        zone.setAttribute('opacity', '0.6');
        
        // Agregar interactividad
        zone.addEventListener('mouseenter', (e) => {
            showTimezoneInfo(offset, e);
            zone.setAttribute('fill', 'rgba(100, 150, 200, 0.6)');
        });
        zone.addEventListener('mouseleave', () => {
            hideTimezoneInfo();
            zone.setAttribute('fill', 'rgba(50, 50, 80, 0.4)');
        });
        
        // Agregar tooltip con ciudades
        const cities = getCitiesForOffset(offset);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `UTC${offset >= 0 ? '+' : ''}${offset} - ${cities.slice(0, 3).join(', ')}`;
        zone.appendChild(title);
        
        svg.appendChild(zone);
    }
    
    // Dibujar meridianos de referencia más visibles
    drawMeridians(svg);
    
    // Dibujar países principales (simplificado)
    drawMainCountries(svg);
    
    updateWorldMap();
}

function drawMeridians(svg) {
    // Dibujar meridianos principales cada 15 grados
    for (let lon = -180; lon <= 180; lon += 15) {
        const x = ((lon + 180) / 360) * 1440;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', '0');
        line.setAttribute('x2', x);
        line.setAttribute('y2', '720');
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '5,5');
        svg.appendChild(line);
    }
}

function drawMainCountries(svg) {
    // Dibujar países como formas tipo planisferio (simplificado)
    // Usando polígonos aproximados para países principales
    
    const countries = [
        {
            name: 'Argentina',
            path: 'M 400 500 L 450 480 L 480 520 L 460 560 L 420 550 Z',
            color: 'rgba(116, 195, 101, 0.7)',
            highlight: true,
            centerX: 450,
            centerY: 520
        },
        {
            name: 'Brasil',
            path: 'M 480 420 L 520 400 L 540 440 L 530 480 L 500 470 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 520,
            centerY: 440
        },
        {
            name: 'Chile',
            path: 'M 380 500 L 400 480 L 410 520 L 395 560 L 375 540 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 395,
            centerY: 520
        },
        {
            name: 'México',
            path: 'M 280 360 L 320 350 L 330 380 L 310 400 L 290 390 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 310,
            centerY: 376
        },
        {
            name: 'Estados Unidos',
            path: 'M 250 280 L 320 270 L 340 300 L 330 340 L 280 330 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 304,
            centerY: 304
        },
        {
            name: 'España',
            path: 'M 680 300 L 700 295 L 710 310 L 705 325 L 690 320 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 697,
            centerY: 310
        },
        {
            name: 'Francia',
            path: 'M 700 280 L 720 275 L 730 290 L 725 305 L 710 300 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 717,
            centerY: 290
        },
        {
            name: 'Rusia',
            path: 'M 900 200 L 1100 180 L 1120 220 L 1080 240 L 920 230 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 1004,
            centerY: 214
        },
        {
            name: 'China',
            path: 'M 1000 320 L 1080 310 L 1100 340 L 1070 360 L 1020 350 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 1054,
            centerY: 336
        },
        {
            name: 'India',
            path: 'M 920 380 L 960 370 L 970 400 L 950 420 L 930 410 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 946,
            centerY: 396
        },
        {
            name: 'Japón',
            path: 'M 1150 320 L 1170 315 L 1175 330 L 1165 340 L 1155 335 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 1163,
            centerY: 328
        },
        {
            name: 'Australia',
            path: 'M 1100 520 L 1160 510 L 1180 540 L 1150 560 L 1110 550 Z',
            color: 'rgba(116, 195, 101, 0.6)',
            centerX: 1140,
            centerY: 536
        }
    ];
    
    countries.forEach(country => {
        // Dibujar forma del país
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', country.path);
        path.setAttribute('fill', country.color);
        path.setAttribute('stroke', country.highlight ? 'rgba(255, 215, 0, 1)' : 'rgba(255, 255, 255, 0.6)');
        path.setAttribute('stroke-width', country.highlight ? '3' : '1.5');
        path.setAttribute('class', 'country-shape');
        path.setAttribute('data-country', country.name);
        path.setAttribute('opacity', '0.8');
        
        // Agregar interactividad
        path.addEventListener('mouseenter', () => {
            path.setAttribute('fill', 'rgba(255, 215, 0, 0.8)');
            path.setAttribute('stroke-width', '3');
        });
        path.addEventListener('mouseleave', () => {
            path.setAttribute('fill', country.color);
            path.setAttribute('stroke-width', country.highlight ? '3' : '1.5');
        });
        
        svg.appendChild(path);
        
        // Agregar etiqueta de texto en el centro
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', country.centerX);
        text.setAttribute('y', country.centerY);
        text.setAttribute('fill', country.highlight ? '#ffd700' : 'rgba(255, 255, 255, 0.9)');
        text.setAttribute('font-size', country.highlight ? '14' : '11');
        text.setAttribute('font-weight', country.highlight ? '700' : '600');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'country-label');
        text.setAttribute('pointer-events', 'none');
        text.textContent = country.name;
        
        svg.appendChild(text);
    });
}

function showTimezoneInfo(offset, event) {
    const cities = getCitiesForOffset(offset);
    const now = new Date();
    const localTime = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    
    // Crear tooltip flotante
    let tooltip = document.getElementById('timezoneTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'timezoneTooltip';
        tooltip.className = 'timezone-tooltip';
        document.body.appendChild(tooltip);
    }
    
    const hours = String(localTime.getUTCHours()).padStart(2, '0');
    const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');
    
    tooltip.innerHTML = `
        <div class="tooltip-header">UTC${offset >= 0 ? '+' : ''}${offset}</div>
        <div class="tooltip-time">${hours}:${minutes}:${seconds}</div>
        <div class="tooltip-cities">${cities.slice(0, 5).join(', ')}</div>
    `;
    
    tooltip.style.display = 'block';
    tooltip.style.left = (event.clientX + 10) + 'px';
    tooltip.style.top = (event.clientY + 10) + 'px';
}

function hideTimezoneInfo() {
    const tooltip = document.getElementById('timezoneTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function getCitiesForOffset(offset) {
    if (typeof TIMEZONE_CITIES !== 'undefined') {
        return TIMEZONE_CITIES[offset] || TIMEZONE_CITIES[String(offset)] || [];
    }
    // Fallback si no está disponible
    const tz = TIMEZONES.find(t => t.offset === offset);
    return tz ? [tz.region] : [];
}

function updateWorldMap() {
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    const currentUTCDate = now.getUTCDate();
    const currentUTCMonth = now.getUTCMonth();
    const currentUTCYear = now.getUTCFullYear();
    
    // Determinar si ya es Año Nuevo en UTC
    const isNewYearUTC = currentUTCYear >= state.currentYear;
    
    const zones = document.querySelectorAll('.timezone-zone');
    state.celebratedZones.clear();
    state.currentZone = null;
    state.nextZone = null;
    
    let nextZoneFound = false;
    
    zones.forEach((zone) => {
        const offset = parseInt(zone.getAttribute('data-offset'));
        const zoneName = zone.getAttribute('data-name');
        
        // Calcular hora local de la zona
        let zoneHour = currentUTCHour + offset;
        let zoneDate = currentUTCDate;
        let zoneMonth = currentUTCMonth;
        let zoneYear = currentUTCYear;
        
        // Ajustar fecha si es necesario
        if (zoneHour < 0) {
            zoneHour += 24;
            zoneDate--;
            if (zoneDate < 1) {
                zoneMonth--;
                if (zoneMonth < 0) {
                    zoneMonth = 11;
                    zoneYear--;
                }
                zoneDate = new Date(zoneYear, zoneMonth + 1, 0).getDate();
            }
        } else if (zoneHour >= 24) {
            zoneHour -= 24;
            zoneDate++;
            const daysInMonth = new Date(zoneYear, zoneMonth + 1, 0).getDate();
            if (zoneDate > daysInMonth) {
                zoneDate = 1;
                zoneMonth++;
                if (zoneMonth > 11) {
                    zoneMonth = 0;
                    zoneYear++;
                }
            }
        }
        
        // Verificar si ya es Año Nuevo en esta zona
        const isNewYear = zoneYear >= state.currentYear;
        
        // Remover todas las clases
        zone.classList.remove('celebrated', 'current', 'next');
        
        if (isNewYear) {
            zone.classList.add('celebrated');
            state.celebratedZones.add(zoneName);
        } else if (!nextZoneFound && zoneYear < state.currentYear) {
            // Esta es la próxima zona que celebrará
            zone.classList.add('next');
            state.nextZone = zoneName;
            nextZoneFound = true;
        }
        
        // Marcar zona actual (la que está más cerca de medianoche)
        if (!isNewYear && Math.abs(zoneHour - 0) < 2) {
            zone.classList.add('current');
            if (!state.currentZone) {
                state.currentZone = zoneName;
            }
        }
    });
    
    // Actualizar estadísticas
    updateStatistics();
}

function updateStatistics() {
    const celebratedCount = state.celebratedZones.size;
    const remainingCount = TIMEZONES.length - celebratedCount;
    
    document.getElementById('zonesCelebrated').textContent = celebratedCount;
    document.getElementById('zonesRemaining').textContent = remainingCount;
    
    if (state.nextZone) {
        document.getElementById('nextZone').textContent = state.nextZone;
    } else {
        document.getElementById('nextZone').textContent = 'Completado';
    }
}

// ============================================
// DISPLAY DE TIEMPO UTC Y DEL USUARIO
// ============================================

function initializeTimeDisplay() {
    updateTimeDisplay();
}

function updateTimeDisplay() {
    const now = new Date();
    
    // Actualizar hora UTC
    const utcTime = now.toUTCString();
    const timeMatch = utcTime.match(/(\d{2}):(\d{2}):(\d{2})/);
    const dateMatch = utcTime.match(/(\w+), (\d+) (\w+) (\d+)/);
    
    if (timeMatch) {
        const hours = timeMatch[1];
        const minutes = timeMatch[2];
        const seconds = timeMatch[3];
        document.getElementById('utcTime').textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    if (dateMatch) {
        const day = dateMatch[2];
        const month = dateMatch[3];
        const year = dateMatch[4];
        const monthNames = {
            'Jan': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Apr': 'Abril',
            'May': 'Mayo', 'Jun': 'Junio', 'Jul': 'Julio', 'Aug': 'Agosto',
            'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dec': 'Diciembre'
        };
        document.getElementById('utcDate').textContent = `${day} de ${monthNames[month] || month}, ${year}`;
    }
    
    // Actualizar hora del usuario (local)
    const userHours = String(now.getHours()).padStart(2, '0');
    const userMinutes = String(now.getMinutes()).padStart(2, '0');
    const userSeconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('userTime').textContent = `${userHours}:${userMinutes}:${userSeconds}`;
    
    // Fecha del usuario
    const userDay = now.getDate();
    const userMonth = now.getMonth();
    const userYear = now.getFullYear();
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    document.getElementById('userDate').textContent = `${userDay} de ${monthNames[userMonth]}, ${userYear}`;
}

// ============================================
// CUENTA REGRESIVA LOCAL
// ============================================

function initializeCountdown() {
    updateCountdown();
}

function updateCountdown() {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = now.getMonth();
    const localDate = now.getDate();
    
    // Calcular Año Nuevo en la zona local del usuario
    let newYearDate;
    
    // Si ya pasó el 1 de enero, esperar el próximo año
    if (localMonth === 0 && localDate === 1 && now.getHours() >= 0) {
        // Ya es 1 de enero, calcular para el próximo año
        newYearDate = new Date(localYear + 1, 0, 1, 0, 0, 0, 0);
    } else if (localMonth === 0 && localDate > 1) {
        // Ya pasó el 1 de enero de este año
        newYearDate = new Date(localYear + 1, 0, 1, 0, 0, 0, 0);
    } else {
        // Aún no es 1 de enero
        newYearDate = new Date(localYear, 0, 1, 0, 0, 0, 0);
        
        // Si ya pasó el 1 de enero de este año, esperar el próximo
        if (now > newYearDate) {
            newYearDate = new Date(localYear + 1, 0, 1, 0, 0, 0, 0);
        }
    }
    
    const diff = newYearDate - now;
    
    if (diff <= 0) {
        // ¡Ya es Año Nuevo!
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// ============================================
// SISTEMA DE VOZ EN OFF
// ============================================

function initializeVoiceSystem() {
    // Verificar soporte de Web Speech API
    if ('speechSynthesis' in window) {
        console.log('✅ Sistema de voz disponible');
    } else {
        console.warn('⚠️ Sistema de voz no disponible');
    }
}

function checkVoiceMessage() {
    const now = new Date();
    const minutes = now.getMinutes();
    
    // Verificar si es un múltiplo de 15 minutos (0, 15, 30, 45)
    if (minutes % 15 === 0) {
        // Verificar que no hayamos mostrado un mensaje en este minuto
        if (state.lastVoiceTime === null || 
            state.lastVoiceTime.getMinutes() !== minutes ||
            state.lastVoiceTime.getHours() !== now.getHours()) {
            
            showVoiceMessage();
            state.lastVoiceTime = new Date(now);
        }
    }
}

function showVoiceMessage() {
    // Seleccionar mensaje aleatorio
    const messageIndex = Math.floor(Math.random() * VOICE_MESSAGES.length);
    const message = VOICE_MESSAGES[messageIndex];
    
    // Mostrar mensaje visual
    const voiceMessageEl = document.getElementById('voiceMessage');
    const voiceTextEl = document.getElementById('voiceText');
    
    voiceTextEl.textContent = message;
    voiceMessageEl.style.display = 'block';
    
    // Leer mensaje en voz
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        speechSynthesis.speak(utterance);
    }
    
    // Ocultar mensaje después de 8 segundos
    setTimeout(() => {
        voiceMessageEl.style.display = 'none';
    }, 8000);
}

// ============================================
// EFECTOS VISUALES Y JUEGOS
// ============================================

function initializeVisualEffects() {
    // Activar efectos visuales periódicamente
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% de probabilidad
            createFirework();
        }
    }, 3000);
    
    setInterval(() => {
        if (Math.random() > 0.8) { // 20% de probabilidad
            createConfetti();
        }
    }, 2000);
}

function createFirework() {
    const container = document.getElementById('visualEffects');
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    firework.style.left = x + 'px';
    firework.style.top = y + 'px';
    firework.style.background = color;
    firework.style.boxShadow = `0 0 20px ${color}`;
    
    container.appendChild(firework);
    
    setTimeout(() => {
        firework.remove();
    }, 1000);
}

function createConfetti() {
    const container = document.getElementById('visualEffects');
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    const x = Math.random() * window.innerWidth;
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#60a5fa'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    confetti.style.left = x + 'px';
    confetti.style.top = '-10px';
    confetti.style.background = color;
    
    container.appendChild(confetti);
    
    setTimeout(() => {
        confetti.remove();
    }, 3000);
}

// ============================================
// AUDIO DE FONDO
// ============================================

// Configuración de audio de fondo - Múltiples pistas
const AUDIO_CONFIG = {
    // Para obtener los audios de YouTube Studio:
    // 1. Ve a https://studio.youtube.com/channel/UCDg4eJJdvNAX2az-Bi7aBkA/music
    // 2. Descarga los audios que quieras usar
    // 3. Colócalos en la carpeta del proyecto
    // 4. Configura las rutas aquí
    tracks: [
        { id: 'backgroundAudio1', src: 'audio1.mp3', volume: 0.3, loop: true },
        { id: 'backgroundAudio2', src: 'audio2.mp3', volume: 0.2, loop: true },
        { id: 'backgroundAudio3', src: 'audio3.mp3', volume: 0.25, loop: true }
    ]
};

function initializeBackgroundAudio() {
    // Inicializar cada pista de audio
    AUDIO_CONFIG.tracks.forEach((track, index) => {
        const audioEl = document.getElementById(track.id);
        if (!audioEl) return;
        
        if (track.src) {
            audioEl.src = track.src;
            audioEl.volume = track.volume;
            audioEl.loop = track.loop;
            
            // Intentar reproducir cuando el usuario interactúe
            const playAudio = () => {
                if (audioEl.paused && audioEl.src) {
                    audioEl.play().catch(err => {
                        // Silenciar errores de audio (es normal que requiera interacción del usuario)
                        // Solo loguear si es un error diferente
                        if (err.name !== 'NotAllowedError') {
                            console.log(`No se pudo reproducir ${track.id}:`, err);
                        }
                    });
                }
            };
            
            // Reproducir con un pequeño delay entre pistas para crear ambiente
            if (index === 0) {
                // Primera pista se reproduce inmediatamente
                document.addEventListener('click', playAudio, { once: true });
                document.addEventListener('touchstart', playAudio, { once: true });
                document.addEventListener('keydown', playAudio, { once: true });
                setTimeout(playAudio, 1000);
            } else {
                // Otras pistas se reproducen con delay
                const delay = index * 2000; // 2 segundos entre cada pista
                setTimeout(() => {
                    document.addEventListener('click', playAudio, { once: true });
                    document.addEventListener('touchstart', playAudio, { once: true });
                    setTimeout(playAudio, delay);
                }, delay);
            }
        } else {
            console.log(`ℹ️ Audio ${track.id} no configurado. Agrega ${track.src} a la carpeta del proyecto.`);
        }
    });
}

// ============================================
// FUNCIONES DINÁMICAS Y DIVERTIDAS
// ============================================

function initializeDynamicFeatures() {
    // Inicializar estadísticas dinámicas
    initializeDynamicStats();
    
    // Inicializar contador global
    initializeGlobalCountdown();
    
    // Actualizar estadísticas cada 5 segundos
    setInterval(updateDynamicStats, 5000);
    
    // Actualizar contador global cada segundo
    setInterval(updateGlobalCountdown, 1000);
    
    console.log('✨ Funciones dinámicas inicializadas');
}

function speakMessage(message) {
    // Verificar si el navegador soporta speech synthesis
    if ('speechSynthesis' in window) {
        // Cancelar cualquier mensaje anterior
        window.speechSynthesis.cancel();
        
        // Crear utterance
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9; // Velocidad ligeramente más lenta
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Intentar usar voz en español
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.startsWith('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        // Reproducir
        window.speechSynthesis.speak(utterance);
        
        console.log('🔊 Mensaje leído:', message);
    } else {
        console.log('⚠️ Speech synthesis no disponible');
    }
}

// Cargar voces cuando estén disponibles
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        console.log('✅ Voces cargadas');
    };
}

function initializeDynamicStats() {
    // Simular estadísticas dinámicas (en producción, esto vendría de un servidor)
    updateDynamicStats();
}

function updateDynamicStats() {
    // Simular variación en el número de espectadores
    const baseViewers = 1234;
    const variation = Math.floor(Math.random() * 200) - 100;
    state.viewersCount = Math.max(100, baseViewers + variation);
    
    // Simular variación en países
    const baseCountries = 47;
    const countryVariation = Math.floor(Math.random() * 10) - 5;
    state.countriesCount = Math.max(20, baseCountries + countryVariation);
    
    // Actualizar UI
    const viewersEl = document.getElementById('viewersCount');
    if (viewersEl) {
        viewersEl.textContent = state.viewersCount.toLocaleString();
    }
    
    const countriesEl = document.getElementById('countriesCount');
    if (countriesEl) {
        countriesEl.textContent = state.countriesCount;
    }
    
    // Calcular tiempo promedio (simulado)
    const avgTimeEl = document.getElementById('avgTime');
    if (avgTimeEl) {
        const minutes = Math.floor(Math.random() * 30) + 5;
        const seconds = Math.floor(Math.random() * 60);
        avgTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function initializeGlobalCountdown() {
    updateGlobalCountdown();
}

function updateGlobalCountdown() {
    const countdownEl = document.getElementById('globalCountdown');
    if (!countdownEl) return;
    
    // Calcular tiempo hasta el primer Año Nuevo (UTC+14)
    const now = new Date();
    const currentYear = now.getFullYear();
    const newYearDate = new Date(currentYear + 1, 0, 1, 0, 0, 0, 0); // 1 de enero del próximo año
    
    // Ajustar para UTC+14 (el primer lugar en celebrar)
    // UTC+14 está 14 horas adelante, así que el Año Nuevo llega 14 horas antes en UTC
    const firstNewYearUTC = new Date(newYearDate.getTime() - (14 * 60 * 60 * 1000));
    
    const diff = firstNewYearUTC - now;
    
    if (diff <= 0) {
        countdownEl.textContent = '00:00:00';
        return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================
// CARTEL DE HORA EN PUNTO
// ============================================

function initializeHourlyBanner() {
    checkHourlyBanner();
}

function checkHourlyBanner() {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();
    
    // Mostrar cada hora en punto (minutos === 0)
    if (minutes === 0 && state.lastHourlyBanner !== hours) {
        showHourlyBanner();
        state.lastHourlyBanner = hours;
    }
}

function showHourlyBanner() {
    const banner = document.getElementById('hourlyBanner');
    const subtext = document.getElementById('hourlyBannerSubtext');
    if (!banner || !subtext) return;
    
    // Calcular tiempo restante
    const now = new Date();
    const currentYear = now.getFullYear();
    const newYearDate = new Date(currentYear + 1, 0, 1, 0, 0, 0, 0);
    const firstNewYearUTC = new Date(newYearDate.getTime() - (14 * 60 * 60 * 1000));
    const diff = firstNewYearUTC - now;
    
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    
    subtext.textContent = `Faltan ${daysLeft} días y ${hoursLeft % 24} horas`;
    
    // Mostrar banner
    banner.classList.add('show');
    
    // Leer mensaje con voz
    const message = `¡Ya falta menos! Faltan ${daysLeft} días y ${hoursLeft % 24} horas para el Año Nuevo`;
    setTimeout(() => speakMessage(message), 500);
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        banner.classList.remove('show');
    }, 5000);
}

// ============================================
// LÍNEA DE TIEMPO
// ============================================

function initializeTimeline() {
    const now = new Date();
    const startDate = document.getElementById('timelineStartDate');
    if (startDate) {
        const dateStr = now.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        startDate.textContent = dateStr;
    }
    
    // Agregar hitos (milestones) en la línea de tiempo
    addTimelineMilestones();
    
    updateTimeline();
    setInterval(updateTimeline, 1000);
}

function addTimelineMilestones() {
    const milestonesContainer = document.getElementById('timelineMilestones');
    if (!milestonesContainer) return;
    
    const milestones = [
        { progress: 25, emoji: '🌱', label: 'Primavera' },
        { progress: 50, emoji: '☀️', label: 'Verano' },
        { progress: 75, emoji: '🍂', label: 'Otoño' },
        { progress: 90, emoji: '❄️', label: 'Invierno' }
    ];
    
    milestones.forEach(milestone => {
        const milestoneEl = document.createElement('div');
        milestoneEl.className = 'timeline-milestone';
        milestoneEl.style.left = `${milestone.progress}%`;
        milestoneEl.innerHTML = `
            <div class="milestone-emoji">${milestone.emoji}</div>
            <div class="milestone-label">${milestone.label}</div>
        `;
        milestonesContainer.appendChild(milestoneEl);
    });
}

function updateTimeline() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(2026, 0, 1, 0, 0, 0, 0);
    
    const totalTime = endOfYear - startOfYear;
    const elapsedTime = now - startOfYear;
    
    // Ajustar progreso: empezar más atrás (dejar atrás algunas horas)
    // Restar 12 horas para que la personita esté más atrás
    const hoursBehind = 12;
    const adjustedElapsedTime = Math.max(0, elapsedTime - (hoursBehind * 60 * 60 * 1000));
    const progress = Math.min(100, (adjustedElapsedTime / totalTime) * 100);
    
    const person = document.getElementById('timelinePerson');
    const progressBar = document.getElementById('timelineProgress');
    
    if (person && progressBar) {
        // Posicionar personita
        person.style.left = `${progress}%`;
        
        // Actualizar barra de progreso
        progressBar.style.width = `${progress}%`;
        
        // Hacer la personita más grande a medida que avanza
        const scale = 1 + (progress / 100) * 0.8; // Crece hasta 1.8x
        person.style.transform = `translateX(-50%) scale(${scale})`;
        
        // Cambiar emoji y animación según el progreso
        const emojiEl = person.querySelector('.person-emoji');
        if (emojiEl) {
            if (progress < 10) {
                emojiEl.textContent = '😴';
                emojiEl.style.animation = 'person-sleep 2s ease-in-out infinite';
            } else if (progress < 25) {
                emojiEl.textContent = '🚶';
                emojiEl.style.animation = 'person-walk 1s ease-in-out infinite';
            } else if (progress < 50) {
                emojiEl.textContent = '🏃';
                emojiEl.style.animation = 'person-run 0.8s ease-in-out infinite';
            } else if (progress < 75) {
                emojiEl.textContent = '🚀';
                emojiEl.style.animation = 'person-fly 0.5s ease-in-out infinite';
            } else {
                emojiEl.textContent = '🎆';
                emojiEl.style.animation = 'person-celebrate 0.3s ease-in-out infinite';
            }
        }
        
        // Agregar chispas cuando avanza
        if (Math.random() > 0.7) {
            addTimelineSparkle(progress);
        }
    }
}

function addTimelineSparkle(position) {
    const sparklesContainer = document.getElementById('timelineSparkles');
    if (!sparklesContainer) return;
    
    const sparkle = document.createElement('div');
    sparkle.className = 'timeline-sparkle';
    sparkle.style.left = `${position}%`;
    sparkle.textContent = ['✨', '⭐', '💫'][Math.floor(Math.random() * 3)];
    sparklesContainer.appendChild(sparkle);
    
    setTimeout(() => {
        sparkle.remove();
    }, 2000);
}

// ============================================
// PRESENTADOR CON IA
// ============================================

// Generador de contenido con IA (simulado - en producción usarías una API real)
async function generateAIContent(context) {
    // Simular generación de contenido con IA
    // En producción, esto llamaría a OpenAI, Anthropic, o similar
    
    const templates = {
        welcome: [
            '¡Bienvenidos al rastreador global del Año Nuevo! Estamos aquí para seguir juntos el avance de las celebraciones alrededor del mundo en tiempo real.',
            'Hola y bienvenidos a esta transmisión especial. Estamos siguiendo el avance del Año Nuevo por todo el planeta, zona horaria por zona horaria.',
            'Bienvenidos a esta experiencia única. Juntos vamos a presenciar cómo el mundo celebra el Año Nuevo, desde las primeras islas del Pacífico hasta las últimas regiones.'
        ],
        traditions: [
            `En este momento, ${context.currentZone || 'varias regiones'} están celebrando. Cada cultura tiene sus propias tradiciones fascinantes para recibir el nuevo año.`,
            `Las tradiciones del Año Nuevo son increíblemente diversas. Desde las 12 uvas en España hasta los templos en Japón, cada país celebra a su manera única.`,
            `¿Sabías que en diferentes partes del mundo se celebran diferentes Años Nuevos? El calendario gregoriano es solo uno de muchos sistemas de tiempo fascinantes.`
        ],
        progress: [
            `Ya hemos visto ${context.celebratedZones || 0} zonas horarias celebrar el Año Nuevo. El mundo se está iluminando gradualmente con festejos.`,
            `En este momento, ${context.nextZone || 'la próxima zona'} se prepara para recibir el Año Nuevo. La celebración continúa avanzando por el planeta.`,
            `Estamos en un momento especial. Miles de personas alrededor del mundo están conectadas, compartiendo este evento único que une a toda la humanidad.`
        ],
        reflection: [
            'El Año Nuevo es más que una fecha en el calendario. Es un símbolo de esperanza, renovación y la oportunidad de comenzar de nuevo.',
            'Cada año nuevo trae consigo la promesa de nuevos comienzos. Es un momento para reflexionar sobre el pasado y mirar hacia el futuro con optimismo.',
            'En este momento especial, personas de todas las culturas y continentes se unen en celebración. Es un recordatorio de nuestra humanidad compartida.'
        ]
    };
    
    // Seleccionar categoría basada en el contexto
    let category = 'welcome';
    if (context.celebratedZones > 0) category = 'progress';
    if (context.celebratedZones > 5) category = 'traditions';
    if (Math.random() > 0.7) category = 'reflection';
    
    const options = templates[category];
    // Simular delay de IA (en producción sería una llamada real a la API)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return options[Math.floor(Math.random() * options.length)];
}

const PRESENTER_TOPICS = [
    {
        title: 'Bienvenida',
        category: 'welcome',
        duration: 15000
    },
    {
        title: 'Historia del Año Nuevo',
        category: 'traditions',
        duration: 20000
    },
    {
        title: 'Primera celebración',
        category: 'progress',
        duration: 18000
    },
    {
        title: 'Tradiciones mundiales',
        category: 'traditions',
        duration: 22000
    },
    {
        title: 'Zona horaria actual',
        category: 'progress',
        duration: 16000
    },
    {
        title: 'Estadísticas globales',
        category: 'progress',
        duration: 15000
    },
    {
        title: 'Próxima zona',
        category: 'progress',
        duration: 17000
    },
    {
        title: 'Reflexión',
        category: 'reflection',
        duration: 18000
    }
];

let currentTopicIndex = 0;
let presenterInterval = null;

function initializeAIPresenter() {
    const presenterText = document.getElementById('presenterText');
    if (!presenterText) return;
    
    // Animar avatar
    animatePresenterAvatar();
    
    // Empezar con el primer tema
    presentTopicWithAI(0);
    
    // Cambiar de tema cada cierto tiempo
    presenterInterval = setInterval(() => {
        currentTopicIndex = (currentTopicIndex + 1) % PRESENTER_TOPICS.length;
        presentTopicWithAI(currentTopicIndex);
    }, 50000); // Cambiar cada 50 segundos
    
    console.log('🎙️ Presentador con IA inicializado');
}

async function presentTopicWithAI(index) {
    const topic = PRESENTER_TOPICS[index];
    const presenterText = document.getElementById('presenterText');
    const presenterSubtitle = document.getElementById('presenterSubtitle');
    
    if (!presenterText || !topic) return;
    
    // Mostrar que está generando con IA
    if (presenterSubtitle) {
        presenterSubtitle.textContent = '🤖 Generando contenido con IA...';
        presenterSubtitle.style.opacity = '1';
    }
    
    // Generar contenido con IA basado en el contexto actual
    const context = {
        currentZone: state.currentZone,
        nextZone: state.nextZone,
        celebratedZones: state.celebratedZones ? state.celebratedZones.size : 0,
        viewersCount: state.viewersCount,
        countriesCount: state.countriesCount
    };
    
    try {
        const aiContent = await generateAIContent(context);
        
        // Actualizar texto con animación
        presenterText.style.opacity = '0';
        setTimeout(() => {
            presenterText.textContent = aiContent;
            presenterText.style.opacity = '1';
            
            if (presenterSubtitle) {
                presenterSubtitle.textContent = `📝 ${topic.title}`;
            }
            
            // Leer con voz mejorada
            speakPresenterMessage(aiContent);
            
            // Animar boca mientras habla
            animateMouthWhileSpeaking(aiContent.length * 50); // Duración aproximada
        }, 300);
        
    } catch (error) {
        console.error('Error generando contenido con IA:', error);
        // Fallback a contenido predefinido
        const fallbackContent = getFallbackContent(topic.category);
        presenterText.textContent = fallbackContent;
        speakPresenterMessage(fallbackContent);
    }
}

function getFallbackContent(category) {
    const fallbacks = {
        welcome: '¡Bienvenidos al rastreador global del Año Nuevo! Estamos aquí para seguir juntos el avance de las celebraciones alrededor del mundo.',
        traditions: 'Cada país tiene sus propias tradiciones fascinantes para celebrar el Año Nuevo. Desde las 12 uvas en España hasta los templos en Japón.',
        progress: `Ya hemos visto ${state.celebratedZones ? state.celebratedZones.size : 0} zonas horarias celebrar. La próxima zona en celebrar es ${state.nextZone || 'próximamente'}.`,
        reflection: 'El Año Nuevo es un momento de reflexión, esperanza y nuevos comienzos. Es una oportunidad para dejar atrás lo viejo y abrazar lo nuevo.'
    };
    return fallbacks[category] || fallbacks.welcome;
}

function speakPresenterMessage(message) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9; // Velocidad natural
        utterance.pitch = 1.0; // Tono natural
        utterance.volume = 0.95;
        
        // Buscar la mejor voz en español
        const voices = window.speechSynthesis.getVoices();
        let bestVoice = voices.find(voice => 
            voice.lang.startsWith('es') && (voice.name.includes('Neural') || voice.name.includes('Premium'))
        ) || voices.find(voice => 
            voice.lang.startsWith('es') && voice.name.includes('Female')
        ) || voices.find(voice => voice.lang.startsWith('es'));
        
        if (bestVoice) {
            utterance.voice = bestVoice;
        }
        
        // Eventos para animar el avatar y sincronizar boca
        const mouthOverlay = document.getElementById('avatarMouth');
        
        utterance.onstart = () => {
            state.aiPresenterActive = true;
            if (mouthOverlay) {
                mouthOverlay.classList.add('speaking');
            }
            // Reiniciar animación facial si está pausada
            if (!state.animationFrame && state.avatarCanvas) {
                if (state.faceAnimationModel) {
                    startFaceAnimation();
                } else {
                    startBasicFaceAnimation();
                }
            }
        };
        
        utterance.onend = () => {
            state.aiPresenterActive = false;
            if (mouthOverlay) {
                mouthOverlay.classList.remove('speaking');
            }
        };
        
        utterance.onerror = () => {
            state.aiPresenterActive = false;
            if (mouthOverlay) {
                mouthOverlay.classList.remove('speaking');
            }
        };
        
        // Sincronizar boca con pausas y palabras
        utterance.onboundary = (event) => {
            if (mouthOverlay && event.name === 'word') {
                // Pequeña animación en cada palabra
                mouthOverlay.classList.remove('speaking');
                setTimeout(() => {
                    if (state.aiPresenterActive) {
                        mouthOverlay.classList.add('speaking');
                    }
                }, 10);
            }
        };
        
        window.speechSynthesis.speak(utterance);
        
        console.log('🎙️ Presentador habla:', message.substring(0, 50) + '...');
    }
}

async function animatePresenterAvatar() {
    console.log('🎭 Inicializando animación facial con IA...');
    
    // Inicializar canvas para animación
    const canvas = document.getElementById('avatarCanvas');
    const image = document.getElementById('avatarImage');
    
    if (!canvas || !image) {
        console.warn('⚠️ No se encontraron elementos del avatar');
        return;
    }
    
    state.avatarCanvas = canvas;
    state.avatarCtx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // Cargar imagen
    state.faceImage = new Image();
    state.faceImage.crossOrigin = 'anonymous';
    
    state.faceImage.onload = async () => {
        console.log('✅ Imagen del presentador cargada');
        
        // Intentar cargar modelo de detección facial
        try {
            await initializeFaceAnimation();
        } catch (error) {
            console.warn('⚠️ No se pudo cargar modelo de IA, usando animación básica:', error);
            initializeBasicFaceAnimation();
        }
    };
    
    state.faceImage.onerror = () => {
        console.warn('⚠️ Error cargando imagen, usando animación básica');
        initializeBasicFaceAnimation();
    };
    
    state.faceImage.src = image.src;
}

async function initializeFaceAnimation() {
    // Opción 1: Usar TensorFlow.js Face Landmarks Detection
    try {
        // Verificar que las librerías estén cargadas
        if (typeof faceLandmarksDetection === 'undefined') {
            throw new Error('faceLandmarksDetection no está disponible');
        }
        
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            refineLandmarks: true,
            maxFaces: 1
        };
        
        state.faceAnimationModel = await faceLandmarksDetection.createDetector(model, detectorConfig);
        console.log('✅ Modelo de IA facial cargado (TensorFlow.js)');
        
        // Iniciar detección y animación
        startFaceAnimation();
    } catch (error) {
        console.warn('⚠️ TensorFlow.js no disponible, usando animación alternativa:', error);
        // Esperar un poco y reintentar, o usar básica
        setTimeout(() => {
            if (!state.faceAnimationModel) {
                initializeBasicFaceAnimation();
            }
        }, 2000);
    }
}

function initializeBasicFaceAnimation() {
    // Animación básica usando transformaciones CSS y canvas
    console.log('✅ Usando animación facial básica');
    startBasicFaceAnimation();
}

function startFaceAnimation() {
    if (!state.avatarCanvas || !state.faceImage || !state.faceAnimationModel) {
        initializeBasicFaceAnimation();
        return;
    }
    
    let lastTime = 0;
    
    const animate = async (currentTime) => {
        if (currentTime - lastTime < 33) { // ~30 FPS
            state.animationFrame = requestAnimationFrame(animate);
            return;
        }
        lastTime = currentTime;
        
        const ctx = state.avatarCtx;
        const canvas = state.avatarCanvas;
        const img = state.faceImage;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Detectar landmarks faciales
        try {
            const faces = await state.faceAnimationModel.estimateFaces(img, {
                flipHorizontal: false,
                staticImageMode: false
            });
            
            if (faces.length > 0) {
                const face = faces[0];
                state.faceLandmarks = face.keypoints;
                
                // Dibujar cara con animación basada en landmarks
                drawAnimatedFace(ctx, img, face);
            } else {
                // Si no detecta cara, dibujar imagen normal
                drawStaticFace(ctx, img);
            }
        } catch (error) {
            console.warn('Error en detección facial:', error);
            drawStaticFace(ctx, img);
        }
        
        state.animationFrame = requestAnimationFrame(animate);
    };
    
    state.animationFrame = requestAnimationFrame(animate);
}

function startBasicFaceAnimation() {
    if (!state.avatarCanvas || !state.faceImage) return;
    
    let lastTime = 0;
    let mouthOpenness = 0;
    let eyeBlink = 0;
    let headTilt = 0;
    
    const animate = (currentTime) => {
        if (currentTime - lastTime < 33) {
            state.animationFrame = requestAnimationFrame(animate);
            return;
        }
        lastTime = currentTime;
        
        const ctx = state.avatarCtx;
        const canvas = state.avatarCanvas;
        const img = state.faceImage;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calcular animaciones basadas en si está hablando
        if (state.aiPresenterActive) {
            // Animación de boca al hablar
            mouthOpenness = 0.3 + Math.sin(currentTime / 100) * 0.2;
            headTilt = Math.sin(currentTime / 500) * 2; // Movimiento sutil de cabeza
        } else {
            mouthOpenness = 0;
            headTilt = 0;
        }
        
        // Parpadeo ocasional
        if (Math.random() > 0.98) {
            eyeBlink = 0.3;
        } else {
            eyeBlink *= 0.9;
        }
        
        // Dibujar cara con transformaciones
        ctx.save();
        
        // Aplicar transformaciones
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(headTilt * Math.PI / 180);
        ctx.scale(1 + mouthOpenness * 0.1, 1 + mouthOpenness * 0.05);
        
        // Dibujar imagen
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        
        // Aplicar efecto de parpadeo
        if (eyeBlink > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${eyeBlink})`;
            ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height / 3);
        }
        
        ctx.restore();
        
        state.animationFrame = requestAnimationFrame(animate);
    };
    
    state.animationFrame = requestAnimationFrame(animate);
}

function drawAnimatedFace(ctx, img, face) {
    const canvas = state.avatarCanvas;
    const landmarks = face.keypoints || face.landmarks;
    
    if (!landmarks || landmarks.length === 0) {
        drawStaticFace(ctx, img);
        return;
    }
    
    // Encontrar puntos clave (índices aproximados de MediaPipe)
    const leftEye = landmarks[33] || landmarks[0];
    const rightEye = landmarks[263] || landmarks[1];
    const mouth = landmarks[13] || landmarks[2];
    
    // Calcular transformaciones basadas en landmarks
    const eyeDistance = Math.abs((leftEye.x || leftEye[0]) - (rightEye.x || rightEye[0]));
    const faceCenterX = ((leftEye.x || leftEye[0]) + (rightEye.x || rightEye[0])) / 2;
    const faceCenterY = ((leftEye.y || leftEye[1]) + (rightEye.y || rightEye[1])) / 2;
    
    // Animación de boca si está hablando
    let mouthScale = 1;
    let headTilt = 0;
    if (state.aiPresenterActive) {
        mouthScale = 1 + Math.sin(Date.now() / 100) * 0.15;
        headTilt = Math.sin(Date.now() / 500) * 2; // Movimiento sutil de cabeza
    }
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(headTilt * Math.PI / 180);
    
    // Escalar y posicionar si tenemos landmarks válidos
    if (eyeDistance > 0) {
        const scale = canvas.width / (eyeDistance * 2.5);
        ctx.scale(scale, scale);
        ctx.translate(-faceCenterX, -faceCenterY);
    }
    
    // Dibujar imagen base
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Aplicar animación de boca con transformación
    if (state.aiPresenterActive && mouth) {
        const mouthX = mouth.x || mouth[0] || canvas.width / 2;
        const mouthY = mouth.y || mouth[1] || canvas.height * 0.6;
        
        ctx.save();
        ctx.translate(mouthX, mouthY);
        ctx.scale(mouthScale, mouthScale);
        ctx.translate(-mouthX, -mouthY);
        
        // Redibujar área de boca con escala aplicada
        const mouthSize = 30;
        const mouthRegion = ctx.getImageData(mouthX - mouthSize, mouthY - mouthSize/2, mouthSize * 2, mouthSize);
        ctx.putImageData(mouthRegion, mouthX - mouthSize, mouthY - mouthSize/2);
        ctx.restore();
    }
    
    ctx.restore();
}

function drawStaticFace(ctx, img) {
    const canvas = state.avatarCanvas;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function animateMouthWhileSpeaking(duration) {
    const mouthOverlay = document.getElementById('avatarMouth');
    if (!mouthOverlay) return;
    
    // Activar animación de boca
    mouthOverlay.classList.add('speaking');
    
    // Detener después de la duración
    setTimeout(() => {
        stopMouthAnimation();
    }, duration);
}

function stopMouthAnimation() {
    const mouthOverlay = document.getElementById('avatarMouth');
    if (mouthOverlay) {
        mouthOverlay.classList.remove('speaking');
    }
}

// Sincronizar boca con eventos de speech
function setupMouthSync() {
    if ('speechSynthesis' in window) {
        // Interceptar eventos de speech para sincronización más precisa
        const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function(utterance) {
            const mouthOverlay = document.getElementById('avatarMouth');
            
            utterance.onstart = function() {
                if (mouthOverlay) {
                    mouthOverlay.classList.add('speaking');
                }
            };
            
            utterance.onend = function() {
                if (mouthOverlay) {
                    mouthOverlay.classList.remove('speaking');
                }
            };
            
            utterance.onerror = function() {
                if (mouthOverlay) {
                    mouthOverlay.classList.remove('speaking');
                }
            };
            
            return originalSpeak(utterance);
        };
    }
}

// ============================================
// INTEGRACIÓN CON YOUTUBE LIVE CHAT (ELIMINADO)
// ============================================

// Configuración de YouTube Live Chat
const YOUTUBE_CONFIG = {
    // Para usar la API real, necesitas:
    // 1. Crear un proyecto en Google Cloud Console
    // 2. Habilitar YouTube Data API v3
    // 3. Crear credenciales OAuth2
    // 4. Obtener el liveChatId del video en vivo
    apiKey: '', // Tu API Key de YouTube
    liveChatId: '', // ID del chat en vivo (se obtiene de la API)
    videoId: '', // ID del video en vivo
    pollInterval: 5000 // Intervalo para obtener nuevos mensajes (ms)
};

function initializeYouTubeChat() {
    const chatStatusEl = document.getElementById('chatStatus');
    chatStatusEl.textContent = 'Conectando...';
    chatStatusEl.classList.remove('connected');
    
    // Intentar conectar con la API real si está configurada
    if (YOUTUBE_CONFIG.apiKey && YOUTUBE_CONFIG.liveChatId) {
        connectToYouTubeChat();
    } else {
        // Modo simulación para desarrollo
        console.log('⚠️ YouTube Chat en modo simulación. Configura YOUTUBE_CONFIG para usar la API real.');
        setTimeout(() => {
            chatStatusEl.textContent = 'Modo Simulación';
            chatStatusEl.classList.add('connected');
            simulateChatMessages();
        }, 2000);
    }
}

async function connectToYouTubeChat() {
    try {
        // Obtener el liveChatId si no está configurado
        if (!YOUTUBE_CONFIG.liveChatId && YOUTUBE_CONFIG.videoId) {
            const liveChatId = await getLiveChatId(YOUTUBE_CONFIG.videoId);
            if (liveChatId) {
                YOUTUBE_CONFIG.liveChatId = liveChatId;
            }
        }
        
        if (YOUTUBE_CONFIG.liveChatId) {
            // Iniciar polling de mensajes
            pollChatMessages();
            
            const chatStatusEl = document.getElementById('chatStatus');
            chatStatusEl.textContent = 'Conectado';
            chatStatusEl.classList.add('connected');
        }
    } catch (error) {
        console.error('Error conectando a YouTube Chat:', error);
        const chatStatusEl = document.getElementById('chatStatus');
        chatStatusEl.textContent = 'Error de conexión';
        chatStatusEl.classList.remove('connected');
        
        // Fallback a simulación
        simulateChatMessages();
    }
}

async function getLiveChatId(videoId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_CONFIG.apiKey}`
        );
        const data = await response.json();
        
        if (data.items && data.items[0] && data.items[0].liveStreamingDetails) {
            return data.items[0].liveStreamingDetails.activeLiveChatId;
        }
    } catch (error) {
        console.error('Error obteniendo liveChatId:', error);
    }
    return null;
}

let nextPageToken = null;

async function pollChatMessages() {
    if (!YOUTUBE_CONFIG.liveChatId || !YOUTUBE_CONFIG.apiKey) return;
    
    try {
        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${YOUTUBE_CONFIG.liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_CONFIG.apiKey}`;
        
        if (nextPageToken) {
            url += `&pageToken=${nextPageToken}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items) {
            data.items.forEach(item => {
                const author = item.authorDetails.displayName;
                const text = item.snippet.displayMessage;
                if (author && text) {
                    addChatMessage(author, text);
                }
            });
            
            nextPageToken = data.nextPageToken;
            
            // Calcular tiempo hasta el próximo polling
            const pollInterval = data.pollingIntervalMillis || YOUTUBE_CONFIG.pollInterval;
            setTimeout(pollChatMessages, pollInterval);
        }
    } catch (error) {
        console.error('Error obteniendo mensajes del chat:', error);
        // Reintentar después de 5 segundos
        setTimeout(pollChatMessages, 5000);
    }
}

function simulateChatMessages() {
    // Simular mensajes cada 5-10 segundos
    setInterval(() => {
        if (Math.random() > 0.5) {
            const messages = [
                { author: 'Usuario123', text: '¡Qué genial este rastreador!' },
                { author: 'Navidad2025', text: 'Ya falta poco para el Año Nuevo 🎆' },
                { author: 'Celebración', text: '¡Feliz Año Nuevo a todos!' },
                { author: 'Mundo', text: 'Increíble ver cómo avanza por el mundo' },
                { author: 'Tiempo', text: 'El tiempo vuela, ¡ya casi!' }
            ];
            
            const message = messages[Math.floor(Math.random() * messages.length)];
            addChatMessage(message.author, message.text);
        }
    }, 8000);
}

function addChatMessage(author, text) {
    const chatMessagesEl = document.getElementById('chatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    
    messageEl.innerHTML = `
        <span class="chat-message-author">${escapeHtml(author)}:</span>
        <span class="chat-message-text">${escapeHtml(text)}</span>
    `;
    
    chatMessagesEl.appendChild(messageEl);
    
    // Mantener solo los últimos 50 mensajes
    while (chatMessagesEl.children.length > 50) {
        chatMessagesEl.removeChild(chatMessagesEl.firstChild);
    }
    
    // Auto-scroll al final
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// ACTUALIZACIÓN PRINCIPAL
// ============================================

function updateAll() {
    updateTimeDisplay();
    updateCountdown();
    // updateWorldMap se llama cada 5 segundos por separado
}

// ============================================
// UTILIDADES
// ============================================

// Función para obtener el año nuevo objetivo
function getTargetNewYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    
    // Si ya pasó el 1 de enero, esperar el próximo año
    if (currentMonth > 0 || (currentMonth === 0 && currentDate > 1)) {
        return currentYear + 1;
    }
    
    // Si es antes del 1 de enero, esperar el año actual
    return currentYear;
}
