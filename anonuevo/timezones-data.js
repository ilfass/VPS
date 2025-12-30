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
const WEBCAMS = [
    // América del Norte
    {
        id: 'times-square',
        name: 'Times Square, New York',
        timezone: -5,
        city: 'New York',
        country: 'USA',
        embed: 'https://www.earthcam.com/widgets/timessquare/?cam=tsrobo1',
        type: 'iframe'
    },
    {
        id: 'miami',
        name: 'Miami Beach, Florida',
        timezone: -5,
        city: 'Miami',
        country: 'USA',
        embed: 'https://www.earthcam.com/widgets/miamibeach/?cam=miamirobo1',
        type: 'iframe'
    },
    {
        id: 'los-angeles',
        name: 'Los Angeles, California',
        timezone: -8,
        city: 'Los Angeles',
        country: 'USA',
        embed: 'https://www.earthcam.com/widgets/hollywood/?cam=hollywoodrobo1',
        type: 'iframe'
    },
    {
        id: 'chicago',
        name: 'Chicago, Illinois',
        timezone: -6,
        city: 'Chicago',
        country: 'USA',
        embed: 'https://www.earthcam.com/widgets/chicago/?cam=chicagorobo1',
        type: 'iframe'
    },
    {
        id: 'toronto',
        name: 'Toronto, Canada',
        timezone: -5,
        city: 'Toronto',
        country: 'Canada',
        embed: 'https://www.earthcam.com/widgets/toronto/?cam=torontorobo1',
        type: 'iframe'
    },
    // América Central y Caribe
    {
        id: 'mexico-city',
        name: 'Ciudad de México',
        timezone: -6,
        city: 'Ciudad de México',
        country: 'México',
        embed: 'https://www.skylinewebcams.com/en/webcam/mexico/distrito-federal/mexico-city/zocalo.html',
        type: 'iframe'
    },
    {
        id: 'cancun',
        name: 'Cancún, México',
        timezone: -5,
        city: 'Cancún',
        country: 'México',
        embed: 'https://www.skylinewebcams.com/en/webcam/mexico/quintana-roo/cancun/beach.html',
        type: 'iframe'
    },
    // América del Sur
    {
        id: 'buenos-aires',
        name: 'Buenos Aires, Argentina',
        timezone: -3,
        city: 'Buenos Aires',
        country: 'Argentina',
        embed: 'https://www.skylinewebcams.com/en/webcam/argentina/buenos-aires/buenos-aires/obelisk.html',
        type: 'iframe'
    },
    {
        id: 'sao-paulo',
        name: 'São Paulo, Brazil',
        timezone: -3,
        city: 'São Paulo',
        country: 'Brazil',
        embed: 'https://www.skylinewebcams.com/en/webcam/brazil/sao-paulo/sao-paulo/paulista-avenue.html',
        type: 'iframe'
    },
    {
        id: 'rio',
        name: 'Rio de Janeiro, Brazil',
        timezone: -3,
        city: 'Rio de Janeiro',
        country: 'Brazil',
        embed: 'https://www.skylinewebcams.com/en/webcam/brazil/rio-de-janeiro/rio-de-janeiro/copacabana.html',
        type: 'iframe'
    },
    {
        id: 'lima',
        name: 'Lima, Perú',
        timezone: -5,
        city: 'Lima',
        country: 'Perú',
        embed: 'https://www.skylinewebcams.com/en/webcam/peru/lima/lima/plaza-mayor.html',
        type: 'iframe'
    },
    {
        id: 'santiago',
        name: 'Santiago, Chile',
        timezone: -3,
        city: 'Santiago',
        country: 'Chile',
        embed: 'https://www.skylinewebcams.com/en/webcam/chile/santiago/santiago/plaza-armas.html',
        type: 'iframe'
    },
    {
        id: 'bogota',
        name: 'Bogotá, Colombia',
        timezone: -5,
        city: 'Bogotá',
        country: 'Colombia',
        embed: 'https://www.skylinewebcams.com/en/webcam/colombia/bogota/bogota/plaza-bolivar.html',
        type: 'iframe'
    },
    // Europa
    {
        id: 'london',
        name: 'London, UK',
        timezone: 0,
        city: 'London',
        country: 'UK',
        embed: 'https://www.earthcam.com/widgets/london/?cam=londonrobo1',
        type: 'iframe'
    },
    {
        id: 'paris',
        name: 'Paris, France',
        timezone: 1,
        city: 'Paris',
        country: 'France',
        embed: 'https://www.earthcam.com/widgets/paris/?cam=parisrobo1',
        type: 'iframe'
    },
    // Asia
    {
        id: 'tokyo',
        name: 'Tokyo, Japan',
        timezone: 9,
        city: 'Tokyo',
        country: 'Japan',
        embed: 'https://www.earthcam.com/widgets/tokyo/?cam=tokyorobo1',
        type: 'iframe'
    },
    {
        id: 'sydney',
        name: 'Sydney, Australia',
        timezone: 10,
        city: 'Sydney',
        country: 'Australia',
        embed: 'https://www.earthcam.com/widgets/sydney/?cam=sydneyrobo1',
        type: 'iframe'
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
