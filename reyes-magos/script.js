/**
 * El Viaje de los Reyes Magos
 * Representación interactiva del viaje de Melchor, Gaspar y Baltasar
 */

// Ruta histórica aproximada de los Reyes Magos con historias y detalles
const KINGS_ROUTE = [
    { 
        name: "Persia (Oriente)", 
        lat: 32.4279, 
        lon: 53.6880, 
        country: "Iran", 
        description: "Inicio del viaje desde el Oriente",
        story: "Imagínense, amigos. Melchor, Gaspar y Baltasar comenzaron su increíble viaje desde las tierras de Persia. Cada uno llevaba consigo un regalo especial: Melchor traía oro, Gaspar incienso, y Baltasar mirra. Y ahí arriba, brillando en el cielo, una estrella los guiaba hacia el oeste, hacia una tierra que cambiaría el mundo para siempre.",
        placeInfo: "Persia, cuna de grandes imperios y sabiduría antigua. Desde aquí, los tres sabios iniciaron su peregrinación siguiendo la señal celestial.",
        naturalNarration: "Desde Persia, los tres reyes comenzaron su viaje. La estrella brillaba en el cielo, guiándolos hacia el oeste. Cada uno llevaba su regalo: Melchor el oro, Gaspar el incienso, y Baltasar la mirra."
    },
    { 
        name: "Babilonia", 
        lat: 32.5364, 
        lon: 44.4208, 
        country: "Iraq", 
        description: "Pasando por las antiguas tierras de Babilonia",
        story: "Al cruzar Babilonia, los reyes recordaron las profecías antiguas sobre un Mesías que nacería en Belén. Melchor, el más anciano, conocía las escrituras y guiaba al grupo con su sabiduría. Las ruinas de la antigua Babilonia les recordaban la grandeza de los imperios pasados.",
        placeInfo: "Babilonia, donde una vez se alzaron los Jardines Colgantes. Los reyes pasaron por estas tierras históricas, siguiendo su camino hacia el oeste.",
        naturalNarration: "Cruzando Babilonia, Melchor recordó las antiguas profecías. Él, siendo el más sabio, guiaba al grupo. Las ruinas les hablaban de imperios pasados, pero ellos buscaban algo más grande."
    },
    { 
        name: "Damasco", 
        lat: 33.5138, 
        lon: 36.2765, 
        country: "Syria", 
        description: "Cruzando Damasco, ciudad de comercio",
        story: "En Damasco, Gaspar, el rey de la media edad, se maravilló con los aromas del incienso que él mismo portaba. La ciudad era un cruce de caminos donde se encontraban caravanas de todo el mundo conocido. Aquí descansaron y repusieron fuerzas antes de continuar.",
        placeInfo: "Damasco, una de las ciudades más antiguas del mundo. Centro de comercio donde las rutas de Oriente y Occidente se encontraban.",
        naturalNarration: "En Damasco, Gaspar se detuvo a admirar los aromas. La ciudad bullía con comerciantes de todas partes. Aquí descansaron un momento, reponiendo fuerzas para continuar su viaje."
    },
    { 
        name: "Jerusalén", 
        lat: 31.7683, 
        lon: 35.2137, 
        country: "Israel", 
        description: "Consultando al rey Herodes",
        story: "Al llegar a Jerusalén, los reyes consultaron al rey Herodes sobre el nacimiento del nuevo rey. Herodes, temeroso, les pidió que le informaran cuando encontraran al niño. Pero los reyes, guiados por la estrella y su sabiduría, continuaron su camino hacia Belén sin volver.",
        placeInfo: "Jerusalén, la ciudad santa. Aquí los reyes se encontraron con Herodes, pero su destino estaba más al sur, en la pequeña Belén.",
        naturalNarration: "En Jerusalén, los reyes hablaron con Herodes. Él les pidió que le avisaran cuando encontraran al niño, pero algo en su mirada no les gustó. Confiando en la estrella, siguieron su camino hacia Belén."
    },
    { 
        name: "Belén", 
        lat: 31.7054, 
        lon: 35.2024, 
        country: "Palestine", 
        description: "Llegada al pesebre del Niño Jesús",
        story: "Finalmente, la estrella se detuvo sobre Belén. Los tres reyes magos encontraron al Niño Jesús en un humilde pesebre. Melchor ofreció su oro, símbolo de realeza. Gaspar presentó el incienso, símbolo de divinidad. Y Baltasar entregó la mirra, símbolo de humanidad y sacrificio. Adoraron al niño y partieron por otro camino, evitando a Herodes.",
        placeInfo: "Belén, la pequeña ciudad donde nació el Salvador. Aquí culminó el viaje de los tres reyes magos, encontrando al Niño Jesús en un pesebre.",
        naturalNarration: "Y finalmente, la estrella se detuvo sobre Belén. Allí encontraron al Niño Jesús. Melchor entregó su oro, Gaspar su incienso, y Baltasar su mirra. Adoraron al niño y partieron por otro camino, sabiendo que habían cumplido su misión."
    }
];

const KINGS = {
    melchor: { 
        name: "Melchor", 
        gift: "Oro", 
        color: "#fbbf24", 
        icon: "👑",
        story: "Melchor, el más anciano de los tres, era un sabio de Persia. Representaba a Europa y ofrecía oro como símbolo de realeza. Su barba blanca y su sabiduría lo convertían en el guía del grupo.",
        origin: "Persia (Europa)"
    },
    gaspar: { 
        name: "Gaspar", 
        gift: "Incienso", 
        color: "#3b82f6", 
        icon: "👑",
        story: "Gaspar, de mediana edad, representaba a Asia. Portaba incienso, símbolo de la divinidad y la oración. Su conocimiento de las estrellas ayudó a seguir la estrella de Belén.",
        origin: "Asia"
    },
    baltasar: { 
        name: "Baltasar", 
        gift: "Mirra", 
        color: "#10b981", 
        icon: "👑",
        story: "Baltasar, el más joven, representaba a África. Llevaba mirra, un perfume usado en embalsamamientos, símbolo de la humanidad y el sacrificio futuro. Su juventud aportaba energía al viaje.",
        origin: "África"
    }
};

class ReyesMagosMap {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.currentStep = 0;
        this.projection = null;
        this.path = null;
        this.svg = null;
        this.routeLine = null;
        this.kingMarkers = [];
        
        this.init();
    }

    init() {
        // Inicializar música de fondo
        this.initMusic();
        
        // Inicializar voz en off
        this.initVoice();
        
        // Crear SVG
        this.createSVG();
        
        // Cargar datos del mapa
        this.loadMapData();
        
        // Iniciar animación del viaje
        setTimeout(() => this.startJourney(), 2000);
    }
    
    initVoice() {
        // Verificar soporte de Web Speech API
        if ('speechSynthesis' in window) {
            this.voiceAvailable = true;
            // Configurar voz en español
            const voices = speechSynthesis.getVoices();
            this.spanishVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
        } else {
            this.voiceAvailable = false;
            console.warn('Web Speech API no disponible');
        }
    }
    
    speak(text, callback) {
        if (!this.voiceAvailable) {
            // Si no hay voz, esperar un tiempo estimado basado en la longitud del texto
            const estimatedTime = (text.length / 10) * 1000; // ~10 caracteres por segundo
            setTimeout(() => {
                if (callback) callback();
            }, estimatedTime);
            return;
        }
        
        // Cancelar cualquier narración anterior
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.85; // Velocidad más lenta para mejor comprensión
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        if (this.spanishVoice) {
            utterance.voice = this.spanishVoice;
        }
        
        utterance.onend = () => {
            if (callback) callback();
        };
        
        utterance.onerror = (e) => {
            console.warn('Error en síntesis de voz:', e);
            // Si hay error, esperar tiempo estimado
            const estimatedTime = (text.length / 10) * 1000;
            setTimeout(() => {
                if (callback) callback();
            }, estimatedTime);
        };
        
        speechSynthesis.speak(utterance);
    }

    initMusic() {
        const audio = document.getElementById('background-music');
        if (audio) {
            audio.volume = 0.25; // Volumen bajo para música de fondo
            // Intentar reproducir automáticamente
            audio.play().catch(e => {
                console.log('Audio requiere interacción del usuario:', e);
                // Intentar reproducir cuando haya interacción
                const tryPlay = () => {
                    audio.play().catch(() => {});
                };
                document.addEventListener('click', tryPlay, { once: true });
                document.addEventListener('touchstart', tryPlay, { once: true });
            });
        } else {
            // Si no hay archivo de música, usar música online de fondo
            this.initOnlineMusic();
        }
    }
    
    initOnlineMusic() {
        // Usar música de dominio público o libre de derechos
        // Nota: En producción, usar archivo local o servicio de música
        console.log('No se encontró archivo de música local. Agregar music.mp3 o music.ogg en la carpeta.');
    }

    createSVG() {
        const container = d3.select('#map-container');
        container.selectAll('*').remove();

        this.svg = container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('background', 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%)');

        // Proyección del mapa
        this.projection = d3.geoMercator()
            .scale(150)
            .center([45, 30]) // Centrado en Medio Oriente
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Grupo contenedor para todas las transformaciones
        this.gAll = this.svg.append('g').attr('class', 'all-groups');
        
        // Grupo para el mapa
        this.gMap = this.gAll.append('g').attr('class', 'map-group');
        
        // Grupo para la ruta
        this.gRoute = this.gAll.append('g').attr('class', 'route-group');
        
        // Grupo para los marcadores de los reyes
        this.gKings = this.gAll.append('g').attr('class', 'kings-group');
        
        // Grupo para estrellas (no se transforma con zoom)
        this.gStars = this.svg.append('g').attr('class', 'stars-group');
    }

    async loadMapData() {
        try {
            // Cargar datos del mundo (usando TopoJSON simplificado)
            const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            
            // Convertir TopoJSON a GeoJSON
            const countries = topojson.feature(world, world.objects.countries);
            
            // Dibujar países
            this.gMap.selectAll('.country')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', this.path);

            // Dibujar estrellas en el fondo
            this.drawStars();
            
        } catch (error) {
            console.error('Error cargando datos del mapa:', error);
            // Fallback: dibujar ruta básica sin mapa detallado
            this.drawBasicRoute();
        }
    }

    drawStars() {
        if (!this.gStars) {
            this.gStars = this.svg.append('g').attr('class', 'stars-group');
        }
        
        const starCount = 80;
        
        for (let i = 0; i < starCount; i++) {
            this.gStars.append('circle')
                .attr('class', 'star')
                .attr('cx', Math.random() * this.width)
                .attr('cy', Math.random() * this.height)
                .attr('r', Math.random() * 2 + 1)
                .attr('fill', '#fff')
                .style('opacity', Math.random() * 0.5 + 0.3);
        }
        
        // Agregar estrella especial de Belén (más grande y brillante)
        const bethlehemStar = this.gStars.append('circle')
            .attr('class', 'star bethlehem-star')
            .attr('cx', this.width * 0.6)
            .attr('cy', this.height * 0.3)
            .attr('r', 4)
            .attr('fill', '#fbbf24')
            .style('opacity', 1)
            .style('filter', 'drop-shadow(0 0 10px rgba(251, 191, 36, 1))');
        
        // Animación de la estrella de Belén
        bethlehemStar
            .transition()
            .duration(2000)
            .attr('r', 6)
            .style('opacity', 0.8)
            .transition()
            .duration(2000)
            .attr('r', 4)
            .style('opacity', 1)
            .on('end', function repeat() {
                d3.select(this)
                    .transition()
                    .duration(2000)
                    .attr('r', 6)
                    .style('opacity', 0.8)
                    .transition()
                    .duration(2000)
                    .attr('r', 4)
                    .style('opacity', 1)
                    .on('end', repeat);
            });
    }

    drawBasicRoute() {
        // Si no se puede cargar el mapa, dibujar ruta básica
        const routePoints = KINGS_ROUTE.map(loc => this.projection([loc.lon, loc.lat]));
        
        const line = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveCardinal);
        
        this.gRoute.append('path')
            .datum(routePoints)
            .attr('class', 'route-line')
            .attr('d', line);
    }

    startJourney() {
        this.updateLocation(0);
    }
    
    /**
     * Avanza al siguiente paso cuando la narración termine
     */
    async advanceToNextStep() {
        // Esperar un tiempo adicional después de que termine la narración
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos adicionales para leer
        
        this.currentStep++;
        if (this.currentStep >= KINGS_ROUTE.length) {
            this.completeJourney();
            // Reiniciar el viaje automáticamente después de 8 segundos para streaming continuo
            setTimeout(() => {
                this.currentStep = 0;
                this.startJourney(); // Reiniciar ciclo infinito
            }, 8000);
        } else {
            this.updateLocation(this.currentStep);
        }
    }

    updateLocation(step) {
        const location = KINGS_ROUTE[step];
        
        // Actualizar texto de ubicación con historia
        const locationEl = document.getElementById('current-location');
        if (!locationEl) {
            console.warn('No se encontró #current-location');
            return;
        }
        
        // Mostrar información completa del lugar
        let locationText = `<strong>${location.name}</strong><br>${location.description}<br><br><em>${location.placeInfo}</em>`;
        if (location.story) {
            locationText += `<br><br>${location.story}`;
        }
        locationEl.innerHTML = locationText;
        
        // Actualizar marcadores en el mapa con animación de los reyes
        this.updateMapMarkers(location);
        
        // Animar los tres reyes moviéndose hacia el punto (con imágenes IA)
        this.animateKingsToLocation(location, step).catch(e => {
            console.warn('Error animando reyes:', e);
        });
        
        // Actualizar países visitados
        this.updateVisitedCountries(step);
        
        // Resaltar rey activo (rotar entre los 3) y mostrar su historia
        const activeKing = Object.keys(KINGS)[step % 3];
        this.highlightKing(activeKing);
        this.showKingStory(activeKing);
        
        // Narrar con voz en off (esto avanzará automáticamente cuando termine)
        this.narrateLocation(location, activeKing);
    }
    
    /**
     * Narra la ubicación y la historia con voz en off (más natural)
     * Retorna una promesa que se resuelve cuando termina la narración
     */
    narrateLocation(location, activeKing) {
        return new Promise((resolve) => {
            const king = KINGS[activeKing];
            
            // Usar narrativa natural si está disponible, sino usar la historia
            let narration = location.naturalNarration || location.story || `${location.description}.`;
            
            // Agregar información sobre el rey activo ocasionalmente de forma natural
            if (king && this.currentStep % 3 === 0) {
                narration += ` En este momento, ${king.name} guía al grupo. ${king.story}`;
            }
            
            // Hablar con síntesis de voz y avanzar cuando termine
            this.speak(narration, () => {
                // Cuando termine la narración, avanzar al siguiente paso
                this.advanceToNextStep();
                resolve();
            });
        });
    }
    
    /**
     * Genera imagen de un rey usando IA
     */
    async generateKingImage(kingName, location) {
        // Si ya tenemos la imagen en cache, usarla
        const cacheKey = `${kingName}_${location.name}`;
        if (this.kingImages[cacheKey]) {
            console.log(`✅ Usando imagen en cache para ${kingName} en ${location.name}`);
            return this.kingImages[cacheKey];
        }
        
        try {
            console.log(`🎨 Generando imagen para ${kingName} en ${location.name}...`);
            const response = await fetch(`${this.apiBase}/api/generate-king-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kingName: kingName,
                    location: location.name,
                    context: `traveling through ${location.name}, following the star`
                })
            });
            
            if (!response.ok) {
                console.warn(`⚠️ Error HTTP ${response.status} al generar imagen`);
                return null;
            }
            
            const result = await response.json();
            if (result.url) {
                // Construir la URL completa
                const fullUrl = result.url.startsWith('http') ? result.url : `${this.apiBase}${result.url}`;
                this.kingImages[cacheKey] = fullUrl;
                console.log(`✅ Imagen generada exitosamente: ${fullUrl}`);
                return fullUrl;
            } else if (result.error) {
                console.warn(`⚠️ Error del servidor: ${result.error}`);
            }
        } catch (e) {
            console.warn('❌ No se pudo generar imagen con IA:', e.message);
        }
        
        return null;
    }
    
    /**
     * Anima los tres reyes magos moviéndose hacia la ubicación actual (con imágenes IA)
     */
    async animateKingsToLocation(location, step) {
        const [x, y] = this.projection([location.lon, location.lat]);
        
        // Limpiar marcadores y animaciones anteriores
        this.gKings.selectAll('.king-marker, .king-icon-svg, .king-animation, .king-label, .king-image').remove();
        
        // Crear marcadores para los 3 reyes con pequeñas variaciones de posición
        const kingOffsets = [
            { x: -30, y: -30 }, // Melchor
            { x: 0, y: 0 },     // Gaspar (centro)
            { x: 30, y: 30 }    // Baltasar
        ];
        
        // Generar imágenes en paralelo
        const imagePromises = Object.keys(KINGS).map(async (kingName) => {
            return await this.generateKingImage(kingName, location);
        });
        const images = await Promise.all(imagePromises);
        
        Object.keys(KINGS).forEach((kingName, index) => {
            const king = KINGS[kingName];
            const offset = kingOffsets[index];
            const kingImage = images[index];
            
            // Grupo para cada rey con animación
            const kingGroup = this.gKings.append('g')
                .attr('class', `king-animation king-${kingName}`)
                .attr('transform', `translate(${x + offset.x}, ${y + offset.y})`)
                .style('opacity', 0);
            
            // Si tenemos imagen generada con IA, usarla
            if (kingImage) {
                const imageSize = 80; // Imagen más grande para mejor visibilidad
                const imageElement = kingGroup.append('image')
                    .attr('class', 'king-image')
                    .attr('href', kingImage)
                    .attr('x', -imageSize/2)
                    .attr('y', -imageSize/2)
                    .attr('width', imageSize)
                    .attr('height', imageSize)
                    .style('filter', `drop-shadow(0 0 15px ${king.color})`)
                    .style('clip-path', 'circle(40px)');
                
                // Manejar errores de carga de imagen
                imageElement.on('error', function() {
                    console.warn(`⚠️ Error cargando imagen para ${kingName}, usando fallback`);
                    d3.select(this).remove();
                    // Crear fallback
                    kingGroup.append('circle')
                        .attr('class', 'king-marker')
                        .attr('r', 25)
                        .attr('fill', king.color)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 3)
                        .style('filter', `drop-shadow(0 0 10px ${king.color})`);
                    
                    kingGroup.append('text')
                        .attr('class', 'king-icon-svg')
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .attr('font-size', '28px')
                        .text('👑')
                        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))');
                });
            } else {
                // Fallback: círculo con corona
                kingGroup.append('circle')
                    .attr('class', 'king-marker')
                    .attr('r', 25)
                    .attr('fill', king.color)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 3)
                    .style('filter', `drop-shadow(0 0 10px ${king.color})`);
                
                kingGroup.append('text')
                    .attr('class', 'king-icon-svg')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .attr('font-size', '28px')
                    .text('👑')
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))');
            }
            
            // Animación de entrada con efecto de aparición
            kingGroup.transition()
                .duration(1500)
                .style('opacity', 1)
                .attr('transform', `translate(${x + offset.x}, ${y + offset.y}) scale(1)`);
            
            // Animación continua de flotación
            kingGroup.transition()
                .duration(2000)
                .ease(d3.easeSinInOut)
                .attr('transform', `translate(${x + offset.x}, ${y + offset.y - 5}) scale(1)`)
                .transition()
                .duration(2000)
                .ease(d3.easeSinInOut)
                .attr('transform', `translate(${x + offset.x}, ${y + offset.y}) scale(1)`)
                .on('end', function repeat() {
                    d3.select(this)
                        .transition()
                        .duration(2000)
                        .ease(d3.easeSinInOut)
                        .attr('transform', `translate(${x + offset.x}, ${y + offset.y - 5}) scale(1)`)
                        .transition()
                        .duration(2000)
                        .ease(d3.easeSinInOut)
                        .attr('transform', `translate(${x + offset.x}, ${y + offset.y}) scale(1)`)
                        .on('end', repeat);
                });
            
            // Agregar etiqueta con nombre del rey
            this.gKings.append('text')
                .attr('class', 'king-label')
                .attr('x', x + offset.x)
                .attr('y', y + offset.y - 45)
                .attr('text-anchor', 'middle')
                .attr('fill', king.color)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .attr('font-family', 'Cinzel, serif')
                .style('opacity', 0)
                .style('text-shadow', `0 0 10px ${king.color}`)
                .text(king.name)
                .transition()
                .duration(1500)
                .style('opacity', 1);
        });
    }
    
    /**
     * Muestra la historia del rey activo
     */
    showKingStory(kingName) {
        const king = KINGS[kingName];
        if (!king) return;
        
        // Actualizar la tarjeta del rey con su historia
        const kingCard = document.querySelector(`.king-card[data-king="${kingName}"]`);
        if (kingCard) {
            // Agregar tooltip o expandir información
            const giftEl = kingCard.querySelector('.king-gift');
            if (giftEl && king.story) {
                // Mostrar historia en un tooltip o texto adicional
                kingCard.title = king.story;
                
                // Agregar información adicional si no existe
                let storyEl = kingCard.querySelector('.king-story');
                if (!storyEl) {
                    storyEl = document.createElement('div');
                    storyEl.className = 'king-story';
                    storyEl.style.cssText = 'font-size: 0.75rem; color: #94a3b8; margin-top: 5px; font-style: italic;';
                    kingCard.appendChild(storyEl);
                }
                storyEl.textContent = king.origin;
            }
        }
    }

    updateMapMarkers(location) {
        // Limpiar etiquetas anteriores (los marcadores se manejan en animateKingsToLocation)
        this.gKings.selectAll('.king-label').remove();
        
        // Dibujar ruta hasta aquí
        const routePoints = KINGS_ROUTE.slice(0, this.currentStep + 1)
            .map(loc => this.projection([loc.lon, loc.lat]));
        
        const line = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveCardinal);
        
        this.gRoute.selectAll('.route-line').remove();
        this.gRoute.append('path')
            .datum(routePoints)
            .attr('class', 'route-line')
            .attr('d', line);
        
        // Zoom suave al punto actual
        this.zoomToLocation(location);
    }

    zoomToLocation(location) {
        const [x, y] = this.projection([location.lon, location.lat]);
        const scale = 1.3; // Zoom suave para ver todo el mapa (reducido de 4 a 1.3)
        
        // Transformar el grupo contenedor que incluye mapa, ruta y reyes
        if (this.gAll) {
            this.gAll
                .transition()
                .duration(2000)
                .ease(d3.easeCubicInOut)
                .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
        } else {
            // Fallback si gAll no existe aún
            this.gMap
                .transition()
                .duration(2000)
                .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
            this.gRoute
                .transition()
                .duration(2000)
                .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
            this.gKings
                .transition()
                .duration(2000)
                .attr('transform', `translate(${this.width / 2 - x * scale}, ${this.height / 2 - y * scale}) scale(${scale})`);
        }
    }

    updateVisitedCountries(step) {
        // Marcar países visitados
        this.gMap.selectAll('.country')
            .classed('visited', false)
            .classed('current', false);
        
        // Marcar país actual
        const currentLocation = KINGS_ROUTE[step];
        this.gMap.selectAll('.country')
            .filter((d, i) => {
                // Simplificado: marcar países cercanos
                return true; // En una implementación real, verificaría el país específico
            })
            .classed('current', true);
    }

    highlightKing(kingName) {
        // Resaltar rey activo en la UI
        const kingCards = document.querySelectorAll('.king-card');
        if (kingCards.length === 0) {
            console.warn('No se encontraron elementos .king-card');
            return;
        }
        
        kingCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.king === kingName) {
                card.classList.add('active');
            }
        });
    }

    completeJourney() {
        const locationEl = document.getElementById('current-location');
        if (locationEl) {
            locationEl.innerHTML = "✨ <strong>Los Reyes Magos han llegado a Belén</strong><br><br>Melchor, Gaspar y Baltasar han adorado al Niño Jesús y ofrecido sus regalos: Oro, Incienso y Mirra. Han cumplido su misión siguiendo la estrella de Belén.<br><br><em>El viaje continuará en breve...</em>";
        }
        
        // Efecto especial al finalizar - los tres reyes juntos
        this.gKings.selectAll('.king-marker')
            .transition()
            .duration(1000)
            .attr('r', 15)
            .style('opacity', 0.8)
            .transition()
            .duration(1000)
            .attr('r', 12)
            .style('opacity', 1);
        
        // Efecto de brillo en todos los reyes
        this.gKings.selectAll('.king-marker')
            .transition()
            .duration(500)
            .attr('r', 18)
            .style('filter', 'drop-shadow(0 0 20px rgba(251, 191, 36, 1))')
            .transition()
            .duration(500)
            .attr('r', 12)
            .style('filter', 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))');
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        
        this.projection
            .translate([this.width / 2, this.height / 2]);
        
        // Redibujar
        this.gMap.selectAll('.country').attr('d', this.path);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReyesMagos);
} else {
    // DOM ya está listo
    initReyesMagos();
}

function initReyesMagos() {
    // Verificar que los elementos necesarios existan
    const mapContainer = document.getElementById('map-container');
    const currentLocation = document.getElementById('current-location');
    
    if (!mapContainer) {
        console.error('Error: No se encontró #map-container');
        return;
    }
    
    if (!currentLocation) {
        console.error('Error: No se encontró #current-location');
        return;
    }
    
    try {
        const map = new ReyesMagosMap();
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => {
            if (map && typeof map.handleResize === 'function') {
                map.handleResize();
            }
        });
    } catch (error) {
        console.error('Error inicializando mapa de Reyes Magos:', error);
    }
}
