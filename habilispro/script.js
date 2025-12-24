/* ============================================
   CENTRO DE CONTROL - PAPÁ NOEL
   Script principal del overlay
   ============================================ */

// ============================================
// CONFIGURACIÓN - MODIFICAR AQUÍ DURANTE EL VIVO
// ============================================
// 
// NOTA: Este overlay está diseñado para superponerse sobre
// el Google Santa Tracker (https://santatracker.google.com/)
// en OBS. Sincroniza manualmente la ubicación viendo el tracker.
//

const CONFIG = {
    // Ubicación actual (editar manualmente durante el stream)
    // Sincronizar con lo que muestra el Google Santa Tracker
    currentLocation: 'Rovaniemi, Finlandia',
    
    // Zona horaria de la ubicación actual (formato: 'Europe/Helsinki')
    // Se actualiza automáticamente con syncLocation() o manualmente aquí
    // Lista completa: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    timezone: 'Europe/Helsinki',
    
    // Velocidad inicial del trineo (km/h)
    initialSpeed: 850,
    
    // Regalos entregados iniciales
    initialGifts: 0,
    
    // Estado inicial del trineo: 'ok', 'warning', 'error'
    initialStatus: 'ok',
    
    // Intervalo para mostrar eventos automáticamente (en minutos)
    autoEventInterval: 1.5, // Reducido para más frecuencia
    
    // Velocidad de incremento de regalos (por segundo)
    giftsPerSecond: 0.5,
    
    // Variación de velocidad (porcentaje de cambio aleatorio)
    speedVariation: 0.05, // 5% de variación
    
    // Intervalo para aparición de Papá Noel (en minutos)
    santaAppearanceInterval: 2.5, // Reducido para más frecuencia
    
    // Duración de la aparición (en segundos)
    santaAppearanceDuration: 8,
};

// ============================================
// BASE DE DATOS DE UBICACIONES COMUNES
// Para sincronización rápida con Google Santa Tracker
// ============================================

const LOCATIONS_DATABASE = {
    // Europa
    'Rovaniemi, Finlandia': 'Europe/Helsinki',
    'Moscú, Rusia': 'Europe/Moscow',
    'Londres, Reino Unido': 'Europe/London',
    'París, Francia': 'Europe/Paris',
    'Madrid, España': 'Europe/Madrid',
    'Roma, Italia': 'Europe/Rome',
    'Berlín, Alemania': 'Europe/Berlin',
    'Ámsterdam, Países Bajos': 'Europe/Amsterdam',
    'Estocolmo, Suecia': 'Europe/Stockholm',
    'Oslo, Noruega': 'Europe/Oslo',
    'Copenhague, Dinamarca': 'Europe/Copenhagen',
    'Viena, Austria': 'Europe/Vienna',
    'Atenas, Grecia': 'Europe/Athens',
    'Varsovia, Polonia': 'Europe/Warsaw',
    'Praga, República Checa': 'Europe/Prague',
    
    // América del Norte
    'Nueva York, USA': 'America/New_York',
    'Los Ángeles, USA': 'America/Los_Angeles',
    'Chicago, USA': 'America/Chicago',
    'México DF, México': 'America/Mexico_City',
    'Toronto, Canadá': 'America/Toronto',
    'Vancouver, Canadá': 'America/Vancouver',
    'Miami, USA': 'America/New_York',
    'Boston, USA': 'America/New_York',
    'Seattle, USA': 'America/Los_Angeles',
    'Denver, USA': 'America/Denver',
    
    // América del Sur
    'Buenos Aires, Argentina': 'America/Argentina/Buenos_Aires',
    'São Paulo, Brasil': 'America/Sao_Paulo',
    'Río de Janeiro, Brasil': 'America/Sao_Paulo',
    'Santiago, Chile': 'America/Santiago',
    'Lima, Perú': 'America/Lima',
    'Bogotá, Colombia': 'America/Bogota',
    'Caracas, Venezuela': 'America/Caracas',
    
    // Asia
    'Tokio, Japón': 'Asia/Tokyo',
    'Pekín, China': 'Asia/Shanghai',
    'Hong Kong': 'Asia/Hong_Kong',
    'Singapur': 'Asia/Singapore',
    'Bangkok, Tailandia': 'Asia/Bangkok',
    'Nueva Delhi, India': 'Asia/Kolkata',
    'Dubái, Emiratos Árabes': 'Asia/Dubai',
    'Seúl, Corea del Sur': 'Asia/Seoul',
    'Mumbai, India': 'Asia/Kolkata',
    
    // Oceanía
    'Sídney, Australia': 'Australia/Sydney',
    'Melbourne, Australia': 'Australia/Melbourne',
    'Auckland, Nueva Zelanda': 'Pacific/Auckland',
    
    // África
    'El Cairo, Egipto': 'Africa/Cairo',
    'Johannesburgo, Sudáfrica': 'Africa/Johannesburg',
    'Nairobi, Kenia': 'Africa/Nairobi',
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
    { type: 'humor', text: 'Los elfos están trabajando a toda velocidad' },
    { type: 'humor', text: 'Rudolph brilla más que nunca' },
    { type: 'humor', text: 'Papá Noel está en excelente forma física' },
    
    // Más Eventos Técnicos
    { type: 'technical', text: 'Sistema de carga de regalos optimizado' },
    { type: 'technical', text: 'Comunicación con base estable' },
    { type: 'technical', text: 'Ruta recalculada exitosamente' },
    { type: 'technical', text: 'Todos los sistemas operativos' },
    { type: 'technical', text: 'Velocidad de crucero alcanzada' },
    
    // Más Eventos de Clima
    { type: 'weather', text: 'Cielo despejado en la ruta' },
    { type: 'weather', text: 'Viento perfecto para el vuelo' },
    { type: 'weather', text: 'Condiciones ideales de vuelo' },
    { type: 'weather', text: 'Visibilidad perfecta' },
    { type: 'weather', text: 'Temperatura óptima para los renos' },
    
    // Más Eventos Narrativos
    { type: 'narrative', text: 'Ciudad iluminada con luces navideñas' },
    { type: 'narrative', text: 'Niños esperando en las ventanas' },
    { type: 'narrative', text: 'Árboles de Navidad decorados' },
    { type: 'narrative', text: 'Villancicos en el aire' },
    { type: 'narrative', text: 'Entrega especial en curso' },
    { type: 'narrative', text: 'Zona de alta actividad detectada' },
    { type: 'narrative', text: 'Chimeneas listas para la entrega' },
    { type: 'narrative', text: 'Regalos siendo preparados' },
];

// ============================================
// BASE DE DATOS DE MENSAJES DE PAPÁ NOEL
// ============================================

const SANTA_MESSAGES = [
    // Mensajes con referencia al canal
    {
        type: 'youtube',
        message: '¡Hola a todos! 🎅',
        subtitle: 'No olviden suscribirse a @fabiandeharo para más contenido navideño',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Feliz Navidad! 🎄',
        subtitle: 'Si te gusta este contenido, suscríbete a @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Gracias por acompañarme! 🎁',
        subtitle: 'Suscríbete a @fabiandeharo para no perderte nada',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Estoy entregando regalos! 🎅',
        subtitle: 'Mientras tanto, suscríbete a @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Qué gran comunidad! ❤️',
        subtitle: 'Únete a @fabiandeharo y activa la campanita 🔔',
        includeNames: false
    },
    // Mensajes con saludos a usuarios del chat
    {
        type: 'greeting',
        message: '¡Hola {names}! 🎅',
        subtitle: '¡Gracias por estar aquí! No olviden suscribirse a @fabiandeharo',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    {
        type: 'greeting',
        message: '¡Saludos especiales a {names}! 🎄',
        subtitle: '¡Feliz Navidad! Suscríbete a @fabiandeharo para más sorpresas',
        includeNames: true,
        minNames: 2,
        maxNames: 4
    },
    {
        type: 'greeting',
        message: '¡Un abrazo navideño para {names}! 🎁',
        subtitle: '¡Gracias por seguir el viaje! @fabiandeharo en YouTube',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, ustedes son increíbles! ❤️',
        subtitle: 'Suscríbete a @fabiandeharo y activa las notificaciones 🔔',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    // Mensajes generales
    {
        type: 'general',
        message: '¡Sigo mi ruta alrededor del mundo! 🌍',
        subtitle: 'Acompáñame y suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'general',
        message: '¡Millones de regalos por entregar! 🎅',
        subtitle: '¡Qué noche tan especial! @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'general',
        message: '¡Los renos están volando perfecto! 🦌',
        subtitle: '¡Gracias por seguir el viaje! Suscríbete a @fabiandeharo',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN ESPAÑA
    // ============================================
    {
        type: 'country',
        message: '¡Feliz Navidad desde España! 🇪🇸',
        subtitle: 'Aquí celebramos con turrones y cava. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Nochebuena en España! 🎄',
        subtitle: 'Las familias se reúnen para la cena. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Los Reyes Magos están llegando! 👑',
        subtitle: 'En España celebramos el 6 de enero. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Madrid! 🏛️',
        subtitle: 'Luces navideñas iluminan las calles. @fabiandeharo',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN SUDAMÉRICA
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en Argentina! 🇦🇷',
        subtitle: 'Celebramos con asado y pan dulce. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Brasil! 🇧🇷',
        subtitle: 'Aquí es verano, pero el espíritu navideño está presente. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Chile! 🇨🇱',
        subtitle: 'Las familias se reúnen para la cena de Nochebuena. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Colombia! 🇨🇴',
        subtitle: 'Celebramos con natilla y buñuelos. ¡@fabiandeharo en YouTube!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Perú! 🇵🇪',
        subtitle: 'Panetón y chocolate caliente. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Venezuela! 🇻🇪',
        subtitle: 'Hallacas y pan de jamón en cada mesa. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Uruguay! 🇺🇾',
        subtitle: 'Celebramos con fuegos artificiales. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Paraguay! 🇵🇾',
        subtitle: 'Chipa y sopa paraguaya. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Ecuador! 🇪🇨',
        subtitle: 'Pristiños y buñuelos navideños. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Bolivia! 🇧🇴',
        subtitle: 'Picana y panetón en cada hogar. @fabiandeharo',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN CENTROAMÉRICA
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en México! 🇲🇽',
        subtitle: 'Posadas, piñatas y tamales. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Guatemala! 🇬🇹',
        subtitle: 'Celebramos con tamales y ponche. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Costa Rica! 🇨🇷',
        subtitle: 'Tamales y rompope en cada mesa. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Panamá! 🇵🇦',
        subtitle: 'Celebramos con arroz con guandú. ¡@fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Honduras! 🇭🇳',
        subtitle: 'Torrejas y ponche navideño. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en El Salvador! 🇸🇻',
        subtitle: 'Tamales y panes con pollo. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Nicaragua! 🇳🇮',
        subtitle: 'Nacatamales y cajeta de coco. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en República Dominicana! 🇩🇴',
        subtitle: 'Cerdo asado y pasteles en hoja. @fabiandeharo',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN OTROS PAÍSES
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en Estados Unidos! 🇺🇸',
        subtitle: 'Cookies para Santa y decoraciones. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Italia! 🇮🇹',
        subtitle: 'Panettone y cena de Nochebuena. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Francia! 🇫🇷',
        subtitle: 'Bûche de Noël y foie gras. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Alemania! 🇩🇪',
        subtitle: 'Mercados navideños y stollen. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Japón! 🇯🇵',
        subtitle: 'KFC y pasteles de Navidad. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Australia! 🇦🇺',
        subtitle: 'Navidad en verano con barbacoas. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Finlandia! 🇫🇮',
        subtitle: 'La casa de Papá Noel está aquí. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    // ============================================
    // SALUDOS NAVIDEÑOS EN DIFERENTES IDIOMAS
    // ============================================
    {
        type: 'greeting',
        message: '¡Feliz Navidad! 🎄',
        subtitle: 'Que esta temporada esté llena de alegría. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Feliz Navidad y Próspero Año Nuevo! 🎅',
        subtitle: 'Deseos de paz y felicidad. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Felices Fiestas! 🎁',
        subtitle: 'Que la magia de la Navidad te acompañe. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Noche de Paz! ✨',
        subtitle: 'Que todos tengan una Navidad llena de amor. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Joyeux Noël! 🇫🇷',
        subtitle: 'Feliz Navidad desde Francia. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Buon Natale! 🇮🇹',
        subtitle: 'Feliz Navidad desde Italia. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Frohe Weihnachten! 🇩🇪',
        subtitle: 'Feliz Navidad desde Alemania. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Feliz Natal! 🇧🇷',
        subtitle: 'Feliz Navidad desde Brasil. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Merry Christmas! 🇺🇸',
        subtitle: 'Feliz Navidad desde Estados Unidos. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡God Jul! 🇸🇪',
        subtitle: 'Feliz Navidad desde Suecia. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Hyvää Joulua! 🇫🇮',
        subtitle: 'Feliz Navidad desde Finlandia. @fabiandeharo en YouTube',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡¡Feliz Navidad a todos!! 🎅🎄',
        subtitle: 'Que esta sea una temporada especial. Suscríbete a @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Que la paz y el amor reinen! ❤️',
        subtitle: 'Feliz Navidad para todos. @fabiandeharo',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Brindemos por la Navidad! 🥂',
        subtitle: 'Que todos tengan una noche mágica. ¡Suscríbete a @fabiandeharo!',
        includeNames: false
    },
    // ============================================
    // MENSAJES CON SALUDOS A USUARIOS + PAÍSES
    // ============================================
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde España! 🇪🇸',
        subtitle: 'Que disfruten de las tradiciones navideñas. @fabiandeharo',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, saludos desde Argentina! 🇦🇷',
        subtitle: '¡Feliz Navidad! Suscríbete a @fabiandeharo',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde México! 🇲🇽',
        subtitle: 'Que disfruten de las posadas. @fabiandeharo en YouTube',
        includeNames: true,
        minNames: 2,
        maxNames: 4
    },
    {
        type: 'greeting',
        message: '¡{names}, saludos navideños desde Colombia! 🇨🇴',
        subtitle: '¡Que tengan una Navidad llena de alegría! Suscríbete a @fabiandeharo',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde Chile! 🇨🇱',
        subtitle: 'Que disfruten de la cena navideña. @fabiandeharo',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
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
    // Interacción del público
    publicMessages: [],
    participants: new Set(),
    reactions: {
        likes: 0,
        cheers: 0,
        santa: 0
    },
    userCounter: 0,
    // Aparición de Papá Noel
    santaAppearanceTimer: null,
    lastSantaAppearance: 0,
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
 * Muestra una notificación de evento con efectos mejorados
 */
function showEventNotification(event) {
    const notification = document.getElementById('eventNotification');
    const icon = document.getElementById('notificationIcon');
    const text = document.getElementById('notificationText');
    const screenFlash = document.getElementById('screenFlash');
    
    if (!notification || !icon || !text) return;
    
    // Configurar contenido
    icon.textContent = getEventIcon(event.type);
    text.textContent = event.text;
    
    // Efecto de flash de pantalla completa
    if (screenFlash) {
        screenFlash.classList.add('flash');
        setTimeout(() => {
            screenFlash.classList.remove('flash');
        }, 600);
    }
    
    // Pequeño delay antes de mostrar la notificación para mayor impacto
    setTimeout(() => {
        // Mostrar notificación con animación
        notification.classList.add('show');
        
        // Efecto de vibración sutil en el icono
        if (icon) {
            icon.style.animation = 'none';
            setTimeout(() => {
                icon.style.animation = 'iconPulse 0.5s ease';
            }, 10);
        }
    }, 100);
    
    // Ocultar después de 5 segundos (aumentado para más visibilidad)
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
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
 * Sincroniza ubicación y zona horaria automáticamente
 * Busca en la base de datos de ubicaciones comunes
 * Uso: syncLocation('Nueva York, USA')
 */
function syncLocation(locationName) {
    if (typeof locationName !== 'string' || locationName.trim() === '') {
        console.error('❌ Debe proporcionar un nombre de ciudad válido');
        console.log('💡 Ubicaciones disponibles:');
        console.log(Object.keys(LOCATIONS_DATABASE).join(', '));
        return;
    }
    
    const location = locationName.trim();
    const timezone = LOCATIONS_DATABASE[location];
    
    if (timezone) {
        // Actualizar ubicación y zona horaria
        state.location = location;
        CONFIG.timezone = timezone;
        CONFIG.currentLocation = location;
        
        // Actualizar UI
        updateLocation();
        updateTime();
        
        console.log(`✅ Sincronizado: ${location} (${timezone})`);
        console.log(`🕐 Hora local actualizada automáticamente`);
    } else {
        console.warn(`⚠️ Ubicación "${location}" no encontrada en la base de datos`);
        console.log('💡 Usando solo changeLocation() y setTimezone() manualmente');
        console.log('💡 Ubicaciones disponibles:');
        console.log(Object.keys(LOCATIONS_DATABASE).slice(0, 10).join(', '), '...');
        
        // Cambiar solo la ubicación sin zona horaria
        changeLocation(location);
    }
}

/**
 * Establece la zona horaria manualmente
 * Uso: setTimezone('America/New_York')
 */
function setTimezone(timezone) {
    if (typeof timezone !== 'string' || timezone.trim() === '') {
        console.error('❌ Debe proporcionar una zona horaria válida');
        console.log('💡 Ejemplo: setTimezone("America/New_York")');
        return;
    }
    
    CONFIG.timezone = timezone.trim();
    updateTime();
    console.log(`🕐 Zona horaria cambiada a: ${CONFIG.timezone}`);
}

/**
 * Busca ubicaciones en la base de datos (útil para encontrar nombres exactos)
 * Uso: searchLocations('york')
 */
function searchLocations(query) {
    if (typeof query !== 'string' || query.trim() === '') {
        console.log('💡 Use: searchLocations("texto") para buscar ubicaciones');
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const matches = Object.keys(LOCATIONS_DATABASE).filter(loc => 
        loc.toLowerCase().includes(searchTerm)
    );
    
    if (matches.length > 0) {
        console.log(`🔍 Encontradas ${matches.length} ubicación(es):`);
        matches.forEach(loc => {
            console.log(`  - ${loc} (${LOCATIONS_DATABASE[loc]})`);
        });
    } else {
        console.log(`❌ No se encontraron ubicaciones con "${query}"`);
    }
    
    return matches;
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
// FUNCIONES DE INTERACCIÓN CON EL PÚBLICO
// ============================================

/**
 * Genera un ID único para el usuario
 */
function generateUserId() {
    state.userCounter++;
    return `Usuario${state.userCounter}`;
}

/**
 * Obtiene o crea un ID de usuario (almacenado en localStorage)
 */
function getUserId() {
    let userId = localStorage.getItem('santaTracker_userId');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('santaTracker_userId', userId);
    }
    return userId;
}

/**
 * Agrega un participante único
 */
function addParticipant() {
    const userId = getUserId();
    state.participants.add(userId);
    updateParticipantsCount();
}

/**
 * Actualiza el contador de participantes
 */
function updateParticipantsCount() {
    const element = document.getElementById('participantsCount');
    if (element) {
        element.textContent = state.participants.size;
    }
}

/**
 * Agrega un mensaje del público
 */
function addPublicMessage(text, author = null) {
    if (!text || text.trim() === '') return;
    
    const userId = author || getUserId();
    const message = {
        id: Date.now(),
        author: userId,
        text: text.trim(),
        time: new Date()
    };
    
    state.publicMessages.unshift(message);
    
    // Mantener máximo 50 mensajes
    if (state.publicMessages.length > 50) {
        state.publicMessages.pop();
    }
    
    // Agregar a la UI
    displayMessage(message);
    
    // Scroll al inicio
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = 0;
    }
    
    console.log(`💬 Mensaje de ${userId}: ${text}`);
}

/**
 * Muestra un mensaje en la lista
 */
function displayMessage(message) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';
    
    const time = message.time.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageItem.innerHTML = `
        <span class="message-author">${message.author}:</span>
        <span class="message-text">${message.text}</span>
        <span class="message-time">${time}</span>
    `;
    
    // Insertar al inicio
    messagesList.insertBefore(messageItem, messagesList.firstChild);
    
    // Mantener máximo 10 mensajes visibles
    while (messagesList.children.length > 10) {
        messagesList.removeChild(messagesList.lastChild);
    }
}

/**
 * Maneja el envío de mensaje
 */
function handleSendMessage() {
    const input = document.getElementById('userMessageInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (text === '') return;
    
    addPublicMessage(text);
    input.value = '';
    
    // Agregar participante
    addParticipant();
}

/**
 * Maneja las reacciones
 */
function handleReaction(type) {
    const userId = getUserId();
    const reactionKey = `${userId}_${type}`;
    
    // Verificar si ya reaccionó (usando sessionStorage para esta sesión)
    if (sessionStorage.getItem(reactionKey)) {
        console.log(`⚠️ Ya has reaccionado con ${type}`);
        return;
    }
    
    // Registrar reacción
    sessionStorage.setItem(reactionKey, 'true');
    state.reactions[type]++;
    
    // Actualizar UI
    updateReactionCount(type);
    
    // Efecto visual
    const btn = document.getElementById(`${type}Btn`);
    if (btn) {
        btn.classList.add('active');
        setTimeout(() => {
            btn.classList.remove('active');
        }, 500);
    }
    
    // Agregar participante
    addParticipant();
    
    // Mensaje automático según tipo
    const messages = {
        likes: '❤️ ¡Me encanta!',
        cheers: '👏 ¡Aplausos para Papá Noel!',
        santa: '🎅 ¡Vamos Papá Noel!'
    };
    
    if (messages[type]) {
        addPublicMessage(messages[type], 'Sistema');
    }
    
    console.log(`👍 Reacción ${type}: ${state.reactions[type]}`);
}

/**
 * Actualiza el contador de reacciones
 */
function updateReactionCount(type) {
    const element = document.getElementById(`${type}Count`);
    if (element) {
        element.textContent = state.reactions[type];
    }
}

/**
 * Inicializa los event listeners de interacción
 */
function initPublicInteraction() {
    // Botón enviar mensaje
    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }
    
    // Input de mensaje (Enter para enviar)
    const messageInput = document.getElementById('userMessageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
    }
    
    // Botones de reacción
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => handleReaction('likes'));
    }
    
    const cheerBtn = document.getElementById('cheerBtn');
    if (cheerBtn) {
        cheerBtn.addEventListener('click', () => handleReaction('cheers'));
    }
    
    const santaBtn = document.getElementById('santaBtn');
    if (santaBtn) {
        santaBtn.addEventListener('click', () => handleReaction('santa'));
    }
    
    // Agregar participante inicial
    addParticipant();
    
    // Mensaje de bienvenida
    setTimeout(() => {
        addPublicMessage('¡Bienvenido al Centro de Control de Papá Noel!', 'Sistema');
    }, 2000);
}

// ============================================
// FUNCIONES DE APARICIÓN DE PAPÁ NOEL
// ============================================

/**
 * Obtiene nombres aleatorios de usuarios del chat
 */
function getRandomChatNames(count = 3) {
    const uniqueNames = new Set();
    
    // Obtener nombres de los mensajes recientes
    state.publicMessages.forEach(msg => {
        if (msg.author && msg.author !== 'Sistema') {
            uniqueNames.add(msg.author);
        }
    });
    
    // Obtener nombres de participantes
    state.participants.forEach(name => {
        if (name !== 'Sistema') {
            uniqueNames.add(name);
        }
    });
    
    // Convertir a array y mezclar
    const namesArray = Array.from(uniqueNames);
    
    // Mezclar aleatoriamente
    for (let i = namesArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [namesArray[i], namesArray[j]] = [namesArray[j], namesArray[i]];
    }
    
    // Retornar la cantidad solicitada
    return namesArray.slice(0, count);
}

/**
 * Formatea nombres para el mensaje
 */
function formatNames(names) {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    
    // 3 o más nombres
    const last = names[names.length - 1];
    const rest = names.slice(0, -1).join(', ');
    return `${rest} y ${last}`;
}

/**
 * Genera un mensaje personalizado de Papá Noel
 */
function generateSantaMessage() {
    // Filtrar mensajes según si hay nombres disponibles
    const availableNames = getRandomChatNames(5);
    const hasNames = availableNames.length > 0;
    
    // Filtrar mensajes disponibles
    let availableMessages = SANTA_MESSAGES;
    
    if (!hasNames) {
        // Si no hay nombres, solo usar mensajes que no requieren nombres
        availableMessages = SANTA_MESSAGES.filter(msg => !msg.includeNames);
    }
    
    // Seleccionar mensaje aleatorio
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    const messageTemplate = availableMessages[randomIndex];
    
    // Procesar el mensaje
    let message = messageTemplate.message;
    let subtitle = messageTemplate.subtitle;
    
    // Si el mensaje requiere nombres y tenemos disponibles
    if (messageTemplate.includeNames && hasNames) {
        const nameCount = Math.min(
            Math.max(messageTemplate.minNames || 1, 1),
            Math.min(messageTemplate.maxNames || 3, availableNames.length)
        );
        const selectedNames = availableNames.slice(0, nameCount);
        const formattedNames = formatNames(selectedNames);
        message = message.replace('{names}', formattedNames);
    }
    
    return {
        message: message,
        subtitle: subtitle
    };
}

/**
 * Muestra la aparición grande de Papá Noel
 */
function showSantaAppearance() {
    const santaAppearance = document.getElementById('santaAppearance');
    const santaMessage = document.getElementById('santaMessage');
    const santaSubtitle = document.getElementById('santaSubtitle');
    
    if (!santaAppearance || !santaMessage || !santaSubtitle) return;
    
    // Generar mensaje personalizado
    const santaData = generateSantaMessage();
    
    // Configurar mensajes
    santaMessage.textContent = santaData.message;
    santaSubtitle.textContent = santaData.subtitle;
    
    // Mostrar aparición
    santaAppearance.classList.add('show');
    
    // Efecto de flash de pantalla
    const screenFlash = document.getElementById('screenFlash');
    if (screenFlash) {
        screenFlash.classList.add('flash');
        setTimeout(() => {
            screenFlash.classList.remove('flash');
        }, 600);
    }
    
    // Ocultar después de la duración configurada
    setTimeout(() => {
        santaAppearance.classList.remove('show');
    }, CONFIG.santaAppearanceDuration * 1000);
    
    console.log('🎅 Papá Noel aparece con mensaje:', santaData.message);
    state.lastSantaAppearance = Date.now();
}

/**
 * Inicia el sistema de apariciones automáticas de Papá Noel
 */
function startSantaAppearances() {
    // Limpiar timer anterior si existe
    if (state.santaAppearanceTimer) {
        clearInterval(state.santaAppearanceTimer);
    }
    
    // Configurar intervalo (convertir minutos a milisegundos)
    const intervalMs = CONFIG.santaAppearanceInterval * 60 * 1000;
    
    state.santaAppearanceTimer = setInterval(() => {
        showSantaAppearance();
    }, intervalMs);
    
    console.log(`🎅 Apariciones de Papá Noel iniciadas (cada ${CONFIG.santaAppearanceInterval} minutos)`);
}

/**
 * Detiene el sistema de apariciones automáticas
 */
function stopSantaAppearances() {
    if (state.santaAppearanceTimer) {
        clearInterval(state.santaAppearanceTimer);
        state.santaAppearanceTimer = null;
        console.log('⏸️ Apariciones de Papá Noel detenidas');
    }
}

/**
 * Dispara una aparición manual de Papá Noel (para usar desde consola)
 */
function triggerSantaAppearance() {
    showSantaAppearance();
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
    
    // Iniciar apariciones automáticas de Papá Noel
    startSantaAppearances();
    
    // Primera aparición después de 30 segundos (para dar tiempo a que haya usuarios)
    setTimeout(() => {
        showSantaAppearance();
    }, 30000);
    
    // Inicializar interacción del público
    initPublicInteraction();
    
    // Actualizar contadores de reacciones
    updateReactionCount('likes');
    updateReactionCount('cheers');
    updateReactionCount('santa');
    
    console.log('✅ Sistema iniciado correctamente');
    console.log('');
    console.log('🎯 SINCRONIZACIÓN CON GOOGLE SANTA TRACKER:');
    console.log('  - syncLocation("Nueva York, USA") - Sincroniza ubicación y zona horaria');
    console.log('  - searchLocations("york") - Busca ubicaciones disponibles');
    console.log('');
    console.log('📝 FUNCIONES DISPONIBLES EN CONSOLA:');
    console.log('  - triggerEvent() - Dispara un evento aleatorio');
    console.log('  - changeLocation("Ciudad") - Cambia solo la ubicación');
    console.log('  - syncLocation("Ciudad, País") - Cambia ubicación + zona horaria automáticamente');
    console.log('  - setTimezone("America/New_York") - Cambia zona horaria manualmente');
    console.log('  - changeStatus("ok"|"warning"|"error") - Cambia el estado');
    console.log('  - setGifts(15000) - Establece regalos entregados');
    console.log('  - setSpeed(900) - Establece velocidad base');
    console.log('  - startAutoEvents() - Inicia eventos automáticos');
    console.log('  - stopAutoEvents() - Detiene eventos automáticos');
    console.log('  - triggerSantaAppearance() - Dispara aparición de Papá Noel');
    console.log('  - startSantaAppearances() - Inicia apariciones automáticas');
    console.log('  - stopSantaAppearances() - Detiene apariciones automáticas');
    console.log('');
    console.log('💡 TIP: Mientras ves el Google Santa Tracker, usa syncLocation()');
    console.log('   para actualizar la ubicación y hora automáticamente.');
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
window.syncLocation = syncLocation;
window.setTimezone = setTimezone;
window.searchLocations = searchLocations;
window.changeStatus = changeStatus;
window.setGifts = setGifts;
window.setSpeed = setSpeed;
window.startAutoEvents = startAutoEvents;
window.stopAutoEvents = stopAutoEvents;
window.triggerSantaAppearance = triggerSantaAppearance;
window.startSantaAppearances = startSantaAppearances;
window.stopSantaAppearances = stopSantaAppearances;
