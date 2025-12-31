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
    mapDuplicated: false,
    highlightedCountries: new Set(),
    countriesAtMidnight: new Set(), // Países que están en medianoche
    lastCelebratedCountry: null, // Último país que celebró
    lastCelebrationTime: 0, // Timestamp de la última celebración
    countryInfoCache: new Map(), // Cache de información de países
    countryTimezoneCache: new Map(), // Cache de zonas horarias de países
    currentUtterance: null, // Utterance actual para evitar cortes
    isSpeaking: false, // Flag para saber si está hablando
    pendingMessage: null, // Mensaje pendiente en cola
    worldTimes: new Map() // Cache de horas del mundo
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎆 Inicializando Año Nuevo Global 2025');

    // Verificar que los elementos del DOM existan
    const mapContainer = document.getElementById('highmapsPlanisphere');
    const utcTimeEl = document.getElementById('utcTime');
    const userTimeEl = document.getElementById('userTime');

    console.log('📋 Verificando elementos del DOM:');
    console.log('  - highmapsPlanisphere:', mapContainer ? '✅' : '❌');
    console.log('  - utcTime:', utcTimeEl ? '✅' : '❌');
    console.log('  - userTime:', userTimeEl ? '✅' : '❌');

    // Detectar zona horaria del usuario
    detectUserTimezone();

    // Inicializar Highmaps (planisferio como 24timezones.com)
    initializeMapbox(); // Función renombrada pero ahora usa Highmaps

    // Inicializar línea de medianoche
    initializeMidnightLine();
    initializeTimeDisplay();
    initializeCountdown();
    initializeVoiceSystem();
    initializeVisualEffects();
    initializeBackgroundAudio();
    setupMouthSync(); // Configurar sincronización de boca
    animatePresenterAvatar(); // Inicializar animación facial con IA
    initializeAIPresenter();
    initializeDynamicFeatures();
    initializeWorldTimes(); // Inicializar obtención de horas del mundo
    initializeNextCountryPanel(); // Inicializar panel del próximo país
    // initializeUserLocation(); // Función no implementada aún

    // Actualizar cada segundo
    setInterval(updateAll, 1000);

    // Verificar mensajes de voz cada minuto
    setInterval(checkVoiceMessage, 60000);

    // Actualizar mapa cada segundo (más fluido)
    setInterval(updateWorldMap, 1000);

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

let mapInitAttempts = 0;
const MAX_MAP_INIT_ATTEMPTS = 20;

function initializeMapbox() {
    // Inicializar Highmaps en lugar de Mapbox (como 24timezones.com)
    const mapContainer = document.getElementById('highmapsPlanisphere');
    if (!mapContainer) {
        console.warn('⚠️ Contenedor de Highmaps no encontrado');
        return;
    }

    mapInitAttempts++;

    // Verificar que Highmaps esté disponible
    if (typeof Highcharts === 'undefined' || !Highcharts.maps) {
        if (mapInitAttempts < MAX_MAP_INIT_ATTEMPTS) {
            console.warn(`⚠️ Highmaps no está cargado, reintentando... (${mapInitAttempts}/${MAX_MAP_INIT_ATTEMPTS})`);
            setTimeout(initializeMapbox, 1000); // Reintentar después de 1 segundo
        } else {
            console.error('❌ No se pudo cargar Highmaps después de varios intentos');
        }
        return;
    }

    // Verificar que el mapa esté disponible (puede tardar en cargar)
    // El mapa puede estar en diferentes formatos según la versión de Highmaps
    const mapKeys = Object.keys(Highcharts.maps || {});
    const worldMap = Highcharts.maps['custom/world'] || Highcharts.maps['world'] || Highcharts.maps[mapKeys.find(k => k.toLowerCase().includes('world'))];

    if (!worldMap) {
        if (mapInitAttempts < MAX_MAP_INIT_ATTEMPTS) {
            console.warn(`⚠️ Mapa del mundo no disponible aún, reintentando... (${mapInitAttempts}/${MAX_MAP_INIT_ATTEMPTS})`);
            console.log('📊 Mapas disponibles:', mapKeys);
            setTimeout(initializeMapbox, 500); // Reintentar después de 0.5 segundos
        } else {
            console.error('❌ No se pudo cargar el mapa del mundo después de varios intentos');
            console.log('📊 Mapas disponibles:', mapKeys);
        }
        return;
    }

    mapInitAttempts = 0; // Resetear contador al éxito

    try {

        console.log('🗺️ Inicializando planisferio con Highmaps...');
        console.log('📊 Datos del mapa disponibles:', Object.keys(Highcharts.maps));

        console.log('🗺️ Inicializando planisferio con Highmaps...');
        console.log('📊 Mapa encontrado:', worldMap ? 'Sí' : 'No');

        // Crear mapa con Highmaps (similar a 24timezones.com)
        state.highmapsChart = Highcharts.mapChart('highmapsPlanisphere', {
            chart: {
                backgroundColor: 'transparent',
                map: worldMap,
                animation: false,
                height: window.innerHeight,
                width: window.innerWidth,
                spacing: [0, 0, 0, 0],
                plotBackgroundColor: 'transparent',
                events: {
                    load: function () {
                        // Agregar tooltips personalizados después de cargar
                        const series = this.series[0];
                        if (series && series.points) {
                            series.points.forEach(point => {
                                if (point.graphic && point.graphic.element) {
                                    const element = point.graphic.element;
                                    const countryName = point.name || point.properties?.name || point.options?.name || 'País desconocido';

                                    // Agregar tooltip personalizado
                                    element.addEventListener('mouseenter', (e) => {
                                        showCountryTooltip(e, countryName, point);
                                    });

                                    element.addEventListener('mouseleave', () => {
                                        hideCountryTooltip();
                                    });
                                }
                            });
                        }
                    }
                }
            },
            title: {
                text: ''
            },
            mapNavigation: {
                enabled: false
            },
            colorAxis: {
                enabled: false
            },
            legend: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                useHTML: true,
                formatter: function () {
                    const countryName = this.point.name || this.point.properties?.name || 'País desconocido';
                    const now = new Date();

                    // Calcular hora aproximada del país basándose en su longitud
                    let countryLongitude = null;
                    if (this.point.properties && this.point.properties.lon) {
                        countryLongitude = this.point.properties.lon;
                    } else if (this.point.geometry && this.point.geometry.coordinates) {
                        const coords = this.point.geometry.coordinates;
                        let sumLon = 0;
                        let count = 0;
                        const extractLongitude = (arr) => {
                            if (Array.isArray(arr[0])) {
                                arr.forEach(sub => extractLongitude(sub));
                            } else if (arr.length >= 2) {
                                sumLon += arr[0];
                                count++;
                            }
                        };
                        extractLongitude(coords);
                        if (count > 0) {
                            countryLongitude = sumLon / count;
                        }
                    }

                    let timeInfo = '';
                    let midnightInfo = '';

                    if (countryLongitude !== null) {
                        // Normalizar longitud
                        while (countryLongitude > 180) countryLongitude -= 360;
                        while (countryLongitude < -180) countryLongitude += 360;

                        // Obtener timezone real del país (síncrono)
                        const countryTimezone = getCountryTimezoneSync(countryName);
                        let countryHour, countryMinute;

                        if (countryTimezone) {
                            try {
                                const formatter = new Intl.DateTimeFormat('es-ES', {
                                    timeZone: countryTimezone,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                });
                                const parts = formatter.formatToParts(now);
                                countryHour = parseInt(parts.find(p => p.type === 'hour').value);
                                countryMinute = parseInt(parts.find(p => p.type === 'minute').value);
                            } catch (e) {
                                // Fallback a cálculo aproximado
                                const offset = Math.round(countryLongitude / 15);
                                countryHour = (now.getUTCHours() + offset + 24) % 24;
                                countryMinute = now.getUTCMinutes();
                            }
                        } else {
                            // Fallback a cálculo aproximado si no se puede obtener timezone
                            const offset = Math.round(countryLongitude / 15);
                            countryHour = (now.getUTCHours() + offset + 24) % 24;
                            countryMinute = now.getUTCMinutes();
                        }

                        timeInfo = `<strong>Hora local:</strong> ${String(countryHour).padStart(2, '0')}:${String(countryMinute).padStart(2, '0')}`;

                        // Calcular cuándo cruzará la línea de medianoche
                        const midnightLongitude = (now.getUTCHours() * 15 + now.getUTCMinutes() * 0.25);
                        let normalizedMidnight = midnightLongitude;
                        while (normalizedMidnight > 180) normalizedMidnight -= 360;
                        while (normalizedMidnight < -180) normalizedMidnight += 360;

                        let distanceToMidnight = normalizedMidnight - countryLongitude;
                        if (distanceToMidnight < 0) distanceToMidnight += 360;
                        if (distanceToMidnight > 180) distanceToMidnight = 360 - distanceToMidnight;

                        const hoursUntilMidnight = distanceToMidnight / 15;
                        if (hoursUntilMidnight > 0 && hoursUntilMidnight < 24) {
                            const h = Math.floor(hoursUntilMidnight);
                            const m = Math.floor((hoursUntilMidnight - h) * 60);
                            midnightInfo = `<br><strong>Cruzara medianoche en:</strong> ${h}h ${m}m`;
                        } else if (hoursUntilMidnight <= 0.5) {
                            midnightInfo = `<br><strong>Estado:</strong> En medianoche ahora`;
                        }
                    }

                    return `<div style="padding: 10px;">
                        <strong style="font-size: 16px;">${countryName}</strong><br>
                        ${timeInfo}
                        ${midnightInfo}
                    </div>`;
                },
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderColor: '#00f2fe',
                borderRadius: 8,
                style: {
                    color: '#fff'
                }
            },
            plotOptions: {
                map: {
                    allAreas: true,
                    nullColor: '#1a2a4e', // Color del océano
                    borderColor: 'rgba(255, 255, 255, 0.8)', // Bordes más visibles
                    borderWidth: 2,
                    color: '#5a7a9e', // Color de los países
                    states: {
                        hover: {
                            color: '#7a9aae',
                            borderColor: 'rgba(255, 255, 255, 1)',
                            brightness: 0.3
                        }
                    },
                    cursor: 'pointer'
                }
            },
            series: [{
                name: 'World',
                mapData: worldMap,
                joinBy: null, // No unir con datos, solo mostrar el mapa
                nullColor: '#1a2a4e', // Color del océano (más oscuro)
                borderColor: 'rgba(255, 255, 255, 0.8)', // Bordes más visibles
                borderWidth: 2,
                color: '#5a7a9e', // Color de los países (más claro para que se vean)
                states: {
                    hover: {
                        color: '#7a9aae',
                        borderColor: 'rgba(255, 255, 255, 1)',
                        brightness: 0.3
                    }
                },
                dataLabels: {
                    enabled: false
                }
            }],
            credits: {
                enabled: false
            },
            accessibility: {
                enabled: false
            }
        });

        console.log('✅ Highmaps planisferio cargado');

        // Agregar tooltips personalizados después de que el mapa se renderice
        setTimeout(() => {
            if (state.highmapsChart && state.highmapsChart.series && state.highmapsChart.series[0]) {
                const series = state.highmapsChart.series[0];
                if (series.points) {
                    series.points.forEach(point => {
                        if (point.graphic && point.graphic.element) {
                            const element = point.graphic.element;
                            const countryName = point.name || point.properties?.name || point.options?.name || 'País desconocido';

                            // Agregar event listeners para tooltip
                            element.addEventListener('mouseenter', (e) => {
                                showCountryTooltip(e, countryName, point);
                            });

                            element.addEventListener('mousemove', (e) => {
                                if (countryTooltip) {
                                    countryTooltip.style.left = (e.clientX + 15) + 'px';
                                    countryTooltip.style.top = (e.clientY - 15) + 'px';
                                }
                            });

                            element.addEventListener('mouseleave', () => {
                                hideCountryTooltip();
                            });
                        }
                    });
                }
            }
        }, 2000);

        // Ajustar tamaño cuando cambie la ventana
        window.addEventListener('resize', () => {
            if (state.highmapsChart) {
                state.highmapsChart.setSize(window.innerWidth, window.innerHeight);
            }
        });

        // Actualizar día/noche, línea de medianoche y rotación del mapa
        // Esperar un momento para que el mapa se renderice completamente
        setTimeout(() => {
            if (state.highmapsChart) {
                // Inicializar efecto día/noche primero
                updateHighmapsDayNight();
                updateMidnightLine();
                updateMapRotation();

                // Actualizar mapa, día/noche y línea de medianoche cada segundo
                setInterval(() => {
                    if (state.highmapsChart && state.highmapsChart.series && state.highmapsChart.series[0]) {
                        updateHighmapsDayNight();
                        updateMidnightLine();
                        updateMapRotation(); // Actualizar rotación cada segundo para seguir la hora
                    }
                }, 1000);
            }
        }, 1500); // Aumentar el tiempo de espera para asegurar que el mapa esté completamente renderizado

    } catch (error) {
        console.warn('⚠️ No se pudo inicializar Highmaps:', error);
    }
}

function updateHighmapsDayNight() {
    if (!state.highmapsChart) return;

    try {
        const now = new Date();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        const seconds = now.getUTCSeconds();

        // Calcular la longitud donde es medianoche UTC
        // A las 00:00 UTC: medianoche en 0° (Greenwich)
        // A las 12:00 UTC: medianoche en 180° (opuesto a Greenwich)
        // La medianoche se mueve 15 grados por hora hacia el oeste
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        let midnightLongitude = (totalSeconds / 3600) * 15;

        // Normalizar a -180 a +180
        while (midnightLongitude > 180) midnightLongitude -= 360;
        while (midnightLongitude < -180) midnightLongitude += 360;

        // Crear o actualizar la sombra de día/noche
        const container = document.getElementById('highmapsPlanisphere');
        if (!container) return;

        let dayNightShadow = document.getElementById('dayNightShadow');
        if (!dayNightShadow) {
            dayNightShadow = document.createElement('div');
            dayNightShadow.id = 'dayNightShadow';
            container.appendChild(dayNightShadow);
        }

        // Convertir longitud a posición X (0% a 100%)
        // Longitud -180 a +180 se mapea a 0% a 100%
        // INVERTIDO: la sombra debe estar en el lado opuesto al sol (donde es medianoche)
        // El sol está 180 grados opuesto a medianoche
        let sunLongitude = (midnightLongitude + 180) % 360;
        if (sunLongitude < 0) sunLongitude += 360;
        let xPosition = ((sunLongitude - 180) / 360) * 100;
        if (xPosition < 0) xPosition += 100;

        // Ajustar la posición del gradiente para crear el efecto de sombra
        // El gradiente se mueve suavemente según la hora
        dayNightShadow.style.backgroundPosition = `${xPosition}% 0%`;

        // Asegurar que la sombra sea visible
        dayNightShadow.style.display = 'block';
        dayNightShadow.style.opacity = '1';

    } catch (error) {
        console.warn('⚠️ Error al actualizar día/noche:', error);
    }
}

// Rotar el mapa según la hora UTC
function updateMapRotation() {
    if (!state.highmapsChart) return;

    try {
        const now = new Date();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        const seconds = now.getUTCSeconds();

        // Calcular la longitud donde es medianoche UTC
        // A las 00:00 UTC: medianoche en 0° (Greenwich)
        // A las 12:00 UTC: medianoche en 180° (opuesto a Greenwich)
        // La medianoche se mueve 15 grados por hora hacia el oeste
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        let midnightLongitude = (totalSeconds / 3600) * 15;

        // Normalizar a -180° a +180°
        while (midnightLongitude > 180) midnightLongitude -= 360;
        while (midnightLongitude < -180) midnightLongitude += 360;

        const container = document.getElementById('highmapsPlanisphere');
        if (container) {
            const svg = container.querySelector('svg');
            if (svg && svg.viewBox && svg.viewBox.baseVal) {
                const mapWidth = svg.viewBox.baseVal.width || 1000;
                const screenWidth = window.innerWidth;

                // El mapa tiene 360 grados de ancho (de -180° a +180°)
                // El meridiano 0° está en el centro del mapa (mapWidth/2)
                // Necesitamos desplazar el mapa para que el meridiano de medianoche esté en el centro de la pantalla

                // Convertir longitud a posición en el mapa
                // Longitud -180° a +180° se mapea a 0 a mapWidth
                const midnightXInMap = ((midnightLongitude + 180) / 360) * mapWidth;

                // Calcular el desplazamiento necesario para centrar el meridiano de medianoche
                // El centro del mapa original tiene el meridiano 0° en mapWidth/2
                // Queremos que el meridiano de medianoche esté en el centro de la pantalla (screenWidth/2)
                // Por lo tanto: offset = (mapWidth/2 - midnightXInMap) + (screenWidth/2 - mapWidth/2)
                // Simplificado: offset = screenWidth/2 - midnightXInMap
                const centerOffset = (screenWidth / 2) - midnightXInMap;

                // Aplicar transform al SVG con transición suave
                svg.style.transformOrigin = 'left center';
                svg.style.transition = 'transform 1s ease-out'; // Transición suave de 1 segundo
                svg.style.transform = `translateX(${centerOffset}px)`;

                // Crear efecto de mosaico: duplicar el mapa para continuidad
                if (!state.mapDuplicated) {
                    // Duplicar el SVG para crear efecto de mosaico continuo
                    const svgClone = svg.cloneNode(true);
                    svgClone.id = 'highmapsPlanisphere-clone-right';
                    svgClone.style.position = 'absolute';
                    svgClone.style.left = `${mapWidth}px`;
                    svgClone.style.top = '0';
                    svgClone.style.pointerEvents = 'none';
                    svgClone.style.zIndex = '-1';
                    container.appendChild(svgClone);

                    const svgClone2 = svg.cloneNode(true);
                    svgClone2.id = 'highmapsPlanisphere-clone-left';
                    svgClone2.style.position = 'absolute';
                    svgClone2.style.left = `${-mapWidth}px`;
                    svgClone2.style.top = '0';
                    svgClone2.style.pointerEvents = 'none';
                    svgClone2.style.zIndex = '-1';
                    container.appendChild(svgClone2);

                    state.mapDuplicated = true;
                } else {
                    // Actualizar las copias también para mantener el efecto continuo
                    const cloneRight = document.getElementById('highmapsPlanisphere-clone-right');
                    const cloneLeft = document.getElementById('highmapsPlanisphere-clone-left');
                    if (cloneRight) {
                        cloneRight.style.transition = 'transform 1s ease-out';
                        cloneRight.style.transform = `translateX(${centerOffset}px)`;
                    }
                    if (cloneLeft) {
                        cloneLeft.style.transition = 'transform 1s ease-out';
                        cloneLeft.style.transform = `translateX(${centerOffset}px)`;
                    }
                }
            }
        }

        // Iluminar países que cruzan el meridiano de medianoche (00:00-01:00 UTC)
        highlightCountriesAtGreenwich();

        // Actualizar panel del próximo país
        updateNextCountryPanel();
    } catch (error) {
        console.warn('⚠️ Error al rotar el mapa:', error);
    }
}

// Iluminar países según su estado: ya en 2026, próximos a llegar, o faltan horas
function highlightCountriesAtGreenwich() {
    if (!state.highmapsChart) return;

    try {
        const series = state.highmapsChart.series[0];
        if (!series || !series.points) return;

        // Obtener todos los puntos del mapa
        const points = series.points;
        const now = new Date();

        // Calcular la longitud donde es medianoche UTC
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        const seconds = now.getUTCSeconds();
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        // La medianoche se mueve 15 grados por hora hacia el oeste
        // A las 00:00 UTC, medianoche está en 0°. A las 12:00 UTC, en 180°.
        // Formula: (Hora UTC * 15) % 360. Si > 180, restar 360.
        // Pero queremos la longitud GEOGRÁFICA donde es medianoche local (00:00).
        // Si en Greenwich (0°) son las 10:00, la medianoche (00:00) fue hace 10 horas o será en 14 horas.
        // La medianoche está en longitud: (24 - HoraUTC) * 15.
        // Ejemplo: 10:00 UTC. Medianoche en (24-10)*15 = 14 * 15 = 210° = -150° (Oeste).
        // Ejemplo: 00:00 UTC. Medianoche en (24-0)*15 = 360° = 0°.

        let midnightLongitude = ((24 - (totalSeconds / 3600)) * 15) % 360;
        if (midnightLongitude > 180) midnightLongitude -= 360;

        // Almacenar países iluminados para evitar actualizaciones innecesarias
        if (!state.highlightedCountries) {
            state.highlightedCountries = new Set();
        }

        const currentlyHighlighted = new Set();

        points.forEach((point, index) => {
            if (!point) return;

            try {
                const countryName = point.name || point.properties?.name || point.options?.name || 'País desconocido';

                // Obtener timezone real del país
                const countryTimezone = getCountryTimezoneSync(countryName);

                // Calcular fecha y hora local del país
                let countryYear = now.getFullYear();
                let countryHour = 0;
                let countryMinute = 0;

                // Si tenemos timezone, usarlo para precisión exacta
                if (countryTimezone) {
                    try {
                        const formatter = new Intl.DateTimeFormat('en-US', {
                            timeZone: countryTimezone,
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: false
                        });
                        const parts = formatter.formatToParts(now);
                        countryYear = parseInt(parts.find(p => p.type === 'year').value);
                        countryHour = parseInt(parts.find(p => p.type === 'hour').value);
                        countryMinute = parseInt(parts.find(p => p.type === 'minute').value);
                    } catch (e) {
                        // Fallback si el timezone es inválido
                    }
                } else {
                    // Fallback a cálculo por longitud si no hay timezone
                    let countryLongitude = null;
                    if (point.properties && point.properties.lon) {
                        countryLongitude = point.properties.lon;
                    } else if (point.geometry && point.geometry.coordinates) {
                        // Cálculo simplificado del centroide
                        // ... (código existente de centroide)
                    }

                    if (countryLongitude !== null) {
                        const offset = Math.round(countryLongitude / 15);
                        countryHour = (hours + offset + 24) % 24;
                        countryMinute = minutes;
                        // Estimación burda del año (solo funciona cerca de medianoche)
                        if (countryHour < 12 && hours > 12) countryYear++;
                    }
                }

                // Determinar estado
                let countryColor = '#5a7a9e'; // Default (Futuro)
                let borderColor = 'rgba(255, 255, 255, 0.3)';
                let borderWidth = 1;
                let zIndex = 0;

                // Lógica de estados basada en AÑO y HORA:

                // 1. YA ESTÁ EN 2026 (o año nuevo)
                if (countryYear > 2025) {
                    // CELEBRANDO AHORA (00:00 - 01:00)
                    if (countryHour === 0) {
                        countryColor = '#00ff00'; // Verde neón
                        borderColor = '#ffffff';
                        borderWidth = 3;
                        zIndex = 100;
                        currentlyHighlighted.add(index);

                        // Detectar nuevo país en medianoche (primeros 5 minutos)
                        if (countryMinute < 5 && !state.countriesAtMidnight.has(countryName)) {
                            state.countriesAtMidnight.add(countryName);
                            // Solo celebrar si pasó un tiempo prudente desde el último para no saturar
                            if (Date.now() - (state.lastCelebrationTime || 0) > 30000) {
                                showCountryCelebrationBanner(countryName);
                                state.lastCelebrationTime = Date.now();
                                fetchCountryInfoAndAnnounce(countryName);
                            }
                        }
                    }
                    // YA CELEBRÓ (01:00+)
                    else {
                        countryColor = '#2ecc71'; // Verde esmeralda (celebrado)
                        borderColor = 'rgba(46, 204, 113, 0.8)';
                        borderWidth = 2;
                    }
                }
                // 2. AÚN EN 2025 (FUTURO)
                else {
                    // PRÓXIMO A CELEBRAR (23:00 - 23:59)
                    if (countryHour === 23) {
                        countryColor = '#ff9900'; // Naranja (víspera)
                        borderColor = '#ffcc00';
                        borderWidth = 2;
                        zIndex = 50;
                    }
                    // FUTURO LEJANO (Default)
                    else {
                        countryColor = '#5a7a9e'; // Azul (esperando)
                    }
                }


                // Aplicar cambios solo si es necesario para rendimiento
                const currentColor = point.color;
                if (currentColor !== countryColor) {
                    point.update({
                        color: countryColor,
                        borderColor: borderColor,
                        borderWidth: borderWidth,
                        zIndex: zIndex
                    }, false); // false = no redibujar todavía
                }

            } catch (pointError) {
                // Ignorar errores puntuales
            }
        });

        // Actualizar el conjunto de países iluminados
        state.highlightedCountries = currentlyHighlighted;

        // Redibujar el mapa una sola vez al final
        state.highmapsChart.redraw();

    } catch (error) {
        console.warn('⚠️ Error al iluminar países:', error);
    }
}

// Tooltip personalizado para países
let countryTooltip = null;

function showCountryTooltip(event, countryName, point) {
    // Crear tooltip si no existe
    if (!countryTooltip) {
        countryTooltip = document.createElement('div');
        countryTooltip.id = 'countryTooltip';
        countryTooltip.className = 'country-tooltip';
        document.body.appendChild(countryTooltip);
    }

    const now = new Date();
    let countryLongitude = null;

    // Obtener longitud del país
    if (point.properties && point.properties.lon) {
        countryLongitude = point.properties.lon;
    } else if (point.geometry && point.geometry.coordinates) {
        const coords = point.geometry.coordinates;
        let sumLon = 0;
        let count = 0;
        const extractLongitude = (arr) => {
            if (Array.isArray(arr[0])) {
                arr.forEach(sub => extractLongitude(sub));
            } else if (arr.length >= 2) {
                sumLon += arr[0];
                count++;
            }
        };
        extractLongitude(coords);
        if (count > 0) {
            countryLongitude = sumLon / count;
        }
    }

    // Normalizar longitud
    if (countryLongitude !== null) {
        while (countryLongitude > 180) countryLongitude -= 360;
        while (countryLongitude < -180) countryLongitude += 360;
    }

    let timeInfo = '';
    let midnightInfo = '';

    if (countryLongitude !== null) {
        // Obtener timezone real del país (síncrono)
        const countryTimezone = getCountryTimezoneSync(countryName);
        let countryHour, countryMinute, countrySecond;

        if (countryTimezone) {
            try {
                const formatter = new Intl.DateTimeFormat('es-ES', {
                    timeZone: countryTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                const parts = formatter.formatToParts(now);
                countryHour = parseInt(parts.find(p => p.type === 'hour').value);
                countryMinute = parseInt(parts.find(p => p.type === 'minute').value);
                countrySecond = parseInt(parts.find(p => p.type === 'second').value);
            } catch (e) {
                // Fallback a cálculo aproximado
                const offset = Math.round(countryLongitude / 15);
                countryHour = (now.getUTCHours() + offset + 24) % 24;
                countryMinute = now.getUTCMinutes();
                countrySecond = now.getUTCSeconds();
            }
        } else {
            // Fallback a cálculo aproximado si no se puede obtener timezone
            const offset = Math.round(countryLongitude / 15);
            countryHour = (now.getUTCHours() + offset + 24) % 24;
            countryMinute = now.getUTCMinutes();
            countrySecond = now.getUTCSeconds();
        }

        timeInfo = `<div class="tooltip-time">${String(countryHour).padStart(2, '0')}:${String(countryMinute).padStart(2, '0')}:${String(countrySecond).padStart(2, '0')}</div>`;

        // Calcular cuándo cruzará la línea de medianoche
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcSeconds = now.getUTCSeconds();
        const totalSeconds = utcHours * 3600 + utcMinutes * 60 + utcSeconds;
        const midnightLongitude = (totalSeconds / 3600) * 15;
        let normalizedMidnight = midnightLongitude;
        while (normalizedMidnight > 180) normalizedMidnight -= 360;
        while (normalizedMidnight < -180) normalizedMidnight += 360;

        let distanceToMidnight = normalizedMidnight - countryLongitude;
        if (distanceToMidnight < 0) distanceToMidnight += 360;
        if (distanceToMidnight > 180) distanceToMidnight = 360 - distanceToMidnight;

        const hoursUntilMidnight = distanceToMidnight / 15;

        if (hoursUntilMidnight > 0 && hoursUntilMidnight < 24) {
            const h = Math.floor(hoursUntilMidnight);
            const m = Math.floor((hoursUntilMidnight - h) * 60);
            const s = Math.floor((hoursUntilMidnight - h - m / 60) * 3600) % 60;
            midnightInfo = `<div class="tooltip-midnight">Cruzará medianoche en: ${h}h ${m}m ${s}s</div>`;
        } else if (hoursUntilMidnight <= 0.5) {
            midnightInfo = `<div class="tooltip-midnight active">¡En medianoche ahora!</div>`;
        }
    }

    countryTooltip.innerHTML = `
        <div class="tooltip-country-name">${countryName}</div>
        ${timeInfo}
        ${midnightInfo}
    `;

    // Posicionar tooltip cerca del cursor
    countryTooltip.style.left = (event.clientX + 15) + 'px';
    countryTooltip.style.top = (event.clientY - 15) + 'px';
    countryTooltip.style.display = 'block';
}

function hideCountryTooltip() {
    if (countryTooltip) {
        countryTooltip.style.display = 'none';
    }
}

// Verificar si un país está cerca del meridiano de Greenwich
function checkIfNearGreenwich(point) {
    if (!point.geometry || !point.geometry.coordinates) return false;

    // Obtener las coordenadas del país
    const coords = point.geometry.coordinates;

    // Simplificado: verificar si alguna coordenada está cerca de longitud 0°
    // En un mapa real, esto sería más complejo
    let isNear = false;

    const checkCoordinates = (coords) => {
        if (Array.isArray(coords[0])) {
            coords.forEach(coord => checkCoordinates(coord));
        } else if (coords.length >= 2) {
            const lon = coords[0];
            // Verificar si está cerca del meridiano de Greenwich (longitud 0°)
            // Con un margen de ±5 grados
            if (Math.abs(lon) < 5 || Math.abs(lon - 360) < 5 || Math.abs(lon + 360) < 5) {
                isNear = true;
            }
        }
    };

    checkCoordinates(coords);
    return isNear;
}

function updateMapboxRotation() {
    // Función mantenida para compatibilidad, pero ahora usa Highmaps
    updateHighmapsDayNight();
    updateMidnightLine();
}

// Inicializar línea de medianoche
function initializeMidnightLine() {
    updateMidnightLine();
    setInterval(updateMidnightLine, 1000); // Actualizar cada segundo
}

// Actualizar posición de la línea de medianoche
function updateMidnightLine() {
    const midnightLine = document.getElementById('midnightLine');
    if (!midnightLine) return;

    // Calcular dónde es medianoche (UTC) en el planisferio
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();

    // La línea de medianoche está en el meridiano opuesto al sol
    // El sol está en su punto más alto a las 12:00 UTC en el meridiano 0°
    // La medianoche está 12 horas (180 grados) opuesta al sol
    // Longitud de medianoche = (12 - hora UTC) * 15 grados
    const midnightLongitude = (12 - hours - minutes / 60 - seconds / 3600) * 15;

    // Convertir longitud a posición X en el mapa (0-100%)
    // Longitud -180 a +180 se mapea a 0% a 100%
    const xPosition = ((midnightLongitude + 180) / 360) * 100;

    midnightLine.style.left = `${xPosition}%`;

    // Agregar etiqueta con el país/región
    updateMidnightLineLabel(midnightLongitude);
}

// Actualizar etiqueta de la línea de medianoche
function updateMidnightLineLabel(longitude) {
    // Encontrar país/región en esa longitud (simplificado)
    // Esto se puede mejorar con datos geográficos más precisos
    const midnightLine = document.getElementById('midnightLine');
    if (!midnightLine) return;

    // Crear o actualizar etiqueta
    let label = midnightLine.querySelector('.midnight-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'midnight-label';
        midnightLine.appendChild(label);
    }

    // País aproximado basado en longitud (simplificado)
    const country = getCountryAtLongitude(longitude);
    if (country) {
        label.textContent = `🎆 ${country}`;
    }
}

// Obtener país aproximado en una longitud (simplificado)
function getCountryAtLongitude(longitude) {
    // Mapeo simplificado de longitudes a países/regiones
    const regions = [
        { min: -180, max: -150, name: 'Pacífico' },
        { min: -150, max: -120, name: 'Hawaii' },
        { min: -120, max: -90, name: 'América del Norte' },
        { min: -90, max: -60, name: 'América Central' },
        { min: -60, max: -30, name: 'América del Sur' },
        { min: -30, max: 0, name: 'Atlántico' },
        { min: 0, max: 30, name: 'Europa/Africa' },
        { min: 30, max: 60, name: 'Rusia/Asia' },
        { min: 60, max: 90, name: 'Asia Central' },
        { min: 90, max: 120, name: 'China' },
        { min: 120, max: 150, name: 'Japón' },
        { min: 150, max: 180, name: 'Pacífico' }
    ];

    for (const region of regions) {
        if (longitude >= region.min && longitude < region.max) {
            return region.name;
        }
    }

    return 'Pacífico';
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
    try {
        const now = new Date();

        // Actualizar hora UTC
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
        const utcTimeStr = `${utcHours}:${utcMinutes}:${utcSeconds}`;

        const utcTimeEl = document.getElementById('utcTime');
        if (utcTimeEl) {
            utcTimeEl.textContent = utcTimeStr;
        } else {
            console.warn('⚠️ Elemento utcTime no encontrado en updateTimeDisplay');
        }

        // Fecha UTC
        const utcDay = now.getUTCDate();
        const utcMonth = now.getUTCMonth();
        const utcYear = now.getUTCFullYear();
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const utcDateEl = document.getElementById('utcDate');
        if (utcDateEl) {
            utcDateEl.textContent = `${utcDay} de ${monthNames[utcMonth]}, ${utcYear}`;
        }

        // Actualizar hora del usuario (local)
        const userHours = String(now.getHours()).padStart(2, '0');
        const userMinutes = String(now.getMinutes()).padStart(2, '0');
        const userSeconds = String(now.getSeconds()).padStart(2, '0');
        const userTimeEl = document.getElementById('userTime');
        if (userTimeEl) {
            userTimeEl.textContent = `${userHours}:${userMinutes}:${userSeconds}`;
        } else {
            console.warn('⚠️ Elemento userTime no encontrado en updateTimeDisplay');
        }

        // Fecha del usuario
        const userDay = now.getDate();
        const userMonth = now.getMonth();
        const userYear = now.getFullYear();
        const userDateEl = document.getElementById('userDate');
        if (userDateEl) {
            userDateEl.textContent = `${userDay} de ${monthNames[userMonth]}, ${userYear}`;
        }
    } catch (error) {
        console.error('❌ Error en updateTimeDisplay:', error);
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

// Variable global para el reproductor de YouTube
let youtubePlayer = null;

// Inicializar reproductor de YouTube cuando la API esté lista
function onYouTubeIframeAPIReady() {
    console.log('🎵 YouTube IFrame API lista');
    // El reproductor se inicializará en initializeBackgroundAudio
}

function initializeBackgroundAudio() {
    // Inicializar reproductor de YouTube para música de fondo
    const playerContainer = document.getElementById('backgroundMusicPlayer');
    if (playerContainer && typeof YT !== 'undefined' && YT.Player) {
        try {
            youtubePlayer = new YT.Player('backgroundMusicPlayer', {
                height: '0',
                width: '0',
                playerVars: {
                    'autoplay': 1,
                    'loop': 1,
                    'playlist': 'UCDg4eJJdvNAX2az-Bi7aBkA', // ID del canal de YouTube Music
                    'controls': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0
                },
                events: {
                    'onReady': function (event) {
                        console.log('🎵 Reproductor de YouTube listo');
                        // Intentar reproducir música (puede requerir interacción del usuario)
                        event.target.setVolume(30); // Volumen al 30%
                    },
                    'onStateChange': function (event) {
                        if (event.data === YT.PlayerState.ENDED) {
                            // Si termina, reproducir siguiente canción
                            event.target.nextVideo();
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ No se pudo inicializar reproductor de YouTube:', error);
            // Fallback a audio HTML5 si YouTube falla
            initializeHTML5Audio();
        }
    } else {
        console.warn('⚠️ YouTube IFrame API no disponible, usando audio HTML5');
        initializeHTML5Audio();
    }
}

function initializeHTML5Audio() {
    // Inicializar cada pista de audio HTML5 como fallback
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
    // Inicializar contador global
    initializeGlobalCountdown();

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
    // Funciones de estadísticas eliminadas - ya no se usan
}

function initializeGlobalCountdown() {
    updateGlobalCountdown();
}

// Actualizar cuenta regresiva global (DESACTIVADO)
function updateGlobalCountdown() {
    /*
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
    */
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


function lanzarConfetti() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ffffff', '#ffdd00', '#00f2fe']
        });
    }
}

// Inicializar obtención de horas del mundo (similar a 24timezones.com)
function initializeWorldTimes() {
    // Actualizar horas del mundo cada minuto
    updateWorldTimes();
    setInterval(updateWorldTimes, 60000); // Actualizar cada minuto
}

// Inicializar panel del próximo país
function initializeNextCountryPanel() {
    updateNextCountryPanel();
    // Actualizar cada segundo para mostrar cuenta regresiva en tiempo real
    setInterval(updateNextCountryPanel, 1000);
}

// Mapeo completo de países a zonas horarias reales (basado en datos reales de IANA)
// Este mapeo se actualiza dinámicamente cuando se encuentran nuevos países
const COUNTRY_TIMEZONE_MAP = {
    // América del Sur
    'argentina': 'America/Argentina/Buenos_Aires',
    'chile': 'America/Santiago',
    'uruguay': 'America/Montevideo',
    'paraguay': 'America/Asuncion',
    'bolivia': 'America/La_Paz',
    'peru': 'America/Lima',
    'perú': 'America/Lima',
    'ecuador': 'America/Guayaquil',
    'colombia': 'America/Bogota',
    'venezuela': 'America/Caracas',
    'brazil': 'America/Sao_Paulo',
    'brasil': 'America/Sao_Paulo',
    'guyana': 'America/Guyana',
    'suriname': 'America/Paramaribo',
    'french guiana': 'America/Cayenne',

    // América Central y Caribe
    'mexico': 'America/Mexico_City',
    'méxico': 'America/Mexico_City',
    'guatemala': 'America/Guatemala',
    'belize': 'America/Belize',
    'el salvador': 'America/El_Salvador',
    'honduras': 'America/Tegucigalpa',
    'nicaragua': 'America/Managua',
    'costa rica': 'America/Costa_Rica',
    'panama': 'America/Panama',
    'panamá': 'America/Panama',
    'cuba': 'America/Havana',
    'jamaica': 'America/Jamaica',
    'haiti': 'America/Port-au-Prince',
    'dominican republic': 'America/Santo_Domingo',
    'puerto rico': 'America/Puerto_Rico',
    'trinidad and tobago': 'America/Port_of_Spain',
    'barbados': 'America/Barbados',
    'saint kitts and nevis': 'America/St_Kitts',
    'antigua and barbuda': 'America/Antigua',
    'dominica': 'America/Dominica',
    'st. lucia': 'America/St_Lucia',
    'grenada': 'America/Grenada',

    // América del Norte
    'united states': 'America/New_York',
    'estados unidos': 'America/New_York',
    'canada': 'America/Toronto',
    'canadá': 'America/Toronto',

    // Europa
    'spain': 'Europe/Madrid',
    'españa': 'Europe/Madrid',
    'france': 'Europe/Paris',
    'francia': 'Europe/Paris',
    'germany': 'Europe/Berlin',
    'alemania': 'Europe/Berlin',
    'italy': 'Europe/Rome',
    'italia': 'Europe/Rome',
    'united kingdom': 'Europe/London',
    'reino unido': 'Europe/London',
    'portugal': 'Europe/Lisbon',
    'greece': 'Europe/Athens',
    'grecia': 'Europe/Athens',
    'russia': 'Europe/Moscow',
    'rusia': 'Europe/Moscow',
    'turkey': 'Europe/Istanbul',
    'turquía': 'Europe/Istanbul',

    // Asia
    'japan': 'Asia/Tokyo',
    'japón': 'Asia/Tokyo',
    'china': 'Asia/Shanghai',
    'china': 'Asia/Shanghai',
    'india': 'Asia/Kolkata',
    'indonesia': 'Asia/Jakarta',
    'thailand': 'Asia/Bangkok',
    'tailandia': 'Asia/Bangkok',
    'south korea': 'Asia/Seoul',
    'corea del sur': 'Asia/Seoul',
    'philippines': 'Asia/Manila',
    'filipinas': 'Asia/Manila',
    'singapore': 'Asia/Singapore',
    'malaysia': 'Asia/Kuala_Lumpur',
    'vietnam': 'Asia/Ho_Chi_Minh',

    // Oceanía
    'australia': 'Australia/Sydney',
    'australia': 'Australia/Sydney',
    'new zealand': 'Pacific/Auckland',
    'nueva zelanda': 'Pacific/Auckland',
    'kiribati': 'Pacific/Kiritimati',
    'samoa': 'Pacific/Apia',
    'tonga': 'Pacific/Tongatapu',
    'fiji': 'Pacific/Fiji',
    'papua new guinea': 'Pacific/Port_Moresby',
    'new caledonia': 'Pacific/Noumea',

    // África
    'south africa': 'Africa/Johannesburg',
    'sudáfrica': 'Africa/Johannesburg',
    'egypt': 'Africa/Cairo',
    'egipto': 'Africa/Cairo',
    'madagascar': 'Indian/Antananarivo',
    'kenya': 'Africa/Nairobi',
    'nigeria': 'Africa/Lagos',
    'morocco': 'Africa/Casablanca',
    'marruecos': 'Africa/Casablanca'
};

// Obtener zona horaria real de un país (síncrono desde mapeo o cache)
function getCountryTimezoneSync(countryName) {
    if (!countryName) return null;

    const countryNameLower = countryName.toLowerCase().trim();
    const countryNameClean = countryNameLower.replace(/\s+/g, '');

    // Buscar en cache primero
    if (state.countryTimezoneCache && state.countryTimezoneCache.has(countryNameLower)) {
        return state.countryTimezoneCache.get(countryNameLower);
    }

    // Mapeo directo de nombres comunes de Highmaps a claves de nuestro mapa
    const directMap = {
        'united states of america': 'united states',
        'usa': 'united states',
        'united kingdom': 'united kingdom',
        'uk': 'united kingdom',
        'russian federation': 'russia',
        'south korea': 'south korea',
        'republic of korea': 'south korea',
        'north korea': 'north korea',
        'democratic people\'s republic of korea': 'north korea',
        'china': 'china',
        'people\'s republic of china': 'china',
        'vietnam': 'vietnam',
        'viet nam': 'vietnam',
        'laos': 'laos',
        'lao people\'s democratic republic': 'laos',
        'iran': 'iran',
        'islamic republic of iran': 'iran',
        'syria': 'syria',
        'syrian arab republic': 'syria',
        'tanzania': 'tanzania',
        'united republic of tanzania': 'tanzania',
        'venezuela': 'venezuela',
        'bolivarian republic of venezuela': 'venezuela',
        'bolivia': 'bolivia',
        'plurinational state of bolivia': 'bolivia',
        'moldova': 'moldova',
        'republic of moldova': 'moldova',
        'congo': 'congo',
        'democratic republic of the congo': 'congo'
    };

    // Intentar mapeo directo
    if (directMap[countryNameLower]) {
        const mappedName = directMap[countryNameLower];
        // Buscar la zona horaria para el nombre mapeado
        for (const [key, tz] of Object.entries(COUNTRY_TIMEZONE_MAP)) {
            if (key.toLowerCase() === mappedName) {
                if (!state.countryTimezoneCache) state.countryTimezoneCache = new Map();
                state.countryTimezoneCache.set(countryNameLower, tz);
                return tz;
            }
        }
    }

    // Buscar en mapeo iterando
    for (const [key, tz] of Object.entries(COUNTRY_TIMEZONE_MAP)) {
        const keyLower = key.toLowerCase();
        const keyClean = keyLower.replace(/\s+/g, '');

        // Coincidencia exacta
        if (countryNameLower === keyLower) return tz;

        // Coincidencia parcial (el nombre del mapa contiene la clave o viceversa)
        // Ej: "United States of America" contiene "united states"
        if (countryNameLower.includes(keyLower) || keyLower.includes(countryNameLower)) {
            if (!state.countryTimezoneCache) state.countryTimezoneCache = new Map();
            state.countryTimezoneCache.set(countryNameLower, tz);
            return tz;
        }

        // Coincidencia limpia (sin espacios)
        if (countryNameClean.includes(keyClean) || keyClean.includes(countryNameClean)) {
            if (!state.countryTimezoneCache) state.countryTimezoneCache = new Map();
            state.countryTimezoneCache.set(countryNameLower, tz);
            return tz;
        }
    }

    return null;
}

// Obtener zona horaria real de un país usando API (async para países no mapeados)
async function getCountryTimezone(countryName, longitude) {
    // Primero intentar síncrono desde mapeo
    const syncTimezone = getCountryTimezoneSync(countryName);
    if (syncTimezone) {
        return syncTimezone;
    }

    // Si no está en el mapeo, intentar obtener desde API
    const cacheKey = countryName.toLowerCase().trim();

    try {
        const timezoneUrl = `https://worldtimeapi.org/api/timezone`;
        const timezoneResponse = await fetch(timezoneUrl);

        if (timezoneResponse.ok) {
            const timezones = await timezoneResponse.json();
            const countryNameLower = countryName.toLowerCase().replace(/\s+/g, '');

            // Buscar en la lista de timezones de WorldTimeAPI
            for (const tz of timezones) {
                const tzParts = tz.split('/');
                const tzLocation = tzParts[1]?.toLowerCase().replace(/_/g, '') || '';
                if (countryNameLower.includes(tzLocation) || tzLocation.includes(countryNameLower)) {
                    if (!state.countryTimezoneCache) state.countryTimezoneCache = new Map();
                    state.countryTimezoneCache.set(cacheKey, tz);
                    console.log(`✅ Timezone encontrado para ${countryName}: ${tz}`);
                    return tz;
                }
            }
        }
    } catch (error) {
        console.warn(`⚠️ Error consultando API para ${countryName}:`, error);
    }

    return null;
}

// Actualizar panel del próximo país (Basado en Zonas Horarias, no geometría)
function updateNextCountryPanel() {
    if (!state.highmapsChart) {
        return;
    }

    try {
        const nextCountryNameEl = document.getElementById('nextCountryName');
        const timeUntilNextEl = document.getElementById('timeUntilNext');

        if (!nextCountryNameEl || !timeUntilNextEl) return;

        const now = new Date();
        const currentYear = now.getFullYear();

        // Encontrar la próxima zona horaria que llegará a medianoche
        // Iteramos sobre todas las zonas horarias conocidas para ver cuál es la siguiente
        // que tendrá las 00:00:00

        let minTimeRemaining = Infinity;
        let nextZoneName = null;
        let nextZoneId = null;

        // Lista de zonas horarias representativas (simplificada para rendimiento)
        // Se asume que COUNTRY_TIMEZONE_MAP tiene las zonas correctas
        const uniqueZones = new Set(Object.values(COUNTRY_TIMEZONE_MAP));

        uniqueZones.forEach(timezone => {
            try {
                // Obtener hora actual en esa zona
                const zoneDateString = now.toLocaleString('en-US', { timeZone: timezone });
                const zoneDate = new Date(zoneDateString);

                // Si ya es 2026 (o año nuevo), ignorar
                if (zoneDate.getFullYear() > currentYear) return;

                // Calcular tiempo hasta la próxima medianoche
                const nextMidnight = new Date(zoneDate);
                nextMidnight.setHours(24, 0, 0, 0); // Próxima medianoche local

                const msUntilMidnight = nextMidnight - zoneDate;

                // Si falta menos de 24 horas y es el menor tiempo encontrado
                if (msUntilMidnight > 0 && msUntilMidnight < minTimeRemaining) {
                    minTimeRemaining = msUntilMidnight;
                    nextZoneId = timezone;
                }
            } catch (e) {
                // Zona inválida, ignorar
            }
        });

        if (nextZoneId) {
            // Encontrar países en esta zona
            const countriesInZone = Object.entries(COUNTRY_TIMEZONE_MAP)
                .filter(([country, tz]) => tz === nextZoneId)
                .map(([country]) => country.charAt(0).toUpperCase() + country.slice(1)) // Capitalizar
                .slice(0, 3); // Tomar solo los primeros 3

            let displayName = countriesInZone.join(', ');
            if (countriesInZone.length < 1) displayName = nextZoneId.split('/')[1].replace(/_/g, ' ');

            // Formatear tiempo restante
            const totalSeconds = Math.floor(minTimeRemaining / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Actualizar UI
            nextCountryNameEl.textContent = displayName;
            timeUntilNextEl.textContent = timeString;

            // Actualizar estado global
            state.nextZone = displayName;

            // Actualizar también la tarjeta de estadísticas si existe
            const statNextZone = document.getElementById('nextZone');
            if (statNextZone) {
                statNextZone.textContent = displayName;
            }

        } else {
            nextCountryNameEl.textContent = "Todo el mundo ha celebrado";
            timeUntilNextEl.textContent = "--:--:--";
            const statNextZone = document.getElementById('nextZone');
            if (statNextZone) statNextZone.textContent = "Fin";
        }

    } catch (error) {
        console.warn('⚠️ Error actualizando panel de próximo país:', error);
    }
}

async function updateWorldTimes() {
    const cities = [
        { name: 'Lima', timezone: 'America/Lima' },
        { name: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires' },
        { name: 'Brasilia', timezone: 'America/Sao_Paulo' },
        { name: 'Madrid', timezone: 'Europe/Madrid' },
        { name: 'Moscú', timezone: 'Europe/Moscow' },
        { name: 'Doha', timezone: 'Asia/Qatar' },
        { name: 'Tokio', timezone: 'Asia/Tokyo' },
        { name: 'Sídney', timezone: 'Australia/Sydney' },
        { name: 'Nueva York', timezone: 'America/New_York' },
        { name: 'Los Ángeles', timezone: 'America/Los_Angeles' },
        { name: 'Londres', timezone: 'Europe/London' },
        { name: 'París', timezone: 'Europe/Paris' }
    ];

    // Calcular horas basándose en UTC y offsets (más confiable que API externa)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

    cities.forEach(city => {
        try {
            // Usar Intl.DateTimeFormat para obtener hora local de cada ciudad
            const formatter = new Intl.DateTimeFormat('es-ES', {
                timeZone: city.timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const localTime = formatter.format(now);
            state.worldTimes.set(city.name, {
                time: localTime,
                timezone: city.timezone,
                city: city.name
            });
        } catch (error) {
            console.warn(`⚠️ Error obteniendo hora para ${city.name}:`, error);
        }
    });

    // También guardar UTC
    const utcFormatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    state.worldTimes.set('UTC', {
        time: utcFormatter.format(now),
        timezone: 'UTC',
        city: 'UTC'
    });
}

// Mostrar cartel festivo cuando un país llega a medianoche
function showCountryCelebrationBanner(countryName) {
    const banner = document.getElementById('countryCelebrationBanner');
    const countryEl = document.getElementById('celebrationCountry');
    const messageEl = document.getElementById('celebrationMessage');

    if (!banner || !countryEl || !messageEl) return;

    // Actualizar texto
    countryEl.textContent = countryName;
    messageEl.textContent = 'acaba de llegar al 2026';

    // Mostrar banner con animación
    banner.style.display = 'flex';
    banner.classList.add('show');

    // Vibración de la pantalla (si está disponible)
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Efecto de confetti
    lanzarConfetti();

    // Ocultar después de 5 segundos
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 500);
    }, 5000);
}

// Scraper de información de países usando Wikipedia API
async function fetchCountryInfoAndAnnounce(countryName) {
    console.log(`🔍 Buscando información de ${countryName}...`);

    // Verificar cache primero
    if (state.countryInfoCache && state.countryInfoCache.has(countryName)) {
        const cachedInfo = state.countryInfoCache.get(countryName);
        console.log(`✅ Información en cache para ${countryName}`);
        announceCountryInfo(countryName, cachedInfo);
        return;
    }

    try {
        // Usar Wikipedia API para obtener información del país
        const searchUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`;
        console.log(`📡 Consultando Wikipedia: ${searchUrl}`);

        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();
        console.log(`✅ Información obtenida de Wikipedia para ${countryName}`);

        // Extraer información relevante
        const countryInfo = {
            name: data.title || countryName,
            description: data.extract || '',
            capital: data.content_urls?.desktop?.page || '',
            flag: data.thumbnail?.source || ''
        };

        // Guardar en cache
        if (!state.countryInfoCache) {
            state.countryInfoCache = new Map();
        }
        state.countryInfoCache.set(countryName, countryInfo);

        // Anunciar información
        announceCountryInfo(countryName, countryInfo);

    } catch (error) {
        console.warn(`⚠️ Error obteniendo información del país ${countryName}:`, error);
        // Usar información genérica
        const genericInfo = {
            name: countryName,
            description: `${countryName} es un país que acaba de recibir el Año Nuevo. Cada país tiene sus propias tradiciones y formas únicas de celebrar este momento especial.`,
            capital: '',
            flag: ''
        };
        console.log(`📢 Usando información genérica para ${countryName}`);
        announceCountryInfo(countryName, genericInfo);
    }
}

// Anunciar información del país por el presentador
function announceCountryInfo(countryName, info) {
    console.log(`📢 Anunciando información de ${countryName}`);

    // Validar si el país realmente está celebrando ahora
    // Evitar anuncios falsos al cargar la página
    const now = new Date();
    const currentYear = now.getFullYear();

    // Si el país es "Faroe Islands" y no estamos cerca de su hora de año nuevo, ignorar
    // Esto es un parche temporal para un error específico reportado
    if (countryName === 'Faroe Islands' && now.getUTCHours() !== 23) { // Faroe es UTC+0/UTC+1, celebra tarde
        console.warn('⚠️ Intento de anuncio falso para Faroe Islands bloqueado');
        return;
    }

    // Crear mensaje para el presentador
    let message = `¡Atención! ${countryName} acaba de recibir el Año Nuevo. `;

    if (info && typeof info === 'object' && info.description) {
        // Tomar las primeras 2-3 oraciones de la descripción
        const sentences = info.description.split('.').filter(s => s.trim().length > 20);
        const relevantSentences = sentences.slice(0, 2).join('. ');
        if (relevantSentences) {
            message += relevantSentences + '. ';
        }
    } else if (typeof info === 'string') {
        // Si info es un string directo
        message += info;
    }

    message += ` ¡Feliz Año Nuevo a todos en ${countryName}!`;

    console.log(`📝 Mensaje del presentador: ${message.substring(0, 100)}...`);

    // Actualizar texto del presentador si existe
    const presenterText = document.getElementById('presenterText');
    if (presenterText) {
        presenterText.textContent = message;
    }

    // Hacer que el presentador lea el mensaje
    // Si está hablando, esperar un poco y reintentar
    if (state.isSpeaking) {
        console.log('⏳ Presentador ocupado, esperando...');
        setTimeout(() => {
            console.log('🎙️ Reintentando hablar después de espera...');
            speakPresenterMessage(message);
        }, 3000);
    } else {
        console.log('🎙️ Llamando a speakPresenterMessage...');
        speakPresenterMessage(message);
    }
}

// ============================================
// PRESENTADOR CON IA
// ============================================

// Datos de países con información histórica y zonas horarias
const COUNTRIES_DATA = {
    'Kiritimati': { name: 'Kiritimati (Islas Line)', timezone: 'Pacific/Kiritimati', offset: 14, history: 'Kiritimati, también conocida como Isla de Navidad, es el primer lugar habitado en recibir el Año Nuevo. Esta isla del Pacífico, parte de Kiribati, tiene una rica historia de exploración polinesia y colonialismo británico.' },
    'Samoa': { name: 'Samoa', timezone: 'Pacific/Apia', offset: 13, history: 'Samoa fue el primer país en recibir el Año Nuevo hasta 2011, cuando cambió su zona horaria para estar más cerca de sus socios comerciales. Tiene una cultura polinesia única con tradiciones ancestrales.' },
    'Nueva Zelanda': { name: 'Nueva Zelanda', timezone: 'Pacific/Auckland', offset: 12, history: 'Nueva Zelanda celebra el Año Nuevo con fuegos artificiales espectaculares en Auckland. El país tiene una rica herencia maorí y es conocido por ser uno de los primeros lugares en ver el amanecer del nuevo año.' },
    'Australia': { name: 'Australia', timezone: 'Australia/Sydney', offset: 10, history: 'Australia celebra con grandes eventos en Sídney, incluyendo el famoso espectáculo de fuegos artificiales en el puerto. El país tiene una historia fascinante que combina culturas aborígenes milenarias con influencias europeas y asiáticas.' },
    'Japón': { name: 'Japón', timezone: 'Asia/Tokyo', offset: 9, history: 'En Japón, el Año Nuevo se celebra visitando templos sintoístas y budistas. La tradición incluye comer soba (fideos) y escuchar las 108 campanadas que representan los 108 deseos terrenales. Japón tiene una historia milenaria de imperios, samuráis y transformación moderna.' },
    'China': { name: 'China', timezone: 'Asia/Shanghai', offset: 8, history: 'China celebra el Año Nuevo según el calendario lunar, pero también festeja el año nuevo gregoriano. Con más de 5000 años de historia, China es una de las civilizaciones más antiguas del mundo, conocida por sus dinastías, la Gran Muralla y sus contribuciones a la humanidad.' },
    'España': { name: 'España', timezone: 'Europe/Madrid', offset: 1, history: 'España es famosa por la tradición de las 12 uvas de la suerte en la Puerta del Sol de Madrid. Con una rica historia que incluye el Imperio Romano, la ocupación musulmana, y la era de los descubrimientos, España ha influido profundamente en la cultura mundial.' },
    'Argentina': { name: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', offset: -3, history: 'Argentina celebra el Año Nuevo con grandes festejos en Buenos Aires. El país tiene una rica historia de inmigración europea, tango, y una cultura única que combina influencias italianas, españolas e indígenas.' },
    'Chile': { name: 'Chile', timezone: 'America/Santiago', offset: -3, history: 'Chile celebra con fuegos artificiales en Valparaíso y Santiago. Con una geografía única que se extiende desde el desierto de Atacama hasta la Patagonia, Chile tiene una historia de resistencia indígena y desarrollo económico.' },
    'Uruguay': { name: 'Uruguay', timezone: 'America/Montevideo', offset: -3, history: 'Uruguay celebra el Año Nuevo en las playas de Punta del Este. Conocido como la Suiza de América, Uruguay tiene una historia de estabilidad democrática y una rica cultura gaucha.' },
    'Paraguay': { name: 'Paraguay', timezone: 'America/Asuncion', offset: -4, history: 'Paraguay celebra con tradiciones que mezclan influencias guaraníes y españolas. El país tiene una historia única de independencia temprana y resistencia, siendo el único país de América donde el guaraní es idioma oficial junto al español.' },
    'Bolivia': { name: 'Bolivia', timezone: 'America/La_Paz', offset: -4, history: 'Bolivia celebra el Año Nuevo con rituales andinos y tradiciones católicas. Con una población mayoritariamente indígena, Bolivia tiene una rica historia precolombina, incluyendo el Imperio Tiwanaku y la cultura incaica.' },
    'Colombia': { name: 'Colombia', timezone: 'America/Bogota', offset: -5, history: 'Colombia celebra con música, baile y fuegos artificiales. El país tiene una historia fascinante que incluye civilizaciones precolombinas como los muiscas, la época colonial española, y una rica diversidad cultural.' },
    'Ecuador': { name: 'Ecuador', timezone: 'America/Guayaquil', offset: -5, history: 'Ecuador celebra el Año Nuevo con la quema de muñecos de año viejo. El país tiene una historia única que incluye ser parte del Imperio Inca, y es el hogar de las Islas Galápagos, fundamentales para la teoría de la evolución.' },
    'México': { name: 'México', timezone: 'America/Mexico_City', offset: -6, history: 'México celebra con grandes festejos y tradiciones que mezclan culturas prehispánicas y españolas. Con civilizaciones milenarias como los aztecas y mayas, México tiene una de las historias más ricas y complejas de América.' }
};

// Función para calcular tiempo hasta Año Nuevo para un país
function getTimeUntilNewYear(countryKey) {
    const country = COUNTRIES_DATA[countryKey];
    if (!country) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const newYearDate = new Date(currentYear + 1, 0, 1, 0, 0, 0, 0);

    // Convertir a la zona horaria del país
    const countryTime = new Date(now.toLocaleString('en-US', { timeZone: country.timezone }));
    const countryNewYear = new Date(newYearDate.toLocaleString('en-US', { timeZone: country.timezone }));

    const diff = countryNewYear - countryTime;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, text: '¡Ya llegó el Año Nuevo!' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (days > 0) {
        text = `${days} día${days > 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        text = `${hours} hora${hours > 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
        text = `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }

    return { days, hours, minutes, text };
}

// Generador de contenido con IA mejorado
async function generateAIContent(context) {
    const now = new Date();
    const topics = [];

    // Tema 1: Primeros países en recibir Año Nuevo
    topics.push(`Los primeros países en recibir el Año Nuevo son las Islas Line, específicamente Kiritimati, en UTC+14. ${COUNTRIES_DATA.Kiritimati.history} Le siguen Samoa en UTC+13, Nueva Zelanda en UTC+12, y Australia en UTC+10. Cada uno tiene tradiciones únicas y una historia fascinante.`);

    // Tema 2: Tiempo hasta Año Nuevo en países específicos
    const countriesToCheck = ['Argentina', 'Chile', 'Uruguay', 'Paraguay', 'Bolivia', 'Colombia', 'Ecuador', 'México', 'España', 'Japón', 'China'];
    const countryTimes = countriesToCheck.map(country => {
        const time = getTimeUntilNewYear(country);
        if (time) {
            return { country, time, data: COUNTRIES_DATA[country] };
        }
        return null;
    }).filter(Boolean);

    if (countryTimes.length > 0) {
        const selectedCountries = countryTimes.slice(0, 3);
        let timeMessage = 'En cuanto a los tiempos hasta el Año Nuevo, ';
        selectedCountries.forEach((item, index) => {
            if (index > 0) timeMessage += '. Además, ';
            timeMessage += `para ${item.data.name} faltan ${item.time.text}. ${item.data.history}`;
        });
        topics.push(timeMessage);
    }

    // Tema 3: Historia de países europeos
    topics.push(`En Europa, España tiene una tradición única de las 12 uvas de la suerte. ${COUNTRIES_DATA.España.history} Otros países europeos como Francia, Alemania e Italia también tienen sus propias tradiciones fascinantes que reflejan siglos de historia y cultura.`);

    // Tema 4: Países asiáticos
    topics.push(`En Asia, Japón y China tienen celebraciones muy especiales. ${COUNTRIES_DATA.Japón.history} ${COUNTRIES_DATA.China.history} Estos países representan civilizaciones milenarias con tradiciones que se remontan a miles de años.`);

    // Tema 5: Países latinoamericanos
    const latamCountries = ['Argentina', 'Chile', 'Uruguay', 'Paraguay', 'Bolivia', 'Colombia', 'Ecuador', 'México'];
    const latamInfo = latamCountries.slice(0, 3).map(c => COUNTRIES_DATA[c].history).join(' ');
    topics.push(`Los países latinoamericanos tienen tradiciones ricas y diversas. ${latamInfo} Cada país celebra de manera única, reflejando su historia y cultura.`);

    // Tema 6: Progreso de las celebraciones
    if (context.celebratedZones > 0) {
        topics.push(`Ya hemos visto ${context.celebratedZones} zonas horarias celebrar el Año Nuevo. La celebración continúa avanzando por el planeta, iluminando el mundo zona por zona. Es un espectáculo único que une a toda la humanidad.`);
    }

    // Seleccionar tema aleatorio
    const selectedTopic = topics[Math.floor(Math.random() * topics.length)];

    // Simular delay de IA
    await new Promise(resolve => setTimeout(resolve, 500));

    return selectedTopic;
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

    // Cambiar de tema cada cierto tiempo (más frecuente para que hable más)
    presenterInterval = setInterval(() => {
        if (!state.isSpeaking) {
            currentTopicIndex = (currentTopicIndex + 1) % PRESENTER_TOPICS.length;
            presentTopicWithAI(currentTopicIndex);
        }
    }, 20000); // Cambiar cada 20 segundos para que hable más frecuentemente

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

            // Iniciar scroll automático del texto
            setTimeout(() => {
                scrollPresenterText(presenterText);
            }, 500);
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

// Hacer scroll automático del texto del presentador (máximo 3 líneas, scroll hacia arriba)
let presenterScrollInterval = null;

function scrollPresenterText(textElement) {
    if (!textElement) return;

    // Limpiar intervalo anterior si existe
    if (presenterScrollInterval) {
        clearInterval(presenterScrollInterval);
    }

    // Obtener el contenedor del texto
    const container = textElement.parentElement;
    if (!container) return;

    // Configurar altura para mostrar máximo 3 líneas
    const lineHeight = parseFloat(getComputedStyle(textElement).lineHeight) || 28.8; // 16px * 1.8
    const maxHeight = lineHeight * 3; // 3 líneas
    container.style.maxHeight = `${maxHeight}px`;
    container.style.overflow = 'hidden';

    // Resetear scroll al inicio
    container.scrollTop = 0;

    // Dividir el texto en líneas y mostrar máximo 3 líneas a la vez
    const text = textElement.textContent;
    const words = text.split(' ');
    const wordsPerLine = Math.ceil(words.length / Math.ceil(textElement.scrollHeight / lineHeight));

    // Crear un sistema de scroll que muestre 3 líneas y vaya subiendo
    let currentLineIndex = 0;
    const totalLines = Math.ceil(textElement.scrollHeight / lineHeight);

    if (totalLines > 3) {
        // Scroll automático hacia arriba cada 2 segundos
        presenterScrollInterval = setInterval(() => {
            currentLineIndex++;
            const maxScroll = textElement.scrollHeight - maxHeight;

            if (currentLineIndex * lineHeight <= maxScroll) {
                container.scrollTop = currentLineIndex * lineHeight;
            } else {
                // Reiniciar cuando llegue al final
                currentLineIndex = 0;
                container.scrollTop = 0;
            }
        }, 2000); // Cambiar cada 2 segundos
    }
}

function speakPresenterMessage(message) {
    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Speech Synthesis no está disponible');
        return;
    }

    if (!message || message.trim() === '') {
        console.warn('⚠️ Mensaje vacío, no se puede leer');
        return;
    }

    console.log('🎙️ speakPresenterMessage llamado con mensaje de', message.length, 'caracteres');

    // Si ya está hablando, encolar el mensaje
    if (state.isSpeaking && state.currentUtterance) {
        console.log('⏳ Presentador ocupado, encolando mensaje...');
        // Guardar mensaje para cuando termine el actual
        if (!state.pendingMessage) {
            state.pendingMessage = message;
        }
        // Esperar a que termine el mensaje actual
        const originalOnEnd = state.currentUtterance.onend;
        state.currentUtterance.onend = () => {
            if (originalOnEnd) originalOnEnd();
            if (state.pendingMessage) {
                const nextMessage = state.pendingMessage;
                state.pendingMessage = null;
                setTimeout(() => speakPresenterMessage(nextMessage), 500);
            }
        };
        return;
    }

    // Cancelar cualquier mensaje anterior
    window.speechSynthesis.cancel();

    // Esperar un momento para asegurar que se canceló
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8; // Velocidad más lenta para mejor comprensión
        utterance.pitch = 0.6; // Voz más grave (más masculina)
        utterance.volume = 1.0; // Volumen máximo

        // Guardar referencia para evitar cortes
        state.currentUtterance = utterance;
        state.isSpeaking = true;

        // Cargar voces si no están disponibles
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                console.log('⏳ Esperando voces...');
                setTimeout(loadVoices, 100);
                return;
            }

            // Buscar la mejor voz masculina en español
            // Prioridad: voces con "Male", "Masculino", "Hombre", o que no tengan "Female"
            let bestVoice = voices.find(voice =>
                voice.lang.startsWith('es') && (
                    voice.name.toLowerCase().includes('male') ||
                    voice.name.toLowerCase().includes('masculino') ||
                    voice.name.toLowerCase().includes('hombre') ||
                    voice.name.toLowerCase().includes('varon')
                ) && !voice.name.toLowerCase().includes('female')
            ) || voices.find(voice =>
                voice.lang.startsWith('es') &&
                !voice.name.toLowerCase().includes('female') &&
                !voice.name.toLowerCase().includes('femenino') &&
                !voice.name.toLowerCase().includes('mujer')
            ) || voices.find(voice =>
                voice.lang.startsWith('es') &&
                (voice.name.includes('Neural') || voice.name.includes('Premium'))
            ) || voices.find(voice => voice.lang.startsWith('es'));

            if (bestVoice) {
                utterance.voice = bestVoice;
                console.log('✅ Voz seleccionada:', bestVoice.name);
            } else {
                console.warn('⚠️ No se encontró voz en español, usando predeterminada');
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
                console.log('🎙️ Presentador empezó a hablar');
            };

            utterance.onend = () => {
                state.aiPresenterActive = false;
                state.isSpeaking = false;
                state.currentUtterance = null;
                if (mouthOverlay) {
                    mouthOverlay.classList.remove('speaking');
                }
                console.log('✅ Presentador terminó de hablar completamente');
            };

            // Asegurar que se complete el mensaje incluso si hay pausas
            utterance.onpause = () => {
                console.log('⏸️ Voz pausada, reanudando...');
                // Reanudar automáticamente si se pausa
                if (state.isSpeaking) {
                    window.speechSynthesis.resume();
                }
            };

            utterance.onerror = (event) => {
                state.aiPresenterActive = false;
                if (mouthOverlay) {
                    mouthOverlay.classList.remove('speaking');
                }
                console.error('❌ Error en speech synthesis:', event);
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

            // Intentar reproducir
            try {
                window.speechSynthesis.speak(utterance);
                console.log('🎙️ Presentador habla:', message.substring(0, 50) + '...');

                // Hack para mantener viva la API (Chrome a veces pausa)
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
            } catch (error) {
                console.error('❌ Error al reproducir voz:', error);

                // Detectar bloqueo de autoplay
                if (error.name === 'NotAllowedError' || error.message?.includes('user gesture')) {
                    console.warn('⚠️ Autoplay bloqueado. Esperando interacción...');
                    addOneTimeInteractionListener();
                }
            }
        };

        // Cargar voces
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            loadVoices();
        } else {
            // Esperar a que se carguen las voces (con timeout máximo)
            let attempts = 0;
            const maxAttempts = 50; // Máximo 5 segundos
            const checkVoices = () => {
                attempts++;
                const currentVoices = window.speechSynthesis.getVoices();
                if (currentVoices.length > 0) {
                    loadVoices();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkVoices, 100);
                } else {
                    console.warn('⚠️ No se pudieron cargar voces después de varios intentos, usando voz predeterminada');
                    // Usar voz predeterminada sin selección
                    utterance.onstart = () => {
                        state.aiPresenterActive = true;
                        const mouthOverlay = document.getElementById('avatarMouth');
                        if (mouthOverlay) {
                            mouthOverlay.classList.add('speaking');
                        }
                    };
                    utterance.onend = () => {
                        state.aiPresenterActive = false;
                        state.isSpeaking = false;
                        state.currentUtterance = null;
                        const mouthOverlay = document.getElementById('avatarMouth');
                        if (mouthOverlay) {
                            mouthOverlay.classList.remove('speaking');
                        }
                    };

                    utterance.onpause = () => {
                        if (state.isSpeaking) {
                            window.speechSynthesis.resume();
                        }
                    };
                    try {
                        window.speechSynthesis.speak(utterance);
                        console.log('🎙️ Presentador habla (voz predeterminada):', message.substring(0, 50) + '...');
                    } catch (error) {
                        console.error('❌ Error al reproducir voz:', error);
                        if (error.name === 'NotAllowedError' || error.message?.includes('user gesture')) {
                            console.warn('⚠️ Autoplay bloqueado. Esperando interacción...');
                            addOneTimeInteractionListener();
                        }
                    }
                }
            };
            window.speechSynthesis.onvoiceschanged = checkVoices;
            setTimeout(checkVoices, 100);
        }
    }, 100);
}

// Listener de interacción única para desbloquear audio
let audioUnlocked = false;
function addOneTimeInteractionListener() {
    if (audioUnlocked) return;

    const unlockAudio = () => {
        console.log('🔓 Audio desbloqueado por interacción del usuario');
        audioUnlocked = true;

        // Intentar reanudar o hablar algo vacío para "calentar" el motor
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
            const emptyUtterance = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(emptyUtterance);
        }

        // Remover listeners
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
}

// Llamar esto al inicio para estar listos
addOneTimeInteractionListener();

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
    // Mejorar animación básica con más movimiento y realismo
    if (!state.avatarCanvas || !state.faceImage) return;

    const canvas = state.avatarCanvas;
    const ctx = state.avatarCtx;
    const img = state.faceImage;

    let animationTime = 0;
    let lastBlink = 0;
    let isBlinking = false;
    let headOffsetX = 0;
    let headOffsetY = 0;
    let headRotation = 0;

    const animate = (timestamp) => {
        if (!state.avatarCanvas) return;

        animationTime += 0.016; // ~60 FPS

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Movimiento sutil de la cabeza (respiración y movimiento natural)
        headOffsetX = Math.sin(animationTime * 0.5) * 2;
        headOffsetY = Math.cos(animationTime * 0.3) * 1.5;
        headRotation = Math.sin(animationTime * 0.2) * 1; // Rotación sutil

        // Movimiento adicional cuando habla
        if (state.aiPresenterActive) {
            headOffsetX += Math.sin(animationTime * 2) * 1;
            headOffsetY += Math.cos(animationTime * 1.5) * 0.5;
            headRotation += Math.sin(animationTime * 1.5) * 0.5;
        }

        // Parpadeo natural (cada 3-5 segundos)
        if (timestamp - lastBlink > 3000 + Math.random() * 2000) {
            isBlinking = true;
            lastBlink = timestamp;
            setTimeout(() => {
                isBlinking = false;
            }, 150);
        }

        // Guardar contexto
        ctx.save();

        // Aplicar transformaciones (centro del canvas)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(headRotation * Math.PI / 180);
        ctx.translate(-canvas.width / 2 + headOffsetX, -canvas.height / 2 + headOffsetY);

        // Dibujar imagen con escala sutil para efecto de "respiración"
        const scale = 1 + Math.sin(animationTime * 0.4) * 0.02;
        const scaledWidth = canvas.width * scale;
        const scaledHeight = canvas.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

        // Efecto de parpadeo
        if (isBlinking) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height / 3);
        }

        // Restaurar contexto
        ctx.restore();

        // Continuar animación
        state.animationFrame = requestAnimationFrame(animate);
    };

    // Iniciar animación
    state.animationFrame = requestAnimationFrame(animate);

    // Agregar movimiento adicional cuando habla
    const avatarElement = document.getElementById('presenterAvatar');
    if (avatarElement) {
        // Agregar clase para animación CSS adicional
        avatarElement.classList.add('animated');
    }
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
        const mouthRegion = ctx.getImageData(mouthX - mouthSize, mouthY - mouthSize / 2, mouthSize * 2, mouthSize);
        ctx.putImageData(mouthRegion, mouthX - mouthSize, mouthY - mouthSize / 2);
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
        window.speechSynthesis.speak = function (utterance) {
            const mouthOverlay = document.getElementById('avatarMouth');

            utterance.onstart = function () {
                if (mouthOverlay) {
                    mouthOverlay.classList.add('speaking');
                }
            };

            utterance.onend = function () {
                if (mouthOverlay) {
                    mouthOverlay.classList.remove('speaking');
                }
            };

            utterance.onerror = function () {
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
    try {
        updateTimeDisplay();
        updateCountdown();
        // Actualizar también el panel del próximo país cada segundo
        if (state.highmapsChart) {
            updateNextCountryPanel();
            // Forzar iluminación de países cada segundo
            highlightCountriesAtGreenwich();
        }
    } catch (error) {
        console.warn('⚠️ Error en updateAll:', error);
    }
    // updateWorldMap se llama por separado para rotación y día/noche
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
