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
    youtubeChat: null
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎆 Inicializando Año Nuevo Global 2025');
    
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
    
    console.log('✅ Inicialización completada');
});

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
// DISPLAY DE TIEMPO UTC
// ============================================

function initializeTimeDisplay() {
    updateTimeDisplay();
}

function updateTimeDisplay() {
    const now = new Date();
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

// Configuración de audio de fondo
const AUDIO_CONFIG = {
    // Para obtener el audio de YouTube Studio:
    // 1. Ve a https://studio.youtube.com/channel/UCDg4eJJdvNAX2az-Bi7aBkA/music
    // 2. Descarga el audio que quieras usar
    // 3. Colócalo en la carpeta del proyecto como 'background-audio.mp3'
    // 4. O usa una URL directa si está alojado en un servidor
    src: 'background-audio.mp3', // Cambiar por la ruta real del audio
    volume: 0.3, // Volumen (0.0 a 1.0)
    loop: true
};

function initializeBackgroundAudio() {
    const audioEl = document.getElementById('backgroundAudio');
    
    if (AUDIO_CONFIG.src) {
        audioEl.src = AUDIO_CONFIG.src;
        audioEl.volume = AUDIO_CONFIG.volume;
        audioEl.loop = AUDIO_CONFIG.loop;
        
        // Intentar reproducir cuando el usuario interactúe (requerido por los navegadores)
        const playAudio = () => {
            if (audioEl.paused && audioEl.src) {
                audioEl.play().catch(err => {
                    console.log('No se pudo reproducir audio automáticamente:', err);
                    console.log('El audio se reproducirá cuando el usuario interactúe con la página');
                });
            }
        };
        
        // Intentar reproducir después de la primera interacción
        document.addEventListener('click', playAudio, { once: true });
        document.addEventListener('touchstart', playAudio, { once: true });
        document.addEventListener('keydown', playAudio, { once: true });
        
        // También intentar después de un delay (algunos navegadores permiten esto)
        setTimeout(playAudio, 1000);
    } else {
        console.log('ℹ️ Audio de fondo no configurado. Configura AUDIO_CONFIG.src para agregar música de fondo.');
    }
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
