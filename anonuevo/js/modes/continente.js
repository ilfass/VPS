import { audioManager, AUDIO_STATES } from '../utils/audio-manager.js';
import { avatarSubtitlesManager } from '../utils/avatar-subtitles.js';
import { pacingEngine, CONTENT_TYPES } from '../utils/pacing-engine.js';
import { eventManager } from '../utils/event-manager.js?v=2';
import { COUNTRY_INFO } from '../data/country-info.js';
import { timeEngine } from '../utils/time.js';

// Mapeo de países a continentes
const CONTINENT_MAP = {
    '032': 'América del Sur', '076': 'América del Sur', '152': 'América del Sur', '170': 'América del Sur',
    '218': 'América del Sur', '484': 'América del Norte', '604': 'América del Sur', '840': 'América del Norte',
    '858': 'América del Sur', '124': 'América del Norte', '724': 'Europa', '250': 'Europa', '380': 'Europa',
    '826': 'Europa', '276': 'Europa', '528': 'Europa', '616': 'Europa'
};

export default class ContinenteMode {
    constructor(container) {
        this.container = container;
        this.currentContinent = null;
        this.countriesData = [];
        this.isNarrating = false;
    }

    async mount() {
        console.log('[Continente] Montando página de continente...');
        
        // Inicializar eventManager si no está inicializado
        if (!eventManager.pollInterval) {
            eventManager.init();
        }
        
        // Limpiar contenedor primero
        this.container.innerHTML = '';
        
        // Inicializar avatar INMEDIATAMENTE para que sea visible
        avatarSubtitlesManager.init(this.container);
        // Forzar visibilidad del avatar
        setTimeout(() => {
            avatarSubtitlesManager.show();
        }, 100);
        
        // Iniciar música de fondo de forma robusta
        if (!audioManager.musicLayer) {
            await audioManager.init();
        }
        
        // Asegurar que la música se mantenga reproduciendo (solo si no hay comando manual pendiente)
        const ensureMusicPlaying = () => {
            // NO hacer nada si hay un comando de música pendiente (para evitar conflictos)
            if (lastMusicCommand && (Date.now() - lastMusicCommandTime) < 2000) {
                return;
            }
            
            if (!audioManager.isMusicPlaying && audioManager.musicLayer && !audioManager.musicLayer.paused) {
                // Solo iniciar si realmente está detenida y no hay comando manual
                audioManager.musicLayer.play().then(() => {
                    audioManager.isMusicPlaying = true;
                    audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    console.log('[Continente] ✅ Música recuperada automáticamente');
                }).catch(e => {
                    // Silenciar errores de autoplay
                });
            } else if (audioManager.musicLayer && audioManager.musicLayer.paused && audioManager.isMusicPlaying) {
                // Solo reanudar si realmente debería estar reproduciendo y no hay comando manual
                if (!lastMusicCommand || (Date.now() - lastMusicCommandTime) > 2000) {
                    audioManager.musicLayer.play().catch(e => {
                        // Silenciar errores
                    });
                }
            }
        };
        
        // Intentar iniciar música inmediatamente (solo una vez)
        if (!audioManager.isMusicPlaying) {
            audioManager.startAmbience();
        }
        
        // Verificar periódicamente que la música siga reproduciéndose (con intervalo más largo)
        this.musicCheckInterval = setInterval(() => {
            ensureMusicPlaying();
        }, 10000); // Verificar cada 10 segundos (menos agresivo)
        
        // Habilitar audio después de interacción
        const enableAudio = () => {
            audioManager.tryStartAfterInteraction();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Registrar handler para comandos de música con protección contra duplicados
        let lastMusicCommand = null;
        let lastMusicCommandTime = 0;
        
        eventManager.on('music_command', (musicState) => {
            const now = Date.now();
            
            // Evitar procesar el mismo comando múltiples veces en menos de 1000ms
            if (lastMusicCommand === musicState.command && (now - lastMusicCommandTime) < 1000) {
                console.log('[Continente] ⚠️ Comando de música duplicado ignorado:', musicState.command);
                return;
            }
            
            lastMusicCommand = musicState.command;
            lastMusicCommandTime = now;
            
            console.log('[Continente] 🎵 Comando de música recibido:', musicState.command);
            if (musicState.command === 'toggle') {
                audioManager.toggleMusic();
            } else if (musicState.command === 'next') {
                audioManager.nextTrack();
                if (!audioManager.isMusicPlaying && audioManager.musicLayer) {
                    audioManager.musicLayer.play().then(() => {
                        audioManager.isMusicPlaying = true;
                        audioManager.fadeAudio(audioManager.musicLayer, 0.0, 0.3, 2000);
                    }).catch(e => console.warn('[Continente] Error iniciando música:', e));
                }
            }
        });
        
        // Cargar datos y empezar narración
        await this.loadContinentData();
        await this.startNarration();
    }

    async loadContinentData() {
        try {
            // Obtener memorias de países
            const res = await fetch('/control-api/api/country-memory');
            if (res.ok) {
                const data = await res.json();
                const memories = data.memories || [];
                
                // Agrupar por continente
                const continentGroups = {};
                memories.forEach(m => {
                    const countryInfo = COUNTRY_INFO[m.countryId];
                    if (countryInfo) {
                        const continent = CONTINENT_MAP[m.countryId] || 'Otros';
                        if (!continentGroups[continent]) {
                            continentGroups[continent] = {
                                name: continent,
                                countries: [],
                                totalVisits: 0,
                                lastVisit: null
                            };
                        }
                        continentGroups[continent].countries.push({
                            id: m.countryId,
                            name: countryInfo.name,
                            visits: m.totalVisits || 0,
                            lastVisit: m.lastVisit
                        });
                        continentGroups[continent].totalVisits += (m.totalVisits || 0);
                        if (!continentGroups[continent].lastVisit || 
                            (m.lastVisit && new Date(m.lastVisit) > new Date(continentGroups[continent].lastVisit))) {
                            continentGroups[continent].lastVisit = m.lastVisit;
                        }
                    }
                });
                
                // Seleccionar continente con más visitas o el más reciente
                const continents = Object.values(continentGroups);
                if (continents.length > 0) {
                    this.currentContinent = continents.sort((a, b) => 
                        b.totalVisits - a.totalVisits || 
                        (b.lastVisit ? new Date(b.lastVisit) : 0) - (a.lastVisit ? new Date(a.lastVisit) : 0)
                    )[0];
                    this.countriesData = this.currentContinent.countries;
                } else {
                    // Si no hay datos, usar continente por defecto
                    this.currentContinent = { name: 'América del Sur', countries: [], totalVisits: 0 };
                }
            }
        } catch (e) {
            console.error('[Continente] Error cargando datos:', e);
            this.currentContinent = { name: 'América del Sur', countries: [], totalVisits: 0 };
        }
    }

    async startNarration() {
        this.isNarrating = true;
        pacingEngine.startEvent(CONTENT_TYPES.VOICE);
        
        // Generar texto narrativo
        const continentName = this.currentContinent.name;
        const countriesCount = this.countriesData.length;
        const totalVisits = this.currentContinent.totalVisits;
        
        // Texto inicial inmediato
        const immediateText = `Estamos explorando ${continentName}. Hasta ahora hemos visitado ${countriesCount} país${countriesCount !== 1 ? 'es' : ''} en este continente, con un total de ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}.`;
        
        // Mostrar subtítulos
        avatarSubtitlesManager.setSubtitles(immediateText);
        
        // Generar texto completo con IA en paralelo
        const generateFullTextPromise = this.generateFullNarrative();
        
        // Empezar a hablar inmediatamente
        const updateSubtitles = (text) => {
            avatarSubtitlesManager.setSubtitles(text);
        };
        
        audioManager.speak(immediateText, 'normal', async () => {
            // Esperar texto completo
            let fullText = null;
            try {
                fullText = await Promise.race([
                    generateFullTextPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 8000))
                ]);
            } catch (e) {
                console.warn('[Continente] Error generando texto completo:', e);
            }
            
            if (fullText && fullText !== immediateText) {
                audioManager.speak(fullText, 'normal', () => {
                    this.isNarrating = false;
                    pacingEngine.endCurrentEvent();
                    pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                    // Dream Mode: Cambiar automáticamente después de la narración
                    this.scheduleNextPage();
                }, updateSubtitles);
            } else {
                this.isNarrating = false;
                pacingEngine.endCurrentEvent();
                pacingEngine.startEvent(CONTENT_TYPES.VISUAL);
                // Dream Mode: Cambiar automáticamente después de la narración
                this.scheduleNextPage();
            }
        }, updateSubtitles);
        
        // Renderizar visualización
        this.renderVisualization();
    }

    async generateFullNarrative() {
        try {
            const countriesList = this.countriesData.map(c => c.name).join(', ');
            const totalVisits = this.currentContinent.totalVisits;
            const continentName = this.currentContinent.name;
            
            // Variar el prompt para evitar repeticiones
            const promptVariations = [
                `Eres ilfass, una inteligencia que viaja por el mundo documentando la existencia humana. Estás mostrando información sobre ${continentName}, donde has visitado ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''} diferentes: ${countriesList}. Con un total de ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}. Genera una narrativa reflexiva y personal en primera persona sobre la diversidad, las conexiones y las experiencias únicas de este continente. Habla sobre lo que has aprendido, las diferencias culturales, y la belleza de la variedad humana. Entre 150 y 220 palabras.`,
                `Estás explorando ${continentName} como ilfass. Has documentado ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''} (${countriesList}) con ${totalVisits} visita${totalVisits !== 1 ? 's' : ''} en total. Genera un relato en primera persona que reflexione sobre las particularidades de este continente, sus culturas, geografías y la forma en que cada país aporta algo único al viaje. Sé específico sobre lo que hace especial a este continente. Entre 150 y 220 palabras.`,
                `Como ilfass, estás presentando ${continentName} a tu audiencia. Has visitado ${countriesList} (${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''}, ${totalVisits} visita${totalVisits !== 1 ? 's' : ''}). Genera una narrativa personal que conecte las experiencias de estos países, que hable sobre patrones que has observado, contrastes interesantes, y lo que este continente representa en tu viaje global. Habla en primera persona, de forma natural y evocadora. Entre 150 y 220 palabras.`
            ];
            
            const prompt = promptVariations[Math.floor(Math.random() * promptVariations.length)];
            
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.narrative && data.narrative.length > 100) {
                    return data.narrative;
                }
            }
        } catch (e) {
            console.warn('[Continente] Error generando narrativa:', e);
        }
        
        // Fallbacks variados
        const fallbacks = [
            `En ${this.currentContinent.name} he descubierto una riqueza cultural que me sorprende constantemente. Los ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''} que he visitado aquí - ${this.countriesData.slice(0, 3).map(c => c.name).join(', ')}${this.countriesData.length > 3 ? ' y otros' : ''} - cada uno me ha mostrado facetas diferentes de la experiencia humana. Con ${this.currentContinent.totalVisits} visita${this.currentContinent.totalVisits !== 1 ? 's' : ''} registradas, este continente se ha convertido en un punto central de mi exploración. La diversidad de paisajes, tradiciones y formas de vida que encuentro aquí me recuerda por qué este viaje es tan significativo.`,
            `Explorar ${this.currentContinent.name} ha sido una experiencia reveladora. A través de mis ${this.currentContinent.totalVisits} visita${this.currentContinent.totalVisits !== 1 ? 's' : ''} a ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''} diferentes, he observado cómo cada nación aporta su propia identidad única. ${this.countriesData.length > 0 ? `Países como ${this.countriesData[0].name}${this.countriesData.length > 1 ? ` y ${this.countriesData[1].name}` : ''}` : 'Cada lugar'} me ha enseñado algo distinto sobre la humanidad. Este continente representa una parte esencial de mi documentación global, mostrando la complejidad y belleza de nuestra especie.`,
            `Este continente, ${this.currentContinent.name}, ha sido testigo de ${this.currentContinent.totalVisits} momento${this.currentContinent.totalVisits !== 1 ? 's' : ''} de documentación en mi viaje. Los ${this.countriesData.length} país${this.countriesData.length !== 1 ? 'es' : ''} que he visitado aquí forman un mosaico fascinante de culturas y experiencias. ${this.countriesData.length > 0 ? `Desde ${this.countriesData[0].name}${this.countriesData.length > 1 ? ` hasta ${this.countriesData[this.countriesData.length - 1].name}` : ''}` : 'Cada lugar'}, he encontrado historias que merecen ser preservadas. La riqueza de este continente no está solo en sus números, sino en la profundidad de las conexiones humanas que he observado.`
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    renderVisualization() {
        // Crear estructura visual con animaciones dinámicas
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #e8e8f0;
            font-family: 'Inter', sans-serif;
            position: relative;
            overflow: hidden;
        `;
        
        // Agregar efectos de fondo animados con partículas
        const animatedBg = document.createElement('div');
        animatedBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 30% 50%, rgba(74, 158, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 70% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
            animation: backgroundPulse 8s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
        `;
        wrapper.appendChild(animatedBg);
        
        // Agregar partículas flotantes
        const particlesContainer = document.createElement('div');
        particlesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        `;
        
        // Crear partículas animadas
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 2;
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * 5;
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: rgba(74, 158, 255, ${Math.random() * 0.5 + 0.2});
                border-radius: 50%;
                left: ${startX}%;
                top: ${startY}%;
                animation: floatParticle ${duration}s ease-in-out infinite;
                animation-delay: ${delay}s;
                box-shadow: 0 0 ${size * 2}px rgba(74, 158, 255, 0.5);
            `;
            particlesContainer.appendChild(particle);
        }
        wrapper.appendChild(particlesContainer);
        
        // Agregar estilo de animación
        if (!document.getElementById('continente-animations')) {
            const style = document.createElement('style');
            style.id = 'continente-animations';
            style.textContent = `
                @keyframes backgroundPulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes floatParticle {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                        opacity: 0.3;
                    }
                    25% { 
                        transform: translate(20px, -30px) scale(1.2);
                        opacity: 0.6;
                    }
                    50% { 
                        transform: translate(-15px, -50px) scale(0.8);
                        opacity: 0.4;
                    }
                    75% { 
                        transform: translate(25px, -20px) scale(1.1);
                        opacity: 0.7;
                    }
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Título del continente con animación mejorada
        const title = document.createElement('h1');
        title.textContent = this.currentContinent.name;
        title.style.cssText = `
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            text-align: center;
            background: linear-gradient(135deg, #4a9eff 0%, #a855f7 100%);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: fadeInUp 0.8s ease-out, shimmer 3s ease-in-out infinite;
            position: relative;
            z-index: 1;
            cursor: pointer;
            transition: transform 0.3s;
        `;
        title.onmouseenter = () => {
            title.style.transform = 'scale(1.05)';
        };
        title.onmouseleave = () => {
            title.style.transform = 'scale(1)';
        };
        wrapper.appendChild(title);
        
        // Estadísticas con animación
        const stats = document.createElement('div');
        stats.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
            margin: 2rem 0;
            width: 100%;
            max-width: 1200px;
            position: relative;
            z-index: 1;
            animation: fadeInUp 1s ease-out 0.2s both;
        `;
        
        const statItems = [
            { label: 'Países Visitados', value: this.countriesData.length },
            { label: 'Total de Visitas', value: this.currentContinent.totalVisits },
            { label: 'Continente', value: this.currentContinent.name }
        ];
        
        statItems.forEach((item, index) => {
            const stat = document.createElement('div');
            stat.style.cssText = `
                background: rgba(74, 158, 255, 0.1);
                border: 1px solid rgba(74, 158, 255, 0.3);
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                animation: scaleIn 0.6s ease-out ${0.4 + index * 0.1}s both;
                transition: transform 0.3s, box-shadow 0.3s;
            `;
            stat.innerHTML = `
                <div style="font-size: 2.5rem; font-weight: 800; color: #4a9eff; margin-bottom: 0.5rem;">${item.value}</div>
                <div style="font-size: 0.9rem; color: #a0a0b0; text-transform: uppercase;">${item.label}</div>
            `;
            stat.onmouseenter = () => {
                stat.style.transform = 'scale(1.05) translateY(-5px)';
                stat.style.boxShadow = '0 10px 30px rgba(74, 158, 255, 0.3)';
            };
            stat.onmouseleave = () => {
                stat.style.transform = 'scale(1) translateY(0)';
                stat.style.boxShadow = 'none';
            };
            stats.appendChild(stat);
        });
        
        wrapper.appendChild(stats);
        
        // Lista de países con animación
        if (this.countriesData.length > 0) {
            const countriesList = document.createElement('div');
            countriesList.style.cssText = `
                width: 100%;
                max-width: 1200px;
                margin-top: 2rem;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                position: relative;
                z-index: 1;
                animation: fadeInUp 1s ease-out 0.4s both;
            `;
            
            this.countriesData.forEach((country, index) => {
                const countryCard = document.createElement('div');
                countryCard.style.cssText = `
                    background: rgba(26, 26, 36, 0.8);
                    border: 1px solid rgba(74, 158, 255, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    text-align: center;
                    transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s, background 0.3s;
                    animation: scaleIn 0.5s ease-out ${0.6 + index * 0.05}s both;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                `;
                
                // Efecto de brillo animado
                const shine = document.createElement('div');
                shine.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(74, 158, 255, 0.3), transparent);
                    transition: left 0.5s;
                `;
                countryCard.appendChild(shine);
                
                const content = document.createElement('div');
                content.style.cssText = 'position: relative; z-index: 1;';
                content.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #e8e8f0;">${country.name}</div>
                    <div style="font-size: 0.85rem; color: #a0a0b0;">${country.visits} visita${country.visits !== 1 ? 's' : ''}</div>
                `;
                countryCard.appendChild(content);
                
                countryCard.onmouseenter = () => {
                    countryCard.style.transform = 'scale(1.08) translateY(-3px)';
                    countryCard.style.borderColor = 'rgba(74, 158, 255, 0.6)';
                    countryCard.style.boxShadow = '0 8px 20px rgba(74, 158, 255, 0.3)';
                    countryCard.style.background = 'rgba(26, 26, 36, 0.95)';
                    shine.style.left = '100%';
                };
                countryCard.onmouseleave = () => {
                    countryCard.style.transform = 'scale(1) translateY(0)';
                    countryCard.style.borderColor = 'rgba(74, 158, 255, 0.2)';
                    countryCard.style.boxShadow = 'none';
                    countryCard.style.background = 'rgba(26, 26, 36, 0.8)';
                    shine.style.left = '-100%';
                };
                
                // Agregar animación de pulso sutil
                setInterval(() => {
                    if (Math.random() > 0.7) {
                        countryCard.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            if (countryCard.parentElement) {
                                countryCard.style.transform = 'scale(1)';
                            }
                        }, 200);
                    }
                }, 3000 + Math.random() * 2000);
                
                countriesList.appendChild(countryCard);
            });
            
            wrapper.appendChild(countriesList);
        }
        
        this.container.appendChild(wrapper);
    }

    scheduleNextPage() {
        // Si Dream Mode está ON, cambiar automáticamente a otra página
        if (eventManager.canProceedAuto()) {
            console.log('[Continente] Dream Mode ON: Programando cambio de página...');
            // Esperar 2-3 segundos después de la narración para transición suave
            setTimeout(() => {
                if (eventManager.canProceedAuto() && !this.isNarrating) {
                    const pages = ['mapa', 'diario', 'estado-actual', 'reflexion', 'ruta', 'estadisticas', 'galeria'];
                    // Excluir la página actual para evitar repetir
                    const currentPage = 'continente';
                    const availablePages = pages.filter(p => p !== currentPage);
                    const randomPage = availablePages[Math.floor(Math.random() * availablePages.length)];
                    console.log(`[Continente] 🎲 Navegando a: ${randomPage}`);
                    window.location.href = `/vivos/${randomPage}/`;
                }
            }, 2000 + Math.random() * 1000); // 2-3 segundos aleatorios
        }
    }

    unmount() {
        // Limpiar intervalo de verificación de música
        if (this.musicCheckInterval) {
            clearInterval(this.musicCheckInterval);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        avatarSubtitlesManager.hide();
        audioManager.cancel();
    }
}
