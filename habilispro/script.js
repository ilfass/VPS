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
    autoEventInterval: 0.75, // Reducido aún más para más frecuencia
    
    // Velocidad de incremento de regalos (por segundo)
    giftsPerSecond: 0.5,
    
    // Variación de velocidad (porcentaje de cambio aleatorio)
    speedVariation: 0.05, // 5% de variación
    
    // Intervalo para aparición de Papá Noel (en minutos)
    santaAppearanceInterval: 1.5, // Reducido aún más para más frecuencia
    
    // Duración de la aparición (en segundos)
    santaAppearanceDuration: 8,
};

// ============================================
// CIUDADES DE HABLA HISPANA (prioridad: Argentina, Chile, México, España)
// ============================================

const SPANISH_SPEAKING_CITIES = [
    // ARGENTINA (prioridad máxima - más ciudades)
    { name: 'Buenos Aires, Argentina', lat: -34.6037, lng: -58.3816, weight: 5 },
    { name: 'Córdoba, Argentina', lat: -31.4201, lng: -64.1888, weight: 4 },
    { name: 'Rosario, Argentina', lat: -32.9442, lng: -60.6505, weight: 4 },
    { name: 'Mendoza, Argentina', lat: -32.8895, lng: -68.8458, weight: 3 },
    { name: 'Tucumán, Argentina', lat: -26.8083, lng: -65.2176, weight: 3 },
    { name: 'La Plata, Argentina', lat: -34.9215, lng: -57.9545, weight: 2 },
    { name: 'Mar del Plata, Argentina', lat: -38.0055, lng: -57.5426, weight: 2 },
    { name: 'Salta, Argentina', lat: -24.7859, lng: -65.4117, weight: 2 },
    { name: 'Santa Fe, Argentina', lat: -31.6333, lng: -60.7, weight: 2 },
    { name: 'San Juan, Argentina', lat: -31.5375, lng: -68.5364, weight: 1 },
    { name: 'Bahía Blanca, Argentina', lat: -38.7183, lng: -62.2663, weight: 1 },
    { name: 'Resistencia, Argentina', lat: -27.4514, lng: -58.9867, weight: 1 },
    { name: 'Neuquén, Argentina', lat: -38.9516, lng: -68.0591, weight: 1 },
    { name: 'Santiago del Estero, Argentina', lat: -27.7951, lng: -64.2615, weight: 1 },
    { name: 'Corrientes, Argentina', lat: -27.4692, lng: -58.8306, weight: 1 },
    // CHILE (alta prioridad)
    { name: 'Santiago, Chile', lat: -33.4489, lng: -70.6693, weight: 5 },
    { name: 'Valparaíso, Chile', lat: -33.0472, lng: -71.6127, weight: 4 },
    { name: 'Concepción, Chile', lat: -36.8201, lng: -73.0444, weight: 3 },
    { name: 'La Serena, Chile', lat: -29.9027, lng: -71.2519, weight: 2 },
    { name: 'Antofagasta, Chile', lat: -23.6509, lng: -70.3975, weight: 2 },
    { name: 'Temuco, Chile', lat: -38.7359, lng: -72.5904, weight: 2 },
    { name: 'Viña del Mar, Chile', lat: -33.0246, lng: -71.5518, weight: 2 },
    { name: 'Rancagua, Chile', lat: -34.1708, lng: -70.7444, weight: 1 },
    { name: 'Talca, Chile', lat: -35.4264, lng: -71.6554, weight: 1 },
    { name: 'Arica, Chile', lat: -18.4783, lng: -70.3126, weight: 1 },
    // MÉXICO (alta prioridad)
    { name: 'Ciudad de México, México', lat: 19.4326, lng: -99.1332, weight: 5 },
    { name: 'Guadalajara, México', lat: 20.6597, lng: -103.3496, weight: 4 },
    { name: 'Monterrey, México', lat: 25.6866, lng: -100.3161, weight: 4 },
    { name: 'Puebla, México', lat: 19.0414, lng: -98.2063, weight: 3 },
    { name: 'Tijuana, México', lat: 32.5149, lng: -117.0382, weight: 2 },
    { name: 'León, México', lat: 21.1250, lng: -101.6860, weight: 2 },
    { name: 'Querétaro, México', lat: 20.5888, lng: -100.3899, weight: 2 },
    { name: 'Mérida, México', lat: 20.9674, lng: -89.5926, weight: 1 },
    { name: 'Cancún, México', lat: 21.1619, lng: -86.8515, weight: 1 },
    { name: 'Toluca, México', lat: 19.2926, lng: -99.6569, weight: 1 },
    // ESPAÑA (alta prioridad)
    { name: 'Madrid, España', lat: 40.4168, lng: -3.7038, weight: 5 },
    { name: 'Barcelona, España', lat: 41.3851, lng: 2.1734, weight: 4 },
    { name: 'Valencia, España', lat: 39.4699, lng: -0.3763, weight: 3 },
    { name: 'Sevilla, España', lat: 37.3891, lng: -5.9845, weight: 3 },
    { name: 'Zaragoza, España', lat: 41.6488, lng: -0.8891, weight: 2 },
    { name: 'Málaga, España', lat: 36.7213, lng: -4.4214, weight: 2 },
    { name: 'Murcia, España', lat: 37.9922, lng: -1.1307, weight: 1 },
    { name: 'Palma, España', lat: 39.5696, lng: 2.6502, weight: 1 },
    // Otros países sudamericanos (menor prioridad)
    { name: 'Bogotá, Colombia', lat: 4.7110, lng: -74.0721, weight: 1 },
    { name: 'Medellín, Colombia', lat: 6.2476, lng: -75.5658, weight: 1 },
    { name: 'Lima, Perú', lat: -12.0464, lng: -77.0428, weight: 1 },
    { name: 'Quito, Ecuador', lat: -0.1807, lng: -78.4678, weight: 1 },
    { name: 'Montevideo, Uruguay', lat: -34.9011, lng: -56.1645, weight: 1 },
    { name: 'Asunción, Paraguay', lat: -25.2637, lng: -57.5759, weight: 1 },
    { name: 'La Paz, Bolivia', lat: -16.5000, lng: -68.1500, weight: 1 },
    { name: 'Caracas, Venezuela', lat: 10.4806, lng: -66.9036, weight: 1 }
];

let currentRandomCity = null;
let randomCityInterval = null;

/**
 * Obtiene una ciudad aleatoria con pesos (mayor probabilidad para Argentina, Chile, México, España)
 */
function getRandomWeightedCity() {
    const weightedArray = [];
    SPANISH_SPEAKING_CITIES.forEach(city => {
        for (let i = 0; i < city.weight; i++) {
            weightedArray.push(city);
        }
    });
    return weightedArray[Math.floor(Math.random() * weightedArray.length)];
}

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
    // Mensajes con referencia a Instagram
    {
        type: 'youtube',
        message: '¡Hola a todos! 🎅',
        subtitle: '¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Feliz Navidad! 🎄',
        subtitle: '¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Gracias por acompañarme! 🎁',
        subtitle: '¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Estoy entregando regalos! 🎅',
        subtitle: '¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'youtube',
        message: '¡Qué gran comunidad! ❤️',
        subtitle: '¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    // Mensajes con saludos a usuarios del chat
    {
        type: 'greeting',
        message: '¡Hola {names}! 🎅',
        subtitle: '¡Gracias por estar aquí! ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    {
        type: 'greeting',
        message: '¡Saludos especiales a {names}! 🎄',
        subtitle: '¡Feliz Navidad! ¡Sígueme en Instagram ¡Sígueme en IG @ilfass! 📸! 📸',
        includeNames: true,
        minNames: 2,
        maxNames: 4
    },
    {
        type: 'greeting',
        message: '¡Un abrazo navideño para {names}! 🎁',
        subtitle: '¡Gracias por seguir el viaje! ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, ustedes son increíbles! ❤️',
        subtitle: '¡Sígueme en Instagram ¡Sígueme en IG @ilfass! 📸 para más contenido! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    // Mensajes generales
    {
        type: 'general',
        message: '¡Sigo mi ruta alrededor del mundo! 🌍',
        subtitle: '¡Acompáñame y sígueme en Instagram! 📸',
        includeNames: false
    },
    {
        type: 'general',
        message: '¡Millones de regalos por entregar! 🎅',
        subtitle: '¡Qué noche tan especial! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'general',
        message: '¡Los renos están volando perfecto! 🦌',
        subtitle: '¡Gracias por seguir el viaje! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN ESPAÑA
    // ============================================
    {
        type: 'country',
        message: '¡Feliz Navidad desde España! 🇪🇸',
        subtitle: 'Aquí celebramos con turrones y cava. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Nochebuena en España! 🎄',
        subtitle: 'Las familias se reúnen para la cena. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Los Reyes Magos están llegando! 👑',
        subtitle: 'En España celebramos el 6 de enero. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Madrid! 🏛️',
        subtitle: 'Luces navideñas iluminan las calles. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN SUDAMÉRICA
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en Argentina! 🇦🇷',
        subtitle: 'Celebramos con asado y pan dulce. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Brasil! 🇧🇷',
        subtitle: 'Aquí es verano, pero el espíritu navideño está presente. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Chile! 🇨🇱',
        subtitle: 'Las familias se reúnen para la cena de Nochebuena. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Colombia! 🇨🇴',
        subtitle: 'Celebramos con natilla y buñuelos. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Perú! 🇵🇪',
        subtitle: 'Panetón y chocolate caliente. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Venezuela! 🇻🇪',
        subtitle: 'Hallacas y pan de jamón en cada mesa. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Uruguay! 🇺🇾',
        subtitle: 'Celebramos con fuegos artificiales. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Paraguay! 🇵🇾',
        subtitle: 'Chipa y sopa paraguaya. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Ecuador! 🇪🇨',
        subtitle: 'Pristiños y buñuelos navideños. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Bolivia! 🇧🇴',
        subtitle: 'Picana y panetón en cada hogar. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN CENTROAMÉRICA
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en México! 🇲🇽',
        subtitle: 'Posadas, piñatas y tamales. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Guatemala! 🇬🇹',
        subtitle: 'Celebramos con tamales y ponche. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Costa Rica! 🇨🇷',
        subtitle: 'Tamales y rompope en cada mesa. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Panamá! 🇵🇦',
        subtitle: 'Celebramos con arroz con guandú. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Honduras! 🇭🇳',
        subtitle: 'Torrejas y ponche navideño. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en El Salvador! 🇸🇻',
        subtitle: 'Tamales y panes con pollo. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Nicaragua! 🇳🇮',
        subtitle: 'Nacatamales y cajeta de coco. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en República Dominicana! 🇩🇴',
        subtitle: 'Cerdo asado y pasteles en hoja. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    // ============================================
    // MENSAJES SOBRE NAVIDAD EN OTROS PAÍSES
    // ============================================
    {
        type: 'country',
        message: '¡Navidad en Estados Unidos! 🇺🇸',
        subtitle: 'Cookies para Santa y decoraciones. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Italia! 🇮🇹',
        subtitle: 'Panettone y cena de Nochebuena. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Francia! 🇫🇷',
        subtitle: 'Bûche de Noël y foie gras. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Alemania! 🇩🇪',
        subtitle: 'Mercados navideños y stollen. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Feliz Navidad desde Japón! 🇯🇵',
        subtitle: 'KFC y pasteles de Navidad. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Australia! 🇦🇺',
        subtitle: 'Navidad en verano con barbacoas. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'country',
        message: '¡Navidad en Finlandia! 🇫🇮',
        subtitle: 'La casa de Papá Noel está aquí. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    // ============================================
    // SALUDOS NAVIDEÑOS EN DIFERENTES IDIOMAS
    // ============================================
    {
        type: 'greeting',
        message: '¡Feliz Navidad! 🎄',
        subtitle: 'Que esta temporada esté llena de alegría. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Feliz Navidad y Próspero Año Nuevo! 🎅',
        subtitle: 'Deseos de paz y felicidad. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Felices Fiestas! 🎁',
        subtitle: 'Que la magia de la Navidad te acompañe. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Noche de Paz! ✨',
        subtitle: 'Que todos tengan una Navidad llena de amor. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Joyeux Noël! 🇫🇷',
        subtitle: 'Feliz Navidad desde Francia. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Buon Natale! 🇮🇹',
        subtitle: 'Feliz Navidad desde Italia. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Frohe Weihnachten! 🇩🇪',
        subtitle: 'Feliz Navidad desde Alemania. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Feliz Natal! 🇧🇷',
        subtitle: 'Feliz Navidad desde Brasil. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Merry Christmas! 🇺🇸',
        subtitle: 'Feliz Navidad desde Estados Unidos. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡God Jul! 🇸🇪',
        subtitle: 'Feliz Navidad desde Suecia. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Hyvää Joulua! 🇫🇮',
        subtitle: 'Feliz Navidad desde Finlandia. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡¡Feliz Navidad a todos!! 🎅🎄',
        subtitle: 'Que esta sea una temporada especial. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Que la paz y el amor reinen! ❤️',
        subtitle: 'Feliz Navidad para todos. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'greeting',
        message: '¡Brindemos por la Navidad! 🥂',
        subtitle: 'Que todos tengan una noche mágica. ¡¡Sígueme en IG @ilfass! 📸!',
        includeNames: false
    },
    // ============================================
    // MENSAJES CON SALUDOS A USUARIOS + PAÍSES
    // ============================================
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde España! 🇪🇸',
        subtitle: 'Que disfruten de las tradiciones navideñas. ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, saludos desde Argentina! 🇦🇷',
        subtitle: '¡Feliz Navidad! ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde México! 🇲🇽',
        subtitle: 'Que disfruten de las posadas. ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 2,
        maxNames: 4
    },
    {
        type: 'greeting',
        message: '¡{names}, saludos navideños desde Colombia! 🇨🇴',
        subtitle: '¡Que tengan una Navidad llena de alegría! ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 2
    },
    {
        type: 'greeting',
        message: '¡{names}, Feliz Navidad desde Chile! 🇨🇱',
        subtitle: 'Que disfruten de la cena navideña. ¡Sígueme en IG @ilfass! 📸',
        includeNames: true,
        minNames: 1,
        maxNames: 3
    },
    // ============================================
    // MENSAJES PERSONALIZADOS CON NOMBRE DEL USUARIO
    // ============================================
    {
        type: 'personal',
        message: '¡Hola {userName}! 🎅',
        subtitle: '¡Espero que estés disfrutando esta Navidad! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: false
    },
    {
        type: 'personal',
        message: '¡{userName}, Feliz Navidad! 🎄',
        subtitle: 'Que esta temporada esté llena de alegría para ti. ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: false
    },
    {
        type: 'personal',
        message: '¡{userName}, tengo un regalo especial para ti! 🎁',
        subtitle: '¡Gracias por seguir el viaje! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: false
    },
    {
        type: 'personal',
        message: '¡{userName}, estoy en camino a {userCity}! 🎅',
        subtitle: '¡Prepárate, que ya llego! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡Hola {userName} desde {userCity}! 🌍',
        subtitle: '¡Feliz Navidad desde tu ciudad! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, saludos desde el trineo! 🦌',
        subtitle: '¡Estoy volando hacia {userCity}! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, qué bueno verte aquí! ❤️',
        subtitle: '¡Gracias por acompañarme en este viaje! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: false
    },
    {
        type: 'personal',
        message: '¡{userName}, espero que estés listo! 🎅',
        subtitle: '¡Los regalos para {userCity} están en camino! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, Feliz Navidad desde {userCity}! 🎄',
        subtitle: '¡Que disfrutes de las tradiciones navideñas! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, estoy cerca de {userCity}! 🎁',
        subtitle: '¡Prepárate para una Navidad mágica! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, los renos están emocionados! 🦌',
        subtitle: '¡Especialmente por visitar {userCity}! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    {
        type: 'personal',
        message: '¡{userName}, qué noche tan especial! ✨',
        subtitle: '¡Espero que disfrutes la Navidad en {userCity}! ¡Sígueme en IG @ilfass! 📸',
        includeUserName: true,
        includeCity: true
    },
    // ============================================
    // MENSAJES LARGOS Y GRACIOSOS
    // ============================================
    {
        type: 'humor',
        message: '¡Rudolph está haciendo acrobacias en el aire! 🦌',
        subtitle: 'Los otros renos están celosos porque él tiene la nariz más brillante. ¡Sígueme en IG @ilfass para más aventuras navideñas! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los elfos están trabajando a toda velocidad! 🧝',
        subtitle: 'Parece que alguien les dio demasiado café esta noche. ¡Están empaquetando regalos como si no hubiera mañana! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Acabo de pasar por una zona de mucho tráfico aéreo! ✈️',
        subtitle: 'Los aviones comerciales me saludaron con las luces. ¡Qué buena onda tienen los pilotos! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph casi choca con un satélite! 🛰️',
        subtitle: 'Pero no se preocupen, lo esquivó como un profesional. Estos renos tienen más experiencia que un piloto de Fórmula 1. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los regalos están perfectamente organizados! 🎁',
        subtitle: 'Los elfos usaron un sistema de códigos QR para no confundirse. ¡La tecnología moderna llega hasta el Polo Norte! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Acabo de recibir un mensaje de los renos! 📱',
        subtitle: 'Dicen que quieren una pausa para tomar chocolate caliente. ¡Pero no hay tiempo! ¡Millones de niños nos esperan! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡El GPS del trineo está funcionando perfecto! 🗺️',
        subtitle: 'Aunque a veces me pregunto si Google Maps tiene una opción para "vuelo mágico navideño". ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los niños están dejando galletas y leche! 🍪🥛',
        subtitle: 'Espero que no se molesten si me como todas. ¡Tengo que mantener mis energías para esta larga noche! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph está de excelente humor hoy! 🦌',
        subtitle: 'Creo que es porque le dije que después de esto tiene vacaciones hasta el próximo año. ¡Los renos también necesitan descansar! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡El trineo tiene modo turbo activado! ⚡',
        subtitle: 'Los elfos le instalaron un sistema de propulsión mejorado. ¡Ahora volamos más rápido que un cohete! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Acabo de ver un cometa pasar! ☄️',
        subtitle: 'Rudolph quiso seguirlo, pero le dije que tenemos trabajo que hacer. ¡Los renos siempre quieren explorar el espacio! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los elfos están haciendo una apuesta! 🎲',
        subtitle: 'Adivinen cuántos regalos entregaremos esta noche. El ganador se lleva un mes extra de vacaciones. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph está quejándose de que su nariz necesita mantenimiento! 🦌',
        subtitle: 'Le dije que espere hasta después de Navidad. ¡Tiene que brillar toda la noche! Los otros renos están celosos porque él siempre recibe toda la atención. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Acabo de pasar por el Ártico y hace un frío que pela! ❄️',
        subtitle: 'Los renos están usando bufandas y los elfos se quejan de que el GPS se congeló. Pero no hay problema, yo conozco el camino de memoria después de tantos años. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los elfos instalaron Wi-Fi en el trineo! 📶',
        subtitle: 'Ahora puedo ver memes mientras vuelo. Aunque a veces la conexión se corta cuando pasamos por zonas remotas. ¡Al menos puedo responder mensajes en tiempo real! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph casi se choca con un dron de Amazon! 📦',
        subtitle: 'Parece que también están haciendo entregas esta noche. Le tuve que explicar que tenemos prioridad porque llevamos regalos mágicos, no paquetes normales. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los elfos están en huelga porque quieren más tiempo de descanso! 🧝',
        subtitle: 'Les dije que después de Navidad pueden tomarse una semana libre. Pero primero tenemos que terminar de entregar todos estos regalos. ¡Millones de niños nos esperan! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡El GPS del trineo dice que llegaremos en 2 horas! ⏰',
        subtitle: 'Pero yo sé que en realidad serán 5 minutos porque volamos a velocidad mágica. Los sistemas modernos no entienden la física navideña. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph está haciendo streaming en vivo de nuestro viaje! 📹',
        subtitle: 'Los otros renos están celosos porque él tiene más seguidores. Le dije que se concentre en volar y deje el contenido para después. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Los elfos están probando nuevos sabores de galletas! 🍪',
        subtitle: 'Hoy tenemos galletas de jengibre con chispas de chocolate mágico. Son tan buenas que casi me olvido de entregar los regalos. ¡Pero primero lo primero! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Acabo de recibir un mensaje de los renos! 📱',
        subtitle: 'Dicen que quieren hacer una parada en Starbucks para tomar un café. Les dije que no hay tiempo, pero prometí que después de la entrega les compro uno grande. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡El trineo tiene modo eco-friendly activado! 🌱',
        subtitle: 'Los elfos instalaron un sistema que recicla la energía de la magia navideña. Ahora volamos más rápido y ayudamos al medio ambiente. ¡La tecnología moderna es increíble! ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
    {
        type: 'humor',
        message: '¡Rudolph está haciendo acrobacias para impresionar a los niños! 🦌',
        subtitle: 'Hace loopings y piruetas en el aire. Los otros renos están celosos porque él siempre roba el show. Pero todos trabajamos en equipo para hacer esta noche especial. ¡Sígueme en IG @ilfass! 📸',
        includeNames: false
    },
];

// ============================================
// CONFIGURACIÓN DE GEMINI API
// ============================================

const GEMINI_API_KEY = 'AIzaSyD-NDbMygTSZUiaHWC426Q5PJ7vhUoHkko';

// ============================================
// RESPUESTAS PREDEFINIDAS DE PAPÁ NOEL (Fallback cuando Gemini falla)
// ============================================

/**
 * Obtiene una respuesta predefinida contextual basada en el mensaje del usuario
 */
function getPredefinedResponse(userMessage, userName = 'Usuario') {
    const message = userMessage.toLowerCase();
    const location = state.location || 'alrededor del mundo';
    const gifts = formatNumber(state.gifts || 0);
    const userCity = state.userCity || '';
    const speed = formatNumber(state.speed || CONFIG.initialSpeed);
    
    // Obtener información del panel "Tu ciudad" si está disponible
    let cityDistance = null;
    let cityETA = null;
    const cityPanel = document.getElementById('userCityPanel');
    if (cityPanel && cityPanel.style.display !== 'none') {
        const distanceEl = document.getElementById('userCityDistance');
        const etaEl = document.getElementById('userCityETA');
        if (distanceEl) cityDistance = distanceEl.textContent;
        if (etaEl) cityETA = etaEl.textContent;
    }
    
    // Respuestas contextuales basadas en palabras clave
    const responses = [];
    
    // Preguntas sobre ubicación / de dónde viene
    if (message.includes('dónde') || message.includes('donde') || message.includes('ubicación') || 
        message.includes('ubicacion') || message.includes('vienes') || message.includes('estás') || 
        message.includes('estas') || message.includes('estas ahora')) {
        responses.push(
            `¡Hola ${userName}! 🎅 Acabo de pasar por ${location}. ¡Es un lugar hermoso! 🌍`,
            `¡${userName}! Estoy volando sobre ${location} en este momento. ¡Qué vista tan increíble! 🎄`,
            `¡Hola! 🎅 Estoy en ${location} ahora mismo. Los renos están volando perfecto! 🦌`,
            `¡${userName}! Acabo de entregar regalos en ${location}. ¡Qué noche tan especial! ✨`,
            `¡Hola! 🎅 Estoy sobrevolando ${location}. ¡Rudolph está guiando el camino perfectamente! 🦌`
        );
    }
    
    // Preguntas sobre cuándo llega / tiempo de llegada
    if (message.includes('cuándo') || message.includes('cuando') || message.includes('llegas') || 
        message.includes('llegar') || message.includes('tiempo') || message.includes('falta') ||
        message.includes('cuenta') || message.includes('eta')) {
        if (cityDistance && cityETA) {
            responses.push(
                `¡Hola ${userName}! 🎅 Estoy a ${cityDistance} de ${userCity}. ${cityETA} y estaré ahí! ⏰`,
                `¡${userName}! Me falta ${cityDistance} para llegar a ${userCity}. ¡Pronto estaré ahí! 🎄`,
                `¡Hola! 🎅 Según mis cálculos, llegaré a ${userCity} en ${cityETA}. ¡Prepárate! ✨`,
                `¡${userName}! Estoy a ${cityDistance} de tu ciudad. ¡Ya casi llego! 🦌`,
                `¡Hola! 🎅 Me falta poco para llegar a ${userCity}. ${cityETA} y estaré entregando regalos! 🎁`
            );
        } else {
            responses.push(
                `¡Hola ${userName}! 🎅 Estoy volando a toda velocidad. ¡Llegaré pronto! ⚡`,
                `¡${userName}! Los renos están volando rápido. ¡No falta mucho! 🦌`,
                `¡Hola! 🎅 Estoy en camino. ¡Llegaré a tiempo para Navidad! 🎄`,
                `¡${userName}! Estoy volando sin parar. ¡Pronto estaré ahí! ✨`,
                `¡Hola! 🎅 Estoy entregando regalos sin descanso. ¡Llegaré pronto! 🎁`
            );
        }
    }
    
    // Preguntas sobre regalos
    if (message.includes('regalo') || message.includes('regalos') || message.includes('juguete') || 
        message.includes('juguetes') || message.includes('presente') || message.includes('presentes')) {
        responses.push(
            `¡Hola ${userName}! 🎅 Ya he entregado ${gifts} regalos esta noche. ¡Y aún me quedan millones! 🎁`,
            `¡${userName}! He entregado ${gifts} regalos hasta ahora. ¡Los elfos trabajaron muy duro! 🧝`,
            `¡Hola! 🎅 Llevo ${gifts} regalos entregados. ¡Y la noche apenas comienza! ✨`,
            `¡${userName}! Ya entregué ${gifts} regalos. ¡Millones de niños felices! 🎄`,
            `¡Hola! 🎅 Los regalos están perfectamente organizados. Ya llevo ${gifts} entregados! 🎁`
        );
    }
    
    // Preguntas sobre renos
    if (message.includes('reno') || message.includes('renos') || message.includes('rudolph') || 
        message.includes('trineo') || message.includes('volar')) {
        responses.push(
            `¡Hola ${userName}! 🎅 Los renos están volando perfecto. Rudolph está guiando el camino! 🦌`,
            `¡${userName}! Los renos están en excelente forma. ¡Vuelan más rápido que nunca! ⚡`,
            `¡Hola! 🎅 Rudolph está de buen humor hoy. Su nariz brilla más que nunca! 🦌✨`,
            `¡${userName}! Los renos están sincronizados perfectamente. ¡Qué equipo tan increíble! 🦌`,
            `¡Hola! 🎅 Los renos están volando a ${speed} km/h. ¡Estamos haciendo buen tiempo! 🦌`
        );
    }
    
    // Preguntas sobre Navidad
    if (message.includes('navidad') || message.includes('navideño') || message.includes('navideña') ||
        message.includes('feliz navidad') || message.includes('christmas')) {
        responses.push(
            `¡Hola ${userName}! 🎅 ¡Feliz Navidad! ¡Espero que estés disfrutando esta noche mágica! 🎄`,
            `¡${userName}! ¡Feliz Navidad! ¡Qué noche tan especial para todos! ✨`,
            `¡Hola! 🎅 ¡Feliz Navidad! ¡Espero que todos estén disfrutando con sus familias! 🎄`,
            `¡${userName}! ¡Feliz Navidad! ¡Esta es la noche más mágica del año! 🎁`,
            `¡Hola! 🎅 ¡Feliz Navidad! ¡Que todos tus deseos se cumplan! ✨`
        );
    }
    
    // Preguntas sobre velocidad
    if (message.includes('velocidad') || message.includes('rápido') || message.includes('rapido') ||
        message.includes('lento') || message.includes('km/h')) {
        responses.push(
            `¡Hola ${userName}! 🎅 Estoy volando a ${speed} km/h. ¡Los renos están en excelente forma! ⚡`,
            `¡${userName}! Volamos a ${speed} km/h. ¡Rudolph está haciendo un trabajo increíble! 🦌`,
            `¡Hola! 🎅 La velocidad actual es ${speed} km/h. ¡Perfecto para entregar todos los regalos! ⚡`,
            `¡${userName}! Estamos a ${speed} km/h. ¡Los renos están volando como cohetes! 🚀`,
            `¡Hola! 🎅 Volamos a ${speed} km/h. ¡No hay tiempo que perder! ⏰`
        );
    }
    
    // Saludos generales
    if (message.includes('hola') || message.includes('hi') || message.includes('buenos días') ||
        message.includes('buenas tardes') || message.includes('buenas noches')) {
        responses.push(
            `¡Hola ${userName}! 🎅 ¡Qué alegría verte aquí! ¡Gracias por seguir mi viaje! ✨`,
            `¡${userName}! ¡Hola! 🎅 Me encanta charlar contigo mientras entrego regalos! 🎄`,
            `¡Hola! 🎅 ¡Qué bueno verte, ${userName}! ¡Esta noche es muy especial! 🎁`,
            `¡${userName}! ¡Hola! 🎅 Estoy muy ocupado pero me encanta hablar contigo! 🦌`,
            `¡Hola! 🎅 ¡Qué alegría verte, ${userName}! ¡Feliz Navidad! 🎄`
        );
    }
    
    // Preguntas sobre cómo está / estado
    if (message.includes('cómo estás') || message.includes('como estas') || message.includes('estás bien') ||
        message.includes('estas bien') || message.includes('todo bien')) {
        responses.push(
            `¡Hola ${userName}! 🎅 ¡Estoy excelente! Muy ocupado entregando regalos, pero feliz. ¡Y tú? ✨`,
            `¡${userName}! 🎅 ¡Estoy genial! Los renos están volando perfecto y los regalos están organizados. 🦌`,
            `¡Hola! 🎅 ¡Estoy muy bien! Esta noche es la más importante del año. ¡Todo va perfecto! 🎄`,
            `¡${userName}! 🎅 ¡Estoy fantástico! Ya entregué ${gifts} regalos y aún me quedan millones. 🎁`,
            `¡Hola! 🎅 ¡Estoy increíble! Volando sobre ${location} y entregando regalos. ¡Qué noche! ✨`
        );
    }
    
    // Preguntas sobre qué está haciendo
    if (message.includes('qué haces') || message.includes('que haces') || message.includes('qué estás haciendo') ||
        message.includes('que estas haciendo') || message.includes('haciendo')) {
        responses.push(
            `¡Hola ${userName}! 🎅 Estoy entregando regalos alrededor del mundo. ¡Ya llevo ${gifts}! 🎁`,
            `¡${userName}! 🎅 Estoy volando sobre ${location} entregando regalos. ¡Qué trabajo tan hermoso! ✨`,
            `¡Hola! 🎅 Estoy muy ocupado entregando regalos. Los renos están volando perfecto! 🦌`,
            `¡${userName}! 🎅 Estoy trabajando sin parar. Ya entregué ${gifts} regalos esta noche! 🎄`,
            `¡Hola! 🎅 Estoy volando a ${speed} km/h entregando regalos. ¡No hay tiempo que perder! ⚡`
        );
    }
    
    // Preguntas sobre la ciudad del usuario
    if (userCity && (message.includes(userCity.toLowerCase()) || message.includes('mi ciudad') ||
        message.includes('mi casa') || message.includes('llegar aquí'))) {
        if (cityDistance && cityETA) {
            responses.push(
                `¡Hola ${userName}! 🎅 Estoy a ${cityDistance} de ${userCity}. ${cityETA} y estaré ahí! ⏰`,
                `¡${userName}! Me falta ${cityDistance} para llegar a ${userCity}. ¡Pronto estaré entregando regalos! 🎁`,
                `¡Hola! 🎅 Según mis cálculos, llegaré a ${userCity} en ${cityETA}. ¡Prepárate! ✨`,
                `¡${userName}! Estoy a ${cityDistance} de tu ciudad. ¡Ya casi llego! 🦌`,
                `¡Hola! 🎅 Me falta poco para llegar a ${userCity}. ${cityETA} y estaré ahí! 🎄`
            );
        } else {
            responses.push(
                `¡Hola ${userName}! 🎅 Estoy volando hacia ${userCity}. ¡Llegaré pronto! ⚡`,
                `¡${userName}! Estoy en camino a ${userCity}. ¡No falta mucho! 🎄`,
                `¡Hola! 🎅 Volando hacia ${userCity}. ¡Pronto estaré entregando regalos ahí! 🎁`,
                `¡${userName}! Estoy llegando a ${userCity}. ¡Prepárate! ✨`,
                `¡Hola! 🎅 ${userCity} está en mi ruta. ¡Llegaré a tiempo! ⏰`
            );
        }
    }
    
    // Respuestas generales / por defecto
    if (responses.length === 0) {
        responses.push(
            `¡Hola ${userName}! 🎅 ¡Qué bueno verte aquí! Estoy muy ocupado entregando regalos. ¡Feliz Navidad! 🎄`,
            `¡${userName}! 🎅 Me encanta charlar contigo. Estoy volando sobre ${location} ahora mismo. ✨`,
            `¡Hola! 🎅 ¡Gracias por tu mensaje! Estoy entregando regalos alrededor del mundo. 🎁`,
            `¡${userName}! 🎅 ¡Qué alegría verte! Ya entregué ${gifts} regalos esta noche. 🎄`,
            `¡Hola! 🎅 Estoy volando a ${speed} km/h. Los renos están en excelente forma! 🦌`,
            `¡${userName}! 🎅 ¡Feliz Navidad! Espero que estés disfrutando esta noche mágica. ✨`,
            `¡Hola! 🎅 Rudolph está guiando el camino perfectamente. ¡Qué noche tan especial! 🦌`,
            `¡${userName}! 🎅 Los elfos trabajaron muy duro preparando los regalos. ¡Ya entregué ${gifts}! 🧝`,
            `¡Hola! 🎅 Estoy sobrevolando ${location}. ¡Qué vista tan increíble! 🌍`,
            `¡${userName}! 🎅 ¡Gracias por seguir mi viaje! Esta noche es muy especial para mí. 🎄`,
            `¡Hola! 🎅 Estoy entregando regalos sin descanso. ¡Millones de niños felices! 🎁`,
            `¡${userName}! 🎅 Los renos están volando perfecto. ¡Estamos haciendo buen tiempo! 🦌`,
            `¡Hola! 🎅 ¡Qué bueno verte aquí! Estoy muy ocupado pero me encanta charlar. ✨`,
            `¡${userName}! 🎅 Estoy volando alrededor del mundo. ¡Qué trabajo tan hermoso! 🌍`,
            `¡Hola! 🎅 Ya entregué ${gifts} regalos. ¡Y la noche apenas comienza! ⚡`,
            `¡${userName}! 🎅 ¡Feliz Navidad! Espero que todos estén disfrutando con sus familias. 🎄`,
            `¡Hola! 🎅 Estoy en ${location} ahora mismo. ¡Qué lugar tan hermoso! ✨`,
            `¡${userName}! 🎅 Los regalos están perfectamente organizados. ¡Todo va según lo planeado! 🎁`,
            `¡Hola! 🎅 Rudolph está de excelente humor. Su nariz brilla más que nunca! 🦌✨`,
            `¡${userName}! 🎅 Estoy volando a toda velocidad. ¡No hay tiempo que perder! ⚡`,
            `¡Hola! 🎅 ¡Qué alegría verte! Esta es la noche más mágica del año. 🎄`,
            `¡${userName}! 🎅 Los elfos están trabajando a toda velocidad. ¡Qué equipo tan increíble! 🧝`,
            `¡Hola! 🎅 Estoy entregando regalos alrededor del mundo. ¡Qué noche tan especial! 🌍`,
            `¡${userName}! 🎅 ¡Gracias por tu mensaje! Me encanta charlar contigo. ✨`,
            `¡Hola! 🎅 Estoy volando sobre ${location}. ¡Los renos están sincronizados perfectamente! 🦌`,
            `¡${userName}! 🎅 Ya entregué ${gifts} regalos. ¡Millones de niños felices! 🎁`,
            `¡Hola! 🎅 ¡Feliz Navidad! Que todos tus deseos se cumplan esta noche. 🎄`,
            `¡${userName}! 🎅 Estoy volando a ${speed} km/h. ¡Perfecto para entregar todos los regalos! ⚡`,
            `¡Hola! 🎅 Los renos están en excelente forma. ¡Vuelan más rápido que nunca! 🦌`,
            `¡${userName}! 🎅 Estoy muy ocupado pero me encanta charlar contigo. ¡Gracias! ✨`
        );
    }
    
    // Seleccionar una respuesta aleatoria de las disponibles
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
}
// Intentar con diferentes modelos hasta encontrar uno que funcione
// Formato correcto según documentación: v1beta/models/{model}:generateContent
// Modelos a probar: gemini-1.5-pro, gemini-1.5-flash, gemini-pro
const GEMINI_MODELS = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
    // Información del usuario
    userName: null,
    userCity: null,
    userCoordinates: null,
    santaCoordinates: null, // Coordenadas actuales de Papá Noel (simuladas)
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
 * Determina la ubicación actual basándose en ciudades que ya pasaron las 00:00 del 25 de diciembre
 */
function updateLocationBasedOnChristmasMidnight() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const christmasDate = new Date(currentYear, 11, 25); // 25 de diciembre (mes 11 = diciembre)
    
    // Obtener todas las ciudades con sus zonas horarias
    const citiesWithTimezones = Object.entries(LOCATIONS_DATABASE);
    
    // Calcular para cada ciudad si ya pasó las 00:00 del 25
    const citiesStatus = citiesWithTimezones.map(([cityName, timezone]) => {
        try {
            // Obtener hora local de la ciudad
            const cityTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const cityDate = new Date(cityTime);
            
            // Crear fecha de medianoche del 25 de diciembre en esa zona horaria
            const christmasMidnight = new Date(Date.UTC(currentYear, 11, 25, 0, 0, 0));
            const localChristmasMidnight = new Date(christmasMidnight.toLocaleString('en-US', { timeZone: timezone }));
            
            // Calcular diferencia en horas desde las 00:00 del 25
            const hoursSinceMidnight = (cityDate - localChristmasMidnight) / (1000 * 60 * 60);
            
            return {
                name: cityName,
                timezone: timezone,
                hoursSinceMidnight: hoursSinceMidnight,
                hasPassed: hoursSinceMidnight >= 0,
                cityTime: cityDate
            };
        } catch (e) {
            return null;
        }
    }).filter(city => city !== null);
    
    // Filtrar ciudades que ya pasaron las 00:00 (o están muy cerca, dentro de 1 hora antes)
    const passedCities = citiesStatus.filter(city => city.hoursSinceMidnight >= -1);
    
    if (passedCities.length > 0) {
        // Ordenar por horas desde medianoche (más reciente primero)
        passedCities.sort((a, b) => b.hoursSinceMidnight - a.hoursSinceMidnight);
        
        // Tomar la ciudad más reciente que pasó las 00:00
        const currentCity = passedCities[0];
        
        // Actualizar ubicación si es diferente
        if (currentCity.name !== state.location) {
            console.log(`📍 Actualizando ubicación a: ${currentCity.name} (pasó las 00:00 hace ${currentCity.hoursSinceMidnight.toFixed(1)} horas)`);
            syncLocation(currentCity.name);
        }
    } else {
        // Si ninguna ciudad ha pasado las 00:00, usar la que está más cerca
        citiesStatus.sort((a, b) => a.hoursSinceMidnight - b.hoursSinceMidnight);
        const nextCity = citiesStatus[0];
        
        if (nextCity && nextCity.name !== state.location) {
            console.log(`📍 Próxima ciudad: ${nextCity.name} (faltan ${Math.abs(nextCity.hoursSinceMidnight).toFixed(1)} horas)`);
            // No actualizar aún, solo mostrar en consola
        }
    }
}

/**
 * Intenta extraer la ubicación del tracker de Google (cross-origin limitado)
 * Si falla, usa la lógica basada en medianoche del 25 de diciembre
 */
function tryExtractTrackerLocation() {
    const iframe = document.getElementById('santaTracker');
    let extracted = false;
    
    if (iframe) {
        // Intentar acceder al contenido del iframe (puede fallar por cross-origin)
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                // Buscar elementos que contengan "Próxima parada" o "Llegará en"
                const nextStopElements = iframeDoc.querySelectorAll('h1, h2, .sides, [class*="next"], [class*="stop"]');
                nextStopElements.forEach(el => {
                    const text = el.textContent || '';
                    if (text.includes('Próxima parada') || text.includes('Next stop')) {
                        const cityElement = el.nextElementSibling || el.parentElement?.querySelector('h2');
                        if (cityElement) {
                            const cityName = cityElement.textContent?.trim();
                            if (cityName && cityName.length > 0 && cityName.length < 50) {
                                // Actualizar ubicación si encontramos una ciudad válida
                                if (cityName !== state.location) {
                                    console.log('📍 Ubicación detectada del tracker:', cityName);
                                    syncLocation(cityName);
                                    extracted = true;
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            // Cross-origin error es esperado - usar lógica alternativa
        }
    }
    
    // Si no se pudo extraer del tracker, usar lógica basada en medianoche del 25
    if (!extracted) {
        updateLocationBasedOnChristmasMidnight();
    }
}

/**
 * Actualiza la ubicación mostrada
 */
function updateLocation() {
    const element = document.getElementById('currentLocation');
    if (element) {
        element.textContent = state.location;
    }
    // Actualizar panel de ciudad del usuario cuando cambie la ubicación de Papá Noel
    updateUserCityPanel();
    updateRandomCityPanel();
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
 * Agrega un evento a la lista (deshabilitado - panel removido)
 */
function addEventToHistory(event) {
    // Panel de eventos removido - función deshabilitada
    return;
    
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
    
    // Si no se especifica autor, usar el nombre del usuario o "Usuario"
    let messageAuthor;
    if (author) {
        messageAuthor = author;
    } else {
        // Usar el nombre del usuario si está disponible, sino usar "Usuario"
        messageAuthor = state.userName || 'Usuario';
    }
    const message = {
        id: Date.now(),
        author: messageAuthor,
        text: text.trim(),
        time: new Date()
    };
    
    // Agregar al final (push en lugar de unshift para chat normal)
    state.publicMessages.push(message);
    
    // Mantener máximo 50 mensajes (eliminar los más viejos)
    if (state.publicMessages.length > 50) {
        state.publicMessages.shift();
    }
    
    // Agregar a la UI
    displayMessage(message);
}

/**
 * Muestra un mensaje en la lista
 */
function displayMessage(message) {
    const messagesList = document.getElementById('messagesList');
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesList || !messagesContainer) return;
    
    const messageItem = document.createElement('div');
    
    // Determinar si es mensaje de Papá Noel o del usuario
    const isSantaMessage = message.author === '🎅 Papá Noel' || message.author.includes('Papá Noel');
    const isUserMessage = !isSantaMessage;
    
    // Aplicar clases según el tipo de mensaje (solo Papá Noel o Usuario)
    messageItem.className = 'message-item';
    if (isSantaMessage) {
        messageItem.classList.add('santa-message');
    } else {
        messageItem.classList.add('user-message');
    }
    
    const time = message.time.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageItem.innerHTML = `
        <span class="message-author">${message.author}:</span>
        <span class="message-text">${message.text}</span>
        <span class="message-time">${time}</span>
    `;
    
    // Agregar al final (como un chat normal - mensajes nuevos abajo)
    messagesList.appendChild(messageItem);
    
    // Mantener máximo 50 mensajes (eliminar los más viejos del inicio)
    while (messagesList.children.length > 50) {
        messagesList.removeChild(messagesList.firstChild);
    }
    
    // Auto-scroll hacia abajo para ver el nuevo mensaje
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Lista los modelos disponibles en Gemini API (para debug)
 */
async function listAvailableModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();
        console.log('Modelos disponibles:', data);
        if (data.models) {
            const availableModels = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            console.log('Modelos que soportan generateContent:', availableModels);
            return availableModels;
        }
        return null;
    } catch (error) {
        console.error('Error al listar modelos:', error);
        return null;
    }
}

/**
 * Obtiene respuesta de Papá Noel usando Gemini API con historial de conversación
 */
async function getSantaResponse(userMessage) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Iniciando getSantaResponse',data:{userMessage,messageCount:state.publicMessages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    try {
        // Obtener los últimos mensajes del historial (últimos 15 mensajes para contexto)
        const recentMessages = state.publicMessages.slice(-15);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Mensajes recientes obtenidos',data:{recentCount:recentMessages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Construir el prompt con historial
        const systemPrompt = `Eres Papá Noel (Santa Claus) en un vivo de YouTube interactuando con los espectadores. 

INSTRUCCIONES:
- Responde como si fueras Papá Noel real, muy amigable, cálido y cercano
- Habla como si estuvieras conversando directamente con esa persona
- Usa un tono conversacional y natural, como si estuvieras charlando
- Mantén la respuesta corta (máximo 2-3 oraciones)
- Sé gracioso y divertido cuando sea apropiado
- Incluye emojis navideños (🎅🎄🎁🦌✨)
- Si mencionan el viaje, regalos, renos, Navidad o su ciudad, haz referencia a eso
- Muestra interés genuino en lo que dicen
- Responde en español
- Usa expresiones como "¡Hola!", "¡Qué bueno!", "¡Me encanta!", "¡Claro que sí!"
- Mantén el contexto de la conversación anterior

HISTORIAL DE LA CONVERSACIÓN:`;

        // Construir el historial como texto
        let historyText = systemPrompt + '\n\n';
        
        recentMessages.forEach(msg => {
            const isSanta = msg.author === '🎅 Papá Noel' || msg.author.includes('Papá Noel');
            const isTyping = msg.text.includes('está escribiendo');
            
            // Saltar mensajes de "escribiendo"
            if (isTyping) return;
            
            if (isSanta) {
                historyText += `Papá Noel: ${msg.text}\n`;
            } else {
                const userName = msg.author || 'Usuario';
                historyText += `${userName}: ${msg.text}\n`;
            }
        });
        
        // Agregar el nuevo mensaje
        const userName = state.userName || 'Usuario';
        historyText += `\n${userName}: ${userMessage}\n\nPapá Noel:`;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Prompt construido',data:{promptLength:historyText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const requestBody = {
            contents: [{
                parts: [{
                    text: historyText
                }]
            }]
        };
        
        // Primero intentar obtener la lista de modelos disponibles
        let modelsToTry = GEMINI_MODELS;
        try {
            const availableModels = await listAvailableModels();
            if (availableModels && availableModels.length > 0) {
                // Usar solo los modelos que están disponibles
                modelsToTry = GEMINI_MODELS.filter(m => availableModels.includes(m));
                if (modelsToTry.length === 0) {
                    // Si ninguno de nuestros modelos está disponible, usar los disponibles
                    modelsToTry = availableModels.slice(0, 3);
                }
                console.log('✅ Modelos disponibles encontrados:', modelsToTry);
            } else {
                console.warn('⚠️ No se pudieron obtener modelos disponibles, usando lista por defecto');
            }
        } catch (error) {
            console.warn('⚠️ Error al obtener lista de modelos, usando lista por defecto:', error);
        }
        
        // Intentar con cada modelo hasta encontrar uno que funcione
        let lastError = null;
        for (const model of modelsToTry) {
            const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Intentando modelo',data:{url,model},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'K'})}).catch(()=>{});
            // #endregion

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Respuesta recibida',data:{model,status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'L'})}).catch(()=>{});
                // #endregion
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        const responseText = data.candidates[0].content.parts[0].text.trim();
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Modelo exitoso',data:{model,responseLength:responseText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'M'})}).catch(()=>{});
                        // #endregion
                        console.log(`✅ Modelo ${model} funcionó correctamente`);
                        return responseText;
                    }
                } else {
                    const errorText = await response.text();
                    lastError = { model, status: response.status, error: errorText };
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Modelo falló',data:{model,status:response.status,error:errorText.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'N'})}).catch(()=>{});
                    // #endregion
                    console.warn(`⚠️ Modelo ${model} falló con status ${response.status}`);
                    continue; // Intentar siguiente modelo
                }
            } catch (error) {
                lastError = { model, error: error.message };
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Excepción con modelo',data:{model,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'O'})}).catch(()=>{});
                // #endregion
                console.warn(`⚠️ Error con modelo ${model}:`, error.message);
                continue; // Intentar siguiente modelo
            }
        }
        
        // Si llegamos aquí, ningún modelo funcionó
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Todos los modelos fallaron',data:{lastError},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'P'})}).catch(()=>{});
        // #endregion
        console.error('❌ Todos los modelos fallaron. Último error:', lastError);
        return null;
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:getSantaResponse',message:'Excepción capturada',data:{errorMessage:error.message,errorName:error.name,errorStack:error.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        console.error('Error al obtener respuesta de Gemini:', error);
        return null;
    }
}

/**
 * Maneja el envío de mensaje
 */
async function handleSendMessage() {
    const input = document.getElementById('userMessageInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (text === '') return;
    
    // Agregar mensaje del usuario
    addPublicMessage(text);
    input.value = '';
    
    // Agregar participante
    addParticipant();
    
    // Mostrar indicador de que Papá Noel está escribiendo
    addPublicMessage('🎅 Papá Noel está escribiendo...', '🎅 Papá Noel');
    
    // Obtener respuesta de Gemini
    try {
        const santaResponse = await getSantaResponse(text);
        
        // Simular tiempo de escritura (más realista)
        const typingDelay = Math.min(2000 + Math.random() * 1500, 4000); // Entre 2 y 3.5 segundos
        
        setTimeout(() => {
            if (santaResponse) {
                addPublicMessage(santaResponse, '🎅 Papá Noel');
                // Reproducir sonido cuando Papá Noel responde
                playSound('santa');
            } else {
                // Usar respuesta predefinida contextual cuando Gemini falla
                const userName = state.userName || 'Usuario';
                const predefinedResponse = getPredefinedResponse(text, userName);
                addPublicMessage(predefinedResponse, '🎅 Papá Noel');
                // Reproducir sonido cuando Papá Noel responde
                playSound('santa');
            }
        }, typingDelay);
    } catch (error) {
        console.error('Error al obtener respuesta de Papá Noel:', error);
        
        // Remover el mensaje de "escribiendo"
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            const typingMessages = Array.from(messagesList.querySelectorAll('.message-item'));
            typingMessages.forEach(msg => {
                if (msg.textContent.includes('está escribiendo')) {
                    msg.remove();
                }
            });
        }
        
        setTimeout(() => {
            // Usar respuesta predefinida contextual cuando hay error
            const userName = state.userName || 'Usuario';
            const predefinedResponse = getPredefinedResponse(text, userName);
            addPublicMessage(predefinedResponse, '🎅 Papá Noel');
        }, 500);
    }
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
    
    // Mensaje inicial de Papá Noel
    setTimeout(() => {
        const userName = state.userName || 'Usuario';
        const welcomeMessage = getPredefinedResponse('hola', userName);
        addPublicMessage(welcomeMessage, '🎅 Papá Noel');
    }, 2000);
}

// ============================================
// FUNCIONES DE GEOLOCALIZACIÓN Y PERSONALIZACIÓN
// ============================================

/**
 * Solicita el nombre del usuario
 */
function requestUserName() {
    // Siempre preguntar el nombre al ingresar (no usar localStorage para forzar pregunta)
    const name = prompt('🎅 ¡Hola! ¿Cuál es tu nombre?\n\n(Puedes dejarlo en blanco si prefieres mantenerte anónimo)');
    
    if (name && name.trim() !== '') {
        state.userName = name.trim();
        localStorage.setItem('santaTracker_userName', state.userName);
        console.log(`👋 Nombre guardado: ${state.userName}`);
        return state.userName;
    } else {
        // Si no proporciona nombre, usar uno por defecto
        state.userName = 'Operador';
        localStorage.setItem('santaTracker_userName', state.userName);
        console.log(`👋 Usando nombre por defecto: ${state.userName}`);
        return state.userName;
    }
}

/**
 * Obtiene la ubicación del usuario mediante geolocalización
 */
function getUserLocation() {
    if (!navigator.geolocation) {
        console.warn('⚠️ Geolocalización no disponible en este navegador');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.userCoordinates = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Obtener nombre de la ciudad mediante geocodificación inversa
            getCityNameFromCoordinates(state.userCoordinates.lat, state.userCoordinates.lng);
            
            console.log('📍 Ubicación detectada:', state.userCoordinates);
        },
        (error) => {
            console.warn('⚠️ No se pudo obtener la ubicación:', error.message);
            // Permitir entrada manual de ciudad
            requestUserCity();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/**
 * Obtiene el nombre de la ciudad desde coordenadas (usando API de geocodificación)
 */
async function getCityNameFromCoordinates(lat, lng) {
    try {
        // Usar API de geocodificación inversa (sin API key requerida)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const city = data.address.city || 
                        data.address.town || 
                        data.address.village || 
                        data.address.municipality ||
                        data.address.county ||
                        'Tu ciudad';
            
            const country = data.address.country || '';
            state.userCity = country ? `${city}, ${country}` : city;
            
            updateUserCityPanel();
            console.log('🏙️ Ciudad detectada:', state.userCity);
        }
    } catch (error) {
        console.warn('⚠️ Error al obtener nombre de ciudad:', error);
        requestUserCity();
    }
}

/**
 * Solicita la ciudad del usuario manualmente
 */
function requestUserCity() {
    const savedCity = localStorage.getItem('santaTracker_userCity');
    if (savedCity) {
        state.userCity = savedCity;
        updateUserCityPanel();
        return;
    }
    
    const city = prompt('🏙️ ¿En qué ciudad vives?\n\n(Ejemplo: Madrid, España o Buenos Aires, Argentina)');
    
    if (city && city.trim() !== '') {
        state.userCity = city.trim();
        localStorage.setItem('santaTracker_userCity', state.userCity);
        updateUserCityPanel();
        console.log('🏙️ Ciudad guardada:', state.userCity);
    }
}

/**
 * Calcula la distancia entre dos coordenadas (fórmula de Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

/**
 * Simula las coordenadas actuales de Papá Noel (basado en ubicación actual)
 */
function getSantaCurrentCoordinates() {
    // Por ahora, usar coordenadas aproximadas basadas en la ubicación actual
    // En producción, esto podría venir de una API del tracker
    const locationCoords = {
        'Rovaniemi, Finlandia': { lat: 66.5039, lng: 25.7294 },
        'Nueva York, USA': { lat: 40.7128, lng: -74.0060 },
        'Madrid, España': { lat: 40.4168, lng: -3.7038 },
        'Buenos Aires, Argentina': { lat: -34.6037, lng: -58.3816 },
        'México DF, México': { lat: 19.4326, lng: -99.1332 },
        'Bogotá, Colombia': { lat: 4.7110, lng: -74.0721 },
        'Santiago, Chile': { lat: -33.4489, lng: -70.6693 },
        'Lima, Perú': { lat: -12.0464, lng: -77.0428 },
    };
    
    // Intentar obtener coordenadas de la ubicación actual
    const currentLoc = state.location;
    if (locationCoords[currentLoc]) {
        return locationCoords[currentLoc];
    }
    
    // Coordenadas por defecto (Rovaniemi)
    return { lat: 66.5039, lng: 25.7294 };
}

// Estado de la cuenta regresiva
let countdownState = {
    targetTime: null,
    intervalId: null,
    lastDistance: null,
    lastSpeed: null
};

/**
 * Inicia o actualiza la cuenta regresiva
 */
function startCountdown(distance, speed) {
    const countdownEl = document.getElementById('userCityCountdown');
    if (!countdownEl) return;
    
    if (!distance || distance <= 0 || !speed || speed <= 0) {
        countdownEl.textContent = '--:--:--';
        if (countdownState.intervalId) {
            clearInterval(countdownState.intervalId);
            countdownState.intervalId = null;
        }
        return;
    }
    
    // Solo reiniciar si la distancia cambió significativamente (más del 5%)
    const distanceChanged = !countdownState.lastDistance || 
                           Math.abs(distance - countdownState.lastDistance) > (countdownState.lastDistance * 0.05);
    const speedChanged = !countdownState.lastSpeed || 
                        Math.abs(speed - countdownState.lastSpeed) > (countdownState.lastSpeed * 0.1);
    
    // Si no hay cuenta regresiva activa o cambió significativamente, reiniciar
    if (!countdownState.targetTime || distanceChanged || speedChanged) {
        // Calcular tiempo total en segundos
        const totalSeconds = Math.floor((distance / speed) * 3600);
        
        // Establecer tiempo objetivo
        countdownState.targetTime = Date.now() + (totalSeconds * 1000);
        countdownState.lastDistance = distance;
        countdownState.lastSpeed = speed;
        
        // Limpiar intervalo anterior si existe
        if (countdownState.intervalId) {
            clearInterval(countdownState.intervalId);
        }
        
        // Actualizar inmediatamente
        updateCountdownDisplay();
        
        // Actualizar cada segundo
        countdownState.intervalId = setInterval(() => {
            updateCountdownDisplay();
        }, 1000);
    }
}

/**
 * Actualiza la visualización de la cuenta regresiva
 */
function updateCountdownDisplay() {
    const countdownEl = document.getElementById('userCityCountdown');
    if (!countdownEl || !countdownState.targetTime) {
        return;
    }
    
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((countdownState.targetTime - now) / 1000));
    
    if (remaining <= 0) {
        countdownEl.textContent = '00:00:00';
        if (countdownState.intervalId) {
            clearInterval(countdownState.intervalId);
            countdownState.intervalId = null;
        }
        return;
    }
    
    // Calcular horas, minutos y segundos
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    // Formatear con ceros a la izquierda
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    countdownEl.textContent = formatted;
}

/**
 * Actualiza el panel de ciudad del usuario
 */
function updateUserCityPanel() {
    const panel = document.getElementById('userCityPanel');
    const cityNameEl = document.getElementById('userCityName');
    const distanceEl = document.getElementById('userCityDistance');
    const etaEl = document.getElementById('userCityETA');
    const countdownEl = document.getElementById('userCityCountdown');
    
    if (!panel || !cityNameEl || !distanceEl || !etaEl) return;
    
    // Verificar si estamos en modo "random" - si es así, no mostrar este panel
    const savedMode = localStorage.getItem('cityPanelMode');
    if (savedMode === 'random') {
        panel.style.display = 'none';
        return;
    }
    
    if (!state.userCity) {
        panel.style.display = 'none';
        return;
    }
    
    // Mostrar panel (modo predeterminado: "Tu Ciudad")
    panel.style.display = 'block';
    cityNameEl.textContent = state.userCity;
    
    // Calcular distancia si tenemos coordenadas
    if (state.userCoordinates) {
        const santaCoords = getSantaCurrentCoordinates();
        const distance = calculateDistance(
            state.userCoordinates.lat,
            state.userCoordinates.lng,
            santaCoords.lat,
            santaCoords.lng
        );
        
        // Mostrar distancia
        distanceEl.textContent = `${distance.toFixed(0)} km`;
        
        // Calcular tiempo estimado (asumiendo velocidad promedio)
        const avgSpeed = state.speed || CONFIG.initialSpeed; // km/h
        const hours = distance / avgSpeed;
        const minutes = Math.floor((hours % 1) * 60);
        const hoursInt = Math.floor(hours);
        
        let etaText = '';
        if (hoursInt > 0) {
            etaText = `${hoursInt}h ${minutes}m`;
        } else {
            etaText = `${minutes}m`;
        }
        
        etaEl.textContent = `⏱️ Llegada estimada: ${etaText}`;
        
        // Iniciar cuenta regresiva
        if (countdownEl) {
            startCountdown(distance, avgSpeed);
        }
    } else {
        distanceEl.textContent = 'Calculando...';
        etaEl.textContent = 'Estimando tiempo...';
        if (countdownEl) {
            countdownEl.textContent = '--:--:--';
            // Limpiar cuenta regresiva
            if (countdownState.intervalId) {
                clearInterval(countdownState.intervalId);
                countdownState.intervalId = null;
            }
        }
    }
}

/**
 * Actualiza el panel de ciudades aleatorias
 */
function updateRandomCityPanel() {
    const panel = document.getElementById('randomCityPanel');
    const cityNameEl = document.getElementById('randomCityName');
    const distanceEl = document.getElementById('randomCityDistance');
    const etaEl = document.getElementById('randomCityETA');
    const countdownEl = document.getElementById('randomCityCountdown');
    
    if (!panel || !cityNameEl || !distanceEl || !etaEl) return;
    
    // Obtener ciudad aleatoria si no hay una actual
    if (!currentRandomCity) {
        currentRandomCity = getRandomWeightedCity();
    }
    
    if (!currentRandomCity) {
        panel.style.display = 'none';
        return;
    }
    
    // Mostrar panel
    panel.style.display = 'block';
    cityNameEl.textContent = currentRandomCity.name;
    
    // Calcular distancia
    const santaCoords = getSantaCurrentCoordinates();
    const distance = calculateDistance(
        currentRandomCity.lat,
        currentRandomCity.lng,
        santaCoords.lat,
        santaCoords.lng
    );
    
    // Mostrar distancia
    distanceEl.textContent = `${distance.toFixed(0)} km`;
    
    // Calcular tiempo estimado
    const avgSpeed = state.speed || CONFIG.initialSpeed; // km/h
    const hours = distance / avgSpeed;
    const minutes = Math.floor((hours % 1) * 60);
    const hoursInt = Math.floor(hours);
    
    let etaText = '';
    if (hoursInt > 0) {
        etaText = `${hoursInt}h ${minutes}m`;
    } else {
        etaText = `${minutes}m`;
    }
    
    etaEl.textContent = `⏱️ Llegada estimada: ${etaText}`;
    
    // Iniciar cuenta regresiva
    if (countdownEl) {
        startCountdownForPanel(distance, avgSpeed, countdownEl);
    }
}

/**
 * Inicia cuenta regresiva para un panel específico
 */
function startCountdownForPanel(distance, speed, countdownEl) {
    // Limpiar cuenta regresiva anterior si existe
    if (countdownEl.dataset.intervalId) {
        clearInterval(parseInt(countdownEl.dataset.intervalId));
    }
    
    const hours = distance / speed;
    const totalSeconds = Math.floor(hours * 3600);
    let remainingSeconds = totalSeconds;
    
    const updateCountdown = () => {
        if (remainingSeconds <= 0) {
            countdownEl.textContent = '00:00:00';
            if (countdownEl.dataset.intervalId) {
                clearInterval(parseInt(countdownEl.dataset.intervalId));
            }
            return;
        }
        
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        
        countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        remainingSeconds--;
    };
    
    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    countdownEl.dataset.intervalId = intervalId.toString();
}

/**
 * Cambia entre panel de "Tu Ciudad" y panel de ciudades aleatorias
 */
function toggleCityPanels(showRandom = null) {
    const userPanel = document.getElementById('userCityPanel');
    const randomPanel = document.getElementById('randomCityPanel');
    
    if (!userPanel || !randomPanel) return;
    
    // Determinar qué panel mostrar
    const shouldShowRandom = showRandom !== null ? showRandom : 
                             (userPanel.style.display !== 'none' ? false : true);
    
    if (shouldShowRandom) {
        userPanel.style.display = 'none';
        randomPanel.style.display = 'block';
        localStorage.setItem('cityPanelMode', 'random');
        // Inicializar ciudad aleatoria si no hay
        if (!currentRandomCity) {
            currentRandomCity = getRandomWeightedCity();
        }
        updateRandomCityPanel();
        // Rotar ciudad cada 2 minutos
        if (randomCityInterval) clearInterval(randomCityInterval);
        randomCityInterval = setInterval(() => {
            currentRandomCity = getRandomWeightedCity();
            updateRandomCityPanel();
        }, 2 * 60 * 1000);
    } else {
        randomPanel.style.display = 'none';
        userPanel.style.display = state.userCity ? 'block' : 'none';
        localStorage.setItem('cityPanelMode', 'user');
        if (randomCityInterval) {
            clearInterval(randomCityInterval);
            randomCityInterval = null;
        }
    }
}

/**
 * Inicializa los botones de toggle entre paneles
 */
function initCityPanelToggle() {
    const toggleToRandom = document.getElementById('toggleToRandom');
    const toggleToUser = document.getElementById('toggleToUser');
    const userPanel = document.getElementById('userCityPanel');
    const randomPanel = document.getElementById('randomCityPanel');
    
    if (toggleToRandom) {
        toggleToRandom.addEventListener('click', () => {
            toggleCityPanels(true);
        });
    }
    
    if (toggleToUser) {
        toggleToUser.addEventListener('click', () => {
            toggleCityPanels(false);
        });
    }
    
    // Por defecto mostrar "Tu Ciudad", solo cambiar si hay modo guardado explícitamente como 'random'
    const savedMode = localStorage.getItem('cityPanelMode');
    if (savedMode === 'random') {
        toggleCityPanels(true);
    } else {
        // Por defecto: mostrar "Tu Ciudad"
        if (userPanel && randomPanel) {
            randomPanel.style.display = 'none';
            // Mostrar "Tu Ciudad" si hay ciudad del usuario
            if (state.userCity) {
                userPanel.style.display = 'block';
            }
            localStorage.setItem('cityPanelMode', 'user');
        }
    }
}

/**
 * Actualiza el nombre del operador en el centro de control
 */
function updateOperatorName() {
    const operatorEl = document.getElementById('controlOperator');
    const operatorNameEl = document.getElementById('operatorName');
    
    if (operatorEl && operatorNameEl) {
        if (state.userName) {
            operatorNameEl.textContent = state.userName;
            operatorEl.style.display = 'inline'; // Mostrar el operador
        } else {
            operatorEl.style.display = 'none'; // Ocultar si no hay nombre
        }
        operatorEl.style.display = 'block';
    }
}

/**
 * Inicializa el menú hamburguesa para móviles
 */
function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const controlPanel = document.getElementById('controlPanel');
    
    if (menuToggle && controlPanel) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            controlPanel.classList.toggle('mobile-open');
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (controlPanel.classList.contains('mobile-open') && 
                !controlPanel.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                controlPanel.classList.remove('mobile-open');
            }
        });
    }
}

/**
 * Inicializa el panel de interacción tipo acordeón para móviles
 */
function initMobileInteractionPanel() {
    const interactionToggle = document.getElementById('mobileInteractionToggle');
    const interactionPanel = document.getElementById('publicInteractionPanel');
    
    if (interactionToggle && interactionPanel) {
        interactionToggle.addEventListener('click', () => {
            interactionPanel.classList.toggle('mobile-open');
        });
        
        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (interactionPanel.classList.contains('mobile-open') && 
                !interactionPanel.contains(e.target) && 
                !interactionToggle.contains(e.target)) {
                interactionPanel.classList.remove('mobile-open');
            }
        });
    }
}

/**
 * Hace un panel arrastrable (función genérica)
 */
function makePanelDraggable(panelId) {
    const panel = document.getElementById(panelId);
    const dragHandle = panel?.querySelector('.drag-handle');
    
    if (!panel || !dragHandle) return;
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Guardar posición inicial desde localStorage
    const storageKey = panelId === 'userCityPanel' ? 'cityPanelPosition' : 'randomCityPanelPosition';
    const savedPosition = localStorage.getItem(storageKey);
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        panel.style.left = pos.x + 'px';
        panel.style.top = pos.y + 'px';
        panel.style.right = 'auto';
        xOffset = pos.x;
        yOffset = pos.y;
    }
    
    dragHandle.addEventListener('mousedown', dragStart);
    dragHandle.addEventListener('touchstart', dragStart);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
    
    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        if (e.target === dragHandle || dragHandle.contains(e.target)) {
            isDragging = true;
            panel.classList.add('dragging');
        }
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }
        
        xOffset = currentX;
        yOffset = currentY;
        
        setTranslate(currentX, currentY, panel);
    }
    
    function dragEnd() {
        if (isDragging) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            panel.classList.remove('dragging');
            
            // Guardar posición
            const rect = panel.getBoundingClientRect();
            localStorage.setItem(storageKey, JSON.stringify({
                x: rect.left,
                y: rect.top
            }));
        }
    }
    
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

/**
 * Hace el panel "Tu ciudad" arrastrable
 */
function initDraggableCityPanel() {
    makePanelDraggable('userCityPanel');
}

/**
 * Hace el panel de ciudades aleatorias arrastrable
 */
function initDraggableRandomCityPanel() {
    makePanelDraggable('randomCityPanel');
}

/**
 * Expande el panel "Tu ciudad" a pantalla completa
 */
function expandCityPanel() {
    const cityPanel = document.getElementById('userCityPanel');
    const randomCityPanel = document.getElementById('randomCityPanel');
    const activePanel = cityPanel?.style.display !== 'none' ? cityPanel : 
                       (randomCityPanel?.style.display !== 'none' ? randomCityPanel : null);
    
    if (!activePanel) return;
    
    // Reproducir sonido de expansión
    playSound('expand');
    
    activePanel.classList.add('expanded');
    
    // Volver a tamaño normal después de 8 segundos
    setTimeout(() => {
        activePanel.classList.remove('expanded');
    }, 8000);
}

/**
 * Efecto de "zumbar" toda la pantalla
 */
function shakeScreen() {
    const cityPanel = document.getElementById('userCityPanel');
    const body = document.body;
    
    if (!cityPanel) {
        console.warn('⚠️ Panel de ciudad no encontrado en shakeScreen');
        return;
    }
    
    if (cityPanel.style.display === 'none') {
        console.warn('⚠️ Panel de ciudad está oculto');
        return;
    }
    
    console.log('🔔 Aplicando zumbido intenso al panel de ciudad');
    
    // Expandir y hacer shake al panel
    cityPanel.classList.add('shaking');
    cityPanel.classList.add('expanded');
    
    // Agregar efecto de shake a toda la pantalla
    body.classList.add('shaking');
    
    // Remover clases después de la animación
    setTimeout(() => {
        cityPanel.classList.remove('shaking');
        cityPanel.classList.remove('expanded');
        body.classList.remove('shaking');
        console.log('🔔 Zumbido completado');
    }, 5000); // 5 segundos de zumbido intenso
    
    // Remover después de 3 segundos
    setTimeout(() => {
        if (cityPanel) {
            cityPanel.classList.remove('shaking');
            cityPanel.classList.remove('expanded');
        }
        body.classList.remove('shaking');
    }, 3000);
}

/**
 * Inicializa los timers para expandir el panel
 */
function initCityPanelTimers() {
    console.log('⏰ Inicializando timers del panel de ciudad...');
    
    // Expandir cada 5 minutos
    setInterval(() => {
        console.log('📢 Expandiendo panel de ciudad (cada 5 minutos)');
        expandCityPanel();
    }, 5 * 60 * 1000); // 5 minutos
    
    // Ejecutar primera expansión después de 5 minutos
    setTimeout(() => {
        console.log('📢 Primera expansión del panel de ciudad');
        expandCityPanel();
    }, 5 * 60 * 1000);
    
    // Zumbido cada 30 minutos (en los minutos 00 y 30)
    setInterval(() => {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Verificar si estamos en el minuto 00 o 30
        if ((minutes === 0 || minutes === 30) && seconds < 5) {
            console.log('🔔 Zumbido del panel de ciudad (cada 30 minutos)');
            shakeScreen();
        }
    }, 1000); // Verificar cada segundo
}

/**
 * Intenta desmutear el iframe del tracker
 */
function unmuteTracker() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Iniciando desmutear tracker',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const iframe = document.getElementById('santaTracker');
    if (!iframe) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Iframe no encontrado',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Iframe encontrado, agregando listener',data:{iframeSrc:iframe.src,iframeLoaded:iframe.contentWindow?true:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Intentar múltiples métodos para desmutear
    const tryUnmute = () => {
        try {
            // Método 1: Intentar acceder directamente al contenido
            const iframeWindow = iframe.contentWindow;
            const iframeDoc = iframe.contentDocument || iframeWindow?.document;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Intentando acceder al contenido',data:{hasWindow:!!iframeWindow,hasDoc:!!iframeDoc},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            if (iframeDoc) {
                // Buscar elementos de audio/video
                const audioElements = iframeDoc.querySelectorAll('audio, video');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Elementos de audio encontrados',data:{count:audioElements.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                
                audioElements.forEach(el => {
                    if (el.muted) {
                        el.muted = false;
                        el.volume = 1;
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Elemento desmuteado',data:{tagName:el.tagName,muted:el.muted,volume:el.volume},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                        // #endregion
                    }
                });
                
                // Buscar botones de mute
                const muteButtons = iframeDoc.querySelectorAll('[aria-label*="mute" i], [aria-label*="unmute" i], button[title*="mute" i], [data-muted], .mute-button, [class*="mute" i]');
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Botones de mute encontrados',data:{count:muteButtons.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                muteButtons.forEach(btn => {
                    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                    const title = btn.getAttribute('title')?.toLowerCase() || '';
                    const isMuted = btn.getAttribute('data-muted') === 'true' || 
                                   ariaLabel.includes('unmute') || 
                                   title.includes('unmute');
                    
                    if (isMuted) {
                        btn.click();
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Botón de mute clickeado',data:{ariaLabel,title,isMuted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
                    }
                });
            } else {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'No se puede acceder al documento (cross-origin)',data:{error:'Cross-origin restriction'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
            }
        } catch (e) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6416de3c-af16-442d-aeb0-b4c97cbdf40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:unmuteTracker',message:'Error al desmutear',data:{error:e.message,errorName:e.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            console.log('Error al desmutear:', e.message);
        }
    };
    
    // Intentar inmediatamente si ya está cargado
    if (iframe.contentWindow) {
        setTimeout(tryUnmute, 1000);
    }
    
    // Intentar cuando el iframe cargue
    iframe.addEventListener('load', () => {
        setTimeout(tryUnmute, 2000);
        setTimeout(tryUnmute, 5000); // Segundo intento después de 5 segundos
    });
    
    // Intentar periódicamente (cada 10 segundos durante el primer minuto)
    let attempts = 0;
    const periodicAttempt = setInterval(() => {
        attempts++;
        if (attempts > 6) { // 6 intentos = 60 segundos
            clearInterval(periodicAttempt);
        }
        tryUnmute();
    }, 10000);
}


/**
 * Inicializa la personalización del usuario
 */
function initUserPersonalization() {
    // Solicitar nombre
    const userName = requestUserName();
    
    // Actualizar nombre del operador
    if (userName) {
        updateOperatorName();
    }
    
    // Intentar obtener ubicación
    getUserLocation();
    
    // Actualizar panel cada 10 segundos (más frecuente para cuenta regresiva)
    setInterval(() => {
        updateUserCityPanel();
    }, 10000);
    
    // La cuenta regresiva se actualiza automáticamente cada segundo
    // No necesitamos recalcularla aquí, solo se reinicia cuando cambia la distancia
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
    // Filtrar mensajes según disponibilidad
    const availableNames = getRandomChatNames(5);
    const hasNames = availableNames.length > 0;
    const hasUserName = state.userName && state.userName.trim() !== '';
    const hasUserCity = state.userCity && state.userCity.trim() !== '';
    
    // Filtrar mensajes disponibles
    let availableMessages = SANTA_MESSAGES;
    
    // Priorizar mensajes personalizados si tenemos nombre de usuario
    if (hasUserName) {
        const personalMessages = SANTA_MESSAGES.filter(msg => 
            msg.type === 'personal' && 
            (!msg.includeCity || hasUserCity)
        );
        
        // 60% de probabilidad de usar mensaje personalizado si está disponible
        if (personalMessages.length > 0 && Math.random() < 0.6) {
            availableMessages = personalMessages;
        }
    }
    
    // Si no hay nombres del chat, filtrar mensajes que no los requieren
    if (!hasNames && !hasUserName) {
        availableMessages = availableMessages.filter(msg => 
            !msg.includeNames && !msg.includeUserName
        );
    }
    
    // Seleccionar mensaje aleatorio
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    const messageTemplate = availableMessages[randomIndex];
    
    // Procesar el mensaje
    let message = messageTemplate.message;
    let subtitle = messageTemplate.subtitle;
    
    // Reemplazar nombre del usuario si está disponible
    if (hasUserName && messageTemplate.includeUserName) {
        message = message.replace(/{userName}/g, state.userName);
        subtitle = subtitle.replace(/{userName}/g, state.userName);
    }
    
    // Reemplazar ciudad del usuario si está disponible
    if (hasUserCity && messageTemplate.includeCity) {
        message = message.replace(/{userCity}/g, state.userCity);
        subtitle = subtitle.replace(/{userCity}/g, state.userCity);
    }
    
    // Si el mensaje requiere nombres del chat y tenemos disponibles
    if (messageTemplate.includeNames && hasNames) {
        const nameCount = Math.min(
            Math.max(messageTemplate.minNames || 1, 1),
            Math.min(messageTemplate.maxNames || 3, availableNames.length)
        );
        const selectedNames = availableNames.slice(0, nameCount);
        const formattedNames = formatNames(selectedNames);
        message = message.replace('{names}', formattedNames);
    }
    
    // Agregar ciudad a mensajes que no la tienen pero podrían tenerla
    if (hasUserCity && !messageTemplate.includeCity && Math.random() < 0.3) {
        subtitle += ` ¡Desde ${state.userCity}!`;
    }
    
    return {
        message: message,
        subtitle: subtitle
    };
}

/**
 * Muestra la aparición grande de Papá Noel
 */
/**
 * Reproduce un sonido navideño
 */
function playSound(type = 'notification') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'santa') {
            // Sonido más alegre para apariciones de Santa
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(554, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (type === 'expand') {
            // Sonido de expansión
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } else {
            // Sonido de notificación simple
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    } catch (e) {
        console.log('No se pudo reproducir sonido:', e);
    }
}

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
    
    // Reproducir sonido
    playSound('santa');
    
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
    
    // Primera aparición después de 20 segundos (reducido)
    setTimeout(() => {
        showSantaAppearance();
    }, 20000);
    
    // Inicializar personalización del usuario
    initUserPersonalization();
    
    // Inicializar menú hamburguesa para móviles
    initMobileMenu();
    
    // Inicializar panel de interacción tipo acordeón para móviles
    initMobileInteractionPanel();
    
    
    // Inicializar panel arrastrable "Tu ciudad"
    setTimeout(() => {
        initDraggableCityPanel();
        initDraggableRandomCityPanel();
        initCityPanelToggle();
        initCityPanelTimers(); // Inicializar timers de expansión
    }, 1000);
    
    // Intentar desmutear el tracker
    unmuteTracker();
    
    // Actualizar panel de ciudad cada vez que cambie la ubicación
    setInterval(() => {
        updateUserCityPanel();
        updateRandomCityPanel();
    }, 10000); // Cada 10 segundos
    
    // Intentar extraer ubicación del tracker de Google periódicamente
    setInterval(() => {
        tryExtractTrackerLocation();
    }, 5000); // Cada 5 segundos
    
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
