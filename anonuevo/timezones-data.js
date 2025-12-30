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
const WEBCAMS = [
    {
        id: 'times-square',
        name: 'Times Square, New York',
        url: 'https://www.earthcam.com/usa/newyork/timessquare/?cam=tsrobo1',
        timezone: -5,
        city: 'New York',
        country: 'USA',
        embed: 'https://www.earthcam.com/widgets/timessquare/?cam=tsrobo1'
    },
    {
        id: 'london',
        name: 'London, UK',
        url: 'https://www.skylinewebcams.com/en/webcam/united-kingdom/england/london/london-eye.html',
        timezone: 0,
        city: 'London',
        country: 'UK',
        embed: 'https://www.skylinewebcams.com/en/webcam/united-kingdom/england/london/london-eye.html'
    },
    {
        id: 'tokyo',
        name: 'Tokyo, Japan',
        url: 'https://www.skylinewebcams.com/en/webcam/japan/tokyo/tokyo-shibuya.html',
        timezone: 9,
        city: 'Tokyo',
        country: 'Japan',
        embed: 'https://www.skylinewebcams.com/en/webcam/japan/tokyo/tokyo-shibuya.html'
    },
    {
        id: 'sydney',
        name: 'Sydney, Australia',
        url: 'https://www.webcamtaxi.com/en/australia/new-south-wales/sydney-harbour-bridge.html',
        timezone: 10,
        city: 'Sydney',
        country: 'Australia',
        embed: 'https://www.webcamtaxi.com/en/australia/new-south-wales/sydney-harbour-bridge.html'
    },
    {
        id: 'paris',
        name: 'Paris, France',
        url: 'https://www.skylinewebcams.com/en/webcam/france/ile-de-france/paris/eiffel-tower.html',
        timezone: 1,
        city: 'Paris',
        country: 'France',
        embed: 'https://www.skylinewebcams.com/en/webcam/france/ile-de-france/paris/eiffel-tower.html'
    },
    {
        id: 'dubai',
        name: 'Dubai, UAE',
        url: 'https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai-burj-khalifa.html',
        timezone: 4,
        city: 'Dubai',
        country: 'UAE',
        embed: 'https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai-burj-khalifa.html'
    },
    {
        id: 'rio',
        name: 'Rio de Janeiro, Brazil',
        url: 'https://www.skylinewebcams.com/en/webcam/brazil/rio-de-janeiro/rio-de-janeiro-copacabana.html',
        timezone: -3,
        city: 'Rio de Janeiro',
        country: 'Brazil',
        embed: 'https://www.skylinewebcams.com/en/webcam/brazil/rio-de-janeiro/rio-de-janeiro-copacabana.html'
    },
    {
        id: 'moscow',
        name: 'Moscow, Russia',
        url: 'https://www.skylinewebcams.com/en/webcam/russia/moscow/moscow-red-square.html',
        timezone: 3,
        city: 'Moscow',
        country: 'Russia',
        embed: 'https://www.skylinewebcams.com/en/webcam/russia/moscow/moscow-red-square.html'
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
