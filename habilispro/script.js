/* ============================================
   CENTRO DE CONTROL - PAPÁ NOEL
   Script principal del overlay
   ============================================ */

// ============================================
// CONFIGURACIÓN - MODIFICAR AQUÍ DURANTE EL VIVO
// ============================================

const CONFIG = {
    // Ubicación actual (editar manualmente durante el stream)
    currentLocation: 'Rovaniemi, Finlandia',
    
    // Zona horaria de la ubicación actual (formato: 'Europe/Helsinki')
    // Lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    timezone: 'Europe/Helsinki',
    
    // Velocidad inicial del trineo (km/h)
    initialSpeed: 850,
    
    // Regalos entregados iniciales
    initialGifts: 0,
    
    // Estado inicial del trineo: 'ok', 'warning', 'error'
    initialStatus: 'ok',
    
    // Intervalo para mostrar eventos automáticamente (en minutos)
    autoEventInterval: 3,
    
    // Velocidad de incremento de regalos (por segundo)
    giftsPerSecond: 0.5,
    
    // Variación de velocidad (porcentaje de cambio aleatorio)
    speedVariation: 0.05, // 5% de variación
};

// ============================================
// BASE DE DATOS DE EVENTOS
// ============================================

const EVENTS_DATABASE = [
    // Eventos Técnicos
    { type: 'technical', text: 'Sistema de navegación GPS operativo' },
    { type: 'technical', text: 'Revisión de motores completada' },
    { type: 'technical', text: 'Optimización de ruta en curso' },
    { type: 'technical', text: 'Sistema de comunicación estable' },
    { type: 'technical', text: 'Actualización de firmware completada' },
    { type: 'technical', text: 'Diagnóstico de sistemas: Todo OK' },
    
    // Eventos de Clima
    { type: 'weather', text: 'Condiciones climáticas favorables' },
    { type: 'weather', text: 'Viento a favor detectado' },
    { type: 'weather', text: 'Nieve ligera en la ruta' },
    { type: 'weather', text: 'Visibilidad excelente' },
    { type: 'weather', text: 'Temperatura óptima para el viaje' },
    { type: 'weather', text: 'Tormenta de nieve leve en la zona' },
    { type: 'weather', text: 'Aurora boreal avistada' },
    
    // Eventos Narrativos
    { type: 'narrative', text: 'Avistamiento de renos en el horizonte' },
    { type: 'narrative', text: 'Niños avistados en las ventanas' },
    { type: 'narrative', text: 'Chimeneas encendidas detectadas' },
    { type: 'narrative', text: 'Árboles de Navidad iluminados' },
    { type: 'narrative', text: 'Villancicos escuchados a distancia' },
    { type: 'narrative', text: 'Entrega especial completada' },
    { type: 'narrative', text: 'Zona de alta densidad de niños' },
    
    // Eventos de Humor
    { type: 'humor', text: 'Rudolph está de buen humor hoy' },
    { type: 'humor', text: 'Los elfos reportan: Todo bajo control' },
    { type: 'humor', text: 'Cookie detectada en el trineo' },
    { type: 'humor', text: 'Rudolph haciendo acrobacias' },
    { type: 'humor', text: 'Sistema anti-gravedad funcionando perfecto' },
    { type: 'humor', text: 'Los renos están sincronizados' },
    { type: 'humor', text: 'Papá Noel está en forma' },
];

// ============================================
// ESTADO GLOBAL
// ============================================

const state = {
    location: CONFIG.currentLocation,
    speed: CONFIG.initialSpeed,
    gifts: CONFIG.initialGifts,
    status: CONFIG.initialStatus,
    events: [],
    lastEventTime: Date.now(),
    autoEventTimer: null,
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Formatea un número con separadores de miles
 */
function formatNumber(num) {
    return Math.floor(num).toLocaleString('es-ES');
}

/**
 * Obtiene la hora local de la zona horaria configurada
 */
function getLocalTime() {
    try {
        const now = new Date();
        const options = {
            timeZone: CONFIG.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return now.toLocaleTimeString('es-ES', options);
    } catch (error) {
        // Fallback si la zona horaria no es válida
        return new Date().toLocaleTimeString('es-ES', { hour12: false });
    }
}

/**
 * Genera una velocidad aleatoria dentro del rango de variación
 */
function generateSpeed() {
    const baseSpeed = CONFIG.initialSpeed;
    const variation = baseSpeed * CONFIG.speedVariation;
    const randomVariation = (Math.random() * 2 - 1) * variation; // -variation a +variation
    return Math.max(100, baseSpeed + randomVariation); // Mínimo 100 km/h
}

/**
 * Obtiene el icono según el tipo de evento
 */
function getEventIcon(type) {
    const icons = {
        technical: '⚙️',
        weather: '🌨️',
        narrative: '📖',
        humor: '😄'
    };
    return icons[type] || '📡';
}

// ============================================
// FUNCIONES DE ACTUALIZACIÓN DE UI
// ============================================

/**
 * Actualiza la ubicación mostrada
 */
function updateLocation() {
    const element = document.getElementById('currentLocation');
    if (element) {
        element.textContent = state.location;
    }
}

/**
 * Actualiza la hora local
 */
function updateTime() {
    const element = document.getElementById('localTime');
    if (element) {
        element.textContent = getLocalTime();
    }
}

/**
 * Actualiza la velocidad del trineo
 */
function updateSpeed() {
    const element = document.getElementById('sleighSpeed');
    if (element) {
        state.speed = generateSpeed();
        element.textContent = `${formatNumber(state.speed)} km/h`;
    }
}

/**
 * Actualiza el contador de regalos
 */
function updateGifts() {
    const element = document.getElementById('giftsDelivered');
    if (element) {
        state.gifts += CONFIG.giftsPerSecond;
        element.textContent = formatNumber(state.gifts);
    }
}

/**
 * Actualiza el estado del trineo
 */
function updateStatus() {
    const dotElement = document.getElementById('statusDot');
    const textElement = document.getElementById('statusText');
    
    if (dotElement && textElement) {
        // Remover clases anteriores
        dotElement.classList.remove('warning', 'error');
        
        // Aplicar nueva clase y texto según el estado
        switch (state.status) {
            case 'warning':
                dotElement.classList.add('warning');
                textElement.textContent = 'Atención';
                break;
            case 'error':
                dotElement.classList.add('error');
                textElement.textContent = 'En Reparación';
                break;
            default:
                textElement.textContent = 'OK';
        }
    }
}

/**
 * Agrega un evento a la lista
 */
function addEventToHistory(event) {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    const eventItem = document.createElement('div');
    eventItem.className = `event-item ${event.type}`;
    
    const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    eventItem.innerHTML = `
        <span class="event-time">[${time}]</span>
        <span class="event-text">${event.text}</span>
    `;
    
    // Insertar al inicio de la lista
    eventsList.insertBefore(eventItem, eventsList.firstChild);
    
    // Mantener máximo 10 eventos visibles
    while (eventsList.children.length > 10) {
        eventsList.removeChild(eventsList.lastChild);
    }
    
    // Guardar en el estado
    state.events.unshift(event);
    if (state.events.length > 50) {
        state.events.pop(); // Mantener máximo 50 en memoria
    }
}

/**
 * Muestra una notificación de evento
 */
function showEventNotification(event) {
    const notification = document.getElementById('eventNotification');
    const icon = document.getElementById('notificationIcon');
    const text = document.getElementById('notificationText');
    
    if (!notification || !icon || !text) return;
    
    // Configurar contenido
    icon.textContent = getEventIcon(event.type);
    text.textContent = event.text;
    
    // Mostrar notificación
    notification.classList.add('show');
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ============================================
// FUNCIONES DE EVENTOS
// ============================================

/**
 * Obtiene un evento aleatorio de la base de datos
 */
function getRandomEvent() {
    const randomIndex = Math.floor(Math.random() * EVENTS_DATABASE.length);
    return EVENTS_DATABASE[randomIndex];
}

/**
 * Dispara un evento (puede ser llamado manualmente desde consola)
 */
function triggerEvent(customEvent = null) {
    const event = customEvent || getRandomEvent();
    
    // Agregar a la historia
    addEventToHistory(event);
    
    // Mostrar notificación
    showEventNotification(event);
    
    // Actualizar tiempo del último evento
    state.lastEventTime = Date.now();
    
    return event;
}

/**
 * Inicia el sistema de eventos automáticos
 */
function startAutoEvents() {
    // Limpiar timer anterior si existe
    if (state.autoEventTimer) {
        clearInterval(state.autoEventTimer);
    }
    
    // Configurar intervalo (convertir minutos a milisegundos)
    const intervalMs = CONFIG.autoEventInterval * 60 * 1000;
    
    state.autoEventTimer = setInterval(() => {
        triggerEvent();
    }, intervalMs);
    
    console.log(`✅ Eventos automáticos iniciados (cada ${CONFIG.autoEventInterval} minutos)`);
}

/**
 * Detiene el sistema de eventos automáticos
 */
function stopAutoEvents() {
    if (state.autoEventTimer) {
        clearInterval(state.autoEventTimer);
        state.autoEventTimer = null;
        console.log('⏸️ Eventos automáticos detenidos');
    }
}

// ============================================
// FUNCIONES DE CONTROL MANUAL
// ============================================

/**
 * Cambia la ubicación actual (llamar desde consola: changeLocation('Nueva Ciudad'))
 */
function changeLocation(newLocation) {
    if (typeof newLocation !== 'string' || newLocation.trim() === '') {
        console.error('❌ Debe proporcionar un nombre de ciudad válido');
        return;
    }
    
    state.location = newLocation.trim();
    updateLocation();
    console.log(`📍 Ubicación cambiada a: ${state.location}`);
}

/**
 * Cambia el estado del trineo (llamar desde consola: changeStatus('warning'))
 */
function changeStatus(newStatus) {
    const validStatuses = ['ok', 'warning', 'error'];
    if (!validStatuses.includes(newStatus)) {
        console.error(`❌ Estado inválido. Use: ${validStatuses.join(', ')}`);
        return;
    }
    
    state.status = newStatus;
    updateStatus();
    console.log(`🔧 Estado cambiado a: ${newStatus}`);
}

/**
 * Establece el número de regalos (llamar desde consola: setGifts(15000))
 */
function setGifts(count) {
    const num = parseInt(count);
    if (isNaN(num) || num < 0) {
        console.error('❌ Debe proporcionar un número válido');
        return;
    }
    
    state.gifts = num;
    updateGifts();
    console.log(`🎁 Regalos establecidos en: ${formatNumber(state.gifts)}`);
}

/**
 * Establece la velocidad base (llamar desde consola: setSpeed(900))
 */
function setSpeed(kmh) {
    const num = parseFloat(kmh);
    if (isNaN(num) || num < 0) {
        console.error('❌ Debe proporcionar un número válido');
        return;
    }
    
    CONFIG.initialSpeed = num;
    console.log(`⚡ Velocidad base establecida en: ${formatNumber(num)} km/h`);
}

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa el sistema completo
 */
function init() {
    console.log('🎅 Iniciando Centro de Control de Papá Noel...');
    
    // Actualizar UI inicial
    updateLocation();
    updateTime();
    updateSpeed();
    updateGifts();
    updateStatus();
    
    // Actualizar hora cada segundo
    setInterval(updateTime, 1000);
    
    // Actualizar velocidad cada 3 segundos
    setInterval(updateSpeed, 3000);
    
    // Actualizar regalos cada segundo
    setInterval(updateGifts, 1000);
    
    // Iniciar eventos automáticos
    startAutoEvents();
    
    // Disparar un evento inicial después de 5 segundos
    setTimeout(() => {
        triggerEvent();
    }, 5000);
    
    console.log('✅ Sistema iniciado correctamente');
    console.log('');
    console.log('📝 FUNCIONES DISPONIBLES EN CONSOLA:');
    console.log('  - triggerEvent() - Dispara un evento aleatorio');
    console.log('  - changeLocation("Ciudad") - Cambia la ubicación');
    console.log('  - changeStatus("ok"|"warning"|"error") - Cambia el estado');
    console.log('  - setGifts(15000) - Establece regalos entregados');
    console.log('  - setSpeed(900) - Establece velocidad base');
    console.log('  - startAutoEvents() - Inicia eventos automáticos');
    console.log('  - stopAutoEvents() - Detiene eventos automáticos');
    console.log('');
}

// ============================================
// INICIO AUTOMÁTICO
// ============================================

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// EXPORTAR FUNCIONES PARA USO EN CONSOLA
// ============================================

// Hacer funciones disponibles globalmente para uso en consola del navegador
window.triggerEvent = triggerEvent;
window.changeLocation = changeLocation;
window.changeStatus = changeStatus;
window.setGifts = setGifts;
window.setSpeed = setSpeed;
window.startAutoEvents = startAutoEvents;
window.stopAutoEvents = stopAutoEvents;
