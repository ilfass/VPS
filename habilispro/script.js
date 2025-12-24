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
 * Actualiza la ubicación mostrada
 */
function updateLocation() {
    const element = document.getElementById('currentLocation');
    if (element) {
        element.textContent = state.location;
    }
    // Actualizar panel de ciudad del usuario cuando cambie la ubicación de Papá Noel
    updateUserCityPanel();
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
// FUNCIONES DE GEOLOCALIZACIÓN Y PERSONALIZACIÓN
// ============================================

/**
 * Solicita el nombre del usuario
 */
function requestUserName() {
    const savedName = localStorage.getItem('santaTracker_userName');
    if (savedName) {
        state.userName = savedName;
        return savedName;
    }
    
    // Solicitar nombre con un prompt amigable
    const name = prompt('🎅 ¡Hola! ¿Cuál es tu nombre?\n\n(Puedes dejarlo en blanco si prefieres mantenerte anónimo)');
    
    if (name && name.trim() !== '') {
        state.userName = name.trim();
        localStorage.setItem('santaTracker_userName', state.userName);
        console.log(`👋 Nombre guardado: ${state.userName}`);
        return state.userName;
    }
    
    return null;
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

/**
 * Calcula y actualiza la cuenta regresiva
 */
function updateCountdown(distance, speed) {
    const countdownEl = document.getElementById('userCityCountdown');
    if (!countdownEl) return;
    
    if (!distance || distance <= 0) {
        countdownEl.textContent = '--:--:--';
        return;
    }
    
    // Calcular tiempo en segundos
    const totalSeconds = Math.floor((distance / speed) * 3600);
    
    // Calcular horas, minutos y segundos
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
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
    
    if (!state.userCity) {
        panel.style.display = 'none';
        return;
    }
    
    // Mostrar panel
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
        
        // Actualizar cuenta regresiva
        if (countdownEl) {
            updateCountdown(distance, avgSpeed);
        }
    } else {
        distanceEl.textContent = 'Calculando...';
        etaEl.textContent = 'Estimando tiempo...';
        if (countdownEl) {
            countdownEl.textContent = '--:--:--';
        }
    }
}

/**
 * Actualiza el nombre del operador en el centro de control
 */
function updateOperatorName() {
    const operatorEl = document.getElementById('controlOperator');
    const operatorNameEl = document.getElementById('operatorName');
    
    if (operatorEl && operatorNameEl && state.userName) {
        operatorNameEl.textContent = state.userName;
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
 * Hace el panel "Tu ciudad" arrastrable
 */
function initDraggableCityPanel() {
    const cityPanel = document.getElementById('userCityPanel');
    const dragHandle = cityPanel?.querySelector('.drag-handle');
    
    if (!cityPanel || !dragHandle) return;
    
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Guardar posición inicial desde localStorage
    const savedPosition = localStorage.getItem('cityPanelPosition');
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        cityPanel.style.left = pos.x + 'px';
        cityPanel.style.top = pos.y + 'px';
        cityPanel.style.right = 'auto';
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
            cityPanel.classList.add('dragging');
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
        
        setTranslate(currentX, currentY, cityPanel);
    }
    
    function dragEnd() {
        if (isDragging) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            cityPanel.classList.remove('dragging');
            
            // Guardar posición
            const rect = cityPanel.getBoundingClientRect();
            localStorage.setItem('cityPanelPosition', JSON.stringify({
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
 * Intenta desmutear el iframe del tracker
 */
function unmuteTracker() {
    const iframe = document.getElementById('santaTracker');
    if (!iframe) return;
    
    // Intentar desmutear después de que el iframe cargue
    iframe.addEventListener('load', () => {
        try {
            // Nota: Los iframes tienen restricciones de seguridad, esto puede no funcionar
            // pero intentamos acceder al contenido si es posible
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
                // Intentar encontrar y hacer clic en el botón de mute si existe
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframeWindow.document;
                        if (iframeDoc) {
                            // Buscar botones de mute/unmute
                            const muteButtons = iframeDoc.querySelectorAll('[aria-label*="mute"], [aria-label*="Mute"], button[title*="mute"], button[title*="Mute"]');
                            muteButtons.forEach(btn => {
                                if (btn.getAttribute('aria-label')?.toLowerCase().includes('mute') ||
                                    btn.getAttribute('title')?.toLowerCase().includes('mute')) {
                                    btn.click();
                                }
                            });
                        }
                    } catch (e) {
                        // Cross-origin restriction - no se puede acceder
                        console.log('No se puede acceder al contenido del iframe (restricción de seguridad)');
                    }
                }, 2000);
            }
        } catch (e) {
            console.log('No se puede desmutear el iframe automáticamente debido a restricciones de seguridad');
        }
    });
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
    
    // Actualizar cuenta regresiva cada segundo
    setInterval(() => {
        if (state.userCoordinates) {
            const santaCoords = getSantaCurrentCoordinates();
            const distance = calculateDistance(
                state.userCoordinates.lat,
                state.userCoordinates.lng,
                santaCoords.lat,
                santaCoords.lng
            );
            const avgSpeed = state.speed || CONFIG.initialSpeed;
            updateCountdown(distance, avgSpeed);
        }
    }, 1000);
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
    }, 1000);
    
    // Intentar desmutear el tracker
    unmuteTracker();
    
    // Actualizar panel de ciudad cada vez que cambie la ubicación
    setInterval(() => {
        updateUserCityPanel();
    }, 10000); // Cada 10 segundos
    
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
