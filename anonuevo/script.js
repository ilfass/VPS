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
    celebrationLights: []
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎆 Inicializando Año Nuevo Global 2025');
    
    // Detectar zona horaria del usuario
    detectUserTimezone();
    
    // Inicializar globo terráqueo 3D
    initializeGlobe();
    
    initializeWorldMap();
    initializeTimeDisplay();
    initializeCountdown();
    initializeVoiceSystem();
    initializeVisualEffects();
    initializeBackgroundAudio();
    initializeYouTubeChat();
    
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
// GLOBO TERRÁQUEO 3D
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
    
    // Usar textura de la Tierra desde una URL pública
    // Textura de alta calidad de la NASA
    const earthTexture = textureLoader.load(
        'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
        () => {
            console.log('✅ Textura de la Tierra cargada');
        },
        undefined,
        (err) => {
            console.warn('⚠️ No se pudo cargar textura de la Tierra, usando material procedural:', err);
            // Fallback a material procedural mejorado
            createProceduralEarth();
        }
    );
    
    // Crear material con textura realista
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 10,
        specular: 0x222222,
        emissive: 0x000000,
        transparent: false
    });
    
    // Crear malla del globo
    state.globeMesh = new THREE.Mesh(geometry, material);
    state.globeMesh.receiveShadow = true;
    state.globeMesh.castShadow = true;
    state.globeScene.add(state.globeMesh);
    
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
    
    // Iluminación principal (simula el sol)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    state.globeScene.add(sunLight);
    
    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    state.globeScene.add(ambientLight);
    
    // Luz de relleno para el lado oscuro
    const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
    fillLight.position.set(-3, -2, -2);
    state.globeScene.add(fillLight);
    
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
    
    console.log('🌍 Globo terráqueo 3D inicializado con textura real');
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

function animateGlobe() {
    if (!state.globeMesh || !state.globeRenderer || !state.globeScene || !state.globeCamera) return;
    
    // Rotar el globo lentamente (una rotación completa cada ~52 minutos)
    state.globeMesh.rotation.y += 0.002;
    
    // Rotar la luz del sol para simular día/noche
    const time = Date.now() * 0.0001;
    if (state.globeScene.children) {
        state.globeScene.children.forEach(child => {
            if (child.type === 'DirectionalLight' && child.position.x > 0) {
                // Rotar la luz del sol alrededor del globo
                child.position.x = Math.cos(time) * 5;
                child.position.z = Math.sin(time) * 5;
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
    
    // Limpiar SVG
    svg.innerHTML = '';
    
    // Crear franjas horarias aproximadas
    // Nota: Esta es una simplificación visual. En producción, usarías datos geográficos reales
    TIMEZONES.forEach((tz, index) => {
        const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const x = (index / TIMEZONES.length) * 1440;
        const width = 1440 / TIMEZONES.length;
        
        zone.setAttribute('class', 'timezone-zone');
        zone.setAttribute('data-offset', tz.offset);
        zone.setAttribute('data-name', tz.name);
        zone.setAttribute('x', x);
        zone.setAttribute('y', 0);
        zone.setAttribute('width', width);
        zone.setAttribute('height', 720);
        zone.setAttribute('fill', 'rgba(30, 30, 60, 0.6)');
        
        // Agregar tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${tz.name} - ${tz.region}`;
        zone.appendChild(title);
        
        svg.appendChild(zone);
    });
    
    updateWorldMap();
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
                        console.log(`No se pudo reproducir ${track.id}:`, err);
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
// INTEGRACIÓN CON YOUTUBE LIVE CHAT
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
