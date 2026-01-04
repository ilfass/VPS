// ============================================
// DATOS DE HUSOS HORARIOS REALES
// Basado en datos geográficos reales de zonas horarias
// ============================================

// Mapeo de offsets UTC a coordenadas aproximadas de meridianos
// Cada huso horario está centrado en un meridiano cada 15 grados
const TIMEZONE_MERIDIANS = {
    14: 150, // UTC+14: 150°W (Line Islands)
    13: 165, // UTC+13: 165°W (Tonga, Samoa)
    12: 180, // UTC+12: 180° (Date Line)
    11: 165, // UTC+11: 165°E
    10: 150, // UTC+10: 150°E (Australia)
    9: 135,  // UTC+9: 135°E (Japan, Korea)
    8: 120,  // UTC+8: 120°E (China, Singapore)
    7: 105,  // UTC+7: 105°E (Thailand, Vietnam)
    6: 90,   // UTC+6: 90°E (Bangladesh, Kazakhstan)
    5: 75,   // UTC+5: 75°E (Pakistan, India)
    4: 60,   // UTC+4: 60°E (UAE, Mauritius)
    3: 45,   // UTC+3: 45°E (Moscow, Turkey)
    2: 30,   // UTC+2: 30°E (South Africa, Egypt)
    1: 15,   // UTC+1: 15°E (Central Europe)
    0: 0,    // UTC: 0° (Greenwich)
    '-1': -15,  // UTC-1: 15°W (Cape Verde)
    '-2': -30,  // UTC-2: 30°W
    '-3': -45,  // UTC-3: 45°W (Brazil)
    '-4': -60,  // UTC-4: 60°W (Venezuela, Bolivia)
    '-5': -75,  // UTC-5: 75°W (US East, Colombia)
    '-6': -90,  // UTC-6: 90°W (US Central, Mexico)
    '-7': -105, // UTC-7: 105°W (US Mountain)
    '-8': -120, // UTC-8: 120°W (US Pacific, LA)
    '-9': -135, // UTC-9: 135°W (Alaska)
    '-10': -150, // UTC-10: 150°W (Hawaii)
    '-11': -165, // UTC-11: 165°W
    '-12': -180  // UTC-12: 180°W
};

// Ciudades principales por huso horario
const TIMEZONE_CITIES = {
    14: ['Kiritimati', 'Line Islands'],
    13: ['Nuku\'alofa', 'Tonga', 'Apia', 'Samoa'],
    12: ['Auckland', 'New Zealand', 'Fiji', 'Suva'],
    11: ['Nouméa', 'New Caledonia', 'Port Vila', 'Vanuatu'],
    10: ['Sydney', 'Australia', 'Melbourne', 'Brisbane'],
    9: ['Tokyo', 'Japan', 'Seoul', 'South Korea'],
    8: ['Beijing', 'China', 'Singapore', 'Manila', 'Philippines'],
    7: ['Bangkok', 'Thailand', 'Hanoi', 'Vietnam', 'Jakarta', 'Indonesia'],
    6: ['Dhaka', 'Bangladesh', 'Almaty', 'Kazakhstan'],
    5: ['Karachi', 'Pakistan', 'Mumbai', 'India'],
    4: ['Dubai', 'UAE', 'Mauritius'],
    3: ['Moscow', 'Russia', 'Istanbul', 'Turkey'],
    2: ['Cairo', 'Egypt', 'Johannesburg', 'South Africa'],
    1: ['Paris', 'France', 'Berlin', 'Germany', 'Madrid', 'Spain'],
    0: ['London', 'UK', 'Lisbon', 'Portugal'],
    '-1': ['Praia', 'Cape Verde'],
    '-2': ['Mid-Atlantic'],
    '-3': ['São Paulo', 'Brazil', 'Buenos Aires', 'Argentina'],
    '-4': ['Caracas', 'Venezuela', 'La Paz', 'Bolivia'],
    '-5': ['New York', 'USA', 'Bogotá', 'Colombia'],
    '-6': ['Chicago', 'USA', 'Mexico City', 'Mexico'],
    '-7': ['Denver', 'USA', 'Phoenix', 'USA'],
    '-8': ['Los Angeles', 'USA', 'San Francisco', 'USA', 'Vancouver', 'Canada'],
    '-9': ['Anchorage', 'Alaska'],
    '-10': ['Honolulu', 'Hawaii'],
    '-11': ['Samoa (US)'],
    '-12': ['Baker Island']
};

// Cámaras web en vivo de diferentes lugares del mundo
// Usando servicios públicos de webcams que permiten embed
// Nota: Algunas cámaras pueden requerir HTTPS o tener restricciones de CORS
const WEBCAMS = [
    // América del Norte
    {
        id: 'times-square',
        name: 'Times Square, New York',
        timezone: -5,
        city: 'New York',
        country: 'USA',
        url: 'https://www.earthcam.com/usa/newyork/timessquare/?cam=tsrobo1',
        embed: null, // Earthcam requiere autenticación para embed
        type: 'link',
        image: 'https://www.earthcam.com/cams/newyork/timessquare/?cam=tsrobo1'
    },
    {
        id: 'miami',
        name: 'Miami Beach, Florida',
        timezone: -5,
        city: 'Miami',
        country: 'USA',
        url: 'https://www.earthcam.com/usa/florida/miamibeach/?cam=miamirobo1',
        embed: null,
        type: 'link'
    },
    {
        id: 'los-angeles',
        name: 'Los Angeles, California',
        timezone: -8,
        city: 'Los Angeles',
        country: 'USA',
        url: 'https://www.earthcam.com/usa/california/hollywood/?cam=hollywoodrobo1',
        embed: null,
        type: 'link'
    },
    {
        id: 'chicago',
        name: 'Chicago, Illinois',
        timezone: -6,
        city: 'Chicago',
        country: 'USA',
        url: 'https://www.earthcam.com/usa/illinois/chicago/?cam=chicagorobo1',
        embed: null,
        type: 'link'
    },
    {
        id: 'toronto',
        name: 'Toronto, Canada',
        timezone: -5,
        city: 'Toronto',
        country: 'Canada',
        url: 'https://www.earthcam.com/canada/toronto/?cam=torontorobo1',
        embed: null,
        type: 'link'
    },
    // América Central y Caribe
    {
        id: 'mexico-city',
        name: 'Ciudad de México',
        timezone: -6,
        city: 'Ciudad de México',
        country: 'México',
        url: 'https://www.skylinewebcams.com/en/webcam/mexico/distrito-federal/mexico-city/zocalo.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'cancun',
        name: 'Cancún, México',
        timezone: -5,
        city: 'Cancún',
        country: 'México',
        url: 'https://www.skylinewebcams.com/en/webcam/mexico/quintana-roo/cancun/beach.html',
        embed: null,
        type: 'link'
    },
    // América del Sur
    {
        id: 'buenos-aires',
        name: 'Buenos Aires, Argentina',
        timezone: -3,
        city: 'Buenos Aires',
        country: 'Argentina',
        url: 'https://www.skylinewebcams.com/en/webcam/argentina/buenos-aires/buenos-aires/obelisk.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'sao-paulo',
        name: 'São Paulo, Brazil',
        timezone: -3,
        city: 'São Paulo',
        country: 'Brazil',
        url: 'https://www.skylinewebcams.com/en/webcam/brazil/sao-paulo/sao-paulo/paulista-avenue.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'rio',
        name: 'Rio de Janeiro, Brazil',
        timezone: -3,
        city: 'Rio de Janeiro',
        country: 'Brazil',
        url: 'https://www.skylinewebcams.com/en/webcam/brazil/rio-de-janeiro/rio-de-janeiro/copacabana.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'lima',
        name: 'Lima, Perú',
        timezone: -5,
        city: 'Lima',
        country: 'Perú',
        url: 'https://www.skylinewebcams.com/en/webcam/peru/lima/lima/plaza-mayor.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'santiago',
        name: 'Santiago, Chile',
        timezone: -3,
        city: 'Santiago',
        country: 'Chile',
        url: 'https://www.skylinewebcams.com/en/webcam/chile/santiago/santiago/plaza-armas.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'bogota',
        name: 'Bogotá, Colombia',
        timezone: -5,
        city: 'Bogotá',
        country: 'Colombia',
        url: 'https://www.skylinewebcams.com/en/webcam/colombia/bogota/bogota/plaza-bolivar.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'caracas',
        name: 'Caracas, Venezuela',
        timezone: -4,
        city: 'Caracas',
        country: 'Venezuela',
        url: 'https://www.skylinewebcams.com/en/webcam/venezuela/caracas/caracas.html',
        embed: null,
        type: 'link'
    },
    {
        id: 'quito',
        name: 'Quito, Ecuador',
        timezone: -5,
        city: 'Quito',
        country: 'Ecuador',
        url: 'https://www.skylinewebcams.com/en/webcam/ecuador/quito/quito.html',
        embed: null,
        type: 'link'
    },
    // Europa
    {
        id: 'london',
        name: 'London, UK',
        timezone: 0,
        city: 'London',
        country: 'UK',
        url: 'https://www.earthcam.com/world/england/london/?cam=londonrobo1',
        embed: null,
        type: 'link'
    },
    {
        id: 'paris',
        name: 'Paris, France',
        timezone: 1,
        city: 'Paris',
        country: 'France',
        url: 'https://www.earthcam.com/world/france/paris/?cam=parisrobo1',
        embed: null,
        type: 'link'
    },
    // Asia
    {
        id: 'tokyo',
        name: 'Tokyo, Japan',
        timezone: 9,
        city: 'Tokyo',
        country: 'Japan',
        url: 'https://www.earthcam.com/world/japan/tokyo/?cam=tokyorobo1',
        embed: null,
        type: 'link'
    },
    {
        id: 'sydney',
        name: 'Sydney, Australia',
        timezone: 10,
        city: 'Sydney',
        country: 'Australia',
        url: 'https://www.earthcam.com/world/australia/sydney/?cam=sydneyrobo1',
        embed: null,
        type: 'link'
    }
];

// Función para obtener el offset UTC de una longitud
function getTimezoneFromLongitude(longitude) {
    // Cada huso horario tiene 15 grados de ancho
    // UTC+0 está centrado en 0° (Greenwich)
    const offset = Math.round(longitude / 15);
    return offset;
}

// Función para obtener ciudades de un offset UTC
function getCitiesForOffset(offset) {
    return TIMEZONE_CITIES[offset] || TIMEZONE_CITIES[String(offset)] || [];
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIMEZONE_MERIDIANS,
        TIMEZONE_CITIES,
        WEBCAMS,
        getTimezoneFromLongitude,
        getCitiesForOffset
    };
}
